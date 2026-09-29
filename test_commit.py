from backend.database import get_db, SessionLocal
from backend.services.user_service import UserService
from backend.schemas import ChatSessionCreate
import uuid

def test():
    # simulate get_db
    db_gen = get_db()
    db = next(db_gen)
    try:
        user_id = 2 # adith@gmail.com
        session_id = str(uuid.uuid4())
        
        user_service = UserService(db)
        session = user_service.create_chat_session(user_id, ChatSessionCreate(session_id=session_id))
        print(f"Created session {session.id}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

test()

db = SessionLocal()
from backend.models import ChatSession
sessions = db.query(ChatSession).filter(ChatSession.user_id == 2).all()
print(f"Sessions in DB: {len(sessions)}")
