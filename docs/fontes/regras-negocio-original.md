# Fonte histórica - Regras de negócio

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

# 4. Regras de Negócio

Enquanto os Requisitos Funcionais (RF) descrevem o que o sistema faz em cada tela ou fluxo, as Regras de Negócio (RN) descrevem a lógica, os cálculos e as restrições que valem independentemente da interface, normalmente reaproveitados por vários RFs ao mesmo tempo.

As regras a seguir foram organizadas a partir do conceito transversal de "item operacional" (solicitado → executado → entregue), respeitando a forma como cada setor produtivo especializa o significado de "executado":

- Corte e Dobra → peças produzidas

- Telhas → metros produzidos

- Revenda → itens separados

## 4.1 Regras Transversais (comuns aos três setores)

**RN001 - Cálculo de saldo pendente**

| **Setor**              | Transversal                                                                                                       |
|------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | O saldo pendente de um item é sempre a diferença entre o solicitado e o executado.                                |
| **Condição / Gatilho** | Aplicada sempre que houver atualização de quantidade executada em qualquer setor.                                 |
| **Cálculo / Lógica**   | Pendente = Solicitado − Executado                                                                                 |
| **Exceção**            | Se Executado \> Solicitado, o sistema deve sinalizar divergência (ver RF011) em vez de apresentar saldo negativo. |

**RN002 - Cálculo de disponibilidade para entrega**

| **Setor**              | Transversal                                                                                                                                     |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Define a quantidade de um item que está efetivamente disponível para ser entregue ao cliente, o que já foi produzido mas ainda não foi entregue |
| **Condição / Gatilho** | Aplicada sempre que a expedição consultar a disponibilidade de um item (RF009).                                                                 |
| **Cálculo / Lógica**   | Disponível = Executado − Entregue                                                                                                               |
| **Exceção**            | Só é considerado "disponível" o que já foi produzido/separado; o que ainda está pendente de execução nunca entra nesse cálculo.                 |

**RN003 - Unidade de medida define a granularidade do registro**

| **Setor**              | Transversal                                                                                                                                                                                                   |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Toda quantidade registrada (solicitada, executada, entregue, perdida) deve respeitar a unidade de medida do item (peça, metro ou unidade). O sistema não pode misturar unidades diferentes para o mesmo item. |
| **Condição / Gatilho** | Aplicada em todo registro de quantidade, em qualquer setor.                                                                                                                                                   |
| **Cálculo / Lógica**   | —                                                                                                                                                                                                             |
| **Exceção**            | Itens medidos em metros aceitam valores decimais; itens medidos em peças ou unidades não                                                                                                                      |

**RN004 - Entrega parcial não fecha o item**

| **Setor**              | Transversal                                                                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Enquanto a quantidade entregue for menor que a quantidade executada, o item permanece com status "parcialmente entregue", nunca "concluído". |
| **Condição / Gatilho** | Aplicada a cada novo registro de entrega (RF010).                                                                                            |
| **Cálculo / Lógica**   | Entregue \< Executado → status = Parcialmente entregue; Entregue = Executado → status = Concluído                                            |
| **Exceção**            | —                                                                                                                                            |

**RN005 - Bloqueio de entrega acima do disponível**

| **Setor**              | Transversal                                                                                            |
|------------------------|--------------------------------------------------------------------------------------------------------|
| **Descrição**          | O sistema não pode registrar uma quantidade entregue maior do que a quantidade disponível para o item. |
| **Condição / Gatilho** | Aplicada no momento do registro de entrega (RF010).                                                    |
| **Cálculo / Lógica**   | Se Quantidade entregue \> Disponível → bloquear o registro.                                            |
| **Exceção**            | Um usuário autorizado (gerente) pode confirmar a exceção manualmente.                                  |

## 4.2 Regras específicas — Corte e Dobra (peças produzidas)

**RN010 - Unidade fixa em peças, valores inteiros**

| **Setor**              | Corte e Dobra                                                                                                           |
|------------------------|-------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | As quantidades de solicitado, produzido, perdido e pendente são sempre números inteiros, pois o item é contável (peça). |
| **Condição / Gatilho** | Aplicada em todo registro de execução no setor de Corte e Dobra (RF004).                                                |
| **Cálculo / Lógica**   | —                                                                                                                       |
| **Exceção**            | Nenhuma prevista, peça não admite fração.                                                                               |

**RN011 - Cálculo de peças pendentes**

| **Setor**              | Corte e Dobra                                                                                                                     |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | O cálculo de pendente nesse setor difere da regra transversal simples porque a perda também consome do solicitado.                |
| **Condição / Gatilho** | Aplicada sempre que houver produção ou perda registrada na atividade.                                                             |
| **Cálculo / Lógica**   | Pendente = Solicitado − Produzido − Perdido                                                                                       |
| **Exceção**            | A confirmar com o time operacional: se a peça perdida deve ser refeita automaticamente, o pendente não deveria descontar a perda. |

**RN012 - Registro obrigatório de motivo de perda**

| **Setor**              | Corte e Dobra                                                                                                          |
|------------------------|------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Toda peça registrada como "perdida" exige o preenchimento de um motivo (ex.: defeito de corte, material com problema). |
| **Condição / Gatilho** | Aplicada no momento do registro de ocorrência de perda (RF005).                                                        |
| **Cálculo / Lógica**   | —                                                                                                                      |
| **Exceção**            | Não é permitido registrar quantidade perdida sem motivo associado.                                                     |

**RN013 - Peça perdida não é reaproveitada como produzida**

| **Setor**              | Corte e Dobra                                                                                                                                                                                                                                        |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Peça que virou perda nunca é contada como produzida . Se o operador refizer, isso é um evento totalmente novo e separado: um novo registro de produção, vinculado à mesma atividade/ordem, mas sem nenhuma ligação de "essa é a substituta daquela". |
| **Condição / Gatilho** | Aplicada sempre que uma perda for registrada e a peça precisar ser refeita.                                                                                                                                                                          |
| **Cálculo / Lógica**   | —                                                                                                                                                                                                                                                    |
| **Exceção**            | Nenhuma prevista até o momento.                                                                                                                                                                                                                      |

## 4.3 Regras específicas — Telhas (metros produzidos)

**RN020 - Unidade fixa em metros, valores decimais permitidos**

| **Setor**              | Telhas                                                                                                                                               |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | As quantidades solicitadas, produzidas, refugadas e pendentes são medidas em metros lineares, e o sistema deve aceitar casas decimais (ex.: 12,5 m). |
| **Condição / Gatilho** | Aplicada em todo registro de execução no setor de Telhas (RF004).                                                                                    |
| **Cálculo / Lógica**   | —                                                                                                                                                    |
| **Exceção**            | —                                                                                                                                                    |

**RN021 - Cálculo de metragem pendente**

| **Setor**              | Telhas                                                                           |
|------------------------|----------------------------------------------------------------------------------|
| **Descrição**          | Define o saldo de metros que ainda precisa ser produzido para atender ao pedido. |
| **Condição / Gatilho** | Aplicada sempre que houver produção ou refugo registrado na atividade.           |
| **Cálculo / Lógica**   | Pendente = Solicitado − Produzido − Refugado                                     |
| **Exceção**            | —                                                                                |

**RN022 - Arredondamento padronizado**

| **Setor**              | Telhas                                                                                                                                                                               |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Como a produção é medida por metragem cortada, o sistema deve padronizar uma quantidade fixa de casas decimais, evitando divergência entre lançamentos parciais e o total do pedido. |
| **Condição / Gatilho** | Aplicada em todo cálculo e apresentação de metragem.                                                                                                                                 |
| **Cálculo / Lógica**   | Padrão sugerido: 2 casas decimais                                                                                                                                                    |
| **Exceção**            | —                                                                                                                                                                                    |

**RN023 - Registro de refugo é opcional, mas exige motivo quando informado**

| **Setor**              | Telhas                                                                                                                                                           |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | Diferente da peça, onde a perda é comum e sempre justificada, aqui o refugo pode não ocorrer; quando ocorre, exige motivo (ex.: corte errado, defeito de chapa). |
| **Condição / Gatilho** | Aplicada no momento do registro de ocorrência de refugo (RF005).                                                                                                 |
| **Cálculo / Lógica**   | —                                                                                                                                                                |
| **Exceção**            | Não é permitido registrar refugo sem motivo associado, mas o campo de refugo em si não é obrigatório.                                                            |

## 4.4 Regras específicas — Revenda (itens separados)

**RN030 - Não existe produção, existe separação**

| **Setor**              | Revenda                                                                                                                                                                                                                |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | O campo "executado" nesse setor representa itens fisicamente separados do estoque para o pedido, não itens fabricados. A interface deve rotular essa etapa como "separado", não "produzido" (impacto direto no RF004). |
| **Condição / Gatilho** | Aplicada em todo registro de execução no setor de Revenda.                                                                                                                                                             |
| **Cálculo / Lógica**   | —                                                                                                                                                                                                                      |
| **Exceção**            | —                                                                                                                                                                                                                      |

**RN031 - Cálculo de itens pendentes**

| **Setor**              | Revenda                                                                            |
|------------------------|------------------------------------------------------------------------------------|
| **Descrição**          | Define o saldo de itens que ainda precisam ser separados para atender ao pedido.   |
| **Condição / Gatilho** | Aplicada sempre que houver separação ou indisponibilidade registrada na atividade. |
| **Cálculo / Lógica**   | Pendente = Solicitado − Separado − Indisponível                                    |
| **Exceção**            | —                                                                                  |

**RN032 - Indisponibilidade não é perda, é falta de estoque**

| **Setor**              | Revenda                                                                                                                                                                                 |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | O motivo de indisponibilidade deve vir de uma lista fechada relacionada a estoque (ex.: sem estoque, item descontinuado), diferente dos motivos de perda usados nos setores produtivos. |
| **Condição / Gatilho** | Aplicada no momento do registro de indisponibilidade (RF005).                                                                                                                           |
| **Cálculo / Lógica**   | —                                                                                                                                                                                       |
| **Exceção**            | Não é permitido registrar item indisponível sem motivo associado.                                                                                                                       |

**RN033 - Separação não gera consumo de matéria-prima**

| **Setor**              | Revenda                                                                                                                         |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| **Descrição**          | A separação não deve disparar nenhuma baixa de insumo de produção, apenas a reserva/baixa do próprio item revendido em estoque. |
| **Condição / Gatilho** | Aplicada sempre que um item do setor de Revenda for separado.                                                                   |
| **Cálculo / Lógica**   | —                                                                                                                               |
| **Exceção**            | —                                                                                                                               |

## 4.5 Revisão

- Regras de "motivo obrigatório" (RN012, RN023, RN032): foi definido que o motivo é obrigatório, mas a lista fechada de motivos ainda não existe. É necessário levantar com o gerente de produção quais são os motivos reais de perda, refugo e indisponibilidade para virarem uma lista fixa no sistema (não texto livre).
