# Fonte histórica - Análise de métricas

> Material original usado como base da skill `metricas-software-3e`.

---
name: analise-metricas-software
description: Use ao revisar, analisar ou refatorar código do sistema de separação de pedidos por setor (integração com o Top Gerente legado), ao avaliar complexidade, acoplamento ou coesão de classes/métodos, ou ao diagnosticar risco de instabilidade em módulos de integração. Aplica apenas as métricas relevantes para esta solução: Complexidade Ciclomática, Aninhamento, Parâmetros por Método, Índice de Manutenibilidade, Code Smells (God Class/SRP), Churn, CBO, RFC, LCOM e WMC.
---

# Análise de Métricas de Software — Sistema de Separação de Pedidos (Top Gerente)

## Objetivo

Avaliar a qualidade estrutural do código deste projeto específico usando apenas as métricas que endereçam os riscos reais descritos no Marco Problema: desmembramento de pedidos por setor, execução com registros manuais substituídos, integração somente-leitura com o Top Gerente (legado), operação offline e múltiplos perfis de usuário (operador, gerente, vendedor, expedição, admin, dev). Métricas sem relação direta com esses riscos (ex.: Pontos de Função, LOC isolado, DIT, NOC, métricas de processo de sprint) foram deliberadamente deixadas fora desta skill.

## Quando usar

- Revisão de código dos módulos de integração com o Top Gerente 
- Revisão dos módulos de desmembramento de pedido por setor, fila de atividades, registro de execução/ocorrências e cálculo de saldo
- Revisão dos módulos de gerenciamento de usuários/perfis/permissões e setores  — risco de God Class por concentrarem várias responsabilidades administrativas.
- Revisão do mecanismo de sincronização offline 
- Antes de decidir se uma classe/módulo precisa ser dividido.

## Procedimento

1. Ler o `AGENTS.md` do projeto.
2. Identificar o escopo: um método, uma classe ou um módulo (ex.: camada de integração, camada de setores, camada de usuários).
3. Calcular as métricas de produto aplicáveis (seção 1).
4. Calcular as métricas CK por classe quando o escopo for orientado a objetos (seção 2).
5. Classificar cada resultado pela tabela de referência — nunca apresentar o número cru sem classificação.
6. Cruzar métricas relacionadas antes de concluir:
   - Complexidade Ciclomática alta na lógica de desmembramento/setor → calcular o mínimo de testes unitários exigido.
   - CBO alto + RFC alto em classes que falam com o Top Gerente → risco direto de violar (integridade e segurança da integração).
   - WMC alto + LCOM alto em módulos de usuário/setor/permissão → candidato a God Class, violação do SRP.
   - Churn alto em arquivos de integração → sinal de instabilidade que RF017 pede para monitorar.
7. Listar Code Smells identificados, associando cada um à métrica que o evidencia.
8. Propor ação concreta (refatoração, extração de classe, redução de parâmetros, isolamento de acoplamento) para cada problema.
9. Apresentar o resultado no formato de saída (seção 3).

## 1. Métricas de Produto

| Métrica | O que mede | Referência | Por que importa aqui |
|---|---|---|---|
| Complexidade Ciclomática — McCabe: V(G) = P + 1 | Nº de caminhos independentes de execução | 1–10 baixo / 11–20 moderado / 21–50 elevado / >50 altíssimo risco. Define o nº mínimo de testes unitários | Regras de desmembramento por setor, cálculo de saldo/disponibilidade e disparo de alertas (RF002, RF009, RF011, RF012) concentram lógica condicional |
| Profundidade de Aninhamento | Níveis de blocos aninhados | Acima de 3 níveis → extrair função | Entregas parciais + item vinculado a múltiplos setores geram fluxos condicionais aninhados naturalmente |
| Parâmetros por Método | Nº de parâmetros na assinatura | 0–2 ideal / 3–4 moderado / ≥5 code smell | Métodos de registro de execução/ocorrência (RF004, RF005) tendem a acumular campos (quantidade, tipo, duração, observação, usuário, data) |
| Índice de Manutenibilidade (MI) | Combina LOC + Complexidade Ciclomática + Halstead | Alto = fácil manter; baixo = alerta de dívida técnica | Exigido explicitamente por RFN009 (Manutenibilidade) |
| Code Smells (God Class, duplicação, excesso de parâmetros) | Padrões que sugerem problema de design | Sempre indicar SRP como direção de correção | Módulos de usuários/perfis/setores (RF013–RF015) e integração (RF001/RF017) são os pontos de maior risco de virarem "faz-tudo" |
| Churn (frequência de mudança) | Nº de alterações no arquivo ao longo do tempo | Alto = código instável ou requisito mal definido | RF017 exige monitorar falhas de integração — arquivos de integração com churn alto são o primeiro lugar a olhar |

## 2. Métricas OO — Suíte CK (por classe)

| Métrica | Fórmula | Interpretação | Por que importa aqui |
|---|---|---|---|
| WMC (Weighted Methods per Class) | Nº de métodos da classe | Baixo = coesa; muito alto = acumulou responsabilidades (viola SRP) | Detecta classes administrativas (usuário+setor+permissão) inchadas |
| CBO (Coupling Between Objects) | Nº de classes externas das quais a classe depende | Baixo é desejável | Prioridade máxima: isolar o acoplamento com o Top Gerente (RFN005 — não alterar dados de origem; RFN007 — credenciais e operações restritas na integração) |
| RFC (Response For a Class) | RFC = m + r (métodos próprios + métodos externos chamados) | Alto = difícil testar/depurar (exige mockar muito) | Classes que orquestram consulta ao Top Gerente + criação de atividades por setor tendem a ter RFC alto — sinaliza necessidade de dividir responsabilidades para viabilizar teste |
| LCOM (Lack of Cohesion in Methods) | p (pares sem atributo comum) > q (pares com atributo comum) → LCOM = p - q; senão LCOM = 0 | Baixo = alta coesão (desejável) | Confirma se uma classe "faz-tudo" (ex.: gerenciar setor + atividade + alerta) deveria ser dividida |

Fora do escopo desta skill (não há hierarquia de herança relevante no domínio descrito): **DIT** e **NOC**.

## Regras importantes

- Nunca apontar um número sem classificá-lo na tabela de referência correspondente.
- CBO e RFC das classes que tocam o Top Gerente são prioridade de revisão sobre qualquer outra métrica — é o ponto do sistema com maior custo de erro (dado legado, somente leitura, credenciais sensíveis).
- Sempre que um Code Smell for citado, indicar a métrica que o evidencia e a ação de refatoração (em geral, aplicar o Princípio de Responsabilidade Única).
- Complexidade Ciclomática deve ser sempre traduzida em "número mínimo de testes unitários", não apenas em rótulo de risco.
- Não recomendar reescrever uma classe inteira por causa de uma métrica alta isolada; cruzar com pelo menos uma segunda métrica antes de propor refatoração grande.
- Esta skill não cobre métricas de processo (produtividade, densidade de defeitos, retrabalho) nem Pontos de Função/LOC isolado — fora do escopo de revisão de código desta solução.

## 3. Formato de saída

Retornar:
- escopo analisado (classe/método/módulo);
- métricas de produto calculadas e classificadas;
- métricas CK calculadas por classe (quando aplicável);
- Code Smells identificados e métrica que os evidencia;
- ações de refatoração recomendadas, em ordem de prioridade (integração com Top Gerente primeiro);
- riscos que permanecem mesmo após a ação recomendada.
