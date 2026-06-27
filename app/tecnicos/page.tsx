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
  created_at: string
}

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: '',
    telefono: '',
    correo: '',
    codigo_acceso: '',
    estado: 'Activo',
  })

  useEffect(() => {
    cargarTecnicos()
  }, [])

  async function cargarTecnicos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tecnicos_rybert_ruta')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando técnicos:', error)
      alert(`Error cargando técnicos: ${error.message}`)
    } else {
      setTecnicos(data || [])
    }

    setLoading(false)
  }

  async function guardarTecnico(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.nombre_completo.trim()) {
      alert('El nombre completo es obligatorio')
      return
    }

    if (!form.telefono.trim()) {
      alert('El teléfono es obligatorio para el acceso móvil')
      return
    }

    if (!form.codigo_acceso.trim()) {
      alert('El PIN / código de acceso es obligatorio')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('tecnicos_rybert_ruta').insert({
      nombre_completo: form.nombre_completo.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim() || null,
      codigo_acceso: form.codigo_acceso.trim(),
      estado: form.estado,
    })

    if (error) {
      console.error('Error guardando técnico:', error)
      alert(`Error guardando el técnico: ${error.message}`)
    } else {
      setForm({
        nombre_completo: '',
        telefono: '',
        correo: '',
        codigo_acceso: '',
        estado: 'Activo',
      })

      await cargarTecnicos()
      alert('Técnico registrado correctamente')
    }

    setGuardando(false)
  }

  async function eliminarTecnico(id: string) {
    const confirmar = confirm('¿Seguro que deseas eliminar este técnico?')
    if (!confirmar) return

    const { error } = await supabase
      .from('tecnicos_rybert_ruta')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando técnico:', error)
      alert(`Error eliminando el técnico: ${error.message}`)
    } else {
      await cargarTecnicos()
    }
  }

  function mostrarPin(pin: string | null) {
    if (!pin) return '-'
    return '••••'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Rybert Ruta - Técnicos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro básico de técnicos para el control de rutas y acceso móvil.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Nuevo técnico
            </h2>

            <form onSubmit={guardarTecnico} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) =>
                    setForm({ ...form, nombre_completo: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teléfono *
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
                <p className="mt-1 text-xs text-slate-500">
                  Este teléfono será usado para entrar al panel móvil.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Correo
                </label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) =>
                    setForm({ ...form, correo: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  PIN / Código de acceso *
                </label>
                <input
                  type="password"
                  value={form.codigo_acceso}
                  onChange={(e) =>
                    setForm({ ...form, codigo_acceso: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ej. 1234"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-slate-500">
                  El técnico usará este código junto con su teléfono para acceder.
                </p>
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
                {guardando ? 'Guardando...' : 'Guardar técnico'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Técnicos registrados
              </h2>

              <button
                onClick={cargarTecnicos}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Cargando técnicos...
              </div>
            ) : tecnicos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay técnicos registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">Técnico</th>
                      <th className="px-3 py-3 font-semibold">Teléfono</th>
                      <th className="px-3 py-3 font-semibold">Correo</th>
                      <th className="px-3 py-3 font-semibold">PIN</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {tecnicos.map((tecnico) => (
                      <tr key={tecnico.id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {tecnico.nombre_completo}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {tecnico.telefono || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {tecnico.correo || '-'}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {mostrarPin(tecnico.codigo_acceso)}
                        </td>

                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {tecnico.estado}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => eliminarTecnico(tecnico.id)}
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