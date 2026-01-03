import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ultimate Card Championship Leaderboard",
  description: "The Ultimate Backstab Board",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: [
    {
      url: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      url: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7C3AED" />
        <link rel="icon" href="/icon-192.png" />

        {/* Your existing inline styles */}
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
