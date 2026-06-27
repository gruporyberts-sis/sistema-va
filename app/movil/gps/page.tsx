"use client";

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type UbicacionEstado = {
  latitud: number | null;
  longitud: number | null;
  precision: number | null;
  velocidad: number | null;
  bateria: number | null;
  fecha: string | null;
};

export default function MovilGpsPage() {
  const [vehiculoId, setVehiculoId] = useState<number | null>(null);
  const [estado, setEstado] = useState("Esperando inicio...");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [ubicacion, setUbicacion] = useState<UbicacionEstado>({
    latitud: null,
    longitud: null,
    precision: null,
    velocidad: null,
    bateria: null,
    fecha: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const ultimaUbicacionRef = useRef<GeolocationPosition | null>(null);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("vehiculo_id"));

    if (!id || Number.isNaN(id)) {
      setError("Falta el parámetro vehiculo_id. Ejemplo: /movil/gps?vehiculo_id=1");
      return;
    }

    setVehiculoId(id);
  }, []);

  const obtenerBateria = async () => {
    try {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<{ level: number }>;
      };

      if (!nav.getBattery) return null;

      const battery = await nav.getBattery();
      return Number((battery.level * 100).toFixed(2));
    } catch {
      return null;
    }
  };

  const guardarUbicacion = async (position: GeolocationPosition) => {
    if (!vehiculoId) return;

    try {
      setEnviando(true);
      setError("");

      const bateria = await obtenerBateria();

      const latitud = position.coords.latitude;
      const longitud = position.coords.longitude;
      const precision = position.coords.accuracy ?? null;
      const velocidad = position.coords.speed ? Number((position.coords.speed * 3.6).toFixed(2)) : null;

      const { error: insertError } = await supabase.from("vehiculos_ubicaciones").insert({
        vehiculo_id: vehiculoId,
        latitud,
        longitud,
        precision,
        velocidad,
        bateria,
        origen: "CELULAR",
      });

      if (insertError) {
        throw insertError;
      }

      setUbicacion({
        latitud,
        longitud,
        precision,
        velocidad,
        bateria,
        fecha: new Date().toLocaleString("es-DO"),
      });

      setEstado("Ubicación enviada correctamente");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la ubicación en Supabase.");
      setEstado("Error enviando ubicación");
    } finally {
      setEnviando(false);
    }
  };

  const iniciarMonitoreo = () => {
    if (!vehiculoId) {
      setError("No hay vehículo seleccionado.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Este celular no permite obtener ubicación GPS.");
      return;
    }

    setError("");
    setEstado("Solicitando permiso de ubicación...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        ultimaUbicacionRef.current = position;
        setEstado("GPS activo. Recibiendo ubicación...");

        await guardarUbicacion(position);
      },
      (geoError) => {
        console.error(geoError);

        if (geoError.code === 1) {
          setError("Permiso de ubicación denegado. Debes permitir ubicación en el celular.");
        } else if (geoError.code === 2) {
          setError("No se pudo obtener la ubicación. Verifica GPS o señal.");
        } else if (geoError.code === 3) {
          setError("Tiempo agotado obteniendo ubicación.");
        } else {
          setError("Error desconocido obteniendo ubicación.");
        }

        setEstado("GPS detenido o sin permiso");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    intervaloRef.current = setInterval(async () => {
      if (ultimaUbicacionRef.current) {
        await guardarUbicacion(ultimaUbicacionRef.current);
      }
    }, 30000);
  };

  const detenerMonitoreo = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }

    setEstado("Monitoreo detenido");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }
    };
  }, []);

  const abrirGoogleMaps = () => {
    if (!ubicacion.latitud || !ubicacion.longitud) return;

    const url = `https://www.google.com/maps?q=${ubicacion.latitud},${ubicacion.longitud}`;
    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-800">GPS Vehículo Demo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Celular instalado en el vehículo para enviar ubicación
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Vehículo ID</p>
          <p className="text-xl font-bold text-slate-800">{vehiculoId ?? "No definido"}</p>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">Estado</p>
          <p className="mt-1 text-sm text-blue-700">{estado}</p>
          {enviando && <p className="mt-2 text-xs text-blue-600">Enviando ubicación...</p>}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Aviso</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mb-5 space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Latitud</span>
            <span className="text-sm font-semibold text-slate-800">
              {ubicacion.latitud ?? "-"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Longitud</span>
            <span className="text-sm font-semibold text-slate-800">
              {ubicacion.longitud ?? "-"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Precisión</span>
            <span className="text-sm font-semibold text-slate-800">
              {ubicacion.precision ? `${ubicacion.precision.toFixed(2)} mts` : "-"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Velocidad</span>
            <span className="text-sm font-semibold text-slate-800">
              {ubicacion.velocidad ? `${ubicacion.velocidad} km/h` : "0 km/h"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Batería</span>
            <span className="text-sm font-semibold text-slate-800">
              {ubicacion.bateria ? `${ubicacion.bateria}%` : "-"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-sm text-slate-500">Último envío</span>
            <span className="text-right text-sm font-semibold text-slate-800">
              {ubicacion.fecha ?? "-"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={iniciarMonitoreo}
            className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow hover:bg-emerald-700"
          >
            Iniciar GPS
          </button>

          <button
            onClick={detenerMonitoreo}
            className="rounded-xl bg-slate-700 px-4 py-3 font-bold text-white shadow hover:bg-slate-800"
          >
            Detener GPS
          </button>

          <button
            onClick={abrirGoogleMaps}
            disabled={!ubicacion.latitud || !ubicacion.longitud}
            className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Abrir en Google Maps
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-xs text-yellow-800">
          Para que funcione correctamente, mantén esta pantalla abierta en el celular del vehículo
          y permite el acceso a ubicación.
        </div>
      </div>
    </main>
  );
}