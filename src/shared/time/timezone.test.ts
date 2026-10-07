import { describe, expect, it } from 'vitest'
import { APP_TIMEZONE } from './timezone'

describe('APP_TIMEZONE', () => {
  it('usa America/Sao_Paulo como padrão', () => {
    expect(APP_TIMEZONE).toBe('America/Sao_Paulo')
  })
})
