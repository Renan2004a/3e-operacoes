# Requisitos efetivos

A especificação original convertida integralmente está em `docs/fontes/requisitos-original.md`. Este arquivo define como interpretá-la no estado atual.

## Histórias de usuário

HU01 a HU06 permanecem como base: Operador, Gerente de Produção, Vendedor, Expedição, Responsável pelo Sistema e Desenvolvedor/Responsável Técnico.

## Requisitos funcionais preservados

- RF001 Integração com o Top Gerente.
- RF002 Organização dos itens por setor.
- RF003 Fila de atividades por setor.
- RF004 Registro da execução.
- RF005 Registro de ocorrências.
- RF006 Acompanhamento da produção.
- RF007 Gestão de prioridades.
- RF008 Consulta de pedidos pelo vendedor.
- RF009 Controle de disponibilidade.
- RF010 Controle de entregas.
- RF011 Controle de saldo dos pedidos.
- RF012 Alertas de produção.
- RF013 Gerenciamento de usuários.
- RF014 Gerenciamento de perfis e permissões.
- RF015 Gerenciamento de setores.
- RF016 Registro de logs.
- RF017 Monitoramento da integração.
- RF018 Impressão de ordem de produção.

## Ajustes de interpretação aprovados

- RF001: integração é sob demanda e assíncrona, iniciada pelo número do pedido; não usar polling contínuo.
- RF002: somente três setores operacionais nesta etapa. A categoria vem do Top Gerente; o app mantém mapeamento categoria → setor configurável.
- RF003/RF004: operador pode pertencer a mais de um setor; gerente também pode alterar status.
- RF008: vendedor pode consultar **todos** os pedidos. É somente leitura para produção, com a exceção aprovada de cadastrar/alterar prazo de entrega.
- RF010: Expedição e Gerente registram entregas. Exceção acima do disponível exige autorização gerencial, motivo e auditoria.
- RF012: prazo é opcional e pode existir por item/setor. Sem prazo, nunca classificar como atrasado.
- RF013/RF014: associação usuário ↔ setor é muitos-para-muitos.

## Requisitos não funcionais

RFN001 a RFN007 e RFN009 permanecem vigentes. RFN001 já está corrigido na fonte convertida. **RFN008 (offline) está adiado e não faz parte do escopo atual**, por decisão posterior.

## Fonte e precedência

Para detalhes de fluxo e critérios originais, consultar `docs/fontes/requisitos-original.md`. Para decisões que alteram a fonte histórica, consultar `docs/decisoes.md`.
