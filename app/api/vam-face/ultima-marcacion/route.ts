import { NextRequest,NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 const auth=/^Kiosk\s+([0-9a-f]{64})$/i.exec(req.headers.get('authorization')||'');
 if(!auth)return NextResponse.json({error:'Credencial requerida'},{status:401});
 const b=await req.json().catch(()=>null);
 const uuid=/^[0-9a-f-]{36}$/i;
 if(!b||typeof b.dispositivo_id!=='string'||!uuid.test(b.dispositivo_id)||typeof b.empleado_id!=='string'||!uuid.test(b.empleado_id))return NextResponse.json({error:'Parámetros inválidos'},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Configuración incompleta'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const hash=createHash('sha256').update(auth[1].toLowerCase()).digest('hex');
 const {data:v,error:ve}=await db.rpc('validar_credencial_kiosco',{p_dispositivo_id:b.dispositivo_id,p_token_hash:hash});
 if(ve||!Array.isArray(v)||!v[0]?.autorizado)return NextResponse.json({error:'Kiosco no autorizado'},{status:403});
 const {data:e}=await db.from('empleados').select('id').eq('id',b.empleado_id).eq('empresa_id',v[0].empresa_id).eq('estado','ACTIVO').maybeSingle();
 if(!e)return NextResponse.json({error:'Empleado no autorizado'},{status:403});
 const now=new Date();const dia=now.toLocaleDateString('sv-SE',{timeZone:'America/Santo_Domingo'});
 const start=new Date(`${dia}T00:00:00-04:00`).toISOString();
 const {data,error}=await db.from('marcaciones').select('tipo,fecha_hora').eq('empresa_id',v[0].empresa_id).eq('empleado_id',b.empleado_id).gte('fecha_hora',start).order('fecha_hora',{ascending:false}).limit(1);
 if(error)return NextResponse.json({error:'No se pudo consultar marcación'},{status:500});
 return NextResponse.json({tipo:data?.[0]?.tipo||null,fecha_hora:data?.[0]?.fecha_hora||null},{headers:{'Cache-Control':'no-store'}});
}
