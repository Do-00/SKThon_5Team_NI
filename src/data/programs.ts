/**
 * Government/public support programs for building energy efficiency
 * upgrades, shown to Eco Check users alongside their grade report.
 *
 * Sourced from the team's 2026-09-10 real-program research
 * (`support_programs.json`, 27 programs, national + 20 regions) rather than
 * placeholder fixtures — `RAW_PROGRAMS` below mirrors that file's shape so
 * it stays easy to diff against future research updates.
 */

/**
 * Applicant categories a program accepts. Mirrors `UserType` in
 * `src/data/account.ts` and `EcoActionUserType` in `src/data/actions.ts`
 * (kept as a separate local union, rather than a shared import, so these
 * fixture modules stay independent of each other).
 */
export type SupportProgramUserType = "owner" | "tenant" | "hoa" | "corporation" | "general";

/** Raw applicant tag from the source research — narrower than `SupportProgramUserType`; `"vulnerable"` isn't a tenancy status, so it's folded into `vulnerablePriority` instead. */
type RawTargetType = "owner" | "tenant" | "vulnerable";

export type SupportProgramCategory =
  | "insulation"
  | "window"
  | "boiler"
  | "solar"
  | "lighting"
  | "cooling"
  | "voucher"
  | "general"
  | "waterproofing"
  | "safety";

const CATEGORY_LABEL: Record<SupportProgramCategory, string> = {
  insulation: "단열",
  window: "창호",
  boiler: "보일러",
  solar: "태양광",
  lighting: "조명",
  cooling: "냉방",
  voucher: "바우처",
  general: "집수리",
  waterproofing: "방수",
  safety: "안전시설",
};

export interface SupportProgram {
  id: string;
  name: string;
  /** Operating agency, e.g. a ministry or public corporation. */
  provider: string;
  summary: string;
  /** Who the program is actually written for, e.g. "국민기초생활수급가구, 차상위계층...". */
  targetDesc: string;
  /** How to apply, e.g. "읍·면·동 주민센터 문의(지자체 추천 방식)". */
  applyMethod: string;
  /** Free-text support amount, e.g. `"가구당 평균 243만원(최대 약 330만원)"` — most of these programs don't reduce to one number. */
  amountLabel: string;
  /** Free-text application period, e.g. `"2026.3.3(화) ~ 3.27(금)"` or `"지자체 공고 참조"` — not a parseable date for most entries. */
  deadline: string;
  /** Topic tags for filtering, derived from `categories`. */
  tags: string[];
  /** Applicant categories eligible to apply, derived from the source's `target_types` (excluding `"vulnerable"`, see `vulnerablePriority`). */
  eligibleUserTypes: SupportProgramUserType[];
  /** True when the source's `target_types` included `"vulnerable"` — 국민기초생활수급자 등 취약계층을 우선하거나 전용으로 지원. */
  vulnerablePriority: boolean;
  /** Display region, e.g. `"전국"`, `"서울특별시"`, or `"경기도 용인·고양·평택..."`. */
  region: string;
  /**
   * Whether this program is matched/recommended for the current user's
   * primary building (see `src/data/account.ts` / `src/data/buildings.ts`,
   * `bld-001`: 공동주택, 5등급, 서울특별시 마포구, 소유주).
   */
  matched: boolean;
  /** Official program information/application URL. `null` when the source research didn't confirm one — the UI should point applicants to `applyMethod` instead of fabricating a link. */
  officialUrl: string | null;
  note: string | null;
}

interface RawProgram {
  id: string;
  scope: "national" | "regional";
  sido: string;
  sigungu: string | null;
  program_name: string;
  agency: string;
  target_types: RawTargetType[];
  categories: SupportProgramCategory[];
  target_desc: string;
  support_desc: string;
  amount_desc: string;
  period: string;
  apply_method: string;
  source_url: string | null;
  note: string | null;
}

const RAW_PROGRAMS: readonly RawProgram[] = [
  {
    id: "natl-green-interest-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "민간건축물 그린리모델링 이자지원사업",
    agency: "국토교통부 / 국토안전관리원(그린리모델링창조센터)",
    target_types: ["owner"],
    categories: ["insulation", "window", "general"],
    target_desc: "그린리모델링 공사를 하려는 건축물 소유자(주택 포함). 2026년 기준 고가주택 기준 공시가격 12억원 이하",
    support_desc: "에너지성능개선 공사비에 대한 저리 융자 이자지원. 2026년 협약은행에 경남은행·전북은행 추가",
    amount_desc: "이자지원율 기본 4.5%, 우대 조건 충족 시 최대 5.5% (2026년 기준, 국토교통부공고 제2026-876호)",
    period: "2026년 공고일부터 선착순 접수 (예산 약 80억원 소진 시 마감, 잔여 예산은 창조센터에서 확인)",
    apply_method: "그린리모델링창조센터(greenremodeling.or.kr) 온라인 신청, 협약은행 방문",
    source_url: "https://www.greenremodeling.or.kr/",
    note: "융자 상품이므로 신용/담보 심사 있음. 주거·비주거 모두 대상(공동주택 3,000만원, 단독주택 1억원, 비주거 200억원 한도). 2026.9 기준 실제 공고 내용으로 갱신함",
  },
  {
    id: "natl-public-green-remodeling-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "공공건축물 그린리모델링 2.0 지원사업",
    agency: "국토교통부 / 국토안전관리원(그린리모델링창조센터)",
    target_types: ["owner"],
    categories: ["insulation", "window", "general"],
    target_desc: "도서관·유치원·평생교육시설·노인복지시설 등 28개 지정 용도의 공공건축물 중 사용승인 10년 이상(2016.1.1 이전)",
    support_desc: "노후 공공건축물의 단열·창호·설비 개선 공사비 국비 지원. 지자체·공공기관이 신청",
    amount_desc: "국비 서울·중앙행정기관·공공기관 50%, 그 외 지자체 70% (2026년 총 1,688억원)",
    period: "2026년 공모 (지자체·공공기관 신청, 다음 공모는 창조센터 공지 확인)",
    apply_method: "소관 지자체·공공기관이 그린리모델링창조센터 공모에 신청",
    source_url: "https://www.greenremodeling.or.kr/",
    note: "개인이 아니라 시설을 관리하는 기관이 신청합니다. 2026년 공공건축물 그린리모델링 2.0 지원사업 가이드라인 기준",
  },
  {
    id: "natl-low-income-cooling-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "저소득층 에너지효율개선사업(냉방)",
    agency: "산업통상자원부 / 한국에너지재단",
    target_types: ["vulnerable"],
    categories: ["cooling"],
    target_desc: "국민기초생활수급가구, 차상위계층, 기초지자체 추천 에너지복지 사각지대 저소득가구",
    support_desc: "7평형 벽걸이 에어컨 1대 지원(냉방), 심사 후 지원 여부 결정",
    amount_desc: "약 1.9만 가구 지원",
    period: "2026.3.3(화)~3.27(금) 접수 마감 — 하반기 추가 모집 없음, 매년 3월경 재공고 예정",
    apply_method: "주민등록상 거주지 읍·면·동 주민센터 문의(지자체 추천 방식, 개인 직접신청 아님). 콜센터 1670-7653",
    source_url: "https://www.e-policy.or.kr/web/lay1/program/S1T9C14/curation/view.do?cr_seq=109",
    note: "2026.9 기준 올해 접수는 마감된 상태 (2026.9 확인)",
  },
  {
    id: "natl-low-income-heating-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "저소득층 에너지효율개선사업(난방)",
    agency: "산업통상자원부 / 한국에너지재단",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler"],
    target_desc: "국민기초생활수급가구, 차상위계층, 사회복지시설 등",
    support_desc: "벽체 단열보강, 창호 교체, 고효율 보일러 교체 등 난방효율 개선",
    amount_desc: "가구당 평균 243만원(최대 약 330만원), 시설당 최대 1,100만원",
    period: "2026.3.3(화) ~ 예산 소진 시까지",
    apply_method: "읍·면·동 주민센터 문의(지자체 추천 → 시공업체 방문조사 → 에너지재단 승인). 콜센터 1670-7653",
    source_url: "https://min24.energy.or.kr/consult/info/view3_3.do",
    note: "전국 공통사업, 약 3.7만 가구 지원 규모",
  },
  {
    id: "natl-energy-voucher-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "에너지바우처",
    agency: "산업통상자원부 / 한국에너지공단",
    target_types: ["vulnerable"],
    categories: ["voucher"],
    target_desc: "생계·의료·주거·교육급여 수급가구 중 노인(65세+)·영유아·장애인·임산부·중증희귀질환자·한부모·다자녀 등 세대원 포함",
    support_desc: "냉난방 에너지 구입비 바우처 지급",
    amount_desc: "1인 295,200원 / 2인 407,500원 / 3인 532,700원 / 4인이상 701,300원 (연간)",
    period: "신청 2026.6.15~12.31 / 사용 2026.7.1~2027.5.31",
    apply_method: "읍·면·동 행정복지센터(신분증 지참) 또는 복지로(bokjiro.go.kr) 온라인",
    source_url: "https://www.bokjiro.go.kr/",
    note: null,
  },
  {
    id: "natl-boiler-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "고효율 보일러 교체 지원",
    agency: "지자체별 운영(환경부/산업부 연계), 통합접수 에코스퀘어",
    target_types: ["vulnerable", "owner"],
    categories: ["boiler"],
    target_desc: "기초수급자·차상위계층 우선, 다자녀가구·사회복지시설, 지역에 따라 일반가구(예산 한정)",
    support_desc: "노후 저효율 보일러 → 친환경 고효율(콘덴싱 등) 보일러 교체. 단독주택용 개별보일러만 해당(중앙난방·지역난방 제외)",
    amount_desc: "기초수급·차상위 60~70만원 / 다자녀·사회복지시설 50~60만원 / 일반가구(지역한정) 약 10만원",
    period: "지자체 공고 직후 상시(예산 조기 소진 빈번)",
    apply_method: "에코스퀘어(ecosq.or.kr) 회원가입 → 신청서·자격서류 제출 → 지자체 승인 → 등록 시공업체 시공 → 정산",
    source_url: "https://ecosq.or.kr/",
    note: null,
  },
  {
    id: "natl-renewable-solar-2026",
    scope: "national",
    sido: "전국",
    sigungu: null,
    program_name: "재생에너지보급사업(주택지원-태양광 등)",
    agency: "기후에너지환경부 / 한국에너지공단 신·재생에너지센터(KNREC)",
    target_types: ["owner"],
    categories: ["solar"],
    target_desc: "주택 소유자(단독주택 중심, 지자체 공고에 따라 공동주택 포함)",
    support_desc: "태양광 등 신재생에너지 설비 설치비 일부 지원",
    amount_desc: "설비 종류·용량별 상이(지자체 공고 참조)",
    period: "연 1회 공고(통상 상반기) — 2026년 회차 마감, 2027년 상반기 재공고 예정",
    apply_method: "지자체 통해 신청, 신재생에너지센터(knrec.or.kr) 공고 확인",
    source_url: "https://www.knrec.or.kr/",
    note: null,
  },
  {
    id: "seoul-saebit-house-2026",
    scope: "regional",
    sido: "서울특별시",
    sigungu: null,
    program_name: "새빛주택 지원사업",
    agency: "서울시 저탄소건물지원센터",
    target_types: ["owner"],
    categories: ["window", "lighting"],
    target_desc: "사용승인 15년 이상, 공시가격 3억원 이하 주택 소유자(공공주택·무허가·법인소유 제외)",
    support_desc: "저효율 창호→단열창호 전체교체 또는 저효율 조명→LED 전체교체 시 공사비 지원",
    amount_desc: "단독주택 최대 500만원, 공동주택 최대 300만원 (저소득층 공사비 90%, 일반 70%)",
    period: "2026.2.9(월)~ 모집",
    apply_method: "건물에너지효율화지원시스템(brp.eseoul.go.kr) 온라인 또는 저탄소건물지원센터 방문",
    source_url: "https://news.seoul.go.kr/env/archives/567370",
    note: null,
  },
  {
    id: "seoul-safe-repair-2026",
    scope: "regional",
    sido: "서울특별시",
    sigungu: null,
    program_name: "안심 집수리 보조사업",
    agency: "서울시 · 각 자치구",
    target_types: ["vulnerable", "tenant"],
    categories: ["insulation", "window", "waterproofing", "safety"],
    target_desc: "10년 이상 저층주택 중 중위소득 100%이하 취약가구, 반지하주택, 20년 이상 주택성능개선지원구역, 양성화 옥탑방",
    support_desc: "창호·단열·난방·방수 및 편의시설(문턱제거·안전손잡이), 소방안전시설",
    amount_desc: "취약가구 최대 1,200만원(공사비 80%), 반지하 최대 600만원(50%), 성능개선구역/양성화옥탑방 최대 1,200만원",
    period: "2026.3.20(금)~3.27(금) 접수 마감 — 하반기 추가 모집 없음(2026.9 확인), 매년 초 재공고 예정",
    apply_method: "견적서·공사전 사진 포함 신청서를 관할 자치구에 제출",
    source_url: "https://jibsuri.seoul.go.kr/support/infoSbsd.do",
    note: "매년 신청기간이 일주일 남짓으로 짧으므로 다음 공고 시기를 미리 확인해두는 게 좋음",
  },
  {
    id: "gg-green-remodel-2026",
    scope: "regional",
    sido: "경기도",
    sigungu: "용인·고양·평택·파주·김포·하남·광명·이천·구리·여주·과천·가평·연천",
    program_name: "경기도 그린리모델링 지원사업",
    agency: "경기도 + 시·군 매칭 지원",
    target_types: ["owner"],
    categories: ["insulation", "window", "boiler", "lighting"],
    target_desc: "준공 10년 경과 단독주택·다세대연립. 기초생활수급자·차상위·한부모·다자녀·기초연금수급자 우선",
    support_desc: "고성능 창호, 고기밀 단열보강, 고효율 조명·보일러, 차열도료 등 (단열보강·창호교체 중 1개 이상 필수)",
    amount_desc: "가구당 최대 1,000만원(도 50%+시 50%)",
    period: "연 1회 공고(지자체별 상이)",
    apply_method: "대상 13개 시·군 건축부서 문의",
    source_url: "https://www.kyeonggi.com/article/20260107580090",
    note: "13개 시군 한정(총 85가구), 연차별 확대 가능",
  },
  {
    id: "gg-9programs-2026",
    scope: "regional",
    sido: "경기도",
    sigungu: null,
    program_name: "소규모 노후주택 집수리 등 9개 통합사업",
    agency: "경기도",
    target_types: ["owner", "tenant", "vulnerable"],
    categories: ["general", "window", "boiler", "solar", "safety"],
    target_desc: "노후 단독·공동주택 소유자/거주자 (사업별 상이: 장애인, 어르신, 다자녀 등)",
    support_desc:
      "①소규모 노후주택 집수리 ②햇살하우징(창호·보일러) ③G-하우징(화장실·부엌) ④장애인주택개조 ⑤어르신 안전하우징 ⑥석면슬레이트 지붕처리 ⑦주택용 태양광(3kW) ⑧농어촌주택개량(융자) ⑨노후 수도관 개량",
    amount_desc: "공용부 최대 1,600만원, 세대내부 최대 500만원(사업별 상이)",
    period: "2026년부터 9개 사업 통합 일괄 신청",
    apply_method: "관할 시·군 주택·건축 부서(2026년부터 통합접수 창구 운영)",
    source_url: "https://www.onews.tv/news/articleView.html?idxno=252206",
    note: "9개 사업 중 다수가 창호·단열·보일러 등 에너지효율 관련",
  },
  {
    id: "ic-vulnerable-repair-2026",
    scope: "regional",
    sido: "인천광역시",
    sigungu: null,
    program_name: "주거취약계층 집수리 지원사업",
    agency: "인천광역시 주택정책과",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "safety", "general"],
    target_desc: "노후주택 거주 중위소득 75% 이하 저소득층 및 고령자",
    support_desc: "①희망의 집수리(10가구): 도배·장판·단열보강·창호 및 설비개선 등 전반적 개선 ②고령자 맞춤형 집수리(57가구): 안전손잡이·미끄럼방지 바닥재·문턱제거 등",
    amount_desc: "지원금액 미공개(소규모 67가구 내외)",
    period: "2026년도 접수(4월 추천 → 6월 착수) 마감 — 매년 초 재공고 예정",
    apply_method: "군·구 통해 대상자 추천(개인 직접신청 아님). 주택정책과 032-440-4742, 광역주거복지센터 032-260-5653",
    source_url: "https://www.incheon.go.kr/",
    note: null,
  },
  {
    id: "ic-junggu-energy-2026",
    scope: "regional",
    sido: "인천광역시",
    sigungu: "중구",
    program_name: "저소득층 에너지 효율 개선 사업",
    agency: "인천 중구",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler"],
    target_desc: "저소득층 가구",
    support_desc: "냉난방 효율개선(단열·창호·보일러 등, 국가 공통사업 연계 시행)",
    amount_desc: "국가 공통사업 기준 준용",
    period: "지자체 공고 참조",
    apply_method: "중구청 문의",
    source_url: "https://news.skbroadband.com/news/articleView.html?idxno=219321",
    note: "국가 저소득층 에너지효율개선사업의 지역 시행 사례",
  },
  {
    id: "busan-energy-diag-2026",
    scope: "regional",
    sido: "부산광역시",
    sigungu: null,
    program_name: "에너지진단 및 시설개선(고효율 설비교체 등) 지원사업",
    agency: "부산광역시",
    target_types: ["owner"],
    categories: ["general"],
    target_desc: "부산시 소재 건축물·시설 소유자(세부 대상은 연도별 공고 참조)",
    support_desc: "에너지진단 실시 및 진단결과에 따른 고효율 설비교체 등 시설개선 비용 지원",
    amount_desc: "공고문 참조",
    period: "2026년 공고(참여안내)",
    apply_method: "부산시 공고문 참조 후 신청",
    source_url: "https://www.busan.go.kr/",
    note: "주택 특화 여부 세부 확인 필요",
  },
  {
    id: "daegu-seogu-energy-2026",
    scope: "regional",
    sido: "대구광역시",
    sigungu: "서구",
    program_name: "취약계층 에너지 효율 개선(난방비 부담 완화)",
    agency: "대구 서구",
    target_types: ["vulnerable"],
    categories: ["insulation", "window"],
    target_desc: "취약계층 252가구",
    support_desc: "단열·창호 등 개선을 통한 난방비 절감 지원",
    amount_desc: "공고 참조",
    period: "지자체 공고 참조",
    apply_method: "서구청 문의",
    source_url: "https://www.kyongbuk.co.kr/news/articleView.html?idxno=4081571",
    note: "국가 공통사업의 지역 시행 사례",
  },
  {
    id: "ulsan-namgu-energy-2026",
    scope: "regional",
    sido: "울산광역시",
    sigungu: "남구",
    program_name: "저소득층 에너지효율개선사업 모집",
    agency: "울산 남구 동 행정복지센터",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler"],
    target_desc: "저소득층(국가기준과 동일)",
    support_desc: "단열·창호·보일러 등 난방효율 개선(국가사업 지역 시행)",
    amount_desc: "국가 공통사업 기준 준용",
    period: "2026년 모집",
    apply_method: "관할 동 행정복지센터",
    source_url: "https://www.ulsannamgu.go.kr/",
    note: null,
  },
  {
    id: "gwangju-small-repair-2026",
    scope: "regional",
    sido: "광주광역시",
    sigungu: null,
    program_name: "소규모 노후주택 집수리 지원사업",
    agency: "광주광역시",
    target_types: ["owner", "tenant"],
    categories: ["general", "insulation"],
    target_desc: "노후 소규모 주택 소유자/거주자(세부 자격은 공고 참조)",
    support_desc: "주택 노후도 개선을 위한 집수리(도배·장판·단열·설비 등)",
    amount_desc: "공고 참조",
    period: "지자체 공고 참조",
    apply_method: "광주시 도시재생 부서 또는 자치구 문의",
    source_url: "https://www.gjcity.go.kr/",
    note: "세부 지원금액 미확인",
  },
  {
    id: "gwangju-donggu-pilot-2026",
    scope: "regional",
    sido: "광주광역시",
    sigungu: "동구",
    program_name: "노후주택 집수리 시범사업",
    agency: "광주 동구",
    target_types: ["owner", "tenant"],
    categories: ["general"],
    target_desc: "동구 관내 노후주택 거주자",
    support_desc: "주거복지 향상을 위한 노후주택 집수리 시범 실시",
    amount_desc: "공고 참조",
    period: "지자체 공고 참조",
    apply_method: "동구청 문의",
    source_url: "https://www.seoul.co.kr/news/society/2026/02/27/20260227500094",
    note: "주거복지 모델 시범사업, 확대 가능성",
  },
  {
    id: "daejeon-junggu-newvillage-2026",
    scope: "regional",
    sido: "대전광역시",
    sigungu: "중구(대흥지구 뉴:빌리지)",
    program_name: "노후주택 집수리 지원사업",
    agency: "대전 중구청 도시재생과",
    target_types: ["owner"],
    categories: ["general"],
    target_desc: "대흥지구 뉴:빌리지 사업구역 내 준공 20년 경과 2층 이하 단독주택(총 40호)",
    support_desc: "노후주택 개보수 공사비 지원. 임대인-임차인 4년 임차보장·임차료 동결 합의 시 자부담 경감",
    amount_desc: "호당 최대 1,441만원(기본 자부담 10%, 임대차 합의시 자부담 5%)",
    period: "2026.9.7(월)~9.11(금) 방문접수 마감 — 추가 모집은 구청 공고 확인",
    apply_method: "중구청 도시재생과 방문접수",
    source_url: "https://www.sisajournal.com/news/articleView.html?idxno=384472",
    note: "특정 재생사업구역 한정, 전역 적용 아님",
  },
  {
    id: "sejong-national-baseline-2026",
    scope: "regional",
    sido: "세종특별자치시",
    sigungu: null,
    program_name: "저소득층 에너지효율개선사업 등 국가 공통사업(지역 창구)",
    agency: "세종시종합주거복지센터 등",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "냉난방효율개선 등(세종시 특화 그린리모델링 전용사업은 이번 조사에서 미확인)",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "세종시종합주거복지센터(sjhome.or.kr) 또는 행정복지센터",
    source_url: "https://sjhome.or.kr/",
    note: "시 자체 전용사업 미확인, 국가 공통사업으로 커버",
  },
  {
    id: "gangwon-national-baseline-2026",
    scope: "regional",
    sido: "강원특별자치도",
    sigungu: null,
    program_name: "국가 공통사업 준용(지역 창구)",
    agency: "강원특별자치도 및 시·군",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처, 보일러교체 지원 등",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: null,
    note: "도 자체 전용사업 미확인, 시·군별 개별 공고 확인 필요",
  },
  {
    id: "chungbuk-national-baseline-2026",
    scope: "regional",
    sido: "충청북도",
    sigungu: null,
    program_name: "국가 공통사업 준용(지역 창구)",
    agency: "충청북도 및 시·군",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처 등",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: null,
    note: "도 자체 전용사업 미확인, 시·군별 개별 공고 확인 필요",
  },
  {
    id: "chungnam-renewable-2026",
    scope: "regional",
    sido: "충청남도",
    sigungu: null,
    program_name: "신재생에너지 보급사업 + 국가 공통사업",
    agency: "충청남도",
    target_types: ["owner", "vulnerable"],
    categories: ["solar", "insulation", "window", "boiler"],
    target_desc: "주택 소유자(신재생 설비 설치 희망자) / 저소득층(국가사업)",
    support_desc: "태양광 등 신재생에너지 설비 설치비 지원 + 저소득층 에너지효율개선",
    amount_desc: "공고 참조",
    period: "연 1회 공고",
    apply_method: "충청남도 누리집 공고 확인 후 신청",
    source_url: "https://www.chungnam.go.kr/",
    note: "그린리모델링 전용 융자·보조사업은 이번 조사에서 미확인",
  },
  {
    id: "jeonbuk-national-baseline-2026",
    scope: "regional",
    sido: "전라북도",
    sigungu: null,
    program_name: "국가 공통사업 준용(전북은행 이자지원 협약 신규 참여)",
    agency: "전라북도 및 시·군",
    target_types: ["vulnerable", "owner"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처 등. 2026년 그린리모델링 이자지원사업 협약은행에 전북은행 신규 참여",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: "https://www.jjmagazin.com/news/articleView.html?idxno=56842",
    note: null,
  },
  {
    id: "jeonnam-national-baseline-2026",
    scope: "regional",
    sido: "전라남도",
    sigungu: null,
    program_name: "국가 공통사업 준용(지역 창구)",
    agency: "전라남도 및 시·군",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처 등",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: null,
    note: "도 자체 전용사업 미확인, 시·군별 개별 공고 확인 필요",
  },
  {
    id: "gyeongbuk-national-baseline-2026",
    scope: "regional",
    sido: "경상북도",
    sigungu: null,
    program_name: "국가 공통사업 준용(지역 창구)",
    agency: "경상북도 및 시·군",
    target_types: ["vulnerable"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처 등",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: null,
    note: "도 자체 전용사업 미확인, 시·군별 개별 공고 확인 필요",
  },
  {
    id: "gyeongnam-national-baseline-2026",
    scope: "regional",
    sido: "경상남도",
    sigungu: null,
    program_name: "국가 공통사업 준용(경남은행 이자지원 협약 신규 참여)",
    agency: "경상남도 및 시·군",
    target_types: ["vulnerable", "owner"],
    categories: ["insulation", "window", "boiler", "voucher"],
    target_desc: "국가기준과 동일",
    support_desc: "저소득층 에너지효율개선, 에너지바우처 등. 2026년 그린리모델링 이자지원사업 협약은행에 경남은행 신규 참여",
    amount_desc: "국가사업 기준 준용",
    period: "국가사업 일정 준용",
    apply_method: "관할 시·군 행정복지센터",
    source_url: "https://www.jjmagazin.com/news/articleView.html?idxno=56842",
    note: "도 자체 전용사업 미확인",
  },
  {
    id: "jeju-carbon-remodel-2026",
    scope: "regional",
    sido: "제주특별자치도",
    sigungu: null,
    program_name: "노후주택 그린리모델링(탄소감축 리모델링) 지원사업",
    agency: "제주특별자치도 건축경관과",
    target_types: ["owner"],
    categories: ["insulation", "window"],
    target_desc: "준공 15년 이상 단독주택·다세대연립. 1순위 기초수급·차상위·한부모, 2순위 다자녀(3명+)·기초연금수급자, 3순위 일반가구",
    support_desc: "단열보강 또는 창호교체 중 1개 이상 필수 포함한 공사비 지원",
    amount_desc: "가구당 최대 1,000만원(공사비 50% 이내)",
    period: "2026.1.19(월)~2.6(금) 접수 마감 — 매년 초 재공고 예정",
    apply_method: "제주도 건축경관과 접수(제주도 누리집 공고 참조)",
    source_url: "https://www.seoul.co.kr/news/society/enviroment/2026/01/09/20260109500043",
    note: "매년 공사비 지원 확대 추세. 2026년도분은 마감",
  },
];

/** 실제 데모 계정 기준: `src/data/account.ts`의 유일한 사용자는 서울 마포구 소유주(bld-001)다. */
const DEMO_SIDO = "서울특별시";
const DEMO_USER_TYPE: SupportProgramUserType = "owner";

function toEligibleUserTypes(targetTypes: readonly RawTargetType[]): SupportProgramUserType[] {
  const explicit = targetTypes.filter((type): type is "owner" | "tenant" => type !== "vulnerable");
  // "vulnerable" alone isn't a tenancy status — a low-income household can be
  // either an owner or a tenant, so a program that only names "vulnerable"
  // stays open to both rather than disappearing from either filter.
  return explicit.length > 0 ? explicit : ["owner", "tenant"];
}

function toRegionLabel(sido: string, sigungu: string | null): string {
  if (sido === "전국") return "전국";
  return sigungu ? `${sido} ${sigungu}` : sido;
}

function toTags(categories: readonly SupportProgramCategory[]): string[] {
  return categories.map((category) => CATEGORY_LABEL[category]);
}

function isMatchedForDemo(scope: RawProgram["scope"], sido: string, eligibleUserTypes: SupportProgramUserType[]): boolean {
  return (scope === "national" || sido === DEMO_SIDO) && eligibleUserTypes.includes(DEMO_USER_TYPE);
}

function toSupportProgram(raw: RawProgram): SupportProgram {
  const eligibleUserTypes = toEligibleUserTypes(raw.target_types);

  return {
    id: raw.id,
    name: raw.program_name,
    provider: raw.agency,
    summary: raw.support_desc,
    targetDesc: raw.target_desc,
    applyMethod: raw.apply_method,
    amountLabel: raw.amount_desc,
    deadline: raw.period,
    tags: toTags(raw.categories),
    eligibleUserTypes,
    vulnerablePriority: raw.target_types.includes("vulnerable"),
    region: toRegionLabel(raw.sido, raw.sigungu),
    matched: isMatchedForDemo(raw.scope, raw.sido, eligibleUserTypes),
    officialUrl: raw.source_url,
    note: raw.note,
  };
}

const SUPPORT_PROGRAMS: readonly SupportProgram[] = RAW_PROGRAMS.map(toSupportProgram);

/** 검색형 AI 상담의 색인용 — 서버에서 동기로 한 번 읽는다. */
export function listSupportProgramsSync(): readonly SupportProgram[] {
  return SUPPORT_PROGRAMS;
}

/** Returns every active support program. */
export async function getSupportPrograms(): Promise<SupportProgram[]> {
  return [...SUPPORT_PROGRAMS];
}

/** Returns a single support program by id, if it exists. */
export async function getSupportProgramById(id: string): Promise<SupportProgram | undefined> {
  return SUPPORT_PROGRAMS.find((program) => program.id === id);
}
