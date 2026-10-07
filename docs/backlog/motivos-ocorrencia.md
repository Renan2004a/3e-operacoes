# Motivos de ocorrência por setor (sugestão da IA)

**Status: sugestão inicial. Não é regra definitiva.** Precisa de validação do gerente Everton antes de virar lista fechada do sistema.

## Regras respeitadas

- Perda (Corte e Dobra), refugo (Telhas) e indisponibilidade (Revenda) **exigem motivo** quando registrados.
- Depois de validada, a lista é **fechada** (não texto livre).
- Os itens abaixo partem de exemplos já documentados em `docs/regras-negocio.md` (RN012, RN023, RN032) e de sugestão da IA para completar 3 por setor.

## Corte e Dobra — motivos de perda

| # | Motivo sugerido | Origem |
| --- | --- | --- |
| 1 | Defeito de corte | Exemplo da RN012 |
| 2 | Material com problema | Exemplo da RN012 |
| 3 | Erro de dobra / medida incorreta | Sugestão da IA |

## Telhas — motivos de refugo

| # | Motivo sugerido | Origem |
| --- | --- | --- |
| 1 | Corte errado | Exemplo da RN023 |
| 2 | Defeito de chapa | Exemplo da RN023 |
| 3 | Comprimento/ajuste incorreto | Sugestão da IA |

## Revenda — motivos de indisponibilidade

| # | Motivo sugerido | Origem |
| --- | --- | --- |
| 1 | Sem estoque | Exemplo da RN032 |
| 2 | Item descontinuado | Exemplo da RN032 |
| 3 | Saldo insuficiente para a quantidade solicitada | Sugestão da IA |

## Pendências de validação

- Confirmar com o Everton os 3 motivos de cada setor.
- Confirmar se algum setor precisa de mais de 3 motivos.
- Definir se o motivo é por setor, por tipo de ocorrência, ou ambos.
- Após validação, carregar a lista fechada (candidata à entidade `MotivoOcorrencia` no banco da solução).
