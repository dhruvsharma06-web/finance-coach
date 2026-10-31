import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? "https://" + process.env.VERCEL_URL
        : "http://localhost:3000"),
  ),
  title: { default: "Kosh — your living money model", template: "%s · Kosh" },
  openGraph: {
    title: "Kosh — your living money model",
    description:
      "An AI money coach for India that reads messy statements, learns your categories, and shows what a decision does to your goals.",
    type: "website",
  },
  description:
    "An AI personal finance coach that learns your money, models your what-ifs, and nudges you back on plan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* arm scroll-reveal before first paint so nothing flashes; skipped for reduced motion */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion");var t=localStorage.getItem("kosh-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            className: "!rounded-xl !border-line !bg-surface !text-ink",
          }}
        />
      </body>
    </html>
  );
}
