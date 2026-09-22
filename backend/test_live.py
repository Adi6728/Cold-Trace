import sys
import urllib.request
import json
import time

sys.path.append('.')
from app.database.session import SessionLocal
from app.models.shipment import Shipment
from app.models.user import User
from app.core.security import create_access_token

db = SessionLocal()
s = db.query(Shipment).filter(Shipment.id == 2).first()
if not s:
    print("Shipment 2 not found")
    sys.exit(1)

mfg = db.query(User).filter(User.organization_id == s.origin_organization_id).first()
if not mfg:
    print("Manufacturer for shipment 2 not found")
    sys.exit(1)

token = create_access_token(mfg.id)

# START SIMULATION
req_start = urllib.request.Request('http://localhost:8000/api/v1/sensors/7/simulation/start', method='POST', headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})

try:
    print("STARTING SIMULATION...")
    res = urllib.request.urlopen(req_start)
    print('START STATUS:', res.getcode())
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('START ERROR:', e.getcode())
    print(e.read().decode('utf-8'))

# Give it 2 seconds to run
time.sleep(2)

# STOP SIMULATION
req_stop = urllib.request.Request('http://localhost:8000/api/v1/sensors/7/simulation/stop', method='POST', headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
try:
    print("STOPPING SIMULATION...")
    res = urllib.request.urlopen(req_stop)
    print('STOP STATUS:', res.getcode())
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('STOP ERROR:', e.getcode())
    print(e.read().decode('utf-8'))
