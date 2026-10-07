# Fonte histórica - Entrevista

> Conversão para Markdown da entrevista fornecida. Decisões posteriores podem substituir hipóteses históricas.

**Identificar os stakeholders**

- Quem recebe os pedidos? os vendedores

- Quem é responsável por encaminhar os itens? os vendedores

- Quem controla a produção? gerente de produção (everton)

- Quem trabalha diretamente na produção? operadores

- Quem preenche a planilha? os operadores

- Quem acompanha os atrasos? gerente de produção

- Quem controla as entregas? gerente de produção

- Quem utiliza o Top Gerente? gerente de produção

- Quem administraria a solução? ufla

**Entender o processo atual**

- Pode mostrar para a gente o que acontece desde o momento em que um pedido entra até ele ser entregue? O pedido é feito pelo cliente com os vendedores, por ligação, WhatsApp ou presencialmente. Em seguida, os vendedores lançam o pedido no TopGerente, que gera um PDF com as linhas de produção. Porém, esse documento não especifica o orçamento detalhado, como quantas telhas de cada tipo devem ser produzidas, apresentando apenas a quantidade final. Depois, é feita uma cópia do pedido, que é entregue aos operadores da produção. Eles realizam a fabricação e anotam manualmente quando o pedido é concluído e se houve alguma entrega parcial (meia entrega). Caso o pedido não seja produzido por completo, o restante é feito posteriormente, também sem um controle digital do andamento. Dessa forma, grande parte do acompanhamento do processo é feita em papel, o que dificulta saber em tempo real em qual etapa o pedido está, o que já foi produzido, o que falta produzir e se houve alguma entrega parcial.

- Quais informações exatas um pedido possui quando é cadastrado? nome cliente, cpf, endereço, cidade, data orçamento, telefone, telefone, vendedor, numero do documento, codigo produto, descrição do produto, quantidade, valor unitario, desconto, valor total, data de vencimento,

- Como os itens de um pedido são identificados ao longo de todo o processo? Os itens de um pedido são gerados e selecionados no TopGerente no momento em que o vendedor registra o pedido. Depois, o pedido é impresso e entregue à produção, onde os itens são identificados e acompanhados manualmente, por meio de anotações feitas à mão no próprio papel do pedido. Não existe atualmente uma identificação ou rastreamento digital dos itens ao longo das etapas de produção.

### **Produção**

- Como o operador recebe uma atividade e onde ele consulta o que precisa produzir? através da folha de impressão

- Existe alguma ordem de produção formalizada hoje? cliente, vendedor, operador e entrega

- Como o operador registra o que produziu, e como comunica as perdas, problemas e paradas? O operador não registra formalmente o que foi produzido. O acompanhamento é feito principalmente pela folha do pedido, que é utilizada durante o processo de produção. As perdas, problemas e paradas deveriam ser anotados em uma planilha impressa, porém esse registro não é realizado de forma consistente.

- Como o responsável sabe que uma determinada atividade na produção terminou? ele tem que consultar os operadores e perguntar o status de produção.

### **Entregas**

- Como são gerenciadas as entregas parciais de um pedido (quando o cliente quer levar apenas uma parte do que já está pronto)? As entregas parciais são controladas manualmente no papel do pedido. É anotado o que já foi produzido e o que foi entregue ao cliente, para que essas informações possam ser consultadas posteriormente. Porém, como não existe um controle digital, se o papel for perdido, fica difícil de saber o que já foi produzido e entregue, comprometendo o acompanhamento do pedido.

- Como vocês descobrem, na prática, que um pedido está atrasado? Na prática, não existe um controle preciso para identificar quando um pedido está atrasado. Muitas vezes, o pedido nem possui uma data de entrega definida, o que dificulta o acompanhamento do prazo

**Top Gerente (Sistema Legado)**

- O que o sistema Top Gerente controla efetivamente hoje? Nele são cadastrados e gerenciados os pedidos dos clientes, assim como os respectivos orçamentos.

- Quais informações sobre os pedidos ficam armazenadas nele? todas as informações menos os detalhes do orçamento

- Qual é o limite de integração: o novo sistema só poderá consultar os dados do Top Gerente ou também terá permissão para alterar e gravar informações nele? consultar o banco de dados apenas

- Existe alguma API disponível para comunicação, ou alguém pode nos fornecer acesso direto à base SQL? o cliente permitiu acesso para fazer um dump do banco de dados

### **Problemas Atuais**

- Qual é a maior dificuldade que vocês enfrentam nesse processo hoje? acompanhamento e desdobramento dos pedidos

- Quais informações vitais vocês gostariam de saber em tempo real e hoje não conseguem acessar? acompanhamento de produção e entregas

### **Negócio e Infraestrutura Técnica**

- Quais são os setores específicos por onde a produção passa? são 15 setores agrupados em 4 grupos

- No novo sistema, quem terá a permissão para alterar o status das ordens e itens? os operadores

- Quantos operadores, em média, utilizarão o sistema simultaneamente? 7 operadores
