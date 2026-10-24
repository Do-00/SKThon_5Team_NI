package com.greenremodel.beec;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 개선 항목 6가지. 시뮬레이터(③)와 유형별 코치(②)가 같은 목록을 씁니다.
 *
 * 절감률은 국토부·정책브리핑의 부위별 열손실 범위 안에서 보수적으로 잡은 값입니다.
 * 공공건축물 그린리모델링 실측 평균 절감률 33.6% 와 같은 구간에 들어옵니다.
 *
 * costLevel : 1 = 저비용, 2 = 중간, 3 = 고비용. 정렬 점수 계산에만 씁니다.
 * programIds: src/data/programs.ts 의 지원사업 id 와 맞춰둔 값입니다.
 */
public record Measure(
        String code,
        String title,
        String description,
        String category,
        String difficulty,          // easy | medium | hard
        double reductionPct,        // 0~1
        int costLevel,              // 1~3
        String ownerReason,
        String tenantReason,
        String source,
        List<String> programIds,
        List<String> eligibleUserTypes
) {

    public static final List<Measure> ALL = List.of(
            new Measure("WAL", "외벽 단열 보강",
                    "외벽 단열재를 보강해 냉난방 부하를 크게 낮춥니다.",
                    "단열", "hard", 0.18, 3,
                    "외피 성능을 가장 크게 바꿉니다",
                    "벽이 찬 느낌과 결로가 줄어듭니다",
                    "열손실의 20~30%가 외벽 (국토부·정책브리핑) — 범위 내 보수적 설정",
                    List.of("prog-001", "prog-003", "prog-006"),
                    List.of("owner", "hoa", "corporation")),

            new Measure("WIN", "고성능 창호 교체",
                    "노후 창호를 고단열 창호로 교체해 열손실을 줄입니다.",
                    "단열", "hard", 0.15, 3,
                    "열손실이 가장 큰 부위입니다",
                    "웃풍과 창가 결로가 줄어듭니다",
                    "외피 개선 문헌값 기반 자체 설정",
                    List.of("prog-001", "prog-003"),
                    List.of("owner", "hoa", "corporation")),

            new Measure("HRV", "열회수 환기장치",
                    "환기로 빠져나가는 열을 회수해 난방 부하를 줄입니다.",
                    "설비", "medium", 0.10, 2,
                    "환기하면서 열을 회수합니다",
                    "창문을 열지 않아도 공기가 바뀝니다",
                    "설비 개선 문헌값 기반 자체 설정",
                    List.of("prog-005"),
                    List.of("owner", "hoa", "corporation")),

            new Measure("BOI", "고효율 보일러 교체",
                    "노후 보일러를 고효율 제품으로 교체합니다.",
                    "난방", "medium", 0.09, 2,
                    "설비 효율을 직접 올립니다",
                    "난방이 빨리 데워집니다",
                    "설비 개선 문헌값 기반 자체 설정",
                    List.of("prog-005"),
                    List.of("owner", "tenant", "hoa")),

            new Measure("ROF", "지붕·최상층 단열",
                    "최상층 천장과 지붕 단열을 보강합니다.",
                    "단열", "medium", 0.08, 2,
                    "최상층에서 효과가 큽니다",
                    "여름 더위가 덜합니다",
                    "외피 개선 문헌값 기반 자체 설정",
                    List.of("prog-001", "prog-003"),
                    List.of("owner", "hoa")),

            new Measure("LED", "LED 조명 전환",
                    "공용부와 세대 내 조명을 고효율 LED로 교체합니다.",
                    "조명", "easy", 0.04, 1,
                    "가장 적은 비용으로 시작합니다",
                    "바로 체감되는 전기요금 절감",
                    "형광램프 대비 40% 절감(정책브리핑) × 조명 비중 약 10% = 4%",
                    List.of("prog-005"),
                    List.of("owner", "tenant", "hoa", "general"))
    );

    private static final Map<String, Measure> BY_CODE = new LinkedHashMap<>();
    static {
        for (Measure m : ALL) BY_CODE.put(m.code(), m);
    }

    public static Measure of(String code) {
        return code == null ? null : BY_CODE.get(code.trim().toUpperCase());
    }

    /**
     * 유형별 정렬 가중치. 절감률에는 영향을 주지 않고 보여주는 순서만 바꿉니다.
     * 임차인은 공사 없이 체감되는 창호·환기를 위로, 취약계층(general)은 저비용을 위로 올립니다.
     */
    private static final Map<String, Map<String, Double>> WEIGHTS = Map.of(
            "owner",       Map.of("WAL", 1.0, "WIN", 1.0, "HRV", 0.9, "BOI", 1.0, "ROF", 0.9, "LED", 0.7),
            "tenant",      Map.of("WAL", 1.1, "WIN", 1.5, "HRV", 1.3, "BOI", 0.8, "ROF", 0.8, "LED", 0.9),
            "hoa",         Map.of("WAL", 1.2, "WIN", 0.9, "HRV", 1.0, "BOI", 1.0, "ROF", 1.2, "LED", 1.1),
            "corporation", Map.of("WAL", 1.1, "WIN", 1.0, "HRV", 1.1, "BOI", 0.9, "ROF", 1.0, "LED", 0.8),
            "general",     Map.of("WAL", 0.8, "WIN", 0.9, "HRV", 0.6, "BOI", 1.3, "ROF", 0.7, "LED", 1.8)
    );

    /** 정렬 점수 = (절감률 / 비용등급) × 유형 가중치. 클수록 위로. */
    public static double score(Measure m, String userType) {
        Map<String, Double> w = WEIGHTS.getOrDefault(userType, WEIGHTS.get("owner"));
        return (m.reductionPct() / m.costLevel()) * w.getOrDefault(m.code(), 1.0);
    }

    public String reasonFor(String userType) {
        return "tenant".equals(userType) ? tenantReason : ownerReason;
    }

    public boolean supportEligible() {
        return !programIds.isEmpty();
    }
}
