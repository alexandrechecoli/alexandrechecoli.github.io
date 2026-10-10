// Índice da ajuda (aba "Ajuda"). Cada página é um arquivo Markdown em docs/<id>.md.
// keywords: termos que levam à página pelo F1 (palavra sob o cursor) e pesam na busca.

export const DOC_SECTIONS = ["Começando", "Referência do highspy", "Como fazer", "Exemplos comentados"];

export const DOC_PAGES = [
  {
    id: "inicio",
    section: "Começando",
    title: "Primeiros passos",
    summary: "Como o editor funciona e o roteiro de um modelo com o highspy.",
    keywords: ["highspy", "Highs", "import"],
  },
  {
    id: "variaveis",
    section: "Referência do highspy",
    title: "Variáveis de decisão",
    summary: "addVariable, addBinary, addIntegral e as versões que criam várias de uma vez.",
    keywords: ["addVariable", "addVariables", "addBinary", "addBinaries", "addIntegral", "addIntegrals",
      "HighsVarType", "kInteger", "kContinuous", "kHighsInf", "lb", "ub", "name_prefix"],
  },
  {
    id: "restricoes",
    section: "Referência do highspy",
    title: "Restrições",
    summary: "addConstr, addConstrs e como escrever as expressões lineares.",
    keywords: ["addConstr", "addConstrs", "qsum", "sum"],
  },
  {
    id: "objetivo",
    section: "Referência do highspy",
    title: "Função objetivo e resolução",
    summary: "maximize e minimize definem o objetivo e já resolvem o modelo.",
    keywords: ["maximize", "minimize", "solve", "run"],
  },
  {
    id: "resultados",
    section: "Referência do highspy",
    title: "Lendo os resultados",
    summary: "Status, valor ótimo, valores das variáveis, folgas e preços-sombra.",
    keywords: ["val", "vals", "getModelStatus", "modelStatusToString", "HighsModelStatus", "kOptimal",
      "kInfeasible", "kUnbounded", "getInfo", "objective_function_value", "getObjectiveValue",
      "variableValue", "variableDual", "constrDual", "constrValue", "allVariableValues",
      "allVariableNames", "mip_gap", "mip_node_count"],
  },
  {
    id: "opcoes",
    section: "Referência do highspy",
    title: "Opções do solver",
    summary: "Ocultar o log, limitar o tempo e definir a tolerância de gap.",
    keywords: ["setOptionValue", "silent", "output_flag", "time_limit", "mip_rel_gap", "presolve"],
  },
  {
    id: "arquivos",
    section: "Como fazer",
    title: "Leitura e escrita em arquivos",
    summary: "O básico: ler um arquivo de texto linha a linha, separar os elementos e gravar resultados.",
    keywords: ["open", "readline", "split", "strip", "write", "with", "encoding"],
  },
  {
    id: "dados",
    section: "Como fazer",
    title: "Ler dados de arquivos",
    summary: "Tabelas em abas de dados (CSV, TXT, JSON), lidas com o módulo csv ou com o pandas.",
    keywords: ["read_csv", "pandas", "csv", "json", "to_dict", "DictReader"],
  },
  {
    id: "log",
    section: "Como fazer",
    title: "Entender o log do HiGHS",
    summary: "O que significa cada parte da saída do solver, em PL e em PLI.",
    keywords: [],
  },
  {
    id: "erros",
    section: "Como fazer",
    title: "Erros comuns",
    summary: "Mensagens de erro frequentes, o que querem dizer e como corrigir.",
    keywords: ["scipy"],
  },
  {
    id: "ex-mix",
    section: "Exemplos comentados",
    title: "Mix de produção (PL)",
    summary: "Duas variáveis, três restrições: o primeiro modelo.",
    keywords: [],
  },
  {
    id: "ex-transporte",
    section: "Exemplos comentados",
    title: "Problema de transporte (PL)",
    summary: "Variáveis indexadas por pares e restrições criadas em laços.",
    keywords: [],
  },
  {
    id: "ex-mochila",
    section: "Exemplos comentados",
    title: "Mochila 0-1 (PLI)",
    summary: "Variáveis binárias e a leitura de uma solução inteira.",
    keywords: [],
  },
  {
    id: "ex-transporte-csv",
    section: "Exemplos comentados",
    title: "Transporte com arquivos de dados (CSV)",
    summary: "O mesmo modelo de transporte, com os dados em abas de dados.",
    keywords: [],
  },
];

// Nomes do highspy oferecidos pelo autocompletar do editor.
export const HIGHSPY_WORDS = [
  "highspy", "Highs", "HighsVarType", "HighsModelStatus", "kContinuous", "kInteger", "kOptimal",
  "kInfeasible", "kUnbounded", "kHighsInf",
  "addVariable", "addVariables", "addBinary", "addBinaries", "addIntegral", "addIntegrals", "name_prefix",
  "addConstr", "addConstrs", "qsum",
  "maximize", "minimize", "solve",
  "getModelStatus", "modelStatusToString", "getInfo", "objective_function_value", "getObjectiveValue",
  "val", "vals", "variableValue", "variableDual", "constrDual", "constrValue",
  "allVariableValues", "allVariableNames", "mip_gap", "mip_node_count",
  "setOptionValue", "silent", "output_flag", "time_limit", "mip_rel_gap",
];
