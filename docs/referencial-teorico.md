# Referencial teórico — 3E Operações

Documento que fundamenta **o que foi feito** e **como foi feito** no projeto 3E
Operações, relacionando cada decisão de engenharia e de domínio a literatura
reconhecida (normas, artigos e livros). O objetivo é dar base acadêmica ao
trabalho e permitir que um avaliador confira a origem de cada prática.

> **Nota de integridade das fontes.** As referências abaixo são obras reais e
> amplamente citadas. As que possuem _link_ foram verificadas nas páginas
> oficiais (W3C, IETF, OWASP, ISO via catálogo, Fowler, NN/g,
> conventionalcommits.org) no momento da elaboração. Para uso formal
> (TCC/artigo), recomenda-se **conferir edição/ano** de cada livro na
> biblioteca antes de citar. Nenhuma referência foi inventada.

---

## 1. Como ler este documento

Cada seção tem a mesma estrutura:

1. **Prática adotada** no 3E Operações;
2. **Fundamentação** (por que é considerada boa prática);
3. **Referências** que sustentam a prática.

A seção 11 traz a **matriz de rastreabilidade** (decisão → prática → referência).

---

## 2. Engenharia de requisitos e especificação

**Prática adotada.** Cada funcionalidade nasce de uma especificação com critérios
de aceitação testáveis, escritos em notação **EARS** (*Easy Approach to
Requirements Syntax*: "Quando… o sistema deve…"), com rastreabilidade
requisito → tarefa → teste → evidência. As decisões são registradas (ADRs) em
`.specs/STATE.md` e `docs/decisoes.md`.

**Fundamentação.** A literatura de Engenharia de Requisitos mostra que
requisitos ambíguos e não testáveis são a principal causa de retrabalho, e que
notações estruturadas (como EARS) reduzem ambiguidade em sistemas com muitos
fluxos condicionais — exatamente o caso de operações de fábrica (setores,
prazos, exceções).

**Referências.**

- MAVIN, A.; WILKINSON, P.; HARWOOD, A.; NOVAK, M. **Easy Approach to
  Requirements Syntax (EARS)**. In: *17th IEEE International Requirements
  Engineering Conference (RE)*, 2009.
- ISO/IEC/IEEE **29148:2018** — *Systems and software engineering — Life cycle
  processes — Requirements engineering*.
- SOMMERVILLE, I. **Engenharia de Software**. 10. ed. Pearson, 2018.
- PRESSMAN, R. S.; MAXIM, B. R. **Engenharia de Software: uma abordagem
  profissional**. 9. ed. McGraw-Hill, 2021.

---

## 3. Processo de desenvolvimento (spec-driven, iterativo e incremental)

**Prática adotada.** Fluxo *spec → design → tarefas → execução → verificação*,
com **verificador independente** (autor ≠ verificador), tarefas atômicas e
_commits_ atômicos por tarefa; 15 incrementos entregues e verificados.

**Fundamentação.** Métodos iterativos e incrementais reduzem risco ao entregar
valor em fatias pequenas e verificáveis; a separação entre quem produz e quem
verifica é um princípio clássico de garantia da qualidade (verificação e
validação). Estudos empíricos (DORA/*Accelerate*) correlacionam entregas
pequenas e frequentes com melhor desempenho de entrega e qualidade.

**Referências.**

- BECK, K. **Extreme Programming Explained: Embrace Change**. Addison-Wesley,
  2000.
- FORSGREN, N.; HUMBLE, J.; KIM, G. **Accelerate: The Science of Lean Software
  and DevOps**. IT Revolution, 2018.
- SOMMERVILLE, I. **Engenharia de Software**. 10. ed. Pearson, 2018.

---

## 4. Testes e TDD

**Prática adotada.** Desenvolvimento guiado por testes nos comportamentos
críticos (saldo, disponibilidade, perdas/refugos, permissões, prazos, entregas,
sincronização); testes de unidade com **fakes** no lugar do banco; testes de
ponta a ponta (E2E) com Playwright; meta de cobertura nos módulos críticos.

**Fundamentação.** TDD e a automação de testes aumentam a confiança para
refatorar e reduzem defeitos; testes servem como especificação executável dos
requisitos. O uso de dublês (fakes/stubs) mantém os testes rápidos e
determinísticos.

**Referências.**

- BECK, K. **Test-Driven Development: By Example**. Addison-Wesley, 2002.
- FOWLER, M. **Mocks Aren't Stubs** (artigo). martinfowler.com, 2007.
- FENTON, N.; BIEMAN, J. **Software Metrics: A Rigorous and Practical
  Approach**. 3. ed. CRC Press, 2014.

---

## 5. Arquitetura: domínio isolado e portas/adaptadores

**Prática adotada.** O **domínio** (regras de negócio) é independente do
framework e do banco; a infraestrutura conversa com o domínio por **portas e
adaptadores**; há um adaptador real (Prisma) e um *fake* para testes (AD-002). A
organização por módulos de domínio (`src/modules/…`) segue alta coesão e baixo
acoplamento. Os _patterns_ de projeto (Strategy, Repository, Adapter etc.) são
usados onde reduzem acoplamento.

**Fundamentação.** Desde Parnas (1972), sabe-se que **ocultar informação** e
separar responsabilidades é o que torna sistemas evolutivos. DDD orienta a
modelar o domínio com linguagem do negócio; *Hexagonal/Clean Architecture*
separam o núcleo das tecnologias; os _Design Patterns_ catalogam soluções
recorrentes; PoEAA documenta padrões de acesso a dados (Repository, DTO).

**Referências.**

- PARNAS, D. L. **On the Criteria To Be Used in Decomposing Systems into
  Modules**. *Communications of the ACM*, v. 15, n. 12, p. 1053–1058, 1972.
- EVANS, E. **Domain-Driven Design: Tackling Complexity in the Heart of
  Software**. Addison-Wesley, 2003.
- VERNON, V. **Implementing Domain-Driven Design**. Addison-Wesley, 2013.
- COCKBURN, A. **Hexagonal Architecture (Ports and Adapters)**. 2005.
- MARTIN, R. C. **Clean Architecture: A Craftsman's Guide to Software Structure
  and Design**. Prentice Hall, 2017.
- FOWLER, M. **Patterns of Enterprise Application Architecture**.
  Addison-Wesley, 2002.
- GAMMA, E.; HELM, R.; JOHNSON, R.; VLISSIDES, J. **Design Patterns: Elements of
  Reusable Object-Oriented Software**. Addison-Wesley, 1994.
- BASS, L.; CLEMENTS, P.; KAZMAN, R. **Software Architecture in Practice**.
  4. ed. Addison-Wesley, 2021.

---

## 6. Integração com o sistema legado (Top Gerente)

**Prática adotada.** O Top Gerente (legado) é lido **somente leitura** por um
**conector local**, sem escrita e sem *polling*; a importação é sob demanda, por
número de pedido, via **job assíncrono idempotente**, com _callback_ autenticado
e **retry com backoff**. Repetir a importação não duplica dados.

**Fundamentação.** Modernização de legados raramente funciona por substituição
total; a abordagem incremental **Strangler Fig** (Fowler) isola o legado e
permite coexistência. Feathers (2004) descreve como trabalhar com segurança
sobre sistemas legados. Para integração assíncrona e confiável, o padrão
**Idempotent Receiver** e o tratamento de falhas/reenvio são a base. ISA-95/IEC
62264 formaliza a integração entre o nível de **gestão** (ERP/comercial) e o
nível de **operações de manufatura (MES)** — o papel do 3E Operações.

**Referências.**

- FOWLER, M. **Strangler Fig** (artigo; original de 2004). martinfowler.com.
  <https://martinfowler.com/bliki/StranglerFigApplication.html>
- FEATHERS, M. **Working Effectively with Legacy Code**. Prentice Hall, 2004.
- HOHPE, G.; WOOLF, B. **Enterprise Integration Patterns: Designing, Building,
  and Deploying Messaging Solutions**. Addison-Wesley, 2003.
- FIELDING, R. T. **Architectural Styles and the Design of Network-based
  Software Architectures**. Tese (Doutorado) — University of California, Irvine,
  2000.
- ANSI/ISA **95.00.03** / IEC **62264-3** — *Enterprise-Control System
  Integration — Activity Models of Manufacturing Operations Management* (MES).

---

## 7. Domínio de manufatura: produção, saldo e PCP

**Prática adotada.** O saldo segue o modelo de **Planejamento e Controle da
Produção (PCP)**: `pendente = solicitado − executado` e
`disponível = executado − entregue` (análogo ao conceito de
*available-to-promise*); **perda/refugo não abatem a obrigação** de produzir a
quantidade solicitada; prazos por item/setor; indicadores de produção por setor
e cumprimento de prazo.

**Fundamentação.** A literatura de PCP/Administração da Produção define esses
conceitos (quantidade planejada x produzida, *available-to-promise*, refugo e
retrabalho, controle de chão de fábrica) e a separação entre o nível de
planejamento e o de execução. ISA-95 situa o controle de produção no nível de
operações de manufatura.

**Referências.**

- VOLLMANN, T. E.; BERRY, W. L.; WHYBARK, D. C.; JACOBS, F. R. **Manufacturing
  Planning and Control for Supply Chain Management**. 5. ed. McGraw-Hill, 2005.
- CORRÊA, H. L.; CORRÊA, C. A. **Administração de Produção e Operações**.
  2. ed. Atlas, 2012.
- LUSTOSA, L. J.; MESQUITA, M. A.; QUELHAS, O. L. G.; OLIVEIRA, R. J.
  **Planejamento e Controle da Produção**. Elsevier/Campus, 2008.
- SLACK, N.; BRANDON-JONES, A.; JOHNSTON, R. **Administração da Produção**.
  Atlas, 2018.
- ANSI/ISA **95** / IEC **62264** — *Enterprise-Control System Integration*.

---

## 8. Interface, usabilidade e acessibilidade (chão de fábrica e multi-dispositivo)

**Prática adotada.** Interface responsiva (celular, tablet, notebook, desktop);
foco em usabilidade no ambiente de fábrica; alvo **WCAG 2.1 AA** (contraste,
foco visível, rótulos, mensagens de status, tamanho de alvo); mensagens de erro
claras; evita expor identificadores técnicos ao usuário.

**Fundamentação.** WCAG 2.1 é a norma de referência para acessibilidade web.
ISO 9241-210 orienta **design centrado no humano** e ISO 9241-110 define
princípios de interação (autodescrição, conformidade com expectativas,
tolerância a erros). As **10 heurísticas de Nielsen** são a base clássica de
avaliação de usabilidade. No Brasil, a **NR-17 (Ergonomia)** é referência para
condições de trabalho, relevante para telas de uso contínuo na fábrica.

**Referências.**

- W3C. **Web Content Accessibility Guidelines (WCAG) 2.1**. W3C Recommendation,
  2018 (com errata/versão revisada em 2025).
  <https://www.w3.org/TR/WCAG21/>
- ISO **9241-210:2019** — *Ergonomics of human-system interaction — Part 210:
  Human-centred design for interactive systems*.
- ISO **9241-110:2020** — *Ergonomics of human-system interaction — Part 110:
  Interaction principles*.
- NIELSEN, J. **Heuristic Evaluation**. In: NIELSEN, J.; MACK, R. L. (Eds.)
  *Usability Inspection Methods*. John Wiley & Sons, 1994. (e NIELSEN, J. **10
  Usability Heuristics for User Interface Design**, NN/g.)
- BRASIL. **NR-17 — Ergonomia**. Ministério do Trabalho e Emprego.

---

## 9. Segurança

**Prática adotada.** Sessão em **cookie httpOnly assinado (HMAC)**; senha com
**scrypt**; **matriz de permissões no servidor** (o cliente não decide o que pode);
rotas de integração com **token**; sem escrita no legado; princípio do menor
privilégio (usuário somente leitura no Top Gerente).

**Fundamentação.** OWASP ASVS é o padrão de verificação de segurança de
aplicações web (autenticação, controle de acesso, sessão, criptografia); o OWASP
Top 10 destaca *Broken Access Control* e falhas de autenticação como riscos
principais. O **scrypt** é um KDF com função *memory-hard* (RFC 7914), indicado
para armazenar senhas de forma resistente a ataque por hardware dedicado.

**Referências.**

- OWASP. **Application Security Verification Standard (ASVS)**, v5.0.0.
  <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP. **Top 10:2021 — The Ten Most Critical Web Application Security Risks**.
- PERCIVAL, C.; JOSEFSSON, S. **The scrypt Password-Based Key Derivation
  Function**. IETF RFC 7914, 2016. <https://www.rfc-editor.org/rfc/rfc7914>
- PERCIVAL, C. **Stronger Key Derivation via Sequential Memory-Hard Functions**.
  BSDCan'09, 2009.

---

## 10. Qualidade de software, métricas e entrega contínua

**Prática adotada.** Modelo de qualidade com foco em manutenibilidade,
confiabilidade e portabilidade; **métricas** de complexidade e coesão/acoplamento
nos pontos de risco; cobertura de testes; **CI** (lint, tipos, testes, build);
**Conventional Commits** e versionamento semântico; documentação como parte da
entrega.

**Fundamentação.** ISO/IEC 25010 (SQuaRE) define o modelo de qualidade de
produto (adequação funcional, confiabilidade, usabilidade, eficiência de
desempenho, manutenibilidade, portabilidade, compatibilidade, segurança).
Fenton & Bieman tratam métricas com rigor; McCabe (complexidade ciclomática) e
Chidamber & Kemerer (métricas OO) são referências clássicas para avaliar
complexidade e acoplamento. Humble & Farley fundamentam a entrega contínua.

**Referências.**

- ISO/IEC **25010:2011** (SQuaRE) — *Systems and software Quality Requirements
  and Evaluation — System and software quality models*.
- FENTON, N.; BIEMAN, J. **Software Metrics: A Rigorous and Practical
  Approach**. 3. ed. CRC Press, 2014.
- McCABE, T. J. **A Complexity Measure**. *IEEE Transactions on Software
  Engineering*, v. SE-2, n. 4, p. 308–320, 1976.
- CHIDAMBER, S. R.; KEMERER, C. F. **A Metrics Suite for Object Oriented
  Design**. *IEEE Transactions on Software Engineering*, v. 20, n. 6,
  p. 476–493, 1994.
- HUMBLE, J.; FARLEY, D. **Continuous Delivery: Reliable Software Releases
  through Build, Test, and Deployment Automation**. Addison-Wesley, 2010.
- **Conventional Commits 1.0.0** (especificação).
  <https://www.conventionalcommits.org/en/v1.0.0/>
- PRESTON-WERNER, T. **Semantic Versioning 2.0.0**. 2010.

---

## 11. Matriz de rastreabilidade (decisão → prática → referência)

| Decisão / prática do 3E Operações | Fundamento | Referência principal |
| --- | --- | --- |
| Critérios de aceitação testáveis (EARS) e rastreabilidade | Reduz ambiguidade e retrabalho | Mavin et al. (2009); ISO/IEC/IEEE 29148 |
| Fluxo spec-driven com verificador independente | Incremental, verificação ≠ autoria | Beck (2000); Forsgren et al. (2018); Sommerville |
| TDD nos comportamentos críticos; fakes no lugar do banco | Especificação executável; testes rápidos | Beck (2002); Fowler (2007) |
| Domínio isolado + portas/adaptadores (AD-002) | Ocultar informação; baixo acoplamento | Parnas (1972); Cockburn (2005); Martin (2017) |
| Módulos de domínio com linguagem do negócio | Modelar o domínio | Evans (2003); Vernon (2013) |
| Padrões Repository/DTO/Strategy | Soluções recorrentes catalogadas | Fowler (2002); Gamma et al. (1994) |
| Legado somente leitura + conector local (AD-001) | Modernização incremental | Fowler (Strangler Fig); Feathers (2004) |
| Importação assíncrona idempotente + retry/backoff | Integração confiável | Hohpe & Woolf (2003); Fielding (2000) |
| Papel do sistema como camada de operações | Integração gestão ↔ manufatura | ISA-95 / IEC 62264 |
| `pendente = solicitado − executado`; `disponível = executado − entregue` | Conceitos de PCP / *available-to-promise* | Vollmann et al. (2005); Corrêa & Corrêa (2012) |
| Perda/refugo não abatem a obrigação | Controle de produção/qualidade | Vollmann et al. (2005); Lustosa et al. (2008) |
| Interface responsiva e acessível (WCAG 2.1 AA) | Acessibilidade e usabilidade | W3C (2018); ISO 9241-210 |
| Mensagens de erro claras; não expor IDs técnicos | Heurísticas de usabilidade | Nielsen (1994) |
| Uso no chão de fábrica (ergonomia) | Condições de trabalho | NR-17 |
| Sessão httpOnly + scrypt + matriz de permissões no servidor | Segurança de aplicação | OWASP ASVS 5.0.0; RFC 7914 |
| Menor privilégio no legado (usuário somente leitura) | Controle de acesso | OWASP Top 10:2021 |
| Métricas de complexidade/acoplamento e cobertura | Qualidade mensurável | ISO/IEC 25010; McCabe (1976); Chidamber & Kemerer (1994) |
| CI, Conventional Commits, versionamento semântico | Entrega contínua e rastreável | Humble & Farley (2010); Conventional Commits |

---

## 12. Referências (lista consolidada)

BRASIL. **NR-17 — Ergonomia**. Ministério do Trabalho e Emprego.

BASS, L.; CLEMENTS, P.; KAZMAN, R. **Software Architecture in Practice**.
4. ed. Addison-Wesley, 2021.

BECK, K. **Extreme Programming Explained: Embrace Change**. Addison-Wesley, 2000.

BECK, K. **Test-Driven Development: By Example**. Addison-Wesley, 2002.

CHIDAMBER, S. R.; KEMERER, C. F. **A Metrics Suite for Object Oriented Design**.
*IEEE Transactions on Software Engineering*, v. 20, n. 6, p. 476–493, 1994.

COCKBURN, A. **Hexagonal Architecture (Ports and Adapters)**. 2005.

CONVENTIONAL COMMITS. **Conventional Commits 1.0.0**.
Disponível em: <https://www.conventionalcommits.org/en/v1.0.0/>.

CORRÊA, H. L.; CORRÊA, C. A. **Administração de Produção e Operações**. 3. ed.
Atlas, 2012.

EVANS, E. **Domain-Driven Design: Tackling Complexity in the Heart of
Software**. Addison-Wesley, 2003.

FEATHERS, M. **Working Effectively with Legacy Code**. Prentice Hall, 2004.

FENTON, N.; BIEMAN, J. **Software Metrics: A Rigorous and Practical Approach**.
3. ed. CRC Press, 2014.

FIELDING, R. T. **Architectural Styles and the Design of Network-based Software
Architectures**. Tese (Doutorado) — University of California, Irvine, 2000.

FORSGREN, N.; HUMBLE, J.; KIM, G. **Accelerate: The Science of Lean Software and
DevOps**. IT Revolution, 2018.

FOWLER, M. **Patterns of Enterprise Application Architecture**. Addison-Wesley,
2002.

FOWLER, M. **Strangler Fig**. Disponível em:
<https://martinfowler.com/bliki/StranglerFigApplication.html>.

GAMMA, E.; HELM, R.; JOHNSON, R.; VLISSIDES, J. **Design Patterns: Elements of
Reusable Object-Oriented Software**. Addison-Wesley, 1994.

HOHPE, G.; WOOLF, B. **Enterprise Integration Patterns**. Addison-Wesley, 2003.

HUMBLE, J.; FARLEY, D. **Continuous Delivery**. Addison-Wesley, 2010.

ISO/IEC. **25010:2011** — *Systems and software Quality Requirements and
Evaluation (SQuaRE) — System and software quality models*.

ISO. **9241-110:2020** — *Ergonomics of human-system interaction — Part 110:
Interaction principles*.

ISO. **9241-210:2019** — *Ergonomics of human-system interaction — Part 210:
Human-centred design for interactive systems*.

ISO/IEC/IEEE. **29148:2018** — *Systems and software engineering — Life cycle
processes — Requirements engineering*.

LUSTOSA, L. J.; MESQUITA, M. A.; QUELHAS, O. L. G.; OLIVEIRA, R. J.
**Planejamento e Controle da Produção**. Elsevier/Campus, 2008.

MARTIN, R. C. **Clean Architecture**. Prentice Hall, 2017.

MAVIN, A.; WILKINSON, P.; HARWOOD, A.; NOVAK, M. **Easy Approach to Requirements
Syntax (EARS)**. In: *17th IEEE International Requirements Engineering
Conference (RE)*, 2009.

McCABE, T. J. **A Complexity Measure**. *IEEE Transactions on Software
Engineering*, v. SE-2, n. 4, p. 308–320, 1976.

NIELSEN, J. **Heuristic Evaluation**. In: NIELSEN, J.; MACK, R. L. (Eds.)
*Usability Inspection Methods*. John Wiley & Sons, 1994.

OWASP. **Application Security Verification Standard (ASVS)**, v5.0.0.
Disponível em:
<https://owasp.org/www-project-application-security-verification-standard/>.

OWASP. **Top 10:2021 — The Ten Most Critical Web Application Security Risks**.
2021.

PARNAS, D. L. **On the Criteria To Be Used in Decomposing Systems into Modules**.
*Communications of the ACM*, v. 15, n. 12, p. 1053–1058, 1972.

PERCIVAL, C.; JOSEFSSON, S. **The scrypt Password-Based Key Derivation
Function**. IETF RFC 7914, 2016.

PRESSMAN, R. S.; MAXIM, B. R. **Engenharia de Software: uma abordagem
profissional**. 9. ed. McGraw-Hill, 2021.

SLACK, N.; BRANDON-JONES, A.; JOHNSTON, R. **Administração da Produção**. Atlas,
2018.

SOMMERVILLE, I. **Engenharia de Software**. 10. ed. Pearson, 2018.

VERNON, V. **Implementing Domain-Driven Design**. Addison-Wesley, 2013.

VOLLMANN, T. E.; BERRY, W. L.; WHYBARK, D. C.; JACOBS, F. R. **Manufacturing
Planning and Control for Supply Chain Management**. 5. ed. McGraw-Hill, 2005.

W3C. **Web Content Accessibility Guidelines (WCAG) 2.1**. W3C Recommendation,
2018. Disponível em: <https://www.w3.org/TR/WCAG21/>.

ANSI/ISA **95** / IEC **62264** — *Enterprise-Control System Integration*.
