# Categoria / produto → setor (sugestão)

Insumo para o `CategorySectorMapping`. **Não é regra definitiva.** A classificação precisa de validação do time antes de virar mapeamento automático.

## Origem dos dados

- Fonte: `produtos-categorizados-resumo.csv` (anexado), com 20 categorias e 1944 produtos.
- No banco AWS `topgerente`, a tabela `cad_produto` está **vazia**, então a categoria oficial do legado ainda não pode ser lida de lá. A taxonomia abaixo é a do CSV.
- Quando a categoria real do Top Gerente for confirmada, este mapeamento deve ser revisto para usar a chave correta.

## Classificação

- **Automática** — direção clara, sem ambiguidade aparente.
- **Validar** — direção provável, mas precisa de confirmação.
- **Não identificado** — não dá para classificar com segurança.

## Tabela

| Produto/Categoria | Setor | Observação | Classificação |
| --- | --- | --- | --- |
| Perfis, metalom, chapas, bobinas e estruturas metálicas (561) | Corte e Dobra | Núcleo do corte/dobra; pode conter itens de revenda | Validar |
| Ferramentas manuais, elétricas e acessórios (292) | Revenda | Sem produção | Validar |
| Fixadores, fechaduras, dobradiças e ferragens de porta/portão (186) | Revenda | Sem produção | Validar |
| Tintas, primers, vernizes e materiais de pintura (174) | Revenda | Sem produção | Validar |
| Parafusos, porcas, arruelas, buchas, chumbadores e barras roscadas (167) | Revenda | Sem produção | Validar |
| Solda - eletrodos, arames, máquinas e acessórios (119) | Revenda | Sem produção | Validar |
| Telhas, coberturas e impermeabilização (89) | Telhas | Direção clara | Automática |
| Discos, rebolos e abrasivos de corte/desbaste (85) | Revenda | Sem produção | Validar |
| Fitas, vedação, adesivos e selantes (59) | Revenda | Sem produção | Validar |
| EPI - equipamentos de proteção (43) | Revenda | Sem produção | Validar |
| Rolamentos, roldanas, pinos e rodízios (40) | Revenda | Sem produção | Validar |
| Kits, conjuntos e combos (36) | — | Conteúdo variável; não classificar em bloco | Não identificado |
| Solventes, diluentes e produtos de limpeza (30) | Revenda | Sem produção | Validar |
| Correntes, cabos de aço, cordas e correias (22) | Revenda | Sem produção | Validar |
| Pregos, grampos e rebites (15) | Revenda | Sem produção | Validar |
| Lixas e produtos de acabamento (14) | Revenda | Sem produção | Validar |
| Mangueiras, conexões e hidráulica (6) | Revenda | Sem produção | Validar |
| Arames (não solda) (3) | Revenda | Sem produção | Validar |
| Elétrica e iluminação (3) | Revenda | Sem produção | Validar |
| Total (1944) | — | — | — |

Resumo: 1 automática, 17 para validar, 1 não identificado.

## Pendências

- Confirmar a **categoria oficial do Top Gerente** (campo ainda desconhecido; `cad_produto` vazia na AWS).
- Validar a fronteira **Corte e Dobra × Revenda** nos itens de perfis/chapas.
- Desmembrar **Kits, conjuntos e combos** quando houver dados.
- Confirmar se "Telhas, coberturas e impermeabilização" é 100% Telhas ou se parte é Revenda.

## Como alimenta o `CategorySectorMapping`

- Cada linha vira um registro `categoria → setor` quando validado.
- Categoria sem mapeamento deixa o item em `PENDING_CLASSIFICATION`.
- A classificação manual continua disponível para itens pendentes.
- Alteração de mapeamento é auditada (`AuditLog`).
