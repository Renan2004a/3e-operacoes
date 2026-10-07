# Frontend

## Papel das referências

O material em `design/inspiracoes/frontend-v4/` e `docs/referencias-visuais/` é **inspiração visual**. Não é especificação funcional e não exige migração/reuso do HTML, CSS ou JavaScript existente.

## Stack

- Next.js App Router + React + TypeScript.
- Tailwind CSS como camada de estilos.
- shadcn/ui para primitives acessíveis e consistentes quando útil; customizar a aparência para o produto.
- Zod nos contratos/entradas.

## Dispositivos

A mesma aplicação deve funcionar em:

- celular;
- tablet;
- notebook;
- computador fixo.

Adotar abordagem responsiva mobile-first sem transformar desktop em simples versão ampliada do celular.

## Princípios de chão de fábrica

- alvos de toque grandes;
- contraste forte e legibilidade;
- ações principais visíveis;
- mínimo de digitação;
- feedback claro de sucesso, erro, sincronização e processamento;
- não depender apenas de cor para comunicar status;
- confirmar operações destrutivas ou excepcionais.

## Acessibilidade

Objetivo: WCAG 2.1 AA. Validar semântica, foco visível, navegação por teclado, rótulos, contraste, mensagens de erro e tamanhos de alvo.

## Fluxo de design

Antes de implementar uma área significativa, usar `frontend-blueprint` com as referências visuais e os requisitos do fluxo. Depois da implementação, usar `web-design-guidelines`, `accessibility` e Playwright para revisão.
