from backend.database import SessionLocal
print(f"autocommit: {SessionLocal().autocommit}")
