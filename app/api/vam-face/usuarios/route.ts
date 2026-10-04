import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  if (!url || !serviceRole) throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function contexto(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("No autorizado.");

  const authClient = createClient(url, publishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) throw new Error("Sesión inválida.");

  const admin = adminClient();
  const { data: vinculo, error: ve } = await admin.from("usuarios_empresa")
    .select("empresa_id,rol,estado")
    .eq("auth_user_id", user.id).eq("estado","ACTIVO").limit(1).maybeSingle();

  if (ve || !vinculo || vinculo.rol !== "ADMIN_EMPRESA") throw new Error("Solo ADMIN_EMPRESA puede administrar usuarios.");
  return { admin, user, empresaId: vinculo.empresa_id };
}

export async function GET(req: NextRequest) {
  try {
    const { admin, empresaId } = await contexto(req);
    const { data: vinculos, error } = await admin.from("usuarios_empresa")
      .select("id,auth_user_id,rol,estado,created_at")
      .eq("empresa_id",empresaId).order("created_at");
    if (error) throw error;

    const { data: authData, error: ae } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (ae) throw ae;
    const emails = new Map((authData.users||[]).map(u=>[u.id,u.email||""]));

    return NextResponse.json({ usuarios:(vinculos||[]).map(v=>({...v,email:emails.get(v.auth_user_id)||""})) });
  } catch (e:any) {
    return NextResponse.json({ error:e?.message||"Error interno." }, { status:403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { admin, empresaId } = await contexto(req);
    const body = await req.json();
    const email = String(body?.email||"").trim().toLowerCase();
    const rol = String(body?.rol||"");
    const roles = ["ADMIN_EMPRESA","RRHH","SUPERVISOR","EMPLEADO"];
    if (!email || !roles.includes(rol)) return NextResponse.json({error:"Correo o rol inválido."},{status:400});

    const { data:list, error:le } = await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(le) throw le;
    let authUser = (list.users||[]).find(u=>(u.email||"").toLowerCase()===email);

    if (!authUser) {
      const redirectTo = `${req.nextUrl.origin}/vam-face-prueba`;
      const { data:inv, error:ie } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if(ie) throw ie;
      authUser = inv.user;
    }
    if(!authUser) throw new Error("No fue posible obtener el usuario de Auth.");

    const { data:existente } = await admin.from("usuarios_empresa")
      .select("id").eq("auth_user_id",authUser.id).eq("empresa_id",empresaId).maybeSingle();

    if(existente) {
      return NextResponse.json(
        {error:"Este correo ya está vinculado a la empresa. Para cambiar su rol utiliza la lista de Usuarios y roles."},
        {status:409}
      );
    }

    const {error}=await admin.from("usuarios_empresa").insert({auth_user_id:authUser.id,empresa_id:empresaId,rol,estado:"ACTIVO"});
    if(error) throw error;
    return NextResponse.json({mensaje:"Invitación enviada y usuario vinculado correctamente."});
  } catch(e:any) {
    return NextResponse.json({error:e?.message||"Error interno."},{status:400});
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { admin, user, empresaId } = await contexto(req);
    const body=await req.json();
    const id=String(body?.id||"");
    const rol=String(body?.rol||"");
    const estado=String(body?.estado||"");
    if(!id || !["ADMIN_EMPRESA","RRHH","SUPERVISOR","EMPLEADO"].includes(rol) || !["ACTIVO","INACTIVO"].includes(estado))
      return NextResponse.json({error:"Datos inválidos."},{status:400});

    const {data:objetivo,error:oe}=await admin.from("usuarios_empresa")
      .select("id,auth_user_id").eq("id",id).eq("empresa_id",empresaId).single();
    if(oe||!objetivo) throw new Error("Usuario no encontrado.");

    if(objetivo.auth_user_id===user.id && estado==="INACTIVO")
      return NextResponse.json({error:"No puedes desactivar tu propio acceso desde esta pantalla."},{status:400});

    if(objetivo.auth_user_id===user.id && rol!=="ADMIN_EMPRESA")
      return NextResponse.json({error:"No puedes quitarte tu propio rol ADMIN_EMPRESA desde esta pantalla."},{status:400});

    const {error}=await admin.from("usuarios_empresa")
      .update({rol,estado,updated_at:new Date().toISOString()})
      .eq("id",id).eq("empresa_id",empresaId);
    if(error) throw error;
    return NextResponse.json({mensaje:"Usuario y rol actualizados correctamente."});
  } catch(e:any) {
    return NextResponse.json({error:e?.message||"Error interno."},{status:400});
  }
}
