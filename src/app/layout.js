// src/app/layout.js
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
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // TODO: Thêm Google Search Console verification
    // google: 'your-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0083c2" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}