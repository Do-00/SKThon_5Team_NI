package com.greenremodel.beec;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AddressUtil {

    // "화정동 23-191" 처럼 동/리/가 이름 + 번지 패턴을 뽑아내기 위한 정규식 (지번주소 순서)
    private static final Pattern DONG_JIBUN =
            Pattern.compile("([가-힣0-9]+(동|리|가))\\s*([0-9]+(-[0-9]+)?)");

    // "테헤란로4길 39(역삼동)" 처럼 번지가 동 이름보다 앞에 오는 도로명주소 표기 (역순)
    // 정방향 패턴이 실패했을 때만 보조로 시도한다.
    private static final Pattern JIBUN_DONG_REVERSED =
            Pattern.compile("([0-9]+(-[0-9]+)?)\\s*\\(([가-힣0-9]+(동|리|가))\\)");

    public static String normalize(String address) {
        if (address == null) return "";
        return address.replaceAll("\\s+", "");
    }

    /**
     * "OO시 OO구 화정동 23-191" 같은 지번/도로명 주소에서
     * "화정동23-191" 형태의 매칭 키를 뽑는다. 못 뽑으면 null.
     * seed.json의 address 필드가 지번/도로명/장소명이 섞여 있어서
     * 완전 일치보다는 "동+번지 포함 여부"로 느슨하게 매칭한다.
     *
     * 1차: "동 번지" 정방향(지번주소 스타일)
     * 2차: "번지(동)" 역순(도로명주소 스타일, 예: "테헤란로4길 39(역삼동)")
     *      실제 데이터 기준 1차만 쓰면 56.9%만 잡히고, 2차를 보조로 쓰면 62.7%까지 올라감.
     * 그래도 못 잡는 나머지는 주소 자체에 동 정보가 없는(순수 도로명, 지구/단지명 등)
     * 경우라 정규식으로는 해결 불가 — 호출 측에서 null이면 /api/report 추정치로 폴백해야 함.
     */
    public static String extractDongJibunKey(String address) {
        if (address == null) return null;

        Matcher m = DONG_JIBUN.matcher(address);
        if (m.find()) {
            return normalize(m.group(1) + m.group(3));
        }

        Matcher r = JIBUN_DONG_REVERSED.matcher(address);
        if (r.find()) {
            // group(1) = 번지, group(3) = 동/리/가 이름 -> 정방향과 동일한 키 순서로 정규화
            return normalize(r.group(3) + r.group(1));
        }

        return null;
    }
}