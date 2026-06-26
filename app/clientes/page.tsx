'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Cliente = {
  id: string
  nombre_cliente: string
  telefono: string | null
  direccion: string | null
  latitud: number | null
  longitud: number | null
  estado: string
  created_at: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre_cliente: '',
    telefono: '',
    direccion: '',
    latitud: '',
    longitud: '',
    estado: 'Activo',
  })

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setLoading(true)

    const { data, error } = await supabase
      .from('clientes_rybert_ruta')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando clientes:', error)
      alert(`Error cargando clientes: ${error.message}`)
    } else {
      setClientes(data || [])
    }

    setLoading(false)
  }

  async function guardarCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.nombre_cliente.trim()) {
      alert('El nombre del cliente es obligatorio')
      return
    }

    const latitud = form.latitud.trim() ? Number(form.latitud) : null
    const longitud = form.longitud.trim() ? Number(form.longitud) : null

    if (form.latitud.trim() && Number.isNaN(latitud)) {
      alert('La latitud no es válida')
      return
    }

    if (form.longitud.trim() && Number.isNaN(longitud)) {
      alert('La longitud no es válida')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('clientes_rybert_ruta').insert({
      nombre_cliente: form.nombre_cliente.trim(),
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      latitud,
      longitud,
      estado: form.estado,
    })

    if (error) {
      console.error('Error guardando cliente:', error)
      alert(`Error guardando el cliente: ${error.message}`)
    } else {
      setForm({
        nombre_cliente: '',
        telefono: '',
        direccion: '',
        latitud: '',
        longitud: '',
        estado: 'Activo',
      })

      await cargarClientes()
      alert('Cliente registrado correctamente')
    }

    setGuardando(false)
  }

  async function eliminarCliente(id: string) {
    const confirmar = confirm('¿Seguro que deseas eliminar este cliente?')
    if (!confirmar) return

    const { error } = await supabase
      .from('clientes_rybert_ruta')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando cliente:', error)
      alert(`Error eliminando el cliente: ${error.message}`)
    } else {
      await cargarClientes()
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Rybert Ruta - Clientes / Destinos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro de clientes o destinos donde los técnicos realizarán servicios.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Nuevo cliente / destino
            </h2>

            <form onSubmit={guardarCliente} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre cliente *
                </label>
                <input
                  type="text"
                  value={form.nombre_cliente}
                  onChange={(e) =>
                    setForm({ ...form, nombre_cliente: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ej. Cliente Demo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="809-000-0000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Dirección
                </label>
                <textarea
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Dirección del cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitud}
                    onChange={(e) =>
                      setForm({ ...form, latitud: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="18.4861"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitud}
                    onChange={(e) =>
                      setForm({ ...form, longitud: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="-69.9312"
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
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Clientes / destinos registrados
              </h2>

              <button
                onClick={cargarClientes}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Cargando clientes...
              </div>
            ) : clientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay clientes registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">Cliente</th>
                      <th className="px-3 py-3 font-semibold">Teléfono</th>
                      <th className="px-3 py-3 font-semibold">Dirección</th>
                      <th className="px-3 py-3 font-semibold">Ubicación</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {clientes.map((cliente) => (
                      <tr key={cliente.id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {cliente.nombre_cliente}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {cliente.telefono || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {cliente.direccion || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {cliente.latitud !== null && cliente.longitud !== null
                            ? `${cliente.latitud}, ${cliente.longitud}`
                            : '-'}
                        </td>

                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {cliente.estado}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => eliminarCliente(cliente.id)}
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