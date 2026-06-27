import Link from 'next/link'

export default function MobileMenuPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Rybert Ruta
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Menú móvil técnico
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Acceso operativo para que el técnico consulte servicios, cambie estados
            y registre ubicación GPS.
          </p>
        </section>

        <section>
          <Link
            href="/mobile/tecnico"
            className="block rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📲
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Panel del técnico
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ver servicios asignados, cambiar estado y guardar ubicación GPS.
                </p>

                <p className="mt-3 text-sm font-bold text-blue-600">
                  Entrar →
                </p>
              </div>
            </div>
          </Link>
        </section>

        <section className="rounded-3xl bg-white p-4 text-center text-xs text-slate-500 shadow-sm">
          Módulo móvil exclusivo para operación de técnicos en campo.
        </section>
      </div>
    </main>
  )
}