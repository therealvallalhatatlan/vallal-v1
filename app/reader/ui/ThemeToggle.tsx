"use client";
import { useEffect, useState } from "react";


function applyTheme(theme: "light" | "dark") {
const r = document.documentElement;
if (theme === "dark") {
r.style.setProperty("--bg", "#0b0b0b");
r.style.setProperty("--fg", "#e5e5e5");
} else {
r.style.setProperty("--bg", "#ffffff");
r.style.setProperty("--fg", "#111111");
}
}


export function ThemeToggle() {
const [theme, setTheme] = useState<"light" | "dark">(() => (typeof window !== "undefined" && (localStorage.getItem("reader:theme") as any)) || "light");


useEffect(() => {
// system default on first visit
const saved = localStorage.getItem("reader:theme") as "light" | "dark" | null;
const sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const initial = saved || (sysDark ? "dark" : "light");
setTheme(initial);
applyTheme(initial);
}, []);


useEffect(() => {
applyTheme(theme);
localStorage.setItem("reader:theme", theme);
}, [theme]);


return (
<button
className="rounded-xl border px-2 py-1 text-xs"
onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
aria-label="Téma váltása"
title="Téma váltása"
>
{theme === "dark" ? "☀️" : "🌙"}
</button>
);
}