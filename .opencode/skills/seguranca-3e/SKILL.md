---
name: seguranca-3e
description: Revisa segurança específica do 3E Operações e da integração com Top Gerente. Use ao mexer em autenticação, autorização, banco, segredos, entradas, logs, Cloudflare ou conector local. Do NOT use como revisão genérica quando `security-best-practices` for suficiente.
---
# Segurança 3E

Leia `docs/integracao-top-gerente.md` e `docs/perfis-permissoes.md`.

- Validar toda entrada na borda.
- Autorizar no servidor, não apenas na UI.
- SQL legado sempre parametrizado.
- Credencial do Top Gerente existe somente no conector local e deve ser `SELECT`.
- Nunca expor MySQL diretamente pelo Cloudflare Tunnel.
- Não enviar credenciais do legado ao Railway ou navegador.
- Não logar senhas, tokens ou dados pessoais desnecessários.
- Proteger callback e chamada Railway → conector com autenticação forte e rotação de segredo.
- Registrar exceções gerenciais e operações sensíveis em auditoria.

Retornar: premissas, entradas, dados sensíveis, verificações, testes e riscos restantes.
