import type { Metadata } from "next";
import { ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: "에코체크 계정의 비밀번호를 재설정하세요.",
};

/**
 * Prototype-only stopgap for the "비밀번호를 잊으셨나요?" link on the login
 * card. There is no password-reset endpoint in `src/mocks/handlers.ts`, so
 * this stays a static, honest dead end instead of pretending to send an
 * email — no `useSearchParams`/client state needed here.
 */
export default function ResetPasswordPage() {
  return (
    <Card padding="lg" className="w-full">
      <CardHeader>
        <CardTitle>비밀번호 찾기</CardTitle>
        <CardDescription>
          이 화면은 프로토타입이라 실제로 비밀번호 재설정 메일을 보내지 않아요. 로그인 화면으로 돌아가 다시
          시도해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ButtonLink href="/login" fullWidth>
          로그인 화면으로 돌아가기
        </ButtonLink>
      </CardContent>
    </Card>
  );
}
