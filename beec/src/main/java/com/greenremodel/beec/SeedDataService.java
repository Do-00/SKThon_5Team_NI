package com.greenremodel.beec;

import tools.jackson.databind.json.JsonMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SeedDataService {

    private final JsonMapper jsonMapper;
    private SeedData seedData;

    // 건물 자신의 주소에서 뽑은 동+번지 키 -> 그 키를 가진 건물들 (동일 지번 여러 동/호 대응)
    // 시작 시 한 번만 만들어두면 매 요청마다 전체 건물을 훑을 필요가 없고,
    // "완전히 같은 키"끼리만 비교하니 문자열 부분포함으로 인한 오매칭도 사라진다.
    private Map<String, List<BuildingRecord>> buildingsByDongJibunKey;

    /** 용도별 동네 통계. 주거용·전체는 아파트만, "주거용 이외"는 비주거 인증 실적으로 만듭니다. */
    private Map<String, Map<String, DistrictInfo>> districtByPurpose;

    /**
     * 걷어내기 **전**의 전체 동네 목록.
     *
     * 지도는 아파트 인증이 한 건도 없는 동네도 회색 점으로 찍어야 합니다.
     * 비주거용을 지운 뒤의 목록만 들고 있으면 그런 동네가 지도에서 통째로 사라지고,
     * 그러면 "인증 사각지대" 라는 우리 논점이 그림에서 없어집니다.
     * 통계는 아파트만 쓰되, 찍을 자리는 전국 전체를 기억해 둡니다.
     */
    private Map<String, DistrictInfo> districtUniverse;


    public SeedDataService(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @PostConstruct
    public void loadSeedData() throws Exception {
        try (InputStream is = new ClassPathResource("seed.json").getInputStream()) {
            seedData = jsonMapper.readValue(is, SeedData.class);
        }

        // seed.json 의 region 오류를 여기서 바로잡고 districtGroups 를 다시 만듭니다.
        // 파일은 건드리지 않습니다. 자세한 내용은 RegionFixer 주석 참고.
        RegionFixer.Result fix = RegionFixer.apply(seedData.getBuildings(), seedData.getDistrictGroups());
        System.out.println("[RegionFixer] region 보정 " + fix.corrected() + "건"
                + " (주소 " + fix.byAddress() + " · 시군구사전 " + fix.byLookup() + " · 기존유지 " + fix.kept() + ")"
                + " / districtGroups " + fix.districtGroups() + "개 재생성");
        // 걷어내기 전에 전국 동네 목록을 먼저 붙잡아 둡니다 (지도의 회색 점 자리).
        districtUniverse = new LinkedHashMap<>(seedData.getDistrictGroups());

        // ── 비주거용 제거 ────────────────────────────────────────────────
        //
        // 업무시설·판매시설을 아파트와 같은 통계에 섞으면 "유사한 건물" 이라는 말의 근거가
        // 사라집니다. 등급 구간표부터 다르고(주거용 60/90/120 vs 비주거용 80/140/200),
        // 국토부 실사용량 데이터도 주거용 위주로만 공개됩니다.
        // 엔드포인트에서 걸러내는 대신 여기서 통째로 지웁니다. 그래야 그룹·동네 통계가
        // 처음부터 아파트만으로 다시 계산되고, 어딘가에서 섞인 값이 새어 나올 구멍이 없습니다.
        //
        // seed.json 파일 자체는 건드리지 않습니다. 메모리에 올린 목록만 줄입니다.
        // 동네 비교 지도는 비주거 건물도 비주거 인증 실적끼리 비교합니다(2026-10-24 전체 건축물 확장).
        // 그래서 용도별 동네 통계만은 걷어내기 전 전체 목록으로 만듭니다. 그룹·매칭 통계는 아래에서 그대로 아파트만 씁니다.
        Map<String, Map<String, DistrictInfo>> allPurposes = RegionFixer.buildByPurpose(seedData.getBuildings());

        int before = seedData.getBuildings().size();
        List<BuildingRecord> apartments = seedData.getBuildings().stream()
                .filter(b -> ReportController.isApartment(b.getPurpose()))
                .collect(Collectors.toList());
        seedData.setBuildings(apartments);
        System.out.println("[Scope] 아파트 한정 — 전체 " + before + "건 중 주거용 "
                + apartments.size() + "건 유지, " + (before - apartments.size()) + "건 제외");

        districtByPurpose = RegionFixer.buildByPurpose(seedData.getBuildings());
        // 주거용·전체는 예전과 똑같이 아파트만으로 계산한 값을 쓰고, 비주거만 전체 목록에서 가져옵니다.
        Map<String, DistrictInfo> nonResidential = allPurposes.get("주거용 이외");
        if (nonResidential != null) districtByPurpose.put("주거용 이외", nonResidential);
        System.out.println("[RegionFixer] 동네 통계 — 아파트 "
                + districtByPurpose.getOrDefault("주거용", Map.of()).size() + "개 동네"
                + " / 지도에 찍을 전국 동네 " + districtUniverse.size() + "개");

        int groupCount = RegionFixer.rebuildGroups(seedData.getBuildings(), seedData.getGroups());
        System.out.println("[RegionFixer] groups " + groupCount + "개 재생성 (아파트 · 보정된 시도 기준)");

        buildingsByDongJibunKey = new HashMap<>();
        for (BuildingRecord b : seedData.getBuildings()) {
            String key = AddressUtil.extractDongJibunKey(b.getAddress());
            if (key != null) {
                buildingsByDongJibunKey.computeIfAbsent(key, k -> new ArrayList<>()).add(b);
            }
        }

        long matchableCount = buildingsByDongJibunKey.values().stream().mapToLong(List::size).sum();
        System.out.println("seed.json 로드 완료. 지역그룹 수: " + seedData.getGroups().size()
                + " / 구단위그룹 수: " + seedData.getDistrictGroups().size()
                + " / 건물 수: " + seedData.getBuildings().size()
                + " / 주소매칭 인덱싱된 건물 수: " + matchableCount
                + " / 동일키 그룹 수: " + buildingsByDongJibunKey.size());
    }

    private String normalizePurpose(String purpose) {
        if ("비주거용".equals(purpose)) return "주거용 이외";
        return purpose;
    }

    /**
     * 비교군 조회.
     *
     * 정확히 맞는 조합이 없으면 조용히 넓힙니다.
     *   {용도}|{시도}|{규모}  →  같은 용도·지역에서 표본이 가장 많은 규모  →  같은 용도 전체
     *
     * 조합이 170개인데 실제 그룹은 150개라 빈 칸이 있습니다.
     * 데모 중에 "데이터 없음" 이 뜨는 것을 막는 것이 목적입니다.
     */
    public GroupInfo findGroup(String purpose, String region, String sizeBucket) {
        String p = normalizePurpose(purpose);
        Map<String, GroupInfo> gs = seedData.getGroups();

        GroupInfo exact = gs.get(p + "|" + region + "|" + sizeBucket);
        if (exact != null) return exact;

        GroupInfo best = null;
        for (Map.Entry<String, GroupInfo> e : gs.entrySet()) {
            if (!e.getKey().startsWith(p + "|" + region + "|")) continue;
            if (best == null || e.getValue().getCount() > best.getCount()) best = e.getValue();
        }
        if (best != null) return best;

        for (Map.Entry<String, GroupInfo> e : gs.entrySet()) {
            if (!e.getKey().startsWith(p + "|")) continue;
            if (best == null || e.getValue().getCount() > best.getCount()) best = e.getValue();
        }
        return best;
    }

    /** 실제로 매칭된 그룹의 키. 화면에 "무엇을 기준으로 계산했는지" 를 띄우는 데 씁니다. */
    public String findGroupKey(String purpose, String region, String sizeBucket) {
        GroupInfo hit = findGroup(purpose, region, sizeBucket);
        if (hit == null) return null;
        for (Map.Entry<String, GroupInfo> e : seedData.getGroups().entrySet()) {
            if (e.getValue() == hit) return e.getKey();
        }
        return null;
    }

    public DistrictInfo findDistrictGroup(String district) {
        return seedData.getDistrictGroups().get(district);
    }

    /**
     * 용도를 지정한 동네 조회.
     * purpose 가 null·빈 값·"전체" 면 용도를 섞은 값을 돌려주므로 기존 findDistrictGroup 과 같습니다.
     */
    public DistrictInfo findDistrictGroup(String district, String purpose) {
        return districtGroupsOf(purpose).get(district);
    }

    /**
     * 지도에 찍을 전국 동네 목록 — 비주거용을 걷어내기 **전** 기준입니다.
     *
     * 아파트 인증이 한 건도 없는 동네까지 포함합니다. 통계값(등급)은 없지만 좌표는 있어야
     * 회색 점으로 찍히고, 전국 지도에서 수도권만 진하고 지방이 비어 보이는 그림이 완성됩니다.
     * 그 그림이 이 서비스의 논점입니다.
     */
    public Map<String, DistrictInfo> allDistrictGroups() {
        return districtUniverse != null ? districtUniverse : seedData.getDistrictGroups();
    }

    /**
     * 용도별 동네 통계.
     * purpose 가 null 이거나 "전체" 면 용도를 섞은 것을 돌려줍니다.
     * "비주거용" 으로 들어와도 실제 키인 "주거용 이외" 로 바꿔 찾습니다.
     */
    public Map<String, DistrictInfo> districtGroupsOf(String purpose) {
        if (districtByPurpose == null) return seedData.getDistrictGroups();
        String p = (purpose == null || purpose.isBlank()) ? "전체" : normalizePurpose(purpose);
        Map<String, DistrictInfo> hit = districtByPurpose.get(p);
        return hit != null ? hit : districtByPurpose.getOrDefault("전체", seedData.getDistrictGroups());
    }

    /**
     * 주소 기반 실측 매칭.
     * 1) 검색 주소에서 동+번지 키를 뽑아 "완전히 같은 키"를 가진 건물들만 후보로 삼는다
     *    (부분포함 검사가 아니라 정확히 같은 키 비교라서, "345-2"가 "345-24"에 잘못 걸리는 일이 없다).
     * 2) 후보가 여러 개(같은 지번에 동/호수가 여러 개인 단지 등)면 buildingName으로 먼저 좁힌다.
     * 3) 그래도 여러 개면 확정된 본인증을 우선한다. 그것도 없으면 첫 번째 후보.
     * 4) 동+번지 키 자체를 못 뽑았거나 매칭되는 후보가 없으면, 건물명 부분일치로 약하게 시도한다.
     */
    public BuildingRecord findBuildingByAddress(String jibunAddress, String roadAddress, String buildingName) {
        String key = AddressUtil.extractDongJibunKey(jibunAddress);
        if (key == null) {
            key = AddressUtil.extractDongJibunKey(roadAddress);
        }

        List<BuildingRecord> candidates = key != null
                ? buildingsByDongJibunKey.getOrDefault(key, List.of())
                : List.of();

        if (!candidates.isEmpty()) {
            if (buildingName != null && !buildingName.isBlank()) {
                String normName = AddressUtil.normalize(buildingName);
                List<BuildingRecord> nameFiltered = candidates.stream()
                        .filter(b -> b.getName() != null && AddressUtil.normalize(b.getName()).contains(normName))
                        .collect(Collectors.toList());
                if (!nameFiltered.isEmpty()) {
                    candidates = nameFiltered;
                }
            }
            return candidates.stream()
                    .filter(b -> "본인증".equals(b.getCertKind()))
                    .findFirst()
                    .orElse(candidates.get(0));
        }

        // 동+번지로 전혀 못 찾았을 때만 건물명 부분일치로 약하게 시도
        if (buildingName != null && !buildingName.isBlank()) {
            String normName = AddressUtil.normalize(buildingName);
            for (BuildingRecord b : seedData.getBuildings()) {
                if (b.getName() != null && AddressUtil.normalize(b.getName()).contains(normName)) {
                    return b;
                }
            }
        }
        return null;
    }
}