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
  titleRight: number; // 타이틀이 넘으면 안 되는 오른쪽 경계 (겹침 방지)
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
    titleL: 0.138, titleRight: 0.51,
    octT: 0.203,
    notT: 0.283,
    month: { l: 0.535, t: 0.223, font: 0.031 },
    cal: { l: 0.108, t: 0.44, w: 0.776, wdFont: 0.016, dateFont: 0.036, circle: 0.088, rowGap: 0.015, labelFont: 0.0135 },
    bottom: { l: 0.108, t: 0.76, w: 0.784, h: 0.14, pillFont: 0.014, dateFont: 0.015, timeFont: 0.013 },
  },
  insta: {
    bg: bgInsta,
    header: false,
    octFont: 0.066,
    notFont: 0.062,
    titleL: 0.147, titleRight: 0.57,
    octT: 0.212,
    notT: 0.298,
    month: { l: 0.612, t: 0.262, font: 0.033 },
    cal: { l: 0.12, t: 0.505, w: 0.76, wdFont: 0.018, dateFont: 0.038, circle: 0.094, rowGap: 0.016, labelFont: 0.014 },
    bottom: { l: 0.121, t: 0.77, w: 0.758, h: 0.14, pillFont: 0.015, dateFont: 0.016, timeFont: 0.014 },
  },
  mo: {
    bg: bgMo,
    header: true,
    branch: { right: 0.056, t: 0.042, font: 0.022 },
    octFont: 0.062,
    notFont: 0.058,
    titleL: 0.127, titleRight: 0.47,
    octT: 0.235,
    notT: 0.305,
    month: { l: 0.52, t: 0.243, font: 0.028 },
    cal: { l: 0.11, t: 0.465, w: 0.78, wdFont: 0.024, dateFont: 0.048, circle: 0.11, rowGap: 0.018, labelFont: 0.017 },
    bottom: { l: 0.1, t: 0.73, w: 0.8, h: 0.15, pillFont: 0.016, dateFont: 0.017, timeFont: 0.015 },
  },
  pc: {
    bg: bgPc,
    header: true,
    branch: { right: 0.031, t: 0.062, font: 0.03 },
    octFont: 0.115,
    notFont: 0.115,
    titleL: 0.089, titleRight: 0.34,
    octT: 0.35,
    notT: 0.49,
    month: { l: 0.088, t: 0.66, font: 0.06 },
    cal: { l: 0.4, t: 0.34, w: 0.53, wdFont: 0.03, dateFont: 0.058, circle: 0.062, rowGap: 0.02, labelFont: 0.024 },
    bottom: { l: 0.406, t: 0.62, w: 0.521, h: 0.3, pillFont: 0.024, dateFont: 0.025, timeFont: 0.022 },
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
  // 반응형: 달력(요일헤더~마지막 행)이 [cal.t, bottom.t] 영역에 들어가되,
  // 주차가 적으면 이상적 크기로 크게 + 세로 중앙, 많으면 영역에 맞게 축소.
  const header = px(spec.cal.wdFont) * 1.7;
  const areaH = (spec.bottom.t - spec.cal.t) * H - px(0.02); // 달력 배치 가능 총 높이
  const nRows = Math.max(1, rows.length);
  const labelSpace = hideLabels ? 0 : labelH;
  const idealRowH = spec.cal.circle * W * 1.05;
  const perRow = (rh: number) => rh * 1.4 + labelSpace; // 행+간격+라벨
  let dateRowH = idealRowH;
  if (header + perRow(idealRowH) * nRows > areaH) {
    dateRowH = Math.max(px(0.02), (areaH - header) / nRows / 1.4 - labelSpace / 1.4);
  }
  const rowGap = dateRowH * 0.4;
  const circleD = Math.min(spec.cal.circle * W, dateRowH * 0.92, cellW * 0.92);
  const calScale = circleD / (spec.cal.circle * W);
  const dateFont = px(spec.cal.dateFont) * calScale;
  const usedCalH = header + perRow(dateRowH) * nRows;
  const calTopOffset = Math.max(0, (areaH - usedCalH) / 2); // 적으면 세로 중앙

  // 영문 월 이름이 길면(September 등) 오른쪽 요소와 겹치지 않게 타이틀 자동 축소.
  // October/NOTICE 동일 크기 유지.
  const monthName = MONTH_ENG[state.month - 1];
  const availTitleW = (spec.titleRight - spec.titleL) * W;
  const titleFont = Math.min(px(spec.octFont), availTitleW / (Math.max(monthName.length, 6) * 0.56));

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

      {/* October / NOTICE (Optima) — 동일 크기, 오른쪽 겹침 방지 자동 축소 */}
      <div style={{ position: "absolute", left: spec.titleL * W, top: spec.octT * H, fontFamily: "Optima, serif", fontWeight: 500, fontSize: titleFont, color: DARK, lineHeight: 1, whiteSpace: "nowrap" }}>
        {monthName}
      </div>
      <div style={{ position: "absolute", left: spec.titleL * W, top: spec.notT * H, fontFamily: "Optima, serif", fontWeight: 500, fontSize: titleFont, color: DARK, lineHeight: 1, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
        NOTICE
      </div>

      {/* N월 진료 안내 */}
      <div style={{ position: "absolute", left: spec.month.l * W, top: spec.month.t * H, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: px(0.006) }}>
        <span style={{ fontSize: px(spec.month.font) * 1.1, fontWeight: 700 }}>{state.month}월</span>
        <span style={{ fontSize: px(spec.month.font), fontWeight: 500 }}>진료 안내</span>
      </div>

      {/* 달력 */}
      <div style={{ position: "absolute", left: spec.cal.l * W, top: spec.cal.t * H + calTopOffset, width: spec.cal.w * W }}>
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
            <div key={ri} style={{ position: "relative", height: dateRowH, marginBottom: hideLabels ? rowGap : labelH + rowGap }}>
              {/* 강조 도형 (원/캡슐) */}
              {runs.map((run, i) => {
                const s = STATUS_STYLE[run.status];
                const cx1 = (run.start + 0.5) * cellW;
                const cx2 = (run.end + 0.5) * cellW;
                const left = cx1 - circleD / 2;
                const width = cx2 - cx1 + circleD;
                return (
                  <div key={i} style={{ position: "absolute", left, top: (dateRowH - circleD) / 2, width, height: circleD, borderRadius: circleD, border: `${Math.max(1, px(0.0011))}px solid ${s.stroke}`, background: s.fill, boxSizing: "border-box" }} />
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
        border: `${Math.max(1, fontSize * 0.06)}px solid ${s.stroke}`,
        background: s.fill,
        color: s.text === "#ffffff" ? "#ffffff" : s.stroke,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.05,
        padding: `${fontSize * 0.26}px ${fontSize * 0.55}px`,
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

  // 한 줄에 [상태] 날짜 · 시간 (가로 배치). 위아래 패딩 동일.
  const rowGap = px(0.014);
  return (
    <div style={{ position: "absolute", left: spec.l * W, top: spec.t * H, width: spec.w * W, height: spec.h * H, border: `${Math.max(1, px(0.0009))}px solid ${ORANGE}`, borderRadius: px(0.004), boxSizing: "border-box", padding: `${px(0.02)}px ${px(0.03)}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rowGap, overflow: "hidden" }}>
      {blocks.length === 0 && <span style={{ color: "#bbb", fontSize: px(spec.dateFont) }}>날짜를 선택하세요</span>}
      {blocks.map((st) => {
        const dates = Object.keys(state.dayStatus).filter((iso) => state.dayStatus[iso] === st);
        const cfg = state.statusConfig[st];
        const timeStr = st === "closed" ? "" : formatTimeRange(cfg.startTime, cfg.endTime);
        return (
          <div key={st} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: px(0.014), whiteSpace: "nowrap", maxWidth: "100%" }}>
            {statusPill(st, px(spec.pillFont))}
            <span style={{ fontSize: px(spec.dateFont), color: "#3F3F3F", fontWeight: 500 }}>{formatDateList(dates)}</span>
            {timeStr && <span style={{ fontSize: px(spec.timeFont), color: "#8A8A8A", fontWeight: 400 }}>{timeStr}</span>}
          </div>
        );
      })}
      {state.extraText.trim() && (
        <div style={{ fontSize: px(spec.timeFont) * 0.85, color: "#7A7A7A", whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.35 }}>{state.extraText}</div>
      )}
    </div>
  );
}
