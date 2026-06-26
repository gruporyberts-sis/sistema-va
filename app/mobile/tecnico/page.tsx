'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Tecnico = {
  id: string
  nombre_completo: string
  estado: string
}

type Servicio = {
  id: string
  tecnico_id: string
  cliente_id: string
  fecha_servicio: string
  hora_programada: string | null
  estado: string
  observacion: string | null
  created_at: string
  clientes_rybert_ruta?: {
    nombre_cliente: string
    direccion: string | null
    telefono: string | null
  } | null
}

type UbicacionGPS = {
  latitud: number | null
  longitud: number | null
  precision: number | null
}

const estados = [
  'Pendiente',
  'En camino',
  'Llegó',
  'En proceso',
  'Finalizado',
  'Cancelado',
]

export default function MobileTecnicoPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [actualizandoId, setActualizandoId] = useState<string | null>(null)
  const [mensajeGps, setMensajeGps] = useState('')

  useEffect(() => {
    cargarTecnicos()
  }, [])

  useEffect(() => {
    if (tecnicoId) {
      cargarServiciosTecnico(tecnicoId)
    } else {
      setServicios([])
    }
  }, [tecnicoId])

  async function cargarTecnicos() {
    const { data, error } = await supabase
      .from('tecnicos_rybert_ruta')
      .select('id, nombre_completo, estado')
      .eq('estado', 'Activo')
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error cargando técnicos:', error)
      alert(`Error cargando técnicos: ${error.message}`)
    } else {
      setTecnicos(data || [])
    }
  }

  async function cargarServiciosTecnico(id: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from('servicios_rybert_ruta')
      .select(`
        *,
        clientes_rybert_ruta (
          nombre_cliente,
          direccion,
          telefono
        )
      `)
      .eq('tecnico_id', id)
      .order('fecha_servicio', { ascending: true })
      .order('hora_programada', { ascending: true })

    if (error) {
      console.error('Error cargando servicios:', error)
      alert(`Error cargando servicios: ${error.message}`)
    } else {
      setServicios((data as Servicio[]) || [])
    }

    setLoading(false)
  }

  function obtenerUbicacionGPS(): Promise<UbicacionGPS> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          latitud: null,
          longitud: null,
          precision: null,
        })
        return
      }

      setMensajeGps('Solicitando ubicación GPS...')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
          })
        },
        (error) => {
          console.error('Error obteniendo GPS:', error)

          let mensaje = 'No se pudo obtener la ubicación GPS.'

          if (error.code === error.PERMISSION_DENIED) {
            mensaje = 'Permiso de ubicación denegado por el usuario.'
          }

          if (error.code === error.POSITION_UNAVAILABLE) {
            mensaje = 'La ubicación no está disponible en este momento.'
          }

          if (error.code === error.TIMEOUT) {
            mensaje = 'La solicitud de ubicación tardó demasiado.'
          }

          alert(`${mensaje} El cambio de estado se guardará sin GPS.`)

          resolve({
            latitud: null,
            longitud: null,
            precision: null,
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )
    })
  }

  async function cambiarEstado(servicio: Servicio, nuevoEstado: string) {
    if (servicio.estado === nuevoEstado) return

    setActualizandoId(servicio.id)
    setMensajeGps('Preparando cambio de estado...')

    const estadoAnterior = servicio.estado

    const ubicacion = await obtenerUbicacionGPS()

    setMensajeGps('Guardando cambio de estado...')

    const { error: errorServicio } = await supabase
      .from('servicios_rybert_ruta')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', servicio.id)

    if (errorServicio) {
      console.error('Error actualizando estado:', errorServicio)
      alert(`Error actualizando estado: ${errorServicio.message}`)
      setActualizandoId(null)
      setMensajeGps('')
      return
    }

    const { error: errorEvento } = await supabase
      .from('eventos_servicio_rybert_ruta')
      .insert({
        servicio_id: servicio.id,
        tecnico_id: servicio.tecnico_id,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        observacion:
          ubicacion.latitud !== null && ubicacion.longitud !== null
            ? `Cambio de estado desde móvil con GPS: ${estadoAnterior} → ${nuevoEstado}. Precisión aproximada: ${ubicacion.precision ?? 'N/D'} metros.`
            : `Cambio de estado desde móvil sin GPS: ${estadoAnterior} → ${nuevoEstado}`,
        fecha_hora: new Date().toISOString(),
      })

    if (errorEvento) {
      console.error('Error guardando historial:', errorEvento)
      alert(
        `El estado cambió, pero no se pudo guardar el historial: ${errorEvento.message}`
      )
    }

    if (tecnicoId) {
      await cargarServiciosTecnico(tecnicoId)
    }

    setActualizandoId(null)
    setMensajeGps('')
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
            Panel móvil del técnico
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Consulta tus servicios asignados, actualiza el estado y registra tu ubicación.
          </p>

          {mensajeGps && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
              {mensajeGps}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Selecciona técnico
          </label>

          <select
            value={tecnicoId}
            onChange={(e) => setTecnicoId(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Seleccione técnico</option>
            {tecnicos.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>
                {tecnico.nombre_completo}
              </option>
            ))}
          </select>
        </section>

        {!tecnicoId ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Selecciona un técnico para ver sus servicios.
          </section>
        ) : loading ? (
          <section className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500">
            Cargando servicios...
          </section>
        ) : servicios.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Este técnico no tiene servicios asignados.
          </section>
        ) : (
          <section className="space-y-4">
            {servicios.map((servicio) => (
              <div key={servicio.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {servicio.clientes_rybert_ruta?.nombre_cliente || 'Cliente'}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {servicio.clientes_rybert_ruta?.direccion || 'Sin dirección'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoClass(
                      servicio.estado
                    )}`}
                  >
                    {servicio.estado}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                  <div>
                    <strong>Fecha:</strong> {servicio.fecha_servicio}
                  </div>
                  <div>
                    <strong>Hora:</strong> {servicio.hora_programada || 'Sin hora'}
                  </div>
                  <div>
                    <strong>Teléfono:</strong>{' '}
                    {servicio.clientes_rybert_ruta?.telefono || '-'}
                  </div>
                  {servicio.observacion && (
                    <div className="mt-2">
                      <strong>Observación:</strong> {servicio.observacion}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {estados.map((estado) => (
                    <button
                      key={estado}
                      onClick={() => cambiarEstado(servicio, estado)}
                      disabled={actualizandoId === servicio.id || servicio.estado === estado}
                      className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {actualizandoId === servicio.id && servicio.estado !== estado
                        ? 'Actualizando...'
                        : estado}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Al cambiar el estado, el sistema intentará guardar la ubicación GPS.
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}