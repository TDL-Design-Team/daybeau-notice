
import { CSSProperties } from "react";
import bgA4 from "@/assets/notice/bg-a4.png";
import bgInsta from "@/assets/notice/bg-insta.png";
import bgMo from "@/assets/notice/bg-mo.png";
import bgPc from "@/assets/notice/bg-pc.png";
import { MONTH_ENG, WEEKDAY_KO, WeekRow, formatDateRangeKo } from "@/lib/notice/calendar";
import {
  BottomEntry,
  DayStatus,
  NoticeState,
  OUTPUT_SIZES,
  OutputSize,
  STATUS_LABEL,
} from "@/lib/notice/types";

const ORANGE = "#E9531F";
const DARK = "#2A211F";
const GRAY = "#9AA0A6";

// 사이즈별 레이아웃 스펙 (좌표는 w/h에 대한 비율)
type Rect = { l: number; t: number; w: number; h: number };
type VariantSpec = {
  bg: string;
  header: boolean; // 지점명(우상단) 표시 여부
  branch?: { right: number; t: number; font: number };
  title: { l: number; t: number; sept: number; notice: number; gap: number };
  month: { l: number; t: number; font: number };
  calendar: Rect;
  bottom: Rect;
};

const SPECS: Record<OutputSize, VariantSpec> = {
  a4: {
    bg: bgA4,
    header: true,
    branch: { right: 0.039, t: 0.028, font: 0.0165 },
    title: { l: 0.137, t: 0.173, sept: 0.098, notice: 0.076, gap: 0.0 },
    month: { l: 0.601, t: 0.202, font: 0.036 },
    calendar: { l: 0.11, t: 0.44, w: 0.78, h: 0.25 },
    bottom: { l: 0.109, t: 0.72, w: 0.784, h: 0.155 },
  },
  insta: {
    bg: bgInsta,
    header: false,
    title: { l: 0.147, t: 0.212, sept: 0.1, notice: 0.078, gap: 0.0 },
    month: { l: 0.612, t: 0.258, font: 0.038 },
    calendar: { l: 0.12, t: 0.48, w: 0.76, h: 0.2 },
    bottom: { l: 0.121, t: 0.71, w: 0.758, h: 0.185 },
  },
  mo: {
    bg: bgMo,
    header: true,
    branch: { right: 0.056, t: 0.042, font: 0.022 },
    title: { l: 0.125, t: 0.192, sept: 0.093, notice: 0.072, gap: 0.0 },
    month: { l: 0.615, t: 0.232, font: 0.032 },
    calendar: { l: 0.12, t: 0.45, w: 0.76, h: 0.14 },
    bottom: { l: 0.119, t: 0.63, w: 0.76, h: 0.22 },
  },
  pc: {
    bg: bgPc,
    header: true,
    branch: { right: 0.031, t: 0.062, font: 0.03 },
    title: { l: 0.089, t: 0.33, sept: 0.155, notice: 0.12, gap: 0.0 },
    month: { l: 0.088, t: 0.66, font: 0.06 },
    calendar: { l: 0.46, t: 0.34, w: 0.45, h: 0.2 },
    bottom: { l: 0.412, t: 0.63, w: 0.518, h: 0.25 },
  },
};

// 한 주(WeekRow)에서 연속된 같은 상태 구간 찾기
type Run = { start: number; end: number; status: DayStatus };
function findRuns(week: WeekRow, dayStatus: Record<string, DayStatus>): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  week.forEach((cell, i) => {
    const st = dayStatus[cell.iso];
    if (st) {
      if (cur && cur.status === st && cur.end === i - 1) {
        cur.end = i;
      } else {
        if (cur) runs.push(cur);
        cur = { start: i, end: i, status: st };
      }
    } else {
      if (cur) {
        runs.push(cur);
        cur = null;
      }
    }
  });
  if (cur) runs.push(cur);
  return runs;
}

export default function NoticePoster({
  variant,
  state,
  weeks,
}: {
  variant: OutputSize;
  state: NoticeState;
  weeks: WeekRow[]; // 이미 includedWeeks로 필터된 주들
}) {
  const size = OUTPUT_SIZES.find((s) => s.id === variant)!;
  const W = size.w;
  const H = size.h;
  const spec = SPECS[variant];
  const px = (frac: number) => frac * H; // 세로 기준 스케일

  const root: CSSProperties = {
    position: "relative",
    width: W,
    height: H,
    backgroundImage: `url(${spec.bg})`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    overflow: "hidden",
    fontFamily: "Pretendard, sans-serif",
    color: DARK,
  };

  // ----- 달력 렌더 -----
  const cal = spec.calendar;
  const colCount = 7;
  const cellW = (cal.w * W) / colCount;
  const headerH = px(variant === "pc" ? 0.055 : variant === "mo" ? 0.05 : 0.035);
  const rowH =
    weeks.length > 0
      ? Math.min(px(variant === "mo" ? 0.07 : 0.09), (cal.h * H - headerH) / weeks.length)
      : px(0.09);
  const dateFont = rowH * 0.82;
  const wdFont = headerH * 0.62;

  return (
    <div style={root}>
      {/* 지점명 (우상단) */}
      {spec.header && spec.branch && (
        <div
          style={{
            position: "absolute",
            right: spec.branch.right * W,
            top: spec.branch.t * H,
            fontSize: px(spec.branch.font),
            fontWeight: 700,
            color: DARK,
            letterSpacing: "-0.02em",
          }}
        >
          {state.branch}
        </div>
      )}

      {/* September / NOTICE */}
      <div
        style={{
          position: "absolute",
          left: spec.title.l * W,
          top: spec.title.t * H,
          fontFamily: "BroshockBody, serif",
          color: DARK,
          lineHeight: 0.9,
        }}
      >
        <div style={{ fontSize: px(spec.title.sept) }}>{MONTH_ENG[state.month - 1]}</div>
        <div style={{ fontSize: px(spec.title.notice) }}>NOTICE</div>
      </div>

      {/* N월 진료 안내 */}
      <div
        style={{
          position: "absolute",
          left: spec.month.l * W,
          top: spec.month.t * H,
          whiteSpace: "nowrap",
          color: DARK,
          display: "flex",
          alignItems: "baseline",
          gap: px(0.008),
        }}
      >
        <span style={{ fontSize: px(spec.month.font) * 1.15, fontWeight: 800 }}>
          {state.month}월
        </span>
        <span style={{ fontSize: px(spec.month.font), fontWeight: 500 }}>진료 안내</span>
      </div>

      {/* 달력 */}
      <div
        style={{
          position: "absolute",
          left: cal.l * W,
          top: cal.t * H,
          width: cal.w * W,
        }}
      >
        {/* 요일 헤더 */}
        <div style={{ display: "flex", height: headerH }}>
          {WEEKDAY_KO.map((wd) => (
            <div
              key={wd}
              style={{
                width: cellW,
                textAlign: "center",
                fontSize: wdFont,
                fontWeight: 500,
                color: GRAY,
              }}
            >
              {wd}
            </div>
          ))}
        </div>
        {/* 주 행 */}
        {weeks.map((week, wi) => {
          const runs = findRuns(week, state.dayStatus);
          const labelH = rowH * 0.34;
          return (
            <div key={wi} style={{ position: "relative", height: rowH, marginBottom: labelH }}>
              {/* 강조 캡슐 */}
              {runs.map((run, ri) => {
                const filled = run.status === "closed";
                return (
                  <div
                    key={ri}
                    style={{
                      position: "absolute",
                      left: run.start * cellW + cellW * 0.08,
                      top: rowH * 0.06,
                      width: (run.end - run.start + 1) * cellW - cellW * 0.16,
                      height: rowH * 0.88,
                      border: `${Math.max(2, px(0.0016))}px solid ${ORANGE}`,
                      background: filled ? ORANGE : "transparent",
                      borderRadius: rowH,
                    }}
                  />
                );
              })}
              {/* 상태 라벨 pill (각 run 아래 중앙) */}
              {runs.map((run, ri) => {
                const centerX = ((run.start + run.end + 1) / 2) * cellW;
                return (
                  <div
                    key={`lb-${ri}`}
                    style={{
                      position: "absolute",
                      left: centerX,
                      top: rowH * 1.0,
                      transform: "translate(-50%, 0)",
                    }}
                  >
                    {statusPill(
                      STATUS_LABEL[run.status],
                      run.status === "closed",
                      labelH * 0.5,
                      labelH * 0.22,
                      labelH * 0.5,
                    )}
                  </div>
                );
              })}
              {/* 날짜 숫자 */}
              {week.map((cell, ci) => {
                const st = state.dayStatus[cell.iso];
                const isClosed = st === "closed";
                const color = st ? (isClosed ? "#fff" : ORANGE) : cell.inMonth ? GRAY : "#D8DBDF";
                return (
                  <div
                    key={ci}
                    style={{
                      position: "absolute",
                      left: ci * cellW,
                      top: 0,
                      width: cellW,
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "BroshockBody, serif",
                      fontSize: dateFont,
                      color,
                    }}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 하단 안내 박스 */}
      <BottomBox spec={spec.bottom} W={W} H={H} px={px} entries={state.bottomEntries} extra={state.extraText} />
    </div>
  );
}

function statusPill(label: string, filled: boolean, fontSize: number, padV: number, padH: number) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `${Math.max(2, fontSize * 0.09)}px solid ${ORANGE}`,
    color: filled ? "#fff" : ORANGE,
    background: filled ? ORANGE : "transparent",
    borderRadius: 999,
    fontSize,
    fontWeight: 600,
    padding: `${padV}px ${padH}px`,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };
  return <span style={style}>{label}</span>;
}

function entrySentence(e: BottomEntry): string {
  if (!e.startDate) return "";
  const dateStr = formatDateRangeKo(e.startDate, e.endDate);
  if (e.type === "closed") return dateStr;
  const time = e.startTime && e.endTime ? ` ${e.startTime} - ${e.endTime}` : "";
  return `${dateStr}${time}`;
}

function BottomBox({
  spec,
  W,
  H,
  px,
  entries,
  extra,
}: {
  spec: Rect;
  W: number;
  H: number;
  px: (f: number) => number;
  entries: BottomEntry[];
  extra: string;
}) {
  const fontSize = px(0.026);
  const pillFont = px(0.021);
  const rowGap = px(0.016);
  return (
    <div
      style={{
        position: "absolute",
        left: spec.l * W,
        top: spec.t * H,
        width: spec.w * W,
        minHeight: spec.h * H,
        border: `${Math.max(2, px(0.0013))}px solid ${ORANGE}`,
        borderRadius: px(0.006),
        boxSizing: "border-box",
        padding: `${px(0.02)}px ${px(0.028)}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: rowGap,
      }}
    >
      {entries
        .filter((e) => e.startDate)
        .map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: px(0.018) }}>
            {statusPill(STATUS_LABEL[e.type], e.type === "closed", pillFont, pillFont * 0.5, pillFont * 0.9)}
            <span style={{ fontSize, color: "#5A5A5A", fontWeight: 500 }}>{entrySentence(e)}</span>
          </div>
        ))}
      {extra.trim() && (
        <div style={{ fontSize: fontSize * 0.9, color: "#7A7A7A", whiteSpace: "pre-line", lineHeight: 1.4 }}>
          {extra}
        </div>
      )}
    </div>
  );
}
