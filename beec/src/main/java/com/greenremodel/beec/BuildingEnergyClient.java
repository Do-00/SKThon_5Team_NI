package com.greenremodel.beec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 국토교통부 건축HUB 건물에너지정보 — 지번 단위 월별 전기·가스 사용량(kWh).
 *
 * 이 데이터가 이 서비스에서 하는 일:
 *   지금까지 우리가 보여준 등급은 "같은 용도·지역·규모 건물들의 인증 실적 평균" 이었습니다.
 *   추정입니다. 이 API 는 그 건물이 **실제로 쓴 에너지** 를 돌려줍니다.
 *   추정 옆에 실측을 놓을 수 있게 되고, 가스 사용량은 그대로 난방비로 환산됩니다.
 *
 * 이 API 가 담지 않는 것 (그리고 그게 왜 중요한가):
 *   단독주택과 200세대 미만 공동주택은 아예 제외입니다.
 *   즉 빌라·단독은 인증 이력도 없고 실사용량 데이터도 없습니다.
 *   "인증 사각지대" 라는 우리 논점을 데이터 제공 범위가 그대로 증언해 줍니다.
 *
 * 엔드포인트를 상수로 박지 않은 이유:
 *   공공데이터포털이 공개하는 페이지에는 오퍼레이션 경로와 파라미터명이 없습니다(HWP 가이드 안에만 있습니다).
 *   그래서 후보를 여러 개 두고 /api/usage/probe 로 실제로 응답하는 조합을 찾아낸 뒤,
 *   properties 에 그 조합을 적어 고정하는 방식으로 만들었습니다.
 *   추측한 값을 코드에 박아두고 새벽에 디버깅하는 것보다 이쪽이 빠릅니다.
 */
@Service
public class BuildingEnergyClient {

    /** 한 달치 사용량. 전기·가스 중 한쪽만 있을 수 있어 둘 다 null 허용입니다. */
    public record MonthUsage(String ym, Double elecKwh, Double gasKwh) {}

    /**
     * 시도해 볼 (경로, 전기 오퍼레이션, 가스 오퍼레이션) 조합.
     * 위에서부터 순서대로 시도합니다. 실제로 도는 것을 찾으면 properties 에 적어 고정하세요.
     */
    private static final String[][] CANDIDATES = {
            {"https://apis.data.go.kr/1613000/BldEngyHubService", "getBeElctyUsgInfo", "getBeGasUsgInfo"},
            {"https://apis.data.go.kr/1613000/BldEngyService_v2", "getBeElctyUsgInfo", "getBeGasUsgInfo"},
            {"https://apis.data.go.kr/1611000/BldEngyService", "getBeElctyUsgInfo", "getBeGasUsgInfo"},
            {"https://apis.data.go.kr/1613000/BldEngyHubService", "getElctyUsgInfo", "getGasUsgInfo"},
    };

    private final JsonMapper json = JsonMapper.builder().build();

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    private final Map<String, List<MonthUsage>> cache = new ConcurrentHashMap<>();

    /** data.go.kr 일반 인증키. Decoding 키를 넣으세요 (Encoding 키면 %2B 가 이중 인코딩됩니다). */
    @Value("${datagokr.service.key:}")
    private String serviceKey;

    /** probe 로 찾은 조합을 여기에 적어 고정합니다. 비워두면 CANDIDATES 를 순서대로 시도합니다. */
    @Value("${datagokr.bldengy.base:}")
    private String fixedBase;
    @Value("${datagokr.bldengy.elec:}")
    private String fixedElecOp;
    @Value("${datagokr.bldengy.gas:}")
    private String fixedGasOp;

    public boolean isConfigured() {
        return serviceKey != null && !serviceKey.isBlank();
    }

    /**
     * 최근 {@code months} 개월의 월별 사용량. 최신 달이 앞에 옵니다.
     * 키가 없거나 조회가 실패하면 빈 목록입니다 — 예외를 던지지 않습니다.
     */
    public List<MonthUsage> recentUsage(LegalCodeResolver.Lot lot, int months) {
        if (lot == null || !isConfigured()) return List.of();

        String cacheKey = lot.sigunguCd() + lot.bjdongCd() + lot.bun() + lot.ji() + "|" + months;
        List<MonthUsage> hit = cache.get(cacheKey);
        if (hit != null) return hit;

        // 통계 확정까지 시차가 있어 최근 2개월은 비어 있는 경우가 많습니다. 두 달 전부터 셉니다.
        YearMonth start = YearMonth.now().minusMonths(2);

        Map<String, Double> elec = new LinkedHashMap<>();
        Map<String, Double> gas = new LinkedHashMap<>();

        for (String[] c : activeCandidates()) {
            elec.clear();
            gas.clear();
            for (int i = 0; i < months; i++) {
                String ym = start.minusMonths(i).toString().replace("-", "");
                Double e = fetchOne(c[0], c[1], lot, ym);
                Double g = fetchOne(c[0], c[2], lot, ym);
                if (e != null) elec.put(ym, e);
                if (g != null) gas.put(ym, g);
            }
            // 한 달이라도 잡히면 이 조합이 맞는 것입니다. 더 시도하지 않습니다.
            if (!elec.isEmpty() || !gas.isEmpty()) break;
        }

        List<MonthUsage> out = new ArrayList<>();
        for (int i = 0; i < months; i++) {
            String ym = start.minusMonths(i).toString().replace("-", "");
            Double e = elec.get(ym);
            Double g = gas.get(ym);
            if (e != null || g != null) out.add(new MonthUsage(ym, e, g));
        }
        cache.put(cacheKey, out);
        return out;
    }

    private List<String[]> activeCandidates() {
        List<String[]> list = new ArrayList<>();
        if (!fixedBase.isBlank() && !fixedElecOp.isBlank()) {
            list.add(new String[]{fixedBase, fixedElecOp, fixedGasOp.isBlank() ? fixedElecOp : fixedGasOp});
            return list;
        }
        for (String[] c : CANDIDATES) list.add(c);
        return list;
    }

    /** 한 달, 한 오퍼레이션. 합계 kWh 또는 null. */
    private Double fetchOne(String base, String op, LegalCodeResolver.Lot lot, String ym) {
        try {
            HttpResponse<String> res = call(base, op, lot, ym);
            if (res.statusCode() != 200) return null;
            return sumUsage(res.body());
        } catch (Exception e) {
            return null;
        }
    }

    HttpResponse<String> call(String base, String op, LegalCodeResolver.Lot lot, String ym) throws Exception {
        String url = base + "/" + op
                + "?serviceKey=" + URLEncoder.encode(serviceKey, StandardCharsets.UTF_8)
                + "&sigunguCd=" + lot.sigunguCd()
                + "&bjdongCd=" + lot.bjdongCd()
                + "&bun=" + lot.bun()
                + "&ji=" + lot.ji()
                + "&useYm=" + ym
                + "&numOfRows=100&pageNo=1&_type=json";

        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(6))
                .GET()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    /**
     * 응답에서 사용량 합계를 뽑습니다.
     *
     * 필드명을 하나로 못 박지 않은 이유는 공개 문서에 필드명이 없기 때문입니다.
     * useQty / usgQty / elctyUsgQty / gasUsgQty 중 무엇이 오든 잡도록 이름에 "qty" 가 들어간
     * 숫자 필드를 전부 더합니다. 한 지번에 여러 동이 있으면 그 합이 곧 그 지번의 사용량입니다.
     */
    private Double sumUsage(String body) {
        if (body == null || body.isBlank() || body.trim().startsWith("<")) return null;
        try {
            JsonNode items = json.readTree(body).path("response").path("body").path("items").path("item");
            if (items.isMissingNode() || items.isNull()) return null;

            double total = 0;
            boolean found = false;
            for (JsonNode item : items.isArray() ? items : List.of(items)) {
                for (Map.Entry<String, JsonNode> f : item.properties()) {
                    if (!f.getKey().toLowerCase().contains("qty")) continue;
                    JsonNode v = f.getValue();
                    if (v == null || v.isMissingNode() || v.isNull()) continue;
                    String s = v.asString();
                    String raw = (s == null ? "" : s).replaceAll("[,\\s]", "");
                    if (raw.isBlank()) continue;
                    try {
                        total += Double.parseDouble(raw);
                        found = true;
                    } catch (NumberFormatException ignored) {
                        // 숫자가 아닌 qty 필드는 건너뜁니다
                    }
                }
            }
            return found ? total : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * /api/usage/probe 용. 후보 조합을 전부 때려보고 각각 무엇이 돌아왔는지 그대로 보고합니다.
     * 어느 조합이 맞는지 사람이 눈으로 고르기 위한 것이라 응답 앞부분을 잘라서 같이 담습니다.
     */
    public List<Map<String, Object>> probe(LegalCodeResolver.Lot lot, String ym) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String[] c : CANDIDATES) {
            for (String op : new String[]{c[1], c[2]}) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("base", c[0]);
                row.put("op", op);
                try {
                    HttpResponse<String> res = call(c[0], op, lot, ym);
                    String body = res.body() == null ? "" : res.body();
                    row.put("status", res.statusCode());
                    row.put("sum", sumUsage(body));
                    row.put("bodyHead", body.length() > 400 ? body.substring(0, 400) : body);
                } catch (Exception e) {
                    row.put("status", -1);
                    row.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
                }
                out.add(row);
            }
        }
        return out;
    }
}
