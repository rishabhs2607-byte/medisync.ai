import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediSync AI — Next Generation Digital Healthcare Ecosystem",
  description: "MediSync AI is a startup-ready digital healthcare operating system connecting Patients, Doctors, Hospitals, and ESP32-based IoT Medical Devices.",
  keywords: "telemedicine, IoT healthcare, digital medicine, AI patient monitoring, smart health, health tech, ESP32 healthcare",
  authors: [{ name: "MediSync AI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{__html: `
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
        `}} />
      </head>
      <body className="antialiased bg-background text-foreground bg-grid-pattern min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
