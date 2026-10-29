# Avaliação heurística (Nielsen) — perfil Expedição

**Data**: 2026-10-28
**Escopo**: tela `/expedicao/entregas` (`src/app/(app)/expedicao/entregas/page.tsx`), rota `POST/GET /api/pedidos/itens/[itemId]/entregas` e regra `src/modules/expedicao/registrar-entrega.ts`.
**Método**: inspeção do código (sem sessão com usuários e sem execução em navegador). Onde algo depende de teste real, está marcado.
**Escala de gravidade** (Nielsen): 0 = não é problema; 1 = cosmético; 2 = pequeno; 3 = grande; 4 = catastrófico.

---

## Resumo

| # | Heurística | Gravidade | Principal achado |
| --- | --- | --- | --- |
| 1 | Visibilidade do estado | 3 | Sucesso não diz quanto foi entregue nem se o item ficou parcial ou concluído |
| 2 | Mundo real | 2 | “Executado”, “Pendente” e “exceção” são termos de produção/sistema, não de expedição |
| 3 | Controle e liberdade | **4** | Entrega é irreversível: sem confirmação, sem histórico na tela e sem estorno |
| 4 | Consistência | 2 | Seleção de pedido por `<select>`, diferente da lista com busca e cartões do vendedor |
| 5 | Prevenção de erros | 3 | Sem “entregar tudo”, sem teto no campo, campo aceita decimal para peça |
| 6 | Reconhecimento | 3 | Lista todos os pedidos, sem cliente e sem saber quais têm saldo; remessas programadas não aparecem |
| 7 | Flexibilidade | 3 | Um formulário por item; pedido com muitos itens vira página longa |
| 8 | Minimalismo | 2 | Quatro quantidades em uma linha de texto; “Pendentes” pouco útil para quem entrega |
| 9 | Recuperação de erros | 3 | Erros 400 caem na mensagem genérica; 409 não informa o saldo atual |
| 10 | Ajuda | 2 | Nada explica Disponível × Executado × Entregue nem o que é entrega parcial |

---

## Achados por heurística

### 1. Visibilidade do estado — gravidade 3

- O alerta de sucesso diz só “Entrega registrada. O saldo foi atualizado.” A API devolve o `status` (`PARCIAL` ou `CONCLUIDO`), mas a tela não usa. O expedidor não sabe se o item foi concluído ou se ainda falta entregar.
- O selo do cartão só tem “Disponível” ou “Sem saldo”. Não existe o estado “Entregue”.
- O alerta de sucesso fica na tela até o próximo envio e não indica de qual item veio.

**Melhoria**: confirmar com a quantidade e o resultado (“10 m entregues. Faltam 5 m”, ou “Item concluído”); selo com três estados (Disponível / Parcial / Entregue / Aguardando produção); barra `Progress` entregue ÷ solicitado, que já existe no sistema.

### 2. Correspondência com o mundo real — gravidade 2

- O expedidor pensa em “o que posso levar agora”. A tela mostra “Executado”, “Pendente” e “exceção”, que são termos da produção e da auditoria.
- “Pendentes: A produzir” no topo é informação da produção.

**Melhoria**: destacar “Pode entregar agora” e “Já entregue”; mostrar “Falta produzir” em segundo plano; trocar “exceção” por “Entrega acima do disponível (autorização do gerente)”.

### 3. Controle e liberdade — gravidade 4

- Um clique em “Registrar entrega” grava. Não há confirmação, e o texto digitado errado (100 em vez de 10) vira entrega real. O botão fica ativo logo após a digitação.
- Não existe estorno, nem na tela nem na API. A entrega só poderia ser corrigida direto no banco.
- A API `GET .../entregas` (histórico, `historico-entregas.ts`) existe, e `docs/perfis-permissoes.md` diz que a Expedição vê “itens disponíveis e histórico”. **A tela nunca chama esse endpoint.**

**Melhoria**: (a) janela de confirmação antes de gravar; (b) histórico de entregas por item na própria tela; (c) decidir com o professor/cliente se haverá estorno, que é regra de negócio e precisa de motivo e auditoria. Não implementar sem essa decisão.

### 4. Consistência e padronização — gravidade 2

- O vendedor escolhe pedidos por lista com busca, filtros na URL e abertura em rota própria (`/vendedor/pedidos/[orderId]`). A Expedição usa um `<select>` e o pedido escolhido se perde ao recarregar a página.
- O cartão do item repete “Cliente …” em todos os itens.

**Melhoria**: reaproveitar o padrão do vendedor (lista de cartões, e detalhe em `/expedicao/entregas/[orderId]`, com “Voltar”).

### 5. Prevenção de erros — gravidade 3

- Não há “Entregar tudo o disponível (X m)”. O caso mais comum obriga a digitar o número.
- O campo é `type="number"` com `step="any"` mesmo para unidade “peça” (inteira). O erro só vem do servidor.
- O campo não mostra a unidade nem o máximo. A rolagem do mouse sobre um `type="number"` focado altera o valor sem aviso.
- O aviso de “acima do disponível” é bom (aparece enquanto se digita), mas só o gerente pode seguir, e o expedidor fica com o botão desabilitado sem outro caminho.

**Melhoria**: botão “Entregar tudo (X)”; unidade e disponível como texto de apoio ao lado do campo; `step` conforme a unidade; confirmação reforçada na entrega acima do disponível.

### 6. Reconhecimento em vez de memorização — gravidade 3

- O `<select>` mostra “Pedido 1234”, sem cliente, e lista **todos** os pedidos, mesmo os sem nada disponível. O expedidor abre um a um.
- As remessas programadas (número e data prevista, RF010) não aparecem na expedição. Quem entrega precisa lembrar o que estava combinado.
- O item mostra a “Previsão de entrega”, mas sem destaque para atrasados.

**Melhoria**: tela inicial com cartões (nº, cliente, itens com saldo, previsão), busca e filtro “Com saldo disponível” (padrão); remessa programada visível no item.

### 7. Flexibilidade e eficiência — gravidade 3

- Cada item tem seu próprio formulário. Um pedido de 30 itens vira uma página de 30 formulários, sem busca, sem recolher e sem entrega em lote.
- Itens sem saldo ocupam espaço igual ao dos itens prontos.

**Melhoria**: mostrar primeiro os itens com saldo; recolher os demais; ação “Registrar entrega de vários itens” em uma única confirmação (decisão de escopo: depende de a regra permitir lote).

### 8. Estética e minimalismo — gravidade 2

- “Solicitado · Executado · Entregue · Pendente” numa linha de texto cinza é difícil de ler no celular.
- Os quatro números têm o mesmo peso. O mais importante (Disponível) está em outra linha.

**Melhoria**: grade de números com “Disponível” em destaque, os demais menores; barra de progresso.

### 9. Recuperação de erros — gravidade 3

- O tratamento só mapeia 409 e 403. `400 invalid_quantity` (ex.: decimal em peça) e `400 override_reason_required` caem em “Não foi possível registrar a entrega. Tente novamente.”, que leva a repetir a mesma ação.
- O 409 reaproveita o texto “exige autorização de gerente”, mas ele também ocorre quando **outra pessoa entregou antes** e o saldo mudou. A tela não recarrega o item nem informa o novo saldo.
- Quando o carregamento do pedido falha, não há botão “Tentar de novo” (a lista de pedidos tem).
- Se `/api/auth/sessao` falhar, o gerente deixa de ver a opção de autorizar, sem nenhum aviso.

**Melhoria**: uma mensagem por causa (“Para peça, use número inteiro”, “O saldo mudou: agora são 4 disponíveis”) e recarregar o item no 409; “Tentar de novo” no erro do pedido.

### 10. Ajuda e documentação — gravidade 2

- Nada explica a diferença entre Disponível, Executado e Entregue, que entrega parcial não conclui o item, nem por que só o gerente autoriza o excedente.
- Item totalmente entregue mostra o alerta **“Aguardando produção — ainda não tem saldo”**. Isso está errado: o saldo zerou porque já foi entregue (`disponivel = executado − entregue`).

**Melhoria**: texto de apoio curto no topo (“Você pode entregar até o valor de Disponível…”); corrigir o texto do estado “Entregue”.

---

## Onde uma tela ou janela nova ajuda (e onde não)

| Situação | Recomendação |
| --- | --- |
| Registrar uma entrega | **Janela de confirmação** com item, quantidade e unidade, o que sobra e o resultado (parcial ou concluído) |
| Entrega acima do disponível (gerente) | **Janela de confirmação reforçada**, em cor de alerta, com o motivo digitado dentro dela e a frase de que será auditada |
| Escolher o pedido | **Tela própria de lista** (cartões, busca, filtro “Com saldo”) |
| Ver e conferir os itens | **Tela de detalhe** do pedido (`/expedicao/entregas/[orderId]`) com “Voltar” |
| Histórico de entregas | **Painel ou aba por item** (a API já existe) |
| Mensagem de sucesso | **Aviso na própria página**, não janela: não bloqueia o fluxo repetido |
| Erro de validação | **Mensagem junto ao campo**, não janela |

Janela de confirmação só nas ações irreversíveis. Em todo envio, ela cansa o usuário e ele passa a clicar “OK” sem ler.

---

## Prioridade sugerida

1. **Confirmação antes de registrar** (H3, H5).
2. **Mensagens de erro por causa** e recarga do item no 409 (H9).
3. **Corrigir o alerta “Aguardando produção”** em item já entregue e criar o estado “Entregue / Parcial” (H1, H10).
4. **Botão “Entregar tudo disponível”** e campo com unidade e máximo (H5).
5. **Histórico de entregas** na tela (H3).
6. **Lista de pedidos com busca, cliente e filtro “Com saldo”** e detalhe em rota própria (H4, H6).
7. Remessas programadas visíveis, layout dos números e ajuda contextual (H6, H8, H10).

## Decisões que dependem do cliente ou do professor

- Existe **estorno** de entrega? Quem pode e com qual motivo?
- Pode haver entrega **em lote** (vários itens de uma vez)?
- A entrega **conclui o pedido** quando todos os itens chegam ao executado? (A regra de “pedido atendido” em Revenda já consta como pendente em `docs/panorama-do-projeto.md`.)

## Não avaliado

- Teste com expedidores reais, leitor de tela e contraste medido.
- Comportamento visual em 390 px. A análise foi por código.
