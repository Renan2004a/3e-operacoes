# Referencial teórico (artigos com DOI e normas)

Versão do referencial em que **todas as citações** são **artigos científicos com
DOI** ou **normas/governamentais** (ISO, IEC, IEEE, W3C, IETF, ISA, OWASP,
NR-17). Substitui as obras monográficas da versão anterior. Data de acesso: 14
out. 2026.

---

## Referencial teórico

O projeto fundamenta-se em Engenharia de Software e Gestão da Produção para
integrar informações comerciais e acompanhar o fluxo operacional (pedidos,
produção, separação e expedição) da 3E Ferro e Aço, sem substituir o sistema
legado Top Gerente. O embasamento teórico abrange engenharia de requisitos,
processos e qualidade de software, arquitetura e modelagem de domínio,
integração de sistemas, gestão da produção, usabilidade, segurança e entrega
contínua.

A engenharia de requisitos assegura que o software atenda às necessidades dos
usuários, pois especificações ambíguas, incompletas ou não verificáveis geram
retrabalho e comprometem o projeto (NUSEIBEH; EASTERBROOK, 2000; BERRY et al.,
2025). O *Easy Approach to Requirements Syntax* (EARS) padroniza a escrita de
requisitos condicionais e comportamentais (MAVIN et al., 2009), e a norma
ISO/IEC/IEEE 29148 orienta sua especificação e rastreabilidade (ISO/IEC/IEEE,
2018). Na solução, os requisitos vinculam-se a critérios de aceitação, tarefas e
testes, garantindo conformidade entre especificação e execução.

O processo de desenvolvimento e a qualidade do software sustentam a
confiabilidade do sistema. Métodos iterativos e incrementais viabilizam entregas
em ciclos curtos com avaliações e ajustes contínuos (LARMAN; BASILI, 2003),
diferenciando verificação (construir corretamente) de validação (atender às
necessidades). A automação e as entregas frequentes aceleram e estabilizam o
desenvolvimento (SHAHIN et al., 2017). O trabalho adota um fluxo orientado por
especificações, cobrindo planejamento, implementação, verificação e avaliação
independente de alterações.

Os testes automatizados complementam esse processo. O *Test-Driven Development*
(TDD) prescreve a escrita de testes prévia ao código como especificação
executável contra regressões (JANZEN; SAIEDIAN, 2005). *Stubs*, *spies*, *fakes*
e *mocks* reduzem dependências externas e trazem previsibilidade (FREEMAN et
al., 2004), enquanto métricas de software auxiliam no diagnóstico da qualidade
segundo seus contextos e limitações (EL EMAM, 2001). Na solução, a suíte
automatizada valida regras críticas (saldos, disponibilidade, perdas, refugos,
permissões, prazos e entregas) e fluxos de interface.

A arquitetura de software e a modelagem de domínio norteiam a organização e a
evolução do sistema. A arquitetura define decisões estruturais que afetam a
manutenibilidade (TYREE; AKERMAN, 2005; ISO/IEC/IEEE, 2011), apoiada pelo
ocultamento de informação para encapsular decisões internas (PARNAS, 1972). O
*Domain-Driven Design* (DDD) centraliza as regras de negócio em modelos
expressos na linguagem do domínio (ÖZKAN et al., 2025). Padrões arquiteturais,
como portas e adaptadores e a separação em camadas, isolam o núcleo de
tecnologias externas (ME et al., 2016), e padrões de projeto auxiliam na
organização do código (KHOMH et al., 2009). No projeto, esses conceitos
fundamentam a separação entre domínio e infraestrutura, a alternância entre
dados reais e falsos (*fakes*) e a divisão modular (autenticação, usuários,
setores, pedidos, integração, produção, ocorrências, expedição, prazos e
indicadores), assegurando alta coesão e baixo acoplamento.

A integração de sistemas amplia funcionalidades sem substituir o legado. A
modernização incremental de sistemas existentes preserva o funcionamento
enquanto novas partes são introduzidas (TAIBI et al., 2017), exigindo controle
do débito técnico e do entendimento do sistema existente (SARAIVA et al., 2021).
Padrões de integração empresarial, com *middleware* orientado a mensagens,
tratam da troca de mensagens, tolerância a falhas e idempotência, evitando
duplicidades em execuções repetidas (RONG, 2011), enquanto o HTTP padroniza a
comunicação entre serviços por meio de recursos (IETF, 2022). Na manufatura, a
norma ISA-95 (IEC 62264) rege a integração entre gestão empresarial e operação
fabril (ISA, 2010). A solução conecta-se ao Top Gerente por conector local
somente leitura. A importação assíncrona, iniciada pelo número do pedido, emprega
dados normalizados, idempotência e reconsultas com espera progressiva
(*backoff*), organizando a execução sem alterar os registros de origem.

A gestão da produção embasa o acompanhamento dos volumes solicitados,
executados, pendentes e liberados. O Planejamento e Controle da Produção (PCP)
aloca recursos e orienta decisões operacionais, inclusive a aceitação e a
liberação de pedidos com base na capacidade e no *available-to-promise* (ROGERS;
NANDI, 2007; SAENZ DE UGARTE et al., 2009). No sistema, o saldo pendente
equivale à quantidade solicitada menos a executada, e a disponibilidade para
entrega corresponde à quantidade executada menos a entregue. Perdas, refugos e
retrabalhos são registrados individualmente com seus motivos, diferenciando a
produção conforme das quantidades não aproveitadas. O trabalho contempla prazos
por item/setor e indicadores de desempenho para apoio direto ao PCP.

A interface, usabilidade e acessibilidade são essenciais em ambientes
industriais devido ao uso contínuo em múltiplos dispositivos. A WCAG 2.1
estrutura a acessibilidade nos princípios de perceptibilidade, operabilidade,
compreensibilidade e robustez, nos níveis A, AA e AAA (W3C, 2018). A ISO 9241-210
disciplina o design centrado no ser humano, enquanto a ISO 9241-110 estabelece
princípios de interação como autodescrição, conformidade com expectativas e
tolerância a erros (ISO, 2019; ISO, 2020). As heurísticas de Nielsen destacam a
visibilidade do estado, a prevenção de erros e a clareza (NIELSEN; MOLICH,
1990), e a NR-17 define parâmetros ergonômicos (BRASIL, 1978). O projeto traduz
esses fundamentos em interfaces responsivas, foco visível, rótulos acessíveis,
alvos de toque adequados e vocabulário aderente ao domínio, visando à
conformidade WCAG 2.1 AA.

A segurança de aplicações web requer controles de autenticação, autorização,
sessão e proteção de dados. O *Application Security Verification Standard*
(ASVS) padroniza a verificação desses mecanismos, e o OWASP Top 10 elenca os
principais riscos, como falhas de acesso e autenticação (OWASP, 2021; OWASP,
2025). O scrypt aplica derivação de chave intensiva em memória contra força bruta
(IETF, 2016). No sistema, as sessões operam via *cookies* assinados com a
propriedade *HttpOnly*, as senhas usam scrypt, o acesso ao Top Gerente respeita o
menor privilégio (leitura restrita) e as permissões são validadas no servidor
conforme o perfil do usuário.

Métricas de qualidade e entrega contínua viabilizam a evolução sustentável do
software. A ISO/IEC 25010 categoriza características de qualidade do produto
(adequação funcional, confiabilidade, usabilidade, desempenho, manutenibilidade,
portabilidade, compatibilidade e segurança) (ISO/IEC, 2011). Na análise
estrutural, empregam-se a complexidade ciclomática (McCABE, 1976) e métricas de
orientação a objetos de Chidamber e Kemerer (1994), interpretadas segundo seus
contextos (EL EMAM, 2001). A entrega contínua automatiza construção, testes e
implantação para liberações frequentes e seguras (SHAHIN et al., 2017), enquanto
a qualidade das mensagens de *commit* favorece a rastreabilidade (LI; AHMED,
2023). O *pipeline* do projeto executa análise estática, verificação de tipos,
testes e compilação, monitorando complexidade, acoplamento e cobertura de testes
em módulos críticos.

Em síntese, esses fundamentos orientam o trabalho pela separação clara de
responsabilidades: requisitos verificáveis direcionam a implementação; testes
automatizados balizam o comportamento; a arquitetura desacopla domínio e
infraestrutura; a integração preserva o sistema legado; e a gestão industrial
estrutura o acompanhamento operacional. Essa articulação viabiliza uma evolução
incremental, priorizando rastreabilidade, segurança, manutenibilidade e
aderência às necessidades da empresa.

---

## Referências

### Artigos com DOI

BERRY, Daniel M.; KAMSTIES, Erik; RIBEIRO, Cristina; TJONG, Sri Fatimah.
Detecting Defects in Natural Language Requirements Specifications. In: **Handbook
on Natural Language Processing for Requirements Engineering**. Cham: Springer,
2025. DOI: 10.1007/978-3-031-73143-3_5. Disponível em:
<https://doi.org/10.1007/978-3-031-73143-3_5>. Acesso em: 14 out. 2026.

CHIDAMBER, Shyam R.; KEMERER, Chris F. A Metrics Suite for Object Oriented
Design. **IEEE Transactions on Software Engineering**, v. 20, n. 6, p. 476-493,
jun. 1994. DOI: 10.1109/32.295895. Disponível em:
<https://doi.org/10.1109/32.295895>. Acesso em: 14 out. 2026.

EL EMAM, Khaled. A primer on object-oriented measurement. In: **Proceedings
Seventh International Software Metrics Symposium**, 2001. p. 137-150. DOI:
10.1109/METRIC.2001.915527. Disponível em:
<https://doi.org/10.1109/METRIC.2001.915527>. Acesso em: 14 out. 2026.

FREEMAN, Steve; MACKINNON, Tim; PRYCE, Nat; WALNES, Joe. Mock roles, not
objects. In: **Companion to the 19th Annual ACM SIGPLAN Conference on
Object-Oriented Programming Systems, Languages, and Applications (OOPSLA)**.
New York: ACM, 2004. p. 236-246. DOI: 10.1145/1028664.1028765. Disponível em:
<https://doi.org/10.1145/1028664.1028765>. Acesso em: 14 out. 2026.

JANZEN, David; SAIEDIAN, Hossein. Test-driven development: concepts, taxonomy,
and future direction. **Computer**, v. 38, n. 9, p. 43-50, set. 2005. DOI:
10.1109/MC.2005.314. Disponível em: <https://doi.org/10.1109/MC.2005.314>.
Acesso em: 14 out. 2026.

KHOMH, Foutse; GUÉHÉNEUC, Yann-Gaël; ANTONIOL, Giuliano. Playing roles in design
patterns: An empirical descriptive and analytic study. In: **2009 IEEE
International Conference on Software Maintenance (ICSM)**, 2009. p. 83-92. DOI:
10.1109/ICSM.2009.5306327. Disponível em:
<https://doi.org/10.1109/ICSM.2009.5306327>. Acesso em: 14 out. 2026.

LARMAN, Craig; BASILI, Victor R. Iterative and incremental developments: a brief
history. **Computer**, v. 36, n. 6, p. 47-56, jun. 2003. DOI:
10.1109/MC.2003.1204375. Disponível em: <https://doi.org/10.1109/MC.2003.1204375>.
Acesso em: 14 out. 2026.

LI, Jiawei; AHMED, Iftekhar. Commit Message Matters: Investigating Impact and
Evolution of Commit Message Quality. In: **2023 IEEE/ACM 45th International
Conference on Software Engineering (ICSE)**, 2023. p. 806-818. DOI:
10.1109/ICSE48619.2023.00076. Disponível em:
<https://doi.org/10.1109/ICSE48619.2023.00076>. Acesso em: 14 out. 2026.

MAVIN, Alistair; WILKINSON, Philip; HARWOOD, Adrian; NOVAK, Mark. Easy Approach
to Requirements Syntax (EARS). In: **17th IEEE International Requirements
Engineering Conference (RE)**, 2009, Atlanta. p. 317-322. DOI:
10.1109/RE.2009.9. Disponível em: <https://doi.org/10.1109/RE.2009.9>. Acesso em:
14 out. 2026.

McCABE, Thomas J. A Complexity Measure. **IEEE Transactions on Software
Engineering**, v. SE-2, n. 4, p. 308-320, dez. 1976. DOI:
10.1109/TSE.1976.233837. Disponível em:
<https://doi.org/10.1109/TSE.1976.233837>. Acesso em: 14 out. 2026.

ME, Gianantonio; CALERO, Coral; LAGO, Patricia. Architectural Patterns and
Quality Attributes Interaction. In: **2016 Qualitative Reasoning about Software
Architectures (QRASA)**, 2016. p. 27-36. DOI: 10.1109/QRASA.2016.10. Disponível
em: <https://doi.org/10.1109/QRASA.2016.10>. Acesso em: 14 out. 2026.

NIELSEN, Jakob; MOLICH, Rolf. Heuristic evaluation of user interfaces. In:
**Proceedings of the SIGCHI Conference on Human Factors in Computing Systems
(CHI '90)**, 1990, Seattle. p. 249-256. DOI: 10.1145/97243.97281. Disponível em:
<https://doi.org/10.1145/97243.97281>. Acesso em: 14 out. 2026.

NUSEIBEH, Bashar; EASTERBROOK, Steve. Requirements engineering: a roadmap. In:
**Proceedings of the Conference on The Future of Software Engineering (ICSE
2000)**, 2000. p. 35-46. DOI: 10.1145/336512.336523. Disponível em:
<https://doi.org/10.1145/336512.336523>. Acesso em: 14 out. 2026.

ÖZKAN, Ozan; BABUR, Önder; VAN DEN BRAND, Mark. Domain-Driven Design in software
development: A systematic literature review on implementation, challenges, and
effectiveness. **Journal of Systems and Software**, v. 220, 2025. DOI:
10.1016/j.jss.2025.112537. Disponível em:
<https://doi.org/10.1016/j.jss.2025.112537>. Acesso em: 14 out. 2026.

PARNAS, David L. On the criteria to be used in decomposing systems into modules.
**Communications of the ACM**, v. 15, n. 12, p. 1053-1058, dez. 1972. DOI:
10.1145/361598.361623. Disponível em: <https://doi.org/10.1145/361598.361623>.
Acesso em: 14 out. 2026.

ROGERS, Paul; NANDI, Arindam. Judicious order acceptance and order release in
make-to-order manufacturing systems. **Production Planning & Control**, v. 18,
n. 7, p. 610-625, 2007. DOI: 10.1080/09537280701582422. Disponível em:
<https://doi.org/10.1080/09537280701582422>. Acesso em: 14 out. 2026.

RONG, Chen. Preliminary exploration on enterprise application integration based
on message-oriented middleware. In: **2011 International Conference on Consumer
Electronics, Communications and Networks (CECNet)**, 2011. p. 2887-2890. DOI:
10.1109/CECNET.2011.5768279. Disponível em:
<https://doi.org/10.1109/CECNET.2011.5768279>. Acesso em: 14 out. 2026.

SAENZ DE UGARTE, Bochra; ARIBA, Abdellah; PELLERIN, Robert. Manufacturing
execution system – a literature review. **Production Planning & Control**, v. 20,
n. 6, p. 525-539, 2009. DOI: 10.1080/09537280902938613. Disponível em:
<https://doi.org/10.1080/09537280902938613>. Acesso em: 14 out. 2026.

SARAIVA, Diego; NETO, José; KULESZA, Uirá; FREITAS, Guilherme; REBOUÇAS,
Rodrigo; COELHO, Roberta. Technical Debt Tools: A Systematic Mapping Study. In:
**Proceedings of the 23rd International Conference on Enterprise Information
Systems (ICEIS)**, 2021. p. 88-98. DOI: 10.5220/0010459100880098. Disponível em:
<https://doi.org/10.5220/0010459100880098>. Acesso em: 14 out. 2026.

SHAHIN, Mojtaba; BABAR, Muhammad Ali; ZAHEDI, Mansooreh; ZHU, Liming. Beyond
Continuous Delivery: An Empirical Investigation of Continuous Deployment
Challenges. In: **2017 ACM/IEEE International Symposium on Empirical Software
Engineering and Measurement (ESEM)**, 2017. p. 55-64. DOI:
10.1109/ESEM.2017.18. Disponível em: <https://doi.org/10.1109/ESEM.2017.18>.
Acesso em: 14 out. 2026.

TAIBI, Davide; LENARDUZZI, Valentina; PAHL, Claus. Processes, Motivations, and
Issues for Migrating to Microservices Architectures: An Empirical Investigation.
**IEEE Cloud Computing**, v. 4, n. 5, p. 32-39, set./out. 2017. DOI:
10.1109/MCC.2017.4250931. Disponível em:
<https://doi.org/10.1109/MCC.2017.4250931>. Acesso em: 14 out. 2026.

TYREE, Jeff; AKERMAN, Alan. Architecture Decisions: Demystifying Architecture.
**IEEE Software**, v. 22, n. 2, p. 19-27, mar./abr. 2005. DOI:
10.1109/MS.2005.27. Disponível em: <https://doi.org/10.1109/MS.2005.27>. Acesso
em: 14 out. 2026.

### Normas e documentos governamentais/institucionais

BRASIL. Ministério do Trabalho e Emprego. **Norma Regulamentadora n. 17 (NR-17):
Ergonomia**. Brasília: MTE, 1978. Disponível em:
<https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho>.
Acesso em: 14 out. 2026.

IETF. **RFC 7914 — The scrypt Password-Based Key Derivation Function**.
Percival, C.; Josefsson, S. Internet Engineering Task Force, ago. 2016.
Disponível em: <https://www.rfc-editor.org/rfc/rfc7914>. Acesso em: 14 out. 2026.

IETF. **RFC 9110 — HTTP Semantics**. Fielding, R.; Nottingham, M.; Reschke, J.
Internet Engineering Task Force, jun. 2022. Disponível em:
<https://www.rfc-editor.org/rfc/rfc9110>. Acesso em: 14 out. 2026.

ISA. **ANSI/ISA-95.00.01 — Enterprise-Control System Integration — Part 1:
Models and Terminology**. Research Triangle Park: International Society of
Automation, 2010. Disponível em:
<https://www.isa.org/products/ansi-isa-95-00-01-2010-iec-62264-1-mod-enterprise>.
Acesso em: 14 out. 2026.

ISO. **ISO 9241-110:2020 — Ergonomics of human-system interaction — Part 110:
Interaction principles**. Genebra: ISO, 2020. Disponível em:
<https://www.iso.org/obp/ui/#iso:std:iso:9241:-110:ed-2:v1:en>. Acesso em: 14
out. 2026.

ISO. **ISO 9241-210:2019 — Ergonomics of human-system interaction — Part 210:
Human-centred design for interactive systems**. Genebra: ISO, 2019. Disponível
em: <https://www.iso.org/standard/77520.html>. Acesso em: 14 out. 2026.

ISO/IEC. **ISO/IEC 25010:2011 — Systems and software Quality Requirements and
Evaluation (SQuaRE) — System and software quality models**. Genebra: ISO, 2011.
Disponível em: <https://www.iso.org/standard/35733.html>. Acesso em: 14 out. 2026.

ISO/IEC/IEEE. **ISO/IEC/IEEE 42010:2011 — Systems and software engineering —
Architecture description**. Genebra: ISO, 2011. Disponível em:
<https://www.iso.org/standard/50508.html>. Acesso em: 14 out. 2026.

ISO/IEC/IEEE. **ISO/IEC/IEEE 29148:2018 — Systems and software engineering —
Life cycle processes — Requirements engineering**. Genebra: ISO, 2018.
Disponível em: <https://www.iso.org/standard/72089.html>. Acesso em: 14 out. 2026.

OWASP. **Application Security Verification Standard (ASVS) 5.0.0**. 2025.
Disponível em:
<https://owasp.org/www-project-application-security-verification-standard/>.
Acesso em: 14 out. 2026.

OWASP. **OWASP Top 10:2021 — The Ten Most Critical Web Application Security
Risks**. 2021. Disponível em: <https://owasp.org/Top10/>. Acesso em: 14 out. 2026.

W3C. **Web Content Accessibility Guidelines (WCAG) 2.1**. W3C Recommendation,
2018. Disponível em: <https://www.w3.org/TR/WCAG21/>. Acesso em: 14 out. 2026.
