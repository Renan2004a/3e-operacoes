# Produtos listados - referência do extrato

O arquivo original `produtos listados.xlsx` foi usado apenas para entender estrutura e qualidade do extrato. **Não versionar a planilha real nem dados de clientes no repositório.**

- Linhas de dados observadas: 278.824
- Colunas: `Numero_OS`, `Cliente`, `Codigo_Produto`, `Descricao_Produto`, `Quantidade`, `Valor_Total_Item`
- Descrição ausente: 203 registros
- Descrição igual a `.`: 15.937 registros

## Uso

- Usar a estrutura como apoio para entender o formato dos dados.
- Não inferir categoria → setor a partir de descrição livre sem regra aprovada.
- Não usar dados reais do extrato em testes; criar fixtures sintéticas/anônimas.
- A fonte oficial continua sendo o Top Gerente consultado pelo conector local.
