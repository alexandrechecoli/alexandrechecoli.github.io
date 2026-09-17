/* =============================================================
   roadmap-dados.js — conteúdo do roteiro de Programação Linear
   -------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar no dia a dia.

   Cada parada tem:
     id      identificador curto, usado no link direto (#parada/modelagem)
     modulo  1, 2 ou 3 (os tres blocos do semestre)
     tipo    "parada" | "prova" | "chegada"
     curto   rótulo que aparece embaixo da bolinha (até ~14 caracteres)
     titulo  título que aparece no painel
     texto   contextualização: o que o aluno vai aprender aqui
     materiais  lista de links

   Cada material tem:
     tipo    "apresentacao" | "handout" | "lista" | "gabarito" | "ferramenta" | "extra"
     rotulo  o texto do link
     ref     (opcional) id de um <a> que já existe na página; o endereço
             é lido de lá, então você mantém a URL em um lugar só
     url     (opcional) endereço direto, usado se "ref" não for encontrado

   Se você preencher os dois, "ref" vence e "url" fica como reserva.
   ============================================================= */

window.ROADMAP_PL = [

  {
    id: "intro",
    modulo: 1,
    tipo: "parada",
    curto: "Introdução",
    titulo: "Ponto de partida",
    texto: "Antes de resolver qualquer coisa, é preciso saber o que é otimizar. Aqui você vê onde a programação linear aparece na engenharia e aprende o vocabulário que vamos usar o semestre inteiro: variáveis de decisão, função objetivo e restrições. Comece pela apresentação e depois instale o GUSEK com a Lista 0 — você vai precisar dele já na próxima parada.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Introdução à PL", ref: "m-apres-1-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/1.0 - IntroPL.pdf" },
      { tipo: "lista", rotulo: "Lista 0 — Introdução e GUSEK", ref: "m-lista-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L0_ListaAulaOnline.pdf" }
    ]
  },

  {
    id: "modelagem",
    modulo: 1,
    tipo: "parada",
    curto: "Modelagem",
    titulo: "Traduzir o problema",
    texto: "Esta é a parte mais difícil da disciplina e a que mais aparece na vida profissional: pegar um problema escrito em português — carpintaria, transporte, mistura, planejamento multi-período — e escrever o modelo matemático correspondente. Não existe fórmula para isso, só repertório. Faça as duas listas até o fim e confira nos gabaritos; os modelos .lp servem para você rodar tudo no GUSEK.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Modelagem", ref: "m-apres-1-2", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/1.2 - Modelagem.pdf" },
      { tipo: "lista", rotulo: "Lista 1 — Modelagem I", ref: "m-lista-1", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L1_ModelagemI.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 1", ref: "m-gab-1", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L1_ModelagemI_Gabarito.pdf" },
      { tipo: "lista", rotulo: "Lista 2 — Modelagem II", ref: "m-lista-2", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L1_ModelagemII.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 2", ref: "m-gab-2", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L1_ModelagemII_Gabarito.pdf" },
      { tipo: "ferramenta", rotulo: "Modelos .lp para o GUSEK", ref: "m-lps", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/LPs.rar" },
      { tipo: "extra", rotulo: "Desafio da produção", ref: "m-desafio", url: "https://alexandrechecoli.github.io/4-prog-linear/Apps/desafio-producao.html" }
    ]
  },

  {
    id: "algebra",
    modulo: 1,
    tipo: "parada",
    curto: "Álgebra",
    titulo: "A álgebra por trás",
    texto: "Um modelo de PL é um sistema de equações lineares com infinitas soluções — e o que o Simplex faz é escolher, entre elas, as que interessam. Para entender isso mais adiante você precisa estar firme em espaço vetorial, base, posto e solução de sistemas. É a parada mais abstrata do roteiro e a que mais economiza tempo depois.",
    materiais: [
      { tipo: "lista", rotulo: "Lista 3 — Álgebra I", ref: "m-lista-3", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L2_Algebra1.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 3", ref: "m-gab-3", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L2_Algebra1_Gabarito.pdf" }
    ]
  },

  {
    id: "grafico",
    modulo: 1,
    tipo: "parada",
    curto: "Método gráfico",
    titulo: "Resolver no plano",
    texto: "Com duas variáveis dá para enxergar tudo: a região viável é um polígono e a solução ótima está sempre em um vértice. Esta parada é curta, mas é a que dá a intuição geométrica de tudo o que vem depois — inclusive de por que o Simplex caminha de vértice em vértice. Use os arquivos do GeoGebra para mexer nas restrições e ver a região mudar.",
    materiais: [
      { tipo: "lista", rotulo: "Lista 4 — Método gráfico", ref: "m-lista-4", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L3_MetodoGrafico.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 4", ref: "m-gab-4", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L3_MetodoGrafico_Gabarito.pdf" },
      { tipo: "ferramenta", rotulo: "Gráficos no GeoGebra", ref: "m-geogebra", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Geogebra.rar" },
      { tipo: "ferramenta", rotulo: "LPSolver — resolvedor online", ref: "m-lpsolver", url: "https://alexandrechecoli.github.io/4-prog-linear/Apps/lp-solver.html" }
    ]
  },

  {
    id: "prova-1",
    modulo: 1,
    tipo: "prova",
    curto: "Prova 1",
    titulo: "Primeira prova",
    texto: "Fecha o primeiro bloco: modelagem, álgebra e solução gráfica. Se você consegue ler um problema novo e escrever o modelo sem olhar exemplo, e resolver um caso de duas variáveis no plano explicando por que o ótimo está naquele vértice, está pronto.",
    materiais: [
      { tipo: "extra", rotulo: "Ementa e cronograma", ref: "m-ementa", url: "https://alexandrechecoli.github.io/4-prog-linear/PlanoAula.html" }
    ]
  },

  {
    id: "simplex-2",
    modulo: 2,
    tipo: "parada",
    curto: "Simplex II",
    titulo: "Forma padrão e Simplex fase II",
    texto: "Aqui a disciplina vira a chave: saindo do desenho e entrando no algoritmo. Você coloca o modelo na forma padrão, monta o quadro e aprende o mecanismo do pivoteamento — escolher quem entra, quem sai, e repetir até não haver mais melhora. É a parada que exige mais treino manual de todo o roteiro.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Simplex fase II", ref: "m-apres-1-3", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/1.3 - SimplexFaseII.pdf" },
      { tipo: "handout", rotulo: "Handout — Simplex fase II", ref: "m-hand-1-3", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/1.3 - SimplexFaseII-Handout.pdf" },
      { tipo: "lista", rotulo: "Lista 5 — Simplex fase II", ref: "m-lista-5", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L4_SimplexFase2.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 5", ref: "m-gab-5", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L4_SimplexFase2_Gabarito.pdf" }
    ]
  },

  {
    id: "simplex-1",
    modulo: 2,
    tipo: "parada",
    curto: "Simplex I",
    titulo: "Quando não há base óbvia",
    texto: "A fase II precisa de uma solução básica viável para começar — e nem todo modelo entrega uma de graça. A fase I resolve isso: um problema auxiliar, com variáveis artificiais, cuja única função é encontrar um ponto de partida. É também aqui que a inviabilidade aparece de forma clara pela primeira vez.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Simplex fase I", ref: "m-apres-2-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/2.0 - SimplexFaseI.pdf" },
      { tipo: "handout", rotulo: "Handout — Simplex fase I", ref: "m-hand-2-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/2.0 - SimplexFaseI - Handout.pdf" },
      { tipo: "lista", rotulo: "Lista 6 — Simplex fase I", ref: "m-lista-6", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L5_SimplexFase1.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 6", ref: "m-gab-6", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L5_SimplexFase1_Gabarito.pdf" }
    ]
  },

  {
    id: "dualidade",
    modulo: 2,
    tipo: "parada",
    curto: "Dualidade",
    titulo: "O problema espelho",
    texto: "Todo problema de PL carrega outro dentro de si. Além de ser um resultado bonito, o dual é o que dá significado econômico ao modelo: os preços-sombra dizem quanto vale relaxar cada restrição. Aqui entram os teoremas fraco e forte e as folgas complementares — a base da análise que fecha a disciplina.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Dualidade em PL — introdução", ref: "m-apres-3-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/3.0 - DualidadeI.pdf" },
      { tipo: "lista", rotulo: "Lista 7 — Dualidade: modelos e teoremas", ref: "m-lista-7", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L6_Dualidade-ModelosTeoremas.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 7", ref: "m-gab-7", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L6_Dualidade-ModelosTeoremas_Gabarito.pdf" }
    ]
  },

  {
    id: "prova-2",
    modulo: 2,
    tipo: "prova",
    curto: "Prova 2",
    titulo: "Segunda prova",
    texto: "Fecha o bloco do algoritmo: forma padrão, Simplex fase II, fase I e a introdução à dualidade. O teste é conseguir resolver um modelo na mão do início ao fim, reconhecer os casos especiais que aparecem no caminho e escrever o dual de qualquer primal.",
    materiais: []
  },

  {
    id: "inversa",
    modulo: 3,
    tipo: "parada",
    curto: "Inversa",
    titulo: "A inversa no Simplex",
    texto: "Percebendo que cada quadro do Simplex é o quadro original multiplicado pela inversa da base, o algoritmo fica muito mais enxuto: é essa leitura matricial que dá origem ao Simplex revisado, a forma de fato implementada nos resolvedores. São três apresentações encadeadas — vale seguir na ordem.",
    materiais: [
      { tipo: "apresentacao", rotulo: "A inversa no Simplex e dualidade I", ref: "m-apres-4-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/4.0 - InversaSimplexDual-I.pdf" },
      { tipo: "handout", rotulo: "Handout — inversa e dualidade I", ref: "m-hand-4-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/4.0 - InversaSimplexDual-I - Handout.pdf" },
      { tipo: "apresentacao", rotulo: "Simplex revisado", ref: "m-apres-4-1", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/4.1 - Simplex revisado.pdf" },
      { tipo: "handout", rotulo: "Handout — Simplex revisado", ref: "m-hand-4-1", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/4.1 - Simplex revisado - Handout.pdf" },
      { tipo: "apresentacao", rotulo: "A inversa no Simplex e dualidade II", ref: "m-apres-4-2", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/4.2 - InversaSimplexDual-II.pdf" },
      { tipo: "handout", rotulo: "Handout — inversa e dualidade II", ref: "m-hand-4-2", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/4.2 - InversaSimplexDual-II - Handout.pdf" },
      { tipo: "lista", rotulo: "Lista 8 — A inversa no Simplex e Dual-Simplex", ref: "m-lista-8", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L7 - A inversa no simplex _ Dual Simplex.pdf" },
      { tipo: "gabarito", rotulo: "Gabarito da Lista 8", ref: "m-gab-8", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L7 - A inversa no simplex _ Dual Simplex_Gabarito.pdf" }
    ]
  },

  {
    id: "dual-simplex",
    modulo: 3,
    tipo: "parada",
    curto: "Dual-Simplex",
    titulo: "Caminhando pelo dual",
    texto: "O Dual-Simplex inverte a lógica: mantém a otimalidade e busca a viabilidade, em vez do contrário. Na prática é o algoritmo que se usa quando um modelo já resolvido recebe uma restrição nova — reotimizar custa muito menos do que recomeçar. É o elo entre a dualidade e a análise de sensibilidade.",
    materiais: [
      { tipo: "apresentacao", rotulo: "O algoritmo Dual-Simplex", ref: "m-apres-5-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/5.0 - O algoritmo Dual-Simplex.pdf" },
      { tipo: "handout", rotulo: "Handout — Dual-Simplex", ref: "m-hand-5-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Handouts/5.0 - O algoritmo Dual Simplex - Handout.pdf" }
    ]
  },

  {
    id: "sensibilidade",
    modulo: 3,
    tipo: "parada",
    curto: "Sensibilidade",
    titulo: "E se os dados mudarem?",
    texto: "Nenhum dado de um problema real é exato. A análise de sensibilidade responde até onde um custo ou uma disponibilidade pode variar sem que a solução ótima mude — e quanto vale cada unidade a mais de um recurso escasso. É a parada em que a PL deixa de ser um exercício e vira ferramenta de decisão.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Análise de sensibilidade", ref: "m-apres-6-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/6.0 - Analise de sensibilidade.pdf" }
    ]
  },

  {
    id: "inteira",
    modulo: 3,
    tipo: "parada",
    curto: "Prog. inteira",
    titulo: "Quando não dá para partir ao meio",
    texto: "Metade de um caminhão ou 0,7 de uma fábrica não existem. Exigir variáveis inteiras muda tudo: a região viável deixa de ser contínua e o Simplex sozinho não resolve. Você aprende a modelar decisões binárias — abrir ou não abrir, atender ou não atender — e o Branch and Bound, que enumera de forma inteligente em vez de testar tudo.",
    materiais: [
      { tipo: "apresentacao", rotulo: "Programação inteira I — modelagem", ref: "m-apres-7-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/7.0 - Progamação Inteira I - Intro Modelagem.pdf" },
      { tipo: "apresentacao", rotulo: "Programação inteira II — Branch and Bound", ref: "m-apres-8-0", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Apresentacoes/8.0 - Progamação Inteira II - BB.pdf" },
      { tipo: "lista", rotulo: "Lista 9 — Modelagem inteira", ref: "m-lista-9", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Listas/L9 - Modelagem inteira I.pdf" }
    ]
  },

  {
    id: "prova-3",
    modulo: 3,
    tipo: "prova",
    curto: "Prova 3",
    titulo: "Terceira prova",
    texto: "Fecha o bloco final: a leitura matricial do Simplex, Dual-Simplex, análise de sensibilidade e programação inteira. É a prova mais próxima do uso real da técnica — interpretar resultados, não só calcular.",
    materiais: []
  },

  {
    id: "chegada",
    modulo: 3,
    tipo: "chegada",
    curto: "Solução ótima",
    titulo: "Chegada",
    texto: "No fim do caminho você sabe modelar um problema real, resolvê-lo à mão e no computador, interpretar o dual e dizer o que acontece se os dados mudarem. O material de resumo serve para revisar tudo de uma vez; o LPSolver fica para as próximas disciplinas, quando você só quiser a resposta.",
    materiais: [
      { tipo: "extra", rotulo: "Material de resumo", ref: "m-resumo", url: "https://alexandrechecoli.github.io/4-prog-linear/Materiais/Resumo.pdf" },
      { tipo: "ferramenta", rotulo: "LPSolver — resolvedor online", ref: "m-lpsolver", url: "https://alexandrechecoli.github.io/4-prog-linear/Apps/lp-solver.html" },
      { tipo: "extra", rotulo: "Ementa detalhada", ref: "m-ementa", url: "https://alexandrechecoli.github.io/4-prog-linear/PlanoAula.html" }
    ]
  }

];
