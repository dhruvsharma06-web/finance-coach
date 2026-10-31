import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Kosh — your living money model",
  description: "An AI personal finance coach that learns your money, models your what-ifs, and nudges you back on plan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "!rounded-xl !border-line !bg-surface !text-ink" }} />
      </body>
    </html>
  );
}
