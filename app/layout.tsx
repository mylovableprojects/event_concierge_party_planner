import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Concierge — AI Chat Widget for Party Rental Companies",
  description: "Embed an AI chat widget on your website. Customers describe their event and get instant, personalized rental recommendations. $297/year.",
  metadataBase: new URL('https://concierge.thepartyrentaltoolkit.com'),
  openGraph: {
    title: "Event Concierge — AI Chat Widget for Party Rental Companies",
    description: "Customers describe their event, your AI recommends the perfect rentals. Live in under 10 minutes. $297/year.",
    url: 'https://concierge.thepartyrentaltoolkit.com',
    siteName: 'Event Concierge',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Event Concierge — AI Chat Widget for Party Rental Companies",
    description: "Customers describe their event, your AI recommends the perfect rentals. Live in under 10 minutes. $297/year.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
