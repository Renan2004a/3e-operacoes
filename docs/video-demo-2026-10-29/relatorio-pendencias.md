# Relatório de pendências — demonstração 3E Operações (29/10/2026)

Este relatório registra o que **não** foi possível demonstrar ou que ainda depende de decisão. Nenhuma funcionalidade foi simulada: quando uma ação não pôde ser executada, ela está listada aqui.

## 1. Limitação do ambiente de gravação (DBeaver)

- **Tela afetada**: capítulo de banco (DBeaver).
- **Ação executada**: abrir o DBeaver, usar a conexão do aplicativo (MySQL) e navegar pela árvore/editor.
- **Comportamento observado**: nesta sessão o DBeaver 26.2 apresentou **texto invisível** na árvore de conexões, no editor SQL e na árvore de arquivos. O menu e as barras continuam legíveis; o conteúdo textual das árvores/editores não renderiza. Tentativas: reset do workspace, tema claro/escuro, novo workspace e reinício do aplicativo — o defeito persistiu.
- **Resultado esperado**: navegar pela árvore (conexão → banco → tabelas) e abrir o editor SQL com resultados visíveis.
- **Contorno usado**: a captura real da janela do DBeaver foi incluída no capítulo; as consultas SQL e a estrutura foram executadas **de fato** no MySQL (`3e_operacoes_demo`) e apresentadas com os resultados reais. A limitação está declarada no vídeo.
- **Recomendação**: validar o DBeaver em outra máquina/versão antes do go-live; o banco e as consultas não têm problema.

## 2. Funcionalidades ausentes ou parciais (decisão de negócio)

| Item | Situação | Impacto |
| --- | --- | --- |
| Cancelamento lógico de item (AD-010) | Sem campo/contrato; item removido no ERP não é cancelado no 3E | Pedido pode nunca concluir |
| Revenda com indisponibilidade (RN031) | Saldo usa solicitado − executado; indisponibilidade não entra na conta | Pendente de Revenda fica eterno |
| Remessas (AD-016/D6) | Sem `confirmedByUserId`, sem auditoria; confirmar não gera entrega | Rastreabilidade incompleta |
| Divergências (AD-017/D7) | Atividade divergente não tem fluxo de resolução | Fica pendente para sempre |
| Histórico de entregas (RF010) | API existe, **não há tela** | Expedição não consulta o histórico |
| Prioridade e pausa | Prioridade existe na API e na fila; não há tela para o Gerente definir; pausa não altera a atividade | Gestão manual |
| Exportação | Só impressão da ordem; não há CSV/PDF de listas | Fora do escopo atual |
| Unidades do ERP | Allowlist de metro/metro²/peça; outras unidades viram peça inteira | Pode bloquear quantidade fracionária |

## 3. Riscos operacionais identificados

- **Limite de login em memória**: 5 erros por e-mail em 15 min bloqueiam aquele acesso; 30 erros no mesmo IP bloqueiam o IP. Não há tela de desbloqueio; reiniciar o processo limpa. Para a fábrica, avaliar desbloqueio pelo Administrador.
- **Conector/túnel**: a importação depende do conector local e do túnel. Se o túnel cair, a importação falha com mensagem orientativa e o job fica `FAILED`; o sistema libera nova tentativa após 10 minutos (job travado) ou imediatamente para jobs `FAILED`.
- **Job travado**: já corrigido (job ativo sem atualização há mais de 10 minutos aceita nova tentativa).
- **Item sem código no legado**: o callback passou a aceitar `productCode: null`; o pedido 82249, que falhava, foi reimportado com sucesso após a correção.

## 4. O que foi executado de verdade na gravação

- Login nos seis perfis; uma tentativa de senha inválida e validação de campos vazios.
- Filtros, abertura de pedido, expansão/recolhimento, resumo por unidade/setor.
- Alteração de prazo com histórico (20/11 e 27/11) e restauração/auditoria.
- Desmembramento de item; correção de setor com justificativa.
- Remessa: criar, confirmar e remover (com confirmação).
- Entrega: “Entregar tudo” + confirmação; exceção acima do disponível demonstrada e **cancelada**.
- Execução de produção (1 unidade) e ocorrência de perda (2 unidades) com motivo.
- Importação real do pedido 82262 e reimportação (idempotência).
- Criação de usuário técnico, inativação e reativação; mapeamento de categoria.
- Consultas reais no banco e conferência dos registros.

## 5. Dados de demonstração

- Banco isolado `3e_operacoes_demo` (MySQL 8.4), criado para esta gravação.
- Clientes anonimizados (`Cliente Demonstração <número>`), vendedores como `Vendedor Demonstração`.
- Nenhuma senha, token ou credencial aparece no vídeo.
- Os registros criados são de teste e podem ser descartados com o banco de demonstração.
