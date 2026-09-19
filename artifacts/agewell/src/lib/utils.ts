import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getLevelColor(level: string) {
  switch (level) {
    case "GREEN": return "bg-severity-green";
    case "YELLOW": return "bg-severity-yellow";
    case "ORANGE": return "bg-severity-orange";
    case "RED": return "bg-severity-red";
    default: return "bg-slate-300";
  }
}

export function getLevelTextColor(level: string) {
  switch (level) {
    case "GREEN": return "text-severity-green";
    case "YELLOW": return "text-severity-yellow";
    case "ORANGE": return "text-severity-orange";
    case "RED": return "text-severity-red";
    default: return "text-slate-500";
  }
}
