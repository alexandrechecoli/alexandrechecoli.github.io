"""Monta uma "tira" (grade) com os quadros gravados por filmar.js.
uso: python tira.py pasta_quadros saida.png [colunas=4]
"""
import sys, os
try:
    import pymupdf as fitz
except ImportError:
    import fitz
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(f for f in os.listdir(d) if f.startswith('f') and f.endswith('.png'))
pms = [fitz.Pixmap(os.path.join(d, f)) for f in fs]; pms = [fitz.Pixmap(p, 0) if p.alpha else p for p in pms]
w, h = pms[0].width, pms[0].height; rows = (len(pms) + cols - 1) // cols
o = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, cols * (w + 4), rows * (h + 4)), False); o.set_rect(o.irect, (80, 80, 80))
for i, p in enumerate(pms): p.set_origin((i % cols) * (w + 4), (i // cols) * (h + 4)); o.copy(p, p.irect)
o.save(out); print(out)
