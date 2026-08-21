import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/session";
import { isRateLimited, clientKey } from "@/lib/rate-limit";
import { makePasswordHash, verifyPassword } from "@/lib/password";

// scryptSync is deliberately CPU-heavy; without a cap this unauthenticated
// endpoint is a cheap credential-stuffing / CPU-exhaustion target.
const WINDOW_MS=60_000;
const MAX_REQUESTS=10;
export async function POST(request:Request){
  if(isRateLimited("login",clientKey(request),WINDOW_MS,MAX_REQUESTS))return NextResponse.json({error:"Terlalu banyak percobaan, coba lagi sebentar lagi"},{status:429});
  const {username,password}=await request.json();
  if(typeof username!=="string"||typeof password!=="string")return NextResponse.json({error:"Data login tidak valid"},{status:400});
  let user=await prisma.user.findUnique({where:{username}});
  if(!user&&username===process.env.ADMIN_USERNAME&&password===process.env.ADMIN_PASSWORD){user=await prisma.user.create({data:{id:randomUUID(),name:"Administrator",username,passwordHash:makePasswordHash(password),role:"ADMIN"}})}
  if(!user||!user.active)return NextResponse.json({error:"Username atau password salah"},{status:401});
  if(!verifyPassword(password,user.passwordHash))return NextResponse.json({error:"Username atau password salah"},{status:401});
  const response=NextResponse.json({user:{id:user.id,name:user.name,username:user.username,role:user.role}});response.cookies.set("fs_session",signSession({id:user.id,name:user.name,username:user.username,role:user.role}),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60,path:"/"});return response;
}
