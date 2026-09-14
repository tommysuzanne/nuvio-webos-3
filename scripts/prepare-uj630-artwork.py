"""Prepare optional local artwork. Inputs and generated images must stay private."""
import argparse,concurrent.futures,hashlib,io,json,pathlib,urllib.request
from PIL import Image,ImageOps
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('backup',type=pathlib.Path,help='Your local collection export or targeted TV backup (never upload it to GitHub)')
p.add_argument('--allow-download',action='store_true',help='Explicitly permit image requests to the URLs in your export')
p.add_argument('--folder-title',help='Only prepare a folder with this exact title')
p.add_argument('--fit-cover',action='store_true',help='Crop selected covers centrally to 16:9, retaining proportions and filling the frame')
a=p.parse_args()
if not a.allow_download:p.error('Image download requires --allow-download; only image URLs are requested, not your API settings.')
root=pathlib.Path(__file__).resolve().parent.parent
raw=json.loads(a.backup.read_text());raw=raw.get('values',{}).get('collectionsState',raw)
state=json.loads(raw) if isinstance(raw,str) else raw
profiles=state.get('profiles',{}) if state.get('__profileScoped') else {'local':state}
urls=set()
for profile in profiles.values():
 for collection in profile.get('collections',[]):
  for folder in collection.get('folders',[]):
   if a.folder_title and folder.get('title')!=a.folder_title:continue
   url=folder.get('coverImageUrl') or collection.get('backdropImageUrl')
   if isinstance(url,str) and url.startswith(('http://','https://')):urls.add(url)
def key(url):
 # Match JavaScript UTF-16 code units, including non-BMP characters.
 units=url.encode('utf-16-le');h=2166136261
 for i in range(0,len(units),2):h=((h^(units[i]|units[i+1]<<8))*16777619)&0xffffffff
 return f'{h:x}-{len(units)//2}'
def prepare(url):
 k=key(url);filename=k+('-cover' if a.fit_cover else '')+'.jpg'
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'image/jpeg,image/png,image/webp;q=0.8'})
  with urllib.request.urlopen(req,timeout=20) as response:data=response.read(5*1024*1024+1)
  if len(data)>5*1024*1024:raise ValueError('size_limit')
  im=Image.open(io.BytesIO(data));im.seek(0)
  if im.width*im.height>40_000_000:raise ValueError('pixel_limit')
  im=ImageOps.exif_transpose(im).convert('RGBA');rgb=Image.new('RGB',im.size,(20,22,24));rgb.paste(im,mask=im.getchannel('A'))
  rows=[]
  for plane,bounds in [('',(480,360)),('-1080',(300,175)),('-720',(200,117))]:
   if a.fit_cover:
    size={'':(480,270),'-1080':(320,180),'-720':(192,108)}[plane]
    thumb=ImageOps.fit(rgb,size,method=Image.Resampling.LANCZOS,centering=(.5,.5))
   else:thumb=rgb.copy();thumb.thumbnail(bounds,Image.Resampling.LANCZOS)
   target=root/'assets'/('uj630-artwork'+plane)/filename;target.parent.mkdir(parents=True,exist_ok=True);thumb.save(target,'JPEG',quality=90,optimize=True)
   rows.append({'plane':plane,'width':thumb.width,'height':thumb.height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
  return {'key':k,'file':filename,'images':rows}
 except Exception as e:return {'key':k,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(prepare,sorted(urls)))
mp=root/'js/core/media/uj630Artwork.js';previous=mp.read_text().split('export const UJ630_ARTWORK = ',1)[1].strip().removesuffix(';');mapping=json.loads(previous)
for row in results:
 if 'file' in row:mapping[row['key']]=row['file']
mp.write_text('// Generated locally: do not publish personal artwork or image associations.\nexport const UJ630_ARTWORK = '+json.dumps(mapping,indent=2)+';\n')
evidence=root/'evidence-uj630';evidence.mkdir(exist_ok=True);(evidence/'artwork-manifest.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'requested':len(urls),'prepared':sum('file' in x for x in results),'failures':sum('error' in x for x in results),'fitCover':a.fit_cover}))
