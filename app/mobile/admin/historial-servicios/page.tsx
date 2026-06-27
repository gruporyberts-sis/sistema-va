'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Tecnico = {
  id: string
  nombre_completo: string
  telefono: string | null
  estado: string
}

type EventoServicio = {
  id: string
  servicio_id: string
  tecnico_id: string
  estado_anterior: string | null
  estado_nuevo: string
  latitud: number | null
  longitud: number | null
  observacion: string | null
  fecha_hora: string
  created_at: string
  tecnicos_rybert_ruta?: {
    nombre_completo: string
    telefono: string | null
  } | null
  servicios_rybert_ruta?: {
    fecha_servicio: string
    hora_programada: string | null
    clientes_rybert_ruta?: {
      nombre_cliente: string
      direccion: string | null
      telefono: string | null
    } | null
  } | null
}

export default function HistorialServiciosMobileAdminPage() {
  const [eventos, setEventos] = useState<EventoServicio[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])

  const [tecnicoFiltro, setTecnicoFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarTecnicos()
    cargarHistorial({
      tecnicoId: '',
      desde: '',
      hasta: '',
    })
  }, [])

  async function cargarTecnicos() {
    const { data, error } = await supabase
      .from('tecnicos_rybert_ruta')
      .select('id, nombre_completo, telefono, estado')
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error cargando técnicos:', error)
      alert(`Error cargando técnicos: ${error.message}`)
    } else {
      setTecnicos(data || [])
    }
  }

  async function cargarHistorial(filtros: {
    tecnicoId: string
    desde: string
    hasta: string
  }) {
    setLoading(true)

    let query = supabase
      .from('eventos_servicio_rybert_ruta')
      .select(`
        *,
        tecnicos_rybert_ruta (
          nombre_completo,
          telefono
        ),
        servicios_rybert_ruta (
          fecha_servicio,
          hora_programada,
          clientes_rybert_ruta (
            nombre_cliente,
            direccion,
            telefono
          )
        )
      `)
      .order('fecha_hora', { ascending: false })

    if (filtros.tecnicoId) {
      query = query.eq('tecnico_id', filtros.tecnicoId)
    }

    if (filtros.desde) {
      query = query.gte('fecha_hora', `${filtros.desde}T00:00:00`)
    }

    if (filtros.hasta) {
      query = query.lte('fecha_hora', `${filtros.hasta}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando historial:', error)
      alert(`Error cargando historial: ${error.message}`)
    } else {
      setEventos((data as EventoServicio[]) || [])
    }

    setLoading(false)
  }

  function aplicarFiltros() {
    cargarHistorial({
      tecnicoId: tecnicoFiltro,
      desde: fechaDesde,
      hasta: fechaHasta,
    })
  }

  function limpiarFiltros() {
    setTecnicoFiltro('')
    setFechaDesde('')
    setFechaHasta('')

    cargarHistorial({
      tecnicoId: '',
      desde: '',
      hasta: '',
    })
  }

  function formatearFecha(fecha: string) {
    const date = new Date(fecha)

    return date.toLocaleString('es-DO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  function estadoClass(estado: string) {
    if (estado === 'Pendiente') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    if (estado === 'En camino') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (estado === 'Llegó') return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    if (estado === 'En proceso') return 'bg-purple-50 text-purple-700 border-purple-200'
    if (estado === 'Finalizado') return 'bg-green-50 text-green-700 border-green-200'
    if (estado === 'Cancelado') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Rybert Ruta
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Historial de servicios
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Vista móvil para revisar los cambios realizados por los técnicos.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Filtrar por técnico
              </label>

              <select
                value={tecnicoFiltro}
                onChange={(e) => setTecnicoFiltro(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Desde
                </label>

                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Hasta
                </label>

                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={aplicarFiltros}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Aplicar filtros
            </button>

            <button
              onClick={limpiarFiltros}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">
            Eventos encontrados: {eventos.length}
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500">
            Cargando historial...
          </section>
        ) : eventos.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No hay eventos registrados para este filtro.
          </section>
        ) : (
          <section className="space-y-4">
            {eventos.map((evento) => (
              <article key={evento.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {evento.tecnicos_rybert_ruta?.nombre_completo || 'Técnico'}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatearFecha(evento.fecha_hora)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoClass(
                      evento.estado_nuevo
                    )}`}
                  >
                    {evento.estado_nuevo}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                  <div>
                    <strong>Cliente:</strong>{' '}
                    {evento.servicios_rybert_ruta?.clientes_rybert_ruta
                      ?.nombre_cliente || '-'}
                  </div>

                  <div className="mt-1">
                    <strong>Dirección:</strong>{' '}
                    {evento.servicios_rybert_ruta?.clientes_rybert_ruta
                      ?.direccion || '-'}
                  </div>

                  <div className="mt-1">
                    <strong>Tel. cliente:</strong>{' '}
                    {evento.servicios_rybert_ruta?.clientes_rybert_ruta
                      ?.telefono || '-'}
                  </div>

                  <div className="mt-1">
                    <strong>Fecha servicio:</strong>{' '}
                    {evento.servicios_rybert_ruta?.fecha_servicio || '-'}
                  </div>

                  <div className="mt-1">
                    <strong>Hora:</strong>{' '}
                    {evento.servicios_rybert_ruta?.hora_programada || 'Sin hora'}
                  </div>

                  <div className="mt-1">
                    <strong>Tel. técnico:</strong>{' '}
                    {evento.tecnicos_rybert_ruta?.telefono || '-'}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Estado anterior
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {evento.estado_anterior || '-'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Estado nuevo
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {evento.estado_nuevo}
                    </p>
                  </div>
                </div>

                {evento.observacion && (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-3 text-sm text-slate-600">
                    <strong>Observación:</strong> {evento.observacion}
                  </div>
                )}

                <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs text-blue-700">
                  <div>
                    <strong>Ubicación:</strong>{' '}
                    {evento.latitud !== null && evento.longitud !== null
                      ? `${evento.latitud}, ${evento.longitud}`
                      : 'Pendiente de GPS'}
                  </div>

                  {evento.latitud !== null && evento.longitud !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${evento.latitud},${evento.longitud}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-bold text-white"
                    >
                      Ver ubicación en Google Maps
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}