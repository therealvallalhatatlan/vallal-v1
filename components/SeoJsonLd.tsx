// components/SeoJsonLd.tsx
'use client';


import React from 'react';


type Props = { data: unknown };


export default function SeoJsonLd({ data }: Props) {
return (
<script
type="application/ld+json"
suppressHydrationWarning
dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
/>
);
}