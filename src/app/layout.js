// src/app/layout.js - FULL FAVICON + LOGO TITLE
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tra cứu văn bằng - Trường Đại học Quản lý và Công nghệ Hải Phòng",
  description: "Hệ thống tra cứu và xác thực văn bằng tốt nghiệp trực tuyến của Trường Đại học Quản lý và Công nghệ Hải Phòng. Tra cứu nhanh chóng, chính xác thông tin văn bằng đã được cấp.",
  keywords: "tra cứu văn bằng, HPU, Đại học Hải Phòng, xác thực văn bằng, kiểm tra bằng tốt nghiệp",
  authors: [{ name: "Trường Đại học HPU" }],
  openGraph: {
    title: "Tra cứu văn bằng - Trường ĐH Hải Phòng",
    description: "Hệ thống tra cứu và xác thực văn bằng tốt nghiệp trực tuyến",
    type: "website",
    locale: "vi_VN",
    images: "/images/logoblue.png",  // ✅ OG Image
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // TODO: Thêm Google Search Console verification
    // google: 'your-verification-code',
  },
  icons: {
    icon: "/favicon.ico",              // Favicon mặc định
    shortcut: "/favicon-16x16.png",    // 16x16
    apple: "/apple-touch-icon.png",    // iOS 180x180
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0083c2" />
        
        {/* FAVICONS */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* SEO META */}
        <meta name="msapplication-TileColor" content="#0083c2" />
        <meta name="theme-color" content="#0083c2" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}