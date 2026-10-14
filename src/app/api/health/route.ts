/**
 * GET /api/health — verificação de saúde usada pela plataforma de deploy
 * (healthcheck) e pelo checklist de operação. Não exige autenticação.
 */
export function GET() {
  return Response.json(
    { status: 'ok', app: '3e-operacoes', time: new Date().toISOString() },
    { status: 200 },
  )
}
