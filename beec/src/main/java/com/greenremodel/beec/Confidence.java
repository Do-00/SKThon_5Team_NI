package com.greenremodel.beec;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 추정 등급의 신뢰도.
 *
 * 왜 필요한가:
 *   지금까지 우리는 "1+등급" 이라고 단정해서 내보냈습니다. 인증 이력이 없는 건물에 대해
 *   또래 집단의 대표값을 그대로 답으로 준 것이고, 그건 조회기가 하는 일입니다.
 *   추정 모델은 답을 하나 말하지 않습니다. 분포와 불확실성을 같이 말합니다.
 *
 * 무엇으로 계산하는가 (전부 우리가 실제로 가진 값입니다. 임의 상수가 아닙니다):
 *   1) 표본 수      — 또래 집단에 인증 사례가 몇 건인가
 *   2) 분포 집중도  — 그 집단의 등급이 한 곳에 모여 있는가, 흩어져 있는가
 *   3) 입력 충실도  — 사용자가 건물 정보를 몇 가지나 확인해 주었는가
 *
 * 2번이 핵심입니다. 표본이 100건이어도 등급이 1++ 부터 4등급까지 고르게 퍼져 있으면
 * 대표값 하나는 아무것도 말해주지 않습니다. 반대로 30건이어도 70%가 한 등급에 몰려 있으면
 * 그 추정은 쓸 만합니다. 표본 수만 보고 신뢰도를 말하면 이 차이를 놓칩니다.
 *
 * 화면에는 점수만 쓰지 말고 근거 세 줄을 같이 보여주세요.
 * "신뢰도 중" 만 적으면 그것도 결국 근거 없는 숫자입니다.
 */
public final class Confidence {

    private Confidence() {}

    /** 사용자가 확인해 줄 수 있는 항목 수. 보정 입력 폼의 칸 수와 같습니다. */
    public static final int MAX_USER_INPUTS = 3;   // 준공연도 · 난방방식 · 창호상태

    /**
     * @param sampleCount   또래 집단의 인증 건수
     * @param distribution  등급 코드 → 건수 (GroupInfo/DistrictInfo 가 이미 갖고 있는 값)
     * @param userInputs    사용자가 채운 보정 입력 개수 (0..MAX_USER_INPUTS)
     */
    public static Map<String, Object> of(int sampleCount,
                                         Map<String, Integer> distribution,
                                         int userInputs) {

        double sampleScore = sampleScore(sampleCount);
        double concentration = concentration(distribution);
        double inputScore = Math.min(1.0, Math.max(0, userInputs) / (double) MAX_USER_INPUTS);

        // 가중치: 분포 집중도가 가장 중요합니다. 표본이 많아도 흩어져 있으면 못 믿습니다.
        // 사용자 입력은 아직 보정 폭이 크지 않아 비중을 낮게 둡니다.
        double score = 0.35 * sampleScore + 0.45 * concentration + 0.20 * inputScore;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("score", Math.round(score * 100));          // 0~100
        out.put("level", level(score));                      // 높음 / 보통 / 낮음
        out.put("sampleCount", sampleCount);
        out.put("topGradeShare", Math.round(concentration * 100));
        out.put("userInputs", userInputs);
        out.put("maxUserInputs", MAX_USER_INPUTS);

        // 화면에 그대로 띄울 수 있는 근거 문장. 숫자 옆에 반드시 같이 보여주세요.
        out.put("reasons", java.util.List.of(
                "같은 조건 아파트 인증 사례 " + sampleCount + "건",
                "그중 " + Math.round(concentration * 100) + "%가 이 등급 구간",
                userInputs == 0
                        ? "건물 정보를 입력하면 정확도가 올라갑니다"
                        : "사용자 확인 정보 " + userInputs + "/" + MAX_USER_INPUTS + "개 반영"
        ));

        // 예측이라는 사실을 숨기지 않습니다. 인증받지 않은 건물에 대한 추정이라는 점을
        // 화면에서 지우면 그 순간 이 서비스는 잘못된 정보를 파는 것이 됩니다.
        out.put("disclaimer",
                "인증 이력이 없는 건물의 추정치입니다. 공식 등급이 아니며, "
                        + "정확한 등급은 한국에너지공단 인증을 받아야 확인할 수 있습니다.");
        return out;
    }

    /**
     * 표본 수 → 0~1.
     * 30건쯤에서 충분해지고 그 뒤로는 완만합니다. 300건과 3,000건의 차이는 크지 않기 때문에
     * 선형이 아니라 로그로 둡니다.
     */
    private static double sampleScore(int n) {
        if (n <= 0) return 0;
        return Math.min(1.0, Math.log10(n + 1) / Math.log10(31));
    }

    /**
     * 분포 집중도 = 최빈 등급의 비율.
     *
     * 이웃 등급까지 한 칸씩 묶어서 셉니다. 1++ 45% / 1+ 40% 로 갈린 집단은
     * 최빈값만 보면 45% 라 못 믿을 것 같지만, 실제로는 "1++ 아니면 1+" 로 좁혀진
     * 꽤 확실한 추정입니다. 한 칸 오차를 허용하는 쪽이 현실에 맞습니다.
     */
    private static double concentration(Map<String, Integer> distribution) {
        if (distribution == null || distribution.isEmpty()) return 0;

        int total = 0;
        for (Integer v : distribution.values()) total += (v == null ? 0 : v);
        if (total == 0) return 0;

        double best = 0;
        for (Map.Entry<String, Integer> e : distribution.entrySet()) {
            int rank = GradeTable.rankOf(GradeTable.toCode(e.getKey()));
            if (rank <= 0) continue;

            int window = 0;
            for (Map.Entry<String, Integer> f : distribution.entrySet()) {
                int r = GradeTable.rankOf(GradeTable.toCode(f.getKey()));
                if (r > 0 && Math.abs(r - rank) <= 1) window += (f.getValue() == null ? 0 : f.getValue());
            }
            best = Math.max(best, window / (double) total);
        }
        return best;
    }

    private static String level(double score) {
        if (score >= 0.70) return "높음";
        if (score >= 0.45) return "보통";
        return "낮음";
    }
}
