import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken, getUserRoleByEmail, canCreatePaidSpots } from "@/lib/auth"
import { guardWriteOperation } from "@/lib/systemGuard"

export const dynamic = "force-dynamic"

const MAX_FILES = 8
const MAX_FILE_BYTES = 15 * 1024 * 1024
const EXTENSIONS: Record<string,string> = {
  "image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf",
  "application/msword":"doc","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","text/plain":"txt"
}
const schema = z.object({
  kind:z.enum(["art","service","both"]),author:z.string().trim().min(1).max(120),email:z.string().email().max(254),
  bio:z.string().max(500).optional().default(""),note:z.string().max(1200).optional().default(""),
  arts:z.array(z.object({title:z.string().trim().min(1).max(160),category:z.string().max(40),text:z.string().max(12000).optional().default("")})).max(8).optional().default([]),
  service:z.object({name:z.string().trim().min(1).max(120),category:z.string().max(40),description:z.string().trim().min(1).max(1200),area:z.string().max(160).optional().default(""),website:z.string().max(300).optional().default(""),contact:z.string().max(180).optional().default("")}).nullable().optional(),
  consents:z.object({data:z.literal(true),rights:z.boolean(),publication:z.boolean(),crew:z.boolean()})
})

export async function POST(req: NextRequest) {
  const guarded=await guardWriteOperation(req as never)
  if(guarded)return guarded
  const token=parseBearerToken(req.headers)
  if(!token)return NextResponse.json({error:"unauthenticated"},{status:401})
  const user=await getUserFromToken(token)
  if(!user)return NextResponse.json({error:"unauthenticated"},{status:401})

  let form:FormData
  try{form=await req.formData()}catch{return NextResponse.json({error:"invalid_form"},{status:400})}
  if(String(form.get("company")||"").trim())return NextResponse.json({error:"invalid_payload"},{status:400})
  const raw=form.get("payload")
  if(typeof raw!=="string"||raw.length>100_000)return NextResponse.json({error:"invalid_payload"},{status:400})
  let body:unknown
  try{body=JSON.parse(raw)}catch{return NextResponse.json({error:"invalid_payload"},{status:400})}
  const result=schema.safeParse(body)
  if(!result.success)return NextResponse.json({error:"missing_fields",details:result.error.flatten()},{status:400})
  const data=result.data
  const hasArt=data.kind==="art"||data.kind==="both"
  const hasService=data.kind==="service"||data.kind==="both"
  if(hasArt&&(!data.arts.length||!data.consents.rights||!data.consents.publication))return NextResponse.json({error:"missing_fields"},{status:400})
  if(hasService&&(!data.service||!data.consents.crew))return NextResponse.json({error:"missing_fields"},{status:400})
  if(hasService&&!canCreatePaidSpots(getUserRoleByEmail(user.email)))return NextResponse.json({error:"crew_only"},{status:403})

  const files=form.getAll("files").filter((value):value is File=>value instanceof File)
  if(files.length>MAX_FILES)return NextResponse.json({error:"too_many_files"},{status:400})
  for(const file of files)if(!file.size||file.size>MAX_FILE_BYTES||!EXTENSIONS[file.type])return NextResponse.json({error:"invalid_file"},{status:400})

  const db=supabaseAdmin()
  const bucket=process.env.KALENDARIUM_STORAGE_BUCKET||"kalendarium-2027"
  const bucketResult=await db.storage.getBucket(bucket)
  if(bucketResult.error||!bucketResult.data){
    console.error("[kalendarium] storage bucket missing",bucketResult.error?.message)
    return NextResponse.json({error:"storage_not_configured"},{status:503})
  }

  const reference="VK27-"+crypto.randomUUID().slice(0,8).toUpperCase()
  const uploaded:string[]=[]
  try{
    const fileRecords=[]
    for(const file of files){
      const path=user.id+"/"+reference+"/"+crypto.randomUUID()+"."+EXTENSIONS[file.type]
      const {error}=await db.storage.from(bucket).upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,cacheControl:"3600",upsert:false})
      if(error)throw error
      uploaded.push(path)
      fileRecords.push({name:file.name,path,type:file.type,size:file.size})
    }
    const artworks=data.arts.map((art,index)=>({...art,attachments:index===0?fileRecords:[]}))
    const {data:row,error}=await db.from("kalendarium_submissions").insert({
      reference,user_id:user.id,kind:data.kind,author_name:data.author,contact_email:data.email,bio:data.bio,note:data.note,
      artworks:hasArt?artworks:[],service_listing:hasService?data.service:null,status:"new",
      payment_status:hasService?"not_requested":"not_applicable",consent_data_at:new Date().toISOString(),
      consent_rights:hasArt,consent_publication:hasArt,consent_crew:hasService
    }).select("id,reference").single()
    if(error)throw error
    return NextResponse.json({ok:true,id:row.id,reference:row.reference})
  }catch(error){
    if(uploaded.length)await db.storage.from(bucket).remove(uploaded)
    console.error("[kalendarium] submission failed",error)
    return NextResponse.json({error:"submit_failed"},{status:500})
  }
}
