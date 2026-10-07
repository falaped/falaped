import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetaPixel } from "@/components/meta-pixel";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "@falaped - IA para pediatras",
  description: "Falaped te auxilia no seu dia a dia como pediatra",
  // App logado fica fora do Google; a landing de books reabilita no próprio layout.
  robots: { index: false, follow: false },
};

// Guia de design: Inter no texto, Lexend (a família da logo) nos títulos.
const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${lexend.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster position="top-center" />
            <MetaPixel />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
