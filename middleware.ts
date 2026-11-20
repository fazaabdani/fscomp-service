import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { MULTI_TENANT, TENANT_HEADER, clientFor } from "@/lib/prisma";
import { resolveTenant } from "@/lib/master";

// Node.js runtime (not Edge) so verifySession can use the `crypto` module.
export const runtime = "nodejs";

const page = (title: string, body: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4f7fb;color:#172033"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:20px">${title}</h1><p style="color:#5f6c84;line-height:1.6">${body}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function middleware(req:NextRequest){
  const path=req.nextUrl.pathname;
  if(path==="/"&&req.nextUrl.searchParams.has("service")){
    const url=req.nextUrl.clone();url.pathname="/track";url.searchParams.set("id",req.nextUrl.searchParams.get("service")||"");url.searchParams.delete("service");return NextResponse.redirect(url);
  }
  // Static assets (logo, favicon, etc.) must stay public regardless of file
  // name, or an unauthenticated visitor (e.g. on /login or /track) gets
  // redirected back to /login trying to fetch the image itself. Scoped away
  // from /api so a future route whose path/segment happens to end in one of
  // these extensions can't be swept into "public" by accident.
  const isStaticAsset=!path.startsWith("/api")&&/\.(png|jpg|jpeg|svg|webp|gif|ico|css|js|map)$/.test(path);

  // Multi-shop mode: the shop comes from the Host header, never from anything the client sends.
  // Any x-tenant-slug the browser supplies is dropped and replaced by the verified one.
  const forward=new Headers(req.headers);
  forward.delete(TENANT_HEADER);
  let slug:string|null=null;
  if(MULTI_TENANT){
    if(path==="/api/health"||path.startsWith("/_next")||isStaticAsset)
      return NextResponse.next({request:{headers:forward}});
    const res=await resolveTenant(req.headers.get("host"));
    if(!res.ok){
      const json=path.startsWith("/api");
      if(res.reason==="suspended")
        return json?NextResponse.json({error:"Langganan toko ini tidak aktif"},{status:402}):page("Langganan tidak aktif","Akses toko ini sedang dihentikan sementara. Hubungi pemilik toko atau penyedia layanan untuk mengaktifkannya kembali. Data toko tetap aman.",402);
      return json?NextResponse.json({error:"Toko tidak ditemukan"},{status:404}):page("Toko tidak ditemukan","Alamat ini belum terhubung ke toko mana pun. Periksa kembali alamat yang Anda buka.",404);
    }
    slug=res.tenant.slug;
    forward.set(TENANT_HEADER,slug);
  }
  const pass=()=>NextResponse.next({request:{headers:forward}});

  const publicPath=isStaticAsset||path.startsWith("/login")||path.startsWith("/track")||path.startsWith("/api/auth")||path.startsWith("/api/public")||path.startsWith("/api/internal")||path==="/api/health"||path.startsWith("/_next");
  if(publicPath)return pass();
  const claimed=verifySession(req.cookies.get("fs_session")?.value,slug);
  // The signed cookie can't be revoked on its own — re-check the DB so a
  // deactivated account is kicked to /login within one request instead of
  // surviving until its 8h cookie expires.
  const user=claimed?await clientFor(slug).user.findUnique({where:{id:claimed.id}}):null;
  if(!user||!user.active){
    // /api/* must answer with real JSON so fetch() callers can tell the
    // difference between "not logged in" and actual data — a redirect gets
    // silently followed to the login page's HTML, which then fails to
    // parse as JSON and previously left client-side 401 handling unable to
    // ever see a 401 at all.
    if(path.startsWith("/api")){const res=NextResponse.json({error:"Unauthorized"},{status:401});res.cookies.delete("fs_session");return res}
    const url=req.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",path);const res=NextResponse.redirect(url);res.cookies.delete("fs_session");return res
  }
  // Interns (Magang) work only in the QC checklist: the QC endpoints and the
  // page itself. Every other API — money, customers, settings, tickets — is
  // closed to them here, not just hidden in the UI.
  if(user.role==="INTERN"&&path.startsWith("/api")&&!path.startsWith("/api/qc")){
    return NextResponse.json({error:"Akun Magang hanya dapat mengakses menu QC"},{status:403});
  }
  return pass();
}
export const config={matcher:["/((?!favicon.ico).*)"]};
