#!/usr/bin/env python3
"""Independent read-only Ruby Hair probes. No credentials, customer data, payment starts, or request bodies retained."""
import concurrent.futures, datetime, json, os, shutil, sqlite3, subprocess, time, urllib.error, urllib.request
from pathlib import Path
BASE='https://rubyhair.de'
STATE=Path(os.environ.get('RUBY_MONITOR_STATE','/var/lib/rubyhair-monitor'))
PROBES=[('home','/','GET',None,b'Ruby Hair'),('product','/produkt/tape-in-extensions','GET',None,b'Ruby Hair'),('collection','/kollektionen/tape-in-extensions','GET',None,b'Ruby Hair'),('cart','/warenkorb','GET',None,b'Warenkorb'),('checkout','/kasse','GET',None,b'Almost'),('catalog','/api/catalog','GET',None,b'"source":"postgresql"'),('quote','/api/cart/quote','POST',{'lines':[{'id':883,'quantity':1}]},b'"currency":"EUR"'),('account','/konto/anmelden','GET',None,b'Ruby Hair'),('admin_login','/admin/login','GET',None,b'Ruby Hair')]
def probe(p):
 name,path,method,body,marker=p;start=time.monotonic();status=0;reason='OK'
 try:
  req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body else None,method=method,headers={'User-Agent':'RubyHair-Availability-Monitor/1.0','Cache-Control':'no-cache','Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=12) as r:
   status=r.status;data=r.read(2000000);reason='OK' if status==200 and marker in data else 'INVALID_RESPONSE'
 except urllib.error.HTTPError as e:status=e.code;reason='HTTP_ERROR'
 except Exception:reason='NETWORK_OR_TIMEOUT'
 return name,status,round((time.monotonic()-start)*1000),reason

def main():
 STATE.mkdir(mode=0o700,parents=True,exist_ok=True);now=datetime.datetime.now(datetime.timezone.utc).isoformat();db=sqlite3.connect(STATE/'monitor.sqlite3',timeout=5);db.execute('CREATE TABLE IF NOT EXISTS checks (time TEXT, service TEXT, status INTEGER, ms INTEGER, reason TEXT)');db.execute('CREATE INDEX IF NOT EXISTS checks_time ON checks(time)');db.execute('CREATE TABLE IF NOT EXISTS incidents (service TEXT PRIMARY KEY, failures INTEGER, last_reason TEXT)');
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(probe,PROBES))
 disk=shutil.disk_usage('/');pct=round(disk.used/disk.total*100);rows.append(('server_disk',200 if pct<90 else 503,pct,'OK' if pct<90 else 'DISK_HIGH'))
 try:
  with open('/proc/meminfo') as f:mem={k:int(v.split()[0]) for k,v in (line.split(':',1) for line in f)}
  mempct=round(mem['MemAvailable']/mem['MemTotal']*100);rows.append(('server_memory',200 if mempct>10 else 503,mempct,'OK' if mempct>10 else 'MEMORY_LOW'))
 except Exception:rows.append(('server_memory',0,0,'UNAVAILABLE'))
 try:
  status_file=Path('/run/rubyhair-monitor-units.status');assert time.time()-status_file.stat().st_mtime<90;states=dict(line.split() for line in status_file.read_text().splitlines())
 except Exception:states={}
 for unit in ['rubyhair-db-tls.service','rubyhair-stock-reservations.timer','rubyhair-db-backup.timer']:
  state=states.get(unit,'unknown');rows.append((unit,200 if state=='active' else 0 if state=='unknown' else 503,0,'OK' if state=='active' else 'UNIT_STATUS_UNAVAILABLE' if state=='unknown' else 'UNIT_INACTIVE'))
 for service,status,ms,reason in rows:
  db.execute('INSERT INTO checks VALUES (?,?,?,?,?)',(now,service,status,ms,reason));prior=db.execute('SELECT failures,last_reason FROM incidents WHERE service=?',(service,)).fetchone();failures=0 if reason=='OK' else (prior[0] if prior else 0)+1
  db.execute('INSERT INTO incidents VALUES (?,?,?) ON CONFLICT(service) DO UPDATE SET failures=excluded.failures,last_reason=excluded.last_reason',(service,failures,reason));
  if failures and (failures==1 or failures%5==0):print(json.dumps({'event':'RUBY_MONITOR_ALERT','service':service,'status':status,'reason':reason,'failures':failures}),flush=True)
  if not failures and prior and prior[0]:print(json.dumps({'event':'RUBY_MONITOR_RECOVERED','service':service}),flush=True)
 cutoff=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=30)).isoformat();db.execute('DELETE FROM checks WHERE time<?',(cutoff,));db.commit();db.close();summary={'time':now,'checks':[{'service':n,'status':s,'ms':m,'reason':r} for n,s,m,r in rows]};tmp=STATE/'latest.tmp';tmp.write_text(json.dumps(summary));tmp.chmod(0o600);tmp.replace(STATE/'latest.json');print(json.dumps(summary),flush=True)
 # The report is only the fixed allow-listed health snapshot, never raw logs.
 # SQLite remains the source during a database or application outage.
 try:
  credential=Path(os.environ.get('CREDENTIALS_DIRECTORY','/nonexistent'))/'monitor-secret'
  if credential.exists():
   class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
   key=credential.read_text().strip();req=urllib.request.Request(BASE+'/api/internal/system-monitor',data=json.dumps(summary).encode(),method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+key,'User-Agent':'RubyHair-Availability-Monitor/1.0'})
   with urllib.request.build_opener(NoRedirect).open(req,timeout=8) as response:print('RUBY_MONITOR_REPORT_STATUS',response.status,flush=True)
 except Exception:print('RUBY_MONITOR_REPORT_UNAVAILABLE',flush=True)
if __name__=='__main__':main()
