import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const safeSlug = encodeURIComponent(params.slug);
  const storyImage = `/public-story/${safeSlug}.jpg`;

  return {
    openGraph: {
      images: [storyImage, "/og.png"],
    },
    twitter: {
      images: [storyImage, "/og.png"],
    },
  };
}

export default function PublicStorySlugLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
