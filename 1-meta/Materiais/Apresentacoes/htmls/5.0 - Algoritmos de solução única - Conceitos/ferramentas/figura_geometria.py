"""Extrai a geometria de uma figura PDF (Ipe, TikZ, pgfplots...) para recriá-la como animação SVG.

uso: python figura_geometria.py figura.pdf [aula.pdf:12 ...]   (':N' = página N; padrão: 1)
Lista, em pt e com origem no canto superior esquerdo da figura (como no SVG):
  CIRC  centro e raio dos círculos (nós de grafos)
  D     traços e preenchimentos: cor, espessura, tracejado e segmentos (L = linha, C = Bézier)
  T     textos: fonte, tamanho, origem (linha de base) e direção
Dica: o tamanho natural da figura é o 'rect'; no slide ela aparece com largura = rect.width × scale.
"""
import sys
try:
    import pymupdf as fitz
except ImportError:
    import fitz

def P(p): return '(%.2f,%.2f)' % (p.x, p.y)
for arg in sys.argv[1:]:
    name, _, pg = arg.rpartition(':') if arg.rpartition(':')[2].isdigit() else (arg, '', '1')
    p = fitz.open(name)[int(pg) - 1]
    print('==', name, 'página', pg, 'rect', p.rect)
    for d in p.get_drawings():
        col = d.get('color') and tuple(round(x * 255) for x in d['color'])
        fill = d.get('fill') and tuple(round(x * 255) for x in d['fill'])
        it = d['items']; r = d['rect']
        if it and all(i[0] == 'c' for i in it) and len(it) == 4 and abs(r.width - r.height) < 0.05:
            print(' CIRC c=(%.2f,%.2f) r=%.2f' % ((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.width / 2), 'cor', col, 'preench.', fill, 'esp.', d.get('width'))
            continue
        segs = ' '.join(('L' + P(i[1]) + P(i[2])) if i[0] == 'l' else ('C' + P(i[1]) + P(i[2]) + P(i[3]) + P(i[4])) if i[0] == 'c'
                        else ('R' + str(i[1])) for i in it)
        print(' D cor', col, 'preench.', fill, 'esp.', d.get('width'), 'tracejado', d.get('dashes'),
              'opac.', d.get('fill_opacity'), segs[:600])
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                print(' T', repr(s['text']), s['font'], round(s['size'], 2), 'origem', [round(v, 2) for v in s['origin']],
                      'dir', l['dir'], 'cor', hex(s['color']))
