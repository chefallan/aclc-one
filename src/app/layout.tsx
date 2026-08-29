import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

/**
 * Three faces, one rule (concept sheet 01): the display titles, the sans
 * operates, the mono records.
 *
 * Bricolage Grotesque carries display — headings, screen titles, and the
 * figures the app works out for you. It has an optical-size axis, so the same
 * face holds a 40px hero number and a 15px card title without either looking
 * like the other scaled.
 *
 * Instrument Sans runs the interface: body, labels, buttons, sentence case
 * everywhere. It was drawn for screens and stays legible at 12px on the
 * mid-range Android handsets most students here are using in daylight.
 *
 * IBM Plex Mono marks anything issued by the school — student numbers, room
 * codes, times, percentages, grades. If it came off an official record, it is
 * monospaced.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ACLC One — ACLC College of Ormoc",
    template: "%s · ACLC One",
  },
  description:
    "Attendance, work immersion, the library, and everyone you need to find — one app for ACLC College of Ormoc.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ACLC One",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14459c" },
    { media: "(prefers-color-scheme: dark)", color: "#060f1f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrumentSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh bg-page text-content antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
