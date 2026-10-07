# Regras de negócio efetivas

A fonte histórica integral está em `docs/fontes/regras-negocio-original.md`. As regras abaixo incorporam as decisões mais recentes do time.

## Conceito transversal

Item operacional: **solicitado → executado conforme o setor → disponível → entregue**.

- Corte e Dobra: executado = peças conformes produzidas.
- Telhas: executado = metros conformes produzidos.
- Revenda: executado = itens separados; a UI deve dizer “separado”, nunca “produzido”.

## Regras transversais

- **Saldo pendente de atendimento:** deve refletir o que ainda falta para cumprir a quantidade solicitada com unidades conformes/separadas válidas.
- **Disponível para entrega:** executado conforme − entregue.
- Toda quantidade respeita a unidade do item; não misturar unidades.
- Entrega parcial não conclui o item enquanto houver quantidade válida ainda não entregue.
- Entrega acima do disponível é bloqueada; gerente pode autorizar exceção com motivo obrigatório e auditoria.
- Perdas, refugos e indisponibilidades exigem motivo quando informados; a lista fechada real ainda deve ser levantada.

## Corte e Dobra

- Unidade: peça; valores inteiros.
- Peça perdida não conta como produzida/conforme.
- **Pendente de produção = Solicitado − Produzido conforme.**
- Exemplo: solicitado 10, produzido 8, perdido 2 ⇒ pendente 2; novas peças precisam ser produzidas até alcançar 10 conformes.
- Perda é evento separado, nunca convertida em produção.

## Telhas

- Unidade: metro; valores decimais; padronizar 2 casas decimais.
- Refugo não conta como metragem produzida/conforme.
- **Pendente de produção = Solicitado − Produzido conforme.**
- Exemplo: solicitado 10 m, produzido 8 m, refugado 2 m ⇒ pendente 2 m.
- Refugo é opcional; quando registrado, exige motivo.

## Revenda

- Não existe produção; existe separação.
- Separação não deve disparar baixa de matéria-prima de produção.
- Indisponibilidade representa falta de estoque, não perda.
- A fórmula histórica RN031 (`solicitado − separado − indisponível`) permanece como fonte, mas o significado de “pedido atendido” quando existe indisponibilidade ainda precisa ser validado antes de codificar a conclusão automática do item.

## Prazos e atraso

- Prazo é opcional.
- Sem prazo: status de prazo = `SEM_PRAZO`, nunca atrasado.
- Prazo pode existir por item/setor e pode ser definido por gerente ou vendedor.
- Atraso só existe quando o prazo aplicável é conhecido e foi ultrapassado sem conclusão correspondente.

## Sincronização e atualização de quantidade solicitada

- Quantidade solicitada importada do Top Gerente continua sendo dado comercial de origem.
- Nova sincronização do mesmo pedido atualiza essa quantidade no app.
- Não apagar produção, perdas, ocorrências ou entregas já registradas.
- Se a nova quantidade solicitada ficar menor que o já executado/entregue, registrar divergência para tratamento explícito.
