'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarHistorial()
  }, [])

  async function cargarHistorial() {
    setLoading(true)

    const { data, error } = await supabase
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

    if (error) {
      console.error('Error cargando historial:', error)
      alert(`Error cargando historial: ${error.message}`)
    } else {
      setEventos((data as EventoServicio[]) || [])
    }

    setLoading(false)
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
            Vista móvil para que el administrador revise los cambios realizados por los técnicos.
          </p>

          <button
            onClick={cargarHistorial}
            className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Actualizar historial
          </button>
        </section>

        {loading ? (
          <section className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500">
            Cargando historial...
          </section>
        ) : eventos.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No hay eventos registrados todavía.
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
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}