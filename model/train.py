"""
에코체크 등급 추정 모델 — 학습 · 검증 · model.json 생성

    python model/train.py              # 저장소 루트에서 실행

입력   beec/src/main/resources/seoul-apartments.json
         서울 아파트 2,888개 단지 + 인증 매칭 결과(정답). 아래 "데이터 준비" 단계의 결과물입니다.
출력   beec/src/main/resources/model.json     서버(ModelService)가 읽는 파일. 키 구조를 바꾸지 마세요.
       model/train-report.json                학습 설정·데이터 해시·시기별 상세 결과 (근거 기록용)

──────────────────────────────────────────────────────────────────────────
설계 요약
──────────────────────────────────────────────────────────────────────────
1. 무엇을 예측하나
   1차에너지소요량(kWh/m²·yr) 하나만. 등급·비용·탄소는 서버/프론트가 이 값에서 계산합니다.

2. 정답(라벨)
   인증 이력이 있는 단지 324개.
     - 인증 실적에 1차에너지소요량이 있으면 그 값        → "연속값" 223개
     - 등급만 있으면 그 등급 구간의 중앙값                → "중앙값 라벨" 101개
   재건축 오매칭(인증일자 − 준공연도 ≥ 15년) 49건은 데이터 준비 단계에서 이미 빠져 있고,
   excludedReason 으로 표시돼 있습니다. 여기서도 한 번 더 걸러 냅니다.

3. 입력 변수 8개 (원-핫으로 펼치면 14열)
   준공연도, 단열기준시기, 세대수, 동수, 연면적, 세대당면적, 복도유형, 난방방식
   건설사는 쓰지 않습니다. 같은 건설사라도 시기·단지별 편차가 커서입니다.

4. 검증
   5-fold 교차검증. 학습에는 324개를 모두 쓰지만 **성능은 연속값으로만** 잽니다.
   중앙값 라벨은 값이 10가지뿐이라(양자화) 넣고 재면 실제보다 정확해 보입니다.

5. 게이트 — 이 모델의 핵심
   준공 시기(단열기준)별로 교차검증 오차를 따로 재고, 등급 한 칸 폭(30~40)과 비교합니다.
     검증 표본 < 8              → refuse  (판정 불가)
     오차 ≤ 30                  → point   (등급 하나로 표시)
     오차 ≤ 45                  → range   (등급 범위로 표시)
     그보다 큼                  → refuse  (추정 안 함)
   시기 오차는 연속값이 있으면 연속값으로, 하나도 없으면 전체 라벨로 잽니다.
   단, point(등급 단정)는 **연속값 검증 표본이 8개 이상**일 때만 줍니다.
   연속값 3~4개로 잰 오차는 우연히 작게 나올 수 있어서, 그런 시기는 잘해야 range 입니다.
   그리고 그 range 의 폭(± 오차)은 시기 오차와 전체 오차 중 **큰 값**을 씁니다.
   작은 표본의 작은 오차로 범위를 좁게 그리면 사실상 등급을 단정하는 셈이 되기 때문입니다.

6. 예측값 저장
   전체 데이터로 다시 학습한 모델로 2,888개 단지 중 준공연도가 있는 단지를 모두 예측해
   단지코드 → 예측값 으로 저장합니다. 서버는 이 값을 찾아 읽기만 합니다.
   (대상이 고정 집합이라 요청마다 계산할 이유가 없고, 서버에 ML 런타임이 필요 없습니다.)

──────────────────────────────────────────────────────────────────────────
데이터 준비 단계 (이 스크립트 이전, 원본 파일은 저장소에 없음)
──────────────────────────────────────────────────────────────────────────
   K-apt 서울 공동주택 정보 + 에너지공단 인증 실적(소요량·인증일자) + 인증현황(등급)
   → 이상값 정리(연면적 54 · 세대수 67 · 주거전용면적 32건), 준공연도 → 단열기준 시기,
     단지명 기반 인증 매칭, 재건축 오매칭 49건 제외
   → seoul-apartments.json  (meta 블록에 위 기록이 남아 있습니다)

──────────────────────────────────────────────────────────────────────────
재현성
──────────────────────────────────────────────────────────────────────────
   하이퍼파라미터와 시드를 아래 상수로 고정했습니다. 같은 입력이면 같은 model.json 이 나옵니다.
   입력 파일의 SHA-256 과 라이브러리 버전은 train-report.json 에 기록됩니다.
"""

from __future__ import annotations

import hashlib
import json
import platform
from datetime import datetime, timezone, timedelta
from pathlib import Path

import numpy as np
import sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import KFold

# ── 경로 ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
RESOURCES = ROOT / "beec" / "src" / "main" / "resources"
DATA_PATH = RESOURCES / "seoul-apartments.json"
MODEL_PATH = RESOURCES / "model.json"
REPORT_PATH = Path(__file__).resolve().parent / "train-report.json"

# ── 학습 설정 (고정) ─────────────────────────────────────────────────────
# 표본이 324개로 작아서 얕은 트리(depth 3) + 작은 학습률 + 행 샘플링으로 과적합을 누릅니다.
# 결과를 보고 고른 값이 아니라 소표본 GBM 의 보수적인 기본값으로 먼저 정해 둔 값입니다.
SEED = 42
N_FOLDS = 5
GBM_PARAMS = dict(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=3,
    subsample=0.8,
    min_samples_leaf=5,
    random_state=SEED,
)

# ── 게이트 기준 (kWh/m²·yr) ──────────────────────────────────────────────
POINT_MAX_MAE = 30.0   # 등급 한 칸 폭(30~40)의 하단
RANGE_MAX_MAE = 45.0
MIN_GATE_SAMPLES = 8

# ── 변수 정의 ────────────────────────────────────────────────────────────
ERAS = [
    "단열기준 이전", "1980년 기준", "1987년 기준", "2001년 기준",
    "2008년 기준", "2013년 기준", "2016년 기준", "2018년 이후",
]
CORRIDORS = ["계단식", "복도식", "혼합식"]          # 그 외·미상 → 복도기타
HEATINGS = ["개별난방", "지역난방", "중앙난방"]      # 그 외·미상 → 난방기타

FEATURES = ["준공연도", "단열기준시기", "세대수", "동수", "연면적", "세대당면적", "복도유형", "난방방식"]
COLUMNS = [
    "준공연도", "단열기준시기", "세대수", "동수", "연면적", "세대당면적",
    "계단식", "복도식", "혼합식", "복도기타",
    "개별난방", "지역난방", "중앙난방", "난방기타",
]
NUMERIC = COLUMNS[:6]

CONTINUOUS_LABEL = "인증 실적 1차에너지소요량"


def _num(v):
    return float(v) if isinstance(v, (int, float)) and v > 0 else np.nan


def row(a: dict) -> list[float]:
    """단지 하나 → 14열. 결측은 NaN 으로 두고 나중에 학습 데이터 중앙값으로 채웁니다."""
    households = _num(a.get("households"))
    residential = _num(a.get("residentialArea"))
    era = a.get("insulationEra")
    corridor = a.get("corridorType") if a.get("corridorType") in CORRIDORS else "복도기타"
    heating = a.get("heatingType") if a.get("heatingType") in HEATINGS else "난방기타"
    return [
        _num(a.get("completionYear")),
        float(ERAS.index(era)) if era in ERAS else np.nan,   # 오래될수록 작은 순서값
        households,
        _num(a.get("dongCount")),
        _num(a.get("grossFloorArea")),
        residential / households if residential == residential and households == households else np.nan,
        *[float(corridor == c) for c in CORRIDORS + ["복도기타"]],
        *[float(heating == h) for h in HEATINGS + ["난방기타"]],
    ]


def impute(X: np.ndarray, medians: np.ndarray) -> np.ndarray:
    X = X.copy()
    idx = np.where(np.isnan(X))
    X[idx] = medians[idx[1]]
    return X


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    apartments = json.loads(DATA_PATH.read_text(encoding="utf-8"))["apartments"]

    # ── 정답 ───────────────────────────────────────────────────────────
    labeled = [
        a for a in apartments
        if a.get("certified") and a.get("energyValue") is not None and not a.get("excludedReason")
    ]
    y = np.array([a["energyValue"] for a in labeled], dtype=float)
    is_cont = np.array([a.get("labelSource") == CONTINUOUS_LABEL for a in labeled])
    eras = np.array([a.get("insulationEra") for a in labeled], dtype=object)
    excluded = sum(1 for a in apartments if a.get("excludedReason"))

    X_raw = np.array([row(a) for a in labeled], dtype=float)

    # ── 5-fold 교차검증 (결측 대체도 fold 안에서만 계산해 누수 방지) ─────
    oof = np.zeros(len(y))
    for train_idx, test_idx in KFold(N_FOLDS, shuffle=True, random_state=SEED).split(X_raw):
        med = np.nanmedian(X_raw[train_idx], axis=0)
        model = GradientBoostingRegressor(**GBM_PARAMS)
        model.fit(impute(X_raw[train_idx], med), y[train_idx])
        oof[test_idx] = model.predict(impute(X_raw[test_idx], med))

    # 비교 기준: 모델 없이 "같은 단열기준 시기 단지들의 중앙값" 으로 찍었을 때 (fold 안에서 계산)
    base = np.zeros(len(y))
    for train_idx, test_idx in KFold(N_FOLDS, shuffle=True, random_state=SEED).split(X_raw):
        overall_med = float(np.median(y[train_idx]))
        for i in test_idx:
            peers = y[train_idx][eras[train_idx] == eras[i]]
            base[i] = float(np.median(peers)) if len(peers) else overall_med
    baseline_mae = float(np.abs(base - y)[is_cont].mean())

    err = np.abs(oof - y)
    mae = float(err[is_cont].mean())
    yc = y[is_cont]
    r2 = float(1 - ((oof[is_cont] - yc) ** 2).sum() / ((yc - yc.mean()) ** 2).sum())
    mae_all_labels = float(err.mean())   # 참고: 중앙값 라벨까지 넣고 잰 값 (더 좋아 보임)

    # ── 시기별 게이트 ──────────────────────────────────────────────────
    gate = {}
    for era in ERAS:
        in_era = eras == era
        n, cont_n = int(in_era.sum()), int((in_era & is_cont).sum())
        if n == 0:
            gate[era] = dict(n=0, contN=0, mae=None, policy="refuse", reason="이 시기 인증 사례가 없습니다")
            continue
        basis = in_era & is_cont if cont_n > 0 else in_era
        era_mae = round(float(err[basis].mean()), 1)
        if n < MIN_GATE_SAMPLES:
            policy = "refuse"
        elif era_mae <= POINT_MAX_MAE and cont_n >= MIN_GATE_SAMPLES:
            policy = "point"
        elif era_mae <= RANGE_MAX_MAE:
            policy = "range"
        else:
            policy = "refuse"
        reason = f"교차검증 평균오차 {era_mae} kWh (검증 표본 {n}개, 연속값 {cont_n}개)"
        if n < MIN_GATE_SAMPLES:
            reason += f" — 검증 표본이 {MIN_GATE_SAMPLES}개 미만이라 판정하지 않습니다"
        elif policy == "range" and era_mae <= POINT_MAX_MAE:
            reason += f" — 연속값 검증 표본이 {MIN_GATE_SAMPLES}개 미만이라 범위로만 표시합니다"
        shown_mae = era_mae
        if policy == "range" and cont_n < MIN_GATE_SAMPLES and era_mae < round(mae, 1):
            shown_mae = round(mae, 1)
            reason += f" (범위 폭은 전체 오차 {shown_mae} kWh 를 씁니다)"
        gate[era] = dict(n=n, contN=cont_n, mae=shown_mae, policy=policy, reason=reason)

    # ── 최종 모델: 전체 정답으로 다시 학습 ──────────────────────────────
    med_all = np.nanmedian(X_raw, axis=0)
    final = GradientBoostingRegressor(**GBM_PARAMS)
    final.fit(impute(X_raw, med_all), y)

    importance = {c: round(float(v), 4) for c, v in zip(COLUMNS, final.feature_importances_)}

    # ── 예측값: 준공연도가 있는 단지 전부 ───────────────────────────────
    targets = [a for a in apartments if a.get("completionYear")]
    X_all = impute(np.array([row(a) for a in targets], dtype=float), med_all)
    preds = final.predict(X_all)
    predictions = {a["aptCode"]: round(float(p), 1) for a, p in zip(targets, preds)}

    # ── model.json (ModelService.Payload 와 같은 키만) ─────────────────
    payload = {
        "overall": {"mae": round(mae, 1), "r2": round(r2, 3), "n": len(y), "evaluatedOn": int(is_cont.sum())},
        "gate": gate,
        "predictions": predictions,
        "features": FEATURES,
        "featureImportance": importance,
        "method": (
            f"GradientBoosting, {N_FOLDS}-fold 교차검증. 학습 {len(y)}개(재건축 오매칭 {excluded}건 제외 후), "
            f"성능 평가는 연속값 {int(is_cont.sum())}개에서만 수행. 학습 코드 model/train.py"
        ),
    }
    MODEL_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # ── 근거 기록 ──────────────────────────────────────────────────────
    uncertified = [a for a in apartments if not a.get("certified")]
    outcome = {"point": 0, "range": 0, "refuse": 0, "noPrediction": 0}
    for a in uncertified:
        if a["aptCode"] not in predictions:
            outcome["noPrediction"] += 1
        else:
            outcome[gate.get(a.get("insulationEra"), {"policy": "refuse"})["policy"]] += 1

    report = {
        "trainedAt": datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="seconds"),
        "input": {"file": str(DATA_PATH.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(DATA_PATH)},
        "output": {"file": str(MODEL_PATH.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(MODEL_PATH)},
        "environment": {"python": platform.python_version(), "scikit-learn": sklearn.__version__, "numpy": np.__version__},
        "settings": {"seed": SEED, "folds": N_FOLDS, "gbm": GBM_PARAMS,
                     "gate": {"pointMaxMae": POINT_MAX_MAE, "rangeMaxMae": RANGE_MAX_MAE, "minSamples": MIN_GATE_SAMPLES},
                     "columns": COLUMNS, "imputation": "학습 데이터 중앙값 (교차검증 중에는 fold 별로 계산)"},
        "labels": {"total": len(y), "continuous": int(is_cont.sum()), "gradeMedian": int((~is_cont).sum()),
                   "excludedRebuild": excluded},
        "metrics": {"maeContinuous": round(mae, 2), "r2Continuous": round(r2, 3),
                    "maeAllLabels_reference": round(mae_all_labels, 2),
                    "baselineMae": round(baseline_mae, 2),
                    "baselineDefinition": "모델 없이 같은 단열기준 시기 단지들의 중앙값으로 예측 (같은 5-fold, 연속값 기준)",
                    "improvementVsBaselinePct": round((1 - mae / baseline_mae) * 100, 1)},
        "gate": gate,
        "uncertifiedOutcome": {**outcome, "total": len(uncertified),
                               "notEstimated": outcome["refuse"] + outcome["noPrediction"]},
        "predictions": len(predictions),
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── 콘솔 요약 ──────────────────────────────────────────────────────
    print(f"정답 {len(y)}개 (연속값 {int(is_cont.sum())}, 중앙값 라벨 {int((~is_cont).sum())}), 재건축 제외 {excluded}건")
    print(f"교차검증  MAE {mae:.1f}  R² {r2:.3f}  (연속값 기준)  |  참고: 전체 라벨 MAE {mae_all_labels:.1f}")
    print(f"비교 기준(시기별 중앙값) MAE {baseline_mae:.1f} → 모델이 {(1 - mae / baseline_mae) * 100:.0f}% 더 정확")
    for era, g in gate.items():
        print(f"  {era:<10} n={g['n']:>3} cont={g['contN']:>3} MAE={str(g['mae']):>5} → {g['policy']}")
    print(f"예측 {len(predictions)}개 단지 · 미인증 {len(uncertified)}개 중 "
          f"point {outcome['point']} / range {outcome['range']} / 추정 안 함 {outcome['refuse'] + outcome['noPrediction']}")


if __name__ == "__main__":
    main()
