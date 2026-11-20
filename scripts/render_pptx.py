"""Render only this generated document, without closing other open presentations."""
from pathlib import Path
import json
import shutil
import sys
import tempfile
import zipfile
import pythoncom
import win32com.client

root=Path(__file__).resolve().parents[1]
run=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else (root/'output'/json.loads((root/'output/latest.json').read_text(encoding='utf-8'))['runDirectory']).resolve()
manifest=json.loads((run/'manifest.json').read_text(encoding='utf-8'))
source=(run/manifest['pptx']).resolve()
previews=run/'previews'
previews.mkdir(exist_ok=True)
report={'renderer':'Microsoft PowerPoint','status':'fail','slides':0,'overflow':[],'textShapes':0,'editableText':'not_run','fontEmbedding':'not_run'}
app=pres=None
initial_count=0
old_alerts=None
pythoncom.CoInitialize()
try:
    app=win32com.client.DispatchEx('PowerPoint.Application')
    initial_count=app.Presentations.Count
    old_alerts=app.DisplayAlerts
    for i in range(1,initial_count+1):
        if Path(app.Presentations(i).FullName).resolve()==source:
            raise RuntimeError('目标文件正在 PowerPoint 中打开。请重新生成一个版本目录后检查；不会关闭正在编辑的文稿。')
    app.DisplayAlerts=1
    pres=app.Presentations.Open(str(source),ReadOnly=False,Untitled=False,WithWindow=False)
    report['version']=app.Version
    report['slides']=pres.Slides.Count
    assert report['slides']==manifest['slides'],'幻灯片页数不符'
    for i in range(1,pres.Slides.Count+1):
        slide=pres.Slides(i)
        for shape in slide.Shapes:
            if shape.HasTextFrame and shape.TextFrame.HasText:
                report['textShapes']+=1
                tr=shape.TextFrame.TextRange
                if tr.BoundWidth>shape.Width+1 or tr.BoundHeight>shape.Height+1:
                    report['overflow'].append({'slide':i,'text':tr.Text,'shape':[shape.Width,shape.Height],'bounds':[tr.BoundWidth,tr.BoundHeight]})
                if report['editableText']=='not_run':
                    duplicate=shape.Duplicate()(1)
                    duplicate.TextFrame.TextRange.Text='可编辑性检查'
                    assert duplicate.TextFrame.TextRange.Text=='可编辑性检查'
                    duplicate.Delete()
                    report['editableText']='pass'
        slide.Export(str(previews/f'pptx-{i}.png'),'PNG',1600,900)
    pres.SaveAs(str(previews/'pptx-render.pdf'),32)
    with tempfile.TemporaryDirectory(prefix='university-slides-') as temporary:
        embedded=Path(temporary)/'embedded.pptx'
        try:
            pres.SaveAs(str(embedded),24,-1)
            pres.Close();pres=None
            shutil.copy2(embedded,source)
            with zipfile.ZipFile(source) as z:
                fontfiles=[n for n in z.namelist() if n.startswith('ppt/fonts/')]
            report['embeddedFontFiles']=len(fontfiles)
            report['fontEmbedding']='pass' if fontfiles else 'no-font-files'
        except Exception as e:
            report['fontEmbedding']='not_completed'
            report['fontNote']=str(e)
    assert not report['overflow'],'文字溢出，需要调整内容或布局'
    assert report['editableText']=='pass','未找到可编辑文字'
    report['status']='pass'
except Exception as e:
    report['failure']=str(e)
    print(str(e),file=sys.stderr)
finally:
    if pres is not None: pres.Close()
    if app is not None:
        if old_alerts is not None: app.DisplayAlerts=old_alerts
        if initial_count==0: app.Quit()
    pythoncom.CoUninitialize()
    (run/'pptx-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    manifest['checks']['pptx']=report['status']
    (run/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
sys.exit(0 if report['status']=='pass' else 1)
