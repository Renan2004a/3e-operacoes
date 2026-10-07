# Arquitetura

## Visão

Aplicação web fullstack em Next.js/TypeScript hospedada no Railway, organizada como monolito modular. O Top Gerente não é substituído e não é acessado pelo navegador.

```text
Usuário
  |
  v
Next.js no Railway
  |-- UI / Route Handlers
  |-- src/modules/* (domínio)
  |-- Prisma -> MySQL próprio do app
  |
  +-- HTTPS autenticado --> Cloudflare Access/Tunnel --> Conector local 3E
                                                        |
                                                        +--> MySQL Top Gerente (SELECT only)
                                                        |
                                                        +--> callback HTTPS normalizado --> Railway API
```

## Limites

- `src/app/`: páginas, Route Handlers e composição de interface; camada fina.
- `src/modules/`: casos de uso, entidades e regras; não importar `next`.
- `src/shared/`: infraestrutura compartilhada, banco do app, validação, tempo e utilitários.
- `connector-local/`: processo separado na rede da empresa; conhece o schema legado e executa SQL somente leitura.
- `prisma/`: somente schema do banco próprio.

## Domínios iniciais

- `auth`
- `pedidos`
- `setores`
- `producao`
- `ocorrencias`
- `expedicao`
- `usuarios`
- `integracao`
- `indicadores`

## Princípios

- Regras de negócio puras e testáveis.
- Dependências apontam para dentro do domínio; infraestrutura implementa portas/adapters.
- Nenhuma credencial do legado em Client Components.
- Nenhuma escrita no Top Gerente.
- Jobs de integração idempotentes e auditáveis.
- Mudança comercial importada nunca apaga histórico operacional.
