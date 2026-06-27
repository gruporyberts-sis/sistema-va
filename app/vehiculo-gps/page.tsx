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
};

type VehiculoConUbicacion = {
  vehiculo: Vehiculo;
  ubicacion: Ubicacion | null;
};

export default function VehiculoGpsPage() {
  const [data, setData] = useState<VehiculoConUbicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);

  const cargarDatos = async () => {
    try {
      setActualizando(true);
      setError("");

      const { data: vehiculos, error: vehiculosError } = await supabase
        .from("vehiculos_gps")
        .select("*")
        .order("id", { ascending: true });

      if (vehiculosError) throw vehiculosError;

      const resultado: VehiculoConUbicacion[] = [];

      for (const vehiculo of vehiculos || []) {
        const { data: ubicaciones, error: ubicacionError } = await supabase
          .from("vehiculos_ubicaciones")
          .select("*")
          .eq("vehiculo_id", vehiculo.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (ubicacionError) throw ubicacionError;

        resultado.push({
          vehiculo,
          ubicacion:
            ubicaciones && ubicaciones.length > 0 ? ubicaciones[0] : null,
        });
      }

      setData(resultado);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información del GPS.");
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    const canal = supabase
      .channel("vehiculos_ubicaciones_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehiculos_ubicaciones",
        },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    const intervalo = setInterval(() => {
      cargarDatos();
    }, 30000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };
  }, []);

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

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "-";

    try {
      return new Date(fecha).toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch {
      return fecha;
    }
  };

  const minutosDesdeUltimaUbicacion = (fecha: string | null) => {
    if (!fecha) return null;

    const ahora = new Date().getTime();
    const fechaUbicacion = new Date(fecha).getTime();
    const diferencia = Math.floor((ahora - fechaUbicacion) / 60000);

    return diferencia;
  };

  const estadoSenal = (fecha: string | null) => {
    const minutos = minutosDesdeUltimaUbicacion(fecha);

    if (minutos === null) {
      return {
        texto: "Sin señal",
        clase: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }

    if (minutos <= 2) {
      return {
        texto: "En línea",
        clase: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    if (minutos <= 10) {
      return {
        texto: "Reciente",
        clase: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    }

    return {
      texto: "Desactualizado",
      clase: "bg-red-50 text-red-700 border-red-200",
    };
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Monitoreo GPS de Vehículos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Panel demo para visualizar la última ubicación enviada por el
              celular del vehículo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => (window.location.href = "/vehiculo-gps/historial")}
              className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white shadow hover:bg-slate-900"
            >
              Ver historial
            </button>

            <button
              onClick={cargarDatos}
              disabled={actualizando}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:bg-slate-300"
            >
              {actualizando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            Cargando vehículos...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            No hay vehículos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.map(({ vehiculo, ubicacion }) => {
              const estado = estadoSenal(ubicacion?.created_at ?? null);
              const minutos = minutosDesdeUltimaUbicacion(
                ubicacion?.created_at ?? null
              );

              return (
                <div key={vehiculo.id} className="rounded-2xl bg-white p-5 shadow">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {vehiculo.nombre}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Placa: {vehiculo.placa || "-"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Chip: {vehiculo.telefono_chip || "-"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>
                  </div>

                  {!ubicacion ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Este vehículo todavía no tiene ubicación registrada.
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 space-y-3 rounded-xl border border-slate-200 p-4">
                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">Latitud</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {ubicacion.latitud}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">Longitud</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {ubicacion.longitud}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">Velocidad</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {ubicacion.velocidad
                              ? `${ubicacion.velocidad} km/h`
                              : "0 km/h"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">Precisión</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {ubicacion.precision
                              ? `${Number(ubicacion.precision).toFixed(2)} mts`
                              : "-"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">
                            Batería celular
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {ubicacion.bateria ? `${ubicacion.bateria}%` : "-"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">Última señal</span>
                          <span className="text-right text-sm font-semibold text-slate-800">
                            {formatearFecha(ubicacion.created_at)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-slate-500">
                            Tiempo sin actualizar
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {minutos === null ? "-" : `${minutos} min`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() =>
                            abrirGoogleMaps(
                              ubicacion.latitud,
                              ubicacion.longitud
                            )
                          }
                          className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow hover:bg-emerald-700"
                        >
                          Ver ubicación
                        </button>

                        <button
                          onClick={() =>
                            abrirRutaGoogleMaps(
                              ubicacion.latitud,
                              ubicacion.longitud
                            )
                          }
                          className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow hover:bg-blue-700"
                        >
                          Ir hacia el vehículo
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
          Para este demo, el celular debe mantener abierta la pantalla{" "}
          <strong>/movil/gps?vehiculo_id=1</strong> y tener permiso de ubicación
          activo.
        </div>
      </div>
    </main>
  );
}