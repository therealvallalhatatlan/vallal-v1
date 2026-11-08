import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { guardWriteOperation } from "@/lib/systemGuard"
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit"

export const dynamic = "force-dynamic"

const MAX_FILES = 8
const MAX_FILE_BYTES = 15 * 1024 * 1024
const NOTIFICATION_EMAIL = "therealvallalhatatlan@gmail.com"
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

function escapeEmailHtml(value: string) {
  const entities: Record<string,string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
  return value.replace(/[&<>"']/g, (character) => entities[character] || character).replace(/\r?\n/g, "<br>")
}

export async function POST(req: NextRequest) {
  const guarded=await guardWriteOperation(req as never)
  if(guarded)return guarded
  const rate=checkRateLimit("kalendarium-submission:"+getClientIp(req),5,60*60_000)
  if(!rate.allowed)return NextResponse.json({error:"rate_limited",retryAfterSeconds:rate.retryAfterSeconds},{status:429,headers:{"Retry-After":String(rate.retryAfterSeconds),"Cache-Control":"no-store"}})
  // A valid session is optional. Guest submissions are stored with a null user_id.
  const token=parseBearerToken(req.headers)
  const user=token?await getUserFromToken(token):null

  let form:FormData
  try{form=await req.formData()}catch{return NextResponse.json({error:"invalid_form"},{status:400})}
  if(String(form.get("company")||"").trim())return NextResponse.json({error:"invalid_payload"},{status:400})
  const raw=form.get("payload")
  if(typeof raw!=="string"||raw.length>100_000)return NextResponse.json({error:"invalid_payload"},{status:400})
  let body:unknown
  try{body=JSON.parse(raw)}catch{return NextResponse.json({error:"invalid_payload"},{status:400})}
  // The UI keeps one empty draft artwork in state even for service-only entries.
  // Ignore that unused branch before validating the payload.
  const validationBody =
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    "kind" in body &&
    body.kind === "service"
      ? { ...body, arts: [] }
      : body
  const result=schema.safeParse(validationBody)
  if(!result.success)return NextResponse.json({error:"missing_fields",details:result.error.flatten()},{status:400})
  const data=result.data
  const hasArt=data.kind==="art"||data.kind==="both"
  const hasService=data.kind==="service"||data.kind==="both"
  if(hasArt&&(!data.arts.length||!data.consents.rights||!data.consents.publication))return NextResponse.json({error:"missing_fields"},{status:400})
  if(hasService&&(!data.service||!data.consents.crew))return NextResponse.json({error:"missing_fields"},{status:400})

  const fileEntries=data.arts.map((_,index)=>({index,value:form.get("art_file_"+index)})).filter((entry):entry is {index:number;value:File}=>entry.value instanceof File)
  if(fileEntries.length>MAX_FILES)return NextResponse.json({error:"too_many_files"},{status:400})
  for(const entry of fileEntries)if(!entry.value.size||entry.value.size>MAX_FILE_BYTES||!EXTENSIONS[entry.value.type])return NextResponse.json({error:"invalid_file"},{status:400})

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
    const fileRecordsByArt:Record<number,Array<{name:string;path:string;type:string;size:number}>>={}
    for(const entry of fileEntries){
      const file=entry.value
      const path=(user?.id||"guest")+"/"+reference+"/"+crypto.randomUUID()+"."+EXTENSIONS[file.type]
      const {error}=await db.storage.from(bucket).upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,cacheControl:"3600",upsert:false})
      if(error)throw error
      uploaded.push(path)
      fileRecordsByArt[entry.index]=[{name:file.name,path,type:file.type,size:file.size}]
    }
    const artworks=data.arts.map((art,index)=>({...art,attachments:fileRecordsByArt[index]||[]}))
    const {data:row,error}=await db.from("kalendarium_submissions").insert({
      reference,user_id:user?.id??null,kind:data.kind,author_name:data.author,contact_email:data.email,bio:data.bio,note:data.note,
      artworks:hasArt?artworks:[],service_listing:hasService?data.service:null,status:"new",
      payment_status:hasService?"not_requested":"not_applicable",consent_data_at:new Date().toISOString(),
      consent_rights:hasArt,consent_publication:hasArt,consent_crew:hasService
    }).select("id,reference").single()
    if(error)throw error

    // Email is deliberately best-effort: a notification outage must never undo
    // a successfully saved submission or cause users to submit duplicate records.
    let notificationSent=false
    const resendApiKey=process.env.RESEND_API_KEY
    const emailFrom=process.env.EMAIL_FROM
    if(resendApiKey&&emailFrom){
      try{
        const attachmentLinks:Array<{artIndex:number;name:string;url:string|null}>=[]
        for(const [index,records] of Object.entries(fileRecordsByArt)){
          for(const file of records){
            const {data:signed,error:signedError}=await db.storage.from(bucket).createSignedUrl(file.path,7*24*60*60)
            if(signedError)console.warn("[kalendarium] attachment link could not be created",signedError.message)
            attachmentLinks.push({artIndex:Number(index)+1,name:file.name,url:signed?.signedUrl||null})
          }
        }

        const kindLabel=data.kind==="art"?"Alkotás":data.kind==="service"?"V Crew Arany Oldalak":"Alkotás + V Crew Arany Oldalak"
        const attachmentText=attachmentLinks.length
          ? attachmentLinks.map(file=>"Alkotás "+file.artIndex+": "+file.name+(file.url?"\nLetöltés (7 napig): "+file.url:"\nA fájl a privát Supabase tárhelyen van; letöltési link nem készült.")).join("\n\n")
          : "Nincs feltöltött fájl."
        const artworkText=hasArt?artworks.map((art,index)=>[
          "ALKOTÁS "+(index+1),
          "Cím: "+art.title,
          "Kategória: "+art.category,
          "Szöveg / leírás:\n"+(art.text||"(üres)"),
          "Csatolmányok: "+((art.attachments||[]).map(file=>file.name).join(", ")||"nincs")
        ].join("\n")).join("\n\n"):"Nem küldött alkotást."
        const serviceText=hasService&&data.service?[
          "Név: "+data.service.name,
          "Kategória: "+data.service.category,
          "Leírás: "+data.service.description,
          "Terület: "+(data.service.area||"-"),
          "Weboldal: "+(data.service.website||"-"),
          "Publikálható elérhetőség: "+(data.service.contact||"-")
        ].join("\n"):"Nem küldött szolgáltatást."
        const notificationText=[
          "Új Kalendárium 2027 beküldés érkezett.",
          "Azonosító: "+row.reference,
          "Típus: "+kindLabel,
          "",
          "KAPCSOLAT",
          "Név: "+data.author,
          "E-mail: "+data.email,
          "Bemutatkozás: "+(data.bio||"-"),
          "Üzenet: "+(data.note||"-"),
          "",
          "ALKOTÁSOK",
          artworkText,
          "",
          "SZOLGÁLTATÁS",
          serviceText,
          "",
          "CSATOLMÁNYOK ÉS LETÖLTÉSEK",
          attachmentText,
          "",
          "NYILATKOZATOK",
          "Adatkezelés: elfogadva",
          "Szerzői jog: "+(data.consents.rights?"elfogadva":"nem releváns"),
          "Publikáció: "+(data.consents.publication?"elfogadva":"nem releváns"),
          "Szolgáltatás adatai: "+(data.consents.crew?"megerősítve":"nem releváns"),
          "",
          "Beküldési azonosító: "+row.reference
        ].join("\n")

        const artHtml=hasArt?artworks.map((art,index)=>[
          '<section style="margin-bottom:18px"><h3 style="font-size:14px">'+(index+1)+'. '+escapeEmailHtml(art.title)+'</h3>',
          '<p><strong>Kategória:</strong> '+escapeEmailHtml(art.category)+'</p>',
          '<p>'+escapeEmailHtml(art.text||"(üres)")+'</p></section>'
        ].join("")).join(""):""
        const serviceHtml=hasService&&data.service?[
          '<h2 style="font-size:16px;border-bottom:1px solid #ddd;padding-bottom:6px">V Crew Arany Oldalak</h2>',
          '<p><strong>'+escapeEmailHtml(data.service.name)+'</strong><br>'+escapeEmailHtml(data.service.category)+'<br>',
          escapeEmailHtml(data.service.description)+'<br>Terület: '+escapeEmailHtml(data.service.area||"-")+'<br>',
          'Web: '+escapeEmailHtml(data.service.website||"-")+'<br>Publikálható elérhetőség: '+escapeEmailHtml(data.service.contact||"-")+'</p>'
        ].join(""):""
        const attachmentHtml=attachmentLinks.length?[
          '<h2 style="font-size:16px;border-bottom:1px solid #ddd;padding-bottom:6px">Csatolmányok (7 napig elérhető linkek)</h2><ul>',
          attachmentLinks.map(file=>'<li>Alkotás '+file.artIndex+': '+escapeEmailHtml(file.name)+(file.url?' · <a href="'+escapeEmailHtml(file.url)+'">Letöltés</a>':" · Letöltési link nem készült")+'</li>').join(""),
          '</ul>'
        ].join(""):"<p><strong>Csatolmány:</strong> nincs.</p>"
        const html=[
          '<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.55;max-width:720px">',
          '<h1 style="font-size:22px">Új Kalendárium 2027 beküldés</h1>',
          '<p><strong>Azonosító:</strong> '+escapeEmailHtml(row.reference)+'<br><strong>Típus:</strong> '+escapeEmailHtml(kindLabel)+'</p>',
          '<h2 style="font-size:16px;border-bottom:1px solid #ddd;padding-bottom:6px">Kapcsolat</h2>',
          '<p><strong>Név:</strong> '+escapeEmailHtml(data.author)+'<br><strong>E-mail:</strong> '+escapeEmailHtml(data.email)+'<br><strong>Bemutatkozás:</strong><br>'+escapeEmailHtml(data.bio||"-")+'<br><strong>Üzenet:</strong><br>'+escapeEmailHtml(data.note||"-")+'</p>',
          hasArt?'<h2 style="font-size:16px;border-bottom:1px solid #ddd;padding-bottom:6px">Alkotások</h2>'+artHtml:"",
          serviceHtml,
          attachmentHtml,
          '<h2 style="font-size:16px;border-bottom:1px solid #ddd;padding-bottom:6px">Nyilatkozatok</h2>',
          '<p>Adatkezelés: elfogadva<br>Szerzői jog: '+(data.consents.rights?"elfogadva":"nem releváns")+'<br>Publikáció: '+(data.consents.publication?"elfogadva":"nem releváns")+'<br>Szolgáltatás adatai: '+(data.consents.crew?"megerősítve":"nem releváns")+'</p>',
          '</div>'
        ].join("")

        const {error:emailError}=await new Resend(resendApiKey).emails.send({
          from:emailFrom,
          to:[NOTIFICATION_EMAIL],
          replyTo:data.email,
          subject:"[Kalendárium 2027] Új beküldés: "+row.reference,
          text:notificationText,
          html
        })
        if(emailError)throw emailError
        notificationSent=true
      }catch(emailError){
        console.error("[kalendarium] submission saved, but notification email failed",emailError)
      }
    }else{
      console.error("[kalendarium] submission saved, but RESEND_API_KEY or EMAIL_FROM is missing")
    }

    return NextResponse.json({ok:true,id:row.id,reference:row.reference,notificationSent})
  }catch(error){
    if(uploaded.length)await db.storage.from(bucket).remove(uploaded)
    console.error("[kalendarium] submission failed",error)
    return NextResponse.json({error:"submit_failed"},{status:500})
  }
}
