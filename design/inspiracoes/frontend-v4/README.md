# 3E Operações — Front-end V4

Protótipo visual evolutivo da solução da 3E Ferro e Aço.

## Escopo desta entrega

Esta versão contém somente a camada visual e interações demonstrativas:

- HTML semântico;
- CSS compartilhado e responsivo;
- JavaScript simples para navegação do login demonstrativo, filtros, modais, mensagens e confirmações;
- páginas separadas por perfil de uso para facilitar validação com os usuários.

Não há backend, banco MySQL ou integração real com o Top Gerente nesta versão.

## Arquitetura futura

A arquitetura definida para a aplicação é **monolítica modular por domínio**.

Isso significa que, quando o backend for iniciado, a organização principal deverá ser por domínios de negócio, por exemplo:

- auth/acesso;
- pedidos;
- produção;
- expedição;
- ocorrências;
- usuários e permissões;
- integração;
- indicadores.

As pastas de páginas por persona existentes neste protótipo são uma conveniência de interface/validação e **não representam os módulos de domínio do backend**.

## Backend futuro

A equipe indicou JavaScript para o backend e está discutindo um framework que foi anotado como “Net.js”. Antes da implementação, o nome/tecnologia deve ser confirmado. O front-end não foi acoplado a framework de backend.

MySQL também está em discussão. O navegador não deverá acessar diretamente o SQL do Top Gerente. O fluxo esperado é:

Front-end -> API/backend -> módulo de integração -> Top Gerente

## Infraestrutura em discussão

AWS ou Vercel, túnel para desenvolvimento e Git foram citados como possibilidades, mas não foram acoplados ao protótipo porque ainda estão em decisão.

## Executar

Opção simples: abra `index.html` com uma extensão de servidor local no VS Code.

Ou, com Node.js:

```bash
npm install
npm run dev
```

## Observação sobre login

O seletor de perfil no login existe apenas para navegar e validar as seis experiências do protótipo. Na aplicação real, perfil e permissões deverão vir da autenticação/autorização.

## AGENTS.md

Não criado nesta etapa, conforme solicitado.
