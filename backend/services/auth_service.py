from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import User, UserRole
from backend.schemas import UserCreate, UserUpdate, TokenData, UserPreferences

# Password hashing
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=102400,
    argon2__time_cost=2,
    argon2__parallelism=8,
)

# JWT
ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_token(self, token: str) -> Optional[TokenData]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: int = payload.get("sub")
            email: str = payload.get("email")
            token_type: str = payload.get("type")
            if user_id is None:
                return None
            return TokenData(user_id=user_id, email=email)
        except JWTError:
            return None

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password."""
        stmt = select(User).where(User.email == email.lower())
        user = self.db.execute(stmt).scalar_one_or_none()
        
        if not user:
            return None
        if not user.is_active:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        
        return user

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        stmt = select(User).where(User.email == email.lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if email exists
        existing = self.get_user_by_email(user_data.email)
        if existing:
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = self.get_password_hash(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email.lower(),
            name=user_data.name,
            password_hash=password_hash,
            preferences=UserPreferences().model_dump(),
        )
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Update user information."""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        update_data = user_data.model_dump(exclude_unset=True)
        
        if "email" in update_data:
            # Check if new email is taken
            existing = self.get_user_by_email(update_data["email"])
            if existing and existing.id != user_id:
                raise ValueError("Email already registered")
            update_data["email"] = update_data["email"].lower()
        
        if "preferences" in update_data and update_data["preferences"]:
            # Merge preferences
            current_prefs = user.preferences or {}
            current_prefs.update(update_data["preferences"])
            update_data["preferences"] = current_prefs
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.flush()
        self.db.refresh(user)
        return user

    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        if not self.verify_password(current_password, user.password_hash):
            return False
        
        user.password_hash = self.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.flush()
        return True

    def update_last_login(self, user_id: int) -> None:
        """Update user's last login timestamp."""
        user = self.get_user_by_id(user_id)
        if user:
            user.last_login_at = datetime.utcnow()
            self.db.flush()

    def deactivate_user(self, user_id: int) -> bool:
        """Deactivate a user account."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.flush()
        return True

    def create_tokens(self, user: User) -> tuple[str, str]:
        """Create access and refresh tokens for a user."""
        access_token = self.create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value}
        )
        refresh_token = self.create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        return access_token, refresh_token

    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Create new access token from refresh token."""
        token_data = self.decode_token(refresh_token)
        if not token_data or token_data.user_id is None:
            return None
        
        # Verify token type
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                return None
        except JWTError:
            return None
        
        user = self.get_user_by_id(token_data.user_id)
        if not user or not user.is_active:
            return None
        
        return self.create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value}
        )

    def generate_reset_token(self, email: str) -> str:
        """Generate a password reset token (valid for 1 hour)."""
        data = {"sub": email, "type": "reset"}
        expire = datetime.utcnow() + timedelta(hours=1)
        data.update({"exp": expire})
        return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

    def verify_reset_token(self, token: str) -> Optional[str]:
        """Verify a password reset token and return email."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "reset":
                return None
            email: str = payload.get("sub")
            return email
        except JWTError:
            return None

    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using reset token."""
        email = self.verify_reset_token(token)
        if not email:
            return False
        
        user = self.get_user_by_email(email)
        if not user:
            return False
        
        user.password_hash = self.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.flush()
        return True