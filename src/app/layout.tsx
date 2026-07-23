import type { Metadata } from "next";
import { Lato, Merienda } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const display = Merienda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const body = Lato({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Curry Kitchen - San Diego Tiffin Delivery",
  description:
    "Homemade Indian meal plans, weekly menus, and tiffin delivery for San Diego customers.",
};

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
