import { readFileSync } from "node:fs";
import path from "node:path";
import type { GradeCode } from "@/src/data/grades";
import type { ParcelKey } from "@/src/lib/building-id";

/**
 * 전체 건축물 성적표의 서버 쪽 — 건물 찾기와 등급 판단.
 *
 * 건물 찾기 (주소 → 건축물대장 표제부)
 *  1. 시범 3개 동은 미리 받아 둔 표제부 + 도시가스 사용량을 쓴다 (src/data/pilot-buildings.json).
 *     발표장 네트워크와 상관없이 동작하고, 실제 사용량 비교까지 보여 줄 수 있다.
 *  2. 그 밖의 전국 주소는 국토교통부 건축HUB 건축물대장 API 를 바로 부른다 (BLDG_HUB_API_KEY).
 *
 * 등급 판단 (아파트 성적표와 같은 원칙: 말할 수 있는 만큼만)
 *  1. 건축물대장에 에너지효율등급이 적혀 있으면 → 인증 등급 그대로.
 *  2. 없으면 전국 인증현황 39,063건에서 "같은 용도 · 같은 시기(±3년) · 비슷한 규모" 인증 건물을 찾는다.
 *     8곳 이상이면 그 등급 분포의 가운데 50%(25~75%)를 범위로 보여 준다.
 *  3. 비교할 인증 건물이 8곳 미만이면 등급을 말하지 않는다 (추정 보류).
 *     노후 건물 대부분이 여기에 해당한다 — 인증 제도가 생기기 전에 지어졌기 때문이다.
 */

const GRADES: GradeCode[] = ["1+++", "1++", "1+", "1", "2", "3", "4", "5", "6", "7"];
const MIN_PEERS = 8;
const YEAR_WINDOW = 3;

/** 주거용 / 주거용 이외 등급 기준표의 경계 (kWh/m²·yr) — beec GradeTable 과 같은 값. */
const RESIDENTIAL_BOUNDS = [60, 90, 120, 150, 190, 230, 270, 320, 370];
const NON_RESIDENTIAL_BOUNDS = [80, 140, 200, 260, 320, 380, 450, 520, 610];

export interface GasUsage {
  /** 1~6월 도시가스 사용량 ÷ 필지 연면적, kWh/㎡ */
  intensity: number;
  /** 같은 동 · 같은 용도군 안에서의 백분위 (0 = 가장 적게 씀, 100 = 가장 많이 씀). 비교군이 10곳 미만이면 null. */
  percentile: number | null;
  peerCount: number | null;
  peerMedian: number | null;
  /** 1~6월 월별 사용량, kWh (필지 전체) */
  months: number[];
}

export interface ElectricUsage {
  /** 1년 전기 사용량 ÷ 필지 연면적, kWh/㎡·yr */
  annual: number;
  year: string;
  percentile: number | null;
  peerCount: number | null;
  peerMedian: number | null;
  /** 1~12월 월별 사용량, kWh (필지 전체) */
  months: number[];
}

export interface BuildingFacts {
  pk: string;
  jibunAddress: string;
  roadAddress: string | null;
  name: string | null;
  dongName: string | null;
  /** 건축물대장 주용도, 예: "제2종근린생활시설" */
  use: string;
  /** 비교용 용도군, 예: "근린생활시설", "아파트" */
  group: string;
  area: number;
  year: number | null;
  structure: string | null;
  floors: number;
  underFloors: number;
  households: number;
  /** 건축물대장에 적힌 에너지효율등급. 없으면 null. */
  certifiedGrade: GradeCode | null;
  gas: GasUsage | null;
  electric: ElectricUsage | null;
  /** 같은 해 전기 + 가스 1년치가 모두 있을 때만, kWh/㎡·yr */
  totalAnnual: number | null;
  /** 건물 유형별·규모별 에너지 등급 평가 기준(A~E). 총사용량이 있고 기준표 대상(비주거 3,000㎡ 이상)일 때만. */
  usageGrade: "A" | "B" | "C" | "D" | "E" | null;
  dataSource: "pilot" | "api";
}

export interface PeerJudgement {
  policy: "certified" | "range" | "refuse";
  gradeBest: GradeCode | null;
  gradeWorst: GradeCode | null;
  /** 비교한 인증 건물 수 */
  peerCount: number;
  /** 비교 범위를 사람이 읽을 말로, 예: "서울 · 업무시설 · 2015~2021년 인증 · 3,000~10,000㎡" */
  scope: string | null;
  reason: string | null;
  /** 범위의 나쁜 쪽 등급 구간 가운데값 — 비용·개선 시뮬레이션의 기준값으로 쓴다(보수적). */
  baseEnergy: number | null;
  isResidential: boolean;
}

// ─── 데이터 파일 ─────────────────────────────────────────────────────────────

interface PilotFile {
  source: { title: string; usage: string };
  months: string[];
  columns: string[];
  dongs: Record<string, { name: string; buildings: number; withUsage: number; old30: number; certified: number; rows: unknown[][] }>;
}

interface CertFile {
  source: string;
  columns: string[];
  rows: [string, string, number, number, number, number, number][];
  stats: { total: number };
}

let pilotCache: PilotFile | null | undefined;
let certCache: CertFile | null | undefined;

function readJson<T>(name: string): T | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", name), "utf8")) as T;
  } catch {
    return null;
  }
}

const pilot = () => (pilotCache === undefined ? (pilotCache = readJson<PilotFile>("pilot-buildings.json")) : pilotCache);
const certs = () => (certCache === undefined ? (certCache = readJson<CertFile>("cert-records.json")) : certCache);

export function pilotSummary() {
  const file = pilot();
  if (!file) return null;
  return {
    source: file.source,
    dongs: Object.entries(file.dongs).map(([code, d]) => ({
      code,
      name: d.name,
      buildings: d.buildings,
      withUsage: d.withUsage,
      old30: d.old30,
      certified: d.certified,
    })),
  };
}

/** 서비스 소개 화면용 — 비교에 쓰는 전국 인증현황 규모. */
export function certSummary() {
  const file = certs();
  if (!file) return null;
  const residential = file.rows.filter((r) => r[5] === 1).length;
  return { source: file.source, total: file.rows.length, residential, nonResidential: file.rows.length - residential };
}

// ─── 용도 정리 ───────────────────────────────────────────────────────────────

/** 건축물대장 주용도 → 인증현황과 같은 이름의 용도군. 인증현황은 띄어쓰기가 있어 공백을 지우고 비교한다. */
export function useGroupOf(use: string, etcUse?: string | null): string {
  const u = use.replace(/\s+/g, "");
  if (u === "공동주택") return etcUse && etcUse.includes("아파트") ? "아파트" : "공동주택(연립·다세대)";
  if (u === "단독주택") return "단독주택";
  if (u.includes("근린생활")) return "근린생활시설";
  return u;
}

/** 인증현황 비교용 용도 키 — 아파트·연립·다세대는 인증현황에서 모두 "공동주택" 이다. */
function certUseKey(group: string): string {
  return group === "아파트" || group.startsWith("공동주택") ? "공동주택" : group.replace(/\s+/g, "");
}

const isResidentialGroup = (group: string) => group === "아파트" || group.startsWith("공동주택") || group === "단독주택";

const SIDO_SHORT: [RegExp, string[]][] = [
  [/^서울/, ["서울"]],
  [/^경기/, ["경기"]],
  [/^인천/, ["인천"]],
  [/^부산/, ["부산"]],
  [/^대구/, ["대구"]],
  [/^전남광주|^광주전남/, ["광주", "전남"]],
  [/^광주/, ["광주"]],
  [/^대전/, ["대전"]],
  [/^울산/, ["울산"]],
  [/^세종/, ["세종"]],
  [/^강원/, ["강원"]],
  [/^충청북|^충북/, ["충북"]],
  [/^충청남|^충남/, ["충남"]],
  [/^전라북|^전북/, ["전북"]],
  [/^전라남|^전남/, ["전남"]],
  [/^경상북|^경북/, ["경북"]],
  [/^경상남|^경남/, ["경남"]],
  [/^제주/, ["제주"]],
];

/** 주소 첫 낱말(시·도) → 인증현황의 지역 이름들. */
export function sidoKeys(address: string): string[] {
  const first = address.trim().split(/\s+/)[0] ?? "";
  return SIDO_SHORT.find(([re]) => re.test(first))?.[1] ?? [];
}

function sizeBand(area: number): [number, number] {
  if (area < 1000) return [0, 1000];
  if (area < 3000) return [1000, 3000];
  if (area < 10000) return [3000, 10000];
  return [10000, Infinity];
}

const fmtArea = (n: number) => n.toLocaleString("ko-KR");

// ─── 건물 찾기 ───────────────────────────────────────────────────────────────

function toGrade(raw: unknown): GradeCode | null {
  const s = String(raw ?? "").replace("등급", "").trim();
  return (GRADES as string[]).includes(s) ? (s as GradeCode) : null;
}

function fromPilotRow(cols: string[], row: unknown[], dongName: string): BuildingFacts {
  const get = (c: string) => row[cols.indexOf(c)] ?? null;
  const bun = Number(get("bun"));
  const ji = Number(get("ji"));
  const gas = get("gas") as number | null;
  const elec = get("elec") as number | null;
  const road = get("road") as string | null;
  const sggPrefix = dongName.split(" ").slice(0, 2).join(" ");
  return {
    pk: String(get("pk")),
    jibunAddress: `${dongName} ${Number(get("pg")) === 1 ? "산 " : ""}${bun}${ji ? `-${ji}` : ""}`,
    roadAddress: road ? `${sggPrefix} ${road}` : null,
    name: get("name") as string | null,
    dongName: get("dong") as string | null,
    use: String(get("use") ?? "용도 미상"),
    group: String(get("grp") ?? get("use") ?? ""),
    area: Number(get("area") ?? 0),
    year: (get("year") as number | null) ?? null,
    structure: get("struct") as string | null,
    floors: Number(get("floors") ?? 0),
    underFloors: Number(get("under") ?? 0),
    households: Number(get("hh") ?? 0),
    certifiedGrade: toGrade(get("grade")),
    gas:
      gas === null
        ? null
        : {
            intensity: gas,
            percentile: (get("gasPct") as number | null) ?? null,
            peerCount: (get("gasPeerN") as number | null) ?? null,
            peerMedian: (get("gasPeerMedian") as number | null) ?? null,
            months: (get("gasMonths") as number[] | null) ?? [],
          },
    electric:
      elec === null
        ? null
        : {
            annual: elec,
            year: String(get("elecYear") ?? ""),
            percentile: (get("elecPct") as number | null) ?? null,
            peerCount: (get("elecPeerN") as number | null) ?? null,
            peerMedian: (get("elecPeerMedian") as number | null) ?? null,
            months: (get("elecMonths") as number[] | null) ?? [],
          },
    totalAnnual: (get("total") as number | null) ?? null,
    usageGrade: (get("usageGrade") as BuildingFacts["usageGrade"]) ?? null,
    dataSource: "pilot",
  };
}

function findInPilot(key: ParcelKey): BuildingFacts[] | null {
  const file = pilot();
  const dong = file?.dongs[`${key.sigunguCd}${key.bjdongCd}`];
  if (!file || !dong) return null;
  const pg = Number(key.platGbCd);
  const bun = Number(key.bun);
  const ji = Number(key.ji);
  const cols = file.columns;
  return dong.rows
    .filter((r) => r[cols.indexOf("pg")] === pg && r[cols.indexOf("bun")] === bun && r[cols.indexOf("ji")] === ji)
    .map((r) => fromPilotRow(cols, r, dong.name));
}

const HUB_ENDPOINT = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";

/** 건축HUB 표제부 API. 키가 없거나 실패하면 null. 공공데이터포털 키는 인코딩·디코딩 두 형태가 있어 둘 다 받는다. */
async function fetchFromHub(key: ParcelKey): Promise<BuildingFacts[] | null> {
  const apiKey = process.env.BLDG_HUB_API_KEY ?? process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) return null;
  const serviceKey = apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
  const qs = new URLSearchParams({
    sigunguCd: key.sigunguCd,
    bjdongCd: key.bjdongCd,
    platGbCd: key.platGbCd,
    bun: key.bun,
    ji: key.ji,
    numOfRows: "100",
    pageNo: "1",
    _type: "json",
  });
  try {
    const res = await fetch(`${HUB_ENDPOINT}?serviceKey=${serviceKey}&${qs}`, {
      signal: AbortSignal.timeout(8000),
      // 건축물대장은 자주 바뀌지 않는다 — 하루 동안 같은 응답을 쓴다.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.response?.body?.items?.item;
    const items: Record<string, unknown>[] = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    return items
      .filter((it) => String(it.mainAtchGbCd ?? "0") === "0")
      .map((it) => {
        const str = (v: unknown) => {
          const s = String(v ?? "").trim();
          return s ? s : null;
        };
        const use = str(it.mainPurpsCdNm) ?? "용도 미상";
        const approval = str(it.useAprDay);
        return {
          pk: String(it.mgmBldrgstPk ?? ""),
          jibunAddress: (str(it.platPlc) ?? "").replace(/번지$/, ""),
          roadAddress: str(it.newPlatPlc),
          name: str(it.bldNm),
          dongName: str(it.dongNm),
          use,
          group: useGroupOf(use, str(it.etcPurps)),
          area: Number(it.totArea) || Number(it.vlRatEstmTotArea) || 0,
          year: approval && /^\d{4}/.test(approval) ? Number(approval.slice(0, 4)) : null,
          structure: str(it.strctCdNm),
          floors: Number(it.grndFlrCnt) || 0,
          underFloors: Number(it.ugrndFlrCnt) || 0,
          households: Number(it.hhldCnt) || 0,
          certifiedGrade: toGrade(it.engrGrade),
          gas: null,
          electric: null,
          totalAnnual: null,
          usageGrade: null,
          dataSource: "api" as const,
        };
      });
  } catch {
    return null;
  }
}

/** 필지의 주건축물들. 시범 동이면 미리 받은 데이터, 아니면 건축HUB API. 못 찾으면 빈 배열. */
export async function findBuildings(key: ParcelKey): Promise<BuildingFacts[]> {
  return findInPilot(key) ?? (await fetchFromHub(key)) ?? [];
}

/** 같은 필지에 여러 동이 있으면 PK 로 고르고, 없으면 연면적이 가장 큰 건물을 대표로 쓴다. */
export function pickBuilding(list: BuildingFacts[], pk?: string): BuildingFacts | null {
  if (list.length === 0) return null;
  if (pk) {
    const hit = list.find((b) => b.pk === pk);
    if (hit) return hit;
  }
  return [...list].sort((a, b) => b.area - a.area)[0];
}

// ─── 등급 판단 ───────────────────────────────────────────────────────────────

function bandMiddle(grade: GradeCode, residential: boolean): number {
  const bounds = residential ? RESIDENTIAL_BOUNDS : NON_RESIDENTIAL_BOUNDS;
  const i = GRADES.indexOf(grade);
  const lo = i === 0 ? 0 : bounds[i - 1];
  const hi = i < bounds.length ? bounds[i] : bounds[bounds.length - 1] + 60;
  return Math.round(((lo + hi) / 2) * 10) / 10;
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1) + 0.5))];

export function judgeGrade(b: BuildingFacts): PeerJudgement {
  const residential = isResidentialGroup(b.group);
  const base = { isResidential: residential };

  if (b.certifiedGrade) {
    return {
      ...base,
      policy: "certified",
      gradeBest: b.certifiedGrade,
      gradeWorst: b.certifiedGrade,
      peerCount: 0,
      scope: null,
      reason: null,
      baseEnergy: bandMiddle(b.certifiedGrade, residential),
    };
  }

  const refuse = (reason: string, peerCount = 0): PeerJudgement => ({
    ...base,
    policy: "refuse",
    gradeBest: null,
    gradeWorst: null,
    peerCount,
    scope: null,
    reason,
    baseEnergy: null,
  });

  const file = certs();
  if (!file) return refuse("인증 비교 데이터를 불러오지 못했습니다");
  if (b.year === null) return refuse("건축물대장에 사용승인일이 없어 같은 시기 건물과 비교할 수 없습니다");

  const useKey = certUseKey(b.group);
  const sidos = sidoKeys(b.jibunAddress || b.roadAddress || "");
  const [minArea, maxArea] = sizeBand(b.area);
  const inYears = (y: number) => Math.abs(y - (b.year as number)) <= YEAR_WINDOW;

  // 좁은 비교군부터 시도하고, 표본이 모자랄 때만 넓힌다 (규모 → 지역 순).
  const ladder: { label: string; test: (r: CertFile["rows"][number]) => boolean }[] = [
    {
      label: `${sidos.join("·") || "지역 미상"} · ${b.group} · ${b.year - YEAR_WINDOW}~${b.year + YEAR_WINDOW}년 인증 · ${fmtArea(minArea)}~${Number.isFinite(maxArea) ? `${fmtArea(maxArea)}㎡` : "㎡ 이상"}`,
      test: (r) => r[0] === useKey && sidos.includes(r[1]) && inYears(r[2]) && r[3] >= minArea && r[3] < maxArea,
    },
    {
      label: `${sidos.join("·") || "지역 미상"} · ${b.group} · ${b.year - YEAR_WINDOW}~${b.year + YEAR_WINDOW}년 인증`,
      test: (r) => r[0] === useKey && sidos.includes(r[1]) && inYears(r[2]),
    },
    {
      label: `전국 · ${b.group} · ${b.year - YEAR_WINDOW}~${b.year + YEAR_WINDOW}년 인증`,
      test: (r) => r[0] === useKey && inYears(r[2]),
    },
  ];

  let best = 0;
  for (const step of ladder) {
    const grades = file.rows.filter(step.test).map((r) => r[4]).sort((x, y) => x - y);
    best = Math.max(best, grades.length);
    if (grades.length < MIN_PEERS) continue;
    const lo = GRADES[quantile(grades, 0.25)];
    const hi = GRADES[quantile(grades, 0.75)];
    return {
      ...base,
      policy: "range",
      gradeBest: lo,
      gradeWorst: hi,
      peerCount: grades.length,
      scope: step.label,
      reason: null,
      baseEnergy: bandMiddle(hi, residential),
    };
  }

  const reason =
    b.year < 2010
      ? `${b.year}년에 지어진 ${b.group}은 비교할 인증 사례가 ${best}곳뿐입니다. 인증 제도가 자리 잡기 전에 지어진 건물이라, 등급을 말하면 틀릴 수 있어 추정하지 않습니다.`
      : `같은 용도·시기의 인증 건물이 ${best}곳뿐이라(기준 ${MIN_PEERS}곳) 등급을 추정하지 않습니다.`;
  return refuse(reason, best);
}

/** 등급 대신 말할 수 있는 확인된 사실 — 추정 보류일 때 화면에 보여 준다. */
export function factsWeCanSay(b: BuildingFacts): string[] {
  const points: string[] = [];
  if (b.year !== null) {
    const age = new Date().getFullYear() - b.year;
    points.push(`${b.year}년 사용승인, ${age}년 된 건물입니다${age >= 30 ? " (30년 이상 노후 건축물)" : ""}.`);
    if (b.year < 1980) points.push("건축물 단열 기준(1980년 도입)이 생기기 전에 지어져 외벽·창호 단열이 매우 약할 가능성이 큽니다.");
    else if (b.year < 2001) points.push("2001년 단열 기준 강화 전에 지어져, 지금 기준보다 단열 성능이 낮을 가능성이 큽니다.");
  }
  if (b.gas && b.gas.percentile !== null && b.gas.peerCount) {
    points.push(
      100 - b.gas.percentile <= 50
        ? `같은 동 ${b.group} ${b.gas.peerCount.toLocaleString("ko-KR")}곳 중 상반기 도시가스 사용량(㎡당)이 많은 편입니다 (상위 ${Math.max(1, 100 - b.gas.percentile)}%).`
        : `같은 동 ${b.group} ${b.gas.peerCount.toLocaleString("ko-KR")}곳 중 상반기 도시가스 사용량(㎡당)이 적은 편입니다 (하위 ${Math.max(1, b.gas.percentile)}%).`,
    );
  }
  if (b.electric && b.electric.percentile !== null && b.electric.peerCount) {
    const high = 100 - b.electric.percentile;
    points.push(
      `${b.electric.year}년 전기 사용량(㎡당)은 같은 동 ${b.group} ${b.electric.peerCount.toLocaleString("ko-KR")}곳 중 ${
        high <= 50 ? `많이 쓰는 편입니다 (상위 ${Math.max(1, high)}%)` : `적게 쓰는 편입니다 (하위 ${Math.max(1, b.electric.percentile)}%)`
      }.`,
    );
  }
  points.push("그린리모델링 이자지원·컨설팅은 등급이 없어도 신청할 수 있고, 사전진단으로 실제 개선 효과를 확인할 수 있습니다.");
  return points;
}
