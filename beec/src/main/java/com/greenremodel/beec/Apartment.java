package com.greenremodel.beec;

/**
 * 서울 아파트 한 단지. seoul-apartments.json 한 행.
 *
 * 두 공공데이터를 붙인 결과입니다.
 *   K-apt      → 준공연도·세대수·복도유형·난방방식·건설사·좌표  (속성)
 *   인증 실적  → energyValue                                  (정답, 8.9% 만 있음)
 *
 * certified 가 false 인 단지를 목록에서 빼지 않습니다.
 * 2,888개 중 2,631개가 비어 있다는 사실이 이 서비스가 존재하는 이유입니다.
 */
public class Apartment {

    private String aptCode;
    private String name;
    private String sgg;              // 시군구, 예: "강서구"
    private String emd;              // 읍면동, 예: "화곡동"
    private String roadAddress;
    private Double lat;
    private Double lng;

    private Integer completionYear;  // 사용승인연도
    private String insulationEra;    // 준공연도로 결정되는 적용 단열기준 시기 (추정 아님, 법령)
    private Integer households;      // 전체 세대수
    private String sizeBucket;       // 소형/중형/대형/초대형
    private Integer dongCount;
    private String corridorType;     // 계단식 / 복도식 / 혼합식 — 외피면적이 달라 에너지에 영향
    private String heatingType;      // 개별난방 / 지역난방 / 중앙난방
    private Double grossFloorArea;
    private Double residentialArea;
    private Integer parking;
    private String builder;          // 건설사(정규화). 신뢰도 보조 지표로만 씁니다
    private String complexType;      // 아파트 / 주상복합 등

    private boolean certified;       // 인증 이력이 있는가
    private int certCount;
    private Double energyValue;      // 있으면 실측 인증값. 없으면 null — 채우지 않습니다
    private String matchedBy;        // 어떻게 붙였는지 (동+이름 / 이름 / 이름부분)

    /**
     * 이 단지의 라벨이 어디서 왔는지.
     *   "인증 실적 1차에너지소요량" — 연속값. 정밀합니다.
     *   "인증등급 구간 중앙값"       — 등급만 있어 구간 중앙값으로 채운 값. ±15~25 kWh 내재 오차.
     *
     * 구분해 두는 이유는 모델 성능을 잴 때 연속값 표본에서만 재기 위해서입니다.
     * 등급 중앙값은 값이 10개로 양자화돼 있어, 그것까지 넣고 오차를 재면
     * 실제보다 정확해 보입니다.
     */
    private String labelSource;

    /**
     * 라벨을 뺀 이유. 뺐을 때만 값이 있습니다.
     *
     * 대표적으로 재건축입니다. 인증일자가 준공연도보다 15년 이상 늦으면 그 인증은
     * 원래 건물의 것이 아닙니다 — 재건축으로 새로 지은 건물의 인증값이 이름 매칭으로
     * 옛 단지에 붙은 것입니다. 1984년 준공 단지에 78.1 kWh(패시브 수준)가 붙어 있던 것이 그 예입니다.
     * 그대로 두면 모델이 "오래된 아파트일수록 효율이 좋다" 를 학습합니다.
     */
    private String excludedReason;

    public String getAptCode() { return aptCode; }
    public void setAptCode(String v) { this.aptCode = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getSgg() { return sgg; }
    public void setSgg(String v) { this.sgg = v; }
    public String getEmd() { return emd; }
    public void setEmd(String v) { this.emd = v; }
    public String getRoadAddress() { return roadAddress; }
    public void setRoadAddress(String v) { this.roadAddress = v; }
    public Double getLat() { return lat; }
    public void setLat(Double v) { this.lat = v; }
    public Double getLng() { return lng; }
    public void setLng(Double v) { this.lng = v; }

    public Integer getCompletionYear() { return completionYear; }
    public void setCompletionYear(Integer v) { this.completionYear = v; }
    public String getInsulationEra() { return insulationEra; }
    public void setInsulationEra(String v) { this.insulationEra = v; }
    public Integer getHouseholds() { return households; }
    public void setHouseholds(Integer v) { this.households = v; }
    public String getSizeBucket() { return sizeBucket; }
    public void setSizeBucket(String v) { this.sizeBucket = v; }
    public Integer getDongCount() { return dongCount; }
    public void setDongCount(Integer v) { this.dongCount = v; }
    public String getCorridorType() { return corridorType; }
    public void setCorridorType(String v) { this.corridorType = v; }
    public String getHeatingType() { return heatingType; }
    public void setHeatingType(String v) { this.heatingType = v; }
    public Double getGrossFloorArea() { return grossFloorArea; }
    public void setGrossFloorArea(Double v) { this.grossFloorArea = v; }
    public Double getResidentialArea() { return residentialArea; }
    public void setResidentialArea(Double v) { this.residentialArea = v; }
    public Integer getParking() { return parking; }
    public void setParking(Integer v) { this.parking = v; }
    public String getBuilder() { return builder; }
    public void setBuilder(String v) { this.builder = v; }
    public String getComplexType() { return complexType; }
    public void setComplexType(String v) { this.complexType = v; }

    public boolean getCertified() { return certified; }
    public void setCertified(boolean v) { this.certified = v; }
    public int getCertCount() { return certCount; }
    public void setCertCount(int v) { this.certCount = v; }
    public Double getEnergyValue() { return energyValue; }
    public void setEnergyValue(Double v) { this.energyValue = v; }
    public String getMatchedBy() { return matchedBy; }
    public void setMatchedBy(String v) { this.matchedBy = v; }
    public String getLabelSource() { return labelSource; }
    public void setLabelSource(String v) { this.labelSource = v; }
    public String getExcludedReason() { return excludedReason; }
    public void setExcludedReason(String v) { this.excludedReason = v; }
}
