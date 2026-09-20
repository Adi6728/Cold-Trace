from sqlalchemy import text
from app.database.session import SessionLocal

db = SessionLocal()
res = db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'userrole'")).fetchall()
print([r[0] for r in res])
