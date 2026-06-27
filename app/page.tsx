import Link from 'next/link'

const modulos = [
  {
    titulo: 'Técnicos',
    descripcion: 'Registro y mantenimiento de técnicos.',
    href: '/tecnicos',
    icono: '👷',
  },
  {
    titulo: 'Clientes / Destinos',
    descripcion: 'Clientes y lugares donde se realizan servicios.',
    href: '/clientes',
    icono: '📍',
  },
  {
    titulo: 'Servicios / Rutas',
    descripcion: 'Asignación de servicios a técnicos.',
    href: '/servicios',
    icono: '🛠️',
  },
  {
    titulo: 'Historial administrador',
    descripcion: 'Supervisión de eventos, GPS, filtros por técnico y fecha.',
    href: '/mobile/admin/historial-servicios',
    icono: '🗺️',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Sistema de control operativo
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                Rybert Ruta
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500 md:text-base">
                Control administrativo de técnicos, clientes, servicios, rutas
                asignadas, historial de eventos y ubicación GPS.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-5 py-4 text-blue-700">
              <div className="text-sm font-medium">Estado del sistema</div>
              <div className="mt-1 text-2xl font-bold">Activo</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Menú administrativo
          </h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modulos.map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl transition group-hover:bg-blue-50">
                  {modulo.icono}
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {modulo.titulo}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {modulo.descripcion}
                </p>

                <div className="mt-5 text-sm font-semibold text-blue-600">
                  Entrar →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Flujo administrativo
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-800">
                1. Registrar técnicos
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Crear el personal operativo disponible.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-800">
                2. Registrar clientes
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Crear los destinos donde se realizarán los servicios.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-800">
                3. Asignar servicios
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Relacionar técnico, cliente, fecha, hora y estado.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-800">
                4. Supervisar historial
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Revisar cambios de estado, filtros y ubicación GPS.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-blue-900">
            Supervisión con GPS
          </h2>

          <p className="mt-2 text-sm text-blue-700">
            El administrador puede revisar los eventos registrados por los técnicos,
            filtrar por técnico y fecha, y abrir la ubicación GPS en Google Maps.
          </p>

          <Link
            href="/mobile/admin/historial-servicios"
            className="mt-4 inline-block rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Ver historial administrador →
          </Link>
        </section>
      </div>
    </main>
  )
}