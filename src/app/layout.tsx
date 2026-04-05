"use client";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import "@/i18n/config"; // Initialize i18n
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang={mounted ? i18n.language : "en"}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff9933" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
