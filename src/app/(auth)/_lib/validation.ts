/** Field-level validation error messages, keyed by form field name. */
export interface FieldErrors {
  [field: string]: string | undefined;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MIN_LENGTH = 2;

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "이메일을 입력해 주세요.";
  if (!EMAIL_PATTERN.test(trimmed)) return "올바른 이메일 형식으로 입력해 주세요.";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "비밀번호를 입력해 주세요.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`;
  }
  return undefined;
}

export function validatePasswordConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return "비밀번호를 한 번 더 입력해 주세요.";
  if (password !== confirm) return "비밀번호가 일치하지 않아요.";
  return undefined;
}

export function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "이름을 입력해 주세요.";
  if (trimmed.length < NAME_MIN_LENGTH) return `이름은 ${NAME_MIN_LENGTH}자 이상 입력해 주세요.`;
  return undefined;
}
