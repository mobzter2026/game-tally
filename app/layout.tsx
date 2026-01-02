import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ultimate Card Championship Leaderboard",
  description: "The Ultimate Backstab Board",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          body { overscroll-behavior-x: none; }
          html { overflow-x: hidden; }
        `}</style>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
