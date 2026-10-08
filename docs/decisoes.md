# Decisões do projeto

Este documento consolida decisões posteriores aos documentos originais. Em caso de conflito com uma fonte histórica em `docs/fontes/`, prevalece este arquivo até que a própria especificação seja revisada.

## Domínio e setores

- O escopo atual trabalha somente com **Corte e Dobra**, **Telhas** e **Revenda**.
- O detalhamento dos 15 setores históricos não é necessário nesta etapa.
- Um usuário pode atuar em mais de um setor.
- O produto chega do Top Gerente com uma **categoria cadastrada durante a venda**. A categoria do legado é a fonte oficial.
- Como ainda não existe a correspondência categoria → setor, o aplicativo manterá uma tabela configurável de mapeamento operacional:
  - ao importar item com categoria já mapeada, atribuir setor automaticamente;
  - categoria sem mapeamento deixa o item em `PENDENTE_CLASSIFICACAO`;
  - usuário autorizado classifica a categoria uma vez e o mapeamento vale para importações futuras;
  - alteração do mapeamento é auditada;
  - não alterar a categoria no Top Gerente.

## Perda e refugo

A decisão mais recente substitui a formulação anterior que descontava perda/refugo do saldo a produzir.

- **Corte e Dobra:** perda não satisfaz a quantidade solicitada. Ex.: solicitado 10, produzidas 8, perdidas 2 ⇒ ainda faltam 2 peças boas. A produção final deve alcançar 10 peças conformes.
- **Telhas:** refugo não satisfaz a metragem solicitada. Ex.: solicitado 10 m, produzidos 8 m, refugados 2 m ⇒ ainda faltam 2 m conformes.
- Perda/refugo continuam registrados separadamente para rastreabilidade e indicadores.
- Motivo é obrigatório quando perda/refugo/indisponibilidade for registrado.
- Os motivos citados nos documentos são **exemplos**, não a lista definitiva. A lista real continua pendente de levantamento.

## Prazos

- Pedido pode nascer sem data de entrega.
- Sem data, exibir **Sem prazo** e nunca classificar como atrasado.
- Data pode ser definida posteriormente por gerente ou vendedor.
- Pode existir data distinta por item/setor.
- Alertas de atraso só são calculados para o escopo que possuir prazo definido.

## Permissões

- Operador: vê/atua nos setores aos quais está associado.
- Gerente: também altera status e prioridades.
- Vendedor: consulta todos os pedidos; não altera produção, quantidades executadas, ocorrências ou entregas. Exceções: pode definir/alterar prazo de entrega e fazer o **desmembramento** (classificar itens por setor) do pedido.
- Expedição e gerente podem registrar entregas.
- Entrega acima do disponível exige gerente, motivo obrigatório e auditoria completa do valor anterior, valor solicitado, usuário e data/hora.

## Tecnologia

- OpenCode como ambiente principal; manter código convencional e portátil.
- Next.js com App Router e TypeScript.
- `src/app/` para rotas/UI e `src/modules/` para domínio independente do Next.js.
- Prisma apenas no banco próprio do aplicativo.
- Acesso ao Top Gerente por adapter/conector específico de leitura; não introspectar ou gerenciar o schema legado com Prisma.
- MySQL no banco próprio.
- Zod para validação de entrada/contratos.
- npm como gerenciador.
- ESLint + Prettier.
- Railway para a aplicação e banco próprio.
- Cloudflare Tunnel/Access para expor **o serviço conector local**, nunca a porta do MySQL.
- Sem operação offline nesta etapa.
- Tailwind CSS + shadcn/ui como base de implementação do frontend; referências visuais orientam o design, mas não são especificação.
- Alvo de acessibilidade: WCAG 2.1 AA.
- Vitest + Testing Library + Playwright.
- Cobertura alvo: 80% nos módulos críticos de domínio, priorizando qualidade dos cenários e não cobertura artificial de UI.
- GitHub Actions: lint, typecheck, testes e build.
- Logs do Railway no início; observabilidade externa somente quando houver necessidade concreta.
- Persistir timestamps em UTC; apresentar ao usuário em `America/Sao_Paulo`.

## Integração sob demanda

- Não existe polling contínuo no Top Gerente.
- Usuário informa o número do pedido na interface do Railway.
- A API do aplicativo cria um job assíncrono e retorna imediatamente o identificador/status.
- O Railway chama o conector local por HTTPS através do Cloudflare Tunnel/Access.
- O conector local consulta o MySQL do Top Gerente com usuário `SELECT` e SQL parametrizado.
- O conector devolve o payload normalizado para um endpoint autenticado do aplicativo. O conector **não recebe credenciais diretas do banco Railway**.
- O aplicativo persiste o pedido, itens e metadados de sincronização no banco próprio.
- Repetir a sincronização do mesmo pedido é idempotente: atualiza dados comerciais importados e quantidades solicitadas sem duplicar o pedido.
- Alterações no legado atualizam automaticamente as quantidades solicitadas **quando uma sincronização é executada**. Não há varredura periódica.
- Se a nova quantidade solicitada entrar em conflito com execução/entrega já registrada, preservar os registros operacionais, marcar divergência e exigir tratamento explícito; nunca apagar histórico.
