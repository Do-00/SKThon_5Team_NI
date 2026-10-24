package com.greenremodel.beec;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class ReportController {

    /**
     * 이 엔드포인트(/api/report, 또래 집단 추정)는 공동주택(주거용)만 다룹니다.
     *
     * 서비스 전체는 2026-10-24 부터 모든 건축물을 다룹니다. 다만 아파트 밖의 건물은 이 엔드포인트가 아니라
     * 프론트의 src/lib/building-registry.ts 가 건축물대장 표제부 + 전국 인증현황(용도·시기·규모 비교)으로 판단합니다.
     * 여기서 주거용으로 고정하는 이유는 그대로입니다 — 용도가 섞이면 등급 구간표부터 달라서
     * "유사하다"는 말의 근거가 사라집니다.
     */
    static final String SUPPORTED_PURPOSE = "주거용";

    /**
     * 아파트(주거용)인가.
     *
     * ⚠️ startsWith 를 쓰면 안 됩니다. seed 의 purpose 값은 "주거용" 과 "주거용 이외" 인데
     *    "주거용 이외".startsWith("주거용") 이 true 라서, 걸러낸다고 짜 놓고 전부 통과시키게 됩니다.
     *    (실제로 35,521건 중 21,676건이 비주거용인데 한 건도 걸러지지 않았습니다.)
     *    반드시 정확히 같은지로 비교합니다.
     */
    static boolean isApartment(String purpose) {
        return purpose != null && SUPPORTED_PURPOSE.equals(purpose.trim());
    }

    private final SeedDataService seedDataService;

    public ReportController(SeedDataService seedDataService) {
        this.seedDataService = seedDataService;
    }

    /**
     * 인증 이력이 없는 건물의 등급 추정.
     *
     * purpose 는 받되 무시하고 항상 주거용으로 고정합니다. 아파트만 다루기로 했으니
     * 호출부가 실수로 다른 값을 보내도 비교 집단이 어긋나지 않게 서버에서 막습니다.
     * (파라미터를 없애지 않은 것은 프론트·MSW 픽스처가 이미 보내고 있어서입니다.)
     */
    @GetMapping("/api/report")
    public Map<String, Object> getReport(
            @RequestParam String region,
            @RequestParam(required = false) String purpose,
            @RequestParam String sizeBucket,
            // ↓ 사용자가 직접 확인해 주는 보정 입력. 전부 선택값이고, 없으면 예전과 똑같이 동작합니다.
            @RequestParam(required = false) Integer completionYear,
            @RequestParam(required = false) String heatingType,
            @RequestParam(required = false) String windowState) {

        GroupInfo group = seedDataService.findGroup(SUPPORTED_PURPOSE, region, sizeBucket);

        if (group == null) {
            return Map.of("found", false, "message", "해당 조건의 데이터가 없습니다");
        }

        String key = seedDataService.findGroupKey(SUPPORTED_PURPOSE, region, sizeBucket);
        String label = (key == null) ? "" : key.replace("|", " ");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("found", true);
        out.put("sampleCount", group.getCount());
        out.put("estimatedGrade", group.getEstimatedGrade());
        out.put("gradeDistribution", group.getGradeDistribution());
        out.put("lowSample", group.isLowSample());
        // 아래는 추가 필드. 기존 필드는 그대로 둡니다.
        out.put("gradeCode", GradeTable.toCode(group.getEstimatedGrade()));  // "1+등급" -> "1+"
        out.put("primaryEnergyKwh", group.getMedianValue());                 // 시뮬레이터의 baseEnergy
        out.put("groupKey", key);
        out.put("scopeLabel", label);

        // ── 여기부터가 "조회기" 와 "추정 모델" 을 가르는 부분입니다 ──────────────
        //
        // 위의 estimatedGrade 는 또래 집단의 대표값입니다. 그것만 내보내면 조회기입니다.
        // 아래에서 (1) 사용자가 확인해 준 정보로 값을 좁히고 (2) 얼마나 믿을 만한지를
        // 근거와 함께 같이 내보냅니다. 화면에서는 둘을 반드시 같이 보여주세요.

        Adjustment.Result adj = Adjustment.apply(
                group.getMedianValue(), completionYear, heatingType, windowState);

        out.put("baseEnergyKwh", group.getMedianValue());       // 보정 전 (또래 집단 대표값)
        out.put("adjustedEnergyKwh", adj.energy());             // 보정 후
        out.put("adjustedGrade", GradeTable.labelOf(adj.energy(), SUPPORTED_PURPOSE));
        out.put("adjustedGradeCode", GradeTable.codeOf(adj.energy(), SUPPORTED_PURPOSE));
        out.put("adjustments", adj.steps());                    // 무엇이 왜 얼마나 반영됐는지
        out.put("insulationEra", adj.era());                    // 준공연도 → 적용 단열기준 시기

        out.put("confidence", Confidence.of(
                group.getCount(), group.getGradeDistribution(), adj.inputCount()));

        return out;
    }

    // 동네 비교 지도 기능용 - name은 seed.json districtGroups 키(예: "은평구", "마곡지구")와 동일해야 함
    // purpose 는 받되 무시하고 주거용으로 고정합니다 (아파트 한정).
    // 아파트 등급을 업무시설이 섞인 평균과 비교하면 "동네 비교" 라는 말 자체가 성립하지 않습니다.
    @GetMapping("/api/district")
    public Map<String, Object> getDistrict(
            @RequestParam String name,
            @RequestParam(required = false) String purpose) {

        DistrictInfo info = seedDataService.findDistrictGroup(name, SUPPORTED_PURPOSE);

        if (info == null) {
            return Map.of("found", false, "message", "해당 동네 데이터가 없습니다");
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("found", true);
        out.put("name", name);
        out.put("region", info.getRegion());
        out.put("purpose", SUPPORTED_PURPOSE);
        out.put("sampleCount", info.getCount());
        out.put("representativeGrade", info.getRepresentativeGrade());
        out.put("gradeDistribution", info.getGradeDistribution());
        out.put("lowSample", info.isLowSample());
        out.put("gradeCode", GradeTable.toCode(info.getRepresentativeGrade()));
        return out;
    }

    // 주소 실측 매칭용 - 카카오(다음) 우편번호 서비스 oncomplete 결과를 그대로 넘기면 됨
    @GetMapping("/api/match")
    public Map<String, Object> matchAddress(
            @RequestParam(required = false) String jibunAddress,
            @RequestParam(required = false) String roadAddress,
            @RequestParam(required = false) String buildingName) {

        BuildingRecord matched = seedDataService.findBuildingByAddress(jibunAddress, roadAddress, buildingName);

        if (matched == null) {
            return Map.of("found", false);
        }

        double energy = matched.getEnergyValue();
        String purpose = matched.getPurpose();

        // 아파트가 아니면 여기서 끊습니다. 등급을 계산해 보여줄 수는 있지만,
        // 비교할 또래 집단도 실사용량 데이터도 없는 채로 숫자만 내보내는 것이
        // 바로 "근거 없는 추정" 입니다. 무엇을 모르는지 말하는 편이 낫습니다.
        if (!isApartment(purpose)) {
            Map<String, Object> no = new LinkedHashMap<>();
            no.put("found", false);
            no.put("outOfScope", true);
            no.put("purpose", purpose);
            no.put("message", "현재 아파트(공동주택)만 지원합니다. "
                    + "단독주택·빌라·비주거용 건물은 인증 실적과 공개 사용량 데이터가 모두 부족해 "
                    + "신뢰할 수 있는 추정을 낼 수 없습니다.");
            return no;
        }

        // 등급을 한 기준으로 통일합니다.
        //
        // 인증서에 적힌 등급은 "인증 시점의 고시" 기준입니다. 고시가 여러 번 강화돼서
        // 지금 기준표로 다시 계산하면 44.8% 가 어긋납니다. (인증서 1++ → 현행 1+ 가 3,446건)
        // 화면 배지는 인증서 등급을 쓰고 시뮬레이터는 에너지값으로 계산하면,
        // 아무것도 안 눌렀는데 등급이 한 칸 달라져 보입니다.
        //
        // 그래서 grade/gradeCode 는 현행 기준표로 계산한 값으로 내보내고,
        // 인증서 원본은 certGrade 로 따로 실어 보냅니다. 정보가 사라지지 않습니다.
        String tableGrade = (energy > 0) ? GradeTable.labelOf(energy, purpose) : null;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("found", true);
        out.put("name", matched.getName() == null ? "" : matched.getName());
        out.put("grade", tableGrade);                                   // 현행 기준표
        out.put("gradeCode", GradeTable.toCode(tableGrade));
        out.put("certGrade", matched.getGrade());                       // 인증서 원본
        out.put("certGradeCode", GradeTable.toCode(matched.getGrade()));
        out.put("energyValue", energy > 0 ? energy : null);             // 값이 없으면 0 이 아니라 null
        out.put("primaryEnergyKwh", energy > 0 ? energy : null);        // 시뮬레이터의 baseEnergy
        out.put("purpose", purpose);
        out.put("region", matched.getRegion());
        out.put("district", matched.getDistrict());
        out.put("certKind", matched.getCertKind() == null ? "" : matched.getCertKind());
        return out;
    }
}