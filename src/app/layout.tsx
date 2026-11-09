import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: "Bretlify: design anything in your browser",
  description: "A fast, collaborative, AI-powered graphic design editor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        <ClerkProvider
          appearance={{
            variables: { colorPrimary: "#ff4d6a", borderRadius: "0.6rem" },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
