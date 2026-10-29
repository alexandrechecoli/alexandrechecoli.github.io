"""Converte uma apresentação Beamer (.tex) no modelo de slides HTML (ver ../contexto.md).

Uso:
    python tex2html.py apresentacao.tex pasta_saida [--modelo PASTA_HTML_MODELO] [--forcar]

- pasta_saida recebe index.html, as figuras convertidas (img/) e uma cópia do
  "motor" do modelo (css/, js/, lib/, fonts/, ferramentas/, contexto.md).
- --modelo: pasta html que serve de modelo (padrão: a pasta acima desta).
- Por segurança, NÃO sobrescreve um index.html existente (ele pode ter animações
  feitas à mão). Use --forcar para sobrescrever.

Requisitos: Python 3 com PyMuPDF (pip install pymupdf) e pdftocairo no PATH
(vem com o MiKTeX/TeX Live ou com o Poppler).
"""
import re, json, sys, os, shutil, subprocess, argparse, html as H

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit('Instale o PyMuPDF:  python -m pip install pymupdf')

ap = argparse.ArgumentParser()
ap.add_argument('tex'); ap.add_argument('saida')
ap.add_argument('--modelo', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap.add_argument('--forcar', action='store_true')
args = ap.parse_args()

SRC = os.path.abspath(args.tex); TEXDIR = os.path.dirname(SRC)
OUTDIR = os.path.abspath(args.saida); MODELO = os.path.abspath(args.modelo)
OUT = os.path.join(OUTDIR, 'index.html')
if os.path.exists(OUT) and not args.forcar:
    sys.exit('%s já existe (pode conter animações feitas à mão). Use --forcar para sobrescrever.' % OUT)
os.makedirs(OUTDIR, exist_ok=True)
tex = open(SRC, encoding='utf-8').read()

TEXTWIDTH = 403.7          # \textwidth do Beamer 16:9 com margens 30pt / 20pt (em pt PDF)
SVG_MAX = 1.0e6            # SVG maior que isso vira PNG (ex.: superfícies do pgfplots)
warnings = []
counters = {'eq': 0, 'alg': 0}

# ---------- preâmbulo ----------
def strip_comments(s):
    return re.sub(r'(?<!\\)%[^\n]*', '', s)

pre, body = tex.split('\\begin{document}', 1)
body = body.split('\\end{document}', 1)[0]
pre = strip_comments(pre); body = strip_comments(body)

def meta(cmd):
    m = re.search(r'\\' + cmd + r'\s*(\[([^\]]*)\])?\s*\{', pre)
    if not m: return '', ''
    i = m.end() - 1; d = 0
    for j in range(i, len(pre)):
        if pre[j] == '{': d += 1
        elif pre[j] == '}':
            d -= 1
            if d == 0:
                full = pre[i + 1:j]
                return (m.group(2) or full).strip(), full.strip()
    return '', ''

# cores: \definecolor + algumas cores dvipsnames comuns
COLORS = {'black': '#000000', 'white': '#ffffff', 'red': '#ff0000', 'green': '#00ff00', 'blue': '#0000ff',
          'cyan': '#00ffff', 'magenta': '#ff00ff', 'yellow': '#ffff00', 'orange': '#ff8000', 'gray': '#808080',
          'BrickRed': '#b6321d', 'ForestGreen': '#009b55', 'RoyalBlue': '#0071bc', 'Orange': '#f58137',
          'Maroon': '#af3235', 'NavyBlue': '#006eb8', 'OliveGreen': '#3c8031', 'Purple': '#99479b',
          'Gray': '#949698', 'Green': '#00a64f', 'Blue': '#2d2f92', 'Red': '#ed1b23', 'Black': '#000000',
          'Cyan': '#00aeef', 'Magenta': '#ec008c', 'Yellow': '#fff200', 'Plum': '#92268f', 'Sepia': '#671800'}
for m in re.finditer(r'\\definecolor\{(\w+)\}\{(\w+)\}\{([^}]*)\}', pre):
    name, model, val = m.groups()
    try:
        if model == 'RGB':
            r, g, b = [int(float(v)) for v in val.split(',')]
        elif model == 'rgb':
            r, g, b = [round(float(v) * 255) for v in val.split(',')]
        elif model == 'HTML':
            COLORS[name] = '#' + val.strip().lower(); continue
        elif model == 'cmyk':
            c, mm, y, k = [float(v) for v in val.split(',')]
            r, g, b = [round(255 * (1 - x) * (1 - k)) for x in (c, mm, y)]
        else: continue
        COLORS[name] = '#%02x%02x%02x' % (r, g, b)
    except ValueError:
        pass
used_colors = {}
def color_class(name):
    base = name.split('!')[0]
    if base not in COLORS:
        warnings.append('cor desconhecida (use \\definecolor ou acrescente em COLORS): ' + name)
        return 'c-' + re.sub(r'\W', '', base.lower())
    cls = 'c-' + re.sub(r'\W', '', base.lower())
    used_colors[cls] = COLORS[base]
    return cls

# ---------- figuras ----------
sizes = {}
def find_figure(f):
    cands = []
    gpm = re.search(r'\\graphicspath\{((?:\{[^{}]*\})*)\}', pre)
    paths = [''] + (re.findall(r'\{([^{}]*)\}', gpm.group(1)) if gpm else [])
    for gp in paths:
        for ext in ['', '.pdf', '.png', '.jpg', '.jpeg']:
            cands.append(os.path.join(TEXDIR, gp, f + ext))
    for c in cands:
        if os.path.isfile(c): return c
    return None

def figure(f):
    """converte a figura (uma vez) e devolve (url relativa, largura natural em pt)"""
    if f in sizes: return sizes[f]
    src = find_figure(f)
    if not src:
        warnings.append('figura não encontrada: ' + f); sizes[f] = ('img/' + f, 100.0); return sizes[f]
    rel = os.path.relpath(src, TEXDIR).replace('\\', '/')
    rel = rel[4:] if rel.startswith('img/') else rel
    stem, ext = os.path.splitext(rel)
    os.makedirs(os.path.join(OUTDIR, 'img', os.path.dirname(stem)), exist_ok=True)
    if ext.lower() == '.pdf':
        r = fitz.open(src)[0].rect   # CropBox, como o \includegraphics
        out_svg = os.path.join(OUTDIR, 'img', stem + '.svg')
        subprocess.run(['pdftocairo', '-svg', src, out_svg], check=True, capture_output=True)
        if os.path.getsize(out_svg) > SVG_MAX:
            os.remove(out_svg)
            subprocess.run(['pdftocairo', '-png', '-r', '300', '-singlefile', src, os.path.join(OUTDIR, 'img', stem)],
                           check=True, capture_output=True)
            url = 'img/' + stem + '.png'
        else:
            url = 'img/' + stem + '.svg'
        sizes[f] = (url, r.width)
    else:
        dst = os.path.join(OUTDIR, 'img', rel); shutil.copyfile(src, dst)
        pm = fitz.Pixmap(src); dpi = pm.xres or 72
        sizes[f] = ('img/' + rel, pm.width * 72.0 / dpi)
    return sizes[f]

# ---------- utilidades de parsing ----------
def group(s, i):
    """s[i] == '{' -> (conteúdo, índice após '}')"""
    assert s[i] == '{', (s[i:i + 40])
    d = 0
    for j in range(i, len(s)):
        c = s[j]
        if c == '{' and s[j - 1] != '\\': d += 1
        elif c == '}' and s[j - 1] != '\\':
            d -= 1
            if d == 0: return s[i + 1:j], j + 1
    raise ValueError('grupo sem fim: ' + s[i:i + 60])

def bracket(s, i, o='[', c=']'):
    assert s[i] == o
    d = 0
    for j in range(i, len(s)):
        if s[j] == o: d += 1
        elif s[j] == c:
            d -= 1
            if d == 0: return s[i + 1:j], j + 1
    raise ValueError('colchete sem fim')

def skipws(s, i):
    while i < len(s) and s[i] in ' \t\n': i += 1
    return i

def env_end(s, i, name):
    """i aponta após \\begin{name}; retorna (corpo, índice após \\end{name})"""
    d = 1
    pat = re.compile(r'\\(begin|end)\{' + re.escape(name) + r'\}')
    for m in pat.finditer(s, i):
        d += 1 if m.group(1) == 'begin' else -1
        if d == 0: return s[i:m.start()], m.end()
    raise ValueError('ambiente sem fim: ' + name)

def fixmath(m):
    # no Beamer (texto sans + matemática serif), \text{} dentro de fórmulas usa a fonte sans
    m = m.replace('\\text{', '\\textsf{')
    m = re.sub(r'\\color\{(\w+)\}', lambda x: '\\color{' + COLORS.get(x.group(1), x.group(1)) + '}', m)
    return H.escape(m, quote=False)

def has_top_justifying(body):
    depth = 0
    for m in re.finditer(r'\\(begin|end)\{[^}]*\}|\\justifying', body):
        t = m.group(0)
        if t.startswith('\\begin'): depth += 1
        elif t.startswith('\\end'): depth -= 1
        elif depth == 0: return True
    return False

def overlay_wrap(spec, nodes, attr='data-on'):
    real = [k for k in nodes if not (k[0] == 'p' or (k[0] == 'i' and not k[1].strip()))]
    if len(real) == 1 and real[0][0] == 'b':
        return ('b', re.sub(r'^<(\w+)', lambda m: '<%s %s="%s"' % (m.group(1), attr, spec), real[0][1], count=1))
    if any(k[0] == 'b' for k in nodes):
        return ('b', '<div class="ov-block" %s="%s">%s</div>' % (attr, spec, blocks(nodes)))
    return ('i', '<span %s="%s">%s</span>' % (attr, spec, inline(nodes)))

# ---------- conversão ----------
# nós: ('i', html) inline | ('b', html) bloco | ('p',) quebra de parágrafo
INLINE_TAGS = {'textbf': 'b', 'textit': 'i', 'emph': 'i', 'textsl': 'i', 'underline': 'u', 'texttt': 'code'}
IGNORE = {'justifying', 'centering', 'vfill', 'par', 'noindent', 'small', 'large', 'Large', 'LARGE', 'footnotesize',
          'scriptsize', 'tiny', 'normalsize', 'raggedright', 'medskip', 'smallskip', 'bigskip', 'newline', 'hfill', 'quad', 'qquad'}

def conv(s):
    out = []
    i, n = 0, len(s)
    buf = []
    quote_open = [False]
    def flush():
        if buf:
            out.append(('i', ''.join(buf))); buf.clear()
    while i < n:
        c = s[i]
        if c == '\\':
            if s.startswith('\\begin{', i):
                name, j = group(s, i + 6)
                body, k = env_end(s, j, name)
                flush(); out.append(('b', env(name, body))); i = k; continue
            if s.startswith('\\\\', i):
                buf.append('<br>'); i += 2; continue
            m = re.match(r'\\([A-Za-z]+|.)', s[i:])
            cmd = m.group(1); i += len(m.group(0))
            if cmd in INLINE_TAGS:
                i = skipws(s, i); arg, i = group(s, i)
                tag = INLINE_TAGS[cmd]
                buf.append('<%s>%s</%s>' % (tag, inline(conv(arg)), tag)); continue
            if cmd == 'text':
                i = skipws(s, i); arg, i = group(s, i); buf.append(inline(conv(arg))); continue
            if cmd == 'textsc':
                i = skipws(s, i); arg, i = group(s, i)
                buf.append('<span style="font-variant:small-caps">%s</span>' % inline(conv(arg))); continue
            if cmd == 'textcolor':
                name, i = group(s, i); i = skipws(s, i); arg, i = group(s, i)
                buf.append('<span class="%s">%s</span>' % (color_class(name), inline(conv(arg)))); continue
            if cmd == 'alert':
                i = skipws(s, i); arg, i = group(s, i)
                buf.append('<span class="c-alert">%s</span>' % inline(conv(arg))); continue
            if cmd in ('href',):
                u, i = group(s, i); i = skipws(s, i); arg, i = group(s, i)
                buf.append('<a href="%s">%s</a>' % (H.escape(u), inline(conv(arg)))); continue
            if cmd == 'url':
                u, i = group(s, i); buf.append('<a href="%s">%s</a>' % (H.escape(u), H.escape(u))); continue
            if cmd == 'color':
                name, i = group(s, i)
                rest = conv(s[i:])
                flush()
                cls = color_class(name)
                if any(k[0] == 'b' for k in rest):
                    out.append(('b', '<div class="%s">%s</div>' % (cls, blocks(rest))))
                else:
                    txt = inline(rest)
                    if txt.strip(): out.append(('i', '<span class="%s">%s</span>' % (cls, txt)))
                return out
            if cmd in ('onslide', 'uncover', 'visible', 'only'):
                spec = '1-'
                if i < n and s[i] == '<': spec, i = bracket(s, i, '<', '>')
                i = skipws(s, i)
                if i < n and s[i] == '{': arg, i = group(s, i)
                else: arg, i = s[i:], n
                flush(); out.append(overlay_wrap(spec, conv(arg), 'data-only' if cmd == 'only' else 'data-on')); continue
            if cmd == 'pause':
                warnings.append('\\pause não é convertido: use \\onslide<n->{...} (ou acrescente data-on à mão)'); continue
            if cmd == 'includegraphics':
                spec = None
                if s[i] == '<': spec, i = bracket(s, i, '<', '>')
                i = skipws(s, i)
                opts = ''
                if s[i] == '[': opts, i = bracket(s, i)
                i = skipws(s, i)
                f, i = group(s, i)
                url, nat = figure(f.strip())
                w = nat
                mm = re.search(r'scale\s*=\s*([\d.]+)', opts)
                if mm: w = nat * float(mm.group(1))
                mm = re.search(r'width\s*=\s*([\d.]*)\s*\\(textwidth|linewidth)', opts)
                if mm: w = float(mm.group(1) or 1) * TEXTWIDTH
                mm = re.search(r'width\s*=\s*([\d.]+)\s*(cm|mm|pt|in)', opts)
                if mm: w = float(mm.group(1)) * {'cm': 28.3465, 'mm': 2.83465, 'pt': 0.99626, 'in': 72}[mm.group(2)]
                attr = ' data-only="%s"' % spec if spec else ''
                buf.append('<img class="ig" src="%s" style="width:%.2fpt" alt=""%s>' % (url, w, attr))
                continue
            if cmd in IGNORE:
                continue
            if cmd in ('hspace', 'vspace', 'label', 'hspace*', 'vspace*'):
                i = skipws(s, i)
                if i < n and s[i] == '*': i += 1
                if i < n and s[i] == '{': _, i = group(s, i)
                continue
            if cmd in ('%', '&', '#', '_', '{', '}', '$'):
                buf.append(H.escape(cmd)); continue
            if cmd == ' ':
                buf.append(' '); continue
            warnings.append('comando desconhecido (verifique o slide): \\' + cmd)
            buf.append(H.escape('\\' + cmd)); continue
        if c == '{':
            arg, i = group(s, i)
            nodes = conv(arg)
            flush(); out.extend(nodes); continue
        if c == '$':
            if s.startswith('$$', i):
                j = s.index('$$', i + 2); flush()
                out.append(('b', '<div class="eq">\\[%s\\]</div>' % fixmath(s[i + 2:j].strip()))); i = j + 2; continue
            j = i + 1
            while s[j] != '$' or s[j - 1] == '\\': j += 1
            buf.append('\\(' + fixmath(s[i + 1:j]) + '\\)'); i = j + 1; continue
        if c == '\n':
            m = re.match(r'\n[ \t]*\n\s*', s[i:])
            if m:
                flush(); out.append(('p',)); i += len(m.group(0)); continue
            buf.append(' '); i += 1; continue
        if c == '"':  # babel português: aspas viram aspas tipográficas
            buf.append('\u201d' if quote_open[0] else '\u201c'); quote_open[0] = not quote_open[0]; i += 1; continue
        if s.startswith("``", i): buf.append('\u201c'); i += 2; continue
        if s.startswith("''", i): buf.append('\u201d'); i += 2; continue
        if s.startswith('---', i): buf.append('\u2014'); i += 3; continue
        if s.startswith('--', i): buf.append('\u2013'); i += 2; continue
        if c == '~':
            buf.append('&nbsp;'); i += 1; continue
        buf.append(H.escape(c)); i += 1
    flush()
    return out

def inline(nodes):
    res = []
    for k in nodes:
        if k[0] == 'i': res.append(k[1])
        elif k[0] == 'p': res.append(' ')
        else:
            warnings.append('bloco dentro de texto corrido'); res.append(k[1])
    return re.sub(r'\s+', ' ', ''.join(res))

def blocks(nodes):
    res, para = [], []
    def flush():
        t = re.sub(r'\s+', ' ', ''.join(para)).strip()
        para.clear()
        if not t: return
        if re.fullmatch(r'(<img [^>]*>\s*)+', t): res.append('<p class="imgs">%s</p>' % t)
        else: res.append('<p>%s</p>' % t)
    for k in nodes:
        if k[0] == 'i': para.append(k[1])
        elif k[0] == 'p': flush()
        else: flush(); res.append(k[1])
    flush()
    return '\n'.join(res)

def jclass(body, default_rag):
    if has_top_justifying(body): return ' jus'
    return ' rag' if default_rag else ''

def split_items(body):
    pos, depth = [], 0
    for m in re.finditer(r'\\(begin|end)\{[^}]*\}|\\item\b', body):
        t = m.group(0)
        if t.startswith('\\begin'): depth += 1
        elif t.startswith('\\end'): depth -= 1
        elif depth == 0: pos.append(m.start())
    pre_ = body[:pos[0]] if pos else body
    return pre_, [body[a + 5:b] for a, b in zip(pos, pos[1:] + [len(body)])]

ALG_KW = {'While': 'while', 'For': 'for', 'ForAll': 'for all', 'If': 'if', 'ElsIf': 'else if', 'Else': 'else',
          'EndWhile': 'end while', 'EndFor': 'end for', 'EndIf': 'end if', 'Repeat': 'repeat', 'Until': 'until',
          'Return': 'return', 'Require': 'Require:', 'Ensure': 'Ensure:', 'Function': 'function', 'EndFunction': 'end function',
          'Procedure': 'procedure', 'EndProcedure': 'end procedure'}
def algorithmic(body):
    """algpseudocode -> linhas com recuo (classes l1, l2, l3...)"""
    toks = list(re.finditer(r'\\(State|Statex|While|EndWhile|For|ForAll|EndFor|If|ElsIf|Else|EndIf|Repeat|Until|Return|Require|Ensure|Function|EndFunction|Procedure|EndProcedure)\b', body))
    lines, level = [], 1
    for k, m in enumerate(toks):
        cmd = m.group(1); end = toks[k + 1].start() if k + 1 < len(toks) else len(body)
        rest = body[m.end():end].strip()
        cond = ''
        if cmd in ('While', 'For', 'ForAll', 'If', 'ElsIf', 'Until') and rest.startswith('{'):
            c, j = group(rest, 0); cond = inline(conv(c)); rest = rest[j:].strip()
        if cmd in ('Function', 'Procedure') and rest.startswith('{'):
            nm, j = group(rest, 0); rest = rest[j:].strip()
            ar = ''
            if rest.startswith('{'): ar, j = group(rest, 0); rest = rest[j:].strip()
            cond = '<span style="font-variant:small-caps">%s</span>(%s)' % (inline(conv(nm)), inline(conv(ar)))
        if rest.startswith('{') and cmd in ('State', 'Statex', 'Return'):
            c, j = group(rest, 0); rest = c + rest[j:]
        txt = inline(conv(rest)).strip()
        if cmd in ('EndWhile', 'EndFor', 'EndIf', 'Until', 'EndFunction', 'EndProcedure', 'ElsIf', 'Else'): level = max(1, level - 1)
        if cmd in ('State', 'Statex'): html_ = txt
        elif cmd in ('While', 'For', 'ForAll'): html_ = '<b>%s</b> %s <b>do</b> %s' % (ALG_KW[cmd], cond, txt)
        elif cmd in ('If', 'ElsIf'): html_ = '<b>%s</b> %s <b>then</b> %s' % (ALG_KW[cmd], cond, txt)
        elif cmd == 'Until': html_ = '<b>until</b> %s %s' % (cond, txt)
        else: html_ = '<b>%s</b> %s %s' % (ALG_KW[cmd], cond, txt)
        lines.append('<div class="l%d">%s</div>' % (level, html_.strip()))
        if cmd in ('While', 'For', 'ForAll', 'If', 'ElsIf', 'Else', 'Repeat', 'Function', 'Procedure'): level += 1
    return '\n'.join(lines)

def env(name, body):
    if name == 'center':
        return '<div class="center">%s</div>' % blocks(conv(body))
    if name == 'tcolorbox':
        i = skipws(body, 0); opts = ''
        if i < len(body) and body[i] == '[': opts, i = bracket(body, i)
        cls = 'tcb' + (' bs0' if re.search(r'boxsep\s*=\s*0pt', opts) else '') + ' jus'  # corpo justificado (\parbox)
        return '<div class="%s">%s</div>' % (cls, blocks(conv(body[i:])))
    if name in ('block', 'alertblock', 'exampleblock'):
        i = skipws(body, 0); title, i = group(body, i)
        rest = body[i:]
        t = blocks(conv(title))
        t = re.sub(r'^<div class="center">(.*)</div>$', r'\1', t, flags=re.S)
        t = re.sub(r'^<p>(.*)</p>$', r'\1', t, flags=re.S)
        return ('<div class="block"><div class="block-title">%s</div>'
                '<div class="block-body%s">%s</div></div>') % (t, jclass(rest, False), blocks(conv(rest)))
    if name in ('enumerate', 'itemize'):
        pre_, items = split_items(body)
        lis = []
        for it in items:
            attrs, it2 = '', it
            mm = re.match(r'\s*<([^>]*)>', it2)
            if mm: attrs += ' data-on="%s"' % mm.group(1); it2 = it2[mm.end():]
            mm = re.match(r'\s*\[([^\]]*)\]', it2)
            if mm: attrs += ' data-label="%s"' % H.escape(mm.group(1)); it2 = it2[mm.end():]
            inner = re.sub(r'^<p>(.*?)</p>', r'\1', blocks(conv(it2)), count=1, flags=re.S)
            lis.append('<li%s>%s</li>' % (attrs, inner))
        tag, cls = ('ol', 'enum') if name == 'enumerate' else ('ul', 'itemz')
        return '<%s class="%s%s">\n%s\n</%s>' % (tag, cls, jclass(pre_, True), '\n'.join(lis), tag)
    if name == 'columns':
        i = skipws(body, 0)
        if body[i:i + 1] == '[': _, i = bracket(body, i)
        return '<div class="columns">%s</div>' % blocks(conv(body[i:]))
    if name == 'column':
        i = skipws(body, 0); w, i = group(body, i)
        frac = float(re.match(r'\s*([\d.]*)', w).group(1) or 1)
        rest = body[i:]
        return '<div class="column%s" style="width:%.2fpt">%s</div>' % (jclass(rest, True), frac * TEXTWIDTH, blocks(conv(rest)))
    if name in ('equation*', 'equation', 'displaymath', 'align*', 'align', 'gather*', 'gather'):
        tag = ''
        numbered = not name.endswith('*') and name != 'displaymath'
        if numbered:
            counters['eq'] += 1; tag = '<span class="eqno">\\((%d)\\)</span>' % counters['eq']
        b = body
        if name.startswith('align') or name.startswith('gather'):
            b = '\\begin{%s}%s\\end{%s}' % ('aligned' if name.startswith('align') else 'gathered', body, 'aligned' if name.startswith('align') else 'gathered')
        if '\\onslide' in b:
            parts, i = [], 0
            for m in re.finditer(r'\\onslide<([^>]*)>\{', b):
                if m.start() < i: continue
                if b[i:m.start()].strip():
                    parts.append('<span>\\[%s\\]</span>' % fixmath(b[i:m.start()].strip()))
                arg, j = group(b, m.end() - 1)
                parts.append('<span data-on="%s">\\[%s\\]</span>' % (m.group(1), fixmath(arg.strip())))
                i = j
            if b[i:].strip():
                parts.append('<span>\\[%s\\]</span>' % fixmath(b[i:].strip()))
            return '<div class="eq eq-row">%s</div>' % ''.join(parts)
        return '<div class="eq">\\[%s\\]%s</div>' % (fixmath(b.strip()), tag)
    if name == 'algorithm':
        i = skipws(body, 0)
        if body[i:i + 1] == '[': _, i = bracket(body, i)
        body = body[i:]
        cap = ''
        m = re.search(r'\\caption\{', body)
        if m:
            c, j = group(body, m.end() - 1); cap = inline(conv(c)); body = body[:m.start()] + body[j:]
        counters['alg'] += 1
        alg = re.search(r'\\begin\{algorithmic\}(\[[^\]]*\])?', body)
        inner = env_end(body, alg.end(), 'algorithmic')[0] if alg else body
        return ('<div class="algorithm">\n<div class="alg-cap"><b>Algorithm %d</b> %s</div>\n<div class="alg-body">\n%s\n</div>\n</div>'
                % (counters['alg'], cap, algorithmic(inner)))
    if name == 'algorithmic':
        return '<div class="algorithm"><div class="alg-body">\n%s\n</div></div>' % algorithmic(body)
    warnings.append('ambiente não suportado (convertido como texto simples): ' + name)
    return '<div class="unknown-%s">%s</div>' % (name, blocks(conv(body)))

# ---------- documento ----------
short_title, title = meta('title')
short_author, author = meta('author')
_, date = meta('date')
title_html = inline(conv(title)); author_html = inline(conv(author)); date_html = inline(conv(date))
if date.strip() == '\\today': date_html = ''

sections, frames_html = [], []
pos, cur_section = 0, ''
tok = re.compile(r'\\section\*?(\[[^\]]*\])?\{([^}]*)\}|\\subsection\*?(\[[^\]]*\])?\{[^}]*\}|\\begin\{frame\}')
while True:
    m = tok.search(body, pos)
    if not m: break
    g = m.group(0)
    if g.startswith('\\subsection'):
        pos = m.end(); continue
    if g.startswith('\\section'):
        cur_section = m.group(2); sections.append(cur_section)
        frames_html.append('<section class="frame sec notitle" data-section="%s">\n<div class="fc"><div class="sec-title">%s</div></div>\n</section>'
                           % (H.escape(cur_section), inline(conv(cur_section))))
        pos = m.end(); continue
    fb, pos = env_end(body, m.end(), 'frame')
    i = 0; i2 = skipws(fb, i); opts = ''
    if fb[i2:i2 + 1] == '<': _, i = bracket(fb, i2, '<', '>'); i2 = skipws(fb, i)
    if fb[i2:i2 + 1] == '[': opts, i = bracket(fb, i2); i2 = skipws(fb, i)
    ftitle = fsub = None
    mt = re.match(r'\\frametitle\{', fb[i2:])
    if fb[i2:i2 + 1] == '{':
        ftitle, i = group(fb, i2); i2 = skipws(fb, i)
        if fb[i2:i2 + 1] == '{': fsub, i = group(fb, i2)
    content = fb[i:]
    mt = re.search(r'\\frametitle\{', content)
    if mt and ftitle is None:
        ftitle, j = group(content, mt.end() - 1); content = content[:mt.start()] + content[j:]
    ms = re.search(r'\\framesubtitle\{', content)
    if ms and fsub is None:
        fsub, j = group(content, ms.end() - 1); content = content[:ms.start()] + content[j:]
    if '\\titlepage' in content or '\\maketitle' in content:
        extra = blocks(conv(content.replace('\\titlepage', '').replace('\\maketitle', '')))
        extra = re.sub(r'^<div class="center">(.*)</div>$', r'\1', extra, flags=re.S)
        extra = re.sub(r'<p class="imgs">(.*?)</p>', r'\1', extra, flags=re.S)
        frames_html.append('<section class="frame titlepage notitle">\n<div class="fc">\n<div class="tp-title">%s</div>\n'
                           '<div class="tp-author">%s</div>\n<div class="tp-date">%s</div>\n<div class="tp-img">%s</div>\n</div>\n</section>'
                           % (title_html, author_html, date_html, extra))
        continue
    if '\\tableofcontents' in content:
        frames_html.append('@@TOC@@'); continue
    cls = ['frame']
    if 't' in [o.strip() for o in opts.split(',')]: cls.append('t')
    hdr = ''
    if ftitle is not None:
        hdr = '<header class="ft"><h2>%s</h2>%s</header>\n' % (
            inline(conv(ftitle)), '<div class="subtitle">%s</div>' % inline(conv(fsub)) if fsub else '')
        if not fsub: cls.append('only-title')
    else:
        cls.append('notitle')
    fc_cls = 'fc' + (' jus' if has_top_justifying(content) else '')
    frames_html.append('<section class="%s" data-section="%s">\n%s<div class="%s">\n%s\n</div>\n</section>' % (
        ' '.join(cls), H.escape(cur_section), hdr, fc_cls, blocks(conv(content))))

toc = '<section class="frame toc notitle">\n<div class="fc">\n%s\n</div>\n</section>' % '\n'.join(
    '<div class="toc-item"><span class="toc-num">%d</span>%s</div>' % (k + 1, inline(conv(s))) for k, s in enumerate(sections))
frames_html = [toc if f == '@@TOC@@' else f for f in frames_html]

# ---------- copia o "motor" do modelo ----------
if OUTDIR != MODELO:
    for d in ('css', 'js', 'lib', 'fonts', 'ferramentas'):
        if os.path.isdir(os.path.join(MODELO, d)):
            shutil.copytree(os.path.join(MODELO, d), os.path.join(OUTDIR, d), dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns('node_modules', '__pycache__'))
    if os.path.isfile(os.path.join(MODELO, 'contexto.md')):
        shutil.copyfile(os.path.join(MODELO, 'contexto.md'), os.path.join(OUTDIR, 'contexto.md'))
anim = sorted(f for f in os.listdir(os.path.join(OUTDIR, 'js', 'anim')) if f.endswith('.js') and f != 'core.js') \
    if os.path.isdir(os.path.join(OUTDIR, 'js', 'anim')) else []
anim_tags = ''.join('<script src="js/anim/%s"></script>\n' % f for f in (['core.js'] + anim)) if anim or \
    os.path.isfile(os.path.join(OUTDIR, 'js', 'anim', 'core.js')) else ''
color_css = ''.join('.%s { color: %s; }\n' % (c, v) for c, v in sorted(used_colors.items())
                    if c not in ('c-myblue', 'c-brickred'))
style = '<style>\n%s</style>\n' % color_css if color_css else ''

page = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="lib/katex/katex.min.css">
<link rel="stylesheet" href="css/beamer.css">
%s</head>
<body data-author="%s" data-shorttitle="%s">
<main id="deck">

%s

</main>
<script src="lib/katex/katex.min.js"></script>
<script src="lib/katex/contrib/auto-render.min.js"></script>
<script src="lib/hyphen/hyphen.js"></script>
<script src="lib/hyphen/pt.js"></script>
<script src="js/texbreak.js"></script>
%s<script src="js/slides.js"></script>
</body>
</html>
''' % (H.escape(re.sub(r'<[^>]+>', '', title_html)), style, H.escape(re.sub(r'<[^>]+>', '', inline(conv(short_author)))),
       H.escape(re.sub(r'<[^>]+>', '', inline(conv(short_title)))), '\n\n'.join(frames_html), anim_tags)

open(OUT, 'w', encoding='utf-8').write(page)
print('frames: %d   figuras: %d   saída: %s' % (len(frames_html), len(sizes), OUT))
for w in sorted(set(warnings)): print('AVISO:', w)
