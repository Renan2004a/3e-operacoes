// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardTitle } from './card'
import { EmptyState } from './empty-state'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'

afterEach(cleanup)

describe('Button', () => {
  it('renderiza o rótulo e dispara onClick, com type=button por padrão (FE-03)', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Salvar</Button>)

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('desabilitado não dispara onClick (FE-14)', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('expõe foco visível no próprio botão (QF-04)', () => {
    render(<Button>Salvar</Button>)

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass(
      'focus-visible:ring-2',
      'focus-visible:ring-accent',
    )
  })
})

describe('Field + Input', () => {
  it('associa o rótulo ao controle (FE-03)', () => {
    render(
      <Field label="E-mail">
        {(props) => <Input type="email" {...props} />}
      </Field>,
    )

    expect(screen.getByLabelText('E-mail')).toBeInstanceOf(HTMLInputElement)
  })

  it('liga a dica ao controle por aria-describedby (FE-03)', () => {
    render(
      <Field label="Quantidade" hint="Somente números">
        {(props) => <Input {...props} />}
      </Field>,
    )

    const input = screen.getByLabelText('Quantidade')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Somente números')
  })

  it('exibe o erro em role=alert, marca aria-invalid e liga ao controle (FE-14)', () => {
    render(
      <Field label="Quantidade" error="Quantidade inválida">
        {(props) => <Input {...props} />}
      </Field>,
    )

    const input = screen.getByLabelText('Quantidade')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Quantidade inválida')
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('expõe foco visível no campo (QF-04)', () => {
    render(
      <Field label="E-mail">
        {(props) => <Input type="email" {...props} />}
      </Field>,
    )

    expect(screen.getByLabelText('E-mail')).toHaveClass('focus-visible:ring-2')
  })
})

describe('Card', () => {
  it('renderiza título e conteúdo', () => {
    render(
      <Card>
        <CardTitle>Atividade</CardTitle>
        <p>Conteúdo</p>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'Atividade' })).toBeInTheDocument()
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('sempre acompanha texto, sem depender apenas de cor (FE-06)', () => {
    render(<Badge variant="success">Concluída</Badge>)

    expect(screen.getByText('Concluída')).toBeInTheDocument()
  })
})

describe('Spinner', () => {
  it('expõe role=status com o texto de carregamento (FE-08)', () => {
    render(<Spinner />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
  })
})

describe('EmptyState', () => {
  it('mostra título e descrição em região de status (FE-08)', () => {
    render(<EmptyState title="Sem atividades" description="Nada na fila" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Sem atividades')
    expect(status).toHaveTextContent('Nada na fila')
  })
})

describe('Alert', () => {
  it('erro usa role=alert e a ação de tentar de novo funciona (FE-14)', () => {
    const onRetry = vi.fn()
    render(
      <Alert
        variant="error"
        title="Falha ao carregar"
        action={<Button onClick={onRetry}>Tentar de novo</Button>}
      >
        Verifique a conexão.
      </Alert>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('informação anuncia em role=status, com texto e sem depender de cor (QF-05, QF-06)', () => {
    render(
      <Alert variant="info" title="Pedido sem itens">
        Este pedido não possui itens.
      </Alert>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Pedido sem itens')
    expect(status).toHaveTextContent('Este pedido não possui itens.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
