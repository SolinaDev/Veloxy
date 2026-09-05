from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import FirebaseUser, get_current_user
from app.database import get_db
from app.gamification import calculate_run_coins, calculate_xp, get_level_from_xp
from app.models import Activity, User
from app.routers.users import apply_xp_and_km
from app.schemas import ActivityCreate, ActivityOut, SaveActivityResult, ToggleLikeIn

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", response_model=SaveActivityResult)
def save_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    # TODO Fase 1.5: trocar por require_verified_email quando a tela de
    # confirmacao de email existir no frontend — hoje contas antigas nunca
    # verificaram email e ficariam bloqueadas sem aviso.
    current_user: FirebaseUser = Depends(get_current_user),
):
    if current_user.uid != payload.user_id:
        raise HTTPException(status_code=403, detail="userId nao corresponde ao usuario autenticado.")

    xp_gained = calculate_xp(payload.distance, payload.duration_seconds)

    activity = Activity(
        user_id=payload.user_id,
        user_name=payload.user_name,
        user_avatar=payload.user_avatar,
        distance=payload.distance,
        time=payload.time,
        duration_seconds=payload.duration_seconds,
        pace=payload.pace,
        calories=payload.calories,
        type=payload.type,
        likes=[],
        route=[p.model_dump() for p in payload.route] if payload.route else None,
        xp_gained=xp_gained,
    )
    db.add(activity)

    try:
        db.commit()
        db.refresh(activity)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar atividade.") from exc

    xp_update_failed = False
    try:
        apply_xp_and_km(db, payload.user_id, xp_gained, payload.distance, payload.user_name, payload.user_avatar)

        user = db.get(User, payload.user_id)
        run_coins = calculate_run_coins(payload.distance)
        if user and user.pet_species and run_coins > 0:
            user.pet_coins = (user.pet_coins or 0) + run_coins
            db.commit()
    except Exception:
        db.rollback()
        xp_update_failed = True

    # Nota: addDistanceToUserGroups (km semanal por grupo) ainda nao migrou —
    # grupos continuam no Firestore ate a Fase 1 cobrir esse dominio. O
    # frontend chama a funcao antiga em paralelo por enquanto.

    return SaveActivityResult(id=activity.id, xp_update_failed=xp_update_failed)


@router.get("/user/{user_id}", response_model=list[ActivityOut])
def get_user_activities(
    user_id: str,
    limit: int | None = 10,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    """limit=None retorna todas as corridas do usuario (usado por getUserStats no frontend)."""
    q = db.query(Activity).filter(Activity.user_id == user_id).order_by(desc(Activity.created_at))
    if limit is not None:
        q = q.limit(limit)
    return q.all()


@router.get("/by-users", response_model=list[ActivityOut])
def get_activities_by_users(
    user_ids: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    """Usado pelo feed de grupo (getGroupActivities) — grupos ainda nao migraram
    do Firestore, mas activities so existem aqui desde a Fase 1."""
    ids = [uid for uid in user_ids.split(",") if uid]
    if not ids:
        return []
    return (
        db.query(Activity)
        .filter(Activity.user_id.in_(ids))
        .order_by(desc(Activity.created_at))
        .limit(limit)
        .all()
    )


@router.get("/feed", response_model=list[ActivityOut])
def get_feed(
    limit: int = 10,
    before_id: int | None = None,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    """Substitui subscribeToFeed (onSnapshot) + loadMoreActivities (cursor).

    Real-time via WebSocket fica para a Fase 2 do plano; por enquanto o
    frontend faz polling curto ou refetch manual nesse endpoint.
    """
    q = db.query(Activity).order_by(desc(Activity.id))
    if before_id is not None:
        q = q.filter(Activity.id < before_id)
    return q.limit(limit).all()


@router.post("/{activity_id}/like")
def toggle_like(
    activity_id: int,
    payload: ToggleLikeIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade nao encontrada.")

    likes = list(activity.likes or [])
    if payload.is_liked:
        if current_user.uid in likes:
            likes.remove(current_user.uid)
    else:
        if current_user.uid not in likes:
            likes.append(current_user.uid)
    activity.likes = likes
    db.commit()
    return {"likes": likes}


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    activity = db.get(Activity, activity_id)
    if not activity or activity.user_id != current_user.uid:
        raise HTTPException(status_code=404, detail="Corrida nao encontrada para este usuario.")

    db.delete(activity)
    db.commit()

    _recompute_user_totals(db, current_user.uid)
    return {"deleted": True}


@router.delete("/user/{user_id}/all")
def delete_all_user_activities(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    if current_user.uid != user_id:
        raise HTTPException(status_code=403, detail="So e possivel apagar as proprias corridas.")

    count = db.query(Activity).filter(Activity.user_id == user_id).delete()

    user = db.get(User, user_id)
    if user:
        user.total_xp = 0
        user.monthly_km = 0
        user.level = "Iniciante"
        user.last_updated = datetime.now(timezone.utc)

    db.commit()
    return {"deleted_count": count}


def _recompute_user_totals(db: Session, user_id: str) -> None:
    """Port do recalculo em deleteUserActivity: soma XP/km restantes apos apagar 1 corrida."""

    remaining = db.query(Activity).filter(Activity.user_id == user_id).all()
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")

    total_xp = 0
    monthly_km = 0.0
    for activity in remaining:
        activity_xp = activity.xp_gained or calculate_xp(activity.distance, activity.duration_seconds)
        total_xp += activity_xp
        if activity.created_at and activity.created_at.strftime("%Y-%m") == current_month:
            monthly_km += activity.distance

    user = db.get(User, user_id)
    if user:
        user.total_xp = total_xp
        user.monthly_km = round(monthly_km, 2)
        user.monthly_km_month = current_month
        user.level = get_level_from_xp(total_xp)
        user.last_updated = datetime.now(timezone.utc)
        db.commit()
