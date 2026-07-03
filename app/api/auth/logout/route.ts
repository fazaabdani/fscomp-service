import { NextResponse } from "next/server";
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set("fs_session","",{maxAge:0,path:"/"});return r}
