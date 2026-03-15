import { Bricolage_Grotesque, Albert_Sans } from "next/font/google";
import "./globals.css";
import { ShopProvider } from "@/components/ShopProvider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const albert = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-albert",
  display: "swap",
});

export const metadata = {
  title: "EggTrack | Shopkeeper Portal",
  description: "Secure order management for EggTrack vendors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${albert.variable} antialiased min-h-screen bg-background`}>
        <ShopProvider>
          {children}
        </ShopProvider>
      </body>
    </html>
  );
}
