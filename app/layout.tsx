import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RPS — You vs AI", description: "Rock. Paper. Scissors. First to 5 wins." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
