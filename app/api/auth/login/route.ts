import { NextResponse } from "next/server";
import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/session";

const hash=(password:string,salt:string)=>scryptSync(password,salt,64).toString("hex");
export async function POST(request:Request){
  const {username,password}=await request.json();
  if(typeof username!=="string"||typeof password!=="string")return NextResponse.json({error:"Data login tidak valid"},{status:400});
  let user=await prisma.user.findUnique({where:{username}});
  if(!user&&username===process.env.ADMIN_USERNAME&&password===process.env.ADMIN_PASSWORD){const salt=randomUUID();user=await prisma.user.create({data:{id:randomUUID(),name:"Administrator",username,passwordHash:`${salt}:${hash(password,salt)}`,role:"ADMIN"}})}
  if(!user||!user.active)return NextResponse.json({error:"Username atau password salah"},{status:401});
  const [salt,stored]=user.passwordHash.split(":");const candidate=hash(password,salt);if(!stored||!timingSafeEqual(Buffer.from(stored),Buffer.from(candidate)))return NextResponse.json({error:"Username atau password salah"},{status:401});
  const response=NextResponse.json({user:{id:user.id,name:user.name,username:user.username,role:user.role}});response.cookies.set("fs_session",signSession({id:user.id,name:user.name,username:user.username,role:user.role}),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60,path:"/"});return response;
}
