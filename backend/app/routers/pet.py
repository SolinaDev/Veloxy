from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import FirebaseUser, get_current_user
from app.database import get_db
from app.models import User
from app.schemas import UserProfileOut
from app.schemas_pet import ChoosePetIn, EquipPetAccessoryIn, PurchasePetAccessoryIn

router = APIRouter(prefix="/users/{user_id}/pet", tags=["pet"])

SLOT_FIELD = {
    "cabeca": "pet_equipped_cabeca",
    "pescoco": "pet_equipped_pescoco",
    "fundo": "pet_equipped_fundo",
}


def _require_self(user_id: str, current_user: FirebaseUser) -> None:
    if current_user.uid != user_id:
        raise HTTPException(status_code=403, detail="So e possivel alterar o proprio pet.")


def _get_or_404(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado.")
    return user


@router.post("/choose", response_model=UserProfileOut)
def choose_pet(
    user_id: str,
    payload: ChoosePetIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    """Escolha do pet: so pode ser feita uma vez (mesma regra de firestore.rules)."""
    _require_self(user_id, current_user)
    user = _get_or_404(db, user_id)

    if user.pet_species:
        raise HTTPException(status_code=409, detail="Pet ja escolhido para este usuario.")

    user.pet_species = payload.species
    user.pet_name = payload.name.strip()
    user.pet_coins = 0
    db.commit()
    db.refresh(user)
    return user


@router.put("/equip", response_model=UserProfileOut)
def equip_pet_accessory(
    user_id: str,
    payload: EquipPetAccessoryIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    _require_self(user_id, current_user)
    user = _get_or_404(db, user_id)

    field = SLOT_FIELD.get(payload.slot)
    if not field:
        raise HTTPException(status_code=400, detail="Slot de acessorio invalido.")

    setattr(user, field, payload.accessory_id)
    db.commit()
    db.refresh(user)
    return user


@router.post("/purchase", response_model=UserProfileOut)
def purchase_pet_accessory(
    user_id: str,
    payload: PurchasePetAccessoryIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(get_current_user),
):
    """Debita RunCoins e desbloqueia o acessorio numa unica transacao (a
    sessao do SQLAlchemy ja da isolamento por request; o commit no final
    torna a operacao atomica)."""
    _require_self(user_id, current_user)
    user = _get_or_404(db, user_id)

    unlocked = list(user.pet_unlocked_accessory_ids or [])
    if payload.accessory_id in unlocked:
        return user

    current_coins = user.pet_coins or 0
    if current_coins < payload.price:
        raise HTTPException(status_code=400, detail="RunCoins insuficientes.")

    user.pet_coins = current_coins - payload.price
    unlocked.append(payload.accessory_id)
    user.pet_unlocked_accessory_ids = unlocked

    db.commit()
    db.refresh(user)
    return user
