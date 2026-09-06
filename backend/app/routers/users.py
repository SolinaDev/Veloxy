from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import FirebaseUser, get_current_user
from app.database import get_db
from app.gamification import get_level_from_xp
from app.models import User
from app.schemas import UserProfileCreate, UserProfileOut

router = APIRouter(prefix="/users", tags=["users"])


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


# Rotas com path estatico (by-ids, ranking/global) precisam vir ANTES de
# /{user_id} — senao o FastAPI casa "by-ids" e "ranking" como se fossem um
# user_id literal, ja que rotas sao resolvidas na ordem de declaracao.


@router.get("/by-ids", response_model=list[UserProfileOut])
def get_users_by_ids(
    ids: str, db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)
):
    """Usado pelo ranking de grupo (getGroupLeaderboard) — grupos ainda nao
    migraram do Firestore, mas perfis so existem aqui desde a Fase 1."""
    uid_list = [uid for uid in ids.split(",") if uid]
    if not uid_list:
        return []
    return db.query(User).filter(User.uid.in_(uid_list)).all()


@router.get("/ranking/global", response_model=list[UserProfileOut])
def get_global_ranking(
    limit: int = 10, db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)
):
    users = (
        db.query(User)
        .filter(User.private_profile.is_(False))
        .order_by(desc(User.total_xp))
        .limit(limit)
        .all()
    )
    return users


@router.get("/{user_id}", response_model=UserProfileOut)
def get_user_profile(
    user_id: str, db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado.")
    return user


@router.put("/{user_id}", response_model=UserProfileOut)
def create_or_update_user_profile(
    user_id: str,
    payload: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    if current_user.uid != user_id:
        raise HTTPException(status_code=403, detail="So e possivel editar o proprio perfil.")

    user = db.get(User, user_id)
    if not user:
        user = User(uid=user_id, display_name=payload.display_name or "Corredor")
        db.add(user)

    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.photo_url is not None:
        user.photo_url = payload.photo_url
    if payload.terms_version:
        user.terms_version = payload.terms_version
        user.terms_accepted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user


def apply_xp_and_km(
    db: Session,
    user_id: str,
    xp_amount: int,
    km_amount: float,
    display_name: str,
    photo_url: str | None,
) -> User:
    """Port de updateUserXP (database.ts) — reset mensal de monthlyKm incluso."""

    user = db.get(User, user_id)
    if not user:
        user = User(uid=user_id, display_name=display_name, photo_url=photo_url)
        db.add(user)
        db.flush()

    current_month = _current_month()
    if user.monthly_km_month != current_month:
        user.monthly_km = 0
        user.monthly_km_month = current_month

    user.total_xp = (user.total_xp or 0) + xp_amount
    user.monthly_km = round((user.monthly_km or 0) + km_amount, 2)
    user.level = get_level_from_xp(user.total_xp)
    user.last_updated = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user
