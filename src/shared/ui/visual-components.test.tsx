// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Badge } from './badge'
import { Metric } from './metric'
import { PageHead } from './page-head'

afterEach(cleanup)

describe('Metric', () => {
  it('mostra rótulo, valor e texto auxiliar (VIS-07)', () => {
    render(<Metric label="Pendências" value={2} helper="Atividades não concluídas." />)

    expect(screen.getByText('Pendências')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Atividades não concluídas.')).toBeInTheDocument()
  })

  it('omite o texto auxiliar quando não informado (VIS-07)', () => {
    render(<Metric label="Pendências" value={2} />)

    expect(screen.getByText('Pendências')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('Atividades não concluídas.')).not.toBeInTheDocument()
  })

  it('aplica o tom ao valor, sem esconder o texto (VIS-07)', () => {
    render(<Metric label="No prazo" value="75%" tone="success" />)

    expect(screen.getByText('75%')).toHaveClass('text-success')
  })
})

describe('PageHead', () => {
  it('renderiza o título da página como cabeçalho de nível 1 (VIS-07)', () => {
    render(<PageHead title="Pedidos" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
  })

  it('mostra a descrição e as ações quando informadas (VIS-07)', () => {
    render(
      <PageHead
        title="Pedidos"
        description="Consulte e abra o detalhe dos pedidos."
        actions={<button type="button">Novo</button>}
      />,
    )

    expect(screen.getByText('Consulte e abra o detalhe dos pedidos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('comunica o estado por texto e cor, sem depender só da cor (VIS-08)', () => {
    render(<Badge variant="success">Concluída</Badge>)

    const badge = screen.getByText('Concluída')
    expect(badge).toHaveClass('text-success')
    expect(badge).toHaveClass('bg-success-bg')
  })
})
