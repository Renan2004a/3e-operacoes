'use client'

import { useCallback, useEffect, useState } from 'react'
import { TIPOS_COM_MOTIVO, type TipoOcorrencia } from '@/modules/ocorrencias/motivos'
import { apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from './alert'
import { Button } from './button'
import { Field } from './field'
import { Input } from './input'

const TIPOS: { valor: TipoOcorrencia; rotulo: string }[] = [
  { valor: 'PERDA', rotulo: 'Perda' },
  { valor: 'REFUGO', rotulo: 'Refugo' },
  { valor: 'INDISPONIBILIDADE', rotulo: 'Indisponibilidade' },
  { valor: 'PAUSA', rotulo: 'Pausa' },
  { valor: 'PARADA', rotulo: 'Parada' },
  { valor: 'DEFEITO', rotulo: 'Defeito' },
]

interface Motivo {
  id: string
  tipo: TipoOcorrencia
  codigo: string
  descricao: string
  ativo: boolean
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

export interface OcorrenciaFormProps {
  atividadeId: string
  onRegistrada?: () => void
}

/**
 * Formulário de ocorrência (FE-11, FE-12). O motivo vem da lista fechada da API
 * e é obrigatório para perda, refugo e indisponibilidade.
 */
export function OcorrenciaForm({ atividadeId, onRegistrada }: OcorrenciaFormProps) {
  const [tipo, setTipo] = useState<TipoOcorrencia>('PERDA')
  const [motivoId, setMotivoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [erroMotivos, setErroMotivos] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const exigeMotivo = TIPOS_COM_MOTIVO.includes(tipo)

  const carregarMotivos = useCallback(
    () =>
      apiGet<{ motivos: Motivo[] }>(`/api/motivos?tipo=${tipo}`)
        .then((dados) => {
          setMotivos(dados.motivos)
          setErroMotivos(false)
        })
        .catch(() => setErroMotivos(true)),
    [tipo],
  )

  useEffect(() => {
    if (!TIPOS_COM_MOTIVO.includes(tipo)) return
    void carregarMotivos()
  }, [tipo, carregarMotivos])

  function trocarTipo(novo: TipoOcorrencia) {
    setTipo(novo)
    setMotivoId('')
    setErro(null)
    if (!TIPOS_COM_MOTIVO.includes(novo)) {
      setMotivos([])
      setErroMotivos(false)
    }
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setSucesso(false)

    if (exigeMotivo && motivoId === '') {
      setErro('Escolha o motivo para registrar a ocorrência.')
      return
    }

    setEnviando(true)
    try {
      await apiPost(`/api/producao/atividades/${atividadeId}/ocorrencias`, {
        tipo,
        motivoId: exigeMotivo ? motivoId : undefined,
        quantidade: quantidade.trim() === '' ? undefined : quantidade,
        observacao: observacao.trim() === '' ? undefined : observacao,
      })
      setSucesso(true)
      setMotivoId('')
      setQuantidade('')
      setObservacao('')
      onRegistrada?.()
    } catch {
      setErro('Não foi possível registrar a ocorrência. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="grid gap-4" onSubmit={aoEnviar} noValidate>
      {sucesso ? (
        <Alert variant="success" title="Ocorrência registrada">
          O registro foi salvo com sucesso.
        </Alert>
      ) : null}

      {erro ? (
        <Alert variant="error" title="Não foi possível registrar">
          {erro}
        </Alert>
      ) : null}

      <Field label="Tipo de ocorrência" required>
        {(props) => (
          <select
            id={props.id}
            aria-describedby={props['aria-describedby']}
            aria-invalid={props.invalid || undefined}
            className={CLASSE_SELECT}
            value={tipo}
            onChange={(evento) => trocarTipo(evento.target.value as TipoOcorrencia)}
          >
            {TIPOS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        )}
      </Field>

      {exigeMotivo ? (
        <Field label="Motivo" required>
          {(props) => (
            <select
              id={props.id}
              aria-describedby={props['aria-describedby']}
              aria-invalid={props.invalid || undefined}
              className={CLASSE_SELECT}
              value={motivoId}
              onChange={(evento) => setMotivoId(evento.target.value)}
            >
              <option value="">Selecione…</option>
              {motivos.map((motivo) => (
                <option key={motivo.id} value={motivo.id}>
                  {motivo.descricao}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : null}

      {erroMotivos ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os motivos"
          action={<Button onClick={() => void carregarMotivos()}>Tentar de novo</Button>}
        >
          Tente novamente para escolher um motivo.
        </Alert>
      ) : null}

      <Field label="Quantidade" hint="Opcional, quando houver perda/refugo em quantidade.">
        {(props) => (
          <Input
            {...props}
            type="number"
            inputMode="decimal"
            min="0"
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
          />
        )}
      </Field>

      <Field label="Observação">
        {(props) => (
          <textarea
            id={props.id}
            aria-describedby={props['aria-describedby']}
            className="min-h-24 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink"
            value={observacao}
            onChange={(evento) => setObservacao(evento.target.value)}
          />
        )}
      </Field>

      <Button type="submit" disabled={enviando}>
        {enviando ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}
