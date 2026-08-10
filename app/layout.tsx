import type { Metadata } from "next";
import { Bebas_Neue, Barlow_Condensed, Outfit } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/sonner";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "600", "700"],
  variable: "--font-condensed",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EyeTest — FC Bayern München Player Ratings",
  description: "Rate FC Bayern München players after every match",
  icons: {
    icon: "/EyeTest.png",
    apple: "/EyeTest.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${barlowCondensed.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#0A0A0A", color: "#f7f7f7" }}>
        <Navigation />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8" style={{ backgroundColor: "#0A0A0A" }}>
          {children}
        </main>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
