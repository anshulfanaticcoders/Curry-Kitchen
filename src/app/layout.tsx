import type { Metadata } from "next";
import { IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { getSeoSettings, getSiteOrigin } from "@/lib/server/seo";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  return {
    metadataBase: new URL(getSiteOrigin()),
    title: "Curry Kitchen - San Diego Tiffin Delivery",
    description: settings.defaultDescription,
    verification: settings.googleVerification ? { google: settings.googleVerification } : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-ivory text-ink">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
