import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9a-f]{64}$/;
const json = (data: object, status: number) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return json({ error: "Configuración del servidor incompleta." }, 503);

    // Credencial de kiosco enviada únicamente en el encabezado; nunca en la URL.
    const authorization = request.headers.get("authorization") ?? "";
    const match = /^Kiosk\s+([0-9a-f]{64})$/i.exec(authorization);
    if (!match) return json({ error: "Credencial del kiosco requerida." }, 401);
    const token = match[1].toLowerCase();
    if (!TOKEN_RE.test(token)) return json({ error: "Credencial inválida." }, 401);

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Datos inválidos." }, 400);
    const b = body as Record<string, unknown>;
    if (
      typeof b.dispositivo_id !== "string" || !UUID_RE.test(b.dispositivo_id) ||
      typeof b.empleado_id !== "string" || !UUID_RE.test(b.empleado_id) ||
      typeof b.evento_uuid !== "string" || !UUID_RE.test(b.evento_uuid) ||
      (b.tipo !== "ENTRADA" && b.tipo !== "SALIDA") ||
      typeof b.confianza !== "number" || !Number.isFinite(b.confianza) ||
      b.confianza < 0 || b.confianza > 1
    ) return json({ error: "Parámetros de marcación inválidos." }, 400);

    const tokenHash = createHash("sha256").update(token).digest("hex");
    // La clave de servicio solo se utiliza en el servidor, nunca se devuelve al cliente.
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // SQL 016/017 verifican estado y pertenencia. La función de registro vuelve a
    // comprobar la credencial en la misma transacción que inserta la marcación.
    const { data, error } = await db.rpc("registrar_marcacion_kiosco", {
      p_dispositivo_id: b.dispositivo_id,
      p_token_hash: tokenHash,
      p_empleado_id: b.empleado_id,
      p_tipo: b.tipo,
      p_confianza: b.confianza,
      p_evento_uuid: b.evento_uuid,
    });
    if (error) {
      // No filtrar detalles internos de base de datos ni datos biométricos.
      return json({ error: "No se pudo registrar la marcación. Verifique autorización y datos." }, 403);
    }
    if (typeof data !== "string" || !UUID_RE.test(data))
      return json({ error: "Respuesta de registro no válida." }, 502);
    return json({ ok: true, marcacion_id: data }, 200);
  } catch {
    return json({ error: "Solicitud no procesada." }, 400);
  }
}
