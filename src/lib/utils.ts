import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const aed = (fils: number, decimals = 0) => new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: decimals }).format(fils / 100);
export const fils = (aedAmount: number) => Math.round(aedAmount * 100);
export const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
