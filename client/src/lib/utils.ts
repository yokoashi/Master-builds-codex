import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Hex to rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}

/** Lighten/darken a hex color by amount (-1 to 1) */
export function adjustColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, Math.min(255, parseInt(result[1], 16) + amount * 255));
  const g = Math.max(0, Math.min(255, parseInt(result[2], 16) + amount * 255));
  const b = Math.max(0, Math.min(255, parseInt(result[3], 16) + amount * 255));
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

/** Stat gain label: +N between two values */
export function statGain(prev: number | undefined, curr: number): string {
  if (prev === undefined) return "";
  const diff = curr - prev;
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return "";
}

/** Format large numbers with K suffix */
export function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
