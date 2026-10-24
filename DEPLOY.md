# 외부 링크 배포 (심사위원이 URL로 열어 보는 용도)

이름 규칙: 팀명은 NI로 통일한다. 학교명은 쓰지 않는다. 서비스 이름 예) `ecocheck-gr`.

## 1. 백엔드 beec → Render (Docker)
1. render.com → New → Web Service → 저장소 연결 → **Root Directory: `beec`**, Runtime: **Docker**
2. Instance Type: Free (또는 Starter). 서비스 이름은 `ecocheck-api` 처럼 중립적으로.
3. 배포가 끝나면 주소(`https://ecocheck-api.onrender.com`)를 복사한다.
4. `주소/actuator`가 아니라 `주소/api/...` 중 아무 API 하나를 브라우저로 열어 응답이 오는지 본다. 첫 기동은 10~60초.

## 2. 프론트 → Vercel
1. vercel.com → Add New Project → 저장소 선택 → **프로젝트 이름 `ecocheck-gr`** (주소가 `ecocheck-gr.vercel.app`)
2. Environment Variables:
   - `NEXT_PUBLIC_BEEC_API_BASE_URL` = 위 Render 주소 (끝에 `/` 없이)
   - `BEEC_API_BASE_URL` = 같은 주소
   - `GEMINI_API_KEY`, `GEMINI_MODEL` (예: gemini-2.5-flash)
   - `BLDG_HUB_API_KEY` (건축HUB 키)
   - `NEXT_PUBLIC_KAKAO_MAP_KEY`
3. Deploy. `NEXT_PUBLIC_` 값은 빌드 때 박히므로 바꾸면 **Redeploy**.

## 3. 카카오 개발자 콘솔 (필수)
- 내 애플리케이션 → 플랫폼 → Web → 사이트 도메인에 `https://ecocheck-gr.vercel.app` 추가
- 주소검색(우편번호)·지도가 이 등록 없이는 배포 주소에서 동작하지 않는다.

## 4. 심사 직전 체크
- Render 무료 인스턴스는 15분 쉬면 잠든다. **시연 5분 전에 사이트를 한 번 열어 깨워 둔다.**
- 시연 질문 2~3개를 미리 한 번씩 눌러 둔다(AI 답은 캐시되지만 서버 재시작 시 사라진다).
- Gemini 할당량 소진에 대비해 결제를 켜거나 다른 키를 준비한다.
- 배포 주소에는 팀명이 없는지, 소스·README에도 없는지 확인한다.
