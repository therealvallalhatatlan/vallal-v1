// File: app/reader/_data/stories.ts
export type Story = {
order: number;
slug: string;
title: string;
// Keep markdown ultra‑simple: blank line = new paragraph; **bold**, *italic* supported lightly; lines starting with "- " remain as list items (optional)
content: string;
};


// ⬇️ Replace these with your real stories. Keep order unique & consecutive.
export const STORIES: Story[] = [
{
order: 1,
slug: "holnaptol-leallok",
title: "Holnaptól leállok",
content: `Első bekezdés. Ez *dőlttel* és **félkövérrel** is működik.


Második bekezdés. Párbeszédhez sima sortörések:
– Na mi van?\n– Semmi.\n– Akkor olvass tovább.`,
},
{
order: 2,
slug: "jezus-megszoktet",
title: "Jézus megszöktet",
content: `Másik történet első bekezdése.\n\nMásodik bekezdés.`,
},
// ...
];


export function getOrderedStories() {
return [...STORIES].sort((a, b) => a.order - b.order);
}


export function findBySlug(slug: string) {
return getOrderedStories().find((s) => s.slug === slug) || null;
}


export function nextPrev(slug: string) {
const all = getOrderedStories();
const idx = all.findIndex((s) => s.slug === slug);
return {
prev: idx > 0 ? all[idx - 1] : null,
next: idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null,
idx,
total: all.length,
};
}