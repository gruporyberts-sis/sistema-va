import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
  const auth=/^Kiosk\s+([0-9a-f]{64})$/i.exec(req.headers.get('authorization')||'');
  if(!auth)return NextResponse.json({error:'Credencial requerida'},{status:401});
  const body=await req.json().catch(()=>null);
  if(!body||typeof body.dispositivo_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.dispositivo_id))return NextResponse.json({error:'Dispositivo inválido'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Configuración incompleta'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const hash=createHash('sha256').update(auth[1].toLowerCase()).digest('hex');
  const {data:v,error:ve}=await db.rpc('validar_credencial_kiosco',{p_dispositivo_id:body.dispositivo_id,p_token_hash:hash});
  if(ve||!Array.isArray(v)||!v[0]?.autorizado)return NextResponse.json({error:'Kiosco no autorizado'},{status:403});
  const empresa=v[0].empresa_id;
  const {data:biometrias,error:be}=await db.from('biometrias_faciales').select('empleado_id,embedding,modelo,version_modelo').eq('empresa_id',empresa).eq('estado','ACTIVA').eq('modelo','VAM_FACE_VISUAL_DEV').eq('version_modelo','0.1.30.1');
  if(be)return NextResponse.json({error:'No se pudieron cargar plantillas'},{status:500});
  const ids=[...new Set((biometrias||[]).map(x=>x.empleado_id))];
  const {data:empleados,error:ee}=ids.length?await db.from('empleados').select('id,nombres,apellidos,sucursal_id,estado').eq('empresa_id',empresa).eq('estado','ACTIVO').in('id',ids):{data:[],error:null};
  if(ee)return NextResponse.json({error:'No se pudieron cargar empleados'},{status:500});
  const mapa=new Map((empleados||[]).map(e=>[e.id,e]));
  // Solo para el piloto: las plantillas visuales quedan expuestas al dispositivo autorizado.
  const plantillas=(biometrias||[]).filter(b=>mapa.has(b.empleado_id)).map(b=>({...b,empleados:mapa.get(b.empleado_id)}));
  return NextResponse.json({plantillas},{headers:{'Cache-Control':'no-store'}});
}
