package com.greenremodel.beec;

import java.util.Map;

public class GroupInfo {
    private int count;
    private double medianValue;
    private String estimatedGrade;
    private Map<String, Integer> gradeDistribution;
    private boolean lowSample;

    // Jackson이 JSON 필드를 이 getter/setter 이름 보고 자동으로 채워줌
    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
    public double getMedianValue() { return medianValue; }
    public void setMedianValue(double medianValue) { this.medianValue = medianValue; }
    public String getEstimatedGrade() { return estimatedGrade; }
    public void setEstimatedGrade(String estimatedGrade) { this.estimatedGrade = estimatedGrade; }
    public Map<String, Integer> getGradeDistribution() { return gradeDistribution; }
    public void setGradeDistribution(Map<String, Integer> gradeDistribution) { this.gradeDistribution = gradeDistribution; }
    public boolean isLowSample() { return lowSample; }
    public void setLowSample(boolean lowSample) { this.lowSample = lowSample; }
}