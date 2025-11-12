"use client";
import { useMemo } from "react";
import { getOrderedStories } from "../_data/stories";
import { useRouter } from "next/navigation";


export function StoryPicker({ currentSlug }: { currentSlug: string }) {
const stories = useMemo(() => getOrderedStories(), []);
const router = useRouter();
return (
<select
className="rounded-xl border bg-[var(--bg)] px-2 py-1 text-xs"
value={currentSlug}
onChange={(e) => router.push(`/reader/${e.target.value}`)}
aria-label="Ugrás másik fejezetre"
>
{stories.map((s) => (
<option key={s.slug} value={s.slug}>
{s.order}. {s.title}
</option>
))}
</select>
);
}