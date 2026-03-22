import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Event Concierge' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Event Concierge — AI Chat Widget for Party Rental Companies",
    description: "Customers describe their event, your AI recommends the perfect rentals. Live in under 10 minutes. $297/year.",
    images: ['/opengraph-image'],
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
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-EMKR0SCCKR" strategy="afterInteractive" />
      <Script id="gtag" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-EMKR0SCCKR');
      `}</Script>
      <Script id="clarity" strategy="afterInteractive">{`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "vzeyjldhoz");
      `}</Script>
    </html>
  );
}
