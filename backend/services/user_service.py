from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import (
    User, UserLocation, ChatSession, ChatMessage, SearchHistory
)
from backend.schemas import (
    UserLocationCreate, UserLocationUpdate,
    ChatSessionCreate, ChatSessionUpdate,
    ChatMessageCreate, SearchHistoryCreate
)


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # User Locations
    async def create_user_location(self, user_id: int, location_data: UserLocationCreate) -> UserLocation:
        """Create a new saved location for a user."""
        # If this is set as default, unset other defaults
        if location_data.is_default:
            await self._unset_default_location(user_id)
        
        location = UserLocation(
            user_id=user_id,
            **location_data.model_dump()
        )
        self.db.add(location)
        await self.db.flush()
        await self.db.refresh(location)
        return location

    async def get_user_locations(self, user_id: int) -> List[UserLocation]:
        """Get all saved locations for a user."""
        stmt = select(UserLocation).where(UserLocation.user_id == user_id).order_by(
            UserLocation.is_default.desc(), UserLocation.created_at.desc()
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_user_location(self, user_id: int, location_id: int) -> Optional[UserLocation]:
        """Get a specific user location."""
        stmt = select(UserLocation).where(
            and_(UserLocation.user_id == user_id, UserLocation.id == location_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_default_location(self, user_id: int) -> Optional[UserLocation]:
        """Get user's default location."""
        stmt = select(UserLocation).where(
            and_(UserLocation.user_id == user_id, UserLocation.is_default == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_user_location(self, user_id: int, location_id: int, location_data: UserLocationUpdate) -> Optional[UserLocation]:
        """Update a user location."""
        location = await self.get_user_location(user_id, location_id)
        if not location:
            return None
        
        update_data = location_data.model_dump(exclude_unset=True)
        
        # If setting as default, unset others
        if update_data.get("is_default"):
            await self._unset_default_location(user_id)
        
        for field, value in update_data.items():
            setattr(location, field, value)
        
        location.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(location)
        return location

    async def delete_user_location(self, user_id: int, location_id: int) -> bool:
        """Delete a user location."""
        location = await self.get_user_location(user_id, location_id)
        if not location:
            return False
        
        was_default = location.is_default
        await self.db.delete(location)
        await self.db.flush()
        
        # If deleted was default, set another as default
        if was_default:
            stmt = select(UserLocation).where(UserLocation.user_id == user_id).order_by(UserLocation.created_at)
            result = await self.db.execute(stmt)
            first = result.scalar_one_or_none()
            if first:
                first.is_default = True
                await self.db.flush()
        
        return True

    async def _unset_default_location(self, user_id: int) -> None:
        """Unset default location for a user."""
        stmt = select(UserLocation).where(
            and_(UserLocation.user_id == user_id, UserLocation.is_default == True)
        )
        result = await self.db.execute(stmt)
        for loc in result.scalars().all():
            loc.is_default = False
        await self.db.flush()

    # Chat Sessions
    async def create_chat_session(self, user_id: int, session_data: ChatSessionCreate) -> ChatSession:
        """Create a new chat session."""
        session = ChatSession(
            user_id=user_id,
            **session_data.model_dump()
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def get_user_chat_sessions(self, user_id: int, limit: int = 50) -> List[ChatSession]:
        """Get user's chat sessions."""
        stmt = select(ChatSession).where(ChatSession.user_id == user_id).order_by(
            desc(ChatSession.updated_at)
        ).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_chat_session(self, user_id: int, session_id: int) -> Optional[ChatSession]:
        """Get a specific chat session."""
        stmt = select(ChatSession).where(
            and_(ChatSession.user_id == user_id, ChatSession.id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_chat_session_by_session_id(self, user_id: int, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by session_id string."""
        stmt = select(ChatSession).where(
            and_(ChatSession.user_id == user_id, ChatSession.session_id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_chat_session(self, user_id: int, session_id: int, session_data: ChatSessionUpdate) -> Optional[ChatSession]:
        """Update a chat session."""
        session = await self.get_chat_session(user_id, session_id)
        if not session:
            return None
        
        update_data = session_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(session, field, value)
        
        session.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def delete_chat_session(self, user_id: int, session_id: int) -> bool:
        """Delete a chat session."""
        session = await self.get_chat_session(user_id, session_id)
        if not session:
            return False
        
        await self.db.delete(session)
        await self.db.flush()
        return True

    # Chat Messages
    async def add_chat_message(self, session_id: int, message_data: ChatMessageCreate) -> ChatMessage:
        """Add a message to a chat session."""
        message = ChatMessage(
            session_id=session_id,
            **message_data.model_dump()
        )
        self.db.add(message)
        
        # Update session timestamp
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            session.updated_at = datetime.utcnow()
        
        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def get_chat_messages(self, session_id: int, limit: int = 100) -> List[ChatMessage]:
        """Get messages for a chat session."""
        stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(
            ChatMessage.created_at
        ).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # Search History
    async def add_search_history(self, user_id: int, search_data: SearchHistoryCreate) -> SearchHistory:
        """Add a search to user's history."""
        search = SearchHistory(
            user_id=user_id,
            **search_data.model_dump()
        )
        self.db.add(search)
        await self.db.flush()
        await self.db.refresh(search)
        return search

    async def get_search_history(self, user_id: int, limit: int = 20) -> List[SearchHistory]:
        """Get user's search history."""
        stmt = select(SearchHistory).where(SearchHistory.user_id == user_id).order_by(
            desc(SearchHistory.created_at)
        ).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def clear_search_history(self, user_id: int) -> int:
        """Clear user's search history."""
        stmt = select(SearchHistory).where(SearchHistory.user_id == user_id)
        result = await self.db.execute(stmt)
        searches = result.scalars().all()
        count = len(searches)
        for search in searches:
            await self.db.delete(search)
        await self.db.flush()
        return count

    # User Preferences
    async def get_user_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get user preferences with defaults."""
        from backend.schemas import UserPreferences
        user = await self.db.get(User, user_id)
        if not user:
            return UserPreferences().model_dump()
        return user.preferences or UserPreferences().model_dump()

    async def update_user_preferences(self, user_id: int, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update user preferences."""
        user = await self.db.get(User, user_id)
        if not user:
            return {}
        
        current = user.preferences or {}
        current.update(preferences)
        user.preferences = current
        user.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(user)
        return user.preferences