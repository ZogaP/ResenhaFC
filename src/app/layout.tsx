import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LineUp",
  description: "Gerencie suas peladas de futebol com sorteio balanceado e avaliações pós-jogo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LineUp",
  },
};

export const viewport: Viewport = {
  themeColor: "#1DB954",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <div style={{ display: 'flex', justifyContent: 'center', background: '#000', minHeight: '100vh' }}>
            <div className="container" style={{ position: 'relative', boxShadow: '0 0 100px rgba(0,0,0,0.8)', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
              </main>
              <BottomNav />
              <PWAInstallPrompt />
            </div>
          </div>
        </AuthProvider>
        <Script
          id="pwa-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    reg.onupdatefound = () => {
                      const newWorker = reg.installing;
                      newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          window.dispatchEvent(new CustomEvent('pwa-update-available'));
                        }
                      };
                    };
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
