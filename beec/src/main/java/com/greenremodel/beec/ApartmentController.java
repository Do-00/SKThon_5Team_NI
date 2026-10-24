package com.greenremodel.beec;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 서울 아파트 API.
 *
 * 화면이 받아가는 값은 세 덩어리로 나뉩니다. 섞지 않는 것이 중요합니다.
 *
 *   facts       확실한 것. 공공데이터에 적혀 있는 값과 법령으로 정해지는 값.
 *               준공연도, 세대수, 복도유형, 난방방식, 적용 단열기준 시기.
 *   measured    인증을 실제로 받은 단지의 인증값. 추정이 아닙니다.
 *   estimate    또래 기반 추정. **구간**으로만 냅니다. 근거가 부족하면 아예 null 입니다.
 *
 * estimate 가 null 로 나가는 경우가 많습니다. 그게 정상입니다.
 * 서울 아파트 2,888개 중 인증 이력이 있는 곳은 324개(11.2%)뿐이고, 1987년 단열기준 시기
 * 아파트는 1,088개 중 5개(0.5%)입니다. 비교할 사례가 없는 건물에 등급을 붙이는 것이
 * 바로 "편향된 결과" 입니다. 우리는 대신 사각지대의 크기를 숫자로 보여줍니다.
 */
@RestController
@CrossOrigin(origins = "*")
public class ApartmentController {

    private final ApartmentService service;
    private final ModelService model;

    public ApartmentController(ApartmentService service, ModelService model) {
        this.service = service;
        this.model = model;
    }

    /** 모델 성능을 그대로 공개합니다. 숨길 이유가 없고, 공개하는 것 자체가 주장의 일부입니다. */
    @GetMapping("/api/apt/model")
    public Map<String, Object> modelInfo() {
        return model.summary();
    }

    /** 발표 첫 장에 쓸 숫자. 서울 아파트 중 인증 사각지대가 얼마나 되는가. */
    @GetMapping("/api/apt/stats")
    public Map<String, Object> stats() {
        Map<String, Object> out = new LinkedHashMap<>(service.meta());

        List<Map<String, Object>> eras = new ArrayList<>();
        for (Map.Entry<String, int[]> e : service.allCoverage().entrySet()) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("era", e.getKey());
            one.put("total", e.getValue()[0]);
            one.put("certified", e.getValue()[1]);
            one.put("certifiedPct", Math.round(e.getValue()[1] * 1000.0 / e.getValue()[0]) / 10.0);
            eras.add(one);
        }
        eras.sort((a, b) -> Integer.compare((Integer) b.get("total"), (Integer) a.get("total")));
        out.put("byInsulationEra", eras);
        out.put("headline", "서울 아파트 " + out.get("totalComplexes") + "개 단지 중 "
                + out.get("uncertifiedComplexes") + "개("
                + (100.0 - (Double) out.get("certifiedRatio")) + "%)가 에너지효율등급 인증 이력이 없습니다.");
        return out;
    }

    /** limit 최대 500. 한 동네 전체를 훑어보는 정도는 한 번에 받아갈 수 있어야 합니다. */
    @GetMapping("/api/apt/search")
    public Map<String, Object> search(@RequestParam String q,
                                      @RequestParam(required = false, defaultValue = "20") int limit) {
        ApartmentService.SearchResult r = service.search(q, Math.max(1, Math.min(500, limit)));

        List<Map<String, Object>> items = new ArrayList<>();
        for (Apartment a : r.items()) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("aptCode", a.getAptCode());
            one.put("name", a.getName());
            one.put("address", a.getRoadAddress());
            one.put("sgg", a.getSgg());
            one.put("emd", a.getEmd());
            one.put("completionYear", a.getCompletionYear());
            one.put("insulationEra", a.getInsulationEra());
            one.put("households", a.getHouseholds());
            one.put("certified", a.getCertified());
            items.add(one);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("query", q);
        out.put("total", r.total());              // 잘라내기 전 전체 건수
        out.put("count", items.size());           // 실제로 돌려준 건수
        out.put("truncated", r.total() > items.size());
        out.put("items", items);
        return out;
    }

    @GetMapping("/api/apt/{aptCode}")
    public Map<String, Object> detail(@PathVariable String aptCode) {
        Apartment a = service.byCode(aptCode);
        if (a == null) return Map.of("found", false);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("found", true);
        out.put("aptCode", a.getAptCode());
        out.put("name", a.getName());
        out.put("address", a.getRoadAddress());
        out.put("lat", a.getLat());
        out.put("lng", a.getLng());

        // ── 1. 확실한 것 ────────────────────────────────────────────────
        // 전부 공공데이터에 적혀 있는 값입니다. 추정이 하나도 섞여 있지 않습니다.
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("sgg", a.getSgg());
        facts.put("emd", a.getEmd());
        facts.put("completionYear", a.getCompletionYear());
        facts.put("insulationEra", a.getInsulationEra());
        facts.put("households", a.getHouseholds());
        facts.put("dongCount", a.getDongCount());
        facts.put("corridorType", a.getCorridorType());
        facts.put("heatingType", a.getHeatingType());
        facts.put("grossFloorArea", a.getGrossFloorArea());
        facts.put("builder", a.getBuilder());
        facts.put("complexType", a.getComplexType());
        facts.put("source", "서울시 공동주택(K-apt) 정보");
        out.put("facts", facts);

        // 준공연도로 적용 단열기준이 정해집니다. 이건 통계가 아니라 법령입니다.
        // 추정 근거 중 유일하게 "확실한" 축이라 따로 빼서 강조합니다.
        if (a.getInsulationEra() != null) {
            int[] cov = service.coverageOf(a.getInsulationEra());
            Map<String, Object> era = new LinkedHashMap<>();
            era.put("name", a.getInsulationEra());
            era.put("basis", "「건축물의 에너지절약설계기준」 개정 연혁 — 준공 시점에 적용된 단열 규정");
            era.put("seoulTotal", cov[0]);
            era.put("seoulCertified", cov[1]);
            era.put("certifiedPct", cov[0] == 0 ? 0 : Math.round(cov[1] * 1000.0 / cov[0]) / 10.0);
            era.put("note", "같은 시기에 지어진 서울 아파트 " + cov[0] + "개 중 "
                    + cov[1] + "개만 인증 이력이 있습니다.");
            out.put("insulationEra", era);
        }

        // ── 2. 실측 (인증받은 단지만) ────────────────────────────────────
        if (a.getCertified() && a.getEnergyValue() != null) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("energyValue", a.getEnergyValue());
            m.put("grade", GradeTable.labelOf(a.getEnergyValue(), "주거용"));
            m.put("gradeCode", GradeTable.codeOf(a.getEnergyValue(), "주거용"));
            m.put("certCount", a.getCertCount());
            m.put("matchedBy", a.getMatchedBy());
            m.put("labelSource", a.getLabelSource());
            // 등급 중앙값으로 채운 라벨은 정밀도가 낮습니다. 화면에서 구분해 표시하세요.
            m.put("precise", "인증 실적 1차에너지소요량".equals(a.getLabelSource()));
            m.put("source", "한국에너지공단 건축물 에너지효율등급 인증 실적 · 인증현황");
            out.put("measured", m);
            out.put("estimate", null);
            out.put("estimateSkipped", "인증 이력이 있어 추정하지 않습니다. 위 값은 실제 인증값입니다.");
            return out;
        }

        out.put("measured", null);

        // ── 3. 추정 ─────────────────────────────────────────────────────
        //
        // 학습된 모델이 예측값을 내지만, 그 값을 **말해도 되는지**는 따로 판단합니다.
        // 교차검증으로 잰 시기별 오차가 등급 한 칸(30~40 kWh)보다 크면 등급을 말하지 않습니다.
        // 예측값이 있다는 것과 그 예측을 믿어도 된다는 것은 다른 문제입니다.

        Double pred = model.predict(a.getAptCode());
        ModelService.Gate gate = model.gateOf(a.getInsulationEra());

        if (pred == null || gate == null || "refuse".equals(gate.getPolicy())) {
            out.put("estimate", null);
            out.put("estimateSkipped", gate != null ? gate.getReason()
                    : "이 단지의 속성으로는 예측할 수 없습니다");
            out.put("modelGate", gateInfo(gate));
            out.put("whatWeCanSay", cannotEstimate(a));
            return out;
        }

        boolean pointOk = "point".equals(gate.getPolicy());
        double mae = gate.getMae() == null ? 40.0 : gate.getMae();
        double lo = Math.max(0, pred - mae), hi = pred + mae;

        Map<String, Object> est = new LinkedHashMap<>();
        est.put("policy", gate.getPolicy());                 // point / range
        est.put("energyPredicted", round(pred));
        est.put("energyLow", round(lo));
        est.put("energyHigh", round(hi));
        est.put("marginOfError", round(mae));                // ± 교차검증 평균오차

        // 값이 작을수록 좋은 등급이라, 에너지 하한이 곧 등급 상한입니다.
        est.put("gradeBest", GradeTable.codeOf(lo, "주거용"));
        est.put("gradeWorst", GradeTable.codeOf(hi, "주거용"));
        est.put("grade", pointOk ? GradeTable.codeOf(pred, "주거용") : null);
        est.put("presentation", pointOk
                ? "등급으로 표시해도 됩니다. 단, ± 오차를 반드시 같이 적으세요."
                : "특정 등급으로 단정하지 마세요. 범위로만 표시합니다.");

        est.put("model", gateInfo(gate));
        est.put("modelMethod", model.method());
        est.put("modelFeatures", model.features());

        // 또래 정보는 보조로 남깁니다. 모델이 무엇을 보고 판단했는지 사람이 납득하는 데 씁니다.
        ApartmentService.Peers peers = service.peersOf(a);
        if (peers.found()) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("level", peers.level());
            p.put("label", peers.label());
            p.put("count", peers.values().size());
            p.put("median", round(peers.median()));
            p.put("iqr", round(peers.iqr()));
            est.put("peers", p);
        }

        // 건설사는 추정값을 바꾸지 않습니다. 신뢰도 보조 지표로만 씁니다.
        int bc = service.builderCerts(a.getBuilder());
        Map<String, Object> builder = new LinkedHashMap<>();
        builder.put("name", a.getBuilder());
        builder.put("certifiedComplexes", bc);
        builder.put("effect", "추정값에는 반영하지 않습니다. 같은 건설사의 인증 사례가 많을수록 "
                + "시공 특성을 참고할 근거가 늘어난다는 의미로만 씁니다.");
        est.put("builder", builder);

        est.put("disclaimer", "인증 이력이 없는 단지의 추정입니다. 공식 등급이 아닙니다.");
        out.put("estimate", est);

        if (peers.found()) {
            out.put("confidence", Confidence.of(
                    peers.values().size(), gradeHistogram(peers.values()), 0));
        }
        return out;
    }

    /** 이 시기의 모델이 얼마나 믿을 만한지. 화면에 그대로 띄우라고 만든 묶음입니다. */
    private static Map<String, Object> gateInfo(ModelService.Gate g) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (g == null) {
            m.put("policy", "refuse");
            m.put("reason", "이 시기에 대한 검증 결과가 없습니다");
            return m;
        }
        m.put("policy", g.getPolicy());
        m.put("validationSamples", g.getN());
        m.put("mae", g.getMae());
        m.put("reason", g.getReason());
        m.put("basis", "5-fold 교차검증으로 측정한 이 시기의 평균 절대오차입니다. "
                + "등급 한 칸의 폭(30~40 kWh/m²·yr)과 비교해 판단합니다.");
        return m;
    }

    /**
     * 추정을 낼 수 없을 때 대신 할 수 있는 말.
     *
     * 빈 화면을 주면 안 됩니다. 못 하는 이유가 곧 이 서비스의 문제 제기이므로,
     * 그것을 그대로 콘텐츠로 내보냅니다.
     */
    private Map<String, Object> cannotEstimate(Apartment a) {
        Map<String, Object> out = new LinkedHashMap<>();
        List<String> can = new ArrayList<>();

        if (a.getInsulationEra() != null) {
            int[] cov = service.coverageOf(a.getInsulationEra());
            can.add("이 단지는 " + a.getCompletionYear() + "년 준공으로 "
                    + a.getInsulationEra() + "이 적용되었습니다. 이건 추정이 아니라 법령입니다.");
            can.add("같은 시기 서울 아파트 " + cov[0] + "개 중 인증받은 곳은 "
                    + cov[1] + "개뿐입니다. 비교할 사례 자체가 없습니다.");
        }
        if (a.getCorridorType() != null) {
            can.add("복도유형 " + a.getCorridorType() + " · 난방방식 " + a.getHeatingType()
                    + " · " + a.getHouseholds() + "세대 — 개선 항목을 고르는 데는 이 정보로 충분합니다.");
        }
        can.add("실제 사용량은 별도로 확인할 수 있습니다. 인증이 없어도 "
                + "국토교통부가 이 지번의 월별 전기·가스 사용량을 공개합니다.");

        out.put("points", can);
        out.put("nextStep", "usage");   // 화면에서 /api/usage 로 유도하라는 신호
        return out;
    }

    /** 또래 값들을 등급 코드별 개수로. Confidence 가 분포 집중도를 계산하는 데 씁니다. */
    private static Map<String, Integer> gradeHistogram(List<Double> values) {
        Map<String, Integer> hist = new LinkedHashMap<>();
        for (Double v : values) {
            String code = GradeTable.codeOf(v, "주거용");
            hist.merge(code + "등급", 1, Integer::sum);
        }
        return hist;
    }

    private static double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
