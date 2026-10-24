package com.greenremodel.beec;

import java.util.List;
import java.util.Map;

public class SeedData {
    private String generatedAt;
    private Map<String, GroupInfo> groups;
    private Map<String, DistrictInfo> districtGroups;
    private List<BuildingRecord> buildings; // Map<String,Object> -> 타입 있는 DTO로 교체 (주소 매칭에 사용)

    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
    public Map<String, GroupInfo> getGroups() { return groups; }
    public void setGroups(Map<String, GroupInfo> groups) { this.groups = groups; }
    public Map<String, DistrictInfo> getDistrictGroups() { return districtGroups; }
    public void setDistrictGroups(Map<String, DistrictInfo> districtGroups) { this.districtGroups = districtGroups; }
    public List<BuildingRecord> getBuildings() { return buildings; }
    public void setBuildings(List<BuildingRecord> buildings) { this.buildings = buildings; }
}
