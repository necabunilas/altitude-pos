import { Montserrat } from "next/font/google";
import "./globals.css";
import { RESTAURANT_NAME } from "@/lib/brand";

// altitude.cc uses Montserrat across the board; a single family covers body,
// section headings (font-display), and the logotype (font-script).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: `${RESTAURANT_NAME} · Dine-in Ordering`,
  description: `Scan, browse, and order at ${RESTAURANT_NAME}.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}