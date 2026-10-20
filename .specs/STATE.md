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
- Vendedor consulta todos os pedidos, pode definir/alterar prazo de entrega e fazer o desmembramento (classificar itens por setor); não altera produção.
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

### AD-003

- **Decision**: O vendedor passa a poder fazer o **desmembramento** do pedido (classificar itens por setor), além de definir prazo. A tela de detalhe do pedido não exibe mais o CUID do item (usa posição/descrição) e mostra o desmembramento por setor.
- **Reason**: Pedido do cliente/professor; o vendedor conhece o pedido e faz a separação/desmembramento hoje no papel.
- **Trade-off**: Amplia a matriz de permissões do vendedor; as demais ações de produção continuam negadas.
- **Scope**: permissões, pedidos (vendedor/gerente), indicadores.
- **Date**: 2026-10-08
- **Status**: active

### AD-004

- **Decision**: Fechar as lacunas A/B/C do cliente com: (A) alertas operacionais de **atrasados**, **parados** (sem execução há `ALERTA_PARADO_DIAS`, padrão 5) e **não encaminhados**, com endpoint `GET /api/indicadores/alertas` e card no painel; (B) **remessas** (entrega programada) por item — número + data prevista + confirmação — via `ScheduledDelivery`, com permissão `programar_remessa` (gerente/vendedor); (C) **sugestão de setor** por produto via `ProductSectorRule` (regras semeadas), pré-selecionada no desmembramento sem impedir a troca.
- **Reason**: Requisitos explícitos do cliente (RF012, RF010, RF002) apontados como parciais na análise de conformidade.
- **Trade-off**: "Parado" e a forma da remessa foram decididos por default do agente (limiar configurável e número+data); a edição das regras em runtime e o vínculo remessa↔entrega ficam no backlog.
- **Scope**: indicadores (alertas), expedição (remessas), setores (sugestão), frontend (painel/detalhe).
- **Date**: 2026-10-15
- **Status**: active

### AD-005

- **Decision**: As **tabelas físicas** do banco do app passam a usar **português** (`snake_case`, plural), aplicado por `@@map` no Prisma. Os modelos do código continuam em inglês para preservar domínio, APIs e testes. A renomeação usa `RENAME TABLE` + normalização de constraints, sem recriar tabelas nem perder dados.
- **Reason**: Pedido explícito do cliente/docentes para padronizar a nomenclatura visível no banco (DBeaver) em português, alinhando ao vocabulário do MER e da interface.
- **Trade-off**: Tabelas em português e colunas/modelos em inglês; a tradução de colunas exigiria `@map` em cada campo e uma nova migration (fase futura). O ambiente hospedado precisa ser implantado junto com a migration.
- **Scope**: banco, Prisma, migrations, documentação de banco e DER.
- **Date**: 2026-10-20
- **Status**: active

## Handoff

- **Feature**: revisão e correções do feedback dos docentes + padronização do banco em português
- **Phase / Task**: concluído; próximo: vídeo final e validação hospedada
- **Completed**: navegação do vendedor em rota própria; tabelas responsivas; feedback; ordem do detalhe + “+ remessa”; progresso acessível; impressão com 1 página; tabelas do banco renomeadas para português (17 tabelas, dados preservados); docs de banco, mockups, heurísticas e testes locais
- **In-progress** (file:line): nenhum
- **Next step**: gravar o vídeo final por perfil e publicar no Railway com smoke test
- **Blockers**: nenhum para desenvolvimento; integração real depende do conector na rede da 3E
- **Uncommitted files**: (atualizado no commit)
- **Branch**: main
