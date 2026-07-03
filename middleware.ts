import { NextRequest, NextResponse } from "next/server";

export function middleware(req:NextRequest){
  const path=req.nextUrl.pathname;
  if(path==="/"&&req.nextUrl.searchParams.has("service")){
    const url=req.nextUrl.clone();url.pathname="/track";url.searchParams.set("id",req.nextUrl.searchParams.get("service")||"");url.searchParams.delete("service");return NextResponse.redirect(url);
  }
  const publicPath=path.startsWith("/login")||path.startsWith("/track")||path.startsWith("/api/auth")||path.startsWith("/api/public")||path==="/api/health"||path.startsWith("/_next")||path==="/icon.svg";
  if(publicPath)return NextResponse.next();
  if(!req.cookies.get("fs_session")){const url=req.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",path);return NextResponse.redirect(url)}
  return NextResponse.next();
}
export const config={matcher:["/((?!favicon.ico).*)"]};
