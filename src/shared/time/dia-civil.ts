import { APP_TIMEZONE } from './timezone'

/**
 * Formata um instante como o dia civil correspondente em `APP_TIMEZONE`, no
 * formato `YYYY-MM-DD` usado pelo `<input type="date">`. Instantes inválidos ou
 * ausentes devolvem string vazia (D2).
 *
 * O fuso é explícito: usar `toISOString().slice(0, 10)` deslocaria o dia para
 * prazos ancorados no fim do dia em São Paulo.
 */
export function diaCivilParaInput(valor: Date | string | null | undefined): string {
  const data = paraData(valor)
  if (!data) return ''

  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data)

  const obter = (tipo: 'year' | 'month' | 'day') =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''

  const ano = obter('year')
  const mes = obter('month')
  const dia = obter('day')
  if (!ano || !mes || !dia) return ''
  return `${ano}-${mes}-${dia}`
}

/**
 * Formata um instante como data civil brasileira (`dd/mm/aaaa`) em
 * `APP_TIMEZONE`. Ausente ou inválido devolve string vazia (D2).
 */
export function formatarDiaCivil(valor: Date | string | null | undefined): string {
  const iso = diaCivilParaInput(valor)
  if (iso === '') return ''

  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function paraData(valor: Date | string | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null
  const data = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}
