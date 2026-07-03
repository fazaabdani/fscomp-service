import { copyFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
const source=path.resolve("prisma/data/fs-service.db"),dir=path.resolve("backups");await mkdir(dir,{recursive:true});await stat(source);const stamp=new Date().toISOString().replaceAll(":","-").replace("T","_").slice(0,19);const target=path.join(dir,`fs-service_${stamp}.db`);await copyFile(source,target);const files=(await readdir(dir)).filter(x=>x.endsWith(".db")).sort().reverse();for(const old of files.slice(30))await unlink(path.join(dir,old));console.log(`Backup dibuat: ${target}`);
