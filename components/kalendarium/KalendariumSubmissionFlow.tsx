"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, ImagePlus, Loader2, Plus, Store, Trash2, UploadCloud } from "lucide-react"

type Kind = "art" | "service" | "both"
type Art = { title: string; category: string; text: string; file: File | null }
type Service = { name: string; category: string; description: string; area: string; website: string; contact: string }
type Answers = { kind: Kind | ""; author: string; email: string; bio: string; note: string; arts: Art[]; service: Service; dataConsent: boolean; rightsConsent: boolean; publicationConsent: boolean; crewConfirmed: boolean }

const categories = [["irodalom","Irodalom / próza"],["vers","Vers"],["fotografia","Fotográfia"],["grafika","Grafika / illusztráció"],["kepzomuveszet","Képzőművészet"],["archivum","Archívum / dokumentum"],["egyeb","Egyéb"]]
const serviceCategories = [["kreativ","Kreatív / design"],["technologia","Technológia / informatika"],["foto-video-zene","Fotó / videó / zene"],["epitoipar","Építőipar / szerelés"],["eletmod","Szépség / életmód"],["uzleti","Üzleti / tanácsadói szolgáltatás"],["egyeb","Egyéb"]]
const emptyArt = (): Art => ({ title:"", category:"irodalom", text:"", file:null })
const emptyService = (): Service => ({ name:"", category:"kreativ", description:"", area:"", website:"", contact:"" })
const initial: Answers = { kind:"", author:"", email:"", bio:"", note:"", arts:[emptyArt()], service:emptyService(), dataConsent:false, rightsConsent:false, publicationConsent:false, crewConfirmed:false }
const inputClass = "mt-2 min-h-12 w-full rounded-none border border-zinc-700 bg-black/60 px-3 py-3 text-base text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-lime-200/70 focus:ring-1 focus:ring-lime-200/20 sm:text-sm"
const labelClass = "block font-mono text-[10px] uppercase tracking-[.16em] text-zinc-400"
const buttonClass = "inline-flex min-h-12 items-center justify-center gap-2 border border-lime-200/50 bg-lime-200/[.07] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-lime-100 transition hover:bg-lime-200/[.14] disabled:cursor-not-allowed disabled:opacity-35"

function errorMessage(code:string) {
  const messages:Record<string,string> = {
    missing_fields:"Néhány kötelező adat hiányzik. Ellenőrizd a megjelölt mezőket.",
    unauthenticated:"A munkamenet lejárt. Jelentkezz be újra, majd küldd el ismét.",
    crew_only:"Az Arany Oldalak fizetett megjelenése jelenleg csak ellenőrzött V Crew-tagoknak érhető el.",
    storage_not_configured:"A fájltárhely még nincs bekötve. A beküldést most nem rögzítettük.",
    rate_limited:"Túl sok beküldési kísérlet történt. Próbáld újra később.",
    submit_failed:"A beküldés most nem sikerült. Próbáld újra később."
  }
  return messages[code] || "Valami hiba történt. Próbáld újra."
}

export default function KalendariumSubmissionFlow() {
  const { session, loading } = useSessionGuard() as { session:{access_token:string;user?:{id:string;email?:string|null}}|null; loading:boolean }
  const [answers,setAnswers] = useState<Answers>(initial)
  const [step,setStep] = useState(0)
  const [submitted,setSubmitted] = useState<{id:string;reference:string}|null>(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState("")
  const [crewAllowed,setCrewAllowed] = useState(false)
  const [checkingCrew,setCheckingCrew] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const artBranch = answers.kind==="art" || answers.kind==="both"
  const serviceBranch = answers.kind==="service" || answers.kind==="both"
  const steps = useMemo(()=>["start",...(artBranch?["art"]:[]),...(serviceBranch?["service"]:[]),"contact","review"],[artBranch,serviceBranch])
  const current = steps[step] || "start"
  const progress = Math.round((step/(steps.length-1))*100)

  useEffect(()=>{
    if(!session?.access_token || !serviceBranch){setCrewAllowed(false);return}
    let active=true
    setCheckingCrew(true)
    fetch("/api/kalendarium/eligibility",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"})
      .then(async r=>({ok:r.ok,data:await r.json()}))
      .then(({ok,data})=>{if(active)setCrewAllowed(Boolean(ok&&data?.eligible))})
      .catch(()=>{if(active)setCrewAllowed(false)})
      .finally(()=>{if(active)setCheckingCrew(false)})
    return ()=>{active=false}
  },[session?.access_token,serviceBranch])

  useEffect(()=>{
    try {
      const saved=localStorage.getItem("kalendarium-2027-draft-v1")
      if(saved&&!submitted){
        const parsed=JSON.parse(saved)
        setAnswers(current=>({...current,...parsed,arts:Array.isArray(parsed.arts)&&parsed.arts.length?parsed.arts.map((a:Art)=>({...a,file:null})):current.arts}))
      }
    } catch { /* invalid local draft is ignored */ }
  },[submitted])

  useEffect(()=>{
    try { localStorage.setItem("kalendarium-2027-draft-v1",JSON.stringify({...answers,arts:answers.arts.map(({file,...a})=>a)})) } catch { /* local storage can be disabled */ }
  },[answers])

  const update = <K extends keyof Answers>(key:K,value:Answers[K])=>setAnswers(current=>({...current,[key]:value}))
  const updateArt = (index:number,patch:Partial<Art>)=>setAnswers(current=>({...current,arts:current.arts.map((a,i)=>i===index?{...a,...patch}:a)}))
  const updateService = (patch:Partial<Service>)=>setAnswers(current=>({...current,service:{...current.service,...patch}}))
  const validate = () => {
    if(current==="start"&&!answers.kind)return "Válassz egy beküldési módot."
    if(current==="art"&&answers.arts.some(a=>!a.title.trim()||(!a.text.trim()&&!a.file)))return "Minden alkotáshoz adj címet és szöveget vagy fájlt."
    if(current==="service"&&(!answers.service.name.trim()||!answers.service.description.trim()))return "Add meg a szolgáltatás nevét és leírását."
    if(current==="contact"&&(!answers.author.trim()||!answers.email.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)))return "Add meg a nevedet és egy érvényes e-mail-címet."
    return ""
  }
  const next = () => {const message=validate();if(message){setError(message);return}setError("");setStep(s=>Math.min(steps.length-1,s+1))}
  const back = () => {setError("");setStep(s=>Math.max(0,s-1))}
  const addFile = (file:File|null,index:number) => {
    if(!file)return
    if(file.size>15*1024*1024){setError("Egy fájl legfeljebb 15 MB lehet.");return}
    const allowed=["image/jpeg","image/png","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"]
    if(!allowed.includes(file.type)){setError("JPG, PNG, WEBP, PDF, DOC, DOCX vagy TXT fájlt válassz.");return}
    updateArt(index,{file});setError("")
  }
  const submit = async () => {
    if(!answers.dataConsent||(artBranch&&(!answers.rightsConsent||!answers.publicationConsent))||(serviceBranch&&!answers.crewConfirmed)){setError("Fogadd el a szükséges nyilatkozatokat.");return}
    if(serviceBranch&&!crewAllowed){setError("Az Arany Oldalakhoz ellenőrzött V Crew-tagság szükséges.");return}
    if(!session?.access_token){setError("A beküldéshez jelentkezz be a Vállalhatatlan-fiókodba.");return}
    setBusy(true);setError("")
    try {
      const form=new FormData()
      form.set("payload",JSON.stringify({
        kind:answers.kind,author:answers.author,email:answers.email,bio:answers.bio,note:answers.note,
        arts:answers.arts.map(({file,...art})=>art),service:serviceBranch?answers.service:null,
        consents:{data:answers.dataConsent,rights:answers.rightsConsent,publication:answers.publicationConsent,crew:answers.crewConfirmed}
      }))
      answers.arts.forEach(art=>{if(art.file)form.append("files",art.file,art.file.name)})
      const response=await fetch("/api/kalendarium/submissions",{method:"POST",headers:{Authorization:"Bearer "+session.access_token},body:form})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||"submit_failed")
      setSubmitted({id:result.id,reference:result.reference})
      localStorage.removeItem("kalendarium-2027-draft-v1")
    } catch(e) {setError(errorMessage(e instanceof Error?e.message:"submit_failed"))}
    finally {setBusy(false)}
  }

  if(loading)return <div className="border border-zinc-800 bg-zinc-950 p-6"><div className="h-2 w-24 animate-pulse bg-zinc-800"/><div className="mt-5 h-8 w-3/4 animate-pulse bg-zinc-800"/><div className="mt-3 h-24 animate-pulse bg-zinc-900"/></div>
  if(submitted)return <div className="border border-lime-200/35 bg-zinc-950 p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-lime-200/40 text-lime-200"><CheckCircle2 size={24}/></div><p className="mt-6 font-mono text-[10px] uppercase tracking-[.22em] text-lime-200">Beküldés rögzítve</p><h2 className="mt-2 text-3xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>Megérkezett.</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Köszönjük, hogy hoztál valamit. A szerkesztőség átnézi a beküldésedet, és e-mailben jelentkezünk, ha döntés vagy egyeztetés szükséges.</p><div className="mt-6 border border-zinc-800 bg-black p-4"><p className="font-mono text-[9px] uppercase tracking-[.2em] text-zinc-600">Beküldési azonosító</p><p className="mt-2 break-all font-mono text-sm text-zinc-200">{submitted.reference}</p></div></div>

  return <div className="overflow-hidden border border-zinc-800 bg-[#0d0f0f] shadow-[0_24px_90px_rgba(0,0,0,.35)]">
    <div className="border-b border-zinc-800 bg-black/50 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-lime-200/70">Szerkesztőségi vonal</p><p className="mt-1 text-sm text-zinc-200">Új beküldés <span className="text-zinc-600">/ 2027</span></p></div><span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_9px_#bef264]"/> Online</span></div>
      <div className="mt-4 h-1 overflow-hidden bg-zinc-800"><div className="h-full bg-lime-200 transition-all duration-500" style={{width:progress+"%"}}/></div>
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-zinc-600"><span>{String(step+1).padStart(2,"0")} / {steps.length}</span><span>{progress}% kész</span></div>
    </div>
    <div className="min-h-[420px] px-4 py-6 sm:min-h-[470px] sm:px-6 sm:py-8">
      {current==="start"&&<Frame eyebrow="Először is" title="Mit hoztál nekünk?" description="Válaszd ki, hogyan szeretnél megjelenni a Vállalhatatlan Kalendárium 2027-ben.">
        <div className="grid gap-3">
          <Choice selected={answers.kind==="art"} onClick={()=>update("kind","art")} icon={<FileText/>} title="Egy alkotást" desc="Írás, vers, fotó, grafika, dokumentum vagy valami nehezen besorolható."/>
          <Choice selected={answers.kind==="service"} onClick={()=>update("kind","service")} icon={<Store/>} title="Egy szolgáltatást" desc="Megmutatnám, mivel foglalkozom. V Crew Arany Oldalak."/>
          <Choice selected={answers.kind==="both"} onClick={()=>update("kind","both")} icon={<ImagePlus/>} title="Mindkettőt" desc="Alkotást is küldenék, és szolgáltatást is hirdetnék."/>
        </div>
      </Frame>}
      {current==="art"&&<Frame eyebrow="01 / Alkotás" title="Mutasd, mit készítettél." description="Egy vagy több munkát is hozzáadhatsz. Minden alkotáshoz adj címet, majd írd be vagy töltsd fel az anyagot.">
        <div className="space-y-4">{answers.arts.map((art,index)=><div key={index} className="border border-zinc-800 bg-black/30 p-3 sm:p-4">
          <div className="mb-4 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.2em] text-lime-200/70">Alkotás {String(index+1).padStart(2,"0")}</span>{answers.arts.length>1&&<button type="button" onClick={()=>update("arts",answers.arts.filter((_,i)=>i!==index))} className="p-2 text-zinc-600 hover:text-red-300" aria-label="Alkotás eltávolítása"><Trash2 size={15}/></button>}</div>
          <label className={labelClass}>Mi a címe?<input className={inputClass} maxLength={160} value={art.title} onChange={e=>updateArt(index,{title:e.target.value})} placeholder="Az alkotás címe"/></label>
          <label className={labelClass+" mt-4"}>Milyen műfaj?<select className={inputClass} value={art.category} onChange={e=>updateArt(index,{category:e.target.value})}>{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label className={labelClass+" mt-4"}>Szöveg / leírás<textarea className={inputClass+" min-h-28 resize-y"} maxLength={12000} value={art.text} onChange={e=>updateArt(index,{text:e.target.value})} placeholder="Írd ide a szöveget, vagy mutasd be röviden a munkát..."/></label>
          <div className="mt-4"><input ref={index===0?fileInput:undefined} id={"kal-file-"+index} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt" className="sr-only" onChange={e=>addFile(e.target.files?.[0]||null,index)}/><button type="button" onClick={()=>document.getElementById("kal-file-"+index)?.click()} className="flex min-h-14 w-full items-center gap-3 border border-dashed border-zinc-700 px-3 text-left transition hover:border-lime-200/50"><UploadCloud className="text-lime-200" size={19}/><span className="min-w-0 flex-1"><span className="block truncate text-xs text-zinc-200">{art.file?art.file.name:"Fájl hozzáadása"}</span><span className="mt-1 block text-[10px] text-zinc-600">JPG, PNG, WEBP, PDF, DOCX, TXT · max. 15 MB</span></span>{art.file?<Check size={16} className="text-lime-200"/>:<Plus size={17} className="text-zinc-500"/>}</button></div>
        </div>)}
        <button type="button" onClick={()=>update("arts",[...answers.arts,emptyArt()])} className="flex min-h-11 w-full items-center justify-center gap-2 border border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"><Plus size={14}/> Új alkotás hozzáadása</button>
        </div>
      </Frame>}
      {current==="service"&&<Frame eyebrow="02 / Arany Oldalak" title="Mivel foglalkozol?" description="A V Crew Arany Oldalak a közösség szolgáltatóit mutatja be. A megjelenés fizetett, jóváhagyás után egyeztetjük a csomagot és az árat.">
        <div className="mb-4 border border-amber-200/20 bg-amber-200/[.04] p-3 text-xs leading-5 text-amber-100/70">{checkingCrew?"Ellenőrizzük a V Crew-tagságodat…":crewAllowed?"A fiókod jogosult az Arany Oldalak jelentkezésére.":"Az Arany Oldalak V Crew-tagsághoz kötött. Jelentkezz be a jogosult fiókoddal."}</div>
        <label className={labelClass}>Szolgáltatás / vállalkozás neve<input className={inputClass} maxLength={120} value={answers.service.name} onChange={e=>updateService({name:e.target.value})} placeholder="Ahogy a kiadványban szerepeljen"/></label>
        <label className={labelClass+" mt-4"}>Melyik terület?<select className={inputClass} value={answers.service.category} onChange={e=>updateService({category:e.target.value})}>{serviceCategories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className={labelClass+" mt-4"}>Mit kínálsz?<textarea className={inputClass+" min-h-28 resize-y"} maxLength={1200} value={answers.service.description} onChange={e=>updateService({description:e.target.value})} placeholder="Milyen szolgáltatást nyújtasz, kinek és miben vagy jó?"/></label>
        <label className={labelClass+" mt-4"}>Hol vagy elérhető?<input className={inputClass} maxLength={160} value={answers.service.area} onChange={e=>updateService({area:e.target.value})} placeholder="Budapest, országosan, online..."/></label>
        <label className={labelClass+" mt-4"}>Weboldal / közösségi oldal<input className={inputClass} maxLength={300} value={answers.service.website} onChange={e=>updateService({website:e.target.value})} placeholder="https://..."/></label>
        <label className={labelClass+" mt-4"}>Publikálható elérhetőség<input className={inputClass} maxLength={180} value={answers.service.contact} onChange={e=>updateService({contact:e.target.value})} placeholder="E-mail, telefon vagy más kapcsolat"/></label>
        <p className="mt-4 text-[10px] leading-5 text-zinc-600">A jelentkezés még nem jelent automatikus hirdetésvásárlást. A szerkesztőség visszajelez a rendelkezésre álló felületekről és a díjról.</p>
      </Frame>}
      {current==="contact"&&<Frame eyebrow="Kapcsolat" title="Kihez szólhatunk?" description="A kapcsolattartási adataidat a beküldés kezelésére használjuk. A megjelenítendő szerzői név lehet művésznév is.">
        <label className={labelClass}>Szerzői / megjelenítendő név<input className={inputClass} maxLength={120} value={answers.author} onChange={e=>update("author",e.target.value)} placeholder="Valódi név vagy művésznév"/></label>
        <label className={labelClass+" mt-4"}>E-mail-cím<input className={inputClass} type="email" autoComplete="email" maxLength={254} value={answers.email} onChange={e=>update("email",e.target.value)} placeholder="email@pelda.hu"/></label>
        <label className={labelClass+" mt-4"}>Pár szó rólad <span className="text-zinc-600">(nem kötelező)</span><textarea className={inputClass+" min-h-24 resize-y"} maxLength={500} value={answers.bio} onChange={e=>update("bio",e.target.value)} placeholder="Rövid bemutatkozás, alkotói háttér..."/></label>
        <label className={labelClass+" mt-4"}>Üzenet a szerkesztőségnek <span className="text-zinc-600">(nem kötelező)</span><textarea className={inputClass+" min-h-24 resize-y"} maxLength={1200} value={answers.note} onChange={e=>update("note",e.target.value)} placeholder="Van valami, amit fontos tudnunk?"/></label>
      </Frame>}
      {current==="review"&&<Frame eyebrow="Utolsó ellenőrzés" title="Minden a helyén?" description="Nézd át a beküldést. A nyilatkozatok elfogadása után elküldheted a szerkesztőségnek.">
        <div className="space-y-3 border border-zinc-800 bg-black/30 p-4 text-xs">
          <Summary label="Részvétel" value={answers.kind==="art"?"Alkotás":answers.kind==="service"?"Arany Oldalak":"Alkotás + Arany Oldalak"}/>
          {artBranch&&answers.arts.map((a,i)=><Summary key={i} label={"Alkotás "+(i+1)} value={a.title+" · "+(categories.find(c=>c[0]===a.category)?.[1]||a.category)}/>)}
          {serviceBranch&&<Summary label="Szolgáltatás" value={answers.service.name}/>}
          <Summary label="Kapcsolattartó" value={answers.author+" · "+answers.email}/>
        </div>
        <div className="mt-5 space-y-3">
          <Consent checked={answers.dataConsent} onChange={v=>update("dataConsent",v)} title="Elolvastam és elfogadom az adatkezelési tájékoztatót."/>
          {artBranch&&<><Consent checked={answers.rightsConsent} onChange={v=>update("rightsConsent",v)} title="Kijelentem, hogy az általam beküldött alkotás saját munkám, vagy rendelkezem a beküldéshez szükséges engedélyekkel."/><Consent checked={answers.publicationConsent} onChange={v=>update("publicationConsent",v)} title="Tudomásul veszem, hogy a kiválasztott alkotás nyomtatott megjelenéséhez külön felhasználási engedélyt kell majd egyeztetnünk. A szerzői jogaimat megtartom."/><p className="pl-7 text-[10px] leading-5 text-zinc-600">A kiválasztott alkotók pénzbeli honorárium helyett tiszteletpéldányokat kapnak. A pontos példányszámról az elfogadáskor tájékoztatunk.</p></>}
          {serviceBranch&&<Consent checked={answers.crewConfirmed} onChange={v=>update("crewConfirmed",v)} title="Megerősítem, hogy V Crew-tag vagyok, és a szolgáltatásom megadott adatait jogosult vagyok beküldeni."/>}
        </div>
      </Frame>}
      {error&&<div role="alert" className="mt-5 border border-red-900/70 bg-red-950/30 p-3 text-xs leading-5 text-red-200">{error}</div>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-black/40 px-4 py-4 sm:px-6">
      <button type="button" onClick={back} disabled={step===0||busy} className="inline-flex min-h-12 items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-200 disabled:opacity-0"><ArrowLeft size={15}/> Vissza</button>
      {current==="review"?<button type="button" onClick={submit} disabled={busy||!answers.dataConsent||(artBranch&&(!answers.rightsConsent||!answers.publicationConsent))||(serviceBranch&&(!answers.crewConfirmed||!crewAllowed))} className={buttonClass}>{busy?<><Loader2 size={15} className="animate-spin"/> Küldés...</>:<>Elküldöm <ArrowRight size={15}/></>}</button>:<button type="button" onClick={next} className={buttonClass}>Tovább <ArrowRight size={15}/></button>}
    </div>
    <p className="border-t border-zinc-900 px-4 py-3 text-center font-mono text-[8px] uppercase tracking-[.14em] text-zinc-700">A válaszaid ezen az eszközön automatikusan mentődnek · Fájlok a beküldésig nem kerülnek feltöltésre</p>
  </div>
}

function Frame({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:React.ReactNode}) {return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><p className="font-mono text-[9px] uppercase tracking-[.22em] text-lime-200/70">{eyebrow}</p><h2 className="mt-3 text-3xl font-black uppercase leading-[.98] tracking-tight text-zinc-100 sm:text-4xl" style={{fontFamily:"var(--font-hero)"}}>{title}</h2><p className="mb-7 mt-3 max-w-lg text-xs leading-6 text-zinc-500 sm:text-sm">{description}</p>{children}</div>}
function Choice({selected,onClick,icon,title,desc}:{selected:boolean;onClick:()=>void;icon:React.ReactNode;title:string;desc:string}) {return <button type="button" onClick={onClick} className={"group flex min-h-[92px] w-full items-center gap-4 border p-4 text-left transition "+(selected?"border-lime-200/70 bg-lime-200/[.07]":"border-zinc-800 bg-black/30 hover:border-zinc-600")}><span className={"flex h-11 w-11 shrink-0 items-center justify-center border "+(selected?"border-lime-200/40 text-lime-200":"border-zinc-800 text-zinc-500 group-hover:text-zinc-200")}>{icon}</span><span className="min-w-0 flex-1"><span className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-100">{title}</span><span className="mt-1 block text-[11px] leading-5 text-zinc-500">{desc}</span></span><span className={"h-4 w-4 shrink-0 rounded-full border "+(selected?"border-lime-200 bg-lime-200 shadow-[inset_0_0_0_3px_#0d0f0f]":"border-zinc-700")}/></button>}
function Consent({checked,onChange,title}:{checked:boolean;onChange:(v:boolean)=>void;title:string}) {return <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-zinc-400"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-lime-200"/><span>{title}</span></label>}
function Summary({label,value}:{label:string;value:string}) {return <div className="flex flex-col gap-1 border-b border-zinc-800/70 pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between"><span className="text-zinc-600">{label}</span><span className="break-words text-zinc-200 sm:max-w-[70%] sm:text-right">{value}</span></div>}
