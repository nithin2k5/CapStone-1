import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models import User, UserSettings
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest

router = APIRouter(prefix="/settings", tags=["Settings"])

async def get_or_create_settings(user_id: str, db: AsyncSession) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        try:
            await db.commit()
            await db.refresh(settings)
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
            settings = result.scalar_one_or_none()
    return settings

@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_or_create_settings(current_user.id, db)
    return SettingsResponse.model_validate(settings)

@router.put("", response_model=SettingsResponse)
async def update_settings(
    payload: SettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_or_create_settings(current_user.id, db)
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    
    return SettingsResponse.model_validate(settings)

@router.post("/regenerate-key", response_model=SettingsResponse)
async def regenerate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_or_create_settings(current_user.id, db)
        
    settings.api_key = f"seg_live_{uuid.uuid4().hex}"
    await db.commit()
    await db.refresh(settings)
    
    return SettingsResponse.model_validate(settings)
