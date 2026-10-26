# Guia Balsamiq — 3E Operações

**Projeto**: https://balsamiq.cloud/ssandol/p4879yi
**Nome**: 3E Operações — Wireframes
**Data**: 27/10/2026
**Boards**: 20 · **Controles**: 1.056

---

## 1. Acesso

### Link público (para os amigos/revisores)
**https://balsamiq.cloud/ssandol/p4879yi**

- Qualquer pessoa com o link pode **ver e comentar** o projeto, **sem conta Balsamiq**.
- O acesso é somente leitura + comentários; não permite editar os boards.
- Para ativar/desativar: **Project → Share / Export → Get a review link** e o toggle **“Anyone with the link can view and comment…”**.
- O link foi validado em uma sessão limpa (sem login): abre o projeto, lista os 20 boards e exibe “Add a comment”/“Comments”.

### Acesso como editor
1. Abra o link do projeto e entre com a conta do espaço `ssandol`.
2. Na primeira navegação o Balsamiq pode exibir **“Oops! Browser not supported”**. Clique em **“I understand things might not work, let me continue”**. O editor funciona; o aviso é do navegador de automação.
3. A lista **Boards** fica à esquerda. Clique em um board para abrir.
4. O link do projeto (`/p4879yi`) abre o último board visitado; o link direto de um board tem a forma `https://balsamiq.cloud/ssandol/p4879yi/rXXXX`.

> O projeto original `https://balsamiq.cloud/ssandol/p2tarmq/rA310` (“Your First Project”) não foi alterado; ele contém o board “New board 1” gerado pela IA a partir do PNG do Operador.

---

## 2. O que foi gerado e como

| Etapa | O que aconteceu |
| --- | --- |
| 1 | O PNG `WF-08-desktop.png` foi enviado ao **Balsamiq AI** e convertido em um board editável (31 controles, 10 créditos). |
| 2 | O projeto foi exportado em **BMPR backup** e inspecionado: BMPR é SQLite (`BRANCHES`, `RESOURCES`, `THUMBNAILS`, `INFO`). |
| 3 | O script `scripts/gerar-bmpr-wireframes.py` recriou os 20 boards com os mesmos tipos de controle, usando o padrão visual do board da IA. |
| 4 | O BMPR foi importado pelo **Upload** da lista de projetos, criando o projeto final. |
| 5 | O projeto foi renomeado para **3E Operações — Wireframes** e validado (WF-04, WF-05, WF-08, WF-10, WF-20). |

**Créditos de IA:** 90 restantes (foram usados 10 na conversão inicial). O restante foi gerado por código, sem consumir créditos.

---

## 3. Estrutura de cada board

Todos os boards usam o mesmo canvas **1312 × 820**:

| Região | Conteúdo |
| --- | --- |
| Sidebar (x 16–266) | Logo 3E, nome do perfil, itens de menu (o ativo tem fundo azul claro), usuário, papel e “Sair” |
| Topbar (y 36–89) | Breadcrumb, data/hora, botão “Sair” |
| Cabeçalho (y 110–180) | Título (24 px), subtítulo (13 px) |
| Conteúdo (y 205+) | Métricas, cards, formulários, tabelas, alertas e ações |

**Tipos de controle usados:**

| Tipo Balsamiq | Uso no wireframe |
| --- | --- |
| `Canvas` | Fundo do board |
| `RoundButton` (shape rectangle) | Cards, sidebar, inputs, badges, barras de progresso |
| `Text` | Títulos, rótulos, valores, links |
| `Button` | Ações principais e secundárias |
| `HRule` / `VRule` | Separadores e bordas |
| `Text` (com `jsonText`) | Texto rico: negrito, cor, link e ícones |

> Os textos são **controles `Text`/`Button` editáveis**, não imagens. O texto rico fica em `properties.jsonText.dom`; ao editar no Balsamiq, use a caixa de texto normalmente.

---

## 4. Edição no Balsamiq

### Editar um board
1. Abra o board na lista.
2. Clique em um elemento para selecionar.
3. Arraste para mover; use as alças para redimensionar.
4. Duplo clique no texto para editar; o painel da direita mostra propriedades (fonte, cor, alinhamento).
5. `Ctrl+Z` / `Ctrl+Shift+Z` para desfazer/refazer.

### Duplicar uma tela
1. **Board → Duplicate board**.
2. Renomeie no padrão `WF-xx · Nome`.
3. Ajuste textos, cards e navegação.

### Criar uma tela nova
- O caminho mais rápido é duplicar o board mais parecido (ex.: WF-09 para uma nova tela de execução) e editar.
- Para adicionar controles: use a paleta **UI elements** (Button, Text Input, Combo Box, Checkbox, Data Grid, Progress Bar, Alert etc.).
- Mantenha o canvas 1312×820 e as margens (sidebar 16–266; conteúdo a partir de 286).

### Reordenar
- Arraste os boards na lista ou use as setas ↑/↓.
- A ordem atual segue WF-01 → WF-20.

---

## 5. Regerar e reimportar

### Gerar o BMPR localmente
```bash
python scripts/gerar-bmpr-wireframes.py
```
Saída: `docs/wireframes/3e-operacoes-wireframes.bmpr` (SQLite, ~360 KB, 20 boards).

### Importar
1. Abra **All projects** (`https://balsamiq.cloud/ssandol/projects`).
2. Clique em **Upload**.
3. Selecione o `.bmpr` (ou arraste).
4. Aguarde “Uploading project…” e o projeto abrir.
5. Renomeie em **Project → Rename project…**.

> **Limite do trial:** o espaço aceita **2 projetos**. Se já existirem dois, exclua um (menu “⋮” do projeto → **Delete project…**, digite `DELETE`) antes de subir outro. O projeto original `p2tarmq` conta como um.

### Exportar
- **Project → Share / Export** (ou `Ctrl+E`) → **Download a file**.
- Formatos: **Images** (PNG por board), **PDF**, **BMPR backup**.
- “Everything” exporta todos os boards; no trial, o ZIP de todas as imagens pode falhar — exporte **Only this board** para conferência.
- Exportações de imagem/PDF no trial têm a marca **“Made with Balsamiq — free trial”**.

---

## 6. Mapa de controles (HTML → Balsamiq)

| No produto (HTML) | No Balsamiq | Observação |
| --- | --- | --- |
| `Card` | `RoundButton` shape rectangle | Fundo branco/cinza, borda 2 px |
| `Button` primário | `Button` com fill azul | Texto branco |
| `Button` secundário | `Button` com fill branco | Texto escuro |
| `Input` | `Text Input` (ou card + `Text`) | Placeholder cinza |
| `Select` | `Combo Box` (ou card + `Text` + `▾`) | |
| `Checkbox` | `Checkbox` | |
| `Badge` | `RoundButton` pequeno (shape rectangle) | Texto centralizado |
| `Progress` | `Progress Bar` (ou card + barra) | |
| `Table` | `Data Grid` (ou card + linhas de `Text`) | No mobile, vira cartões |
| `Alert` | `Alert` / `Message Box` | Cores por tom |
| `Metric` | card + `Text` | Rótulo pequeno + valor grande |
| `EmptyState` | card + ícone + `Text` | |
| `Spinner` | `Spinner` / texto “Carregando…” | |

---

## 7. Convenções

- **Nome do board**: `WF-xx · Tela (Perfil)`.
- **Baixa fidelidade**: sem logos reais, fotos ou dados sensíveis; use rótulos genéricos.
- **Português**: todos os rótulos em PT-BR, linguagem de fábrica (“Pedido”, “Setor”, “Remessa”).
- **Cores**: azul para ação/ativo; verde/amarelo/vermelho apenas para status; não depender só da cor.
- **Acessibilidade**: alvos ≥ 44 px, rótulos visíveis, foco e contraste (o wireframe antecipa; a implementação comprova).
- **Estados**: cada tela crítica tem carregando/vazio/erro/sucesso nas notas ou no board WF-17.

---

## 8. Problemas comuns

| Sintoma | Causa / solução |
| --- | --- |
| “Browser not supported” | Clique em “I understand…”; o editor funciona no navegador de automação. |
| “You've hit your project limit” | Trial permite 2 projetos; exclua um ou faça upgrade. |
| ZIP de imagens com 0 bytes | Exportação em lote falhou no trial; exporte board a board. |
| Marca “Made with Balsamiq” | Esperado no trial; upgrade remove. |
| Board abre em branco | Aguarde o carregamento; recarregue. Os controles são nativos e devem renderizar. |
| Texto cortado na lista | A lista trunca o nome; o board completo mantém o nome inteiro. |
| Projeto não aparece | Verifique se o upload terminou (“Uploading project…” → projeto aberto). |

---

## 9. Segurança e credenciais

- Nenhuma senha, token ou cookie do Balsamiq é gravado neste repositório.
- A sessão fica no navegador usado para a importação; encerre a sessão se o ambiente for compartilhado.
- O BMPR contém apenas wireframes (sem dados reais de pedidos, clientes ou usuários).
- O **link público** permite visualização e comentários a qualquer pessoa que o tenha. Compartilhe só com o grupo pretendido e desative o toggle quando não precisar mais.

---

## 10. Próximos passos sugeridos

1. Revisar os 20 boards com o cliente e marcar ajustes.
2. Se quiser telas mobile dedicadas no Balsamiq, duplicar WF-08/WF-09/WF-10 e usar o frame de 390 px (ver WF-18).
3. Após o upgrade, exportar o PDF limpo (sem marca) para anexar à documentação.
4. Manter o BMPR versionado; ele é o backup portátil do projeto.
