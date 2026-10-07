# Estratégia de subagentes

O proprietário do projeto autoriza o uso de subagentes sem necessidade de nova confirmação sempre que o ambiente oferecer esse recurso.

## Usar subagentes sempre que houver ganho real

- Exploração do código e levantamento de impacto.
- Investigação do schema legado.
- Revisão de domínio e regras de negócio.
- Revisão independente de segurança.
- Revisão de testes e cobertura.
- Revisão de frontend, responsividade e acessibilidade.
- Verificação final independente da implementação.
- Tarefas paralelizáveis sem dependência de escrita concorrente nos mesmos arquivos.

## Regras

- Um objetivo delimitado por subagente.
- O agente principal continua responsável por integrar os resultados.
- Evitar dois subagentes editando o mesmo arquivo simultaneamente.
- Para mudanças triviais e mecânicas de um único arquivo, não criar subagente só por ritual.
- Se a skill `tlc-spec-driven` definir um protocolo específico de workers/verifier, seguir o protocolo dela.
- O verifier deve ser independente do autor da alteração sempre que possível.

## Subagentes fornecidos

- `.opencode/agents/domain-reviewer.md`
- `.opencode/agents/integration-reviewer.md`
- `.opencode/agents/security-reviewer.md`
- `.opencode/agents/test-reviewer.md`
- `.opencode/agents/frontend-reviewer.md`
- `.opencode/agents/verifier.md`
