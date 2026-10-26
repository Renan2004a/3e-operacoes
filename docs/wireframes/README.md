# Wireframes — 3E Operações

**Data**: 27/10/2026
**Projeto Balsamiq**: https://balsamiq.cloud/ssandol/p4879yi
**Board inicial**: WF-01 · Login
**Boards**: 20 · **Controles**: 1.056 · **Molduras PNG**: 32 · **PDF**: 1

> Wireframes de **baixa fidelidade** de todas as telas do sistema, com shell por perfil, estados, mapa de navegação e kit de componentes. O projeto Balsamiq é editável; o HTML é a fonte local e o BMPR permite reimportar tudo.

---

## 1. O que está aqui

| Arquivo | Para quê |
| --- | --- |
| `index.html` | Board navegável com as 20 telas, estados e mapa (abra no navegador) |
| `assets/wireframes.css` | Estilo “Balsamiq” (mão, bordas sketch, baixa fidelidade) |
| `png/` | 32 PNGs (desktop/mobile/estados) para referência ou colagem |
| `wireframes.pdf` | PDF do board completo (A4, uma tela por página) |
| `3e-operacoes-wireframes.bmpr` | Projeto Balsamiq completo (20 boards) para backup/importação |
| `balsamiq/` | Export real do Balsamiq (WF-05 e WF-10) como evidência |
| `INVENTARIO-TELAS.md` | Inventário rota → tela → perfil → estados → dados |
| `GUIA-BALSAMIQ.md` | Como abrir, editar, regenerar e importar |

---

## 2. Projeto Balsamiq

- **Link**: https://balsamiq.cloud/ssandol/p4879yi
- **Nome**: 3E Operações — Wireframes
- **Conteúdo**: 20 boards, um por tela/transversal, com sidebar, cabeçalho, cards, tabelas, formulários, badges e estados.
- **Origem**: o board WF-01 foi convertido pelo Balsamiq AI a partir do nosso PNG; os demais foram gerados deterministicamente a partir do mesmo padrão e importados via BMPR (SQLite).
- **Edição**: clique em qualquer board na lista “Boards”; os elementos são controles nativos (`Text`, `Button`, `RoundButton`, `HRule`, `VRule`, `Canvas`).

### Boards

| Board | Tela | Rota |
| --- | --- | --- |
| WF-01 | Login | `/login` |
| WF-02 | Redirecionamento | `/` |
| WF-03 | Vendas | `/vendedor/pedidos` |
| WF-04 | Detalhe do pedido (Vendedor) | `/vendedor/pedidos/[id]` |
| WF-05 | Painel do Gerente | `/gerente/painel` |
| WF-06 | Pedidos do Gerente | `/gerente/pedidos` |
| WF-07 | Detalhe e correção (Gerente) | `/gerente/pedidos/[id]` |
| WF-08 | Meus pedidos (Operador) | `/operador/fila` |
| WF-09 | Executar atividade (Operador) | `/operador/atividades/[id]` |
| WF-10 | Ocorrências (Operador) | `/operador/ocorrencias` |
| WF-11 | Entregas (Expedição) | `/expedicao/entregas` |
| WF-12 | Importar pedido | `/integracao` |
| WF-13 | Usuários | `/admin/usuarios` |
| WF-14 | Setores e mapeamentos | `/admin/setores` |
| WF-15 | Integração (técnico) | `/tecnico/integracao` |
| WF-16 | Ordem de produção / impressão | `/producao/atividades/[id]/ordem` |
| WF-17 | Estados globais | — |
| WF-18 | Padrão responsivo | — |
| WF-19 | Mapa de navegação | — |
| WF-20 | Componentes | — |

---

## 3. Como abrir e editar

### No Balsamiq
1. Abra https://balsamiq.cloud/ssandol/p4879yi e faça login.
2. Se aparecer “Browser not supported”, clique em **“I understand things might not work, let me continue”**.
3. Escolha o board na lista à esquerda.
4. Para editar: clique no elemento (texto, botão, card), arraste para mover, use as alças para redimensionar e o painel da direita para propriedades.
5. Para duplicar uma tela: **Board → Duplicate board**, renomeie e ajuste o conteúdo.

### No navegador (local)
- Abra `docs/wireframes/index.html` (duplo clique ou Live Server).
- Filtre pelo menu lateral; cada seção tem desktop, mobile (quando aplicável), estados e notas.

### Regerar
```bash
# PNGs + PDF do board HTML
node scripts/capturar-wireframes.mjs

# BMPR (20 boards) para importar no Balsamiq
python scripts/gerar-bmpr-wireframes.py
```
O BMPR gerado fica em `docs/wireframes/3e-operacoes-wireframes.bmpr`. Para importar: **All projects → Upload** (ou **Project → Import → Import from BMPR…**).

---

## 4. Limitações do plano trial (registradas)

- **Marca d’água** “Made with Balsamiq — free trial” nas exportações de imagem/PDF.
- **Limite de 2 projetos** no espaço; para subir uma nova versão, exclua a anterior ou importe por cima.
- **Exportação em lote** (ZIP com todas as telas) falhou no trial; a exportação individual funciona.
- O projeto e a edição **não** têm marca d’água; apenas a exportação.
- Para remover a marca e liberar projetos, é necessário upgrade (planos a partir de US$ 16/editor/mês).

---

## 5. Relação com os outros artefatos

| Artefato | Nível | Uso |
| --- | --- | --- |
| `docs/mockups/` | Alta fidelidade (HTML) | Validar visual/tokens com o cliente |
| `docs/wireframes/` | Baixa fidelidade (Balsamiq) | Discutir estrutura, fluxo e estados antes de codar |
| `src/app` | Implementação | Fonte da verdade do comportamento |

Divergências entre wireframe e app devem ser resolvidas a favor do app e registradas em `docs/avaliacao-heuristicas.md` / `INVENTARIO-TELAS.md`.

---

## 6. Validação

- **20/20 boards** importados e listados no Balsamiq.
- **1.056 controles** no BMPR; integridade SQLite `ok`.
- Spot-check de renderização: WF-04, WF-05, WF-08, WF-10 e WF-20 (texto e layout).
- Export real do Balsamiq: `balsamiq/WF-05-painel.png` e `balsamiq/WF-10-ocorrencias.png` (com marca do trial).
- O projeto original `p2tarmq` (“Your First Project”) permanece intacto, com o board convertido pela IA.

> **Segurança**: nenhuma credencial do Balsamiq é armazenada neste repositório. A sessão de login fica no navegador usado para a importação.
