import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names (same helper the live app uses: clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letter of a name, upper-cased — used for avatar fallbacks. */
export function initial(name?: string | null) {
  return name ? name.charAt(0).toUpperCase() : "";
}

/** Avatar ring color alternates by row index, exactly like the live dashboard. */
export function avatarBorder(index: number) {
  return index % 2 === 0 ? "border-amber-600" : "border-dashboard-border";
}

/** "Karl Test Account" -> "KT" (first letters of the first two words), "Akshoy" -> "A". */
export function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
