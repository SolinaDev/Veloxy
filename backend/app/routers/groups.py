from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.auth import FirebaseUser, get_current_user
from app.database import get_db
from app.models import Group, GroupMember, GroupMessage, GroupPost, GroupPostComment, User
from app.schemas_group import (
    GroupCommentCreate,
    GroupCommentOut,
    GroupCreate,
    GroupMessageCreate,
    GroupMessageOut,
    GroupOut,
    GroupPostCreate,
    GroupPostOut,
    ToggleLikeIn,
    UpdateGroupPhotoIn,
)

router = APIRouter(prefix="/groups", tags=["groups"])

UserCache = dict[str, User]


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Perfil do autor nao encontrado.")
    return user


def _load_users(db: Session, ids: list[str]) -> UserCache:
    """Cache local (por chamada) para nao rodar 1 query por linha ao
    serializar uma lista de posts/comentarios/mensagens/grupos."""
    unique_ids = list({i for i in ids if i})
    if not unique_ids:
        return {}
    users = db.query(User).filter(User.uid.in_(unique_ids)).all()
    return {u.uid: u for u in users}


def _serialize_group(group: Group, users: UserCache) -> GroupOut:
    member_ids = [m.user_id for m in group.members]
    creator = users.get(group.created_by)
    return GroupOut(
        id=group.id,
        name=group.name,
        city=group.city,
        description=group.description,
        tag=group.tag,
        photo_url=group.photo_url,
        created_by=group.created_by,
        creator_name=creator.display_name if creator else "Veloxy",
        member_ids=member_ids,
        members_count=len(member_ids),
        weekly_km=group.weekly_km,
        weekly_km_week=group.weekly_km_week,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def _get_group_or_404(db: Session, group_id: int) -> Group:
    group = db.query(Group).options(selectinload(Group.members)).get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo nao encontrado.")
    return group


@router.get("", response_model=list[GroupOut])
def list_groups(db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)):
    groups = db.query(Group).options(selectinload(Group.members)).order_by(desc(Group.created_at)).limit(50).all()
    users = _load_users(db, [g.created_by for g in groups])
    return [_serialize_group(g, users) for g in groups]


@router.post("", response_model=GroupOut)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    group = Group(
        name=payload.name.strip(),
        city=payload.city.strip() or "Brasil",
        description=payload.description.strip(),
        tag=payload.tag.strip() or "Run",
        created_by=current_user.uid,
    )
    db.add(group)
    db.flush()

    db.add(GroupMember(group_id=group.id, user_id=current_user.uid))
    db.commit()

    group = _get_group_or_404(db, group.id)
    users = _load_users(db, [group.created_by])
    return _serialize_group(group, users)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)):
    group = _get_group_or_404(db, group_id)
    users = _load_users(db, [group.created_by])
    return _serialize_group(group, users)


@router.put("/{group_id}/photo", response_model=GroupOut)
def update_group_photo(
    group_id: int,
    payload: UpdateGroupPhotoIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    group = _get_group_or_404(db, group_id)
    if group.created_by != current_user.uid:
        raise HTTPException(status_code=403, detail="So quem criou o grupo pode trocar a foto.")

    group.photo_url = payload.photo_url
    group.updated_at = datetime.now(timezone.utc)
    db.commit()

    group = _get_group_or_404(db, group_id)
    users = _load_users(db, [group.created_by])
    return _serialize_group(group, users)


@router.post("/{group_id}/join", response_model=GroupOut)
def join_group(
    group_id: int, db: Session = Depends(get_db), current_user: FirebaseUser = Depends(get_current_user)
):
    group = _get_group_or_404(db, group_id)
    already_member = any(m.user_id == current_user.uid for m in group.members)
    if not already_member:
        db.add(GroupMember(group_id=group_id, user_id=current_user.uid))
        group.updated_at = datetime.now(timezone.utc)
        db.commit()

    group = _get_group_or_404(db, group_id)
    users = _load_users(db, [group.created_by])
    return _serialize_group(group, users)


@router.post("/{group_id}/leave", response_model=GroupOut)
def leave_group(
    group_id: int, db: Session = Depends(get_db), current_user: FirebaseUser = Depends(get_current_user)
):
    group = _get_group_or_404(db, group_id)
    db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == current_user.uid
    ).delete()
    group.updated_at = datetime.now(timezone.utc)
    db.commit()

    group = _get_group_or_404(db, group_id)
    users = _load_users(db, [group.created_by])
    return _serialize_group(group, users)


# ─── Posts ──────────────────────────────────────────────────────────────────


def _serialize_post(post: GroupPost, author: User | None) -> GroupPostOut:
    return GroupPostOut(
        id=str(post.id),
        author_id=post.author_id,
        author_name=author.display_name if author else "Corredor",
        author_photo=author.photo_url if author else None,
        text=post.text,
        image_url=post.image_url,
        likes=list(post.likes or []),
        comments_count=post.comments_count,
        created_at=post.created_at,
    )


@router.get("/{group_id}/posts", response_model=list[GroupPostOut])
def list_group_posts(
    group_id: int,
    limit: int = 30,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    posts = (
        db.query(GroupPost)
        .filter(GroupPost.group_id == group_id)
        .order_by(desc(GroupPost.created_at))
        .limit(limit)
        .all()
    )
    users = _load_users(db, [p.author_id for p in posts])
    return [_serialize_post(p, users.get(p.author_id)) for p in posts]


@router.post("/{group_id}/posts", response_model=GroupPostOut)
def create_group_post(
    group_id: int,
    payload: GroupPostCreate,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    author = _user_or_404(db, current_user.uid)
    post = GroupPost(
        group_id=group_id,
        author_id=current_user.uid,
        text=payload.text.strip(),
        image_url=payload.image_url,
        likes=[],
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_post(post, author)


@router.post("/{group_id}/posts/{post_id}/like")
def toggle_group_post_like(
    group_id: int,
    post_id: int,
    payload: ToggleLikeIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    post = db.query(GroupPost).filter(GroupPost.id == post_id, GroupPost.group_id == group_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacao nao encontrada.")

    likes = list(post.likes or [])
    if payload.is_liked:
        if current_user.uid in likes:
            likes.remove(current_user.uid)
    else:
        if current_user.uid not in likes:
            likes.append(current_user.uid)
    post.likes = likes
    db.commit()
    return {"likes": likes}


# ─── Comentários ────────────────────────────────────────────────────────────


def _serialize_comment(comment: GroupPostComment, author: User | None) -> GroupCommentOut:
    return GroupCommentOut(
        id=str(comment.id),
        author_id=comment.author_id,
        author_name=author.display_name if author else "Corredor",
        author_photo=author.photo_url if author else None,
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/{group_id}/posts/{post_id}/comments", response_model=list[GroupCommentOut])
def list_group_post_comments(
    group_id: int,
    post_id: int,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    comments = (
        db.query(GroupPostComment)
        .filter(GroupPostComment.post_id == post_id)
        .order_by(GroupPostComment.created_at.asc())
        .limit(200)
        .all()
    )
    users = _load_users(db, [c.author_id for c in comments])
    return [_serialize_comment(c, users.get(c.author_id)) for c in comments]


@router.post("/{group_id}/posts/{post_id}/comments", response_model=GroupCommentOut)
def add_group_post_comment(
    group_id: int,
    post_id: int,
    payload: GroupCommentCreate,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    author = _user_or_404(db, current_user.uid)
    post = db.query(GroupPost).filter(GroupPost.id == post_id, GroupPost.group_id == group_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacao nao encontrada.")

    comment = GroupPostComment(post_id=post_id, author_id=current_user.uid, text=payload.text.strip())
    db.add(comment)
    post.comments_count = (post.comments_count or 0) + 1
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment, author)


# ─── Chat ───────────────────────────────────────────────────────────────────


def _serialize_message(message: GroupMessage, sender: User | None) -> GroupMessageOut:
    return GroupMessageOut(
        id=str(message.id),
        sender_id=message.sender_id,
        sender_name=sender.display_name if sender else "Corredor",
        sender_photo=sender.photo_url if sender else None,
        text=message.text,
        created_at=message.created_at,
    )


@router.get("/{group_id}/messages", response_model=list[GroupMessageOut])
def list_group_messages(
    group_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: FirebaseUser = Depends(get_current_user),
):
    messages = (
        db.query(GroupMessage)
        .filter(GroupMessage.group_id == group_id)
        .order_by(desc(GroupMessage.created_at))
        .limit(limit)
        .all()
    )
    messages = list(reversed(messages))
    users = _load_users(db, [m.sender_id for m in messages])
    return [_serialize_message(m, users.get(m.sender_id)) for m in messages]


@router.post("/{group_id}/messages", response_model=GroupMessageOut)
def send_group_message(
    group_id: int,
    payload: GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    sender = _user_or_404(db, current_user.uid)
    message = GroupMessage(group_id=group_id, sender_id=current_user.uid, text=payload.text.strip())
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message, sender)


# ─── Usado por outros dominios ──────────────────────────────────────────────


@router.get("/joined/{user_id}", response_model=list[str])
def get_joined_group_ids(
    user_id: str, db: Session = Depends(get_db), _: FirebaseUser = Depends(get_current_user)
):
    """IDs dos grupos reais (Postgres) de que o usuario participa. Usado por
    getUserProfile no frontend para mesclar com joinedGroupIds do Firestore
    (grupos demo/fallback, que nao tem linha correspondente aqui)."""
    rows = db.query(GroupMember.group_id).filter(GroupMember.user_id == user_id).all()
    return [str(group_id) for (group_id,) in rows]


def update_weekly_km_for_user_groups(db: Session, user_id: str, distance_km: float) -> None:
    """Port de addDistanceToUserGroups: soma a distancia ao km semanal de
    cada grupo do qual o usuario participa, resetando quando a semana muda.
    Chamado direto por POST /activities — nao precisa mais filtrar grupos
    fallback, pois esses nunca tem linha em group_members."""
    if distance_km <= 0:
        return

    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    current_week = f"{iso_year}-W{iso_week:02d}"

    group_ids = [gm.group_id for gm in db.query(GroupMember).filter(GroupMember.user_id == user_id).all()]
    if not group_ids:
        return

    for group in db.query(Group).filter(Group.id.in_(group_ids)).all():
        same_week = group.weekly_km_week == current_week
        previous_km = group.weekly_km if same_week else 0
        group.weekly_km = min(round(previous_km + distance_km, 2), 100000)
        group.weekly_km_week = current_week
        group.updated_at = now
    db.commit()
