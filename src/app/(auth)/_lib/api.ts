/**
 * Thin client-side callers for the existing MSW-mocked auth endpoints
 * (`POST /api/login`, `POST /api/users`). This intentionally does not touch
 * `src/mocks/**` — it only calls the endpoints that are already wired up
 * there, and classifies the response into UI-friendly outcomes.
 *
 * No session/cookie handling lives here: the mock responses include a
 * `Set-Cookie` header, but this prototype UI never reads or relies on it.
 */

export type AuthErrorKind = "offline" | "invalid" | "duplicate" | "validation" | "server";

export type AuthResult = { ok: true } | { ok: false; kind: AuthErrorKind; message: string };

const OFFLINE_MESSAGE = "네트워크에 연결할 수 없어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
const VALIDATION_ERROR_MESSAGE = "입력하신 정보를 다시 확인해 주세요.";

function isKnownOffline(): boolean {
  return typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResult> {
  if (isKnownOffline()) {
    return { ok: false, kind: "offline", message: OFFLINE_MESSAGE };
  }

  try {
    const response = await postJson("/api/login", payload);

    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, kind: "invalid", message: "이메일 또는 비밀번호가 올바르지 않아요." };
    }
    if (response.status >= 500) {
      return { ok: false, kind: "server", message: SERVER_ERROR_MESSAGE };
    }
    return { ok: false, kind: "validation", message: VALIDATION_ERROR_MESSAGE };
  } catch {
    // fetch() rejects (TypeError) on network failure — treat the same as offline.
    return { ok: false, kind: "offline", message: OFFLINE_MESSAGE };
  }
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export async function signupRequest(payload: SignupPayload): Promise<AuthResult> {
  if (isKnownOffline()) {
    return { ok: false, kind: "offline", message: OFFLINE_MESSAGE };
  }

  try {
    const response = await postJson("/api/users", payload);

    if (response.ok) return { ok: true };
    if (response.status === 403 || response.status === 409) {
      return { ok: false, kind: "duplicate", message: "이미 가입된 이메일이에요. 로그인해 주세요." };
    }
    if (response.status >= 500) {
      return { ok: false, kind: "server", message: SERVER_ERROR_MESSAGE };
    }
    return { ok: false, kind: "validation", message: VALIDATION_ERROR_MESSAGE };
  } catch {
    return { ok: false, kind: "offline", message: OFFLINE_MESSAGE };
  }
}
