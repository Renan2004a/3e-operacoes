# Estratégia de testes

## Stack

- Vitest: regras e serviços.
- Testing Library: componentes e interação.
- Playwright: fluxos E2E.

## Prioridade

Cobrir primeiro:

- saldo pendente;
- disponibilidade para entrega;
- entregas parciais e exceção acima do disponível;
- perda/refugo sem reduzir a obrigação de produzir quantidade conforme;
- unidades e casas decimais;
- usuário em múltiplos setores;
- permissões por perfil;
- prazo opcional e atraso;
- idempotência de sincronização;
- atualização de quantidade solicitada sem apagar histórico operacional;
- falhas de integração e retries.

## Cobertura

Meta de 80% para módulos críticos de domínio. Não adicionar testes sem valor apenas para aumentar percentual. Critérios de aceitação e caminhos de decisão têm prioridade sobre cobertura bruta.

## CI

Cada PR deve executar pelo menos:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

E2E pode ser executado em job separado conforme ambiente disponível.
