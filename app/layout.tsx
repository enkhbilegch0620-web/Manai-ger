import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Манай гэр",
  description: "Гэр бүлийн гэрийн ажил, цагийн хуваарь, дэлгүүрийн захиалгын систем",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-sm">{children}</body>
    </html>
  );
}
