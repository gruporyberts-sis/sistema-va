"use client";

  import { useEffect, useRef, useState } from 'react'
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

export default function MapaGpsPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculoId, setVehiculoId] = useState<string>("");
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
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

    if (!vehiculoId && data && data.length > 0) {
      setVehiculoId(String(data[0].id));
    }
  };

  const cargarRuta = async (idVehiculo?: string) => {
    const id = idVehiculo || vehiculoId;

    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setActualizando(true);
      setError("");

      const { data, error } = await supabase
        .from("vehiculos_ubicaciones")
        .select("*")
        .eq("vehiculo_id", Number(id))
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) throw error;

      setUbicaciones(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la ruta del vehículo.");
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
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información de vehículos.");
        setLoading(false);
      }
    };

    iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (vehiculoId) {
      cargarRuta(vehiculoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoId]);

  useEffect(() => {
    const canal = supabase
      .channel("mapa_gps_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehiculos_ubicaciones",
        },
        () => {
          cargarRuta();
        }
      )
      .subscribe();

    const intervalo = setInterval(() => {
      cargarRuta();
    }, 30000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoId]);

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

  const abrirGoogleMaps = (latitud: number, longitud: number) => {
    window.open(
      `https://www.google.com/maps?q=${latitud},${longitud}`,
      "_blank"
    );
  };

  useEffect(() => {
    const pintarMapa = async () => {
      if (!mapRef.current) return;

      const L = await import("leaflet");

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const puntosRuta: [number, number][] = ubicaciones.map((item) => [
        Number(item.latitud),
        Number(item.longitud),
      ]);

      const centroMapa: [number, number] =
        puntosRuta.length > 0
          ? puntosRuta[puntosRuta.length - 1]
          : [18.4861, -69.9312];

      const mapa = L.map(mapRef.current).setView(centroMapa, 16);
      leafletMapRef.current = mapa;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapa);

      if (puntosRuta.length > 1) {
        L.polyline(puntosRuta, {
          color: "blue",
          weight: 5,
          opacity: 0.75,
        }).addTo(mapa);

        mapa.fitBounds(L.latLngBounds(puntosRuta), {
          padding: [40, 40],
        });
      }

      ubicaciones.forEach((item, index) => {
        const esInicio = index === 0;
        const esFinal = index === ubicaciones.length - 1;

        const color = esFinal ? "red" : esInicio ? "green" : "blue";
        const titulo = esInicio
          ? "Inicio de ruta"
          : esFinal
          ? "Última ubicación"
          : "Punto de ruta";

        const marker = L.circleMarker(
          [Number(item.latitud), Number(item.longitud)],
          {
            radius: esFinal ? 9 : esInicio ? 8 : 5,
            color,
            fillColor: color,
            fillOpacity: 0.8,
          }
        ).addTo(mapa);

        marker.bindPopup(`
          <div style="font-size:13px">
            <strong>${titulo}</strong><br/>
            Fecha: ${formatearFecha(item.created_at)}<br/>
            Latitud: ${item.latitud}<br/>
            Longitud: ${item.longitud}<br/>
            Velocidad: ${item.velocidad ? `${item.velocidad} km/h` : "0 km/h"}<br/>
            Batería: ${item.bateria ? `${item.bateria}%` : "-"}<br/>
            <a href="https://www.google.com/maps?q=${item.latitud},${item.longitud}" target="_blank">
              Abrir en Google Maps
            </a>
          </div>
        `);
      });
    };

    pintarMapa();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [ubicaciones]);

  const vehiculoSeleccionado = vehiculos.find(
    (item) => String(item.id) === vehiculoId
  );

  const primeraUbicacion =
    ubicaciones.length > 0 ? ubicaciones[0] : null;

  const ultimaUbicacion =
    ubicaciones.length > 0 ? ubicaciones[ubicaciones.length - 1] : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Mapa de Ruta GPS
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visualiza la ruta completa enviada por el celular del vehículo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => (window.location.href = "/vehiculo-gps")}
                className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white shadow hover:bg-slate-900"
              >
                Volver al panel
              </button>

              <button
                onClick={() =>
                  (window.location.href = "/vehiculo-gps/historial")
                }
                className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white shadow hover:bg-slate-800"
              >
                Ver historial
              </button>

              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {vehiculos.length === 0 && (
                  <option value="">No hay vehículos</option>
                )}

                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.nombre}{" "}
                    {vehiculo.placa ? `- ${vehiculo.placa}` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={() => cargarRuta()}
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

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Vehículo</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {vehiculoSeleccionado?.nombre || "-"}
            </p>
            <p className="text-sm text-slate-500">
              Placa: {vehiculoSeleccionado?.placa || "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Puntos de ruta</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              {ubicaciones.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Inicio registrado</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatearFecha(primeraUbicacion?.created_at ?? null)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Última señal</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {formatearFecha(ultimaUbicacion?.created_at ?? null)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            Cargando mapa...
          </div>
        ) : ubicaciones.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            No hay ubicaciones registradas para dibujar la ruta.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div
              ref={mapRef}
              className="h-[550px] w-full"
            />
          </div>
        )}

        {ultimaUbicacion && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() =>
                abrirGoogleMaps(
                  Number(ultimaUbicacion.latitud),
                  Number(ultimaUbicacion.longitud)
                )
              }
              className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow hover:bg-emerald-700"
            >
              Abrir última ubicación en Google Maps
            </button>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
          El punto verde representa el inicio de la ruta, el punto rojo la última
          ubicación y la línea azul muestra el recorrido registrado.
        </div>
      </div>
    </main>
  );
}