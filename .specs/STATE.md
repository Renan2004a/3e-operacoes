# STATE - 3E Operações

## Estado atual

Projeto em bootstrap. A estrutura inicial, documentação, skills locais e subagentes foram preparados. Ainda não há implementação funcional da integração com o Top Gerente nem telas finais.

## Decisões vigentes

- OpenCode é o agente principal de desenvolvimento.
- Skills são locais ao projeto e versionadas no Git.
- Em conflitos de metodologia entre uma skill do Tech Leads Club e uma skill local 3E, a skill do Tech Leads Club prevalece. Regras de domínio continuam sendo definidas pelos documentos do projeto.
- Fluxo principal: Tech Leads Club `tlc-spec-driven` + skills locais específicas do domínio.
- Stack: Next.js App Router, TypeScript, Prisma no banco próprio, MySQL, Zod, npm.
- Hospedagem do aplicativo: Railway.
- Top Gerente: acesso somente leitura por conector local e Cloudflare Tunnel/Access; sem polling contínuo.
- Sincronização: assíncrona e disparada por requisição de usuário a partir do número do pedido.
- Setores usados agora: Corte e Dobra, Telhas e Revenda.
- Usuário pode pertencer a mais de um setor.
- Vendedor consulta todos os pedidos e pode definir/alterar prazo de entrega; não altera produção.
- Expedição e gerente registram entregas.
- Operação offline foi adiada; não faz parte do escopo atual.
- Referências visuais são inspiração, não especificação e não obrigam reaproveitamento de código.
- Frontend deve funcionar em celular, tablet, notebook e desktop, com objetivo WCAG 2.1 AA.
- Testes: Vitest + Testing Library + Playwright; cobertura alvo de 80% nos módulos críticos de domínio.
- CI no GitHub: lint, typecheck, testes e build.
- Datas persistidas em UTC e exibidas em `America/Sao_Paulo`.

## Próximo passo recomendado

Executar uma primeira feature pelo `tlc-spec-driven`: **importar um pedido por número via conector local**, começando pela especificação e pelos contratos entre Railway, conector local e Top Gerente.

## Pontos ainda a validar com dados reais

- Tabelas e joins exatos do Top Gerente para pedido, itens, categoria, cliente e vendedor.
- Lista oficial de categorias e seu mapeamento operacional para os três setores.
- Lista fechada real de motivos de perda, refugo e indisponibilidade.
- Regra de Revenda para o significado final de “indisponível” no saldo pendente.

## Decisions

### AD-001

- **Decision**: A integração lê o Top Gerente por `orcamento` + `orcamento_itens` (e `cad_produto` quando houver), via conector local, somente leitura.
- **Reason**: O guia RDS e o dump confirmaram o join; o legado segue como fonte oficial dos dados comerciais.
- **Trade-off**: Dependência do conector e do RDS; a instância acessível não tem catálogo de produtos (`cad_produto` vazia).
- **Scope**: features de integração e pedidos.
- **Date**: 2026-10-06
- **Status**: active

### AD-002

- **Decision**: O adapter do legado é real (RDS) e os testes usam fake; o domínio não depende de banco.
- **Reason**: Mantém os testes rápidos e determinísticos, sem MySQL local.
- **Trade-off**: O teste unitário não cobre o SQL real; isso fica em teste de integração separado.
- **Scope**: todos os módulos de domínio.
- **Date**: 2026-10-06
- **Status**: active

## Handoff

- **Feature**: qualidade-e-fechamento (concluída e verificada) + validação operacional contra a AWS
- **Phase / Task**: projeto com o backlog implementado e rodando contra o banco AWS
- **Completed**: 11 features; importação real (70435) e fluxo operacional completo validados
- **In-progress** (file:line): nenhum
- **Next step**: criar remote e push; go-live (Cloudflare/conector no cliente); usuário read-only e rotação de senha
- **Blockers**: nenhum para desenvolvimento
- **Uncommitted files**: docs/execucao.md, .specs/STATE.md
- **Branch**: main
