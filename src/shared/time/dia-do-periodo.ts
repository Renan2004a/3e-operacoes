import { APP_TIMEZONE } from './timezone'

const DATA_SOMENTE_DIA = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Deslocamento, em milissegundos, do fuso `APP_TIMEZONE` em relação ao UTC no
 * instante informado. Calculado pelo próprio fuso, para respeitar o horário de
 * verão vigente na data (ex.: São Paulo até 2019).
 */
function deslocamentoDoFuso(instante: number): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instante))

  const valores = Object.fromEntries(
    partes
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, Number(parte.value)]),
  )
  const comoUtc = Date.UTC(
    valores.year,
    valores.month - 1,
    valores.day,
    valores.hour,
    valores.minute,
    valores.second,
  )
  return comoUtc - Math.floor(instante / 1000) * 1000
}

/**
 * Instante em que começa o dia civil `YYYY-MM-DD` no fuso `APP_TIMEZONE`.
 * Acrescenta `diasAdicionais` dias ao calendário antes de calcular, para obter
 * o início do dia seguinte. Retorna `null` quando o texto não é uma data real.
 */
export function inicioDoDiaNoFuso(valor: string, diasAdicionais = 0): Date | null {
  const casamento = DATA_SOMENTE_DIA.exec(valor.trim())
  if (!casamento) return null

  const [ano, mes, dia] = [casamento[1], casamento[2], casamento[3]].map(Number)
  const original = new Date(Date.UTC(ano, mes - 1, dia))
  if (original.getUTCDate() !== dia || original.getUTCMonth() !== mes - 1) return null

  const inicioComoUtc = Date.UTC(ano, mes - 1, dia + diasAdicionais)
  const primeiroDeslocamento = deslocamentoDoFuso(inicioComoUtc)
  const primeiroInstante = inicioComoUtc - primeiroDeslocamento
  const segundoDeslocamento = deslocamentoDoFuso(primeiroInstante)
  return new Date(
    segundoDeslocamento === primeiroDeslocamento
      ? primeiroInstante
      : inicioComoUtc - segundoDeslocamento,
  )
}

/**
 * Texto `YYYY-MM-DD` do dia civil deslocado em `dias` dias, ou `null` quando o
 * texto não é uma data real. Calculado no calendário UTC para não sofrer
 * influência de fuso.
 */
function diaCivilDeslocado(valor: string, dias: number): string | null {
  const casamento = DATA_SOMENTE_DIA.exec(valor.trim())
  if (!casamento) return null

  const [ano, mes, dia] = [casamento[1], casamento[2], casamento[3]].map(Number)
  const original = new Date(Date.UTC(ano, mes - 1, dia))
  if (original.getUTCDate() !== dia || original.getUTCMonth() !== mes - 1) return null

  const deslocado = new Date(Date.UTC(ano, mes - 1, dia + dias))
  const mesTexto = String(deslocado.getUTCMonth() + 1).padStart(2, '0')
  const diaTexto = String(deslocado.getUTCDate()).padStart(2, '0')
  return `${deslocado.getUTCFullYear()}-${mesTexto}-${diaTexto}`
}

/**
 * Instante do último milissegundo do dia civil `YYYY-MM-DD` no fuso
 * `APP_TIMEZONE` (D2). É o fim do dia, não a meia-noite: um prazo para hoje só
 * fica atrasado depois que o dia termina. Retorna `null` quando o texto não é
 * uma data real.
 *
 * O início do dia seguinte é calculado a partir do **dia civil seguinte**, e
 * não somando 24 horas, para respeitar dias com horário de verão (23h ou 25h).
 */
export function fimDoDiaNoFuso(valor: string): Date | null {
  const seguinte = diaCivilDeslocado(valor, 1)
  if (!seguinte) return null

  const inicioDoSeguinte = inicioDoDiaNoFuso(seguinte)
  if (!inicioDoSeguinte) return null
  return new Date(inicioDoSeguinte.getTime() - 1)
}
