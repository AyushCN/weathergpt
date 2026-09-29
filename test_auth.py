from backend.database import SessionLocal
from backend.schemas import UserCreate
from backend.services.auth_service import AuthService
from pydantic import ValidationError

db = SessionLocal()
auth = AuthService(db)
try:
    user = auth.create_user(UserCreate(name="adith", email="adith@gmail.com", password="aiet1234"))
    db.commit()
    print(user.id)
except ValidationError as e:
    print("Validation error:", e)
except Exception as e:
    print("Error:", e)
finally:
    db.close()
