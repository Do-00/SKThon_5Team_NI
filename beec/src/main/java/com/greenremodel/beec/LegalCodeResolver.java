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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 주소 → 법정동코드(시군구 5자리 + 법정동 5자리) + 번/지.
 *
 * 왜 필요한가:
 *   국토부 건축HUB 건물에너지정보 API 는 주소 문자열을 받지 않습니다.
 *   시군구코드·법정동코드·번·지 네 개로만 건물을 지목합니다.
 *   그런데 seed.json 에는 사람이 읽는 주소밖에 없습니다. 그 간극을 메우는 것이 이 클래스입니다.
 *
 * 왜 카카오인가:
 *   행정표준코드관리시스템의 법정동코드 전체자료(4만여 행)를 받아 넣는 방법도 있지만,
 *   그러면 "화곡동" 같은 동명 중복과 폐지된 코드를 직접 처리해야 합니다.
 *   카카오 로컬 주소검색은 주소 한 줄을 넣으면 b_code(법정동 10자리)와
 *   main_address_no/sub_address_no(번/지)를 한 번에 돌려줍니다. 이미 쓰고 있는 키라 추가 비용도 없습니다.
 *
 * 실패해도 조용히 null 입니다. 이 기능은 어디까지나 덤이고, 여기서 예외가 나서
 * 성적표 화면이 깨지는 일은 없어야 합니다.
 */
@Service
public class LegalCodeResolver {

    /** 주소 한 건의 해석 결과. 건축HUB 호출에 필요한 네 조각. */
    public record Lot(String sigunguCd, String bjdongCd, String bun, String ji, String matchedAddress) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sigunguCd", sigunguCd);
            m.put("bjdongCd", bjdongCd);
            m.put("bun", bun);
            m.put("ji", ji);
            m.put("matchedAddress", matchedAddress);
            return m;
        }
    }

    private final JsonMapper json = JsonMapper.builder().build();

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    // 같은 주소를 두 번 묻지 않습니다. 데모 중 같은 건물을 여러 번 열어도 호출은 한 번입니다.
    private final Map<String, Lot> cache = new ConcurrentHashMap<>();

    @Value("${kakao.rest.key:}")
    private String kakaoRestKey;

    public boolean isConfigured() {
        return kakaoRestKey != null && !kakaoRestKey.isBlank();
    }

    /** 주소 → Lot. 키가 없거나, 카카오가 못 찾거나, 지번 주소가 아니면 null. */
    public Lot resolve(String address) {
        if (address == null || address.isBlank() || !isConfigured()) return null;

        String key = address.trim();
        Lot hit = cache.get(key);
        if (hit != null) return hit;

        try {
            String url = "https://dapi.kakao.com/v2/local/search/address.json?query="
                    + URLEncoder.encode(key, StandardCharsets.UTF_8);

            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "KakaoAK " + kakaoRestKey)
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();

            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() != 200) return null;

            JsonNode docs = json.readTree(res.body()).path("documents");
            if (!docs.isArray() || docs.isEmpty()) return null;

            // address(지번) 가 있는 첫 결과를 씁니다. 도로명만 있는 결과에는 번/지가 없습니다.
            for (JsonNode doc : docs) {
                JsonNode a = doc.path("address");
                if (a.isMissingNode() || a.isNull()) continue;

                String bcode = text(a, "b_code");
                if (bcode.length() != 10) continue;

                String bun = text(a, "main_address_no");
                String ji = text(a, "sub_address_no");
                if (bun.isBlank()) continue;

                String matched = text(a, "address_name");

                Lot lot = new Lot(
                        bcode.substring(0, 5),
                        bcode.substring(5, 10),
                        pad4(bun),
                        pad4(ji.isBlank() ? "0" : ji),
                        matched.isBlank() ? key : matched);
                cache.put(key, lot);
                return lot;
            }
        } catch (Exception e) {
            // 네트워크·파싱 실패는 "모름" 으로 처리합니다. 던지지 않습니다.
        }
        return null;
    }

    /**
     * 문자열 필드를 안전하게 꺼냅니다.
     *
     * Jackson 3 에서 asText() 가 asString() 으로 바뀌었고 기본값 오버로드의 유무가 버전마다
     * 다릅니다. 여기서 직접 null/missing 을 걸러내면 그 차이에 기대지 않아도 됩니다.
     */
    private static String text(JsonNode parent, String field) {
        JsonNode n = parent.path(field);
        if (n.isMissingNode() || n.isNull()) return "";
        String s = n.asString();
        return s == null ? "" : s;
    }

    /** 건축HUB 는 번/지를 4자리 0채움으로 받습니다. "23" → "0023". */
    private static String pad4(String n) {
        String digits = n.replaceAll("\\D", "");
        if (digits.isBlank()) digits = "0";
        if (digits.length() >= 4) return digits;
        return "0".repeat(4 - digits.length()) + digits;
    }
}
