import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!match) {
      return NextResponse.json({ error: "Se requiere una sesión administrativa." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("dispositivo_id" in body)) {
      return NextResponse.json({ error: "Falta dispositivo_id." }, { status: 400 });
    }
    const dispositivoId = (body as { dispositivo_id: unknown }).dispositivo_id;
    if (typeof dispositivoId !== "string" || !UUID_RE.test(dispositivoId)) {
      return NextResponse.json({ error: "dispositivo_id inválido." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Configuración de Supabase incompleta." }, { status: 500 });
    }

    // Cliente de solicitud: opera con el JWT del administrador, NO con service_role.
    const db = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await db.auth.getUser(match[1]);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Sesión inválida o vencida." }, { status: 401 });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    // SQL 015 comprueba ADMIN_EMPRESA y revoca la credencial anterior.
    const { data: credencialId, error } = await db.rpc("activar_credencial_kiosco", {
      p_dispositivo_id: dispositivoId,
      p_token_hash: tokenHash,
    });
    if (error) {
      // No exponer detalles de Postgres al cliente.
      return NextResponse.json({ error: "No se pudo autorizar el dispositivo. Verifique sus permisos y su estado." }, { status: 403 });
    }

    return NextResponse.json(
      { dispositivo_id: dispositivoId, credencial_id: credencialId, token },
      { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } },
    );
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
}
