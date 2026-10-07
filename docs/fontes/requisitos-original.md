# Fonte histórica - Requisitos

> Conversão para Markdown do documento fornecido pelo time. Este arquivo preserva a fonte; decisões posteriores estão em `../decisoes.md`.

<img src="media/image1.png" style="width:2.3896in;height:0.96969in" />

**NCT027 - PRÁTICAS PROFISSIONAIS EM ENG. DE SOFTWARE**

**MARCELO FIUZA PEREIRA**

**RENAN ALVES TAVARES**

**VANUSA RODRIGUES DE OLIVEIRA**

**VANESSA RODRIGUES DE OLIVEIRA**

**Sistema de Gestão de Produção**

**SÃO SEBASTIÃO DO PARAÍSO-MG**

**2026**

**1. História de Usuário (HU)**

| **ID** | **Persona**                         | **História de Usuário**                                                                                                                                                                                                                    |
|--------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| HU01   | Operador de Linha de Produção       | Como operador, quero visualizar minhas atividades e registrar de forma simples sua execução, incluindo quantidades produzidas ou separadas, perdas, pausas e conclusão, para que o andamento real do trabalho fique atualizado no sistema. |
| HU02   | Gerente de Produção                 | Como gerente de produção, quero acompanhar em tempo real os pedidos, atividades, quantidades e prioridades dos setores, para identificar atrasos, gargalos e pendências e tomar decisões de forma rápida.                                  |
| HU03   | Vendedor                            | Como vendedor, quero consultar o andamento, a disponibilidade e o saldo dos meus pedidos, para informar os clientes sobre a situação de seus pedidos sem depender constantemente do gerente de produção.                                   |
| HU04   | Expedição                           | Como responsável pela expedição, quero visualizar os itens disponíveis e registrar entregas totais ou parciais, para manter atualizado o saldo dos pedidos e evitar erros nas saídas.                                                      |
| HU05   | Responsável pelo Sistema            | Como responsável pelo sistema, quero gerenciar usuários, setores, perfis e permissões, para garantir que cada pessoa tenha acesso adequado às funcionalidades necessárias para realizar seu trabalho.                                      |
| HU06   | Desenvolvedor / Responsável Técnico | Como responsável técnico, quero acompanhar a integração com o Top Gerente, os logs e possíveis erros do sistema, para identificar problemas e garantir o funcionamento correto da aplicação sem comprometer os dados do sistema legado.    |

**2.Requisitos Funcionais**

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF001 - Integração com o Top Gerente</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve consultar e importar do Top Gerente os dados necessários para o acompanhamento dos pedidos, incluindo número do pedido, cliente, produtos, quantidades solicitadas e demais informações relevantes.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. O sistema acessa a base do Top Gerente.</p>
<p>2. Consulta os registros de pedidos.</p>
<p>3. Identifica novos ou alterados pedidos.</p>
<p>4. Importa os dados necessários.</p>
<p>5. Atualiza a base do sistema.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso a conexão ou consulta falhe, o sistema deve registrar o erro e informar que a sincronização não foi concluída.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Acesso à base do Top Gerente; dados de pedidos disponíveis; credenciais/permissões configuradas.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Pedidos disponíveis no sistema com os dados importados corretamente, sem alteração dos registros originais do Top Gerente.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF002 -Organização dos itens por setor</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve identificar o setor responsável pela execução de cada item do pedido, permitindo separar as atividades conforme o processo produtivo da empresa.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Pedido é importado.</p>
<p>2. Sistema identifica os produtos/itens.</p>
<p>3. Relaciona cada item ao setor responsável.</p>
<p>4. Cria as atividades correspondentes.</p>
<p>5. Disponibiliza as atividades para os respectivos setores</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso um item não possua setor definido, o sistema deve sinalizar a pendência para um usuário autorizado realizar a classificação.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Pedido importado; produtos cadastrados; setores configurados.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Cada item é direcionado corretamente ao setor responsável, ficando disponível para execução.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF003 - Fila de atividades por setor.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve apresentar ao operador uma fila contendo as atividades pendentes, em execução, pausadas e concluídas do seu setor, permitindo identificar rapidamente o que precisa ser executado.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Operador acessa o sistema.</p>
<p>2. Sistema identifica seu setor/perfil.</p>
<p>3. Carrega as atividades correspondentes.</p>
<p>4. Ordena conforme prioridade e situação.</p>
<p>5. Operador seleciona uma atividade.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Atividades urgentes ou atrasadas podem ser apresentadas em posição prioritária.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário autenticado e associado a um setor; atividades disponíveis.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Operador visualiza somente as atividades do seu setor e consegue iniciar sua execução.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF004 -Registro da execução</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir que o operador registre a quantidade efetivamente produzida, executada ou separada, de acordo com a atividade realizada pelo setor.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Operador seleciona a atividade.</p>
<p>2. Inicia a execução.</p>
<p>3. Informa a quantidade realizada.</p>
<p>4. Sistema valida a informação.</p>
<p>5. Atualiza o saldo da atividade.</p>
<p>6. Registra data, hora e usuário. .</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso a quantidade informada seja inválida ou superior ao permitido, o sistema deve solicitar correção ou confirmação de um responsável.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Atividade existente e disponível; operador autorizado; quantidade executada.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Quantidade executada registrada e saldo atualizado para o pedido.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF005 - Registro de ocorrências</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir o registro de ocorrências que afetem a execução das atividades, como perdas, defeitos, falta de material, pausas, máquinas paradas e interrupções.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Operador identifica a ocorrência.</p>
<p>2. Seleciona o tipo de ocorrência.</p>
<p>3. Informa quantidade ou duração, quando aplicável.</p>
<p>4. Adiciona observação.</p>
<p>5. Sistema registra a ocorrência vinculada à atividade.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O operador pode cancelar o registro antes da confirmação. Ocorrências críticas podem gerar alerta ao gerente. .</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Atividade em execução; usuário autenticado; tipo de ocorrência cadastrado.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Ocorrência registrada com usuário, data, hora e atividade relacionada.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF006 - Acompanhamento da produção.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve disponibilizar ao gerente uma visão consolidada do andamento dos pedidos e das atividades de cada setor, permitindo acompanhar o progresso da produção em tempo próximo do real.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Gerente acessa o painel.</p>
<p>2. Sistema consulta os dados das atividades.</p>
<p>3. Consolida os dados por pedido e setor.</p>
<p>4. Apresenta status, quantidades e pendências.</p>
<p>5. Gerente acompanha a evolução.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O gerente pode filtrar por pedido, cliente, setor, status ou período.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário com permissão gerencial; atividades registradas.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Visão consolidada e atualizada do andamento da produção.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF007 - Gestão de prioridades.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir ao gerente definir, alterar e visualizar a prioridade das atividades considerando a necessidade de atendimento dos pedidos e a organização da produção.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Média</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Gerente acessa a lista de atividades.</p>
<p>2. Seleciona uma atividade.</p>
<p>3. Define ou altera sua prioridade.</p>
<p>4. Sistema registra a alteração.</p>
<p>5. A atividade é reorganizada na fila do setor..</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Alterações de prioridade podem gerar alerta aos operadores envolvidos.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Gerente autenticado; atividade existente.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Nova prioridade registrada e refletida nas filas dos setores.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF008 - Consulta de pedidos pelo vendedor.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir ao vendedor consultar os pedidos sob sua responsabilidade, visualizando o andamento, quantidades executadas, entregues e saldo pendente.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Vendedor acessa o sistema.</p>
<p>2. Consulta seus pedidos.</p>
<p>3. Seleciona um pedido.</p>
<p>4. Sistema apresenta seu status e informações de execução/entrega.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O vendedor pode pesquisar por número do pedido, cliente ou período.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Vendedor autenticado; pedidos associados ao vendedor..</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Informações atualizadas sobre o andamento e saldo dos pedidos.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF009 - Controle de disponibilidade.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve calcular e apresentar a quantidade de cada item que está efetivamente disponível para entrega, considerando a quantidade solicitada e a quantidade já executada.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema obtém quantidade solicitada.</p>
<p>2. Consulta quantidade executada.</p>
<p>3. Considera quantidades já entregues.</p>
<p>4. Calcula o disponível.</p>
<p>5. Apresenta o resultado.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso existam divergências ou registros incompletos, o sistema deve sinalizar que a disponibilidade pode estar pendente de atualização.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Pedido e itens registrados; dados de execução e entrega disponíveis.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Quantidade disponível para entrega calculada e apresentada por item.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF010- Controle de entregas.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir registrar entregas totais ou parciais, vinculando a quantidade entregue ao respectivo pedido e item..</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário autorizado acessa o pedido.</p>
<p>2. Seleciona o item.</p>
<p>3. Informa a quantidade entregue.</p>
<p>4. Sistema valida a disponibilidade.</p>
<p>5. Registra a entrega e atualiza o saldo.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Entregas parciais devem manter o restante do item como pendente. O sistema não deve permitir registrar quantidade superior à disponível sem autorização.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Pedido existente; quantidade disponível; usuário autorizado.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Entrega registrada e saldo do pedido atualizado.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF011 - Controle de saldo dos pedidos.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve calcular e apresentar, para cada item, as quantidades solicitadas, executadas, disponíveis, entregues e pendentes, permitindo acompanhar todo o ciclo do pedido.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema consulta os registros do pedido.</p>
<p>2. Obtém quantidade solicitada.</p>
<p>3. Obtém quantidade executada.</p>
<p>4. Obtém quantidade entregue.</p>
<p>5. Calcula o saldo pendente.</p>
<p>6. Apresenta os resultados.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso haja inconsistência nos dados, o sistema deve indicar o item para conferência.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Dados de pedido, produção e entrega disponíveis.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Saldos calculados automaticamente e apresentados de forma consolidada.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF012 - Alertas de produção.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve emitir alertas sobre situações que necessitem de atenção, como atividades atrasadas, atividades paradas, pedidos próximos do prazo e pendências de execução ou entrega.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema monitora as atividades.</p>
<p>2. Identifica uma condição de alerta.</p>
<p>3. Classifica a ocorrência.</p>
<p>4. Exibe o alerta ao usuário responsável.</p>
<p>5. Registra o alerta.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O usuário pode visualizar, reconhecer ou tratar o alerta, conforme sua permissão.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Atividades e prazos cadastrados; regras de alerta configuradas.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Usuários responsáveis são informados sobre situações que exigem intervenção.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF013 - Gerenciamento de usuários.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir que usuários autorizados cadastrem, editem, consultem, ativem ou desativem usuários, mantendo seus dados básicos e associação com setor e perfil.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Média</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Administrador acessa usuários.</p>
<p>2. Cadastra ou seleciona usuário.</p>
<p>3. Informa/edita os dados.</p>
<p>4. Define setor e perfil.</p>
<p>5. Salva as alterações.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Usuário desativado não poderá acessar as funcionalidades do sistema..</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Administrador autenticado; dados do usuário; perfil disponível.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Usuário cadastrado ou atualizado e com acesso conforme suas permissões.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF014 - Gerenciamento de perfis e permissões.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir configurar quais funcionalidades cada perfil pode acessar, considerando as diferenças entre operadores, vendedores, gerentes e administradores.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Administrador acessa perfis.</p>
<p>2. Seleciona um perfil.</p>
<p>3. Define permissões.</p>
<p>4. Salva as configurações.</p>
<p>5. Sistema aplica as permissões aos usuários associados.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Tentativas de acesso a funcionalidades não autorizadas devem ser bloqueadas..</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Administrador autorizado; perfis cadastrados..</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Cada usuário acessa somente as funcionalidades permitidas ao seu perfil.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF015 - Gerenciamento de setores.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir cadastrar e atualizar os setores envolvidos no processo, relacionando cada setor às atividades que executa e aos usuários responsáveis.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Média</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Administrador acessa setores.</p>
<p>2. Cadastra ou seleciona um setor.</p>
<p>3. Define suas informações.</p>
<p>4. Relaciona atividades e usuários.</p>
<p>5. Salva a configuração..</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Um setor que possua atividades ou usuários vinculados não deve ser excluído diretamente; deve ser desativado ou ter seus vínculos tratados.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Administrador autorizado; dados dos setores</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Setores cadastrados e relacionados aos usuários e atividades.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF016 - Registro de logs.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve registrar as principais ações realizadas pelos usuários, incluindo identificação do usuário, operação realizada, data, hora e, quando aplicável, o registro afetado.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Média</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário realiza uma ação relevante.</p>
<p>2. Sistema identifica usuário e operação.</p>
<p>3. Registra data e hora.</p>
<p>4. Armazena o registro.</p>
<p>5. Usuário autorizado pode consultar os logs.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Falhas no registro de log devem ser tratadas sem comprometer a operação principal, quando tecnicamente possível</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário autenticado; ação realizada.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Registro de auditoria disponível para rastrear alterações e operações relevantes.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF017 - Monitoramento da integração.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve registrar e apresentar falhas ocorridas durante a integração com o Top Gerente, permitindo identificar problemas de conexão, consulta, dados ou sincronização.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema inicia sincronização.</p>
<p>2. Executa a consulta.</p>
<p>3. Identifica erro, caso ocorra.</p>
<p>4. Registra tipo, data e horário do erro.</p>
<p>5. Exibe a situação para usuário autorizado.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O sistema pode permitir uma nova tentativa de sincronização após a correção do problema.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Integração configurada; tentativa de sincronização realizada.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Erros identificados e registrados, permitindo diagnóstico e nova tentativa.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RF018 - Impressão de ordem de produção.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve gerar, para cada setor, uma ordem de produção contendo os itens que precisam ser executados e campos destinados ao preenchimento manual das informações de produção, quando necessário.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema identifica atividades do setor.</p>
<p>2. Agrupa os itens correspondentes.</p>
<p>3. Gera a ordem de produção.</p>
<p>4. Disponibiliza a impressão.</p>
<p>5. Responsável utiliza o documento durante a execução.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>O usuário pode selecionar período, pedido ou setor antes da impressão.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Atividades cadastradas; setor definido; impressora disponível, quando aplicável.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Documento gerado com informações corretas dos itens e campos para registro manual da execução.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**3.Requisitos não funcionais**

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN001 - Usabilidade.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve apresentar uma interface intuitiva, consistente e de fácil aprendizagem, permitindo que os usuários realizem suas tarefas diárias com eficiência, clareza e baixo índice de erros, sem a necessidade de treinamentos extensos.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário acessa o sistema.</p>
<p>2. Sistema identifica seu perfil e setor.</p>
<p>3. Apresenta somente as funcionalidades relevantes.</p>
<p>4. Usuário navega pelas opções de forma objetiva.</p>
<p>5. Sistema fornece informações claras sobre cada ação.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso o usuário tente realizar uma operação inválida, o sistema deve apresentar mensagem clara indicando o problema e como corrigi-lo.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário autenticado; perfil e setor definidos.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Usuário consegue realizar as operações necessárias sem treinamento excessivo e com baixa ocorrência de erros de interação.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN002 - Agilidade.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>As operações realizadas no chão de fábrica devem exigir o mínimo possível de cliques e digitação, priorizando seleção de opções e preenchimento rápido de quantidades.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Operador acessa uma atividade.</p>
<p>2. Sistema apresenta as principais ações diretamente na tela.</p>
<p>3. Operador informa ou seleciona os dados necessários.</p>
<p>4. Confirma a operação.</p>
<p>5. Sistema atualiza o registro..</p></th>
</tr>
<tr class="header">
<th><em>Entradas e pré-condições</em></th>
<th>Operador autenticado; atividade disponível.</th>
</tr>
<tr class="odd">
<th><em>Saídas e condições esperadas</em></th>
<th>Registro concluído com poucos passos, reduzindo o tempo de interação durante a execução da atividade.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN003 - Desempenho.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>As principais operações do sistema devem apresentar tempo de resposta inferior a 2 segundos em condições normais de utilização, incluindo consulta de atividades, atualização de status e registro de execução.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Média</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário solicita uma operação.</p>
<p>2. Sistema processa a solicitação.</p>
<p>3. Sistema retorna o resultado.</p>
<p>4. Interface apresenta a informação atualizada.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Em operações que dependam de integração externa ou grande volume de dados, o sistema deve informar ao usuário que o processamento está em andamento, evitando múltiplas solicitações simultâneas.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Sistema disponível; conexão ativa; dados acessíveis.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Operações principais respondidas em menos de 2 segundos em condições normais de operação..</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN004 - Segurança de acesso.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve controlar o acesso às funcionalidades e informações conforme o perfil e as permissões atribuídas a cada usuário, impedindo que usuários não autorizados executem operações restritas.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário informa suas credenciais.</p>
<p>2. Sistema autentica o usuário.</p>
<p>3. Identifica seu perfil e permissões.</p>
<p>4. Libera somente as funcionalidades autorizadas.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso o usuário tente acessar uma funcionalidade sem permissão, o sistema deve bloquear o acesso e apresentar uma mensagem informativa.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário cadastrado; credenciais válidas; perfil configurado.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Acesso restrito de acordo com o perfil, evitando operações não autorizadas.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN005 - Integridade dos dados.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>A integração com o Top Gerente deve preservar os dados originais existentes nessa base. As informações importadas devem ser utilizadas pelo sistema sem realizar alterações indevidas nos registros de origem.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema inicia integração.</p>
<p>2. Consulta os dados necessários.</p>
<p>3. Importa ou sincroniza as informações.</p>
<p>4. Armazena os dados no sistema.</p>
<p>5. Mantém os registros de origem inalterados.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso seja identificada inconsistência durante a importação, o sistema deve interromper ou rejeitar o registro afetado e registrar o problema.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Conexão com Top Gerente; permissões de acesso; dados disponíveis.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Dados originais do Top Gerente permanecem preservados e os dados importados mantêm sua consistência.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN006 - Rastreabilidade.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve manter registros das principais alterações e operações realizadas, permitindo identificar o usuário responsável, a data, o horário, a operação executada e, quando aplicável, o registro alterado.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Usuário realiza uma operação relevante.</p>
<p>2. Sistema identifica o usuário.</p>
<p>3. Registra operação, data e hora.</p>
<p>4. Armazena o registro de auditoria.</p>
<p>5. Usuário autorizado pode consultar o histórico.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Em alterações de informações importantes, o sistema deve registrar os valores anterior e posterior, quando tecnicamente aplicável.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Usuário autenticado; operação realizada.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Todas as operações relevantes podem ser rastreadas posteriormente, permitindo identificar responsáveis e momentos das alterações.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN007 - Segurança da integração .</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O acesso à base do Top Gerente deve utilizar credenciais e permissões restritas, limitando as operações realizadas pelo sistema às consultas e demais operações estritamente necessárias para a integração.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema solicita conexão com o Top Gerente.</p>
<p>2. Utiliza credenciais específicas da integração.</p>
<p>3. Realiza somente as operações autorizadas.</p>
<p>4. Finaliza a consulta/sincronização.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Tentativas de executar operações não autorizadas devem ser rejeitadas e registradas para posterior análise.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Credenciais específicas; permissões configuradas; conexão segura.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>A integração acessa somente os dados e operações necessários, reduzindo o risco de alterações indevidas na base do Top Gerente.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN008 - Operação offline .</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve permitir que determinadas atividades de registro realizadas no chão de fábrica sejam armazenadas temporariamente quando não houver conexão com a rede, sincronizando os dados posteriormente quando a conexão for restabelecida.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Operador realiza uma operação sem conexão.</p>
<p>2. Sistema identifica a indisponibilidade.</p>
<p>3. Armazena o registro localmente.</p>
<p>4. Conexão é restabelecida.</p>
<p>5. Sistema sincroniza os registros pendentes.</p>
<p>6. Confirma a sincronização.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Caso ocorra conflito ou erro durante a sincronização, o sistema deve preservar o registro e sinalizar a necessidade de intervenção.</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Aplicação previamente carregada; atividade disponível; ausência temporária de conexão.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Registros realizados offline não são perdidos e são sincronizados posteriormente sem duplicação ou inconsistência.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 35%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>RFN009 - Manutenibilidade.</strong></th>
</tr>
<tr class="odd">
<th><em>Descrição</em></th>
<th>O sistema deve possuir estrutura, registros de erros e mecanismos de diagnóstico que facilitem a identificação, manutenção e correção de falhas, principalmente relacionadas à integração e às operações realizadas pelos usuários.</th>
</tr>
<tr class="header">
<th><em>Prioridade</em></th>
<th>Alta</th>
</tr>
<tr class="odd">
<th><em>Fluxo de eventos principal</em></th>
<th><p>1. Sistema identifica uma falha.</p>
<p>2. Registra informações técnicas relevantes.</p>
<p>3. Armazena data, hora e contexto do erro.</p>
<p>4. Equipe responsável consulta os registros.</p>
<p>5. Realiza a correção e valida o funcionamento.</p></th>
</tr>
<tr class="header">
<th><em>Fluxos secundários</em></th>
<th>Falhas críticas devem gerar alertas para os responsáveis pela manutenção do sistema. .</th>
</tr>
<tr class="odd">
<th><em>Entradas e pré-condições</em></th>
<th>Sistema em operação; mecanismos de registro habilitados.</th>
</tr>
<tr class="header">
<th><em>Saídas e condições esperadas</em></th>
<th>Erros podem ser identificados e diagnosticados com informações suficientes para facilitar a manutenção e reduzir o tempo de correção.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>
