'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Departamento = {
  id: string
  nombre_departamento: string
  descripcion: string | null
  estado: string
  created_at: string
}

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre_departamento: '',
    descripcion: '',
    estado: 'Activo',
  })

  useEffect(() => {
    cargarDepartamentos()
  }, [])

  async function cargarDepartamentos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('departamentos_sistema_va')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando departamentos:', error)
      alert(`Error cargando departamentos: ${error.message}`)
    } else {
      setDepartamentos(data || [])
    }

    setLoading(false)
  }

  async function guardarDepartamento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.nombre_departamento.trim()) {
      alert('El nombre del departamento es obligatorio')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('departamentos_sistema_va').insert({
      nombre_departamento: form.nombre_departamento.trim(),
      descripcion: form.descripcion.trim() || null,
      estado: form.estado,
    })

    if (error) {
      console.error('Error guardando departamento:', error)
      alert(`Error guardando el departamento: ${error.message}`)
    } else {
      setForm({
        nombre_departamento: '',
        descripcion: '',
        estado: 'Activo',
      })

      await cargarDepartamentos()
      alert('Departamento registrado correctamente')
    }

    setGuardando(false)
  }

  async function eliminarDepartamento(id: string) {
    const confirmar = confirm('¿Seguro que deseas eliminar este departamento?')
    if (!confirmar) return

    const { error } = await supabase
      .from('departamentos_sistema_va')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando departamento:', error)
      alert(`Error eliminando el departamento: ${error.message}`)
    } else {
      await cargarDepartamentos()
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema VA - Departamentos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro simple de departamentos conectado a Supabase.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Nuevo departamento
            </h2>

            <form onSubmit={guardarDepartamento} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre departamento *
                </label>
                <input
                  type="text"
                  value={form.nombre_departamento}
                  onChange={(e) =>
                    setForm({ ...form, nombre_departamento: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ej. Administración"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Descripción del departamento"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
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
                {guardando ? 'Guardando...' : 'Guardar departamento'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Departamentos registrados
              </h2>

              <button
                onClick={cargarDepartamentos}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Cargando departamentos...
              </div>
            ) : departamentos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay departamentos registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">Departamento</th>
                      <th className="px-3 py-3 font-semibold">Descripción</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {departamentos.map((departamento) => (
                      <tr key={departamento.id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {departamento.nombre_departamento}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {departamento.descripcion || '-'}
                        </td>

                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {departamento.estado}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => eliminarDepartamento(departamento.id)}
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