# Relatório de cobertura — demonstração 3E Operações (29/10/2026)

**Vídeo**: `demo-completa-2026-10-29.mp4` — 00:22:41 (34.8 MB), 1920×1080, 30 fps, legendas queimadas e SRT separado.
**Ambiente**: aplicação local em `http://localhost:3000` com banco isolado `3e_operacoes_demo` (MySQL 8.4). Dados de cliente anonimizados.
**Partes**: 5 arquivos MP4 separados + vídeo concatenado.

## Índice de capítulos

00:00 — Apresentação do sistema
00:31 — Acesso e autenticação
01:03 — Vendedor — consulta, prazos e desmembramento
03:12 — Vendedor — importação do Top Gerente
05:42 — Fim da parte 1
05:46 — Gerente — painel e alertas
07:23 — Gerente — pedidos, prazos, setor e remessas
08:15 — Gerente — correção de setor e remessas
09:17 — Gerente — entregas e exceções
10:48 — Fim da parte 2
10:53 — Operador — fila, execução e ocorrências
13:05 — Expedição — entregas e exceções
15:08 — Fim da parte 3
15:12 — Administração — usuários, setores e mapeamentos
17:33 — Responsável Técnico — integração
18:17 — Validações, permissões e responsividade
19:09 — Encerramento e pendências
19:48 — Banco de dados — estrutura e persistência

## Cobertura por parte

## Parte 1 — Apresentação, acesso e Vendedor

Início: **00:00:00** · duração: **00:05:46**

| Tempo | Capítulo | Demonstração |
| --- | --- | --- |
| 00:00 | Apresentação do sistema | Capítulo 1 |
| 00:07 | Apresentação do sistema | 3E Operações |
| 00:14 | Apresentação do sistema | Ambiente da demonstração |
| 00:20 | Apresentação do sistema | Tela de acesso |
| 00:25 | Apresentação do sistema | Perfis disponíveis |
| 00:31 | Acesso e autenticação | Capítulo 2 |
| 00:36 | Acesso e autenticação | Validação de campos obrigatórios |
| 00:38 | Acesso e autenticação | Mensagem de validação |
| 00:47 | Acesso e autenticação | Credenciais inválidas |
| 00:50 | Acesso e autenticação | Segurança do login |
| 00:57 | Acesso e autenticação | Entrando como Vendedor |
| 01:03 | Vendedor — consulta, prazos e desmembramento | Capítulo 3 |
| 01:07 | Vendedor — consulta, prazos e desmembramento | Vendas |
| 01:13 | Vendedor — consulta, prazos e desmembramento | Indicadores da lista |
| 01:19 | Vendedor — consulta, prazos e desmembramento | Filtro por setor |
| 01:23 | Vendedor — consulta, prazos e desmembramento | Resultado do filtro |
| 01:27 | Vendedor — consulta, prazos e desmembramento | Limpando filtros |
| 01:33 | Vendedor — consulta, prazos e desmembramento | Pesquisa por número |
| 01:36 | Vendedor — consulta, prazos e desmembramento | Pesquisa parcial |
| 01:42 | Vendedor — consulta, prazos e desmembramento | Abrindo o pedido 82268 |
| 01:49 | Vendedor — consulta, prazos e desmembramento | Detalhe do pedido |
| 01:56 | Vendedor — consulta, prazos e desmembramento | Abrir todos os itens |
| 01:59 | Vendedor — consulta, prazos e desmembramento | Recolher todos os itens |
| 02:03 | Vendedor — consulta, prazos e desmembramento | Resumo por unidade |
| 02:09 | Vendedor — consulta, prazos e desmembramento | Pendências |
| 02:16 | Vendedor — consulta, prazos e desmembramento | Definindo o prazo de entrega |
| 02:21 | Vendedor — consulta, prazos e desmembramento | Confirmação |
| 02:24 | Vendedor — consulta, prazos e desmembramento | Histórico de prazos |
| 02:29 | Vendedor — consulta, prazos e desmembramento | Auditoria do prazo |
| 02:38 | Vendedor — consulta, prazos e desmembramento | Segunda alteração |
| 02:43 | Vendedor — consulta, prazos e desmembramento | Rastreabilidade |
| 02:49 | Vendedor — consulta, prazos e desmembramento | Desmembrando um item |
| 02:54 | Vendedor — consulta, prazos e desmembramento | Item desmembrado |
| 02:58 | Vendedor — consulta, prazos e desmembramento | Remessas — somente leitura |
| 03:04 | Vendedor — consulta, prazos e desmembramento | Permissão respeitada |
| 03:07 | Vendedor — consulta, prazos e desmembramento | Voltando para a lista |
| 03:12 | Vendedor — importação do Top Gerente | Capítulo 4 |
| 03:19 | Vendedor — importação do Top Gerente | Importação de pedido |
| 03:27 | Vendedor — importação do Top Gerente | Validação do número |
| 03:30 | Vendedor — importação do Top Gerente | Erro de validação |
| 03:36 | Vendedor — importação do Top Gerente | Importando o pedido 82262 |
| 03:55 | Vendedor — importação do Top Gerente | Resultado da importação |
| 04:04 | Vendedor — importação do Top Gerente | Reimportação |
| 05:38 | Vendedor — importação do Top Gerente | Reimportação |
| 05:42 | Fim da parte 1 | Capítulo 4 |

## Parte 2 — Gerente de Produção

Início: **00:05:46** · duração: **00:05:07**

| Tempo | Capítulo | Demonstração |
| --- | --- | --- |
| 00:00 | Gerente — painel e alertas | Capítulo 5 |
| 00:06 | Gerente — painel e alertas | Acesso do Gerente |
| 00:24 | Gerente — painel e alertas | Painel do Gerente |
| 00:30 | Gerente — painel e alertas | Indicadores |
| 00:37 | Gerente — painel e alertas | Drill-down por status |
| 00:50 | Gerente — painel e alertas | Lista de atividades |
| 01:01 | Gerente — painel e alertas | Atividades divergentes |
| 01:15 | Gerente — painel e alertas | Alertas operacionais |
| 01:22 | Gerente — painel e alertas | Expandindo a lista |
| 01:25 | Gerente — painel e alertas | Ocorrências recentes |
| 01:33 | Gerente — painel e alertas | Atualizando o painel |
| 01:37 | Gerente — pedidos, prazos, setor e remessas | Capítulo 6 |
| 01:47 | Gerente — pedidos, prazos, setor e remessas | Pedidos do Gerente |
| 01:55 | Gerente — pedidos, prazos, setor e remessas | Filtrando por setor |
| 01:58 | Gerente — pedidos, prazos, setor e remessas | Abrindo o pedido 70435 |
| 02:05 | Gerente — pedidos, prazos, setor e remessas | Detalhe do pedido |
| 02:13 | Gerente — pedidos, prazos, setor e remessas | Definindo um prazo vencido |
| 02:23 | Gerente — pedidos, prazos, setor e remessas | Atraso comercial |
| 02:29 | Gerente — correção de setor e remessas | Capítulo 7 |
| 02:35 | Gerente — correção de setor e remessas | Corrigindo o setor |
| 02:46 | Gerente — correção de setor e remessas | Confirmando a correção |
| 02:52 | Gerente — correção de setor e remessas | Auditoria da correção |
| 02:59 | Gerente — correção de setor e remessas | Programando uma remessa |
| 03:03 | Gerente — correção de setor e remessas | Gravando a remessa |
| 03:08 | Gerente — correção de setor e remessas | Remessa criada |
| 03:12 | Gerente — correção de setor e remessas | Confirmando a remessa |
| 03:16 | Gerente — correção de setor e remessas | Remessa confirmada |
| 03:20 | Gerente — correção de setor e remessas | Removendo a remessa |
| 03:23 | Gerente — correção de setor e remessas | Confirmando a exclusão |
| 03:27 | Gerente — correção de setor e remessas | Remoção concluída |
| 03:31 | Gerente — entregas e exceções | Capítulo 8 |
| 03:41 | Gerente — entregas e exceções | Entregas |
| 03:52 | Gerente — entregas e exceções | Itens do pedido |
| 03:59 | Gerente — entregas e exceções | Entregar tudo |
| 04:02 | Gerente — entregas e exceções | Confirmação da entrega |
| 04:07 | Gerente — entregas e exceções | Confirmando |
| 04:12 | Gerente — entregas e exceções | Entrega registrada |
| 04:18 | Gerente — entregas e exceções | Acima do disponível |
| 04:29 | Gerente — entregas e exceções | Autorização com motivo |
| 04:36 | Gerente — entregas e exceções | Cancelando a exceção |
| 04:50 | Gerente — entregas e exceções | Ordem de produção |
| 04:57 | Gerente — entregas e exceções | Impressão |
| 05:02 | Fim da parte 2 | Capítulo 8 |

## Parte 3 — Operador e Expedição

Início: **00:10:53** · duração: **00:04:19**

| Tempo | Capítulo | Demonstração |
| --- | --- | --- |
| 00:00 | Operador — fila, execução e ocorrências | Capítulo 9 |
| 00:06 | Operador — fila, execução e ocorrências | Acesso do Operador |
| 00:23 | Operador — fila, execução e ocorrências | Fila de produção |
| 00:30 | Operador — fila, execução e ocorrências | Cartões da fila |
| 00:37 | Operador — fila, execução e ocorrências | Atividade divergente |
| 00:40 | Operador — fila, execução e ocorrências | Divergência |
| 00:52 | Operador — fila, execução e ocorrências | Abrindo uma atividade |
| 00:56 | Operador — fila, execução e ocorrências | Execução da atividade |
| 01:04 | Operador — fila, execução e ocorrências | Registrando produção |
| 01:11 | Operador — fila, execução e ocorrências | Execução confirmada |
| 01:16 | Operador — fila, execução e ocorrências | Registrar ocorrência |
| 01:21 | Operador — fila, execução e ocorrências | Ocorrências do Operador |
| 01:30 | Operador — fila, execução e ocorrências | Motivo obrigatório |
| 01:42 | Operador — fila, execução e ocorrências | Gravando a ocorrência |
| 01:47 | Operador — fila, execução e ocorrências | Ocorrência registrada |
| 02:00 | Operador — fila, execução e ocorrências | Ordem de produção |
| 02:07 | Operador — fila, execução e ocorrências | Impressão |
| 02:12 | Expedição — entregas e exceções | Capítulo 10 |
| 02:18 | Expedição — entregas e exceções | Acesso da Expedição |
| 02:32 | Expedição — entregas e exceções | Entregas |
| 02:40 | Expedição — entregas e exceções | Buscando o pedido |
| 02:44 | Expedição — entregas e exceções | Abrindo o pedido |
| 02:51 | Expedição — entregas e exceções | Itens e situação |
| 02:58 | Expedição — entregas e exceções | Histórico de entregas |
| 03:05 | Expedição — entregas e exceções | Remessas |
| 03:11 | Expedição — entregas e exceções | Entregar tudo |
| 03:14 | Expedição — entregas e exceções | Confirmação |
| 03:20 | Expedição — entregas e exceções | Confirmando a entrega |
| 03:44 | Expedição — entregas e exceções | Entrega concluída |
| 03:51 | Expedição — entregas e exceções | Acima do disponível |
| 04:00 | Expedição — entregas e exceções | Validação de quantidade |
| 04:05 | Expedição — entregas e exceções | Itens sem saldo |
| 04:10 | Expedição — entregas e exceções | Voltando para a lista |
| 04:15 | Fim da parte 3 | Capítulo 10 |

## Parte 4 — Administração, Técnico e responsividade

Início: **00:15:12** · duração: **00:04:35**

| Tempo | Capítulo | Demonstração |
| --- | --- | --- |
| 00:00 | Administração — usuários, setores e mapeamentos | Capítulo 11 |
| 00:06 | Administração — usuários, setores e mapeamentos | Acesso do Responsável pelo Sistema |
| 00:23 | Administração — usuários, setores e mapeamentos | Administração de usuários |
| 00:31 | Administração — usuários, setores e mapeamentos | Perfis e setores |
| 00:44 | Administração — usuários, setores e mapeamentos | Política de senha |
| 00:47 | Administração — usuários, setores e mapeamentos | Senha curta |
| 00:53 | Administração — usuários, setores e mapeamentos | Perfil do usuário |
| 00:55 | Administração — usuários, setores e mapeamentos | Criando o usuário |
| 01:00 | Administração — usuários, setores e mapeamentos | Usuário criado |
| 01:05 | Administração — usuários, setores e mapeamentos | Inativando o usuário |
| 01:08 | Administração — usuários, setores e mapeamentos | Confirmação em linha |
| 01:12 | Administração — usuários, setores e mapeamentos | Confirmando a inativação |
| 01:18 | Administração — usuários, setores e mapeamentos | Usuário inativo |
| 01:22 | Administração — usuários, setores e mapeamentos | Reativando |
| 01:29 | Administração — usuários, setores e mapeamentos | Usuário ativo |
| 01:37 | Administração — usuários, setores e mapeamentos | Setores e mapeamentos |
| 01:44 | Administração — usuários, setores e mapeamentos | Regras produto→setor |
| 01:53 | Administração — usuários, setores e mapeamentos | Consultando a categoria |
| 01:57 | Administração — usuários, setores e mapeamentos | Categoria sem mapeamento |
| 02:03 | Administração — usuários, setores e mapeamentos | Criando o mapeamento |
| 02:06 | Administração — usuários, setores e mapeamentos | Mapeamento salvo |
| 02:13 | Administração — usuários, setores e mapeamentos | Atualizando o mapeamento |
| 02:16 | Administração — usuários, setores e mapeamentos | De/para atualizado |
| 02:21 | Responsável Técnico — integração | Capítulo 12 |
| 02:26 | Responsável Técnico — integração | Acesso do Responsável Técnico |
| 02:41 | Responsável Técnico — integração | Integração |
| 02:48 | Responsável Técnico — integração | Abrindo um job |
| 02:52 | Responsável Técnico — integração | Eventos do job |
| 03:00 | Responsável Técnico — integração | Importação pelo Técnico |
| 03:05 | Validações, permissões e responsividade | Capítulo 13 |
| 03:12 | Validações, permissões e responsividade | Página não encontrada |
| 03:20 | Validações, permissões e responsividade | Permissões no servidor |
| 03:28 | Validações, permissões e responsividade | Responsividade — Vendedor |
| 03:41 | Validações, permissões e responsividade | Celular — lista |
| 03:47 | Validações, permissões e responsividade | Celular — detalhe |
| 03:52 | Validações, permissões e responsividade | Toque e leitura |
| 03:57 | Encerramento e pendências | Capítulo 14 |
| 04:02 | Encerramento e pendências | Resumo |
| 04:10 | Encerramento e pendências | Pendências funcionais |
| 04:19 | Encerramento e pendências | Próximo capítulo |

## Parte 5 — Banco de dados

Início: **00:19:47** · duração: **00:02:54**

| Tempo | Capítulo | Demonstração |
| --- | --- | --- |
| 00:01 | Banco de dados — estrutura e persistência | Capítulo 15 |
| 00:07 | Banco de dados — estrutura e persistência | Capítulo de banco |
| 00:16 | Banco de dados — estrutura e persistência | DBeaver e as duas conexões |
| 00:26 | Banco de dados — estrutura e persistência | Inventário |
| 00:35 | Banco de dados — estrutura e persistência | Pedidos e previsão |
| 00:43 | Banco de dados — estrutura e persistência | Itens, execução e entrega |
| 00:52 | Banco de dados — estrutura e persistência | Atividades e fila |
| 01:01 | Banco de dados — estrutura e persistência | Execuções |
| 01:09 | Banco de dados — estrutura e persistência | Ocorrências |
| 01:18 | Banco de dados — estrutura e persistência | Entregas e remessas |
| 01:26 | Banco de dados — estrutura e persistência | Auditoria de prazos |
| 01:36 | Banco de dados — estrutura e persistência | Usuários, perfis e setores |
| 01:44 | Banco de dados — estrutura e persistência | Integração e mapeamentos |
| 01:53 | Banco de dados — estrutura e persistência | Estrutura das tabelas |
| 02:04 | Banco de dados — estrutura e persistência | Chaves e relações |
| 02:12 | Banco de dados — estrutura e persistência | Amostras de registros |
| 02:20 | Banco de dados — estrutura e persistência | Rastro da operação |
| 02:28 | Banco de dados — estrutura e persistência | Da tela para a tabela |
| 02:37 | Banco de dados — estrutura e persistência | Conclusão |

## Inventário de telas e funcionalidades

| Área | Tela / funcionalidade | Onde |
| --- | --- | --- |
| Acesso | Login, validação de campos, credenciais inválidas, sessão | Parte 1 |
| Vendedor | Lista, filtros (setor, número, cliente, status, período), previsão, status | Parte 1 |
| Vendedor | Detalhe, resumo por unidade/setor, pendências, itens recolhíveis | Parte 1 |
| Vendedor | Prazo de entrega, histórico/auditoria, restauração | Parte 1 |
| Vendedor | Desmembramento por setor (sugestão + confirmação) | Parte 1 |
| Vendedor | Remessas somente leitura | Parte 1 |
| Vendedor | Importação: validação, sucesso, reimportação e idempotência | Parte 1 |
| Gerente | Painel, indicadores, alertas, ocorrências, atualização | Parte 2 |
| Gerente | Drill-down por status em nova aba, filtro divergente | Parte 2 |
| Gerente | Lista/detalhe de pedidos, prazo vencido, atraso comercial | Parte 2 |
| Gerente | Correção de setor com justificativa e auditoria | Parte 2 |
| Gerente | Remessa: criar, confirmar, remover | Parte 2 |
| Gerente | Entregas: situação, entregar tudo, confirmação, exceção | Parte 2 |
| Gerente | Impressão da ordem de produção | Parte 2 |
| Operador | Fila por setor, prioridade, status, divergência | Parte 3 |
| Operador | Execução de produção com recálculo de saldo | Parte 3 |
| Operador | Ocorrência (perda, motivo, quantidade, observação) e histórico | Parte 3 |
| Operador | Ordem de produção e impressão | Parte 3 |
| Expedição | Seleção de pedido, situação do item, entregar tudo | Parte 3 |
| Expedição | Confirmação, saldo insuficiente, bloqueio de exceção, quantidade inválida | Parte 3 |
| Administração | Usuários: criar, política de senha, inativar/ativar, explicação | Parte 4 |
| Administração | Setores, mapeamento categoria→setor (criar/atualizar) | Parte 4 |
| Técnico | Jobs, eventos, erros e importação | Parte 4 |
| Transversal | Página 404, bloqueio por permissão, responsividade 390px | Parte 4 |
| Banco | DBeaver (captura real), inventário, pedidos/itens, saldos | Parte 5 |
| Banco | Atividades, execuções, ocorrências, entregas, remessas | Parte 5 |
| Banco | Auditoria, usuários/perfis, jobs, estrutura/FKs, amostras | Parte 5 |
| Banco | Mapa tela→tabela e conclusão | Parte 5 |

## Observações de fidelidade

- Todas as ações de escrita foram executadas no banco isolado de demonstração.
- Mensagens de sucesso, erro e confirmação são reais; nenhuma foi simulada.
- O capítulo de banco usa consultas reais; a limitação do DBeaver está registrada em `relatorio-pendencias.md`.
- O vídeo não expõe senhas, tokens ou nomes reais de clientes.
