import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import { getT } from "@/i18n";
import "./globals.css";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Noavio Career";

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: "AI job search agent – honest, transparent, under your control.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dir } = await getT();
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
