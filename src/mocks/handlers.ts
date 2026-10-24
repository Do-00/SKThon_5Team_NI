import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/src/lib/api-base-url';
import { getExampleEnergyCost } from '@/src/data/energy-cost';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';

// 등급별 예시 성적표 수치는 src/data/energy-cost.ts 에 있습니다 — 값을 바꿔 가며 실험하세요.
// 성적표는 이제 우리 앱의 같은 오리진 라우트(src/app/api/energy-cost)를 직접 부르므로 이 핸들러는
// 안 타지만, beec 주소로 직접 요청하는 다른 코드가 생기면 여전히 안전망 역할을 합니다.

// 가짜 유저 데이터
const Users: Record<number, { id: number; email: string; nickname: string }> = {
  1: { id: 1, email: 'test@example.com', nickname: '테스트유저' },
};

export const handlers = [
  // 예시 난방비 (beec 백엔드 주소로 나가는 요청을 가로챔)
  http.get(`${API_BASE_URL}/api/energy-cost`, ({ request }) => {
    const gradeCode = new URL(request.url).searchParams.get('gradeCode') ?? '';
    const cost = getExampleEnergyCost(gradeCode);
    console.log('[MSW] GET /api/energy-cost', gradeCode, cost);
    return HttpResponse.json(cost);
  }),

  // 로그인
  http.post(`${baseUrl}/api/login`, () => {
    console.log('[MSW] POST /api/login');
    return HttpResponse.json(Users[1], {
      headers: {
        'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
      },
    });
  }),

  // 로그아웃
  http.post(`${baseUrl}/api/logout`, () => {
    console.log('[MSW] POST /api/logout');
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0',
      },
    });
  }),

  // 회원가입
  http.post(`${baseUrl}/api/users`, async ({ request }) => {
    console.log('[MSW] POST /api/users', await request.json().catch(() => null));
    // 이미 존재하는 유저 테스트: 아래 주석 해제
    // return HttpResponse.text(JSON.stringify('user_exists'), { status: 403 });
    return HttpResponse.text(JSON.stringify('ok'), {
      headers: {
        'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
      },
    });
  }),
];
