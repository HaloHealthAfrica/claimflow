import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorProvider } from "@/components/GlobalErrorProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClaimFlow - HIPAA-Compliant Insurance Claims Management",
  description: "Streamline your insurance claims with AI-powered OCR, medical coding assistance, and secure claim tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalErrorProvider
          config={{
            enableGlobalHandling: true,
            enableRetryLogic: true,
            enableCircuitBreaker: true,
            enableRateLimiting: false,
          }}
          maxGlobalErrors={5}
          errorDisplayDuration={8000}
          enableErrorToasts={true}
        >
          <ErrorBoundary level="page" enableRetry={true} maxRetries={3}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </GlobalErrorProvider>
      </body>
    </html>
  );
}
