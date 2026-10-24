package com.greenremodel.beec;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * seed.json 의 region 필드 오류를 기동 시점에 바로잡습니다.
 *
 * 무엇이 잘못되어 있나
 *   region=서울  주소=경기도 김포시 고촌읍 장차로 14
 *   region=서울  주소=경기도 하남시 미사강변남로 39
 *   region=광주  주소=전라남도 순천시 ...
 * 에너지공단 API 를 시도 코드로 조회할 때 관할 구역의 인접 시도 건물이 딸려 나온 것을 그대로 저장한 듯합니다.
 * 전체의 5.3% 인 1,899건이 틀려 있고, 그 결과 districtGroups 430개 중 131개가 같은 동네의 중복 키였습니다.
 * ("중구" 가 서울·경기·인천·부산·울산·대구·대전 일곱 개로 흩어져 있었습니다.)
 *
 * 어떻게 고치나
 *   1차 — 주소가 시도명으로 시작하면 그 값을 씁니다. 전체의 95.0% 가 여기서 해결됩니다.
 *   2차 — 주소에 시도가 없으면("김포시 월곶면 조강리 1-9"), 1차로 확정된 건물들에서
 *          시군구 → 시도 사전을 만들어 적용합니다. 한 시도가 80% 이상일 때만 씁니다.
 *          중구·서구·남구·북구·동구처럼 여러 시도에 같은 이름이 있는 곳은 사전에 넣지 않습니다.
 *   3차 — 그래도 모르면 기존 값을 그대로 둡니다. (363건)
 *
 * 이름만 바꿔치기하면 안 되는 이유
 *   "중구" 를 이름만 보고 합치면 부산 중구가 서울 중구에 섞입니다.
 *   그래서 건물마다 자기 주소로 시도를 정한 뒤, 그룹을 처음부터 다시 만듭니다.
 *
 * seed.json 파일 자체는 건드리지 않습니다. 메모리에 올린 뒤에만 고칩니다.
 */
public final class RegionFixer {

    private RegionFixer() {}

    /** 긴 표기를 먼저 봐야 합니다. "서울특별시" 를 "서울" 로 먼저 잡으면 안 되니 순서가 중요합니다. */
    private static final String[][] SIDO = {
            {"서울특별시", "서울"}, {"부산광역시", "부산"}, {"대구광역시", "대구"},
            {"인천광역시", "인천"}, {"광주광역시", "광주"}, {"대전광역시", "대전"},
            {"울산광역시", "울산"}, {"세종특별자치시", "세종"},
            {"경기도", "경기"}, {"강원특별자치도", "강원"}, {"강원도", "강원"},
            {"충청북도", "충북"}, {"충청남도", "충남"},
            {"전북특별자치도", "전북"}, {"전라북도", "전북"}, {"전라남도", "전남"},
            {"경상북도", "경북"}, {"경상남도", "경남"}, {"제주특별자치도", "제주"},
            {"서울", "서울"}, {"부산", "부산"}, {"대구", "대구"}, {"인천", "인천"},
            {"광주", "광주"}, {"대전", "대전"}, {"울산", "울산"}, {"세종", "세종"},
            {"경기", "경기"}, {"강원", "강원"}, {"충북", "충북"}, {"충남", "충남"},
            {"전북", "전북"}, {"전남", "전남"}, {"경북", "경북"}, {"경남", "경남"}, {"제주", "제주"}
    };

    /**
     * "전남광주통합특별시" 로 시작하는 주소가 10건쯤 있습니다. 행정통합 논의 시기의 표기로 보입니다.
     * 뒤따르는 시군구로 판단합니다 — 광주광역시에는 구만 있고, 전남에는 시·군만 있습니다.
     *   전남광주통합특별시 남구 진월동   → 광주
     *   전남광주통합특별시 장성군 진원면 → 전남
     */
    private static final String MERGED_CITY_PREFIX = "전남광주";

    /**
     * 행정구역 개편으로 소속이 바뀐 곳. 주소 표기가 옛것과 새것이 섞여 있어 한쪽으로 모읍니다.
     *   군위군 — 2023년 경북에서 대구로 편입. 데이터에 대구 8건 · 경북 6건으로 흩어져 있습니다.
     */
    private static final String[][] DISTRICT_OVERRIDE = {
            {"군위군", "대구"}
    };

    /** 한 시도가 이 비율 이상일 때만 시군구 → 시도 사전에 넣습니다. */
    private static final double LOOKUP_THRESHOLD = 0.8;

    /** 이 값을 벗어난 에너지값은 집계에서 뺍니다. */
    private static final double E_MIN = 0.0, E_MAX = 1000.0;

    /** 표본이 이보다 적으면 화면에 "사례 부족" 을 띄우게 합니다. */
    private static final int LOW_SAMPLE = 30;

    public record Result(int corrected, int byAddress, int byLookup, int kept, int districtGroups) {}

    /** 주소 맨 앞의 시도명. 없으면 null. */
    public static String sidoOf(String address) {
        if (address == null) return null;
        String a = address.trim();
        if (a.isEmpty()) return null;

        for (String[] pair : SIDO) {
            String token = pair[0];
            if (!a.startsWith(token)) continue;

            // "광주시 오포읍" 은 경기 광주시입니다. 짧은 표기는 뒤에 공백이 와야 시도로 인정합니다.
            // 긴 표기("광주광역시")는 그 자체로 확정이므로 이 검사를 건너뜁니다.
            boolean isShortForm = token.length() <= 2;
            if (isShortForm && a.length() > token.length()) {
                char next = a.charAt(token.length());
                if (!Character.isWhitespace(next)) continue;
            }
            return pair[1];
        }
        return null;
    }

    /** "전남광주통합특별시" 표기 처리. 해당 없으면 null. */
    private static String mergedCityOf(String address, String district) {
        if (address == null || !address.trim().startsWith(MERGED_CITY_PREFIX)) return null;
        if (district == null || district.isBlank()) return null;
        return district.endsWith("구") ? "광주" : "전남";
    }

    /** 행정구역 개편 등으로 강제 지정이 필요한 시군구. 없으면 null. */
    private static String overrideOf(String district) {
        if (district == null) return null;
        for (String[] o : DISTRICT_OVERRIDE) {
            if (o[0].equals(district)) return o[1];
        }
        return null;
    }

    /**
     * 건물들의 region 을 고치고 districtGroups 를 다시 만듭니다.
     * 반환된 맵을 seedData 에 넣어 쓰면 됩니다.
     */
    public static Result apply(List<BuildingRecord> buildings, Map<String, DistrictInfo> targetDistrictGroups) {
        int byAddress = 0, byLookup = 0, kept = 0, corrected = 0;

        // ── 1차: 주소에서 직접 ──
        String[] resolved = new String[buildings.size()];
        for (int i = 0; i < buildings.size(); i++) {
            BuildingRecord b = buildings.get(i);
            String merged = mergedCityOf(b.getAddress(), b.getDistrict());
            resolved[i] = (merged != null) ? merged : sidoOf(b.getAddress());
            if (resolved[i] != null) byAddress++;
        }

        // ── 시군구 → 시도 사전 ──
        Map<String, Map<String, Integer>> tally = new LinkedHashMap<>();
        for (int i = 0; i < buildings.size(); i++) {
            String d = buildings.get(i).getDistrict();
            if (resolved[i] == null || d == null || d.isBlank()) continue;
            tally.computeIfAbsent(d, x -> new LinkedHashMap<>()).merge(resolved[i], 1, Integer::sum);
        }
        Map<String, String> lookup = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, Integer>> e : tally.entrySet()) {
            int total = 0, best = 0;
            String bestKey = null;
            for (Map.Entry<String, Integer> c : e.getValue().entrySet()) {
                total += c.getValue();
                if (c.getValue() > best) { best = c.getValue(); bestKey = c.getKey(); }
            }
            if (bestKey != null && total > 0 && (double) best / total >= LOOKUP_THRESHOLD) {
                lookup.put(e.getKey(), bestKey);
            }
        }

        // ── 2·3차 적용 ──
        for (int i = 0; i < buildings.size(); i++) {
            BuildingRecord b = buildings.get(i);

            String forced = overrideOf(b.getDistrict());
            if (forced != null) {
                if (!forced.equals(b.getRegion())) corrected++;
                b.setRegion(forced);
                continue;
            }

            String r = resolved[i];
            if (r == null) {
                r = lookup.get(b.getDistrict());
                if (r != null) byLookup++;
                else { r = b.getRegion(); kept++; }
            }
            if (r != null && !r.equals(b.getRegion())) corrected++;
            if (r != null) b.setRegion(r);
        }

        // ── districtGroups 재생성 ──
        Map<String, List<Double>> energy = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> grades = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> purposes = new LinkedHashMap<>();
        Map<String, String> regionOf = new LinkedHashMap<>();

        for (BuildingRecord b : buildings) {
            String d = b.getDistrict();
            String r = b.getRegion();
            if (d == null || d.isBlank() || r == null || r.isBlank()) continue;
            double e = b.getEnergyValue();
            if (e <= E_MIN || e > E_MAX) continue;

            String key = r + " " + d;
            energy.computeIfAbsent(key, x -> new ArrayList<>()).add(e);
            regionOf.putIfAbsent(key, r);
            if (b.getGrade() != null && !b.getGrade().isBlank()) {
                grades.computeIfAbsent(key, x -> new LinkedHashMap<>()).merge(b.getGrade(), 1, Integer::sum);
            }
            if (b.getPurpose() != null) {
                purposes.computeIfAbsent(key, x -> new LinkedHashMap<>()).merge(b.getPurpose(), 1, Integer::sum);
            }
        }

        targetDistrictGroups.clear();
        for (Map.Entry<String, List<Double>> e : energy.entrySet()) {
            List<Double> v = e.getValue();
            v.sort(null);
            double median = v.get((int) Math.round(0.5 * (v.size() - 1)));
            median = Math.round(median * 10.0) / 10.0;

            // 등급 기준표는 용도마다 다릅니다. 그 동네에서 더 많은 쪽을 씁니다.
            String purpose = dominant(purposes.get(e.getKey()));

            DistrictInfo info = new DistrictInfo();
            info.setRegion(regionOf.get(e.getKey()));
            info.setCount(v.size());
            info.setRepresentativeGrade(GradeTable.labelOf(median, purpose));
            info.setGradeDistribution(grades.getOrDefault(e.getKey(), new LinkedHashMap<>()));
            info.setLowSample(v.size() < LOW_SAMPLE);
            targetDistrictGroups.put(e.getKey(), info);
        }

        return new Result(corrected, byAddress, byLookup, kept, targetDistrictGroups.size());
    }

    /**
     * groups 를 다시 만듭니다. 키는 기존과 같은 {용도}|{시도}|{규모} 입니다.
     * 규모는 건물이 이미 들고 있는 groupKey 의 세 번째 칸을 그대로 씁니다 — 면적 기준을 새로 정하지 않습니다.
     *
     * 이걸 하지 않으면 /api/report 의 "서울 주거용" 에 김포·화성 건물이 섞인 채로 남습니다.
     */
    public static int rebuildGroups(List<BuildingRecord> buildings, Map<String, GroupInfo> target) {
        Map<String, List<Double>> energy = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> grades = new LinkedHashMap<>();
        Map<String, String> purposeOf = new LinkedHashMap<>();

        for (BuildingRecord b : buildings) {
            String purpose = b.getPurpose();
            String region = b.getRegion();
            if (purpose == null || purpose.isBlank() || region == null || region.isBlank()) continue;

            String size = "unknown";
            String gk = b.getGroupKey();
            if (gk != null) {
                String[] parts = gk.split("\\|");
                if (parts.length >= 3 && !parts[2].isBlank()) size = parts[2];
            }

            double e = b.getEnergyValue();
            if (e <= E_MIN || e > E_MAX) continue;

            String key = purpose + "|" + region + "|" + size;
            energy.computeIfAbsent(key, x -> new ArrayList<>()).add(e);
            purposeOf.putIfAbsent(key, purpose);
            if (b.getGrade() != null && !b.getGrade().isBlank()) {
                grades.computeIfAbsent(key, x -> new LinkedHashMap<>()).merge(b.getGrade(), 1, Integer::sum);
            }
        }

        target.clear();
        for (Map.Entry<String, List<Double>> e : energy.entrySet()) {
            List<Double> v = e.getValue();
            v.sort(null);
            double median = v.get((int) Math.round(0.5 * (v.size() - 1)));
            median = Math.round(median * 10.0) / 10.0;

            GroupInfo g = new GroupInfo();
            g.setCount(v.size());
            g.setMedianValue(median);
            g.setEstimatedGrade(GradeTable.labelOf(median, purposeOf.get(e.getKey())));
            g.setGradeDistribution(grades.getOrDefault(e.getKey(), new LinkedHashMap<>()));
            g.setLowSample(v.size() < LOW_SAMPLE);
            target.put(e.getKey(), g);
        }
        return target.size();
    }

    /** 용도별 동네 통계. 키는 "전체" · "주거용" · "주거용 이외". 안쪽 키는 "{시도} {시군구}". */
    public static Map<String, Map<String, DistrictInfo>> buildByPurpose(List<BuildingRecord> buildings) {
        Map<String, Map<String, List<Double>>> energy = new LinkedHashMap<>();
        Map<String, Map<String, Map<String, Integer>>> grades = new LinkedHashMap<>();
        Map<String, String> regionOf = new LinkedHashMap<>();

        for (BuildingRecord b : buildings) {
            String d = b.getDistrict();
            String r = b.getRegion();
            String purpose = b.getPurpose();
            if (d == null || d.isBlank() || r == null || r.isBlank()) continue;
            double e = b.getEnergyValue();
            if (e <= E_MIN || e > E_MAX) continue;

            String key = r + " " + d;
            regionOf.putIfAbsent(key, r);

            String[] buckets = (purpose == null || purpose.isBlank())
                    ? new String[]{"전체"}
                    : new String[]{"전체", purpose};

            for (String bucket : buckets) {
                energy.computeIfAbsent(bucket, x -> new LinkedHashMap<>())
                        .computeIfAbsent(key, x -> new ArrayList<>()).add(e);
                if (b.getGrade() != null && !b.getGrade().isBlank()) {
                    grades.computeIfAbsent(bucket, x -> new LinkedHashMap<>())
                            .computeIfAbsent(key, x -> new LinkedHashMap<>())
                            .merge(b.getGrade(), 1, Integer::sum);
                }
            }
        }

        Map<String, Map<String, DistrictInfo>> out = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, List<Double>>> bucket : energy.entrySet()) {
            String purpose = bucket.getKey();
            // 등급 기준표는 용도마다 다릅니다. "전체" 는 섞여 있으므로 주거용 표를 씁니다.
            String tableFor = "주거용 이외".equals(purpose) ? "주거용 이외" : "주거용";

            Map<String, DistrictInfo> byKey = new LinkedHashMap<>();
            for (Map.Entry<String, List<Double>> e : bucket.getValue().entrySet()) {
                List<Double> v = e.getValue();
                v.sort(null);
                double median = v.get((int) Math.round(0.5 * (v.size() - 1)));
                median = Math.round(median * 10.0) / 10.0;

                DistrictInfo info = new DistrictInfo();
                info.setRegion(regionOf.get(e.getKey()));
                info.setCount(v.size());
                info.setRepresentativeGrade(GradeTable.labelOf(median, tableFor));
                info.setGradeDistribution(
                        grades.getOrDefault(purpose, Map.of()).getOrDefault(e.getKey(), new LinkedHashMap<>()));
                info.setLowSample(v.size() < LOW_SAMPLE);
                byKey.put(e.getKey(), info);
            }
            out.put(purpose, byKey);
        }
        return out;
    }

    private static String dominant(Map<String, Integer> counts) {
        if (counts == null || counts.isEmpty()) return "주거용";
        String best = "주거용";
        int n = -1;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            if (e.getValue() > n) { n = e.getValue(); best = e.getKey(); }
        }
        return best;
    }
}
