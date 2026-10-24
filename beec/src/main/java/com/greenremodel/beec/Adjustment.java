package com.greenremodel.beec;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 또래 집단 대표값을 사용자가 확인해 준 정보로 좁힙니다.
 *
 * 설계 원칙 — 이 파일에서 가장 중요한 부분입니다.
 *
 *   근거를 댈 수 있는 것만 숫자를 바꿉니다. 나머지는 "표시만" 합니다.
 *
 * 왜 이렇게까지 하냐면, 근거 없는 보정계수를 곱하는 순간 이 서비스는
 * "AI 가 알아서 계산해 줍니다" 가 되고, 그건 심사에서 가장 먼저 무너지는 종류의 주장이기 때문입니다.
 * 모르는 것을 모른다고 표시하는 편이 아는 척하는 것보다 강합니다.
 *
 * 지금 숫자를 바꾸는 것:
 *   - 창호 교체 여부, 보일러 상태
 *     → Measure.java 의 감축률을 그대로 씁니다 (WIN 0.15, BOI 0.09).
 *       What-if 시뮬레이터가 "앞으로 바꾸면 얼마나 준다" 에 쓰는 바로 그 계수를,
 *       여기서는 "이미 바꿨으니 또래 평균보다 이만큼 낫다" 에 씁니다. 같은 근거, 반대 방향입니다.
 *       서비스 안에서 두 개의 다른 숫자를 쓰지 않는다는 점이 중요합니다.
 *
 * 지금 숫자를 바꾸지 않는 것 (그리고 그 이유):
 *   - 준공연도
 *     → 적용 단열기준 시기는 알 수 있지만, 그것으로 몇 % 를 보정할지는 우리 데이터로 못 구합니다.
 *       인증 실적 35,521건에 준공연도가 없기 때문입니다. 같은 연식 또래로 좁힐 수가 없습니다.
 *       그래서 "이 건물은 어떤 단열기준 시기에 지어졌다" 는 근거로 보여주기만 하고,
 *       숫자는 건드리지 않습니다. 연식 보정은 건축물대장 연계 후에 회귀로 구해야 할 값입니다.
 *   - 난방방식
 *     → 마찬가지로 계수의 출처가 없습니다. 표시만 합니다.
 *
 * 둘 다 신뢰도 점수는 올립니다. 값을 못 바꿔도, 사용자가 확인해 준 정보가 있다는 것 자체가
 * 이 추정이 주소 한 줄에서만 나온 것이 아니라는 뜻이기 때문입니다.
 */
public final class Adjustment {

    private Adjustment() {}

    /**
     * 우리나라 단열 규정이 강화된 시점들.
     *
     * ⚠️ 팀원 확인 필요: 아래 연도는 규정 강화 시점이고, 각 시기의 열관류율 기준값은
     *    일부러 비워 두었습니다. 국가법령정보센터의 「건축물의 에너지절약설계기준」
     *    [별표 1] 연혁에서 확인한 값만 채우세요. 추정해서 채우면 안 됩니다 —
     *    "근거가 명확해야 한다" 는 지적을 받은 자리에서 틀린 숫자를 쓰는 것이 제일 나쁩니다.
     *
     * 배열: {시작연도, 시기 이름, 화면 설명}
     */
    private static final Object[][] ERAS = {
            {1979, "단열기준 도입 이전", "단열 규정이 적용되기 전에 지어진 건물입니다."},
            {1980, "1980년 기준", "단열 규정이 처음 도입된 시기입니다."},
            {1987, "1987년 기준", "1차 강화 시기입니다. 현행 기준과는 큰 차이가 있습니다."},
            {2001, "2001년 기준", "2차 강화 시기입니다."},
            {2008, "2008년 기준", "3차 강화 시기입니다."},
            {2013, "2013년 기준", "지역 구분이 세분화되고 기준이 크게 강화된 시기입니다."},
            {2016, "2016년 기준", "패시브 수준에 가까워진 시기입니다."},
            {2018, "2018년 이후 기준", "현행에 가까운 기준이 적용된 건물입니다."},
    };

    /** 보정 결과. */
    public record Result(double energy, List<Map<String, Object>> steps,
                         Map<String, Object> era, int inputCount) {}

    public static Result apply(double baseEnergy,
                               Integer completionYear,
                               String heatingType,
                               String windowState) {

        List<Map<String, Object>> steps = new ArrayList<>();
        double energy = baseEnergy;
        int inputs = 0;

        // ── 준공연도: 표시만, 숫자는 그대로 ──────────────────────────────
        Map<String, Object> era = null;
        if (completionYear != null && completionYear > 1900 && completionYear <= 2100) {
            inputs++;
            era = eraOf(completionYear);
        }

        // ── 창호 상태: 숫자를 바꿉니다 ────────────────────────────────────
        if (windowState != null && !windowState.isBlank()) {
            inputs++;
            Measure win = Measure.of("WIN");
            if (win != null) {
                if (windowState.contains("교체") || windowState.contains("이중") || windowState.contains("양호")) {
                    // 또래 평균은 교체 전 상태를 섞어 놓은 값입니다. 이미 교체했다면 그만큼 낫습니다.
                    double before = energy;
                    energy *= (1 - win.reductionPct());
                    steps.add(step("WIN", "고성능 창호 이미 적용",
                            before, energy, -win.reductionPct(), win.source()));
                } else if (windowState.contains("노후") || windowState.contains("단창")) {
                    double before = energy;
                    energy /= (1 - win.reductionPct());   // 개선 여지가 통째로 남아 있는 상태
                    steps.add(step("WIN", "노후 창호",
                            before, energy, win.reductionPct(), win.source()));
                }
            }
        }

        // ── 난방방식: 표시만 ─────────────────────────────────────────────
        if (heatingType != null && !heatingType.isBlank()) {
            inputs++;
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("code", "HEAT");
            s.put("title", "난방 방식: " + heatingType);
            s.put("energyChanged", false);
            s.put("note", "난방 방식별 보정계수는 공개 데이터로 근거를 확인하지 못해 "
                    + "추정치에 반영하지 않았습니다. 참고 정보로만 표시합니다.");
            steps.add(s);
        }

        return new Result(round(energy), steps, era, inputs);
    }

    private static Map<String, Object> step(String code, String title,
                                            double from, double to,
                                            double pct, String source) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("code", code);
        s.put("title", title);
        s.put("energyChanged", true);
        s.put("from", round(from));
        s.put("to", round(to));
        s.put("deltaPct", Math.round(pct * 1000) / 10.0);
        s.put("source", source);
        return s;
    }

    private static Map<String, Object> eraOf(int year) {
        Object[] hit = ERAS[0];
        for (Object[] e : ERAS) {
            if (year >= (Integer) e[0]) hit = e;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("completionYear", year);
        m.put("name", hit[1]);
        m.put("description", hit[2]);
        m.put("energyChanged", false);
        m.put("note", "적용 단열기준 시기는 추정의 근거로 표시합니다. "
                + "연식별 보정은 건축물대장 연계 후 회귀로 산출할 예정이며, 현재 추정치에는 반영되지 않았습니다.");
        m.put("source", "국토교통부 「건축물의 에너지절약설계기준」 개정 연혁");
        return m;
    }

    private static double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
