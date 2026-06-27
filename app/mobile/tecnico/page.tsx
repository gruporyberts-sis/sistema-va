'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Tecnico = {
  id: string
  nombre_completo: string
  telefono: string | null
  correo: string | null
  estado: string
  codigo_acceso: string | null
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
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])

  const [telefonoLogin, setTelefonoLogin] = useState('')
  const [codigoLogin, setCodigoLogin] = useState('')

  const [loading, setLoading] = useState(false)
  const [validando, setValidando] = useState(false)
  const [actualizandoId, setActualizandoId] = useState<string | null>(null)
  const [mensajeGps, setMensajeGps] = useState('')

  useEffect(() => {
    const tecnicoGuardado = localStorage.getItem('rybert_tecnico')

    if (tecnicoGuardado) {
      try {
        const tecnicoParseado = JSON.parse(tecnicoGuardado) as Tecnico
        setTecnico(tecnicoParseado)
        cargarServiciosTecnico(tecnicoParseado.id)
      } catch {
        localStorage.removeItem('rybert_tecnico')
      }
    }
  }, [])

  async function iniciarSesionTecnico(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const telefono = telefonoLogin.trim()
    const codigo = codigoLogin.trim()

    if (!telefono) {
      alert('Digite su teléfono')
      return
    }

    if (!codigo) {
      alert('Digite su código de acceso')
      return
    }

    setValidando(true)

    const { data, error } = await supabase
      .from('tecnicos_rybert_ruta')
      .select('id, nombre_completo, telefono, correo, estado, codigo_acceso')
      .eq('telefono', telefono)
      .eq('codigo_acceso', codigo)
      .eq('estado', 'Activo')
      .maybeSingle()

    if (error) {
      console.error('Error validando acceso:', error)
      alert(`Error validando acceso: ${error.message}`)
      setValidando(false)
      return
    }

    if (!data) {
      alert('Teléfono o código incorrecto, o técnico inactivo.')
      setValidando(false)
      return
    }

    const tecnicoEncontrado = data as Tecnico

    setTecnico(tecnicoEncontrado)
    localStorage.setItem('rybert_tecnico', JSON.stringify(tecnicoEncontrado))

    setTelefonoLogin('')
    setCodigoLogin('')

    await cargarServiciosTecnico(tecnicoEncontrado.id)

    setValidando(false)
  }

  function cerrarSesion() {
    localStorage.removeItem('rybert_tecnico')
    setTecnico(null)
    setServicios([])
    setTelefonoLogin('')
    setCodigoLogin('')
    setMensajeGps('')
  }

  async function cargarServiciosTecnico(tecnicoId: string) {
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
      .eq('tecnico_id', tecnicoId)
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
          timeout: 30000,
          maximumAge: 10000,
        }
      )
    })
  }

  async function cambiarEstado(servicio: Servicio, nuevoEstado: string) {
    if (!tecnico) {
      alert('Debe iniciar sesión como técnico.')
      return
    }

    if (servicio.tecnico_id !== tecnico.id) {
      alert('Este servicio no pertenece al técnico conectado.')
      return
    }

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
      .eq('tecnico_id', tecnico.id)

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
        tecnico_id: tecnico.id,
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

    await cargarServiciosTecnico(tecnico.id)

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

  if (!tecnico) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto max-w-md space-y-4">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Rybert Ruta
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Acceso del técnico
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Digite su teléfono y código de acceso para ver únicamente sus servicios asignados.
            </p>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <form onSubmit={iniciarSesionTecnico} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Teléfono
                </label>

                <input
                  type="tel"
                  value={telefonoLogin}
                  onChange={(e) => setTelefonoLogin(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="809-000-0000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Código de acceso
                </label>

                <input
                  type="password"
                  value={codigoLogin}
                  onChange={(e) => setCodigoLogin(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Digite su PIN"
                />
              </div>

              <button
                type="submit"
                disabled={validando}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {validando ? 'Validando...' : 'Entrar'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-4 text-center text-xs text-slate-500 shadow-sm">
            Cada técnico solo podrá ver los servicios asignados a su usuario.
          </section>
        </div>
      </main>
    )
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
            Bienvenido, <strong>{tecnico.nombre_completo}</strong>.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Consulta tus servicios asignados, actualiza el estado y registra tu ubicación.
          </p>

          {mensajeGps && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
              {mensajeGps}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => cargarServiciosTecnico(tecnico.id)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            <button
              onClick={cerrarSesion}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Salir
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500">
            Cargando servicios...
          </section>
        ) : servicios.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No tienes servicios asignados.
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