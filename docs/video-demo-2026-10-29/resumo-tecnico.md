# Resumo técnico — demonstração 3E Operações (29/10/2026)

## Objetivo

Demonstração funcional completa do 3E Operações, com interação real na interface, escritas no banco, legendas em PT-BR, cursor destacado, capítulos e capítulo de banco de dados.

## Ambiente

| Item | Valor |
| --- | --- |
| Aplicação | Next.js 16.4.3 em `http://localhost:3000` (`next start`) |
| Banco da demonstração | MySQL 8.4, `3e_operacoes_demo` (isolado) |
| Legado | MySQL `topgerente` (AWS de teste), consultado pelo conector local |
| Gravação | Playwright 1.63, 1920×1080, 30 fps |
| Edição | ffmpeg 9.0.2, H.264, CRF 22, `+faststart` |
| Legendas | PT-BR, queimadas + SRT separado |

## Cobertura

- 6 perfis (Vendedor, Gerente, Operador, Expedição, Administração e Técnico).
- 21 telas/áreas, 18 capítulos e 172 legendas.
- Fluxos de leitura e escrita: prazos, desmembramento, correção de setor, remessas, entregas, execuções, ocorrências, usuários, mapeamentos, importação.
- Validações: campos vazios, senha curta, credenciais inválidas, número inválido, entrega acima do disponível, quantidade inválida, 404 e bloqueio por permissão.
- Banco: 18 tabelas, estrutura, PK/FK, índices, amostras, auditoria e mapa tela→tabela.

## Dados de teste criados (banco isolado)

- Pedidos importados: 70435, 82249, 82261, 82262, 82268, 82270, 82271 e 82272.
- Atividades desmembradas nos três setores, com status pendente, em execução, concluída e divergente.
- Execuções, ocorrências (perda e parada), entregas, remessas, prioridades e auditoria de prazos.
- Usuário `tecnico.demo@3e.local` e mapeamento `CATEGORIA_DEMO → Corte e Dobra`.

## Gates do código

| Item | Resultado |
| --- | --- |
| Testes | **1174** verdes + 47 ignorados (integração MySQL gated) |
| Lint | 0 erros (6 avisos) |
| Typecheck | OK |
| Build | OK |

## Correções feitas durante a preparação

- Preenchimento de datas em campos nativos (`type=date`) corrigido no roteiro (estava digitando caractere a caractere).
- Fila do Operador passou a ocultar atividades concluídas (a tela diz “em aberto”).
- Contrato do callback passou a aceitar `productCode: null` para itens sem código no legado; o pedido 82249, que falhava, foi reimportado com sucesso.
- Selo de desenvolvimento do Next removido usando build de produção.

## Limitações

- **DBeaver**: texto invisível na árvore/editor nesta máquina; capítulo usa captura real + SQL real. Ver `relatorio-pendencias.md`.
- **Conector/túnel**: a importação ao vivo depende do conector local e do túnel; se o túnel cair, a importação falha com orientação e pode ser repetida.
- **Pendências funcionais**: cancelamento de item, Revenda/RN031, semântica de remessa, tratamento de divergências e tela de histórico de entregas.
- O vídeo não expõe credenciais, tokens ou dados pessoais reais.
