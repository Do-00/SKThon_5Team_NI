package com.greenremodel.beec;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ③ What-if 시뮬레이터 · ② 유형별 우선순위 코치.
 *
 * ReportController 는 건드리지 않고 새 파일로 둡니다. 같은 파일을 동시에 만지면 충돌하니까요.
 *
 *  · 절감률은 합산이 아니라 곱셈입니다. 창호 15% + 외벽 18% 를 더해 33% 로 쓰면 과대추정입니다.
 *    222.7 × 0.85 × 0.82 = 155.2 로 실제로는 30% 절감입니다.
 *  · 없는 값은 null. 화면이 그 자리를 숨깁니다.
 *  · Map.of() 는 null 을 못 받으므로 응답 조립은 LinkedHashMap 으로 합니다.
 */
@RestController
@CrossOrigin(origins = "*")
public class SimulationController {

    // ── ③ 시뮬레이터 ────────────────────────────────────

    /** POST 본문용. measureCodes 는 ["WIN","WAL"] 형태. */
    public record SimulateRequest(Double baseEnergy, List<String> measureCodes, String purpose) {}

    @PostMapping("/api/simulate")
    public Map<String, Object> simulate(@RequestBody SimulateRequest req) {
        return run(req.baseEnergy(), req.measureCodes(), req.purpose());
    }

    /**
     * 브라우저에서 바로 눌러볼 수 있게 GET 도 열어둡니다.
     * /api/simulate?baseEnergy=222.7&measures=WIN,WAL&purpose=주거용
     */
    @GetMapping("/api/simulate")
    public Map<String, Object> simulateGet(
            @RequestParam(required = false) Double baseEnergy,
            @RequestParam(required = false) String measures,
            @RequestParam(required = false, defaultValue = "주거용") String purpose) {

        List<String> codes = (measures == null || measures.isBlank())
                ? List.of()
                : Arrays.asList(measures.split(","));
        return run(baseEnergy, codes, purpose);
    }

    private Map<String, Object> run(Double baseEnergy, List<String> codes, String purpose) {
        Map<String, Object> out = new LinkedHashMap<>();

        if (baseEnergy == null || baseEnergy <= 0) {
            out.put("found", false);
            out.put("message", "baseEnergy 가 필요합니다. /api/report 의 primaryEnergyKwh 를 그대로 넘기세요");
            return out;
        }

        String p = (purpose == null || purpose.isBlank()) ? "주거용" : purpose;
        double base = round1(baseEnergy);
        double now = base;

        List<Map<String, Object>> steps = new ArrayList<>();
        List<String> applied = new ArrayList<>();

        if (codes != null) {
            for (String raw : codes) {
                Measure m = Measure.of(raw);
                if (m == null) continue;              // 모르는 코드는 조용히 무시
                if (applied.contains(m.code())) continue;  // 같은 항목 두 번 적용 방지

                double before = now;
                now = round1(now * (1 - m.reductionPct()));

                Map<String, Object> step = new LinkedHashMap<>();
                step.put("code", m.code());
                step.put("title", m.title());
                step.put("reductionPct", m.reductionPct());
                step.put("from", before);
                step.put("to", now);
                steps.add(step);
                applied.add(m.code());
            }
        }

        String gradeBefore = GradeTable.codeOf(base, p);
        String gradeAfter = GradeTable.codeOf(now, p);

        out.put("found", true);
        out.put("purpose", p);
        out.put("baseEnergy", base);
        out.put("energy", now);
        out.put("unit", "kWh/㎡·년");
        out.put("savedEnergy", round1(base - now));
        out.put("savedPct", (int) Math.round((1 - now / base) * 100));
        out.put("gradeCodeBefore", gradeBefore);
        out.put("gradeBefore", gradeBefore + "등급");
        out.put("gradeCode", gradeAfter);
        out.put("grade", gradeAfter + "등급");
        out.put("gradeUp", GradeTable.rankOf(gradeBefore) - GradeTable.rankOf(gradeAfter));
        out.put("applied", applied);
        out.put("steps", steps);
        return out;
    }

    // ── ② 유형별 우선순위 코치 ──────────────────────────

    /**
     * /api/actions?userType=tenant&purpose=주거용&baseEnergy=222.7
     *
     * 프론트 src/data/actions.ts 의 EcoAction 모양에 맞춰 내보냅니다.
     * 비용 관련 필드(monthlySavingsManwon · estimatedCostRangeManwon)는
     * 우리 데이터에 근거가 없어 null 입니다. 대신 절감 에너지를 넣습니다.
     */
    @GetMapping("/api/actions")
    public Map<String, Object> actions(
            @RequestParam(required = false, defaultValue = "owner") String userType,
            @RequestParam(required = false, defaultValue = "주거용") String purpose,
            @RequestParam(required = false) Double baseEnergy) {

        String seg = normalizeUserType(userType);

        List<Measure> sorted = new ArrayList<>(Measure.ALL);
        sorted.sort((a, b) -> Double.compare(Measure.score(b, seg), Measure.score(a, seg)));

        List<Map<String, Object>> items = new ArrayList<>();
        int order = 1;
        for (Measure m : sorted) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("id", "act-" + m.code().toLowerCase());
            one.put("title", m.title());
            one.put("description", m.description());
            one.put("category", m.category());
            one.put("difficulty", m.difficulty());
            one.put("monthlySavingsManwon", null);        // 비용 데이터 없음
            one.put("estimatedCostRangeManwon", null);    // 비용 데이터 없음
            one.put("eligibleUserTypes", m.eligibleUserTypes());
            one.put("supportEligible", m.supportEligible());
            one.put("supportProgramIds", m.programIds());
            // 아래는 추가 필드
            one.put("measureCode", m.code());             // 시뮬레이터 체크박스와 같은 코드
            one.put("reductionPct", m.reductionPct());
            one.put("costLevel", m.costLevel());
            one.put("reason", m.reasonFor(seg));
            one.put("priority", order++);
            one.put("recommended", m.eligibleUserTypes().contains(seg));
            one.put("savedEnergy", baseEnergy == null ? null
                    : round1(baseEnergy * m.reductionPct()));
            items.add(one);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("found", true);
        out.put("userType", seg);
        out.put("purpose", purpose);
        out.put("headline", headlineOf(seg));
        out.put("subline", sublineOf(seg));
        out.put("actions", items);
        return out;
    }

    /** 개선 항목 원본 목록. 셀렉트 박스나 체크박스 소스로 씁니다. */
    @GetMapping("/api/measures")
    public List<Map<String, Object>> measures() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Measure m : Measure.ALL) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("code", m.code());
            one.put("title", m.title());
            one.put("category", m.category());
            one.put("reductionPct", m.reductionPct());
            one.put("costLevel", m.costLevel());
            one.put("source", m.source());
            out.add(one);
        }
        return out;
    }

    // ── helper ──────────────────────────────────────────

    private static String normalizeUserType(String t) {
        if (t == null) return "owner";
        String s = t.trim().toLowerCase();
        return switch (s) {
            case "tenant", "hoa", "corporation", "general", "owner" -> s;
            case "vulnerable" -> "general";   // 예전 이름 호환
            default -> "owner";
        };
    }

    private static String headlineOf(String seg) {
        return switch (seg) {
            case "tenant" -> "건물주와 이야기할 때 쓸 근거를 정리했습니다.";
            case "general" -> "자부담 없이 시작할 수 있는 것부터 안내합니다.";
            case "hoa" -> "공용부부터 손대면 효과가 가장 큽니다.";
            case "corporation" -> "투자 회수 기간이 짧은 순서로 정리했습니다.";
            default -> "투자 대비 등급이 가장 많이 오르는 순서입니다.";
        };
    }

    private static String sublineOf(String seg) {
        return switch (seg) {
            case "tenant" -> "거주하면서 바로 체감되는 항목을 위에 두었습니다.";
            case "general" -> "지원사업으로 해결 가능한 항목과 저비용 항목을 위에 두었습니다.";
            case "hoa" -> "세대 동의 없이 결의만으로 진행 가능한 항목을 위에 두었습니다.";
            default -> "비용 대비 절감 효과가 큰 항목을 위에 두었습니다.";
        };
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
