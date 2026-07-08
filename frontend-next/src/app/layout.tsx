import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "Relic Ring Protocol — Zeta-26",
  description: "Relic Ring Protocol — Interplanetary Routing Simulator for the Zeta-26 Star System. Reconnect the silence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} bg-void text-[#e2e0ec]`}>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
