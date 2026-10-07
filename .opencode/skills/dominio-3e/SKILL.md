---
name: dominio-3e
description: Mantém o modelo do 3E alinhado a pedidos, itens, setores, produção, ocorrências, expedição e permissões. Use ao criar ou alterar entidades, processos, relacionamentos ou cálculos. Do NOT use para detalhes de framework sem impacto no domínio.
---
# Domínio 3E

Leia `docs/decisoes.md`, `docs/requisitos.md` e `docs/regras-negocio.md`.

- Preservar a linguagem do negócio.
- Não inventar regra ausente.
- Tratar pedido/item comercial e atividade operacional como conceitos distintos.
- Setores atuais: Corte e Dobra, Telhas e Revenda.
- Usuário pode pertencer a múltiplos setores.
- Categoria vem do legado; mapeamento categoria → setor pertence ao app e é auditável.
- Perda/refugo não conta como quantidade conforme.
- Dados operacionais do app nunca são apagados por ressincronização comercial.

Retornar domínio, entidades, responsabilidades, regras afetadas, proposta e riscos.
