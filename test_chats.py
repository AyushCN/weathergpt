import asyncio
from backend.database import SessionLocal
from backend.models import ChatSession, User

db = SessionLocal()
users = db.query(User).all()
print(f"Users: {[u.email for u in users]}")
for user in users:
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user.id).all()
    print(f"User {user.email} has {len(sessions)} sessions")
