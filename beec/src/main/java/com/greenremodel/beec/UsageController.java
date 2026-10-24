package com.greenremodel.beec;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ⑥ 실사용량 — 추정 옆에 실측을 놓는 엔드포인트.
 *
 * 지금까지의 성적표는 전부 추정이었습니다. 같은 용도·지역·규모 건물들의 인증 실적 평균이요.
 * 여기서는 그 건물이 **실제로 쓴** 전기·가스를 국토부 데이터에서 가져옵니다.
 * 가스는 난방입니다. 그래서 이 숫자는 곧 난방비가 되고, 사용자가 이 서비스를 쓸 이유가 됩니다.
 *
 * 절대 원칙: 이 기능이 실패해도 성적표는 멀쩡해야 합니다.
 * 키가 없든, 공공데이터포털이 느리든, 그 지번에 데이터가 없든 전부 found:false 로 조용히 끝납니다.
 */
@RestController
@CrossOrigin(origins = "*")
public class UsageController {

    /**
     * 도시가스 소매요금 환산 계수 (원/kWh).
     *
     * 정확한 요금은 지역 도시가스사·용도·계절별로 다릅니다. 여기서는 "대략 이 정도 돈" 을
     * 보여주는 것이 목적이라 단일 계수를 씁니다. 화면에는 반드시 "대략" 이라고 적으세요 —
     * 정확한 고지서 금액인 척하면 그게 바로 교수님이 지적한 "근거 없음" 이 됩니다.
     */
    private static final double GAS_WON_PER_KWH = 110.0;
    private static final double ELEC_WON_PER_KWH = 140.0;

    private final LegalCodeResolver resolver;
    private final BuildingEnergyClient energy;
    private final SeedDataService seedDataService;

    public UsageController(LegalCodeResolver resolver,
                           BuildingEnergyClient energy,
                           SeedDataService seedDataService) {
        this.resolver = resolver;
        this.energy = energy;
        this.seedDataService = seedDataService;
    }

    /**
     * /api/usage?address=서울 강서구 화곡동 23-191&months=12
     *
     * found:false 인 경우와 그 이유를 reason 에 적어 보냅니다.
     * 데모 중 "왜 안 나오지" 를 콘솔 없이 판단하기 위해서입니다.
     */
    @GetMapping("/api/usage")
    public Map<String, Object> usage(
            @RequestParam String address,
            @RequestParam(required = false, defaultValue = "12") int months) {

        Map<String, Object> out = new LinkedHashMap<>();

        if (!resolver.isConfigured()) {
            return notFound(out, "카카오 REST 키가 설정되지 않았습니다 (kakao.rest.key)");
        }
        if (!energy.isConfigured()) {
            return notFound(out, "공공데이터포털 인증키가 설정되지 않았습니다 (datagokr.service.key)");
        }

        LegalCodeResolver.Lot lot = resolver.resolve(address);
        if (lot == null) {
            return notFound(out, "주소에서 법정동코드를 찾지 못했습니다 (지번 주소가 아닐 수 있습니다)");
        }

        List<BuildingEnergyClient.MonthUsage> rows = energy.recentUsage(lot, Math.max(1, Math.min(24, months)));
        if (rows.isEmpty()) {
            // 이 경우가 오히려 이야깃거리입니다. 단독주택과 200세대 미만 공동주택은
            // 애초에 이 데이터에 없습니다. 인증도 없고 실사용량도 없는 건물이라는 뜻입니다.
            Map<String, Object> r = notFound(out, "이 지번에는 공개된 사용량 데이터가 없습니다 "
                    + "(단독주택·200세대 미만 공동주택은 수집 대상에서 제외됩니다)");
            r.put("lot", lot.toMap());
            return r;
        }

        double elecTotal = 0, gasTotal = 0;
        int elecMonths = 0, gasMonths = 0;
        List<Map<String, Object>> series = new ArrayList<>();

        for (BuildingEnergyClient.MonthUsage m : rows) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("ym", m.ym());
            one.put("elecKwh", m.elecKwh());
            one.put("gasKwh", m.gasKwh());
            one.put("isWinter", isWinter(m.ym()));
            series.add(one);

            if (m.elecKwh() != null) { elecTotal += m.elecKwh(); elecMonths++; }
            if (m.gasKwh() != null) { gasTotal += m.gasKwh(); gasMonths++; }
        }

        out.put("found", true);
        out.put("address", address);
        out.put("lot", lot.toMap());
        out.put("monthsReturned", rows.size());
        out.put("series", series);

        out.put("elecKwhTotal", elecMonths > 0 ? round(elecTotal) : null);
        out.put("gasKwhTotal", gasMonths > 0 ? round(gasTotal) : null);

        // 난방비. 이 서비스를 왜 쓰는지에 대한 답이 이 한 줄입니다.
        out.put("gasCostWon", gasMonths > 0 ? Math.round(gasTotal * GAS_WON_PER_KWH) : null);
        out.put("elecCostWon", elecMonths > 0 ? Math.round(elecTotal * ELEC_WON_PER_KWH) : null);
        out.put("costNote", "도시가스·전기 소매 평균 단가로 환산한 대략적인 금액입니다. 실제 고지서와 다를 수 있습니다.");

        // 겨울(12~2월) 가스만 따로. 난방 사용량에 가장 가깝습니다.
        double winterGas = 0;
        int winterMonths = 0;
        for (BuildingEnergyClient.MonthUsage m : rows) {
            if (m.gasKwh() != null && isWinter(m.ym())) { winterGas += m.gasKwh(); winterMonths++; }
        }
        out.put("winterGasKwh", winterMonths > 0 ? round(winterGas) : null);
        out.put("winterMonths", winterMonths);

        // 인증 데이터 쪽에서 이 건물을 찾아 추정 등급을 함께 담습니다.
        // 추정과 실측을 한 응답에 담아야 화면에서 둘을 나란히 놓을 수 있습니다.
        BuildingRecord matched = seedDataService.findBuildingByAddress(address, address, null);
        if (matched != null && matched.getEnergyValue() > 0) {
            Map<String, Object> est = new LinkedHashMap<>();
            est.put("grade", GradeTable.labelOf(matched.getEnergyValue(), matched.getPurpose()));
            est.put("gradeCode", GradeTable.codeOf(matched.getEnergyValue(), matched.getPurpose()));
            est.put("primaryEnergyKwh", matched.getEnergyValue());
            est.put("source", "한국에너지공단 건축물 에너지효율등급 인증 실적");
            out.put("estimate", est);
        } else {
            out.put("estimate", null);
        }

        out.put("usageSource", "국토교통부 건축HUB 건물에너지정보 (전기·가스 월별 사용량)");
        return out;
    }

    /**
     * /api/usage/probe?address=...&ym=202512
     *
     * 오퍼레이션 경로·파라미터가 공개 문서에 없어서 만든 진단용입니다.
     * 후보 조합을 전부 호출하고 status 와 응답 앞부분을 그대로 돌려줍니다.
     * 어떤 줄에서 status 200 에 sum 이 숫자로 나오면 그 조합이 정답입니다.
     * 찾으면 application.properties 에 적어 고정하세요:
     *   datagokr.bldengy.base=...
     *   datagokr.bldengy.elec=...
     *   datagokr.bldengy.gas=...
     */
    @GetMapping("/api/usage/probe")
    public Map<String, Object> probe(
            @RequestParam String address,
            @RequestParam(required = false) String ym) {

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("kakaoConfigured", resolver.isConfigured());
        out.put("datagokrConfigured", energy.isConfigured());

        LegalCodeResolver.Lot lot = resolver.resolve(address);
        out.put("lot", lot == null ? null : lot.toMap());
        if (lot == null) {
            out.put("hint", "카카오가 이 주소를 지번으로 해석하지 못했습니다. 더 단순한 지번 주소로 시도해보세요.");
            return out;
        }

        String target = (ym == null || ym.isBlank())
                ? YearMonth.now().minusMonths(3).toString().replace("-", "")
                : ym;
        out.put("ym", target);
        out.put("results", energy.probe(lot, target));
        out.put("hint", "status 200 이고 sum 이 null 이 아닌 줄의 base/op 를 properties 에 적으세요.");
        return out;
    }

    private static Map<String, Object> notFound(Map<String, Object> out, String reason) {
        out.put("found", false);
        out.put("reason", reason);
        return out;
    }

    /** 12·1·2월을 난방 성수기로 봅니다. */
    private static boolean isWinter(String ym) {
        if (ym == null || ym.length() < 6) return false;
        String mm = ym.substring(4, 6);
        return mm.equals("12") || mm.equals("01") || mm.equals("02");
    }

    private static double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
