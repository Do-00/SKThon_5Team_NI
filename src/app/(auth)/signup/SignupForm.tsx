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
  Input,
} from "@/src/components/ui";
import { signupRequest } from "../_lib/api";
import { sanitizeNextPath, withNextQuery } from "../_lib/safe-next-path";
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from "../_lib/validation";

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const INITIAL_VALUES: FormValues = { name: "", email: "", password: "", confirmPassword: "" };

export function SignupForm() {
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
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (formError) setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirmPassword: validatePasswordConfirm(values.password, values.confirmPassword),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    setFormError(null);

    const result = await signupRequest({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    });

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
        <CardTitle>회원가입</CardTitle>
        <CardDescription>몇 가지 정보만 입력하면 바로 시작할 수 있어요.</CardDescription>
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
            label="이름"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            error={errors.name}
            required
            disabled={submitting}
          />

          <Input
            label="이메일"
            type="email"
            name="email"
            autoComplete="email"
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
            autoComplete="new-password"
            hint={`${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`}
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            error={errors.password}
            required
            disabled={submitting}
          />

          <Input
            label="비밀번호 확인"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            error={errors.confirmPassword}
            required
            disabled={submitting}
          />

          <Button type="submit" fullWidth loading={submitting}>
            회원가입
          </Button>
        </form>

        <p className="mt-[var(--space-6)] text-center text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          이미 계정이 있으신가요?{" "}
          <Link
            href={withNextQuery("/login", rawNext)}
            className="font-bold text-[var(--text-link)] hover:underline"
          >
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
