"""Confere se cada linha de texto do PDF existe, idêntica, no HTML (mesmas quebras de linha),
e se o HTML não mostra linhas que não existem no PDF (ex.: overlay visível na hora errada).

uso: python verificar_linhas.py apresentacao.pdf medidas.json
Linhas listadas que vêm de dentro de figuras (rótulos de gráficos) são esperadas.
"""
import sys, json, re, unicodedata
try:
    import pymupdf as fitz
except ImportError:
    import fitz

d = fitz.open(sys.argv[1]); H = json.load(open(sys.argv[2], encoding='utf-8'))
def norm(s): return re.sub(r'[^A-Za-z0-9]', '', unicodedata.normalize('NFKD', s.replace('ı', 'i')))
falta = extra = 0
for pg in sorted(map(int, H)):
    rows = {}
    for b in d[pg - 1].get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            ch = [c for s in l['spans'] for c in s['chars']]
            if not ch: continue
            y = round(ch[0]['origin'][1])
            if 40 <= y <= 240: rows.setdefault(y, []).append((ch[0]['origin'][0], ''.join(c['c'] for c in ch)))
    pl = [norm(''.join(t for x, t in sorted(v))) for y, v in sorted(rows.items())]
    g = []
    for w in sorted(H[str(pg)]['words'], key=lambda w: w['y']):
        if g and abs(g[-1][0]['y'] - w['y']) < 2.5: g[-1].append(w)
        else: g.append([w])
    hl = [norm(''.join(x['t'] for x in sorted(gg, key=lambda x: x['x']))) for gg in g if gg[0]['y'] > 40]
    hs, pall = set(hl), ''.join(pl)
    for t in pl:
        t2 = re.sub(r'^\d+', '', t)
        if len(t) >= 25 and t not in hs and t2 not in hs and not any(t in h or (h in t and len(h) > 20) for h in hl):
            falta += 1; print('PDF sem igual no HTML  p%d  %s' % (pg, t[:70]))
    for h in hl:
        if len(h) >= 20 and h not in pall and re.sub(r'^\d+', '', h) not in pall:
            extra += 1; print('HTML sem igual no PDF  p%d  %s' % (pg, h[:70]))
print('linhas do PDF sem linha idêntica no HTML: %d | linhas do HTML que não existem no PDF: %d' % (falta, extra))
