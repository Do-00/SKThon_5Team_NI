package com.greenremodel.beec;

/**
 * 건축물 에너지효율등급 기준표.
 *
 * seed.json 을 만들 때 쓴 것과 같은 기준입니다.
 * 실제로 seed.json 의 150개 그룹에서 중앙값과 estimatedGrade 를 대조해 경계를 역산해보면
 *   주거용   : 1+ ~105.8 · 1등급 123.9~ · 2등급 150.2~ · 3등급 192.8~
 *   비주거용 : 1++ ~91.3 · 1+ 140.2~ · 1등급 235.1~
 * 로 아래 표와 일치합니다.
 *
 * 시뮬레이터가 "개선 후 에너지값" 을 등급으로 바꿀 때 필요해서 자바 쪽에도 둡니다.
 * seed.json 의 estimatedGrade 와 같은 값이 나오므로 성적표와 시뮬레이터의 등급이 어긋나지 않습니다.
 */
public final class GradeTable {

    private GradeTable() {}

    /** 구간은 [min, max) 반열린구간. max 가 null 이면 상한 없음. */
    private record Band(String code, double min, Double max) {}

    /** 주거용 (공동주택 기준) */
    private static final Band[] RESIDENTIAL = {
            new Band("1+++",   0.0,  60.0),
            new Band("1++",   60.0,  90.0),
            new Band("1+",    90.0, 120.0),
            new Band("1",    120.0, 150.0),
            new Band("2",    150.0, 190.0),
            new Band("3",    190.0, 230.0),
            new Band("4",    230.0, 270.0),
            new Band("5",    270.0, 320.0),
            new Band("6",    320.0, 370.0),
            new Band("7",    370.0, null)
    };

    /** 주거용 이외 (업무시설 등) */
    private static final Band[] NON_RESIDENTIAL = {
            new Band("1+++",   0.0,  80.0),
            new Band("1++",   80.0, 140.0),
            new Band("1+",   140.0, 200.0),
            new Band("1",    200.0, 260.0),
            new Band("2",    260.0, 320.0),
            new Band("3",    320.0, 380.0),
            new Band("4",    380.0, 450.0),
            new Band("5",    450.0, 520.0),
            new Band("6",    520.0, 610.0),
            new Band("7",    610.0, null)
    };

    private static Band[] tableOf(String purpose) {
        if (purpose == null) return RESIDENTIAL;
        String p = purpose.trim();
        if ("주거용".equals(p)) return RESIDENTIAL;
        return NON_RESIDENTIAL;   // "주거용 이외" · "비주거용"
    }

    /** 화면에 쓰는 등급 코드. 예: 주거용 173.7 -> "2" */
    public static String codeOf(double energy, String purpose) {
        for (Band b : tableOf(purpose)) {
            if (energy >= b.min() && (b.max() == null || energy < b.max())) return b.code();
        }
        return "7";
    }

    /** 사람이 읽는 표기. seed.json 의 estimatedGrade 와 같은 형식. 예: "2등급" */
    public static String labelOf(double energy, String purpose) {
        return codeOf(energy, purpose) + "등급";
    }

    /** "1+등급" -> "1+". 프론트가 변환 로직을 갖지 않도록 서버가 내보냅니다. */
    public static String toCode(String label) {
        if (label == null || label.isBlank()) return null;
        if ("등급외".equals(label)) return "등급외";   // "외" 만 남으면 의미가 사라지므로 원문 유지
        return label.replace("등급", "").trim();
    }

    /** 1 = 가장 좋음, 10 = 가장 나쁨. 개선 전후로 몇 단계 올랐는지 셀 때 씁니다. */
    public static int rankOf(String code) {
        String[] order = {"1+++", "1++", "1+", "1", "2", "3", "4", "5", "6", "7"};
        for (int i = 0; i < order.length; i++) if (order[i].equals(code)) return i + 1;
        return order.length;
    }
}
