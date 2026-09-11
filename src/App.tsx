import { useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import NoticePoster from "@/components/notice/NoticePoster";
import { NOTICE_BRANCHES } from "@/lib/notice/branches";
import { KO_WD, MONTH_ENG, formatDateList, toIso } from "@/lib/notice/calendar";
import {
  DayStatus,
  NoticeState,
  OUTPUT_SIZES,
  OutputSize,
  STATUS_LABEL,
  STATUS_ORDER,
  defaultStatusConfig,
} from "@/lib/notice/types";

const NEXT: Record<"none" | DayStatus, "none" | DayStatus> = {
  none: "normal",
  normal: "short",
  short: "closed",
  closed: "none",
};
const CTRL_STYLE: Record<DayStatus, { bg: string; color: string; border: string }> = {
  normal: { bg: "transparent", color: "#8E949B", border: "2px solid #8E949B" },
  short: { bg: "transparent", color: "#E9531F", border: "2px solid #E9531F" },
  closed: { bg: "#E9531F", color: "#fff", border: "2px solid #E9531F" },
};

// 컨트롤용 월 그리드 (일~토)
function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay(); // 0=일
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function App() {
  const now = new Date();
  const [state, setState] = useState<NoticeState>({
    branch: NOTICE_BRANCHES[0],
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    dayStatus: {},
    statusConfig: defaultStatusConfig(),
    extraText: "",
  });
  const [previewSize, setPreviewSize] = useState<OutputSize>("a4");
  const [exportSizes, setExportSizes] = useState<OutputSize[]>(["a4"]);
  const [exporting, setExporting] = useState(false);
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grid = useMemo(() => monthGrid(state.year, state.month), [state.year, state.month]);

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
      return { ...s, year: y, month: m, dayStatus: {} };
    });
  }
  function cycleDay(iso: string) {
    setState((s) => {
      const cur = (s.dayStatus[iso] ?? "none") as "none" | DayStatus;
      const nx = NEXT[cur];
      const ds = { ...s.dayStatus };
      if (nx === "none") delete ds[iso];
      else ds[iso] = nx;
      return { ...s, dayStatus: ds };
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
        const common = { width: size.w, height: size.h, pixelRatio: 1, cacheBust: true };
        const dataUrl =
          size.fmt === "jpg"
            ? await htmlToImage.toJpeg(node, { ...common, quality: 0.85, backgroundColor: "#ffffff" })
            : await htmlToImage.toPng(node, common);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${state.branch}_${state.month}월진료안내_${size.label}.${size.fmt}`;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (e) {
      console.error(e);
      alert("이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }

  const preview = OUTPUT_SIZES.find((s) => s.id === previewSize)!;
  const scale = Math.min(460 / preview.w, 620 / preview.h);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f5", color: "#18181b" }}>
      <div style={{ background: "#fef3c7", padding: "8px 16px", textAlign: "center", fontSize: 12, color: "#92400e" }}>
        ⚠️ 이 페이지는 입력 내용을 <b>저장하지 않습니다</b>. 새로고침·창닫기 시 모두 사라지니 완성되면 <b>이미지로 꼭 다운로드</b>하세요.
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 24, padding: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* 컨트롤 */}
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
              <label style={lbl}>월 선택 & 날짜별 진료 상태</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                <button onClick={() => shiftMonth(-1)} style={navBtn}>◀</button>
                <b>
                  {state.year}.{state.month} ({MONTH_ENG[state.month - 1]})
                </b>
                <button onClick={() => shiftMonth(1)} style={navBtn}>▶</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 8px" }}>
              날짜를 클릭할 때마다 상태가 바뀝니다: 없음 → <span style={{ color: "#8E949B" }}>정상</span> → <span style={{ color: "#E9531F" }}>단축</span> → <span style={{ color: "#E9531F", fontWeight: 700 }}>휴진</span> → 없음. 선택한 날짜들이 이미지에 연속으로 표시됩니다.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center", fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
              {KO_WD.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            {grid.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
                {row.map((iso, ci) =>
                  iso === null ? (
                    <div key={ci} />
                  ) : (
                    <button
                      key={ci}
                      onClick={() => cycleDay(iso)}
                      style={{
                        aspectRatio: "1", borderRadius: 8, fontSize: 13, cursor: "pointer",
                        ...(state.dayStatus[iso] ? CTRL_STYLE[state.dayStatus[iso]] : { background: "#f4f4f5", color: "#71717a", border: "1px solid #e4e4e7" }),
                      }}
                    >
                      {Number(iso.split("-")[2])}
                    </button>
                  ),
                )}
              </div>
            ))}
          </section>

          {/* 하단 안내문구 — 달력 선택에서 자동, 시간/표시만 */}
          <section style={card}>
            <label style={lbl}>하단 안내 문구 (달력 선택에서 자동 생성)</label>
            <p style={{ fontSize: 12, color: "#71717a", margin: "4px 0 10px" }}>날짜는 위 달력에서 정해집니다. 여기선 표시 여부(체크)와 시간만 설정하세요.</p>
            {STATUS_ORDER.map((st) => {
              const dates = Object.keys(state.dayStatus).filter((iso) => state.dayStatus[iso] === st);
              const cfg = state.statusConfig[st];
              const active = dates.length > 0;
              return (
                <div key={st} style={{ opacity: active ? 1 : 0.4, borderTop: "1px solid #f0f0f0", padding: "10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input type="checkbox" checked={cfg.include} disabled={!active} onChange={(e) => setCfg(st, { include: e.target.checked })} />
                    <span style={{ ...pillLbl, ...CTRL_STYLE[st] }}>{STATUS_LABEL[st]}</span>
                    {st !== "closed" && active && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginLeft: "auto" }}>
                        <input type="time" value={cfg.startTime} onChange={(e) => setCfg(st, { startTime: e.target.value })} style={inpSm} />
                        <span>-</span>
                        <input type="time" value={cfg.endTime} onChange={(e) => setCfg(st, { endTime: e.target.value })} style={inpSm} />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#52525b", marginTop: 6 }}>{active ? formatDateList(dates) : "해당 상태로 선택된 날짜 없음"}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#52525b" }}>기타 문구 (선택, 작게 표시)</label>
              <textarea value={state.extraText} onChange={(e) => onExtra(e.target.value)} rows={2} style={{ ...inp, marginTop: 4 }} placeholder="추가 안내 문구" />
            </div>
          </section>

          {/* 사이즈 + 변환 */}
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
            <p style={{ fontSize: 11, color: "#a1a1aa", margin: "0 0 10px" }}>A4는 인쇄용 JPG(고화질), 팝업·인스타는 웹용 PNG로 저장됩니다.</p>
            <button onClick={handleExport} disabled={exporting || exportSizes.length === 0} style={{ ...primaryBtn, opacity: exporting || exportSizes.length === 0 ? 0.5 : 1 }}>
              {exporting ? "이미지 생성 중..." : `이미지 변환하기 (${exportSizes.length}장)`}
            </button>
          </section>
        </div>

        {/* 미리보기 */}
        <div style={{ position: "sticky", top: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={lbl}>미리보기</span>
              <select value={previewSize} onChange={(e) => setPreviewSize(e.target.value as OutputSize)} style={inpSm}>
                {OUTPUT_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: preview.w * scale, height: preview.h * scale, overflow: "hidden", border: "1px solid #eee", margin: "0 auto" }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <NoticePoster variant={previewSize} state={state} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 숨김 내보내기 노드 */}
      <div style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }} aria-hidden>
        {exportSizes.map((sz) => (
          <div key={sz} ref={(el) => { posterRefs.current[sz] = el; }}>
            <NoticePoster variant={sz} state={state} />
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10, padding: 16 };
const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d4d4d8", borderRadius: 6, padding: 8, fontSize: 14 };
const inpSm: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 6, padding: 4, fontSize: 12 };
const navBtn: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 6, padding: "2px 8px", background: "#fff", cursor: "pointer" };
const chip: React.CSSProperties = { border: "1px solid #d4d4d8", borderRadius: 999, padding: "5px 12px", fontSize: 12, background: "#fff", cursor: "pointer", color: "#71717a" };
const chipOn: React.CSSProperties = { border: "1px solid #E9531F", background: "#fff7ed", color: "#c2410c" };
const primaryBtn: React.CSSProperties = { width: "100%", background: "#E9531F", color: "#fff", border: 0, borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const pillLbl: React.CSSProperties = { borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 };
