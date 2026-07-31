# Álbum

Visualizador e editor local de fotos/vídeos que roda inteiramente no navegador.
Cada pessoa escolhe uma pasta do próprio computador; o app lê as fotos, descobre
a data (EXIF → nome do arquivo → data de modificação), permite filtrar por
ano/mês/marcador e escrever uma legenda e a "história do dia" de cada foto.
As histórias são gravadas num arquivo `album.json` dentro da própria pasta.

**Nada é enviado para servidor algum** — todo o processamento acontece na máquina
de quem usa.

## Requisitos
- Navegador **Chromium no desktop**: Chrome, Edge, Opera ou Brave.
  (Firefox, Safari e navegadores de celular não têm a API de acesso a pastas.)

## Uso
Acesse a página, clique em "Escolher pasta", selecione a pasta com as fotos e
conceda a permissão de leitura/escrita.

## Estrutura
- `index.html`, `style.css`, `app.js` — o app.
- `lib/exifr.js` — leitura de data EXIF.
- `.nojekyll` — evita o processamento do GitHub Pages.
