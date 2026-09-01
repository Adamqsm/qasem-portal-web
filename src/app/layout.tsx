import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qasem Portal",
  description: "Qasem Portal is the parent company of Cue.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
