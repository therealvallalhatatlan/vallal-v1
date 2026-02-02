import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function humanize(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^\d+-/, "") // Remove leading numbers and dash (e.g., "01-", "02-")
    .replace(/-/g, " ");
}
