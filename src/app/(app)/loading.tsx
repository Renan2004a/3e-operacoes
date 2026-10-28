import { Spinner } from '@/shared/ui/spinner'

/**
 * Estado de carregamento das telas autenticadas. Aparece enquanto o servidor
 * resolve a sessão e os dados; evita a impressão de tela em branco em redes
 * lentas (a consulta ao banco pode levar alguns segundos).
 */
export default function AppLoading() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center p-6">
      <Spinner label="Carregando a tela…" />
    </div>
  )
}
