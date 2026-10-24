package com.greenremodel.beec;

public class BuildingRecord {
    private String rqid;
    private String name;
    private String address;
    private String purpose;
    private String region;
    private String grade;
    private boolean isEstimated;
    private double energyValue;
    private String groupKey;
    private String district;
    private String certKind;

    public String getRqid() { return rqid; }
    public void setRqid(String rqid) { this.rqid = rqid; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    // 주의: JSON 키가 "isEstimated"라서 표준 boolean 관례(isEstimated() -> "estimated")를 쓰면
    // Jackson이 프로퍼티명을 "estimated"로 인식해 항상 false로 깨진다.
    // get/set 이름을 그대로 "IsEstimated"로 둬서 JSON 키와 정확히 맞춘다.
    public boolean getIsEstimated() { return isEstimated; }
    public void setIsEstimated(boolean isEstimated) { this.isEstimated = isEstimated; }

    public double getEnergyValue() { return energyValue; }
    public void setEnergyValue(double energyValue) { this.energyValue = energyValue; }
    public String getGroupKey() { return groupKey; }
    public void setGroupKey(String groupKey) { this.groupKey = groupKey; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getCertKind() { return certKind; }
    public void setCertKind(String certKind) { this.certKind = certKind; }
}
