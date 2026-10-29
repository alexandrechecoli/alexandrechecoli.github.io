"""Sobreposição PDF x HTML: vermelho = só no PDF, ciano = só no HTML, preto = nos dois.

uso: python comparar.py pasta_ref pasta_html pasta_saida [paginas...]
  pasta_ref : PNGs do PDF  (pdftoppm -png -r 144 apresentacao.pdf pasta_ref/p)  -> p-001.png ...
  pasta_html: PNGs do HTML (node capturar.js ...)                                -> h-001.png ...
Imprime as 25 páginas mais diferentes (quanto maior o número, mais diferente).
"""
import sys, os
import numpy as np
try:
    import pymupdf as fitz
except ImportError:
    import fitz

ref, hd, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
pages = sys.argv[4:] or sorted(f[2:5] for f in os.listdir(hd) if f.startswith('h-'))

def load(f):
    pm = fitz.Pixmap(f)
    if pm.alpha: pm = fitz.Pixmap(pm, 0)
    return np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w, pm.n)[:, :, :3].astype(float)

scores = []
for pg in pages:
    pg = pg.zfill(3)
    r = load(f'{ref}/p-{pg}.png'); h = load(f'{hd}/h-{pg}.png')
    hh, ww = min(r.shape[0], h.shape[0]), min(r.shape[1], h.shape[1])
    r, h = r[:hh, :ww], h[:hh, :ww]
    rd = 1 - r.mean(2) / 255; hdk = 1 - h.mean(2) / 255
    img = np.ones((hh, ww, 3)) * 255
    img[:, :, 0] -= hdk * 255
    img[:, :, 1] -= np.maximum(rd, hdk) * 255
    img[:, :, 2] -= rd * 255
    img = np.clip(img, 0, 255).astype(np.uint8)
    fitz.Pixmap(fitz.csRGB, ww, hh, img.tobytes(), False).save(f'{out}/o-{pg}.png')
    scores.append((round(float(np.abs(rd - hdk).mean() * 1000), 1), pg))
for s in sorted(scores, reverse=True)[:25]: print(s)
