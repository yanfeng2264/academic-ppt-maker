"""Subset the bundled OFL font for the current content; no network is used."""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

font_path,text_path,out_path=map(Path,sys.argv[1:4])
font=TTFont(font_path)
options=subset.Options()
options.name_IDs=['*']
options.name_legacy=True
options.name_languages=['*']
options.layout_features=['*']
subsetter=subset.Subsetter(options=options)
subsetter.populate(text=text_path.read_text(encoding='utf-8'))
subsetter.subset(font)
font.flavor='woff2'
font.save(out_path)
