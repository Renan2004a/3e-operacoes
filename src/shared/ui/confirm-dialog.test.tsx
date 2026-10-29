// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { ConfirmDialog } from './confirm-dialog'

afterEach(cleanup)

function renderizar(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      open
      title="Confirmar entrega?"
      confirmLabel="Confirmar entrega"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      Resumo da ação.
    </ConfirmDialog>,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('não renderiza nada quando fechado', () => {
    renderizar({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('expõe um diálogo modal nomeado pelo título e descrito pelo conteúdo', () => {
    renderizar()

    const dialogo = screen.getByRole('dialog', { name: 'Confirmar entrega?' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleDescription('Resumo da ação.')
  })

  it('começa com o foco em Cancelar, a opção segura para uma ação irreversível', () => {
    renderizar()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirma e cancela pelos botões', () => {
    const { onConfirm, onCancel } = renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancela com a tecla Esc', () => {
    const { onCancel, onConfirm } = renderizar()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('mantém o foco dentro do diálogo ao percorrer com Tab', () => {
    renderizar()
    const cancelar = screen.getByRole('button', { name: 'Cancelar' })
    const confirmar = screen.getByRole('button', { name: 'Confirmar entrega' })

    confirmar.focus()
    fireEvent.keyDown(confirmar, { key: 'Tab' })
    expect(cancelar).toHaveFocus()

    fireEvent.keyDown(cancelar, { key: 'Tab', shiftKey: true })
    expect(confirmar).toHaveFocus()
  })

  it('durante o envio desabilita os botões, ignora Esc e mostra o texto de andamento', () => {
    const { onCancel } = renderizar({ busy: true, busyLabel: 'Registrando…' })

    expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('devolve o foco ao elemento que o abriu ao fechar', () => {
    function Exemplo({ aberto }: { aberto: boolean }) {
      return (
        <>
          <button>Abrir</button>
          <ConfirmDialog
            open={aberto}
            title="Título"
            confirmLabel="Ok"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          >
            Texto
          </ConfirmDialog>
        </>
      )
    }
    const { rerender } = render(<Exemplo aberto={false} />)
    screen.getByRole('button', { name: 'Abrir' }).focus()

    rerender(<Exemplo aberto />)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    rerender(<Exemplo aberto={false} />)
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })
})
