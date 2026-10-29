"""Compara a posição de cada linha de texto do PDF com a do HTML (em pt).

uso: python alinhar.py apresentacao.pdf medidas.json [v]
  medidas.json: saída de  node medir.js ...
  sem 'v': uma linha por página (maior desvio vertical, quebras diferentes, linhas sem par)
  com 'v': todas as linhas, com dy/dx e a posição no PDF
Observação: rótulos de dentro das figuras (texto do PDF da figura) aparecem como "sem par" — normal.
"""
import sys, json, unicodedata, re
try:
    import pymupdf as fitz
except ImportError:
    import fitz

d = fitz.open(sys.argv[1]); H = json.load(open(sys.argv[2], encoding='utf-8')); verbose = len(sys.argv) > 3

def norm(s):
    return re.sub(r'[^A-Za-z0-9]', '', unicodedata.normalize('NFKD', s.replace('ı', 'i')))

def pdf_lines(pg):
    out = []
    for b in d[pg - 1].get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            chars = [c for s in l['spans'] for c in s['chars']]
            if not chars: continue
            txt = ''.join(c['c'] for c in chars)
            m = re.match(r'\s*\d+\.?\s+', txt)          # rótulo de lista ("1.")
            if m and len(txt) > m.end() + 2: chars = chars[m.end():]; txt = txt[m.end():]
            c0 = next((c for c in chars if c['c'].isalnum()), chars[0])
            out.append((norm(txt), c0['origin'][0], c0['origin'][1], txt))
    return out

def html_lines(words):
    groups = []
    for w in sorted(words, key=lambda w: w['y']):
        if groups and abs(groups[-1][0]['y'] - w['y']) < 1.5: groups[-1].append(w)
        else: groups.append([w])
    out = []
    for g in groups:
        g = sorted(g, key=lambda w: w['x']); t = ''.join(w['t'] for w in g)
        out.append((norm(t), g[0]['x'], g[0]['y'], t))
    return out

for pg, rec in sorted(H.items(), key=lambda x: int(x[0])):
    pg = int(pg); pl = [l for l in pdf_lines(pg) if l[2] < 242]; hl = html_lines(rec['words'])
    used, rows, dys, nq, nmiss = set(), [], [], 0, 0
    for t, x, y, raw in pl:
        if len(t) < 3: continue
        best = None
        for j, (t2, x2, y2, raw2) in enumerate(hl):
            if j in used or len(t2) < 3: continue
            k = min(len(t), len(t2), 10)
            if t[:k] == t2[:k] and (best is None or abs(y2 - y) < abs(hl[best][2] - y)): best = j
        if best is None:
            nmiss += 1; rows.append('  ?? %-40s y=%.1f' % (raw[:40], y)); continue
        used.add(best); t2, x2, y2, raw2 = hl[best]
        same = t[-6:] == t2[-6:]; nq += not same; dys.append(abs(y2 - y))
        rows.append('  dy=%+5.1f dx=%+5.1f %s %-40s pdf=(%.1f,%.1f)' % (y2 - y, x2 - x, ' ' if same else 'Q', raw[:40], x, y))
    if verbose:
        print('== p%d' % pg); print('\n'.join(rows))
    else:
        print('p%-4d max|dy|=%5.1f  quebras diferentes=%d  sem par=%d' % (pg, max(dys or [0]), nq, nmiss))
