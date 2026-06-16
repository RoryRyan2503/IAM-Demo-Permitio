import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AccountProvider } from "@/context/AccountContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Honeywell B2B Portal — IAM Demo",
  description: "Enterprise fine-grained authorization demo — Ping Identity, Permit.io, tool-based ReBAC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AccountProvider>{children}</AccountProvider>
        </AuthProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
