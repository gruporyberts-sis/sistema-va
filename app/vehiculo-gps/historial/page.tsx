"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Vehiculo = {
  id: number;
  nombre: string;
  placa: string | null;
  telefono_chip: string | null;
  estado: string | null;
};

type Ubicacion = {
  id: number;
  vehiculo_id: number;
  latitud: number;
  longitud: number;
  precision: number | null;
  velocidad: number | null;
  bateria: number | null;
  origen: string | null;
  created_at: string;
  vehiculo?: Vehiculo | null;
};

export default function HistorialGpsPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [vehiculoId, setVehiculoId] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargarVehiculos = async () => {
    const { data, error } = await supabase
      .from("vehiculos_gps")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    setVehiculos(data || []);
  };

  const cargarHistorial = async () => {
    try {
      setActualizando(true);
      setError("");

      let query = supabase
        .from("vehiculos_ubicaciones")
        .select(
          `
          *,
          vehiculo:vehiculos_gps (
            id,
            nombre,
            placa,
            telefono_chip,
            estado
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (vehiculoId !== "todos") {
        query = query.eq("vehiculo_id", Number(vehiculoId));
      }

      const { data, error } = await query;

      if (error) throw error;

      setUbicaciones(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de ubicaciones.");
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    const iniciar = async () => {
      try {
        setLoading(true);
        await cargarVehiculos();
        await cargarHistorial();
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información.");
        setLoading(false);
      }
    };

    iniciar();
  }, []);

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoId]);

  useEffect(() => {
    const canal = supabase
      .channel("historial_gps_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehiculos_ubicaciones",
        },
        () => {
          cargarHistorial();
        }
      )
      .subscribe();

    const intervalo = setInterval(() => {
      cargarHistorial();
    }, 30000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoId]);

  const formatearFecha = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch {
      return fecha;
    }
  };

  const abrirGoogleMaps = (latitud: number, longitud: number) => {
    window.open(
      `https://www.google.com/maps?q=${latitud},${longitud}`,
      "_blank"
    );
  };

  const abrirRutaGoogleMaps = (latitud: number, longitud: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`,
      "_blank"
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Historial de Ruta GPS
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Consulta los últimos movimientos enviados por el celular
                instalado en el vehículo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => (window.location.href = "/vehiculo-gps")}
                className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white shadow hover:bg-slate-900"
              >
                Volver al panel
              </button>

              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="todos">Todos los vehículos</option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.nombre}{" "}
                    {vehiculo.placa ? `- ${vehiculo.placa}` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={cargarHistorial}
                disabled={actualizando}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:bg-slate-300"
              >
                {actualizando ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Vehículos registrados</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              {vehiculos.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Registros mostrados</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              {ubicaciones.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Actualización</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              Tiempo real / cada 30 segundos
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            Cargando historial...
          </div>
        ) : ubicaciones.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            No hay ubicaciones registradas para mostrar.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha / Hora</th>
                    <th className="px-4 py-3 text-left">Vehículo</th>
                    <th className="px-4 py-3 text-left">Placa</th>
                    <th className="px-4 py-3 text-left">Latitud</th>
                    <th className="px-4 py-3 text-left">Longitud</th>
                    <th className="px-4 py-3 text-left">Velocidad</th>
                    <th className="px-4 py-3 text-left">Batería</th>
                    <th className="px-4 py-3 text-left">Precisión</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {ubicaciones.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {formatearFecha(item.created_at)}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.vehiculo?.nombre || `Vehículo ${item.vehiculo_id}`}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.vehiculo?.placa || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.latitud}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.longitud}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.velocidad ? `${item.velocidad} km/h` : "0 km/h"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.bateria ? `${item.bateria}%` : "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {item.precision
                          ? `${Number(item.precision).toFixed(2)} mts`
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() =>
                              abrirGoogleMaps(item.latitud, item.longitud)
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Ver
                          </button>

                          <button
                            onClick={() =>
                              abrirRutaGoogleMaps(item.latitud, item.longitud)
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            Ir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {ubicaciones.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white p-5 shadow">
                  <div className="mb-3">
                    <h2 className="text-lg font-bold text-slate-800">
                      {item.vehiculo?.nombre || `Vehículo ${item.vehiculo_id}`}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Placa: {item.vehiculo?.placa || "-"}
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatearFecha(item.created_at)}
                    </p>
                  </div>

                  <div className="mb-4 space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Latitud</span>
                      <span className="font-semibold text-slate-800">
                        {item.latitud}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Longitud</span>
                      <span className="font-semibold text-slate-800">
                        {item.longitud}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Velocidad</span>
                      <span className="font-semibold text-slate-800">
                        {item.velocidad ? `${item.velocidad} km/h` : "0 km/h"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Batería</span>
                      <span className="font-semibold text-slate-800">
                        {item.bateria ? `${item.bateria}%` : "-"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Precisión</span>
                      <span className="font-semibold text-slate-800">
                        {item.precision
                          ? `${Number(item.precision).toFixed(2)} mts`
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => abrirGoogleMaps(item.latitud, item.longitud)}
                      className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow hover:bg-emerald-700"
                    >
                      Ver
                    </button>

                    <button
                      onClick={() =>
                        abrirRutaGoogleMaps(item.latitud, item.longitud)
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow hover:bg-blue-700"
                    >
                      Ir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
          Este historial muestra los últimos 200 registros. Luego podemos agregar
          filtro por fecha, exportar a Excel y ver la ruta dibujada en un mapa.
        </div>
      </div>
    </main>
  );
}