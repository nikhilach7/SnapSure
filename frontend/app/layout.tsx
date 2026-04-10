import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
import ThemeToggle from "./components/theme-toggle";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SnapSure - AI-Powered Deepfake Detection",
  description: "Detect deepfakes instantly with our ensemble AI model. Enterprise-grade accuracy, lightning-fast analysis, production-ready deployment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} min-h-screen`}>
        <div className="relative min-h-screen overflow-x-clip">
          <div className="orb-a pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full blur-3xl" />
          <div className="orb-b pointer-events-none absolute -right-16 top-1/3 h-80 w-80 rounded-full blur-3xl" />
          <div className="orb-c pointer-events-none absolute left-1/3 top-[72%] h-64 w-64 rounded-full blur-3xl" />

          <div className="app-shell relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-10">
            <header className="flow-panel sticky top-4 z-30 mt-4 rounded-[1.6rem] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/" className="flex items-center gap-3">
                  <span className="brand-badge grid h-10 w-10 place-items-center rounded-xl text-sm font-black">
                    SS
                  </span>
                  <div>
                    <p className="hero-kicker">AI Deepfake Detection</p>
                    <h1 className="headline text-lg leading-none sm:text-xl">SnapSure</h1>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <nav className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href="/" className="nav-link rounded-lg px-3 py-1.5 transition">
                    Analyze
                  </Link>
                  <Link href="/features" className="nav-link rounded-lg px-3 py-1.5 transition">
                    Features
                  </Link>
                  <Link href="/about" className="nav-link rounded-lg px-3 py-1.5 transition">
                    About
                  </Link>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <main className="flex-1 py-6">{children}</main>

            <footer className="flow-panel mb-6 rounded-[1.6rem] px-5 py-4 text-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="headline text-lg">SnapSure</p>
                  <p className="hero-kicker">Enterprise AI. Production Ready.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/features" className="footer-link transition">
                    Features
                  </Link>
                  <Link href="/about" className="footer-link transition">
                    About
                  </Link>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link transition">
                    GitHub
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
