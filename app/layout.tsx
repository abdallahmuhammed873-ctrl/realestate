import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/top-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatbotDrawer } from "@/components/chatbot/chatbot-drawer";

export const metadata: Metadata = {
  title: "Cheque & Key",
  description: "Verified properties with trusted payment and installment workflows."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-6 md:px-6">{children}</main>
        <ChatbotDrawer />
        <MobileNav />
      </body>
    </html>
  );
}
