"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft, ArrowRight, Bookmark, CalendarDays, ChevronLeft, ChevronRight,
  FileText, Image as ImageIcon, Layers, Menu, MoreHorizontal, Pause, Play,
  Plus, Search, Settings, Share2, UserRound, Video, X
} from "lucide-react"

type Tab = "today" | "calendar" | "drops" | "profile" | "admin"
type View = "week" | "month"
type DropType = "story" | "music" | "gallery" | "video"
type Task = { id: number; title: string; done: boolean }
type EventItem = { id: number; time: string; title: string; duration: string }

const drops = [
  { id: "0327", date: "03.27.", title: "A NEGYEDIK SZOMSZÉD", type: "story" as DropType, creator: "V.", format: "Rövid történet · Zene · Fotósorozat", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1100&q=85", summary: "Egy rövid történet a lakásokról, amelyek sosem léteztek, mégis emlékszel rájuk." },
  { id: "0326", date: "03.26.", title: "TÚL AZ ERDŐN", type: "story" as DropType, creator: "Bálint Dorottya", format: "Vers · Illusztráció", image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80", summary: "Egy vers arról, amit csak akkor találsz meg, amikor már nem keresed." },
  { id: "0325", date: "03.25.", title: "A LASSÚ KAMERA DICSÉRETE", type: "music" as DropType, creator: "Unknown Transmission", format: "Esszé · Zene", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80", summary: "Hangok, amelyek hagynak időt a gondolatnak." },
  { id: "0324", date: "03.24.", title: "MINDENEK ELŐTT A CSEND", type: "gallery" as DropType, creator: "N. K.", format: "Fotósorozat · 12 kép", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", summary: "Tizenkét kép a város üresen maradt tereiről." },
]
const initialTasks: Task[] = [
  { id: 1, title: "Leadni a szöveget", done: true },
  { id: 2, title: "Posta", done: false },
  { id: 3, title: "Esemény egyeztetés", done: false },
]
const initialEvents: EventItem[] = [
  { id: 1, time: "14:00", title: "Pszichológus", duration: "14:00–15:00" },
  { id: 2, time: "20:00", title: "Vetítés @ Analog", duration: "20:00–22:00" },
]
const weekdays = ["H", "K", "Sze", "Cs", "P", "Szo", "V"]
const cx = {
  eyebrow: "font-mono text-[9px] uppercase tracking-[.2em] text-[#9ba39c]",
  title: "font-sans font-extrabold uppercase tracking-[-.045em] leading-[.9]",
  button: "inline-flex min-h-11 items-center justify-center gap-2 border border-[#59625b] px-4 text-[11px] font-semibold uppercase tracking-[.12em] transition hover:bg-[#e8eae6] hover:text-[#111512] disabled:opacity-40",
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-10 w-10 place-items-center text-[#c5cbc5] transition hover:bg-white/10">{children}</button>
}
function Brand() {
  return <div className="leading-none"><div className="text-[15px] font-black uppercase tracking-[-.04em]">VÁLLALHATATLAN</div><div className="mt-1 text-[12px] font-light tracking-[.02em] text-[#b7beb8]">KALENDÁRIUM 2027</div></div>
}

export default function KalendariumDemo() {
  const [tab, setTab] = useState<Tab>("today")
  const [calendarView, setCalendarView] = useState<View>("week")
  const [selectedDay, setSelectedDay] = useState(27)
  const [tasks, setTasks] = useState(initialTasks)
  const [events, setEvents] = useState(initialEvents)
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState<string[]>(["0326"])
  const [activeDrop, setActiveDrop] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [filter, setFilter] = useState("Összes")
  const [modal, setModal] = useState<"none" | "add" | "event" | "task" | "note" | "settings">("none")
  const [newTitle, setNewTitle] = useState("")
  const [newTime, setNewTime] = useState("09:00")
  const [adminPanel, setAdminPanel] = useState<"overview" | "editor" | "team">("overview")
  const [adminTitle, setAdminTitle] = useState("A NEGYEDIK SZOMSZÉD")
  const [adminDate, setAdminDate] = useState("2027-03-27")
  const [adminType, setAdminType] = useState("Több formátum")
  const [adminStatus, setAdminStatus] = useState("Vázlat")
  const [adminMessage, setAdminMessage] = useState("Ma egy új küldemény érkezett. Nézz be!")
  const [adminToast, setAdminToast] = useState("")
  const [editor, setEditor] = useState("V.")
  const [role, setRole] = useState("Szerkesztő")
  const [newMember, setNewMember] = useState("")
  const [members, setMembers] = useState([
    { name: "V.", email: "v@vallalhatatlan.online", role: "Tulajdonos", status: "Aktív" },
    { name: "Bálint Dorottya", email: "dorottya@example.com", role: "Szerkesztő", status: "Aktív" },
    { name: "N. K.", email: "nk@example.com", role: "Közreműködő", status: "Meghívásra vár" },
  ])
  const selectedDrop = drops.find(d => d.id === activeDrop) ?? drops[0]
  const monthGrid = useMemo(() => {
    const first = new Date(2027, 2, 1)
    const offset = (first.getDay() + 6) % 7
    return [...Array(offset).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)]
  }, [])

  function toggleTask(id: number) { setTasks(current => current.map(task => task.id === id ? { ...task, done: !task.done } : task)) }
  function addTask() {
    if (!newTitle.trim()) return
    setTasks(current => [...current, { id: Date.now(), title: newTitle.trim(), done: false }])
    setNewTitle(""); setModal("none")
  }
  function addEvent() {
    if (!newTitle.trim()) return
    setEvents(current => [...current, { id: Date.now(), time: newTime, title: newTitle.trim(), duration: newTime }].sort((a,b)=>a.time.localeCompare(b.time)))
    setNewTitle(""); setModal("none")
  }
  function toggleSave(id: string) { setSaved(current => current.includes(id) ? current.filter(x=>x!==id) : [...current,id]) }
  function inviteMember() {
    if (!newMember.trim()) return
    setMembers(current => [...current, { name: newMember.trim(), email: newMember.trim(), role, status: "Meghívásra vár" }])
    setNewMember("")
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "today", label: "MA", icon: <span className="text-xl">◼</span> },
    { id: "calendar", label: "NAPTÁR", icon: <CalendarDays size={19} strokeWidth={1.5}/> },
    { id: "drops", label: "KÜLDEMÉNYEK", icon: <Layers size={19} strokeWidth={1.5}/> },
    { id: "profile", label: "PROFIL", icon: <UserRound size={19} strokeWidth={1.5}/> },
  ]

  return (
    <main className="min-h-screen bg-[#111512] text-[#e8eae6] selection:bg-[#dce2dc] selection:text-[#111512]">
      <div className="mx-auto min-h-screen w-full max-w-[1440px]">
        <header className="sticky top-0 z-30 border-b border-[#39413b] bg-[#111512]/95 px-4 py-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex items-center justify-between">
            <Brand />
            <div className="flex items-center gap-1">
              <IconButton label="Keresés" onClick={()=>setTab("drops")}><Search size={19}/></IconButton>
              <IconButton label="Beállítások" onClick={()=>setModal("settings")}><Settings size={19}/></IconButton>
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-78px)] lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#39413b] p-5 lg:block">
            <div className={cx.eyebrow}>2027 / NAVIGÁCIÓ</div>
            <nav className="mt-7 space-y-1">
              {navItems.map(item=><button key={item.id} onClick={()=>setTab(item.id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition ${tab===item.id?"bg-[#e8eae6] text-[#111512]":"text-[#aeb7af] hover:bg-white/5"}`}>{item.icon}<span>{item.label}</span></button>)}
            </nav>
            <div className="mt-12 border-t border-[#39413b] pt-4">
              <div className={cx.eyebrow}>GYORS MŰVELET</div>
              <button className="mt-4 flex w-full items-center gap-3 py-2 text-sm text-[#d1d7d1]" onClick={()=>setModal("add")}><Plus size={16}/> Új hozzáadása</button>
            </div>
            <button onClick={()=>setTab("admin")} className="mt-12 w-full border-t border-[#39413b] pt-4 text-left text-[10px] uppercase tracking-widest text-[#788079]">Szerkesztőség ↗</button>
          </aside>

          <section className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-12">
            {tab === "today" && (
              <div className="space-y-6">
                <div className="grid grid-cols-[1fr_auto] items-end gap-3 border-b border-[#39413b] pb-5 sm:grid-cols-[auto_1fr_auto]">
                  <div className={`${cx.title} text-[clamp(4.5rem,17vw,9rem)] tabular-nums`}>03.27.</div>
                  <div className="pb-2 text-[12px] uppercase tracking-wider text-[#c6cdc7]">SZOMBAT<br/>13. HÉT<br/>2027</div>
                  <div className="hidden h-20 w-20 items-center justify-center bg-[#e8eae6] text-4xl font-black text-[#111512] sm:flex">V.</div>
                </div>
                <button onClick={()=>setActiveDrop("0327")} className="group relative block w-full overflow-hidden border-b border-[#59625b] text-left">
                  <div className="absolute inset-0"><img src={drops[0].image} alt="" className="h-full w-full object-cover opacity-45 grayscale transition duration-500 group-hover:scale-[1.02] group-hover:opacity-60"/><div className="absolute inset-0 bg-gradient-to-r from-[#111512] via-[#111512]/80 to-transparent"/></div>
                  <div className="relative flex min-h-[260px] flex-col justify-end p-5 sm:min-h-[320px] sm:p-8">
                    <div className={cx.eyebrow}>MAI KÜLDEMÉNY / 03.27.</div><div className={`${cx.title} mt-3 max-w-xl text-4xl sm:text-6xl`}>A NEGYEDIK<br/>SZOMSZÉD</div><div className="mt-3 text-xs text-[#c3cbc4]">Rövid történet&nbsp;&nbsp; / &nbsp;&nbsp;Zene&nbsp;&nbsp; / &nbsp;&nbsp;Fotósorozat</div><div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-widest">Megnyitás <ArrowRight size={15}/></div>
                  </div>
                </button>
                <div className="grid gap-3 border-b border-[#39413b] pb-5 sm:grid-cols-[150px_1fr]">
                  <div><div className={cx.eyebrow}>TERV</div><div className="mt-1 text-sm">MAI 3</div></div>
                  <div className="space-y-3">{tasks.map(task=><label key={task.id} className="flex cursor-pointer items-center gap-3 text-sm text-[#dce1dc]"><input type="checkbox" checked={task.done} onChange={()=>toggleTask(task.id)} className="h-4 w-4 accent-[#e8eae6]"/><span className={task.done?"text-[#818a82] line-through":""}>{task.title}</span></label>)}<button onClick={()=>setModal("task")} className="flex items-center gap-2 text-xs text-[#969f97] hover:text-white"><Plus size={14}/> Feladat hozzáadása</button></div>
                </div>
                <div className="grid gap-3 border-b border-[#39413b] pb-5 sm:grid-cols-[150px_1fr]">
                  <div><div className={cx.eyebrow}>ESEMÉNYEK</div><div className="mt-1 text-sm">MA</div></div>
                  <div className="space-y-3">{events.map(event=><div key={event.id} className="grid grid-cols-[66px_1fr] gap-3 text-sm"><strong className="tabular-nums">{event.time}</strong><span>{event.title}</span></div>)}<button onClick={()=>setModal("event")} className="flex items-center gap-2 text-xs text-[#969f97] hover:text-white"><Plus size={14}/> Esemény hozzáadása</button></div>
                </div>
                <div className="grid gap-3 pb-3 sm:grid-cols-[150px_1fr]">
                  <div><div className={cx.eyebrow}>GYORS JEGYZET</div><div className="mt-1 text-sm">SAJÁT TÉR</div></div>
                  <div className="flex items-center gap-2"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Gondolat, ötlet, emlékeztető…" className="min-w-0 flex-1 border-b border-[#59625b] bg-transparent px-0 py-2 text-sm outline-none placeholder:text-[#7b847c] focus:border-[#e8eae6]"/><IconButton label="Jegyzet mentése" onClick={()=>setModal("note")}><Plus size={18}/></IconButton></div>
                </div>
              </div>
            )}

            {tab === "calendar" && (
              <div className="space-y-7">
                <div className="flex flex-wrap items-end justify-between gap-4"><h1 className={`${cx.title} text-5xl sm:text-7xl`}>NAPTÁR</h1><div className="flex border border-[#59625b]"><button onClick={()=>setCalendarView("week")} className={`px-5 py-2 text-xs ${calendarView==="week"?"bg-[#e8eae6] text-[#111512]":"text-[#c3cbc4]"}`}>Hét</button><button onClick={()=>setCalendarView("month")} className={`px-5 py-2 text-xs ${calendarView==="month"?"bg-[#e8eae6] text-[#111512]":"text-[#c3cbc4]"}`}>Hónap</button></div></div>
                {calendarView==="week" ? <div className="space-y-3"><div className="flex items-center justify-between border-b border-[#39413b] pb-4"><IconButton label="Előző hét"><ChevronLeft/></IconButton><div className="text-sm font-semibold">13. HÉT / 2027</div><IconButton label="Következő hét"><ChevronRight/></IconButton></div>{[22,23,24,25,26,27,28].map((day,i)=><button key={day} onClick={()=>setSelectedDay(day)} className={`grid w-full grid-cols-[52px_1fr_auto] items-center border-b border-[#39413b] px-3 py-3 text-left ${selectedDay===day?"bg-[#e8eae6] text-[#111512]":"hover:bg-white/5"}`}><span className="text-xs">{weekdays[i]}</span><span className="text-sm">03.{String(day).padStart(2,"0")}.</span><span className="text-xs">{day===27?"2 ESEMÉNY":"·"}</span></button>)}<button onClick={()=>setModal("event")} className={cx.button}><Plus size={14}/> Új esemény</button></div> : <div><div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold">2027. MÁRCIUS</span><div className="flex"><IconButton label="Előző hónap"><ChevronLeft/></IconButton><IconButton label="Következő hónap"><ChevronRight/></IconButton></div></div><div className="grid grid-cols-7 gap-1">{weekdays.map(day=><div key={day} className="py-2 text-center text-[10px] text-[#9ba39c]">{day}</div>)}{monthGrid.map((day,i)=><button key={i} disabled={!day} onClick={()=>day&&setSelectedDay(day)} className={`aspect-square border border-[#303831] text-xs ${day===selectedDay?"bg-[#e8eae6] text-[#111512]":"text-[#d5dbd5] hover:bg-white/10"} ${!day?"border-transparent":""}`}>{day??""}</button>)}</div><div className="mt-7 border-t border-[#39413b] pt-5"><div className={cx.eyebrow}>KIVÁLASZTOTT NAP</div><h2 className="mt-2 text-xl font-bold">MÁRCIUS {selectedDay}.</h2><div className="mt-4 space-y-3 text-sm">{selectedDay===27?events.map(event=><div key={event.id} className="flex gap-5"><strong>{event.time}</strong>{event.title}</div>):<p className="text-[#879087]">Nincs rögzített esemény.</p>}</div></div></div>}
              </div>
            )}

            {tab === "drops" && (
              <div className="space-y-6"><div className="flex items-end justify-between gap-4"><h1 className={`${cx.title} text-5xl sm:text-7xl`}>KÜLDEMÉNYEK</h1><span className={cx.eyebrow}>2027 / 365</span></div><div className="flex flex-wrap gap-1 border-b border-[#39413b] pb-3">{["Összes","Mentettek","Alkotók"].map(item=><button key={item} onClick={()=>setFilter(item)} className={`px-4 py-2 text-xs ${filter===item?"bg-[#e8eae6] text-[#111512]":"border border-[#59625b] text-[#c3cbc4]"}`}>{item}</button>)}</div><div className="space-y-1">{drops.filter(drop=>filter!=="Mentettek"||saved.includes(drop.id)).map(drop=><div key={drop.id} className="grid grid-cols-[104px_1fr_auto] gap-3 border-b border-[#39413b] py-4 sm:grid-cols-[150px_1fr_auto]"><button onClick={()=>setActiveDrop(drop.id)} className="overflow-hidden"><img src={drop.image} alt="" className="aspect-square w-full object-cover grayscale"/></button><button onClick={()=>setActiveDrop(drop.id)} className="text-left"><div className={cx.eyebrow}>{drop.date} / {drop.creator}</div><div className="mt-2 text-base font-extrabold leading-tight">{drop.title}</div><div className="mt-2 text-xs text-[#9ba39c]">{drop.format}</div></button><IconButton label="Mentés" onClick={()=>toggleSave(drop.id)}><Bookmark size={18} fill={saved.includes(drop.id)?"currentColor":"none"}/></IconButton></div>)}</div></div>
            )}

            {tab === "profile" && (
              <div className="space-y-6"><h1 className={`${cx.title} text-5xl sm:text-7xl`}>PROFIL</h1><div className="aspect-[16/4] overflow-hidden"><img src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80" alt="" className="h-full w-full object-cover grayscale"/></div>{["Saját adatok","Naptárszinkronizáció","Értesítések","Mentett küldemények","Adatok exportálása"].map((item,i)=><button key={item} onClick={()=>i===3?setTab("drops"):setModal("settings")} className="flex w-full items-center justify-between border-b border-[#39413b] py-4 text-left text-sm"><span>{item}</span><ChevronRight size={17}/></button>)}</div>
            )}

            {tab === "admin" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><div className={cx.eyebrow}>2027 / SZERKESZTŐSÉG</div><h1 className={`${cx.title} mt-2 text-5xl sm:text-7xl`}>NAPI TARTALOM</h1></div><div className="flex gap-2"><button onClick={()=>setAdminPanel("team")} className={cx.button}><UserRound size={15}/> Csapat</button><button onClick={()=>setAdminPanel("editor")} className={cx.button}><Plus size={15}/> Új küldemény</button></div></div>
                <div className="flex gap-2 border-b border-[#39413b] pb-3">{["overview","editor","team"].map(panel=><button key={panel} onClick={()=>setAdminPanel(panel as typeof adminPanel)} className={`px-3 py-2 text-xs uppercase ${adminPanel===panel?"bg-[#e8eae6] text-[#111512]":"text-[#9ba39c]"}`}>{panel==="overview"?"Naptár":panel==="editor"?"Szerkesztő":"Csapat"}</button>)}</div>
                {adminPanel==="overview"?<div className="space-y-2">{drops.map(drop=><button key={drop.id} onClick={()=>{setAdminTitle(drop.title);setAdminDate("2027-03-"+drop.id.slice(2));setAdminPanel("editor")}} className="grid w-full grid-cols-[100px_1fr_auto] items-center gap-3 border-b border-[#39413b] py-4 text-left"><span className={cx.eyebrow}>{drop.date}</span><span className="text-sm font-bold">{drop.title}</span><span className="text-xs text-[#9ba39c]">Publikálva</span></button>)}</div>:null}
                {adminPanel==="editor"?<div className="max-w-2xl space-y-5 border border-[#39413b] p-5">
                  <div className="flex justify-between"><h2 className="text-xl font-bold">Küldemény szerkesztése</h2><IconButton label="Bezárás" onClick={()=>setAdminPanel("overview")}><X size={18}/></IconButton></div>
                  <label className="block text-xs text-[#9ba39c]">Cím<input value={adminTitle} onChange={e=>setAdminTitle(e.target.value)} className="mt-2 w-full border-b border-[#59625b] bg-transparent py-3 text-base text-white outline-none"/></label>
                  <label className="block text-xs text-[#9ba39c]">Megjelenés dátuma<input type="date" value={adminDate} onChange={e=>setAdminDate(e.target.value)} className="mt-2 w-full border-b border-[#59625b] bg-transparent py-3 text-base text-white"/></label>
                  <label className="block text-xs text-[#9ba39c]">Tartalomtípus<select value={adminType} onChange={e=>setAdminType(e.target.value)} className="mt-2 w-full border-b border-[#59625b] bg-transparent py-3 text-base"><option>Több formátum</option><option>Szöveg</option><option>Zene</option><option>Fotógaléria</option><option>Videó</option></select></label>
                  <label className="block text-xs text-[#9ba39c]">Értesítés szövege<textarea value={adminMessage} onChange={e=>setAdminMessage(e.target.value)} className="mt-2 min-h-24 w-full border border-[#59625b] bg-transparent p-3 text-sm"/></label>
                  <label className="block text-xs text-[#9ba39c]">Állapot<select value={adminStatus} onChange={e=>setAdminStatus(e.target.value)} className="mt-2 w-full border-b border-[#59625b] bg-transparent py-3 text-base"><option>Vázlat</option><option>Időzítve</option><option>Publikálva</option></select></label>
                  <label className="block text-xs text-[#9ba39c]">Felelős szerkesztő<select value={editor} onChange={e=>setEditor(e.target.value)} className="mt-2 w-full border-b border-[#59625b] bg-transparent py-3 text-base"><option>V.</option><option>Bálint Dorottya</option><option>N. K.</option></select></label>
                  <div className="flex flex-wrap gap-2"><button onClick={()=>{setAdminToast("A küldemény demóként elmentve.");setAdminPanel("overview")}} className={cx.button}>Mentés</button><button onClick={()=>setAdminToast("Előnézet: "+adminTitle)} className={cx.button}>Előnézet</button></div>{adminToast&&<p className="text-xs text-[#c5ccc6]">{adminToast}</p>}
                </div>:null}
                {adminPanel==="team"?<div className="max-w-3xl space-y-5">
                  <div><div className={cx.eyebrow}>SZERKESZTŐSÉGI HOZZÁFÉRÉSEK</div><h2 className="mt-2 text-2xl font-bold">Csapat és jogosultságok</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#9ba39c]">Több szerkesztő dolgozhat ugyanazon a naptáron. A szerepkör határozza meg, ki szerkeszthet, ki időzíthet és ki publikálhat.</p></div>
                  <div className="overflow-x-auto border border-[#39413b]"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-white/5 text-[10px] uppercase tracking-wider text-[#9ba39c]"><tr><th className="p-3">Tag</th><th className="p-3">Szerepkör</th><th className="p-3">Állapot</th></tr></thead><tbody>{members.map(member=><tr key={member.email} className="border-t border-[#39413b]"><td className="p-3"><div>{member.name}</div><div className="text-xs text-[#879087]">{member.email}</div></td><td className="p-3">{member.role}</td><td className="p-3 text-xs text-[#9ba39c]">{member.status}</td></tr>)}</tbody></table></div>
                  <div className="border border-[#39413b] p-4"><div className={cx.eyebrow}>ÚJ MEGHÍVÁS</div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><input value={newMember} onChange={e=>setNewMember(e.target.value)} placeholder="Név vagy e-mail-cím" className="min-w-0 border-b border-[#59625b] bg-transparent px-0 py-3 text-sm outline-none"/><select value={role} onChange={e=>setRole(e.target.value)} className="border-b border-[#59625b] bg-[#111512] py-3 text-sm"><option>Szerkesztő</option><option>Közreműködő</option><option>Olvasó</option></select><button onClick={inviteMember} className={cx.button}>Meghívás</button></div><p className="mt-3 text-xs leading-5 text-[#768078]">Demó: a meghívottak csak helyi prototípus-adatként jelennek meg. Éles hozzáféréshez hitelesítés, meghívási folyamat és adatbázis-szintű jogosultságkezelés szükséges.</p></div>
                </div>:null}
              </div>
            )}
          </section>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#39413b] bg-[#111512]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-4">{navItems.map(item=><button key={item.id} onClick={()=>setTab(item.id)} className={`flex flex-col items-center gap-1 py-3 text-[9px] tracking-wide ${tab===item.id?"text-white":"text-[#899289]"}`}>{item.icon}<span>{item.label}</span></button>)}</div></nav>

        {activeDrop&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#111512]"><div className="mx-auto min-h-screen max-w-3xl px-5 pb-12 pt-4 sm:px-8">
          <div className="flex items-center justify-between"><IconButton label="Vissza" onClick={()=>setActiveDrop(null)}><ArrowLeft/></IconButton><div className="flex gap-1"><IconButton label="Mentés" onClick={()=>toggleSave(selectedDrop.id)}><Bookmark fill={saved.includes(selectedDrop.id)?"currentColor":"none"}/></IconButton><IconButton label="Továbbiak"><MoreHorizontal/></IconButton></div></div>
          <img src={selectedDrop.image} alt="" className="mt-5 max-h-[48vh] w-full object-cover grayscale"/><div className={`${cx.eyebrow} mt-5`}>{selectedDrop.date} / MAI KÜLDEMÉNY</div><h1 className={`${cx.title} mt-3 text-4xl sm:text-6xl`}>{selectedDrop.title}</h1><p className="mt-3 text-sm text-[#aeb7af]">{selectedDrop.summary}</p><p className="mt-5 text-xs uppercase tracking-wider text-[#aeb7af]">{selectedDrop.creator} · {selectedDrop.format}</p>
          <div className="mt-8 space-y-4 border-t border-[#39413b] pt-5"><button onClick={()=>setPlaying(!playing)} className="flex w-full items-center gap-3 border border-[#59625b] p-4 text-left"><span className="grid h-10 w-10 place-items-center bg-[#e8eae6] text-[#111512]">{playing?<Pause size={18}/>:<Play size={18}/>}</span><span className="flex-1"><strong className="block text-sm">Unknown Transmission</strong><small className="text-xs text-[#9ba39c]">Hanganyag · 04:32</small></span><span className="text-xs">{playing?"LEJÁTSZÁS":"LEJÁTSZÁS INDÍTÁSA"}</span></button><div className="grid grid-cols-3 gap-2"><div className="border border-[#39413b] p-3"><FileText size={17}/><p className="mt-2 text-xs">Szöveg</p></div><div className="border border-[#39413b] p-3"><ImageIcon size={17}/><p className="mt-2 text-xs">12 kép</p></div><div className="border border-[#39413b] p-3"><Video size={17}/><p className="mt-2 text-xs">Videó</p></div></div></div>
        </div></div>}

        {modal!=="none"&&<div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={()=>setModal("none")}><div className="w-full max-w-md border border-[#59625b] bg-[#1a201b] p-5" onClick={e=>e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{modal==="settings"?"Beállítások":modal==="event"?"Új esemény":modal==="task"?"Új feladat":modal==="note"?"Jegyzet mentése":"Új hozzáadása"}</h2><IconButton label="Bezárás" onClick={()=>setModal("none")}><X size={17}/></IconButton></div>
          {modal==="settings"?<div className="space-y-4 text-sm"><p className="text-[#aeb7af]">A szinkronizáció és értesítések a működő verzióban kapcsolódnak majd külső szolgáltatásokhoz.</p><button className={cx.button} onClick={()=>setModal("none")}>Rendben</button></div>:<div className="space-y-4">
            {(modal==="add"||modal==="event"||modal==="task")&&<input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Mi legyen a címe?" className="w-full border-b border-[#59625b] bg-transparent py-3 text-sm outline-none"/>}
            {(modal==="add"||modal==="event")&&<input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} className="w-full border-b border-[#59625b] bg-transparent py-3 text-sm"/>}
            <div className="flex flex-wrap gap-2">{modal==="add"?<><button onClick={()=>setModal("task")} className={cx.button}>Feladat</button><button onClick={()=>setModal("event")} className={cx.button}>Esemény</button><button onClick={()=>setModal("note")} className={cx.button}>Jegyzet</button></>:<button onClick={()=>{if(modal==="task")addTask();else if(modal==="event")addEvent();else {setNote(newTitle||note);setNewTitle("");setModal("none")}}} className={cx.button}>Mentés</button>}</div>
          </div>}
        </div></div>}
      </div>
    </main>
  )
}
