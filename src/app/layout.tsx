import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getCurrentUserEmail } from "@/lib/queries";
import { signOut } from "@/lib/auth-actions";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Entropico Hub",
  description: "Gestione progetti e task",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userEmail = await getCurrentUserEmail();

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {userEmail ? (
          <div className="flex min-h-screen">
            <AppSidebar userEmail={userEmail} />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="border-b md:hidden">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <Link
                    href="/"
                    className="text-lg font-semibold tracking-tight"
                  >
                    Entropico Hub
                  </Link>
                  <div className="flex items-center gap-2">
                    <MobileNav />
                    <form action={signOut}>
                      <button
                        type="submit"
                        aria-label="Esci"
                        className="flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </header>
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                {children}
              </main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
