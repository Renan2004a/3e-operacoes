# Relatório de testes locais

**Data**: 2026-10-20
**Ambiente**: Windows 11, Node.js 24.x, app em `http://localhost:3000`, banco do app em MySQL (AWS de desenvolvimento), conector local disponível para importação.
**Escopo**: correções do feedback dos docentes (navegação, responsividade, feedback, pedido/remessas, impressão, banco).

> Regra seguida: **primeiro local, depois hospedado**. Nenhum teste destrutivo foi executado no banco hospedado.

---

## 1. Gates automatizados

| Gate | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | **0 erros**, 4 avisos pré-existentes |
| Typecheck | `npm run typecheck` | **OK** |
| Testes unitários/integração | `npm run test` | **700 testes**, 97 arquivos, **0 falhas** |
| Build de produção | `npm run build` | **OK** (rota `/vendedor/pedidos/[orderId]` incluída) |
| Validação no navegador | `node scripts/validar-responsivo-impressao.mjs` | **9/9 verificações OK** |

### Testes novos/ajustados

| Arquivo | Cobertura |
| --- | --- |
| `src/app/(app)/vendedor/pedidos/page.test.tsx` | Abrir pedido navega para a rota de detalhe |
| `src/app/(app)/vendedor/pedidos/[orderId]/page.test.tsx` | Detalhe, voltar, ordem das seções, “+ remessa”, desmembrar com sucesso |
| `src/app/(app)/admin/usuarios/page.test.tsx` | Inativação com confirmação + feedback |
| `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx` | Novo layout (quantidades em `dl`, “Resumo do pedido”, “Item desmembrado”) |
| `src/app/(app)/operador/atividades/[id]/page.test.tsx` | Progresso acessível (`aria-valuenow`) |
| `src/shared/ui/pedidos-lista.test.tsx` | Isolamento da URL (filtros preservados) |

---

## 2. Validação no navegador (Playwright)

Script: `scripts/validar-responsivo-impressao.mjs` (viewport 390×844).

```text
OK  | responsivo: vendedor-lista      | scrollWidth=390, innerWidth=390
OK  | responsivo: vendedor-detalhe    | scrollWidth=390, innerWidth=390
OK  | navegação: voltar do detalhe    | href=/vendedor/pedidos
OK  | responsivo: gerente-painel      | scrollWidth=390, innerWidth=390
OK  | responsivo: gerente-pedidos     | scrollWidth=390, innerWidth=390
OK  | responsivo: admin-usuarios      | scrollWidth=390, innerWidth=390
OK  | admin: tabela em cartões        | {"tabela":"block","cabecalho":"none"}
OK  | impressão: shell sem min-height | minHeight=0px
OK  | impressão: sem página extra     | páginas=1
```

Evidências salvas em `docs/video/validacao/` (PNGs das telas e `ordem-producao.pdf`).

### Impressão

- PDF gerado em A4, com **1 página** (contagem de objetos `/Type /Page`).
- O shell tem `min-height: 0` na mídia de impressão; menu e botões ficam ocultos.
- O conteúdo da ordem não quebra no meio (`break-inside: avoid`).

---

## 3. Testes manuais dos fluxos críticos

| Fluxo | Passos | Resultado |
| --- | --- | --- |
| Login por perfil | Entrar como vendedor/gerente/operador/admin | Redireciona para a tela inicial do perfil |
| Vendedor: abrir pedido | Lista → “Abrir” | Navega para `/vendedor/pedidos/[id]` |
| Vendedor: voltar | Detalhe → “← Voltar para os pedidos” | Retorna à lista; filtros preservados na URL |
| Vendedor: desmembrar | Escolher setor → “Desmembrar” | Item fica “Desmembrado”; mensagem de sucesso |
| Vendedor: remessa | “+ Adicionar remessa” → número/data → “Programar remessa” | Remessa aparece na lista; mensagem “Remessa criada com sucesso.” |
| Vendedor: confirmar/remover remessa | “Confirmar” / “Remover” | Status atualiza; mensagens de sucesso |
| Vendedor: prazo | Data → “Salvar prazo” | Badge “Prazo definido”; mensagem de sucesso |
| Gerente: painel | Abrir painel | Alertas (atrasados/parados/não encaminhados) e progresso por setor com percentual |
| Operador: fila/execução | Abrir atividade → registrar execução | Saldo atualizado; sucesso; progresso acessível |
| Operador: ocorrência | Perda + motivo → registrar | Ocorrência registrada; saldo não reduz indevidamente |
| Operador: impressão | Ordem → “Imprimir” | PDF com 1 página, sem menu |
| Admin: usuários | Abrir no celular | Tabela vira cartões; “Inativar” pede confirmação; mensagem de sucesso |
| Expedição | Selecionar pedido → registrar entrega | Entrega registrada; saldo atualizado |

---

## 4. Verificação no banco (DBeaver/MySQL)

Consultas executadas no schema do app (`3e_operacoes`) após os testes:

| Tabela | Registros |
| --- | --- |
| `usuarios` | 7 |
| `usuarios_perfis` | 7 |
| `setores` | 3 |
| `usuarios_setores` | 6 |
| `mapeamentos_categoria_setor` | 1 |
| `regras_produto_setor` | 14 |
| `pedidos` | 7 |
| `pedidos_itens` | 60 |
| `atividades` | 12 |
| `execucoes` | 12 |
| `ocorrencias` | 11 |
| `motivos_ocorrencia` | 9 |
| `entregas` | 6 |
| `remessas_programadas` | 1 |
| `jobs_integracao` | 7 |
| `eventos_job_integracao` | 58 |
| `logs_auditoria` | 1 |

- Pedidos reais: `70435`, `82249`, `82250`, `82261`, `82262`, `82268`, `82269`.
- As operações feitas na interface (desmembrar, remessa, prazo, inativação) correspondem a registros persistidos no banco correto (`3e_operacoes`), não no legado.
- O banco `topgerente` permaneceu **somente leitura**.

Instruções de conexão: `docs/banco-de-dados.md` §7.

---

## 5. Limitações e pendências

- **E2E autenticado no CI**: o CI cobre a superfície pública (login/responsividade com API mockada). A validação autenticada foi feita localmente, contra o banco real, com o script Playwright acima.
- **Leitor de tela e contraste**: não foram executados NVDA/VoiceOver nem ferramenta dedicada de contraste; a verificação foi semântica (rótulos, `role`, textos de estado).
- **Integração real**: a importação real depende do conector local na rede da 3E. Os pedidos usados já estavam importados; a validação de importação nova exige o conector ativo.
- **Volume**: a lista de pedidos não tem paginação; com volume maior, avaliar paginação e ordenação explícita.
- **Edição completa de usuário** (nome/perfis/setores) não tem tela; a API já suporta `PATCH`.
