/**
 * Limitador de tentativas de login por identificador (IP + e-mail) e por IP.
 *
 * O sistema roda em uma única instância no Railway; um contador em memória é
 * suficiente para frear força bruta e não exige tabela nova. Se o app passar a
 * rodar em várias réplicas, trocar por Redis/tabela — o contrato é o mesmo.
 *
 * Regras: após `maxFalhas` falhas dentro da `janelaMs`, o identificador fica
 * bloqueado por `bloqueioMs`. Um login bem-sucedido limpa o histórico.
 */
export interface OpcoesLimitador {
  maxFalhas?: number
  janelaMs?: number
  bloqueioMs?: number
  agora?: () => number
}

interface Registro {
  falhas: number
  primeiraFalhaEm: number
  bloqueadoAte: number | null
}

export interface VerificacaoLimite {
  bloqueado: boolean
  /** Tempo restante de bloqueio em milissegundos (0 quando liberado). */
  restanteMs: number
}

export class LimitadorTentativas {
  private readonly maxFalhas: number
  private readonly janelaMs: number
  private readonly bloqueioMs: number
  private readonly agora: () => number
  private readonly registros = new Map<string, Registro>()

  constructor(opcoes: OpcoesLimitador = {}) {
    this.maxFalhas = opcoes.maxFalhas ?? 5
    this.janelaMs = opcoes.janelaMs ?? 15 * 60 * 1000
    this.bloqueioMs = opcoes.bloqueioMs ?? 15 * 60 * 1000
    this.agora = opcoes.agora ?? (() => Date.now())
  }

  /** Indica se a chave está bloqueada neste instante. */
  verificar(chave: string): VerificacaoLimite {
    const registro = this.registros.get(chave)
    if (!registro) return { bloqueado: false, restanteMs: 0 }

    const agora = this.agora()
    if (registro.bloqueadoAte !== null) {
      if (registro.bloqueadoAte > agora) {
        return { bloqueado: true, restanteMs: registro.bloqueadoAte - agora }
      }
      // Bloqueio vencido: recomeça a contagem.
      this.registros.delete(chave)
      return { bloqueado: false, restanteMs: 0 }
    }

    if (agora - registro.primeiraFalhaEm > this.janelaMs) {
      this.registros.delete(chave)
    }
    return { bloqueado: false, restanteMs: 0 }
  }

  /** Registra uma falha e bloqueia quando o limite é atingido. */
  registrarFalha(chave: string): void {
    const agora = this.agora()
    const atual = this.registros.get(chave)

    if (!atual || agora - atual.primeiraFalhaEm > this.janelaMs) {
      this.registros.set(chave, { falhas: 1, primeiraFalhaEm: agora, bloqueadoAte: null })
      return
    }

    const falhas = atual.falhas + 1
    this.registros.set(chave, {
      falhas,
      primeiraFalhaEm: atual.primeiraFalhaEm,
      bloqueadoAte: falhas >= this.maxFalhas ? agora + this.bloqueioMs : null,
    })
  }

  /** Zera o histórico da chave (login bem-sucedido). */
  limpar(chave: string): void {
    this.registros.delete(chave)
  }

  /** Remove registros antigos para não crescer indefinidamente. */
  limparExpirados(): void {
    const agora = this.agora()
    for (const [chave, registro] of this.registros) {
      const expirado =
        registro.bloqueadoAte !== null
          ? registro.bloqueadoAte <= agora
          : agora - registro.primeiraFalhaEm > this.janelaMs
      if (expirado) this.registros.delete(chave)
    }
  }
}
