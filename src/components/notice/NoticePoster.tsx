import { CSSProperties } from "react";
import bgA4 from "@/assets/notice/bg-a4.png";
import bgInsta from "@/assets/notice/bg-insta.png";
import bgMo from "@/assets/notice/bg-mo.png";
import bgPc from "@/assets/notice/bg-pc.png";
import {
  DayCell,
  KO_WD,
  MONTH_ENG,
  WeekRow,
  formatDateList,
  formatTimeRange,
  weeksOfMonth,
} from "@/lib/notice/calendar";
import {
  DayStatus,
  NoticeState,
  OUTPUT_SIZES,
  OutputSize,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/notice/types";

const ORANGE = "#E9531F";
const DARK = "#2A211F";
const GRAY = "#8E949B";

// 상태별 도형/텍스트 색 (slide 3)
const STATUS_STYLE: Record<DayStatus, { stroke: string; fill: string; text: string }> = {
  normal: { stroke: GRAY, fill: "transparent", text: GRAY }, // 정상: 회색 테두리, 채움X
  short: { stroke: ORANGE, fill: "transparent", text: ORANGE }, // 단축: 주황 테두리, 채움X
  closed: { stroke: ORANGE, fill: ORANGE, text: "#ffffff" }, // 휴진: 주황 채움 + 흰 글자
};

type Rect = { l: number; t: number; w: number; h: number };
type VariantSpec = {
  bg: string;
  header: boolean;
  branch?: { right: number; t: number; font: number };
  octFont: number;
  notFont: number;
  titleL: number;
  octT: number;
  notT: number;
  month: { l: number; t: number; font: number };
  cal: { l: number; t: number; w: number; wdFont: number; dateFont: number; circle: number; rowGap: number; labelFont: number };
  bottom: Rect & { pillFont: number; dateFont: number; timeFont: number };
};

const SPECS: Record<OutputSize, VariantSpec> = {
  a4: {
    bg: bgA4,
    header: true,
    branch: { right: 0.039, t: 0.028, font: 0.0165 },
    octFont: 0.06,
    notFont: 0.057,
    titleL: 0.138,
    octT: 0.203,
    notT: 0.283,
    month: { l: 0.535, t: 0.223, font: 0.031 },
    cal: { l: 0.108, t: 0.455, w: 0.776, wdFont: 0.016, dateFont: 0.032, circle: 0.083, rowGap: 0.015, labelFont: 0.0135 },
    bottom: { l: 0.108, t: 0.648, w: 0.784, h: 0.197, pillFont: 0.016, dateFont: 0.023, timeFont: 0.018 },
  },
  insta: {
    bg: bgInsta,
    header: false,
    octFont: 0.066,
    notFont: 0.062,
    titleL: 0.147,
    octT: 0.212,
    notT: 0.298,
    month: { l: 0.612, t: 0.262, font: 0.033 },
    cal: { l: 0.12, t: 0.5, w: 0.76, wdFont: 0.017, dateFont: 0.034, circle: 0.088, rowGap: 0.016, labelFont: 0.014 },
    bottom: { l: 0.121, t: 0.71, w: 0.758, h: 0.185, pillFont: 0.017, dateFont: 0.024, timeFont: 0.019 },
  },
  mo: {
    bg: bgMo,
    header: true,
    branch: { right: 0.056, t: 0.042, font: 0.022 },
    octFont: 0.062,
    notFont: 0.058,
    titleL: 0.127,
    octT: 0.235,
    notT: 0.305,
    month: { l: 0.52, t: 0.243, font: 0.028 },
    cal: { l: 0.11, t: 0.45, w: 0.78, wdFont: 0.022, dateFont: 0.04, circle: 0.1, rowGap: 0.018, labelFont: 0.016 },
    bottom: { l: 0.121, t: 0.685, w: 0.758, h: 0.183, pillFont: 0.019, dateFont: 0.023, timeFont: 0.019 },
  },
  pc: {
    bg: bgPc,
    header: true,
    branch: { right: 0.031, t: 0.062, font: 0.03 },
    octFont: 0.13,
    notFont: 0.12,
    titleL: 0.089,
    octT: 0.35,
    notT: 0.49,
    month: { l: 0.088, t: 0.66, font: 0.06 },
    cal: { l: 0.4, t: 0.36, w: 0.53, wdFont: 0.03, dateFont: 0.055, circle: 0.06, rowGap: 0.02, labelFont: 0.024 },
    bottom: { l: 0.406, t: 0.644, w: 0.521, h: 0.275, pillFont: 0.028, dateFont: 0.032, timeFont: 0.026 },
  },
};

// 한 행에서 같은 상태의 연속 구간 찾기 (붙어있으면 캡슐)
type Run = { start: number; end: number; status: DayStatus };
function runsInRow(row: DayCell[], dayStatus: Record<string, DayStatus>): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  row.forEach((cell, i) => {
    const st = cell.inMonth ? dayStatus[cell.iso] : undefined;
    if (st) {
      if (cur && cur.status === st && cur.end === i - 1) cur.end = i;
      else {
        if (cur) runs.push(cur);
        cur = { start: i, end: i, status: st };
      }
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  });
  if (cur) runs.push(cur);
  return runs;
}

export default function NoticePoster({ variant, state }: { variant: OutputSize; state: NoticeState }) {
  const size = OUTPUT_SIZES.find((s) => s.id === variant)!;
  const W = size.w;
  const H = size.h;
  const spec = SPECS[variant];
  const px = (f: number) => f * H;

  const allWeeks = weeksOfMonth(state.year, state.month);
  const rows: WeekRow[] = allWeeks.filter((_, i) => state.includedWeeks.includes(i));
  const hideLabels = rows.length >= 3; // 3주 이상이면 라벨 숨기고 색표기만

  const cellW = (spec.cal.w * W) / 7;
  const labelH = px(spec.cal.labelFont) * (variant === "mo" ? 2.6 : 1.9);
  const rowGap = px(spec.cal.rowGap);
  // 달력이 하단 박스를 침범하지 않도록, 주차 수에 맞춰 행 높이/원 크기 자동 축소
  const calBudget = (spec.bottom.t - spec.cal.t) * H - px(spec.cal.wdFont) * 1.6 - px(0.02);
  const perRowExtra = (hideLabels ? 0 : labelH) + rowGap;
  const idealRowH = spec.cal.circle * W * 1.05;
  const nRows = Math.max(1, rows.length);
  const dateRowH = Math.min(idealRowH, Math.max(px(0.028), calBudget / nRows - perRowExtra));
  const circleD = Math.min(spec.cal.circle * W, dateRowH * 0.92, cellW * 0.92);
  const calScale = circleD / (spec.cal.circle * W); // 축소 비율
  const dateFont = px(spec.cal.dateFont) * calScale;

  const root: CSSProperties = {
    position: "relative",
    width: W,
    height: H,
    backgroundImage: `url(${spec.bg})`,
    backgroundSize: "cover",
    overflow: "hidden",
    fontFamily: "Pretendard, sans-serif",
    color: DARK,
  };

  return (
    <div style={root}>
      {/* 지점명 */}
      {spec.header && spec.branch && (
        <div style={{ position: "absolute", right: spec.branch.right * W, top: spec.branch.t * H, fontSize: px(spec.branch.font), fontWeight: 700, letterSpacing: "-0.02em" }}>
          {state.branch}
        </div>
      )}

      {/* October / NOTICE (Optima) */}
      <div style={{ position: "absolute", left: spec.titleL * W, top: spec.octT * H, fontFamily: "Optima, serif", fontWeight: 500, fontSize: px(spec.octFont), color: DARK, lineHeight: 1 }}>
        {MONTH_ENG[state.month - 1]}
      </div>
      <div style={{ position: "absolute", left: spec.titleL * W, top: spec.notT * H, fontFamily: "Optima, serif", fontWeight: 500, fontSize: px(spec.notFont), color: DARK, lineHeight: 1, letterSpacing: "0.01em" }}>
        NOTICE
      </div>

      {/* N월 진료 안내 */}
      <div style={{ position: "absolute", left: spec.month.l * W, top: spec.month.t * H, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: px(0.006) }}>
        <span style={{ fontSize: px(spec.month.font) * 1.12, fontWeight: 800 }}>{state.month}월</span>
        <span style={{ fontSize: px(spec.month.font), fontWeight: 500 }}>진료 안내</span>
      </div>

      {/* 달력 strip */}
      <div style={{ position: "absolute", left: spec.cal.l * W, top: spec.cal.t * H, width: spec.cal.w * W }}>
        {/* 요일 헤더 (일~토 고정) */}
        <div style={{ display: "flex", marginBottom: px(0.008) }}>
          {KO_WD.map((wd, i) => (
            <div key={i} style={{ width: cellW, textAlign: "center", fontSize: px(spec.cal.wdFont), fontWeight: 500, color: GRAY }}>
              {wd}
            </div>
          ))}
        </div>
        {/* 날짜 행들 */}
        {rows.map((row, ri) => {
          const runs = runsInRow(row, state.dayStatus);
          return (
            <div key={ri} style={{ position: "relative", height: dateRowH, marginBottom: hideLabels ? px(spec.cal.rowGap) : labelH + px(spec.cal.rowGap) }}>
              {/* 강조 도형 (원/캡슐) */}
              {runs.map((run, i) => {
                const s = STATUS_STYLE[run.status];
                const cx1 = (run.start + 0.5) * cellW;
                const cx2 = (run.end + 0.5) * cellW;
                const left = cx1 - circleD / 2;
                const width = cx2 - cx1 + circleD;
                return (
                  <div key={i} style={{ position: "absolute", left, top: (dateRowH - circleD) / 2, width, height: circleD, borderRadius: circleD, border: `${Math.max(2, px(0.0016))}px solid ${s.stroke}`, background: s.fill, boxSizing: "border-box" }} />
                );
              })}
              {/* 날짜 숫자 */}
              {row.map((cell, ci) => {
                const st = cell.inMonth ? state.dayStatus[cell.iso] : undefined;
                const color = st ? STATUS_STYLE[st].text : cell.inMonth ? GRAY : "#DCDFE3";
                return (
                  <div key={ci} style={{ position: "absolute", left: ci * cellW, top: 0, width: cellW, height: dateRowH, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Optima, serif", fontWeight: 500, fontSize: dateFont, color }}>
                    {cell.day}
                  </div>
                );
              })}
              {/* 상태 라벨 (run 아래) */}
              {!hideLabels &&
                runs.map((run, i) => {
                  const cx = ((run.start + run.end) / 2 + 0.5) * cellW;
                  return (
                    <div key={`l${i}`} style={{ position: "absolute", left: cx, top: dateRowH + px(0.004), transform: "translateX(-50%)" }}>
                      {statusPill(run.status, px(spec.cal.labelFont), variant === "mo")}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* 하단 안내 박스 */}
      <BottomBox spec={spec.bottom} W={W} H={H} px={px} state={state} />
    </div>
  );
}

function statusPill(status: DayStatus, fontSize: number, wrap = false) {
  const s = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        border: `${Math.max(2, fontSize * 0.11)}px solid ${s.stroke}`,
        background: s.fill,
        color: s.text === "#ffffff" ? "#ffffff" : s.stroke,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.05,
        padding: `${fontSize * 0.35}px ${fontSize * 0.7}px`,
        whiteSpace: wrap ? "normal" : "nowrap",
        maxWidth: wrap ? fontSize * 3.2 : undefined,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function BottomBox({ spec, W, H, px, state }: { spec: VariantSpec["bottom"]; W: number; H: number; px: (f: number) => number; state: NoticeState }) {
  const blocks = STATUS_ORDER.filter((st) => {
    const cfg = state.statusConfig[st];
    const dates = Object.keys(state.dayStatus).filter((iso) => state.dayStatus[iso] === st);
    return cfg.include && dates.length > 0;
  });

  return (
    <div style={{ position: "absolute", left: spec.l * W, top: spec.t * H, width: spec.w * W, minHeight: spec.h * H, border: `${Math.max(2, px(0.0013))}px solid ${ORANGE}`, borderRadius: px(0.004), boxSizing: "border-box", padding: `${px(0.014)}px ${px(0.028)}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: px(0.013) }}>
      {blocks.length === 0 && <span style={{ color: "#bbb", fontSize: px(spec.dateFont) }}>날짜를 선택하세요</span>}
      {blocks.map((st) => {
        const dates = Object.keys(state.dayStatus).filter((iso) => state.dayStatus[iso] === st);
        const cfg = state.statusConfig[st];
        const timeStr = st === "closed" ? "" : formatTimeRange(cfg.startTime, cfg.endTime);
        return (
          <div key={st} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: px(0.005) }}>
            {statusPill(st, px(spec.pillFont))}
            <div style={{ fontSize: px(spec.dateFont), color: "#4A4A4A", fontWeight: 500, textAlign: "center" }}>{formatDateList(dates)}</div>
            {timeStr && <div style={{ fontSize: px(spec.timeFont), color: "#4A4A4A", fontWeight: 500, textAlign: "center" }}>{timeStr}</div>}
          </div>
        );
      })}
      {state.extraText.trim() && (
        <div style={{ fontSize: px(spec.timeFont) * 0.85, color: "#7A7A7A", whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.4 }}>{state.extraText}</div>
      )}
    </div>
  );
}
