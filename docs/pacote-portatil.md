# Pacote portátil (Windows)

Gera uma pasta (e um `.zip`) que roda o 3E Operações no Windows **sem instalar
Node nem clonar o repositório** — ideal para levar a uma máquina da fábrica ou
entregar a um avaliador.

## O que o pacote contém

```
3e-operacoes-portatil/
  Iniciar.bat          -> inicia o sistema (dois cliques)
  config.env.example   -> modelo de configuração
  LEIA-ME.txt          -> instruções para o usuário final
  runtime\node.exe     -> runtime Node embutido
  app\                 -> aplicação (build standalone do Next.js)
```

> O pacote **não** inclui o arquivo `.env` (segredos). O usuário copia
> `config.env.example` para `config.env` e preenche os valores.

## Como gerar

```bash
# PowerShell: define a saída standalone só para o pacote portátil
$env:NEXT_OUTPUT='standalone'; npm run build
node scripts/gerar-portatil.mjs  # monta dist/3e-operacoes-portatil
# compactar (PowerShell):
Compress-Archive -Path dist\3e-operacoes-portatil\* -DestinationPath dist\3e-operacoes-portatil.zip -Force
```

## Como usar (usuário final)

1. Copiar `config.env.example` para `config.env` e preencher (banco MySQL,
   `SESSION_SECRET`, tokens de integração).
2. Dois cliques em `Iniciar.bat`.
3. O navegador abre em `http://localhost:3000`.

## Requisitos e observações

- **Banco MySQL** acessível (já migrado e populado). Para preparar:
  `npx prisma migrate deploy` e `npm run prisma:seed` (a partir do repositório).
- **Integração com o Top Gerente:** a importação depende do **conector local**
  (lê o legado). Com o conector ativo na rede, a importação funciona; sem ele,
  as demais telas continuam funcionando.
- O pacote é **por arquitetura**: gerado no Windows x64 e contém o `node.exe`
  dessa plataforma.
- Para gerar sem abrir o navegador automaticamente (ex.: em testes), defina a
  variável de ambiente `NAO_ABRIR_NAVEGADOR=1`.
