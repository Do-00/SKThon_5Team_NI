"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
} from "@/src/components/ui";
import { loginRequest } from "../_lib/api";
import { sanitizeNextPath, withNextQuery } from "../_lib/safe-next-path";
import { validateEmail, validatePassword } from "../_lib/validation";

interface FormValues {
  email: string;
  password: string;
  remember: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

const INITIAL_VALUES: FormValues = { email: "", password: "", remember: true };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = sanitizeNextPath(rawNext);

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "email" || key === "password") {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (formError) setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    setFormError(null);

    const result = await loginRequest({ email: values.email.trim(), password: values.password });

    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.message);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <Card padding="lg" className="w-full">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>에코체크 계정으로 로그인하고 건물 에너지 리포트를 확인하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-5)]">
          {formError ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--status-danger)] bg-[var(--status-danger-soft)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-caption-size)] text-[var(--status-danger)]"
            >
              {formError}
            </p>
          ) : null}

          <Input
            label="이메일"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            error={errors.email}
            required
            disabled={submitting}
          />

          <Input
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            error={errors.password}
            required
            disabled={submitting}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
            <Checkbox
              label="로그인 상태 유지"
              description="프로토타입에서는 로그인 상태가 실제로 유지되지 않아요."
              checked={values.remember}
              onChange={(event) => updateField("remember", event.target.checked)}
              disabled={submitting}
            />
            <Link
              href={withNextQuery("/reset-password", rawNext)}
              className="shrink-0 text-[length:var(--text-caption-size)] font-medium text-[var(--text-link)] hover:underline"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={submitting}>
            로그인
          </Button>
        </form>

        <p className="mt-[var(--space-6)] text-center text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          아직 계정이 없으신가요?{" "}
          <Link
            href={withNextQuery("/signup", rawNext)}
            className="font-bold text-[var(--text-link)] hover:underline"
          >
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
