package com.greenremodel.beec;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 서울 아파트 2,888개 단지 — 모집단과 또래 추정.
 *
 * 이 클래스가 지키는 한 가지 원칙:
 *   **또래가 부족하면 등급을 내지 않습니다.**
 *
 * 왜냐하면 실제로 대부분이 부족하기 때문입니다. 인증 이력이 있는 단지는 257개(8.9%)뿐이고,
 * 그나마 198개가 2018년 이후 신축입니다. 1987년 단열기준 시기 아파트는 서울에 1,088개인데
 * 인증받은 곳이 9개(0.8%)입니다. 이 상태에서 또래 중앙값 하나를 "당신 집은 1등급" 이라고
 * 내보내면, 실제로는 1++ 부터 3등급까지 퍼져 있는 분포를 점 하나로 뭉갠 것이 됩니다.
 *
 * 그래서 이렇게 합니다.
 *   - 또래가 충분하면 → 점이 아니라 **구간**(p25~p75)으로, 표본 수와 함께
 *   - 부족하면        → 등급 대신 "왜 낼 수 없는지" 와 사각지대의 크기를 돌려줍니다
 *
 * 못 한다고 말하는 것이 이 서비스의 문제 제기입니다. 숨기면 그냥 틀린 서비스가 됩니다.
 */
@Service
public class ApartmentService {

    /** 또래로 인정할 최소 표본. 이보다 적으면 다음 단계로 넓힙니다. */
    private static final int MIN_PEERS = 5;

    /** 이 폭을 넘으면 구간이 너무 넓어 등급을 말하는 의미가 없습니다 (등급 두 칸 이상). */
    private static final double MAX_USEFUL_IQR = 60.0;

    public static class Payload {
        private Map<String, Object> meta;
        private List<Apartment> apartments;
        public Map<String, Object> getMeta() { return meta; }
        public void setMeta(Map<String, Object> v) { this.meta = v; }
        public List<Apartment> getApartments() { return apartments; }
        public void setApartments(List<Apartment> v) { this.apartments = v; }
    }

    private final JsonMapper jsonMapper;
    private Payload payload;

    /** 라벨이 있는 단지만. 또래 계산의 원천입니다. */
    private List<Apartment> labelled;
    private Map<String, Apartment> byCode;

    /** 단열기준 시기 → 그 시기 서울 아파트 수 / 인증 수. 사각지대 크기를 말하는 데 씁니다. */
    private final Map<String, int[]> eraCoverage = new LinkedHashMap<>();

    /** 건설사 → 인증받은 단지 수. 신뢰도 보조 지표로만 씁니다 (추정값은 건드리지 않습니다). */
    private final Map<String, Integer> builderCertCount = new HashMap<>();

    public ApartmentService(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @PostConstruct
    public void load() throws Exception {
        try (InputStream is = new ClassPathResource("seoul-apartments.json").getInputStream()) {
            payload = jsonMapper.readValue(is, Payload.class);
        }

        byCode = new HashMap<>();
        labelled = new ArrayList<>();
        for (Apartment a : payload.getApartments()) {
            byCode.put(a.getAptCode(), a);
            if (a.getCertified() && a.getEnergyValue() != null) labelled.add(a);

            String era = a.getInsulationEra();
            if (era != null) {
                int[] c = eraCoverage.computeIfAbsent(era, k -> new int[2]);
                c[0]++;
                if (a.getCertified()) c[1]++;
            }
            if (a.getCertified() && a.getBuilder() != null) {
                builderCertCount.merge(a.getBuilder(), 1, Integer::sum);
            }
        }

        System.out.println("[Apartments] 서울 아파트 " + payload.getApartments().size() + "개 단지 로드"
                + " / 인증 이력 " + labelled.size() + "개"
                + " (" + Math.round(labelled.size() * 1000.0 / payload.getApartments().size()) / 10.0 + "%)");
        System.out.println("[Apartments] 단열기준 시기별 인증 비율 — 이 숫자가 사각지대의 크기입니다");
        eraCoverage.entrySet().stream()
                .sorted(Comparator.comparingInt(e -> -e.getValue()[0]))
                .forEach(e -> System.out.printf("    %-14s 전체 %5d / 인증 %4d (%4.1f%%)%n",
                        e.getKey(), e.getValue()[0], e.getValue()[1],
                        e.getValue()[1] * 100.0 / e.getValue()[0]));
    }

    public Map<String, Object> meta() { return payload.getMeta(); }
    public List<Apartment> all() { return payload.getApartments(); }
    public Apartment byCode(String code) { return byCode.get(code); }

    /** 검색 결과. 잘라내기 전 총 건수를 같이 들고 있어야 화면에서 "N건 중 20건" 을 쓸 수 있습니다. */
    public record SearchResult(List<Apartment> items, int total) {}

    /**
     * 이름·주소 부분일치 검색. 인증 여부와 무관하게 전부 찾습니다.
     *
     * 관련도 순으로 정렬한 뒤 자릅니다.
     * 예전에는 limit 을 채우는 즉시 멈췄는데, 그러면 파일에 실린 순서가 곧 검색 순위가 됩니다.
     * "상계" 를 쳤을 때 이름이 정확히 "상계마들" 인 단지보다 "대망드림힐"(상계동 소재)이
     * 먼저 나오던 것이 그 때문입니다. 전부 훑어 점수를 매기고 나서 자릅니다.
     * 2,888개짜리 목록이라 전수 조회로 인한 부담은 없습니다.
     */
    public SearchResult search(String q, int limit) {
        if (q == null || q.isBlank()) return new SearchResult(List.of(), 0);
        String needle = squash(q);

        record Scored(Apartment a, int score) {}
        List<Scored> hits = new ArrayList<>();

        for (Apartment a : payload.getApartments()) {
            String name = squash(a.getName());
            int score;
            if (name.equals(needle)) score = 0;              // 이름이 정확히 일치
            else if (name.startsWith(needle)) score = 1;     // 이름이 검색어로 시작
            else if (name.contains(needle)) score = 2;       // 이름에 포함
            else if (squash(a.getEmd()).contains(needle)) score = 3;        // 동 이름
            else if (squash(a.getSgg()).contains(needle)) score = 4;        // 구 이름
            else if (squash(a.getRoadAddress()).contains(needle)) score = 5; // 주소
            else continue;
            hits.add(new Scored(a, score));
        }

        // 같은 점수면 인증 있는 단지를 앞에, 그다음 세대수가 큰 순으로.
        // 큰 단지가 먼저 보이는 편이 "우리 아파트 찾기" 에 유리합니다.
        hits.sort(Comparator
                .comparingInt(Scored::score)
                .thenComparing((Scored s) -> !s.a().getCertified())
                .thenComparing((Scored s) -> -(s.a().getHouseholds() == null ? 0 : s.a().getHouseholds())));

        int total = hits.size();
        List<Apartment> items = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, total); i++) items.add(hits.get(i).a());
        return new SearchResult(items, total);
    }

    private static String squash(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "");
    }

    /**
     * 또래 찾기 사다리.
     *
     * 유사성을 실제 물리 속성으로 정의합니다.
     *   단열기준 시기 × 복도유형 × 난방방식 × 규모  →  …시기 × 복도 × 난방  →  …시기 × 난방  →  시기
     *
     * "용도|지역|규모" 로 묶던 이전 방식과의 차이가 여기 있습니다.
     * 복도식과 계단식은 외피면적이 달라 실제로 열손실이 다르고, 단열기준 시기는 법령이
     * 정한 성능 하한이 다릅니다. 둘 다 "비슷할 것 같다" 가 아니라 근거가 있는 기준입니다.
     *
     * 어느 단계에서 찾았는지를 같이 돌려줍니다. 넓은 단계에서 찾았다는 것은
     * 그만큼 덜 비슷한 집단과 비교했다는 뜻이고, 그 사실을 화면에 적어야 합니다.
     */
    public Peers peersOf(Apartment a) {
        if (a.getInsulationEra() == null) return Peers.none("준공연도를 알 수 없어 비교 대상을 정할 수 없습니다");

        record Level(String name, String label) {}
        Level[] levels = {
                new Level("정밀", "같은 단열기준 시기 · 복도유형 · 난방방식 · 규모"),
                new Level("보통", "같은 단열기준 시기 · 복도유형 · 난방방식"),
                new Level("넓음", "같은 단열기준 시기 · 난방방식"),
                new Level("최소", "같은 단열기준 시기"),
        };

        for (int i = 0; i < levels.length; i++) {
            List<Double> vs = new ArrayList<>();
            for (Apartment p : labelled) {
                if (!a.getInsulationEra().equals(p.getInsulationEra())) continue;
                if (i <= 1 && !eq(a.getCorridorType(), p.getCorridorType())) continue;
                if (i <= 2 && !eq(a.getHeatingType(), p.getHeatingType())) continue;
                if (i == 0 && !eq(a.getSizeBucket(), p.getSizeBucket())) continue;
                vs.add(p.getEnergyValue());
            }
            if (vs.size() >= MIN_PEERS) {
                vs.sort(null);
                return new Peers(true, levels[i].name(), levels[i].label(), vs, null);
            }
        }
        return Peers.none("같은 조건 아파트 중 인증 사례가 " + MIN_PEERS + "건 미만입니다");
    }

    private static boolean eq(String a, String b) {
        return a != null && a.equals(b);
    }

    /** 또래 집단 조회 결과. */
    public record Peers(boolean found, String level, String label,
                        List<Double> values, String reason) {
        static Peers none(String reason) {
            return new Peers(false, null, null, List.of(), reason);
        }
        double p(double q) {
            if (values.isEmpty()) return 0;
            int i = (int) Math.round(q * (values.size() - 1));
            return values.get(Math.max(0, Math.min(values.size() - 1, i)));
        }
        double median() { return p(0.5); }
        double iqr() { return p(0.75) - p(0.25); }
    }

    /** 단열기준 시기별 사각지대 크기 {전체, 인증}. */
    public int[] coverageOf(String era) {
        return eraCoverage.getOrDefault(era, new int[]{0, 0});
    }

    public Map<String, int[]> allCoverage() { return eraCoverage; }

    public int builderCerts(String builder) {
        return builder == null ? 0 : builderCertCount.getOrDefault(builder, 0);
    }

    static int minPeers() { return MIN_PEERS; }
    static double maxUsefulIqr() { return MAX_USEFUL_IQR; }
}
