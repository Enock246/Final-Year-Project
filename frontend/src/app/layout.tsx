import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InternConnect",
  description: "Find Your Perfect Teaching Placement Fast",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
