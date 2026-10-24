# NI · 에코체크 (Eco Check)

주소 하나로 건물의 에너지 성적표를 보여주고, 근거가 부족하면 추정하지 않으며,
적용되는 법령·지원사업을 원문 근거와 함께 안내하는 그린리모델링 플랫폼입니다.
제6회 그린리모델링 챌린지 대학생 해커톤(AI 플랫폼 아이디어 부문) 출품작입니다.

## 구성

| 폴더 | 내용 |
| --- | --- |
| `src/` | Next.js 16 프론트엔드(App Router, React 19, Tailwind 4) |
| `beec/` | Spring Boot 백엔드: 건축물대장·건물에너지 매칭, 등급 추정 게이트 |
| `model/` | 아파트 에너지소요량 추정 모델(GradientBoosting) 학습 코드와 검증 보고 |
| `scripts/` | 공공데이터 수집 스크립트(법령, 지원사업, 가스 사용량 등) |

## 실행

```
# 백엔드 (기본 포트 8080)
cd beec
./mvnw spring-boot:run        # Windows: .\mvnw.cmd spring-boot:run

# 프론트엔드
npm install
npm run dev
```

## 환경변수 (`.env.local`, 저장소에 올리지 않습니다)

| 이름 | 용도 |
| --- | --- |
| `GEMINI_API_KEY` | AI 법규·지원 내비게이터, 리모델링 리포트 (없으면 규칙 기반 답으로 대체) |
| `GEMINI_MODEL` | 선택. 비우면 기본 모델 목록을 순서대로 시도 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY`, `KAKAO_REST_KEY` | 지도·주소 검색 |
| `NEXT_PUBLIC_API_BASE_URL`, `BEEC_API_BASE_URL` | 백엔드 주소 (기본 `http://localhost:8080`) |
| `BLDG_HUB_API_KEY`, `DATA_GO_KR_API_KEY` | 건축HUB·공공데이터포털 수집 스크립트 |
| `LAW_API_OC` | 국가법령정보 공동활용 API |

## 등급 추정 방식

- 건축물대장에 등급이 있으면 그대로 사용합니다.
- 서울 아파트는 GradientBoosting 모델로 추정하되, 시기별 검증 오차가 기준을 넘으면 추정하지 않습니다. 자세한 근거는 `model/README.md`를 보세요.
- 그 밖의 건물은 같은 용도·사용승인 시기·규모의 실제 인증 사례를 8건 이상 모을 수 있을 때만 범위를 보여줍니다.

## 배포

`DEPLOY.md`를 보세요. (백엔드 Render, 프론트 Vercel)
