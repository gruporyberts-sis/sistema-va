'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Persona = {
  id: string
  nombre_completo: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  created_at: string
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: '',
    cedula: '',
    telefono: '',
    correo: '',
    direccion: '',
  })

  useEffect(() => {
    cargarPersonas()
  }, [])

  async function cargarPersonas() {
    setLoading(true)

    const { data, error } = await supabase
      .from('personas_sistema_va')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando personas:', error)
      alert(`Error cargando personas: ${error.message}`)
    } else {
      setPersonas(data || [])
    }

    setLoading(false)
  }

  async function guardarPersona(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.nombre_completo.trim()) {
      alert('El nombre completo es obligatorio')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('personas_sistema_va').insert({
      nombre_completo: form.nombre_completo.trim(),
      cedula: form.cedula.trim() || null,
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      direccion: form.direccion.trim() || null,
    })

    if (error) {
      console.error('Error guardando persona:', error)
      alert(`Error guardando la persona: ${error.message}`)
    } else {
      setForm({
        nombre_completo: '',
        cedula: '',
        telefono: '',
        correo: '',
        direccion: '',
      })

      await cargarPersonas()
      alert('Persona registrada correctamente')
    }

    setGuardando(false)
  }

  async function eliminarPersona(id: string) {
    const confirmar = confirm('¿Seguro que deseas eliminar esta persona?')
    if (!confirmar) return

    const { error } = await supabase
      .from('personas_sistema_va')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando persona:', error)
      alert(`Error eliminando la persona: ${error.message}`)
    } else {
      await cargarPersonas()
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema VA - Información Persona
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro simple de personas conectado a Supabase.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Nueva persona
            </h2>

            <form onSubmit={guardarPersona} className="space-y-4">
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
                  Cédula
                </label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="000-0000000-0"
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
                  Correo
                </label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="correo@ejemplo.com"
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
                  placeholder="Dirección"
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar persona'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Personas registradas
              </h2>

              <button
                onClick={cargarPersonas}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Cargando personas...
              </div>
            ) : personas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay personas registradas todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">Nombre</th>
                      <th className="px-3 py-3 font-semibold">Cédula</th>
                      <th className="px-3 py-3 font-semibold">Teléfono</th>
                      <th className="px-3 py-3 font-semibold">Correo</th>
                      <th className="px-3 py-3 font-semibold text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {personas.map((persona) => (
                      <tr key={persona.id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {persona.nombre_completo}
                          {persona.direccion && (
                            <div className="mt-1 text-xs font-normal text-slate-500">
                              {persona.direccion}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {persona.cedula || '-'}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {persona.telefono || '-'}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {persona.correo || '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => eliminarPersona(persona.id)}
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