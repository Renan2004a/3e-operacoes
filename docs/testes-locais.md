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
| Vendedor: prazo | Data → “Salvar prazo” → **F5** → novo login | Badge “Prazo de entrega: dd/mm/aaaa” e campo preenchido antes **e depois** de recarregar/entrar de novo (AD-009) |
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
- **Volume**: a lista de pedidos passou a ser paginada no servidor na correção A1 (20 por página, teto 100, ordenação `createdAt desc, id asc`). O teste de integração com MySQL existe e deve ser executado antes de considerar a A1 concluída quando houver mudança na consulta:

  ```bash
  # banco de teste/integração já migrado (nunca o banco real)
  RUN_INTEGRATION_TESTS=1 DATABASE_URL='mysql://usuario:senha@127.0.0.1:3306/3e_a1_integration' \
    npx vitest run src/modules/indicadores/adapters/consulta-pedidos.integration.test.ts
  ```

  Sem `RUN_INTEGRATION_TESTS=1` e sem um banco cujo nome contenha `integration` ou `test`, os testes são ignorados explicitamente.
- **Edição completa de usuário** (nome/perfis/setores) não tem tela; a API já suporta `PATCH`.
- **Expedição**: a tela `/expedicao/entregas` continua consumindo `GET /api/pedidos` sem paginação explícita e vê apenas os 20 pedidos mais recentes. Comportamento anterior à A1, preservado por escopo; a paginação da Expedição fica para correção própria.

---

## 6. Validação manual da paginação (A1)

### Preparação do ambiente

```bash
npm install
npm run prisma:generate

# Apenas em clone novo; não sobrescrever um .env já configurado:
cp .env.example .env
# Editar DATABASE_URL e SESSION_SECRET

npm run db:up          # MySQL local via Docker; pular se usar um MySQL já migrado
npm run prisma:deploy  # aplicar migrações
npm run prisma:seed    # setores, motivos e usuários de demonstração
npm run dev            # http://localhost:3000
```

- Vendedor: `vendedor@3e.local` / `vendedor123`
- Gerente: `gerente@3e.local` / `gerente123`
- Para exercitar a navegação é necessário um banco com **mais de 20 pedidos acessíveis**. Com 20 ou menos, os controles de página não aparecem por desenho.

### Roteiro (repetir para Vendedor e Gerente)

| # | Passo | Resultado esperado |
| --- | --- | --- |
| 1 | Entrar e abrir `Pedidos` | Primeira página com até 20 linhas; resumo “N pedido(s) encontrado(s) — página 1 de X”; “Anterior” desabilitado |
| 2 | Conferir a requisição em DevTools → Network | `GET /api/pedidos` sem `offset` na primeira página |
| 3 | Clicar em “Próxima” | Requisição com `limite=20&offset=20`; URL com `pagina=2`; linhas diferentes, sem repetir a página 1 |
| 4 | Clicar em “Anterior” | Volta à página 1; URL sem `pagina`; requisição sem `offset` |
| 5 | Ir até a última página | “Próxima” desabilitado; quantidade de linhas pode ser menor que 20; total permanece correto |
| 6 | Pesquisar um número comercial que não apareça na primeira página | Pedido é encontrado; número, cliente e status corretos; total reflete o filtro |
| 7 | Combinar cliente + setor + status + período | Somente pedidos que atendem a todos os critérios; total do resumo coerente com a lista |
| 8 | Com filtros aplicados, avançar para a página 2 | Filtros continuam preenchidos; requisição leva filtros + `limite`/`offset`; URL mantém os filtros e `pagina=2` |
| 9 | Na página 2, alterar um filtro e clicar em “Filtrar” | Volta para a página 1; requisição sem `offset`; URL contém apenas os filtros (sem `pagina`) |
| 10 | Abrir um pedido da página 2 e usar “← Voltar para os pedidos” | Retorna à página 2 com os filtros preservados |
| 11 | Alterar a URL manualmente para `?pagina=999` (com filtros) | “Página não encontrada” com botão “Ir para a primeira página”; total correto |
| 12 | Conferir o total exibido | É o total de pedidos que atendem aos filtros, não o tamanho da página |
| 13 | Repetir em largura de celular e com teclado | Sem rolagem horizontal da página; botões com alvo adequado e foco visível; leitor de tela anuncia a paginação |

Registrar como evidência: perfil usado, URL da lista, quantidade total exibida, página acessada, captura de tela e qualquer divergência. Em 2026-10-25, os cenários de filtros, página 2, links diretos e retorno do detalhe foram validados localmente com Playwright nos perfis Vendedor e Gerente; o roteiro manual em dispositivo físico permanece pendente.

---

## 7. Validação manual — AD-009 (prazos)

**Gates automatizados desta correção (2026-10-22):** `npm test` 866 aprovados (+23 de integração MySQL executados à parte); `npm run lint` 0 erros; `npm run typecheck` OK; `npm run build` OK. A validação abaixo é a que falta.

Executar com o app local e banco do app migrado. Repetir no **Vendedor** e no **Gerente**. Não executar em produção.

| # | Passo | Resultado esperado |
| --- | --- | --- |
| 1 | Abrir um pedido sem prazo | Badge “Sem prazo”; campo de data vazio; nenhum “Atrasado” |
| 2 | Informar uma data futura e salvar | Mensagem de sucesso; badge “Prazo de entrega: dd/mm/aaaa” com a **mesma data informada** |
| 3 | Recarregar a página com **F5** | Badge e campo continuam preenchidos com a mesma data |
| 4 | Sair e entrar novamente com o mesmo usuário | O prazo continua visível |
| 5 | Abrir o mesmo pedido em outro navegador/aba anônima | O prazo continua visível |
| 6 | Alterar o prazo para outra data e salvar | O novo valor substitui o anterior; após F5 permanece o novo |
| 7 | Informar a **data de hoje** | Não aparece “Atrasado” durante o dia; no dia seguinte, passa a atrasado |
| 8 | Informar uma data passada no prazo do item | O badge exibe a data informada; o atraso **do item** ainda não é sinalizado na interface (falta definir o critério de conclusão do item, AD-011). O prazo do setor, quando vencido, mostra “· Atrasado” |
| 9 | Abrir um pedido com atividade de setor e prazo operacional | “Prazo do setor: dd/mm/aaaa” aparece em **modo leitura**; não há campo para editar |
| 10 | Alterar o prazo de entrega do item e conferir o prazo do setor | O prazo do setor **não** muda |
| 11 | Importar/reimportar o mesmo pedido | O prazo local continua o mesmo (o conector não envia data de entrega) |
| 12 | Entrar com um perfil sem `definir_prazo` (ex.: Operador) e abrir o detalhe | O prazo é legível, mas não há ação de salvar prazo |
| 13 | Acessar a rota sem sessão (ou usuário sem perfil) | A rota de detalhe continua negando o acesso (`401`/`403`), comportamento existente |
| 14 | Conferir no banco (`pedidos_itens.deadlineAt`) | O valor corresponde ao fim do dia em São Paulo (ex.: `2026-02-01` → `2026-02-02 02:59:59.999`) |

**Prazos antigos:** se o banco tiver prazos gravados antes desta correção (meia-noite UTC), o roteiro do passo 3 pode mostrar um dia a menos. Não há script de conversão nesta etapa. Em ambiente de demonstração, re-salvar o prazo pela interface (passos 2 e 3). Se houver dado real nesse formato, interromper e solicitar autorização específica antes de qualquer conversão.

**Evidência mínima:** perfil, número do pedido, data informada, data exibida antes/depois do F5 e após novo login, captura de tela e valor lido no banco.

---

## 8. Validação manual — transparência da reimportação e unidade

**Status:** validado localmente em 2026-10-25 com MySQL isolado e conector HTTP simulado (15 cenários Playwright; 24 testes de integração MySQL). Pendente repetir com o conector Top Gerente real e em dispositivo físico.

| # | Passo | Resultado esperado |
| --- | --- | --- |
| 1 | Importar um pedido válido e conferir o link **“Abrir pedido”** | Abre o detalhe correto do pedido importado |
| 2 | Repetir a importação dentro de 60 s, sem alterar o Top Gerente | Mensagem de **resultado anterior**, deixando claro que **não houve nova consulta** |
| 3 | Reimportar efetivamente um pedido antigo e abrir pelo link, com filtros que o excluiriam | Detalhe abre corretamente; `createdAt` não muda |
| 4 | Em ambiente de teste, alterar a unidade de origem de item com execução/entrega/remessa/atividade iniciada e reimportar | Unidade e histórico anteriores são preservados; divergência de unidade aparece no resultado |
| 5 | Alterar a unidade de um item sem registros operacionais e reimportar | Unidade e quantidade são atualizadas, sem conversão automática |
| 6 | Conferir os logs/eventos | `UNIT_DIVERGENCE` no `AuditLog` e no job; nenhum registro operacional apagado |
| 7 | Conferir o pedido na listagem | Nenhuma duplicação de pedido e `createdAt` inalterado |
| 8 | Manter um job sem concluir por mais de 60 s (conector lento ou pausado) | O acompanhamento automático é pausado; o status conhecido permanece e a tela informa que a importação está demorando |
| 9 | Clicar em **Consultar andamento** | Consulta o mesmo job, sem criar novo despacho nem nova importação |
| 10 | Forçar uma falha definitiva (ex.: pedido inexistente) | A tela mostra a orientação específica além do código técnico; uma falha de consulta não é apresentada como falha da importação |
| 11 | Reabrir a lista após um sucesso e voltar do detalhe (Vendedor e Gerente) | Filtros e página são preservados na URL de retorno |

**Evidência mínima:** perfil, número do pedido, origem da solicitação (nova/em andamento/anterior), unidade anterior e nova, mensagem exibida, link aberto, tempo de espera observado e captura de tela.
