# Avaliação heurística (Nielsen) — antes e depois

**Data**: 2026-10-20
**Método**: inspeção do código e das telas, execução local com Playwright (390×844 e desktop), testes automatizados e verificação no banco.
**Escala de gravidade** (Nielsen): 0 = não é problema; 1 = cosmético; 2 = pequeno; 3 = grande; 4 = catastrófico.

> "Antes" = estado encontrado na inspeção, anterior às correções. "Depois" = estado implementado e verificado. Onde não houve evidência suficiente, o item está marcado como **não avaliado**.

---

## Resumo

| # | Heurística | Gravidade antes | Implementado? | Evidência principal |
| --- | --- | --- | --- | --- |
| 1 | Visibilidade do estado | 3 | ✅ | `Spinner`, `Progress` com `aria-valuenow`, mensagens de sucesso/erro |
| 2 | Correspondência com o mundo real | 2 | ✅ | Termos “Pedido”, “Setor”, “Remessa”, “Desmembrar” |
| 3 | Controle e liberdade | 3 | ✅ | “Voltar” funcional, cancelar confirmação, filtros na URL |
| 4 | Consistência e padronização | 2 | ✅ | Um único `Progress`, `Alert`, `Badge`, botões |
| 5 | Prevenção de erros | 3 | ✅ | Confirmação de inativação, validação de remessa/prazo, bloqueio de duplo envio |
| 6 | Reconhecimento em vez de memorização | 2 | ✅ | Setor sugerido, rótulos humanos, filtros preservados |
| 7 | Flexibilidade e eficiência | 2 | ✅ | Ações no item, botão “+”, atalhos por perfil |
| 8 | Estética e minimalismo | 2 | ✅ | Cartões, remoção de CUID, agrupamento por setor |
| 9 | Recuperação de erros | 3 | ✅ | Mensagens específicas por status + “Tentar de novo” |
| 10 | Ajuda e documentação | 2 | ⚠️ parcial | `hint` nos campos, “Como funciona”; ajuda contextual ainda limitada |

---

## 1. Visibilidade do estado do sistema

- **Princípio**: o usuário deve saber o que está acontecendo (carregando, processando, concluído, falhou).
- **Problemas antes**: o detalhe do pedido não mostrava progresso por item; as remessas não davam retorno ao criar/confirmar; a impressão não indicava o que seria impresso. Severidade **3** (o usuário não sabia se a ação funcionou).
- **Telas afetadas**: detalhe do pedido (vendedor/gerente), painel, execução da atividade, usuários.
- **Melhoria**: `Progress` acessível com percentual textual; `Alert` de sucesso/erro com `role="status"`/`role="alert"`; botões com estado “Salvando…/Programando…/Atualizando…”.
- **Implementado**: ✅.
- **Evidência**: `src/shared/ui/progress.tsx`; `pedido-detalhe.tsx` (`sucesso`, `aria-live`); testes `vendedor/pedidos/[orderId]/page.test.tsx`; Playwright `validar-responsivo-impressao.mjs`.

## 2. Correspondência entre o sistema e o mundo real

- **Princípio**: falar a língua do usuário, com a ordem lógica do processo.
- **Problemas antes**: o detalhe misturava CUID/IDs, “Item 1” sem contexto e a ação antes dos dados; “remessa” e “entrega” podiam ser confundidas. Severidade **2**.
- **Melhoria**: identificação → progresso → quantidades → prazo → desmembramento → remessas; rótulos humanos (posição do item); distinção explícita “previsão” × “entrega realizada”.
- **Implementado**: ✅.
- **Evidência**: `pedido-detalhe.tsx`; `docs/modelo-dados/mer.md` §5; teste de ordem no detalhe.

## 3. Controle e liberdade do usuário

- **Princípio**: o usuário deve poder desfazer/sair/corrigir sem armadilhas.
- **Problemas antes**: “Voltar para pedidos” no vendedor apontava para a própria tela (não fazia nada); abrir o pedido não navegava; filtros eram perdidos ao voltar. Severidade **3** (bloqueava o fluxo).
- **Melhoria**: rota `/vendedor/pedidos/[orderId]`; `router.push` ao abrir; link de volta para a lista; filtros sincronizados na URL; confirmação de inativação com “Cancelar”.
- **Implementado**: ✅.
- **Evidência**: `vendedor/pedidos/page.tsx` e `[orderId]/page.tsx`; teste de navegação; Playwright confirma `href=/vendedor/pedidos` e `scrollWidth===innerWidth`.

## 4. Consistência e padronização

- **Princípio**: mesmo conceito, mesma aparência e mesmo comportamento.
- **Problemas antes**: barras de progresso nativas (cores do navegador) em telas diferentes; feedback em lugares diferentes; tabelas com comportamentos distintos. Severidade **2**.
- **Melhoria**: componente único `Progress`; `Alert` para feedback; `Badge` para status; `.tabela-responsiva` para todas as tabelas; botões com as mesmas variantes.
- **Implementado**: ✅.
- **Evidência**: `progress.tsx`, `alert.tsx`, `badge.tsx`, `globals.css`.

## 5. Prevenção de erros

- **Princípio**: evitar que o erro aconteça, em vez de só avisar depois.
- **Problemas antes**: não havia confirmação para inativar usuário (nem a ação existia na UI); remessa aceitava número/data inválidos sem orientação; envios podiam ser repetidos. Severidade **3**.
- **Melhoria**: validação de número/data antes do POST; confirmação inline de inativação; botões `disabled` durante o envio; mensagens específicas para 400/403/409/404.
- **Implementado**: ✅.
- **Evidência**: `admin/usuarios/page.tsx`; `pedido-detalhe.tsx`; testes de 409/403 e de confirmação.

## 6. Reconhecimento em vez de memorização

- **Princípio**: mostrar opções e contexto em vez de exigir que o usuário lembre.
- **Problemas antes**: o vendedor precisava lembrar o setor de cada produto; ao voltar, precisava redigitar os filtros; IDs apareciam na tela. Severidade **2**.
- **Melhoria**: sugestão de setor (`ProductSectorRule`) pré-selecionada; filtros na URL; rótulos por posição; resumo por setor.
- **Implementado**: ✅.
- **Evidência**: `sugerir-setor.ts`; `pedido-detalhe.tsx`; `pedidos-lista.tsx`.

## 7. Flexibilidade e eficiência de uso

- **Princípio**: atalhos e fluxos eficientes para quem já conhece o sistema.
- **Problemas antes**: a lista e o detalhe na mesma página tornavam o fluxo longo; o formulário de remessa sempre aberto poluía a tela. Severidade **2**.
- **Melhoria**: página de detalhe dedicada; “+ Adicionar remessa” abre sob demanda; ações por item; navegação por perfil.
- **Implementado**: ✅.
- **Evidência**: `pedido-detalhe.tsx` (`remessaAberta`); `app-shell.tsx`.

## 8. Design estético e minimalista

- **Princípio**: mostrar o essencial, sem ruído.
- **Problemas antes**: detalhe muito longo com informações repetidas; tabelas largas no celular; barras nativas destoando do design. Severidade **2**.
- **Melhoria**: cartões no celular; quantidades em grade compacta; resumo antes dos itens; um único padrão de progresso.
- **Implementado**: ✅.
- **Evidência**: `pedido-detalhe.tsx`; `globals.css` (`.tabela-responsiva`).

## 9. Reconhecimento, diagnóstico e recuperação de erros

- **Princípio**: explicar o erro em linguagem clara e oferecer a saída.
- **Problemas antes**: mensagens genéricas (“Não foi possível…”), sem diferenciar validação, permissão, conflito ou rede. Severidade **3**.
- **Melhoria**: mensagens por status HTTP; “Tentar de novo”; validações próximas ao campo (`Field error`); `role="alert"`.
- **Implementado**: ✅.
- **Evidência**: `admin/usuarios/page.tsx` (409/403); `pedido-detalhe.tsx` (400/409/404); `pedidos-lista.tsx` (erro + retry).

## 10. Ajuda e documentação

- **Princípio**: o usuário deve ter ajuda quando precisar.
- **Problemas antes**: havia `hint` em alguns campos e o bloco “Como funciona” no vendedor, mas faltava ajuda contextual nas telas de operação e administração. Severidade **2**.
- **Melhoria**: `hint` em campos (cliente, número do pedido, remessa), textos de apoio no detalhe e nos estados vazios; documentação em `docs/`.
- **Implementado**: ⚠️ **parcial** — ajuda contextual ainda é limitada; não há central de ajuda/tour.
- **Evidência**: `docs/operacao.md`, `docs/mockups/README.md`, `docs/banco-de-dados.md`.

---

## Avaliações específicas

### Responsividade

| Verificação | Antes | Depois | Evidência |
| --- | --- | --- | --- |
| Sem rolagem horizontal em 390 px | Tabelas largas podiam estourar | `scrollWidth === innerWidth` em 5 telas | `validar-responsivo-impressao.mjs` |
| Tabela de usuários no celular | 4 colunas com rolagem | Cartões com rótulos (`display:block`) | mesmo script |
| Lista de pedidos no celular | Tabela | Cartões | `.tabela-responsiva` |

### Acessibilidade básica

- `role="progressbar"` com `aria-valuenow` e percentual textual (não depende de cor).
- `role="alert"` para erros e `role="status"` para sucessos/carregamento.
- Alvos de toque ≥ 44 px nos botões principais; foco visível global.
- Rótulos em todos os campos; `aria-label` nas ações por item.
- **Não avaliado**: leitor de tela real (NVDA/VoiceOver) e contraste medido por ferramenta dedicada.

### Feedback das ações

- Criar/editar/inativar usuário, desmembrar, programar/confirmar/remover remessa, salvar prazo, registrar execução/ocorrência/entrega, importar pedido.
- Todas exibem carregando, sucesso e erro; operações demoradas usam texto “Processando…” e polling no caso da importação.

### Navegação

- Lista ↔ detalhe com rota própria; “Voltar” funcional; filtros preservados na URL.
- Perfis só veem as telas autorizadas (`NAV_POR_PERFIL` + autorização no servidor).

### Prevenção de erros

- Confirmação de inativação; validação de campos; bloqueio de duplo envio; mensagens específicas por status.

---

## Itens não avaliados (e por quê)

- **Teste com usuários reais**: não houve sessão de usabilidade com operadores; a avaliação é heurística e por inspeção.
- **Leitor de tela**: não foi executado NVDA/VoiceOver; a verificação foi por semântica e rótulos.
- **Contraste**: os tokens foram escolhidos para AA, mas não foi rodada ferramenta de contraste dedicada.
- **Ajuda/documentação in-app**: parcial, conforme item 10.

---

## Avaliação específica do perfil Operador (2026-10-26)

**Método**: inspeção de código, execução local em 390×844 e desktop, 1023 testes automatizados, Playwright (9/9) e leitura do MySQL. "Antes" = fila única com execução + ocorrência + ordem na mesma página; "depois" = telas separadas e ocorrências visíveis ao gerente.

| # | Heurística | Gravidade antes | Depois | Evidência |
| --- | --- | --- | --- | --- |
| 1 | Visibilidade do estado | 3 | ✅ | Carregando/vazio/erro/sucesso; botão desabilitado no envio; lista recarregada após registrar |
| 2 | Mundo real | 2 | ✅ | “Meus pedidos”, “Abrir atividade”, “Registrar ocorrência”; pedido/item/setor em linguagem de fábrica |
| 3 | Controle e liberdade | 2 | ✅ | “← Voltar para meus pedidos”; link “Ver minhas ocorrências”; troca de atividade sem perder o formulário |
| 4 | Consistência | 2 | ✅ | Mesmos `Alert`, `Badge`, `Card` e padrões de botão do restante do sistema |
| 5 | Prevenção de erros | 3 | ✅ | Motivo obrigatório por tipo, quantidade validada na unidade, envio bloqueado durante a requisição |
| 6 | Reconhecimento | 2 | ✅ | Atividade pré-selecionada ao vir da execução; opções mostram pedido + item + setor |
| 7 | Flexibilidade | 2 | ✅ | Registrar pela atividade ou pela tela de ocorrências; menu com duas entradas |
| 8 | Estética e minimalismo | 2 | ✅ | Execução, ocorrência e ordem separadas; cartões no celular; sem CUID |
| 9 | Recuperação de erros | 3 | ✅ | Mensagem específica, dados preservados em falha, “Tentar de novo” na carga |
| 10 | Ajuda e documentação | 2 | ⚠️ parcial | Dicas nos campos e texto de destino da ocorrência; ajuda contextual ampla ainda não existe |

### Problemas residuais (não bloqueantes)

- **Situação de análise/resolução da ocorrência**: não há campo nem regra; não foi criada uma situação fictícia.
- **Notificação ativa ao gerente**: o painel mostra o resumo, mas não há push/e-mail em tempo real.
- **Idempotência**: o duplo envio é mitigado pela interface (botão desabilitado), não por chave de idempotência no domínio.
- **Teste com operadores reais**: não houve sessão de usabilidade; a avaliação é heurística.
