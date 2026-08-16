import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

/**
 * Three faces, one rule: the serif speaks, the sans operates, the mono records.
 *
 * Newsreader carries the voice — page titles and the things the school is
 * saying in its own words. It is an editorial serif with an optical-size axis,
 * so it holds up at both hero and heading sizes, and it gives a college the
 * authority a grotesque cannot.
 *
 * IBM Plex Sans runs the interface. It was drawn for screens, has a generous
 * x-height, and stays legible at 12px on the mid-range Android handsets most
 * students here are using in daylight.
 *
 * IBM Plex Mono marks anything issued by the school — student numbers, room
 * codes, times, percentages. Sharing a superfamily with the body face means
 * data sits inside a sentence without looking pasted in.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    { media: "(prefers-color-scheme: light)", color: "#a6192e" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0708" },
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
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh bg-page text-content antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
