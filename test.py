import urllib.request
import json

data = json.dumps({'email': 'manufacturer@example.com', 'password': 'password123'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})

try:
    token = json.loads(urllib.request.urlopen(req).read())['access_token']
    req2 = urllib.request.Request('http://localhost:8000/api/v1/sensors/7/simulation/start', method='POST', headers={'Authorization': 'Bearer ' + token})
    print('STATUS', urllib.request.urlopen(req2).getcode())
    print(urllib.request.urlopen(req2).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('ERROR:', e.getcode())
    print(e.read().decode('utf-8'))
