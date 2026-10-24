/**
 * 법령이 아닌 공고·지침의 핵심 사실 — 검색형 AI 상담이 법령 조문과 같은 방식으로 인용한다.
 *
 * 숫자는 출처에 적힌 그대로만 쓴다. 공고가 바뀌면 이 파일만 고치면 된다.
 * 링크가 없는 사실은 넣지 않는다(근거 없는 숫자는 인용하지 않는다는 원칙).
 */
import type { LawChunk } from "@/src/lib/law-search";

const INTEREST_SUPPORT_URL = "https://v.daum.net/v/20260326043356184";
const PUBLIC_GR_GUIDE_URL =
  "https://www.greenremodeling.or.kr/upfile/content/2026%EB%85%84%20%EA%B3%B5%EA%B3%B5%EA%B1%B4%EC%B6%95%EB%AC%BC%20%EA%B7%B8%EB%A6%B0%EB%A6%AC%EB%AA%A8%EB%8D%B8%EB%A7%81%202.0%20%EC%A7%80%EC%9B%90%EC%82%AC%EC%97%85%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8.pdf";

export const POLICY_FACTS: LawChunk[] = [
  {
    id: "2026 민간 그린리모델링 이자지원|지원율",
    source: "2026 민간 그린리모델링 이자지원",
    kind: "공고",
    article: "지원율",
    title: "에너지 성능 개선률에 따른 이자지원율",
    chapter: null,
    effectiveDate: "20260317",
    text:
      "민간 그린리모델링 이자지원은 주거·비주거 건축물을 모두 대상으로 한다. 에너지 성능이 20% 이상 30% 미만 개선되면 일반 지원으로 이자의 4.5%를, 30% 이상 개선되거나 신혼부부·다자녀·고령자·차상위계층·국가유공자이면 우대 지원으로 5.5%를 지원한다.",
    url: INTEREST_SUPPORT_URL,
  },
  {
    id: "2026 민간 그린리모델링 이자지원|한도",
    source: "2026 민간 그린리모델링 이자지원",
    kind: "공고",
    article: "대출 한도",
    title: "건축물 유형별 대출 한도와 상환 기간",
    chapter: null,
    effectiveDate: "20260317",
    text:
      "대출 한도는 공동주택 3,000만원, 단독주택 1억원, 비주거 건축물 200억원(종전 50억원에서 상향)이다. 상환 기간은 주거 최대 5년, 비주거 최대 10년(거치 3년 포함)이다. 단독주택은 간이평가표로 개선률을 판단할 수 있다.",
    url: INTEREST_SUPPORT_URL,
  },
  {
    id: "2026 민간 그린리모델링 이자지원|절차",
    source: "2026 민간 그린리모델링 이자지원",
    kind: "공고",
    article: "신청 절차",
    title: "신청부터 대출까지",
    chapter: null,
    effectiveDate: "20260317",
    text:
      "그린리모델링 창조센터에 온라인으로 신청해 사업확인서를 받고, 선정한 시공사로 공사를 마친 뒤 사업완료확인서를 받아 최종 대출을 받는다. 정부는 지원율만큼의 이자를 대출 은행에 직접 지급한다. 창조센터는 사전진단, 절감효과 분석, 개선방안 제시 등 무상 컨설팅을 제공한다.",
    url: INTEREST_SUPPORT_URL,
  },
  {
    id: "2026 공공건축물 그린리모델링 2.0|대상과 국비",
    source: "2026 공공건축물 그린리모델링 2.0",
    kind: "지침",
    article: "대상과 국비",
    title: "지원 대상 용도와 국비 지원 비율",
    chapter: null,
    effectiveDate: "2026",
    text:
      "도서관, 유치원, 평생교육시설, 노인복지시설 등 28개 지정 용도의 공공건축물 가운데 사용승인 후 10년 이상(2016년 1월 1일 이전 사용승인)인 건축물이 대상이다. 국비 지원 비율은 서울·중앙행정기관·공공기관 50%, 그 밖의 지방자치단체 70%이며 총사업비는 1,688억원이다.",
    url: PUBLIC_GR_GUIDE_URL,
  },
];
