package com.greenremodel.beec;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 학습된 추정 모델의 예측값과 **말해도 되는 범위**.
 *
 * 모델은 Java 에서 돌리지 않습니다. model/train.py 로 오프라인에서 학습해 예측값을 미리 계산해 두고
 * 여기서는 읽기만 합니다. 2,888개 단지가 고정 집합이라 매 요청마다 계산할 이유가 없고,
 * 서버에 ML 런타임을 넣지 않는 편이 배포도 단순합니다.
 *
 * 이 클래스의 존재 이유는 예측값 조회가 아니라 **게이트** 입니다.
 *
 *   학습 표본 324개 중 222개(실측 연속값 223개 중 198개)가 2018년 이후 신축입니다. 그래서 모델은 신축을 잘 맞히고
 *   노후 아파트는 못 맞힙니다. 그걸 교차검증으로 시기별로 재 두었습니다.
 *
 *   등급 한 칸의 폭은 30~40 kWh/m²·yr 입니다. 평균오차가 그보다 크면 "몇 등급" 이라고
 *   말하는 순간 틀린 칸을 가리키게 됩니다. 그래서 시기별 오차에 따라
 *     point  — 등급을 말해도 됨 (오차 ≤ 30, 실측 검증 표본 8개 이상)
 *     range  — 범위로만 (오차 ≤ 45)
 *     refuse — 추정하지 않음 (오차가 더 크거나 검증 표본이 8개 미만)
 *   으로 나눠 두고, 화면은 이 판정을 그대로 따릅니다.
 *
 * 2,888개 중 인증이 없는 2,564개의 결과: point 198 · range 976 · 추정 안 함 1,390(예측값 없음 13 포함).
 * 인증 단지까지 합친 전체 2,888개 기준으로는 48% 에 등급을 내지 않습니다. 그게 이 데이터의 정직한 상태입니다.
 */
@Service
public class ModelService {

    public static class Gate {
        private int n;
        private int contN;       // 그중 연속값(1차에너지소요량) 라벨 수 — 성능을 이 표본에서만 잽니다
        private Double mae;
        private String policy;   // point / range / refuse
        private String reason;
        public int getN() { return n; }
        public void setN(int v) { this.n = v; }
        public int getContN() { return contN; }
        public void setContN(int v) { this.contN = v; }
        public Double getMae() { return mae; }
        public void setMae(Double v) { this.mae = v; }
        public String getPolicy() { return policy; }
        public void setPolicy(String v) { this.policy = v; }
        public String getReason() { return reason; }
        public void setReason(String v) { this.reason = v; }
    }

    public static class Payload {
        private Map<String, Object> overall;
        private Map<String, Gate> gate;
        private Map<String, Double> predictions;
        private java.util.List<String> features;
        private Map<String, Double> featureImportance;
        private String method;
        public Map<String, Double> getFeatureImportance() { return featureImportance; }
        public void setFeatureImportance(Map<String, Double> v) { this.featureImportance = v; }
        public Map<String, Object> getOverall() { return overall; }
        public void setOverall(Map<String, Object> v) { this.overall = v; }
        public Map<String, Gate> getGate() { return gate; }
        public void setGate(Map<String, Gate> v) { this.gate = v; }
        public Map<String, Double> getPredictions() { return predictions; }
        public void setPredictions(Map<String, Double> v) { this.predictions = v; }
        public java.util.List<String> getFeatures() { return features; }
        public void setFeatures(java.util.List<String> v) { this.features = v; }
        public String getMethod() { return method; }
        public void setMethod(String v) { this.method = v; }
    }

    private final JsonMapper jsonMapper;
    private Payload payload;
    private boolean available;

    public ModelService(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @PostConstruct
    public void load() {
        try (InputStream is = new ClassPathResource("model.json").getInputStream()) {
            payload = jsonMapper.readValue(is, Payload.class);
            available = true;
            System.out.println("[Model] 추정 모델 로드 — " + payload.getMethod()
                    + " / 전체 " + payload.getOverall());
            payload.getGate().forEach((era, g) ->
                    System.out.printf("    %-14s n=%4d MAE=%6s → %s%n",
                            era, g.getN(), String.valueOf(g.getMae()), g.getPolicy()));
        } catch (Exception e) {
            // 모델 파일이 없어도 서비스는 떠야 합니다. 추정만 빠지고 나머지는 그대로 동작합니다.
            available = false;
            System.out.println("[Model] model.json 을 읽지 못해 추정 기능 없이 기동합니다: " + e.getMessage());
        }
    }

    public boolean isAvailable() { return available; }

    public Map<String, Object> overall() {
        return available ? payload.getOverall() : Map.of();
    }

    public String method() { return available ? payload.getMethod() : null; }

    public java.util.List<String> features() {
        return available ? payload.getFeatures() : java.util.List.of();
    }

    public Double predict(String aptCode) {
        if (!available || aptCode == null) return null;
        return payload.getPredictions().get(aptCode);
    }

    public Gate gateOf(String era) {
        if (!available || era == null) return null;
        return payload.getGate().get(era);
    }

    /** 모델 성능을 화면·발표에 그대로 띄우기 위한 묶음. */
    public Map<String, Object> summary() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("available", available);
        if (!available) return out;
        out.put("method", payload.getMethod());
        out.put("features", payload.getFeatures());
        out.put("featureImportance", payload.getFeatureImportance());
        out.putAll(payload.getOverall());
        out.put("gate", payload.getGate());
        out.put("note", "5-fold 교차검증으로 측정한 값입니다. 성능은 1차에너지소요량이 있는 "
                + "표본에서만 측정합니다 — 인증등급 구간 중앙값으로 만든 라벨은 값이 10개로 "
                + "양자화돼 있어 그것까지 넣고 재면 실제보다 정확해 보입니다. "
                + "실제로 첫 학습 때 1987년 기준 시기는 전체로 재면 오차 33.5 인데 연속값으로만 재면 50.3 이라, "
                + "이 검증을 하지 않았다면 노후 아파트 1,088개에 틀린 등급을 줄 뻔했습니다.");
        return out;
    }
}
