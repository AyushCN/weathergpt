from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.auth_service import AuthService
from backend.services.user_service import UserService
from backend.api.deps import get_current_active_user, get_optional_user
from backend.schemas import (
    UserCreate, UserUpdate, UserResponse,
    LoginRequest, Token, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    UserLocationCreate, UserLocationUpdate, UserLocationResponse,
    ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse,
    ChatSessionWithMessages, ChatMessageCreate, ChatMessageResponse,
    SearchHistoryResponse, UserPreferences,
)
from backend.models import User

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    auth_service = AuthService(db)
    try:
        user = auth_service.create_user(user_data)
        db.commit()
        db.refresh(user)
        return user
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login user and return access + refresh tokens."""
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token, refresh_token = auth_service.create_tokens(user)
    auth_service.update_last_login(user.id)
    
    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60  # 30 minutes in seconds
    )


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: RefreshTokenRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    auth_service = AuthService(db)
    new_access_token = auth_service.refresh_access_token(request.refresh_token)
    
    if not new_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    # Create new refresh token
    token_data = auth_service.decode_token(request.refresh_token)
    user = auth_service.get_user_by_id(token_data.user_id) if token_data else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    new_refresh_token = auth_service.create_refresh_token(
        data={"sub": user.id, "email": user.email}
    )
    
    # Set new refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=30 * 60
    )


@router.post("/logout")
def logout(response: Response):
    """Logout user (clear refresh token cookie)."""
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    auth_service = AuthService(db)
    try:
        updated_user = auth_service.update_user(current_user.id, user_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/change-password")
def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    auth_service = AuthService(db)
    success = auth_service.change_password(current_user.id, current_password, new_password)
    
    if not success:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Request password reset email (returns token for demo)."""
    auth_service = AuthService(db)
    user = auth_service.get_user_by_email(request.email)
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    reset_token = auth_service.generate_reset_token(user.email)
    
    # In production, send this via email
    # For demo, return the token
    return {
        "message": "If the email exists, a reset link has been sent",
        "reset_token": reset_token  # Remove in production!
    }


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token."""
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    auth_service = AuthService(db)
    success = auth_service.reset_password(request.token, request.password)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    return {"message": "Password reset successfully"}


# User Locations
@router.get("/locations", response_model=list[UserLocationResponse])
def get_user_locations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's saved locations."""
    user_service = UserService(db)
    return user_service.get_user_locations(current_user.id)


@router.post("/locations", response_model=UserLocationResponse, status_code=status.HTTP_201_CREATED)
def create_user_location(
    location_data: UserLocationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save a new location for the user."""
    user_service = UserService(db)
    return user_service.create_user_location(current_user.id, location_data)


@router.get("/locations/default", response_model=UserLocationResponse)
def get_default_location(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's default location."""
    user_service = UserService(db)
    location = user_service.get_default_location(current_user.id)
    if not location:
        raise HTTPException(status_code=404, detail="No default location set")
    return location


@router.patch("/locations/{location_id}", response_model=UserLocationResponse)
def update_user_location(
    location_id: int,
    location_data: UserLocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a saved location."""
    user_service = UserService(db)
    location = user_service.update_user_location(current_user.id, location_id, location_data)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.delete("/locations/{location_id}")
def delete_user_location(
    location_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a saved location."""
    user_service = UserService(db)
    success = user_service.delete_user_location(current_user.id, location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted"}


# Chat Sessions
@router.get("/chat/sessions", response_model=list[ChatSessionResponse])
def get_chat_sessions(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's chat sessions."""
    user_service = UserService(db)
    return user_service.get_user_chat_sessions(current_user.id, limit)


@router.post("/chat/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session."""
    user_service = UserService(db)
    return user_service.create_chat_session(current_user.id, session_data)


@router.get("/chat/sessions/{session_id}", response_model=ChatSessionWithMessages)
def get_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a chat session with messages."""
    user_service = UserService(db)
    session = user_service.get_chat_session(current_user.id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = user_service.get_chat_messages(session.id)
    return ChatSessionWithMessages(
        **session.__dict__,
        messages=messages
    )


@router.patch("/chat/sessions/{session_id}", response_model=ChatSessionResponse)
def update_chat_session(
    session_id: int,
    session_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a chat session."""
    user_service = UserService(db)
    session = user_service.update_chat_session(current_user.id, session_id, session_data)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a chat session."""
    user_service = UserService(db)
    success = user_service.delete_chat_session(current_user.id, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"message": "Chat session deleted"}


# Search History
@router.get("/search-history", response_model=list[SearchHistoryResponse])
def get_search_history(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's search history."""
    user_service = UserService(db)
    return user_service.get_search_history(current_user.id, limit)


@router.delete("/search-history")
def clear_search_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Clear user's search history."""
    user_service = UserService(db)
    count = user_service.clear_search_history(current_user.id)
    return {"message": f"Cleared {count} search history items"}


# Preferences
@router.get("/preferences", response_model=UserPreferences)
def get_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user preferences."""
    user_service = UserService(db)
    return user_service.get_user_preferences(current_user.id)


@router.patch("/preferences", response_model=UserPreferences)
def update_preferences(
    preferences: UserPreferences,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user preferences."""
    user_service = UserService(db)
    return user_service.update_user_preferences(current_user.id, preferences.model_dump())