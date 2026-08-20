import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// Node.js runtime (not Edge) so verifySession can use the `crypto` module.
export const runtime = "nodejs";

export function middleware(req:NextRequest){
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
  const publicPath=isStaticAsset||path.startsWith("/login")||path.startsWith("/track")||path.startsWith("/api/auth")||path.startsWith("/api/public")||path.startsWith("/api/internal")||path==="/api/health"||path.startsWith("/_next");
  if(publicPath)return NextResponse.next();
  if(!verifySession(req.cookies.get("fs_session")?.value)){const url=req.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",path);const res=NextResponse.redirect(url);res.cookies.delete("fs_session");return res}
  return NextResponse.next();
}
export const config={matcher:["/((?!favicon.ico).*)"]};
