"""Check both exported PDFs independently of HTML/PPTX source validation."""
from pathlib import Path
import json
import sys
import re
import pymupdf

root=Path(__file__).resolve().parents[1]
run=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else (root/'output'/json.loads((root/'output/latest.json').read_text(encoding='utf-8'))['runDirectory']).resolve()
manifest=json.loads((run/'manifest.json').read_text(encoding='utf-8'))
model=json.loads((run/'model.json').read_text(encoding='utf-8'))
report={'status':'pass','files':[],'textConsistency':'not_run'}
texts=[]
normalize=lambda s:re.sub(r'\s+','',s)
for name in ['html-print.pdf','pptx-render.pdf']:
    file=run/'previews'/name
    item={'file':name,'status':'not_run'}
    if file.exists():
        with pymupdf.open(file) as doc:
            item['pages']=len(doc)
            item['sizes']=[[round(p.rect.width,2),round(p.rect.height,2)] for p in doc]
            item['hasText']=all(bool(p.get_text().strip()) for p in doc)
            item['status']='pass' if len(doc)==manifest['slides'] and item['hasText'] and all(abs(w-960)<1 and abs(h-540)<1 for w,h in item['sizes']) else 'fail'
            actual=[normalize(p.get_text()) for p in doc]
            item['missingContent']=[]
            for i,page in enumerate(model['pages']):
                if i>=len(actual):break
                for e in page['elements']:
                    if e['type']=='text' and normalize(e['value']) not in actual[i]:
                        item['missingContent'].append({'slide':i+1,'text':e['value']})
            if item['missingContent']:item['status']='fail'
            texts.append(actual)
    if item['status']!='pass':report['status']='fail'
    report['files'].append(item)
if len(texts)==2:
    # Each format must preserve all model text; extraction ordering can differ across renderers.
    report['textConsistency']='pass' if all(not i.get('missingContent') for i in report['files']) else 'fail'
manifest['checks']['pdf']=report['status']
(run/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(run/'pdf-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
sys.exit(0 if report['status']=='pass' else 1)
