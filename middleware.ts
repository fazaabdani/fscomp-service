import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// Node.js runtime (not Edge) so verifySession can use the `crypto` module.
export const runtime = "nodejs";

export function middleware(req:NextRequest){
  const path=req.nextUrl.pathname;
  if(path==="/"&&req.nextUrl.searchParams.has("service")){
    const url=req.nextUrl.clone();url.pathname="/track";url.searchParams.set("id",req.nextUrl.searchParams.get("service")||"");url.searchParams.delete("service");return NextResponse.redirect(url);
  }
  const publicPath=path.startsWith("/login")||path.startsWith("/track")||path.startsWith("/api/auth")||path.startsWith("/api/public")||path.startsWith("/api/internal")||path==="/api/health"||path.startsWith("/_next")||path==="/icon.svg";
  if(publicPath)return NextResponse.next();
  if(!verifySession(req.cookies.get("fs_session")?.value)){const url=req.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",path);const res=NextResponse.redirect(url);res.cookies.delete("fs_session");return res}
  return NextResponse.next();
}
export const config={matcher:["/((?!favicon.ico).*)"]};
