"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Human?: any;
  }
}

type Embedding = number[];

export default function PruebaFacialHuman() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const humanRef = useRef<any>(null);

  const [scriptListo, setScriptListo] = useState(false);
  const [motor, setMotor] = useState("Cargando Human...");
  const [camara, setCamara] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [plantilla, setPlantilla] = useState<Embedding | null>(null);
  const [resultado, setResultado] = useState("Esperando inicialización...");
  const [similitud, setSimilitud] = useState<number | null>(null);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function iniciarHuman() {
    if (!window.Human) {
      setMotor("Error: /human.js cargó, pero window.Human no está disponible.");
      return;
    }

    try {
      setMotor("Inicializando modelos Human...");

      const human = new window.Human.Human({
        backend: "webgl",
        modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/",
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: {
            enabled: true,
            rotation: true,
            maxDetected: 1,
            minConfidence: 0.4,
          },
          mesh: { enabled: true },
          description: { enabled: true },
          emotion: { enabled: false },
          iris: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
      });

      humanRef.current = human;

      await human.load();
      setMotor("Modelos cargados. Preparando motor...");
      await human.warmup();

      setMotor(`Motor Human listo ✓ · backend: ${human.tf?.getBackend?.() || "webgl"}`);
      setResultado("Motor listo. Enciende la cámara.");
      setScriptListo(true);
    } catch (e: any) {
      console.error(e);
      setMotor(`Error inicializando Human: ${e?.message || String(e)}`);
      setResultado("Revisa la consola del navegador si el error continúa.");
    }
  }

  async function abrirCamara() {
    if (!scriptListo || ocupado) return;

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      setCamara(true);
      setResultado("Cámara lista. Mira de frente y pulsa Registrar rostro.");
    } catch (e: any) {
      console.error(e);
      setResultado(`Error de cámara: ${e?.message || String(e)}`);
    }
  }

  async function obtenerEmbedding(): Promise<Embedding | null> {
    const human = humanRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!human) {
      setResultado("El motor Human no está listo.");
      return null;
    }

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setResultado("La cámara todavía no tiene imagen.");
      return null;
    }

    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setResultado("No se pudo preparar la captura.");
      return null;
    }

    const lado = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - lado) / 2;
    const sy = (video.videoHeight - lado) / 2;

    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, lado, lado, 0, 0, size, size);
    ctx.restore();

    setResultado("Analizando rostro con Human...");

    const deteccion = await human.detect(canvas);

    if (!deteccion?.face?.length) {
      setResultado("No se detectó ningún rostro. Mira de frente y mejora la iluminación.");
      return null;
    }

    if (deteccion.face.length > 1) {
      setResultado("Debe aparecer una sola persona frente a la cámara.");
      return null;
    }

    const rostro = deteccion.face[0];

    if (!rostro.embedding || rostro.embedding.length === 0) {
      setResultado("Human detectó el rostro, pero no generó el embedding facial.");
      return null;
    }

    return Array.from(rostro.embedding) as number[];
  }

  async function registrar() {
    if (!camara || ocupado) return;

    setOcupado(true);
    setSimilitud(null);

    try {
      setResultado("Registrando rostro...");
      const embedding = await obtenerEmbedding();

      if (!embedding) return;

      setPlantilla(embedding);
      setResultado(`✓ Rostro registrado correctamente · embedding ${embedding.length}D`);
    } catch (e: any) {
      console.error(e);
      setResultado(`Error al registrar: ${e?.message || String(e)}`);
    } finally {
      setOcupado(false);
    }
  }

  async function validar() {
    if (!camara || !plantilla || ocupado) return;

    setOcupado(true);
    setSimilitud(null);

    try {
      setResultado("Capturando rostro nuevo...");
      const actual = await obtenerEmbedding();

      if (!actual) return;

      const human = humanRef.current;
      const score = Number(human.match.similarity(plantilla, actual));

      setSimilitud(score);

      if (score >= 0.55) {
        setResultado("✓ ROSTRO COINCIDE");
      } else {
        setResultado("✕ ROSTRO DIFERENTE");
      }
    } catch (e: any) {
      console.error(e);
      setResultado(`Error al validar: ${e?.message || String(e)}`);
    } finally {
      setOcupado(false);
    }
  }

  function borrar() {
    setPlantilla(null);
    setSimilitud(null);
    setResultado("Plantilla eliminada. Puedes registrar otro rostro.");
  }

  return (
    <>
      <Script
        src="/human.js"
        strategy="afterInteractive"
        onLoad={iniciarHuman}
        onError={() => {
          setMotor("Error cargando /human.js");
          setResultado("No se pudo cargar Human desde public/human.js.");
        }}
      />

      <main style={s.main}>
        <div style={s.wrap}>
          <header style={s.header}>
            <div>
              <div style={s.brand}>VAM FACE LAB</div>
              <div style={s.sub}>Human · prueba profesional 1:1</div>
            </div>
            <div style={s.version}>LAB v1.1</div>
          </header>

          <div style={s.motor}>{motor}</div>

          <section style={s.card}>
            <div style={s.videoBox}>
              <video ref={videoRef} autoPlay muted playsInline style={s.video} />

              {!camara && (
                <div style={s.sinCamara}>
                  {scriptListo ? "Cámara apagada" : "Preparando motor facial..."}
                </div>
              )}

              <div style={s.oval} />
            </div>

            <button
              style={{ ...s.primary, opacity: !scriptListo || ocupado ? 0.5 : 1 }}
              onClick={abrirCamara}
              disabled={!scriptListo || ocupado}
            >
              {camara ? "Reiniciar cámara" : "Encender cámara"}
            </button>
          </section>

          <section style={s.card}>
            <div style={s.step}>PASO 1</div>
            <h2 style={s.h2}>Registrar rostro</h2>
            <p style={s.p}>Mira de frente. Debe aparecer una sola persona.</p>

            <button
              style={{ ...s.primary, opacity: !camara || ocupado ? 0.5 : 1 }}
              disabled={!camara || ocupado}
              onClick={registrar}
            >
              {ocupado ? "Procesando..." : plantilla ? "Registrar nuevamente" : "Registrar rostro"}
            </button>
          </section>

          <section style={s.card}>
            <div style={s.step}>PASO 2</div>
            <h2 style={s.h2}>Validar rostro</h2>
            <p style={s.p}>Realiza una captura nueva para comparar ambos embeddings.</p>

            <button
              style={{
                ...s.secondary,
                opacity: !plantilla || !camara || ocupado ? 0.5 : 1,
              }}
              disabled={!plantilla || !camara || ocupado}
              onClick={validar}
            >
              {ocupado ? "Procesando..." : "Validar rostro"}
            </button>

            {similitud !== null && (
              <div style={s.score}>
                <div style={s.scoreLabel}>SIMILITUD</div>
                <div style={s.scoreValue}>{(similitud * 100).toFixed(1)}%</div>
                <div style={s.scoreRaw}>score: {similitud.toFixed(4)}</div>
              </div>
            )}
          </section>

          <div style={s.resultado}>
            <strong>Estado:</strong> {resultado}
          </div>

          {plantilla && (
            <button style={s.danger} onClick={borrar} disabled={ocupado}>
              Borrar rostro de prueba
            </button>
          )}

          <div style={s.nota}>
            Prueba aislada: no usa Supabase, no registra asistencia y no modifica VAM FACE.
            El umbral es provisional hasta completar las pruebas con personas distintas.
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          <footer style={s.footer}>VAM FACE Attendance · Human LAB v1.1</footer>
        </div>
      </main>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#f3f6f8",
    fontFamily: "Arial, sans-serif",
    color: "#17202a",
    padding: 18,
  },
  wrap: { maxWidth: 520, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  brand: { fontSize: 22, fontWeight: 900, color: "#0f766e" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 3 },
  version: {
    fontSize: 11,
    padding: "6px 10px",
    border: "1px solid #d9e2e7",
    background: "#fff",
    borderRadius: 20,
  },
  motor: {
    background: "#ecfeff",
    border: "1px solid #a5f3fc",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginBottom: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #dfe7eb",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  videoBox: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    overflow: "hidden",
    borderRadius: 18,
    background: "#111827",
    marginBottom: 14,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  sinCamara: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#cbd5e1",
  },
  oval: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "58%",
    height: "76%",
    transform: "translate(-50%, -50%)",
    border: "3px solid rgba(255,255,255,.85)",
    borderRadius: "48%",
    pointerEvents: "none",
  },
  primary: {
    width: "100%",
    border: 0,
    borderRadius: 12,
    padding: "13px 14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
  },
  secondary: {
    width: "100%",
    border: "2px solid #0f766e",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "#fff",
    color: "#0f766e",
    fontSize: 14,
  },
  step: { fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#0f766e" },
  h2: { fontSize: 21, margin: "6px 0 7px" },
  p: { fontSize: 14, color: "#64748b", lineHeight: 1.45, margin: "0 0 14px" },
  score: {
    textAlign: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  scoreLabel: { fontSize: 13, color: "#64748b" },
  scoreValue: { fontSize: 36, fontWeight: 900 },
  scoreRaw: { fontSize: 12, color: "#64748b" },
  resultado: {
    background: "#e6fffb",
    border: "1px solid #99f6e4",
    borderRadius: 14,
    padding: 14,
    lineHeight: 1.45,
    marginBottom: 12,
  },
  danger: {
    width: "100%",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: 11,
    background: "#fff",
    color: "#b91c1c",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
  },
  nota: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 14,
    padding: 13,
    fontSize: 12,
    lineHeight: 1.45,
  },
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    padding: "20px 0 6px",
  },
};
