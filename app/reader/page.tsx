"use client";
import { useEffect, useMemo, useState } from "react";
import { getOrderedStories } from "./_data/stories";
import Link from "next/link";
import { ThemeToggle } from "./ui/ThemeToggle";


export default function ReaderHome() {
const stories = useMemo(() => getOrderedStories(), []);
const first = stories[0];
const [lastSlug, setLastSlug] = useState<string | null>(null);


useEffect(() => {
const slug = localStorage.getItem("reader:last:slug");
setLastSlug(slug);
}, []);


const target = lastSlug && stories.find((s) => s.slug === lastSlug) ? lastSlug : first.slug;


return (
<main className="mx-auto max-w-screen-sm px-4 py-6 flex min-h-dvh flex-col">
<header className="flex items-center justify-between gap-4">
<h1 className="text-lg font-semibold tracking-wide">Vállalhatatlan — Olvasó</h1>
<ThemeToggle />
</header>


<div className="mt-16 flex flex-1 flex-col items-center justify-center text-center">
<p className="opacity-80">Folytatnád onnan, ahol abbahagytad?</p>
<Link
href={`/reader/${target}`}
className="mt-4 inline-flex items-center rounded-2xl border px-5 py-3 text-sm"
>
{lastSlug ? "Folytatás" : "Kezdés"}
</Link>
<div className="mt-10 text-xs opacity-60">
vagy válassz: {stories.map((s, i) => (
<>
{i > 0 && <span className="mx-1">•</span>}
<Link key={s.slug} className="underline underline-offset-2" href={`/reader/${s.slug}`}>
{s.title}
</Link>
</>
))}
</div>
</div>
</main>
);
}