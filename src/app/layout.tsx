import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata: Metadata = { title: "Marhaba | Make Abu Dhabi work for your life", description: "“To Abu Dhabi” just got easier. A connected plan for your business, your family, and your next chapter. Interactive prototype with demonstration data." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={inter.variable}><body>{children}</body></html>; }
