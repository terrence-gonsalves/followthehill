import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "FollowTheHill — Canadian Political Transparency",
    template: "%s | FollowTheHill",
  },
  description:
    "Track how every federal MP votes and who funds their campaigns. Follow the money. Follow the votes. Follow the Hill.",
  keywords: [
    "Canadian politics",
    "MP voting record",
    "political donations",
    "Parliament Canada",
    "political transparency",
    "Elections Canada",
  ],
  openGraph: {
    title: "FollowTheHill",
    description: "Follow the money. Follow the votes. Follow the Hill.",
    url: "https://followthehill.ca",
    siteName: "FollowTheHill",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowTheHill",
    description: "Follow the money. Follow the votes. Follow the Hill.",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://followthehill.ca"
  ),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-CA">
      <body className="bg-hill-paper text-hill-ink antialiased">
        {children}
      </body>
    </html>
  )
}
