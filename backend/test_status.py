import sys
import urllib.request
import json

sys.path.append('.')
from app.database.session import SessionLocal
from app.models.shipment import Shipment
from app.models.user import User
from app.core.security import create_access_token

db = SessionLocal()
s = db.query(Shipment).filter(Shipment.id == 2).first()
mfg = db.query(User).filter(User.organization_id == s.origin_organization_id).first()
token = create_access_token(mfg.id)

req_status = urllib.request.Request('http://localhost:8000/api/v1/sensors/7/simulation/status', method='GET', headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})

try:
    res = urllib.request.urlopen(req_status)
    print('STATUS CODE:', res.getcode())
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('ERROR:', e.getcode())
    print(e.read().decode('utf-8'))
