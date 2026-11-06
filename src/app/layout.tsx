import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Booth",
  description: "A native-feel photo booth web app for iPhone",
  applicationName: "Photo Booth",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Photo Booth",
  },
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-black text-white antialiased">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Photo Booth" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full w-full bg-black text-white overflow-hidden select-none font-sans">
        {children}
      </body>
    </html>
  );
}
