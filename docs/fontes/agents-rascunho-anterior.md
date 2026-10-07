# Fonte histórica - AGENTS.md anterior

> Rascunho recebido antes das decisões consolidadas. Não usar como regra vigente.

# [AGENTS.md](http://AGENTS.md) — 3E Operações (Sistema de Gestão de Produção)

Instruções para agentes de IA que trabalham neste projeto. Leia este arquivo inteiro antes de qualquer alteração.

> **Status: rascunho para revisão do time.** Reúne o que está nos documentos da pasta e as decisões já conversadas. O que ainda não foi decidido está marcado como “em aberto” ou “a confirmar” e listado na seção 10. As perguntas para o time estão em `Perguntas para o time.docx`.

## 1. Visão do projeto

Sistema de acompanhamento de pedidos, produção e expedição da **3E Ferro e Aço** (São Sebastião do Paraíso-MG), desenvolvido na disciplina NCT027 (Práticas Profissionais em Eng. de Software), 2026.

- O sistema é uma **camada de controle operacional sobre o Top Gerente** (sistema legado). **Não substitui o Top Gerente.**
- O Top Gerente é a fonte oficial dos dados comerciais (pedidos, clientes, produtos). O acesso a ele é **somente leitura**.
- O problema central: um pedido precisa ser desmembrado por setor, e hoje o acompanhamento é feito em papel. Faltam rastreio de execução, perdas, entregas parciais, atrasos e saldo.
- Contexto de uso: cerca de 7 operadores simultâneos.

## 2. Documentos de referência (pasta raiz)

| Arquivo Conteúdo                                  |                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Marco Problema - Tópicos Software.pdf`           | Contexto, ecossistema, personas, cenários, HU01–HU06, RF001–RF018, RFN001–RFN009                   |
| `Requisitos - 3E Ferro e Aço.pdf`                 | HU, RF e RFN (mesmo conteúdo do Marco Problema, sem a contextualização)                            |
| `Regras de Negócio - 3E Ferro e Aço.pdf`          | RN001–RN005 (transversais), RN010–RN013 (Corte/Dobra), RN020–RN023 (Telhas), RN030–RN033 (Revenda) |
| `Estudo_revisado_e_atualizado_de_personas...pdf`  | Personas e o conceito de “item operacional”                                                        |
| `Estudo_das_unidades_de_medida.pdf`               | Unidades UN, KG, L, M, CX e suas regras de casas decimais                                          |
| `Entrevista1.docx`                                | Entrevista com o cliente (processo atual, limites da integração)                                   |
| `3E Ferro e Aço - Software.pdf`                   | Telas do protótipo                                                                                 |
| `produtos listados.csv`                           | Extrato do Top Gerente (\~278 mil linhas: OS, cliente, produto, quantidade, valor)                 |
| `3e-operacoes-frontend/3e-operacoes-frontend-v4/` | Protótipo visual em andamento, ainda não finalizado (HTML/CSS/JS puro + Vite)                      |

Em caso de conflito entre documentos, **pergunte à equipe**. Não decida sozinho.

## 3. Skills obrigatórias

As skills ficam na raiz, em `SKILL.md - <nome>.md` (e `SKILL.MD - Medição e Análise.md`). **Leia a skill correspondente antes de executar a tarefa** e siga o “Formato de saída” dela.

| Quando… Use a skill                                                                                                         |                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Criar, revisar ou preparar commits                                                                                          | `Cloudflare TunnelSKILL.md - Commits Convencionais.md`                    |
| Mexer em autenticação, autorização, banco, segredos, entradas de usuário, logs de auditoria ou integração com o Top Gerente | `SKILL.md - Boas Práticas de Segurança.md`                                |
| Implementar ou alterar regras de negócio, cálculos, validações, permissões, sincronização                                   | `SKILL.md - Desenvolvimento Orientado a Testes.md`                        |
| Planejar ou revisar qualquer coisa que toque o Top Gerente, seu banco ou a integração                                       | `SKILL.md - Planejamento da Integração com Sistema Legado.md`             |
| Analisar ou alterar entidades, processos, responsabilidades e limites entre contextos                                       | `SKILL.md - Análise de Domínio.md`                                        |
| Implementar funcionalidade a partir de HU, RF, RN ou RFN                                                                    | `SKILL.md - Desenvolvimento Orientado a Especificações.md`                |
| Revisar/refatorar código, avaliar complexidade, acoplamento ou coesão                                                       | `SKILL.MD - Medição e Análise.md`                                         |
| Escrever testes, corrigir bugs, refatorar ou dar manutenção                                                                 | `agents.txt` (diretrizes de V&V, TDD e manutenção; **tratar como skill**) |

Uma tarefa costuma exigir mais de uma skill. Exemplo: “registrar entrega parcial” usa Especificações + TDD + Domínio + Commits.

## 4. Regras de negócio essenciais (resumo; a fonte é o PDF de Regras de Negócio)

**Item operacional:** solicitado → executado → entregue. Cada setor especializa o que significa “executado”:

| Setor “Executado” Unidade Casas decimais  |                                                                 |         |                        |
| ----------------------------------------- | --------------------------------------------------------------- | ------- | ---------------------- |
| Corte e Dobra                             | peças produzidas                                                | peça    | inteiro (RN010)        |
| Telhas                                    | metros produzidos                                               | metro   | 2 casas (RN020, RN022) |
| Revenda                                   | itens separados (a UI diz “separado”, nunca “produzido”, RN030) | unidade | inteiro                |

**Setores.** A empresa tem **15 setores produtivos, agrupados em 4 grupos**. No sistema, o “setor” que recebe atividades, aparece nas filas e nos indicadores é o **grupo (4 setores no total)**. Os documentos e as regras de negócio só descrevem 3 deles (Corte e Dobra, Telhas e Revenda). O **4º setor e a relação entre os 15 setores originais e os 4 grupos ainda não estão documentados**; não invente nomes, regras ou o mapeamento de produto para setor (RF002). Enquanto isso não for definido, modele o setor como dado configurável (RF015) e não fixe os 3 nomes no código. Para um setor sem regra específica, aplique apenas as regras transversais (RN001 a RN005) e sinalize a lacuna.

Fórmulas:

- **Pendente (geral, RN001):** solicitado − executado. Se executado > solicitado, sinalizar divergência (RF011), nunca saldo negativo.
- **Pendente em Corte/Dobra (RN011):** solicitado − produzido − perdido. *Em aberto:* confirmar se a peça perdida deve ser refeita automaticamente.
- **Pendente em Telhas (RN021):** solicitado − produzido − refugado.
- **Pendente em Revenda (RN031):** solicitado − separado − indisponível.
- **Disponível (RN002):** executado − entregue. O pendente nunca entra nesse cálculo.

Restrições:

- **RN003:** toda quantidade respeita a unidade do item; nunca misturar unidades.
- **RN004:** entregue < executado → “parcialmente entregue”; entregue = executado → “concluído”.
- **RN005:** bloquear entrega acima do disponível. Só o gerente pode confirmar exceção manualmente.
- **RN012 / RN023 / RN032:** perda (Corte/Dobra), refugo (Telhas, quando informado) e indisponibilidade (Revenda) **exigem motivo**. Indisponibilidade é falta de estoque, não perda. *Em aberto:* a lista fechada de motivos ainda não existe, e não deve ser texto livre.
- **RN013:** peça perdida nunca vira “produzida”. O retrabalho é um novo registro de produção, sem vínculo de substituição.
- **RN033:** separação em Revenda não baixa insumo de produção.

Não invente regras de negócio sem justificativa documentada.

## 5. Integração com o Top Gerente

- **Somente leitura.** Nunca escrever, alterar ou apagar registros do Top Gerente (RFN005, RFN007).
- O navegador **nunca** acessa o banco do Top Gerente. Fluxo: Front-end → API/backend → módulo de integração → Top Gerente.
- Credenciais da integração são específicas e restritas, ficam em variáveis de ambiente (`.env` ignorado pelo Git) e **nunca** vão para o código, logs ou frontend.
- Falhas de conexão, consulta ou dados são registradas com tipo, data e hora e exibidas ao responsável técnico (RF017). Registro inconsistente é rejeitado e logado, não importado.
- Tentativas de operação não autorizada na integração são rejeitadas e registradas.
- O cliente autorizou um **dump** do banco para desenvolvimento. Prefira o dump a acesso remoto ao banco de produção.
- O Top Gerente usa **MySQL**. O novo sistema também usa MySQL, mas são **dois bancos independentes**, com conexões e credenciais separadas. A conexão do Top Gerente usa um usuário só com `SELECT`; nunca reaproveite a conexão ou o usuário do banco do novo sistema. No código, mantenha duas configurações de conexão nomeadas de forma inequívoca (ex.: `topgerente` e `app`).
- Dado importado nunca sobrescreve o legado. Dados exclusivos do novo sistema (atividades, execução, ocorrências, entregas, usuários) ficam no banco próprio.

## 6. Stack e infraestrutura

Decisões da equipe e o que ainda está em aberto:

| Item Situação         |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | **Next.js** (decidido). Fullstack: frontend em React e API via Route Handlers (`app/api`). Definir com a equipe se será App Router (padrão atual) e se usará TypeScript (recomendado).                                                                                                                                                                                                                                             |
| Arquitetura           | **Monolito modular por domínio** (decidido)                                                                                                                                                                                                                                                                                                                                                                                        |
| Banco do novo sistema | **MySQL** (em discussão). É um banco separado do banco do Top Gerente, que também é MySQL.                                                                                                                                                                                                                                                                                                                                         |
| Hospedagem            | AWS ou Vercel (em decisão). Com Next.js a Vercel é viável para a interface e a API, mas é serverless: há limite de tempo por requisição e cada função abre sua própria conexão com o MySQL (exige pool/proxy). A sincronização com o Top Gerente (RF001) precisa de um job agendado ou de um processo separado. Se a integração exigir processo contínuo, considerar AWS (ex.: EC2/Lightsail + RDS) ou Vercel só para a interface. |
| Túnel                 | ngrok ou Cloudflare Tunnel (a avaliar). Preferir Cloudflare Tunnel. Nunca expor a porta do banco do cliente sem proteção (ex.: Cloudflare Access + usuário só com `SELECT`).                                                                                                                                                                                                                                                       |
| Versionamento         | **Git** (decidido). A pasta do projeto ainda não é um repositório.                                                                                                                                                                                                                                                                                                                                                                 |
| Gestão de tarefas     | Linear com visão Kanban (proposto)                                                                                                                                                                                                                                                                                                                                                                                                 |
| Frontend atual        | Protótipo em HTML/CSS/JS puro + Vite. Será migrado para Next.js/React. Reaproveitar o design (`styles.css`, layout de shell, sidebar e cards) e converter as páginas em componentes. Até a migração, não acoplar o protótipo a framework.                                                                                                                                                                                          |
| Offline (RFN008)      | Requer armazenamento local (PWA / service worker / IndexedDB) e sincronização sem duplicar registros. Decidir antes de fechar o framework do frontend.                                                                                                                                                                                                                                                                             |

Estrutura-alvo do backend (organizada por domínio, não por persona; as pastas por perfil do protótipo são só conveniência de UI):

```
src/
  modules/
    auth/  pedidos/  producao/  expedicao/  ocorrencias/
    usuarios/  integracao/  indicadores/
  shared/

```

Cada módulo concentra suas regras, serviços, acesso a dados e interface HTTP. Evite dependências desnecessárias entre módulos.

Com Next.js, mantenha o monolito modular assim:

- `app/` guarda só rotas, páginas e Route Handlers, finos, que apenas validam a entrada e chamam o módulo.
- Toda regra de negócio (saldos, disponibilidade, validação de entrega) fica em `src/modules/<domínio>/`, sem importar nada de `next`. Isso permite testar as regras direto, sem infraestrutura (skill de TDD e `agents.txt`).
- O código do módulo `integracao` roda só no servidor. Nunca importe módulos de integração em componentes de cliente (`"use client"`), para que credenciais e acesso ao Top Gerente nunca cheguem ao navegador.
- Autorização por perfil é verificada no servidor em cada Route Handler/Server Action, não só escondendo itens do menu.

## 7. Perfis de usuário

Operador de Linha de Produção, Gerente de Produção (Everton), Vendedor (predominantemente consulta), Expedição, Responsável pelo Sistema (evitar o termo “Administrador”) e Desenvolvedor/Responsável Técnico.

- Cada perfil só vê e executa o que lhe cabe (RFN004, RF014). O operador vê apenas as atividades do **seu setor** (RF003).
- O seletor de perfil do login do protótipo é só demonstração. Na aplicação real, o perfil vem da autenticação.
- Entrevista: os operadores alteram o status das ordens e itens.
- Segundo a entrevista, a administração da solução ficará com a UFLA (a confirmar).

## 8. Requisitos não funcionais que guiam o código

- **Agilidade e usabilidade (RFN001, RFN002):** operações de chão de fábrica com o mínimo de cliques e digitação.
- **Desempenho (RFN003):** operações principais em menos de 2 s. Indicar “processando” e evitar requisições duplicadas.
- **Rastreabilidade (RFN006, RF016):** registrar usuário, operação, data/hora e, quando possível, valor anterior e posterior.
- **Manutenibilidade (RFN009):** logs estruturados e diagnóstico. Falhas críticas geram alerta.
- **Offline (RFN008):** registro local, sincronização depois e conflito preservado com sinalização.

## 9. Convenções de trabalho

- **Idioma:** documentação, mensagens de UI, commits e comentários em **português do Brasil**. Use a terminologia do projeto (pedido, atividade, execução, disponibilidade, entrega, pendência).
- **Commits:** seguem a skill de Commits Convencionais (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`). Um commit por alteração lógica.
- **Testes:** TDD (Red-Green-Refactor) para regras de negócio. Princípios FIRST. Pirâmide 70% unidade / 20% integração / 10% E2E. Cobertura mínima de 70–80% (C0), com C1 nos limites. Sem `if`/laços dentro de testes. Mocks só para dependências externas, **nunca para o banco de testes**.
- **Testes prioritários:** quantidades, saldo pendente e disponível, entregas parciais, unidades de medida, perdas, permissões, sincronização offline e integração com o Top Gerente.
- **Manutenção:** ler antes de escrever, achar a causa raiz (sem gambiarra), evitar superengenharia (YAGNI), preservar retrocompatibilidade e usar testes de caracterização em código legado.
- **Segurança:** SQL sempre parametrizado, entradas validadas, menor privilégio, senhas/tokens/segredos nunca em log.
- **Uso de IA:** valide sempre que a alteração atende aos requisitos e não causa regressão em módulos dependentes.
- **Mudança mínima:** faça a menor alteração necessária. Não refatore fora do escopo pedido.

## 10. Pontos em aberto (perguntar antes de assumir)

1. TypeScript ou JavaScript puro no Next.js? (recomendado: TypeScript). Qual ORM/acesso ao MySQL (ex.: Prisma, Drizzle)?
2. Quais são os **4 setores (grupos)** e quais dos 15 setores originais entram em cada um? Qual é o 4º setor, e quais regras de “executado”, unidade e perda ele segue?
3. Lista fechada de motivos de perda, refugo e indisponibilidade (levantar com o gerente de produção).
4. RN011: a peça perdida é refeita automaticamente (o pendente não desconta a perda)?
5. Como o produto do Top Gerente é associado a um setor (RF002)? Por código, por categoria ou por cadastro manual?
6. Hospedagem (AWS ou Vercel) e o uso de túnel.
7. Quem altera o status: os operadores (entrevista) ou também o gerente (exceções do RF004/RN005)?
8. Data de entrega: muitos pedidos não têm data definida (entrevista). Como calcular “atrasado” (RF012)?
9. Inconsistência de documentação: a descrição do RFN001 (Usabilidade) repete a do RF018 (Impressão de ordem de produção) e precisa ser corrigida.
10. A sincronização com o Top Gerente será por dump periódico, consulta direta ou outro meio? O cliente autorizou acesso remoto ao banco ou só o dump?
11. O vendedor só consulta, ou também pode alterar algo?
12. A ferramenta de gestão de tarefas é mesmo o Linear?
13. A UFLA administra a solução depois da entrega?
14. O `AGENTS.md` deve listar os nomes da equipe?

## 11. Estado atual do repositório

- Só existe o protótipo visual (`3e-operacoes-frontend-v4`), e ele **ainda não está pronto**: está em evolução e pode mudar (inclusive o número de setores, que hoje mostra só 3). **Não há backend, banco ou integração real.**
- Não trate o protótipo como especificação. Em caso de divergência, valem os documentos de requisitos e regras de negócio.
- Os dados das telas são fictícios.
- Não há testes nem repositório Git iniciados.
- `produtos listados.csv` tem problemas de codificação (`DobradiÃ§a`) e cerca de 16 mil linhas com descrição `.`. Trate isso ao importar.
