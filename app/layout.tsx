import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTRL-B Video Studio",
  description: "Product & UGC video generation studio powered by OpenRouter",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
