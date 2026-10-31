# Diagramas do banco — 3E Operações

Banco: `3e_operacoes_v2` · 14 tabelas · 5 views.

| Diagrama | PNG | Fonte |
| --- | --- | --- |
| **DER** (físico: tabelas, colunas, PK/FK) | [`der-banco-pt-v2.png`](der-banco-pt-v2.png) | [`der-banco-pt-v2.mmd`](der-banco-pt-v2.mmd) |
| **MER** (conceitual: entidades e cardinalidades) | [`mer-banco-pt-v2.png`](mer-banco-pt-v2.png) | [`mer-banco-pt-v2.mmd`](mer-banco-pt-v2.mmd) |
| **Classes** (UML de persistência: atributos e multiplicidades) | [`classes-banco-pt-v2.png`](classes-banco-pt-v2.png) | [`classes-banco-pt-v2.mmd`](classes-banco-pt-v2.mmd) |

## Como regerar

```bash
node scripts/render-diagramas-banco.mjs
```

O script usa Playwright + Mermaid (CDN) e grava os PNGs nesta pasta. Precisa de internet para carregar o Mermaid no navegador.

## Observações

- O DER e o MER usam os nomes físicos das tabelas/colunas.
- O diagrama de classes usa os mesmos nomes de coluna, em `snake_case`, com `<<tabela>>` para indicar a origem.
- Os enums (`UserStatus`, `RoleCode`, `SectorCode`, `ActivityStatus`, `IntegrationJobStatus`) aparecem como `enum` nos atributos; os valores continuam em inglês para preservar a aplicação.
