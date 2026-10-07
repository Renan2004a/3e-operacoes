export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 md:p-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide">3E Ferro e Aço</p>
        <h1 className="text-3xl font-semibold">3E Operações</h1>
      </header>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-medium">Projeto inicializado</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-700">
          O próximo passo recomendado é especificar a importação assíncrona de pedido por número usando o fluxo spec-driven.
        </p>
      </section>
    </main>
  )
}
