import sys
sys.path.append('.')
from app.database.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.id == 11).first()
if not user:
    print("User not found!")
    sys.exit(1)

token = create_access_token(user.id)
print("Got token")

import urllib.request
import json
req2 = urllib.request.Request('http://localhost:8000/api/v1/sensors/7/simulation/start', method='POST', headers={'Authorization': 'Bearer ' + token})

try:
    print('STATUS', urllib.request.urlopen(req2).getcode())
    print(urllib.request.urlopen(req2).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('ERROR:', e.getcode())
    print(e.read().decode('utf-8'))
