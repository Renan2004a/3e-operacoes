// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Progress } from './progress'

afterEach(cleanup)

describe('Progress', () => {
  it('exibe percentual com vírgula e até 1 casa decimal', () => {
    render(<Progress label="Execução" value={66.67} />)

    expect(screen.getByText('66,7%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Execução' })).toHaveAttribute(
      'aria-valuenow',
      '66.7',
    )
  })

  it('mantém inteiro quando não há fração', () => {
    render(<Progress label="Execução" value={50} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('limita valores fora da faixa', () => {
    render(<Progress label="Execução" value={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
