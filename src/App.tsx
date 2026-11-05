import { useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import NoticePoster from "@/components/notice/NoticePoster";
import { NOTICE_BRANCHES } from "@/lib/notice/branches";
import { KO_WD, MONTH_ENG, formatDateList, weeksOfMonth } from "@/lib/notice/calendar";
import {
  DayStatus,
  NoticeState,
  OUTPUT_SIZES,
  OutputSize,
  STATUS_LABEL,
  STATUS_ORDER,
  defaultStatusConfig,
} from "@/lib/notice/types";

type PaintMode = DayStatus;
const MODE_LABEL: Record<PaintMode, string> = {
  normal: "정상 진료",
  short: "단축 진료",
  closed: "휴진",
};
// 상태별 색 (정상=회색테두리, 단축=주황테두리, 휴진=주황채움+흰글자)
const CTRL_STYLE: Record<DayStatus, React.CSSProperties> = {
  normal: { background: "transparent", color: "#8E949B", border: "2px solid #8E949B" },
  short: { background: "transparent", color: "#E9531F", border: "2px solid #E9531F" },
  closed: { background: "#E9531F", color: "#fff", border: "2px solid #E9531F" },
};

export default function App() {
  const now = new Date();
  const [state, setState] = useState<NoticeState>(() => {
    const w = weeksOfMonth(now.getFullYear(), now.getMonth() + 1);
    return {
      branch: NOTICE_BRANCHES[0],
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      includedWeeks: w.map((_, i) => i),
      dayStatus: {},
      statusConfig: defaultStatusConfig(),
      extraText: "",
      visibleWeekdays: [0, 1, 2, 3, 4, 5, 6],
      dateScale: 1,
      weekdayScale: 1,
      statusLabelScale: 1,
      bottomScale: 1,
      offsets: { title: 0, calendar: 0, bottom: 0 },
    };
  });
  const [mode, setMode] = useState<PaintMode>("closed");
  const [previewSize, setPreviewSize] = useState<OutputSize>("a4");
  const [showGuides, setShowGuides] = useState(false); // 미리보기 중심 가이드선(추출 안 됨)
  const [exportSizes, setExportSizes] = useState<OutputSize[]>(["a4"]);
  const [exporting, setExporting] = useState(false);
  const [savedModal, setSavedModal] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const weeks = useMemo(() => weeksOfMonth(state.year, state.month), [state.year, state.month]);

  // 표시 대상(포함 주차) 안의 날짜 집합
  const includedIsos = useMemo(() => {
    const s = new Set<string>();
    weeks.forEach((wk, i) => {
      if (state.includedWeeks.includes(i)) wk.forEach((c) => c.inMonth && s.add(c.iso));
    });
    return s;
  }, [weeks, state.includedWeeks]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  function shiftMonth(delta: number) {
    setState((s) => {
      let m = s.month + delta,
        y = s.year;
      if (m < 1) {
        m = 12;
        y--;
      } else if (m > 12) {
        m = 1;
        y++;
      }
      const w = weeksOfMonth(y, m);
      return { ...s, year: y, month: m, dayStatus: {}, includedWeeks: w.map((_, i) => i) };
    });
  }
  function toggleWeek(i: number) {
    setState((s) => ({
      ...s,
      includedWeeks: s.includedWeeks.includes(i) ? s.includedWeeks.filter((x) => x !== i) : [...s.includedWeeks, i].sort((a, b) => a - b),
    }));
  }
  function paintDay(iso: string, weekIdx: number) {
    setState((s) => {
      const ds = { ...s.dayStatus };
      // 같은 상태를 다시 누르면 해제(토글), 아니면 현재 상태로 지정
      if (ds[iso] === mode) delete ds[iso];
      else ds[iso] = mode;
      const iw = s.includedWeeks.includes(weekIdx) ? s.includedWeeks : [...s.includedWeeks, weekIdx].sort((a, b) => a - b);
      return { ...s, dayStatus: ds, includedWeeks: iw };
    });
  }
  function setCfg(st: DayStatus, patch: Partial<NoticeState["statusConfig"][DayStatus]>) {
    setState((s) => ({ ...s, statusConfig: { ...s.statusConfig, [st]: { ...s.statusConfig[st], ...patch } } }));
  }
  function onExtra(v: string) {
    const lines = v.split("\n").slice(0, 6).map((l) => l.slice(0, 45));
    setState((s) => ({ ...s, extraText: lines.join("\n").slice(0, 270) }));
  }

  async function handleExport() {
    if (exportSizes.length === 0) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      for (const sz of exportSizes) {
        const node = posterRefs.current[sz];
        if (!node) continue;
        const size = OUTPUT_SIZES.find((s) => s.id === sz)!;
        // 팝업(PNG)은 작아서 화질 저하 → 고해상도로 렌더(MO는 특히 작아 3배).
        const ratioMap: Record<string, number> = { a4: 1, insta: 2, pc: 2, mo: 3 };
        const common = { width: size.w, height: size.h, pixelRatio: ratioMap[sz] ?? 1, cacheBust: true };
        const dataUrl =
          size.fmt === "jpg"
            ? await htmlToImage.toJpeg(node, { ...common, quality: 0.9, backgroundColor: "#ffffff" })
            : await htmlToImage.toPng(node, common);
        // 파일명: (년2자리)(월2자리)_지점_N월진료안내_사이즈  예) 2610_명동더프리미엄점_10월진료안내_A4
        const yymm = `${String(state.year).slice(-2)}${String(state.month).padStart(2, "0")}`;
        const branchName = state.branch.replace(/\s+/g, "");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${yymm}_${branchName}_${state.month}월진료안내_${size.label}.${size.fmt}`;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
      setSavedModal(true);
    } catch (e) {
      console.error(e);
      alert("이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }

  const preview = OUTPUT_SIZES.find((s) => s.id === previewSize)!;
  const scale = Math.min(620 / preview.w, 840 / preview.h);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const bumpDateScale = (d: number) => setState((s) => ({ ...s, dateScale: clamp(+((s.dateScale ?? 1) + d).toFixed(2), 0.6, 1.8) }));
  const bumpWeekdayScale = (d: number) => setState((s) => ({ ...s, weekdayScale: clamp(+((s.weekdayScale ?? 1) + d).toFixed(2), 0.6, 1.8) }));
  const bumpStatusLabelScale = (d: number) => setState((s) => ({ ...s, statusLabelScale: clamp(+((s.statusLabelScale ?? 1) + d).toFixed(2), 0.6, 1.8) }));
  const bumpBottomScale = (d: number) => setState((s) => ({ ...s, bottomScale: clamp(+((s.bottomScale ?? 1) + d).toFixed(2), 0.6, 1.8) }));
  const nudge = (key: "title" | "calendar" | "bottom", d: number) =>
    setState((s) => ({ ...s, offsets: { ...s.offsets, [key]: clamp(+(((s.offsets?.[key] ?? 0) + d).toFixed(3)), -0.25, 0.25) } }));
  const resetLayout = () => setState((s) => ({ ...s, dateScale: 1, weekdayScale: 1, statusLabelScale: 1, bottomScale: 1, offsets: { title: 0, calendar: 0, bottom: 0 } }));
  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(SAVE_PATH);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
    } catch {
      // 클립보드 차단 환경: 경로 textarea를 선택하도록 안내
      const el = document.getElementById("save-path-field") as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f5", color: "#18181b" }}>
      <div style={{ background: "#fef3c7", padding: "8px 16px", textAlign: "center", fontSize: 12, color: "#92400e" }}>
        ⚠️ 이 페이지는 입력 내용을 <b>저장하지 않습니다</b>. 새로고침·창닫기 시 모두 사라지니 완성되면 <b>이미지로 꼭 다운로드</b>하세요.
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 24, padding: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>진료 안내 이미지 생성기</h1>

          <section style={card}>
            <label style={lbl}>지점</label>
            <select value={state.branch} onChange={(e) => setState((s) => ({ ...s, branch: e.target.value }))} style={inp}>
              {NOTICE_BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </section>

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={lbl}>월 / 주차 선택</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                <button onClick={() => shiftMonth(-1)} style={navBtn}>◀</button>
                <b>{state.year}.{state.month} ({MONTH_ENG[state.month - 1]})</b>
                <button onClick={() => shiftMonth(1)} style={navBtn}>▶</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 8px" }}>이미지에 표시할 <b>주차</b>를 고르세요 (기본: 전체).</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {weeks.map((wk, i) => {
                const inM = wk.filter((c) => c.inMonth);
                const on = state.includedWeeks.includes(i);
                return (
                  <button key={i} onClick={() => toggleWeek(i)} style={{ ...chip, ...(on ? chipOn : {}) }}>
                    {i + 1}주 ({inM[0].day}~{inM[inM.length - 1].day})
                  </button>
                );
              })}
            </div>
          </section>

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={lbl}>요일 표기</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setState((s) => ({ ...s, visibleWeekdays: [0, 1, 2, 3, 4, 5, 6] }))} style={{ ...chip, padding: "3px 10px" }}>전체</button>
                <button onClick={() => setState((s) => ({ ...s, visibleWeekdays: [1, 2, 3, 4, 5] }))} style={{ ...chip, padding: "3px 10px" }}>평일</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 8px" }}>달력에 <b>표시할 요일</b>을 켜고 끄세요.</p>
            <div style={{ display: "flex", gap: 4 }}>
              {KO_WD.map((wd, i) => {
                const on = state.visibleWeekdays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      setState((s) => {
                        const has = s.visibleWeekdays.includes(i);
                        const next = has ? s.visibleWeekdays.filter((x) => x !== i) : [...s.visibleWeekdays, i].sort((a, b) => a - b);
                        return next.length ? { ...s, visibleWeekdays: next } : s; // 최소 1개 유지
                      })
                    }
                    style={{ flex: 1, borderRadius: 8, padding: "7px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", border: on ? "1px solid #E9531F" : "1px solid #d4d4d8", background: on ? "#fff7ed" : "#fff", color: on ? "#c2410c" : "#a1a1aa" }}
                  >
                    {wd}
                  </button>
                );
              })}
            </div>
          </section>

          <section style={card}>
            <label style={lbl}>진료 상태 지정</label>
            <p style={{ fontSize: 12, color: "#71717a", margin: "4px 0 8px" }}>상태를 고르고 달력에서 날짜를 클릭하세요. 같은 상태를 <b>다시 클릭하면 해제</b>됩니다.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {(["normal", "short", "closed"] as PaintMode[]).map((m) => {
                const on = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: on ? "2px solid #18181b" : "1px solid #d4d4d8",
                      background: m === "closed" ? "#E9531F" : "#fff",
                      color: m === "closed" ? "#fff" : m === "short" ? "#E9531F" : "#8E949B",
                    }}
                  >
                    {MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center", fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
              {KO_WD.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            {weeks.map((wk, wi) => {
              const weekOn = state.includedWeeks.includes(wi);
              return (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
                  {wk.map((cell, ci) => {
                    if (!cell.inMonth) return <div key={ci} />;
                    const stt = state.dayStatus[cell.iso];
                    const weekdayOn = state.visibleWeekdays.includes(ci);
                    const disabled = !weekOn || !weekdayOn;
                    const onClickCell = () => {
                      if (!weekdayOn) { alert("이 요일은 지금 달력에 표시되지 않아요.\n위 '요일 표기'에서 해당 요일을 먼저 켜 주세요."); return; }
                      if (!weekOn) { alert("이 주차는 지금 이미지에 포함되지 않아요.\n위 '월 / 주차 선택'에서 해당 주차를 먼저 선택해 주세요."); return; }
                      paintDay(cell.iso, wi);
                    };
                    return (
                      <button
                        key={ci}
                        onClick={onClickCell}
                        title={disabled ? (!weekdayOn ? "표시되지 않는 요일" : "선택되지 않은 주차") : undefined}
                        style={{
                          aspectRatio: "1", borderRadius: 8, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
                          ...(disabled
                            ? { background: "#fafafa", color: "#d4d4d8", border: "1px dashed #e9e9ec" }
                            : stt
                            ? CTRL_STYLE[stt]
                            : { background: "#f4f4f5", color: "#71717a", border: "1px solid #e4e4e7" }),
                        }}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </section>

          <section style={card}>
            <label style={lbl}>하단 안내 문구</label>
            <p style={{ fontSize: 12, color: "#71717a", margin: "4px 0 10px" }}>위에서 지정한 날짜가 자동으로 들어갑니다. 표시 여부와 시간만 설정하세요. (글씨 크기는 아래 '레이아웃 조정'에서)</p>
            {STATUS_ORDER.map((st) => {
              const dates = [...includedIsos].filter((iso) => state.dayStatus[iso] === st);
              const cfg = state.statusConfig[st];
              const active = dates.length > 0;
              return (
                <div key={st} style={{ opacity: active ? 1 : 0.4, borderTop: "1px solid #f0f0f0", padding: "10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input type="checkbox" checked={cfg.include} disabled={!active} onChange={(e) => setCfg(st, { include: e.target.checked })} />
                    <span style={{ ...pillLbl, ...CTRL_STYLE[st] }}>{STATUS_LABEL[st]}</span>
                    {st !== "closed" && active && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginLeft: "auto" }}>
                        <TimeSelect value={cfg.startTime} onChange={(v) => setCfg(st, { startTime: v })} />
                        <span>-</span>
                        <TimeSelect value={cfg.endTime} onChange={(v) => setCfg(st, { endTime: v })} />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#52525b", marginTop: 6 }}>{active ? formatDateList(dates) : "지정된 날짜 없음"}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#52525b" }}>기타 문구 (선택, 작게 표시)</label>
              <textarea value={state.extraText} onChange={(e) => onExtra(e.target.value)} rows={2} style={{ ...inp, marginTop: 4 }} placeholder="추가 안내 문구" />
            </div>
          </section>

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={lbl}>레이아웃 조정</label>
              <button onClick={resetLayout} style={{ ...chip, padding: "3px 10px" }}>초기화</button>
            </div>

            <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 4px" }}><b>크기 조절</b></p>
            {([
              ["날짜 크기", state.dateScale ?? 1, bumpDateScale],
              ["요일 크기", state.weekdayScale ?? 1, bumpWeekdayScale],
              ["상태 버튼 크기", state.statusLabelScale ?? 1, bumpStatusLabelScale],
              ["하단 안내문구 크기", state.bottomScale ?? 1, bumpBottomScale],
            ] as const).map(([label, val, bump]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => bump(-0.05)} style={stepBtn}>−</button>
                  <span style={{ fontSize: 12, width: 40, textAlign: "center" }}>{Math.round(val * 100)}%</span>
                  <button onClick={() => bump(0.05)} style={stepBtn}>＋</button>
                </div>
              </div>
            ))}

            <p style={{ fontSize: 12, color: "#71717a", margin: "12px 0 8px" }}>섹션 <b>위·아래 이동</b> (여백 조절)</p>
            {([
              ["title", "① 타이틀 (영문·월)"],
              ["calendar", "② 날짜 달력"],
              ["bottom", "③ 하단 안내문구"],
            ] as const).map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => nudge(key, -0.01)} style={stepBtn}>▲</button>
                  <span style={{ fontSize: 11, color: "#a1a1aa", width: 44, textAlign: "center" }}>{Math.round((state.offsets?.[key] ?? 0) * 1000)}</span>
                  <button onClick={() => nudge(key, 0.01)} style={stepBtn}>▼</button>
                </div>
              </div>
            ))}
          </section>

          <section style={card}>
            <label style={lbl}>이미지 사이즈 (중복 선택)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 12px" }}>
              {OUTPUT_SIZES.map((sz) => {
                const on = exportSizes.includes(sz.id);
                return (
                  <button key={sz.id} onClick={() => setExportSizes((p) => (p.includes(sz.id) ? p.filter((x) => x !== sz.id) : [...p, sz.id]))} style={{ ...chip, ...(on ? chipOn : {}) }}>
                    {sz.label} · {sz.fmt.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: "#a1a1aa", margin: "0 0 10px" }}>A4=인쇄용 JPG, 팝업·인스타=웹용 PNG.</p>
            <button onClick={handleExport} disabled={exporting || exportSizes.length === 0} style={{ ...primaryBtn, opacity: exporting || exportSizes.length === 0 ? 0.5 : 1 }}>
              {exporting ? "이미지 생성 중..." : `이미지 변환하기 (${exportSizes.length}장)`}
            </button>
          </section>
        </div>

        <div style={{ position: "sticky", top: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={lbl}>미리보기</span>
              <select value={previewSize} onChange={(e) => setPreviewSize(e.target.value as OutputSize)} style={inpSm}>
                {OUTPUT_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div style={{ position: "relative", width: preview.w * scale, height: preview.h * scale, overflow: "hidden", border: "1px solid #eee", margin: "0 auto" }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <NoticePoster variant={previewSize} state={state} />
              </div>
              {showGuides && (
                <>
                  {/* 중심 가이드선 (미리보기 전용 · 이미지 추출에는 포함되지 않음) */}
                  <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "rgba(0,160,255,0.7)", transform: "translateX(-0.5px)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: "50%", left: 0, height: 1, width: "100%", background: "rgba(0,160,255,0.7)", transform: "translateY(-0.5px)", pointerEvents: "none" }} />
                </>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 10, fontSize: 12, color: "#52525b", cursor: "pointer" }}>
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
              중심 가이드선 표시 <span style={{ color: "#a1a1aa" }}>(이미지에는 포함 안 됨)</span>
            </label>
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }} aria-hidden>
        {exportSizes.map((sz) => (
          <div key={sz} ref={(el) => { posterRefs.current[sz] = el; }}>
            <NoticePoster variant={sz} state={state} />
          </div>
        ))}
      </div>

      {savedModal && (
        <div onClick={() => setSavedModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>✅ 저장이 완료되었습니다.</div>
            <p style={{ fontSize: 13, color: "#52525b", margin: "0 0 14px", lineHeight: 1.5 }}>
              아래 경로를 복사한 뒤, 다운로드된 이미지를 해당 폴더에 저장해 주세요.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input id="save-path-field" readOnly value={SAVE_PATH} onFocus={(e) => e.currentTarget.select()}
                style={{ flex: 1, minWidth: 0, border: "1px solid #d4d4d8", borderRadius: 8, padding: "10px 12px", fontSize: 12, background: "#f9fafb", color: "#18181b" }} />
              <button onClick={copyPath} style={{ ...primaryBtn, width: "auto", padding: "0 16px", whiteSpace: "nowrap" }}>
                {pathCopied ? "복사됨" : "경로 복사"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setSavedModal(false)} style={{ ...chip, padding: "8px 18px" }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SAVE_PATH = "C:\\Users\\user\\Dropbox\\1. 더데이랩스\\1. 이벤트&디자인\\0. 공통\\6. 진료안내";

// 시간: 입력형식 대신 시(0~23) / 분(00·30) 선택형식
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h = "00", m = "00"] = (value || "00:00").split(":");
  const minute = m === "30" ? "30" : "00";
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      <select value={String(parseInt(h, 10) || 0)} onChange={(e) => onChange(`${String(e.target.value).padStart(2, "0")}:${minute}`)} style={selSm}>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{i}시</option>
        ))}
      </select>
      <select value={minute} onChange={(e) => onChange(`${String(parseInt(h, 10) || 0).toString().padStart(2, "0")}:${e.target.value}`)} style={selSm}>
        <option value="00">00분</option>
        <option value="30">30분</option>
      </select>
    </span>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10, padding: 16 };
const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d4d4d8", borderRadius: 6, padding: 8, fontSize: 14 };
const inpSm: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 6, padding: 4, fontSize: 12 };
const selSm: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 6, padding: "4px 6px", fontSize: 12, background: "#fff", cursor: "pointer" };
const navBtn: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 6, padding: "2px 8px", background: "#fff", cursor: "pointer" };
const chip: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 999, padding: "5px 12px", fontSize: 12, background: "#fff", cursor: "pointer", color: "#71717a" };
const chipOn: React.CSSProperties = { border: "1px solid #E9531F", background: "#fff7ed", color: "#c2410c" };
const primaryBtn: React.CSSProperties = { width: "100%", background: "#E9531F", color: "#fff", border: 0, borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const pillLbl: React.CSSProperties = { borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 };
const stepBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#52525b" };
