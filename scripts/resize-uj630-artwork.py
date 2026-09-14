"""Resize previously prepared static covers on the Mac; no network request."""
from pathlib import Path
import json, hashlib
from PIL import Image
root=Path(__file__).resolve().parent.parent
for plane, size in [('1080',(300,175)),('720',(200,117))]:
    out=root/'assets'/('uj630-artwork-'+plane);out.mkdir(exist_ok=True)
    rows=[]
    for file in sorted((root/'assets/uj630-artwork').glob('*.jpg')):
        image=Image.open(file).convert('RGB');image.thumbnail(size,Image.Resampling.LANCZOS)
        target=out/file.name;image.save(target,'JPEG',quality=90,optimize=True)
        rows.append({'file':file.name,'width':image.width,'height':image.height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    (root/'evidence-uj630'/('artwork-'+plane+'.json')).write_text(json.dumps(rows,indent=2))
    print(plane,len(rows),sum(row['bytes'] for row in rows))
