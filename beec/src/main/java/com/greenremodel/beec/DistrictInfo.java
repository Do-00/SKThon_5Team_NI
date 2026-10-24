package com.greenremodel.beec;

import java.util.Map;

public class DistrictInfo {
    private String region;
    private int count;
    private String representativeGrade;
    private Map<String, Integer> gradeDistribution;
    private boolean lowSample;

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
    public String getRepresentativeGrade() { return representativeGrade; }
    public void setRepresentativeGrade(String representativeGrade) { this.representativeGrade = representativeGrade; }
    public Map<String, Integer> getGradeDistribution() { return gradeDistribution; }
    public void setGradeDistribution(Map<String, Integer> gradeDistribution) { this.gradeDistribution = gradeDistribution; }
    public boolean isLowSample() { return lowSample; }
    public void setLowSample(boolean lowSample) { this.lowSample = lowSample; }
}