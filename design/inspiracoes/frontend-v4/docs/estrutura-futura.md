# Estrutura futura — referência

A camada visual atual não deve determinar a organização interna do backend.

Quando o backend JavaScript for iniciado, uma organização coerente com o monólito modular por domínio poderá evoluir para algo conceitualmente semelhante a:

src/
  modules/
    auth/
    pedidos/
    producao/
    expedicao/
    ocorrencias/
    usuarios/
    integracao/
    indicadores/
  shared/

Cada domínio deverá concentrar suas regras, serviços, acesso a dados e interface HTTP, evitando dependências desnecessárias entre módulos.

A definição concreta dependerá do framework JavaScript escolhido posteriormente.
