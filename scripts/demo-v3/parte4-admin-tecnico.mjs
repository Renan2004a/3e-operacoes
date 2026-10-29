// Parte 4 — Administração, Responsável Técnico, validações, responsividade
// e encerramento com pendências.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIR_VIDEO, gerarSrt, iniciar, sleep } from './framework.mjs'

const d = await iniciar('parte4-admin-tecnico')
const p = d.pagina

async function login(email, senha, titulo) {
  await contextoLimpo()
  await p.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 30000 })
  await d.narrar(titulo, 'Preenchendo as credenciais e entrando no sistema.', 3500)
  await d.preencher(p.getByLabel('E-mail'), email)
  await d.preencher(p.getByLabel('Senha'), senha)
  await d.clicar(p.getByRole('button', { name: 'Entrar', exact: true }), { espera: 2000 })
  await p.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

async function contextoLimpo() {
  await d.contexto.clearCookies()
  await d.ir('/login', 500)
}

try {
  await d.capitulo(
    '11',
    'Administração — usuários, setores e mapeamentos',
    'Cadastro de usuários, perfis, inativação, setores, de/para categoria→setor e regras.',
  )
  await login('admin@3e.local', 'admin123', 'Acesso do Responsável pelo Sistema')
  await d.ir('/admin/usuarios', 1500)
  await p.getByRole('heading', { level: 1, name: 'Usuários' }).waitFor({ timeout: 30000 })
  await p.waitForTimeout(1800)

  await d.narrar(
    'Administração de usuários',
    'O responsável cadastra usuários, associa perfis e setores e controla o acesso. Usuários não são excluídos: são inativados para preservar o histórico.',
    7500,
  )
  await d.narrar(
    'Perfis e setores',
    'Cada usuário pode ter mais de um perfil e mais de um setor. O Operador só vê a fila dos setores aos quais pertence.',
    6000,
  )

  await d.preencher(p.getByLabel('Nome'), 'Técnico Demonstração')
  await d.preencher(p.getByLabel('E-mail'), 'tecnico.demo@3e.local')
  await d.preencher(p.getByLabel('Senha'), '123')
  await d.clicar(p.getByRole('button', { name: 'Criar usuário' }), {
    espera: 800,
    titulo: 'Política de senha',
    texto: 'A senha precisa ter pelo menos 8 caracteres. A validação aparece antes de criar o usuário.',
  })
  await d.narrar('Senha curta', 'A mensagem explica o mínimo exigido e o formulário preserva os dados já preenchidos.', 4000)

  await d.preencher(p.getByLabel('Senha'), 'tecnico123')
  await d.clicar(p.getByLabel('Responsável Técnico'), { espera: 400, titulo: 'Perfil do usuário', texto: 'Selecionando o perfil Responsável Técnico.' })
  await d.clicar(p.getByRole('button', { name: 'Criar usuário' }), {
    espera: 1800,
    titulo: 'Criando o usuário',
    texto: 'O usuário é criado com a senha protegida por hash e já aparece na lista.',
  })
  await p.getByText('Usuário criado com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Usuário criado', 'A lista mostra nome, e-mail, perfil e situação. O novo usuário já pode acessar o sistema.', 5000)

  const inativar = p.getByRole('button', { name: 'Inativar usuário Técnico Demonstração' })
  await d.clicar(inativar, {
    espera: 700,
    titulo: 'Inativando o usuário',
    texto: 'A inativação bloqueia o acesso imediatamente e preserva pedidos, execuções e auditoria.',
  })
  await d.narrar('Confirmação em linha', 'O sistema pede confirmação com Confirmar e Cancelar, sem modal bloqueante.', 4000)
  await d.clicar(p.getByRole('button', { name: 'Confirmar inativação de Técnico Demonstração' }), {
    espera: 1600,
    titulo: 'Confirmando a inativação',
    texto: 'O status muda para Inativo e o login desse usuário passa a ser recusado.',
  })
  await p.getByText('Usuário inativado com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Usuário inativo', 'A conta continua vinculada ao histórico; para liberar novamente, basta ativar.', 4500)

  await d.clicar(p.getByRole('button', { name: 'Ativar usuário Técnico Demonstração' }), {
    espera: 600,
    titulo: 'Reativando',
    texto: 'A reativação é uma nova ação e também pede confirmação.',
  })
  await d.clicar(p.getByRole('button', { name: 'Confirmar ativação de Técnico Demonstração' }), {
    espera: 1600,
  })
  await p.getByText('Usuário ativado com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Usuário ativo', 'O acesso é restabelecido sem perder o vínculo com os registros anteriores.', 4000)

  await d.ir('/admin/setores', 1500)
  await p.getByRole('heading', { name: 'Setores e mapeamentos' }).waitFor({ timeout: 30000 })
  await d.narrar(
    'Setores e mapeamentos',
    'A categoria vem do Top Gerente. O mapeamento categoria→setor define para onde o item vai na importação e no desmembramento.',
    7000,
  )
  await d.narrar(
    'Regras produto→setor',
    'Além da categoria, regras por código ou descrição do produto sugerem o setor. A prioridade decide qual regra vale quando mais de uma casa.',
    7000,
  )

  const categoria = p.getByLabel('Categoria').first()
  await d.preencher(categoria, 'CATEGORIA_DEMO', { espera: 400 })
  await d.clicar(p.getByRole('button', { name: 'Buscar mapeamento' }), {
    espera: 1500,
    titulo: 'Consultando a categoria',
    texto: 'A busca mostra o setor atual da categoria ou informa que ainda não há mapeamento.',
  })
  await d.narrar('Categoria sem mapeamento', 'Como a categoria de demonstração ainda não existe, o formulário libera a escolha do setor.', 4500)

  const setorMapa = p.getByLabel('Setor', { exact: true }).first()
  await d.selecionar(setorMapa, { label: 'Telhas' }, { espera: 400 })
  await d.clicar(p.getByRole('button', { name: 'Salvar mapeamento' }), {
    espera: 1600,
    titulo: 'Criando o mapeamento',
    texto: 'Ao salvar, a categoria passa a apontar para Telhas nas próximas importações.',
  })
  await d.narrar('Mapeamento salvo', 'A tabela de mapeamentos é atualizada e passa a listar CATEGORIA_DEMO → Telhas.', 5000)

  await d.selecionar(setorMapa, { label: 'Corte e Dobra' }, { espera: 400 })
  await d.clicar(p.getByRole('button', { name: 'Salvar mapeamento' }), {
    espera: 1500,
    titulo: 'Atualizando o mapeamento',
    texto: 'Salvar novamente atualiza o setor da mesma categoria, sem duplicar a linha.',
  })
  await d.narrar('De/para atualizado', 'O mapeamento é único por categoria; a alteração fica registrada para as próximas importações.', 4500)

  await d.capitulo(
    '12',
    'Responsável Técnico — integração',
    'Jobs, eventos, tentativas, erros e reprocessamento.',
  )
  await login('tecnico.demo@3e.local', 'tecnico123', 'Acesso do Responsável Técnico')
  await p.getByRole('heading', { name: 'Integração' }).waitFor({ timeout: 30000 })
  await p.waitForTimeout(2000)
  await d.narrar(
    'Integração',
    'O responsável técnico acompanha os jobs de importação: status, tentativas, código de erro e eventos.',
    6500,
  )

  const job = p.getByRole('button', { name: /Pedido / }).first()
  if ((await job.count()) > 0) {
    await d.clicar(job, {
      espera: 1600,
      titulo: 'Abrindo um job',
      texto: 'Ao selecionar o job, o painel mostra a linha do tempo: solicitado, despachado, tentativas e conclusão ou falha.',
    })
    await d.narrar(
      'Eventos do job',
      'Esses eventos ajudam a diagnosticar falhas do conector sem expor senhas ou o payload comercial.',
      6000,
    )
  }

  await d.ir('/integracao', 1500)
  await d.narrar(
    'Importação pelo Técnico',
    'O perfil técnico também pode solicitar uma importação e acompanhar o andamento pelo mesmo fluxo.',
    5000,
  )

  await d.capitulo(
    '13',
    'Validações, permissões e responsividade',
    'Página inexistente, bloqueio por perfil e uso em celular/tablet.',
  )
  await d.ir('/rota-inexistente', 1200)
  await d.narrar(
    'Página não encontrada',
    'Endereços inválidos mostram uma página amigável em português, com caminho de volta, em vez da tela padrão do servidor.',
    5000,
  )

  await p.goto('http://localhost:3000/admin/usuarios', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2200)
  await d.reaplicar()
  await d.narrar(
    'Permissões no servidor',
    'O Responsável Técnico não gerencia usuários: a API responde 403 e a tela informa que não foi possível carregar. O menu também não oferece a área.',
    6500,
  )

  await login('vendedor@3e.local', 'vendedor123', 'Responsividade — Vendedor')
  await p.setViewportSize({ width: 390, height: 844 })
  await d.reaplicar()
  await p.waitForTimeout(1500)
  await d.narrar(
    'Celular — lista',
    'Em 390 px, a tabela vira cartões: pedido, cliente, previsão, status e ação ficam empilhados e legíveis.',
    6500,
  )
  const abrir = p.getByRole('button', { name: /Abrir pedido/ }).first()
  await d.clicar(abrir, {
    espera: 2000,
    titulo: 'Celular — detalhe',
    texto: 'No detalhe, os valores e os itens continuam acessíveis; o menu vira o botão lateral.',
  })
  await p.waitForTimeout(1200)
  await d.narrar('Toque e leitura', 'Os alvos de toque são grandes e o texto quebra linha sem rolagem horizontal da página.', 5000)
  await p.setViewportSize({ width: 1920, height: 1080 })
  await d.reaplicar()

  await d.capitulo(
    '14',
    'Encerramento e pendências',
    'Resumo do que foi demonstrado e limitações conhecidas.',
  )
  await d.narrar(
    'Resumo',
    'Foram demonstrados os seis perfis, a consulta e o detalhe dos pedidos, prazos com auditoria, desmembramento, produção, ocorrências, remessas, entregas, exceções, administração, integração e impressão.',
    8000,
  )
  await d.narrar(
    'Pendências funcionais',
    'Ainda dependem de decisão: cancelamento lógico de item, regra de Revenda com indisponibilidade, quem confirma remessas e como tratar divergências. A tela de histórico de entregas ainda não existe, embora a API esteja disponível.',
    9000,
  )
  await d.narrar(
    'Próximo capítulo',
    'No capítulo seguinte, o banco de dados no DBeaver: conexão, tabelas, relacionamentos, consultas e a conferência dos registros criados nesta demonstração.',
    7000,
  )
} finally {
  const video = await d.finalizar('parte4-admin-tecnico')
  writeFileSync(join(DIR_VIDEO, 'parte4-admin-tecnico.srt'), gerarSrt(d.estado.narracao), 'utf8')
  console.log('Parte 4 salva em:', video)
}
