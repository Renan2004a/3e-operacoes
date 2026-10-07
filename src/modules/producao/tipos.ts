/** Situação da atividade (design.md): PENDING → IN_PROGRESS → PAUSED/COMPLETED; DIVERGENT quando ultrapassa. */
export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'DIVERGENT'
