import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const auth = /^Kiosk\s+([0-9a-f]{64})$/i.exec(req.headers.get('authorization') || '');
  if (!auth) return NextResponse.json({error:'Credencial requerida'}, {status:401});
  const body = await req.json().catch(()=>null);
  if (!body || typeof body.dispositivo_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.dispositivo_id)) return NextResponse.json({error:'Dispositivo inválido'}, {status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({error:'Configuración incompleta'}, {status:503});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const hash=createHash('sha256').update(auth[1].toLowerCase()).digest('hex');
  const {data,error}=await db.rpc('validar_credencial_kiosco',{p_dispositivo_id:body.dispositivo_id,p_token_hash:hash});
  if(error || !Array.isArray(data) || !data[0]?.autorizado) return NextResponse.json({error:'Kiosco no autorizado o revocado'}, {status:403,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({ok:true,empresa_id:data[0].empresa_id,sucursal_id:data[0].sucursal_id},{headers:{'Cache-Control':'no-store'}});
}
