import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { MSWProvider as MSWComponent } from "./MSWComponent";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "에코체크",
    template: "%s | 에코체크",
  },
  description:
    "주소 하나로 건물 에너지 상태를 확인하고, 맞춤형 절감 방법과 지원사업을 찾아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MSWComponent>{children}</MSWComponent>
      </body>
    </html>
  );
}
