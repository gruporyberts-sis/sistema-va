'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tecnico = {
  id: string
  nombre_completo: string
  estado: string
}

type Cliente = {
  id: string
  nombre_cliente: string
  direccion: string | null
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
  tecnicos_rybert_ruta?: {
    nombre_completo: string
  } | null
  clientes_rybert_ruta?: {
    nombre_cliente: string
    direccion: string | null
  } | null
}

export default function ServiciosPage() {
  const supabase = createClient()

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])

  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    tecnico_id: '',
    cliente_id: '',
    fecha_servicio: '',
    hora_programada: '',
    estado: 'Pendiente',
    observacion: '',
  })

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarDatos() {
    setLoading(true)

    const [tecnicosRes, clientesRes, serviciosRes] = await Promise.all([
      supabase
        .from('tecnicos_rybert_ruta')
        .select('id, nombre_completo, estado')
        .eq('estado', 'Activo')
        .order('nombre_completo', { ascending: true }),

      supabase
        .from('clientes_rybert_ruta')
        .select('id, nombre_cliente, direccion, estado')
        .eq('estado', 'Activo')
        .order('nombre_cliente', { ascending: true }),

      supabase
        .from('servicios_rybert_ruta')
        .select(`
          *,
          tecnicos_rybert_ruta (
            nombre_completo
          ),
          clientes_rybert_ruta (
            nombre_cliente,
            direccion
          )
        `)
        .order('created_at', { ascending: false }),
    ])

    if (tecnicosRes.error) {
      console.error('Error cargando técnicos:', tecnicosRes.error)
      alert(`Error cargando técnicos: ${tecnicosRes.error.message}`)
    } else {
      setTecnicos(tecnicosRes.data || [])
    }

    if (clientesRes.error) {
      console.error('Error cargando clientes:', clientesRes.error)
      alert(`Error cargando clientes: ${clientesRes.error.message}`)
    } else {
      setClientes(clientesRes.data || [])
    }

    if (serviciosRes.error) {
      console.error('Error cargando servicios:', serviciosRes.error)
      alert(`Error cargando servicios: ${serviciosRes.error.message}`)
    } else {
      setServicios((serviciosRes.data as Servicio[]) || [])
    }

    setLoading(false)
  }

  async function guardarServicio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.tecnico_id) {
      alert('Debe seleccionar un técnico')
      return
    }

    if (!form.cliente_id) {
      alert('Debe seleccionar un cliente/destino')
      return
    }

    if (!form.fecha_servicio) {
      alert('La fecha del servicio es obligatoria')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('servicios_rybert_ruta').insert({
      tecnico_id: form.tecnico_id,
      cliente_id: form.cliente_id,
      fecha_servicio: form.fecha_servicio,
      hora_programada: form.hora_programada || null,
      estado: form.estado,
      observacion: form.observacion.trim() || null,
    })

    if (error) {
      console.error('Error guardando servicio:', error)
      alert(`Error guardando el servicio: ${error.message}`)
    } else {
      setForm({
        tecnico_id: '',
        cliente_id: '',
        fecha_servicio: '',
        hora_programada: '',
        estado: 'Pendiente',
        observacion: '',
      })

      await cargarDatos()
      alert('Servicio asignado correctamente')
    }

    setGuardando(false)
  }

  async function eliminarServicio(id: string) {
    const confirmar = confirm('¿Seguro que deseas eliminar este servicio?')
    if (!confirmar) return

    const { error } = await supabase
      .from('servicios_rybert_ruta')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando servicio:', error)
      alert(`Error eliminando el servicio: ${error.message}`)
    } else {
      await cargarDatos()
    }
  }

  function estadoClass(estado: string) {
    if (estado === 'Pendiente') return 'bg-yellow-50 text-yellow-700'
    if (estado === 'En camino') return 'bg-blue-50 text-blue-700'
    if (estado === 'Llegó') return 'bg-indigo-50 text-indigo-700'
    if (estado === 'En proceso') return 'bg-purple-50 text-purple-700'
    if (estado === 'Finalizado') return 'bg-green-50 text-green-700'
    if (estado === 'Cancelado') return 'bg-red-50 text-red-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Rybert Ruta - Servicios / Rutas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Asignación básica de servicios a técnicos y clientes/destinos.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Nuevo servicio
            </h2>

            <form onSubmit={guardarServicio} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Técnico *
                </label>
                <select
                  value={form.tecnico_id}
                  onChange={(e) =>
                    setForm({ ...form, tecnico_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Seleccione técnico</option>
                  {tecnicos.map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nombre_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cliente / destino *
                </label>
                <select
                  value={form.cliente_id}
                  onChange={(e) =>
                    setForm({ ...form, cliente_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Seleccione cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre_cliente}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={form.fecha_servicio}
                    onChange={(e) =>
                      setForm({ ...form, fecha_servicio: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={form.hora_programada}
                    onChange={(e) =>
                      setForm({ ...form, hora_programada: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En camino">En camino</option>
                  <option value="Llegó">Llegó</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observación
                </label>
                <textarea
                  value={form.observacion}
                  onChange={(e) =>
                    setForm({ ...form, observacion: e.target.value })
                  }
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Detalle del servicio o ruta"
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Asignar servicio'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Servicios asignados
              </h2>

              <button
                onClick={cargarDatos}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Cargando servicios...
              </div>
            ) : servicios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay servicios asignados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">Fecha</th>
                      <th className="px-3 py-3 font-semibold">Técnico</th>
                      <th className="px-3 py-3 font-semibold">Cliente</th>
                      <th className="px-3 py-3 font-semibold">Dirección</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold">Observación</th>
                      <th className="px-3 py-3 font-semibold text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {servicios.map((servicio) => (
                      <tr key={servicio.id} className="border-b last:border-0">
                        <td className="px-3 py-3 text-slate-700">
                          <div className="font-medium">
                            {servicio.fecha_servicio}
                          </div>
                          <div className="text-xs text-slate-500">
                            {servicio.hora_programada || 'Sin hora'}
                          </div>
                        </td>

                        <td className="px-3 py-3 font-medium text-slate-800">
                          {servicio.tecnicos_rybert_ruta?.nombre_completo || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {servicio.clientes_rybert_ruta?.nombre_cliente || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {servicio.clientes_rybert_ruta?.direccion || '-'}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClass(
                              servicio.estado
                            )}`}
                          >
                            {servicio.estado}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {servicio.observacion || '-'}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => eliminarServicio(servicio.id)}
                            className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}