import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/top-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatbotDrawer } from "@/components/chatbot/chatbot-drawer";
import { RuntimeErrorGuard } from "@/components/layout/runtime-error-guard";
import { LanguageProvider } from "@/components/layout/language-provider";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider, ThemeScript } from "@/components/layout/theme-provider";

export const metadata: Metadata = {
  title: "Cheque & Key",
  description: "Verified properties with trusted payment and installment workflows."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeScript />
        <ThemeProvider>
          <LanguageProvider>
            <RuntimeErrorGuard />
            <TopNav />
            <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-6 md:px-6">{children}</main>
            <Footer />
            <ChatbotDrawer />
            <MobileNav />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
