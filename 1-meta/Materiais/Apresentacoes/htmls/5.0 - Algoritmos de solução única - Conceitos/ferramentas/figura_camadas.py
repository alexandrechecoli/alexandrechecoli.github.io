"""Converte uma sequência de figuras PDF (mesmo quadro, ex.: Ipe) em camadas para animação.

uso: python figura_camadas.py NOME saida.js fig1.pdf fig2.pdf ...
Gera  Anim.figData[NOME] = { W, H, items: [...], states: { fig1: [ids], ... } }
  - cada item é um desenho (path SVG com estilo) ou um trecho de texto, em pt, origem no canto
    superior esquerdo (como no SVG);
  - itens iguais em figuras diferentes viram o mesmo item (mesma geometria e estilo), de modo que
    cada estado é só a lista de itens presentes; a animação mostra o que entra e o que sai;
  - a ordem dos itens respeita a ordem de desenho do PDF (o que vem depois fica por cima).
Imprime um resumo: itens por figura, quantos são comuns e quais entram/saem entre figuras vizinhas.
"""
import sys, json, os
try:
    import pymupdf as fitz
except ImportError:
    import fitz


def num(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def hexcol(c):
    if c is None:
        return None
    return '#%02x%02x%02x' % tuple(round(x * 255) for x in c[:3])


def path_d(d):
    out, cur = [], None
    P = lambda p: num(p.x) + ' ' + num(p.y)
    for it in d['items']:
        op = it[0]
        if op == 're':
            r = it[1]
            out.append('M%s %sH%sV%sH%sZ' % (num(r.x0), num(r.y0), num(r.x1), num(r.y1), num(r.x0)))
            cur = None
            continue
        if op == 'qu':
            q = it[1]
            out.append('M%sL%sL%sL%sZ' % (P(q.ul), P(q.ur), P(q.lr), P(q.ll)))
            cur = None
            continue
        a = it[1]
        if cur is None or abs(cur.x - a.x) > 0.01 or abs(cur.y - a.y) > 0.01:
            out.append('M' + P(a))
        if op == 'l':
            out.append('L' + P(it[2])); cur = it[2]
        elif op == 'c':
            out.append('C' + P(it[2]) + ' ' + P(it[3]) + ' ' + P(it[4])); cur = it[4]
    if d.get('closePath'):
        out.append('Z')
    return ''.join(out)


FONTS = {  # fonte do PDF -> (família, estilo, peso)
    'LMMathItalic': ('KaTeX_Math', 'italic', None),
    'LMRoman': ('KaTeX_Main', None, None),
}


def font_of(name):
    fam, sty, wt = 'KaTeX_Main', None, None
    for k, v in FONTS.items():
        if name.startswith(k):
            fam, sty, wt = v
    if 'Bold' in name or 'Demi' in name:
        wt = 'bold'
    if 'Italic' in name and fam == 'KaTeX_Main':
        sty = 'italic'
    return fam, sty, wt


def items_of(page):
    res = []
    for d in page.get_drawings():
        fill, col = hexcol(d.get('fill')), hexcol(d.get('color'))
        dd = path_d(d)
        # o quadro branco invisível que o Ipe desenha em volta da figura não interessa
        if fill is None and col == '#ffffff':
            continue
        it = {'t': 'p', 'd': dd}
        if d['type'] in ('f', 'fs') and fill:
            it['f'] = fill
            if d.get('fill_opacity') not in (None, 1.0):
                it['fo'] = round(d['fill_opacity'], 3)
            if d.get('even_odd'):
                it['eo'] = 1
        if d['type'] in ('s', 'fs') and col:
            it['s'] = col
            it['w'] = round(d.get('width') or 1, 3)
            if d.get('stroke_opacity') not in (None, 1.0):
                it['so'] = round(d['stroke_opacity'], 3)
            da = (d.get('dashes') or '').strip()
            if da and not da.startswith('[] '):
                it['da'] = da.split(']')[0].strip('[ ').replace('  ', ' ')
            lc = d.get('lineCap')
            if lc and max(lc) > 0:
                it['lc'] = ['butt', 'round', 'square'][max(lc)]
            lj = d.get('lineJoin')
            if lj:
                it['lj'] = ['miter', 'round', 'bevel'][int(lj)]
        r = d['rect']
        it['b'] = [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)]
        res.append(it)
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if not s['text'].strip():
                    continue
                fam, sty, wt = font_of(s['font'])
                it = {'t': 'x', 'x': round(s['origin'][0], 2), 'y': round(s['origin'][1], 2), 'tx': s['text'],
                      'fs': round(s['size'], 2), 'ff': fam, 'c': '#%06x' % s['color']}
                if sty: it['st'] = sty
                if wt: it['fw'] = wt
                bb = s['bbox']
                it['b'] = [round(bb[0], 2), round(bb[1], 2), round(bb[2], 2), round(bb[3], 2)]
                res.append(it)
    return res


def sig(it):
    return json.dumps({k: v for k, v in it.items() if k != 'b'}, sort_keys=True)


def main():
    name, out, pdfs = sys.argv[1], sys.argv[2], sys.argv[3:]
    W = H = 0
    figs = []
    for f in pdfs:
        p = fitz.open(f)[0]
        W, H = max(W, p.rect.width), max(H, p.rect.height)
        figs.append((os.path.splitext(os.path.basename(f))[0], items_of(p)))
    # itens únicos, ordenados de forma compatível com a ordem de desenho de todas as figuras
    order, index = [], {}
    for _, its in figs:
        last = -1
        for it in its:
            s = sig(it)
            if s in index:
                last = max(last, order.index(s))
                continue
            order.insert(last + 1, s)
            last += 1
            index[s] = it
    ids = {s: i for i, s in enumerate(order)}
    items = [index[s] for s in order]
    states = {fn: sorted(ids[sig(it)] for it in its) for fn, its in figs}
    data = {'W': round(W, 3), 'H': round(H, 3), 'items': items, 'states': states}
    with open(out, 'w', encoding='utf-8', newline='\n') as fo:
        fo.write('/* Gerado por ferramentas/figura_camadas.py a partir de: %s */\n' % ', '.join(os.path.basename(p) for p in pdfs))
        fo.write('(window.Anim.figData = window.Anim.figData || {})[%s] = ' % json.dumps(name))
        fo.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        fo.write(';\n')
    print('%s: %d itens, quadro %.2f x %.2f' % (name, len(items), W, H))
    prev = None
    for fn, _ in figs:
        st = set(states[fn])
        if prev is None:
            print('  %-14s %3d itens' % (fn, len(st)))
        else:
            a, r = sorted(st - prev), sorted(prev - st)
            desc = lambda i: (items[i]['tx'] if items[i]['t'] == 'x' else (items[i].get('f') or '') + '/' + (items[i].get('s') or '')) + '@' + ','.join(str(round(v)) for v in items[i]['b'][:2])
            print('  %-14s %3d itens  +%d -%d' % (fn, len(st), len(a), len(r)))
            print('      +', ' '.join('%d:%s' % (i, desc(i)) for i in a))
            if r: print('      -', ' '.join('%d:%s' % (i, desc(i)) for i in r))
        prev = st


main()
