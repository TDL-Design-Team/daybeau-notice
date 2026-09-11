
import { useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import NoticePoster from "@/components/notice/NoticePoster";
import { NOTICE_BRANCHES } from "@/lib/notice/branches";
import {
  MONTH_ENG,
  WeekRow,
  nextMonthFirstWeek,
  weeksOfMonth,
} from "@/lib/notice/calendar";
import {
  BottomEntry,
  DayStatus,
  NoticeState,
  OUTPUT_SIZES,
  OutputSize,
  STATUS_LABEL,
} from "@/lib/notice/types";

const STATUS_ORDER: (DayStatus | null)[] = [null, "normal", "short", "closed"];
const STATUS_COLORS: Record<DayStatus, string> = {
  normal: "#E9531F",
  short: "#E9531F",
  closed: "#E9531F",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NoticeGeneratorPage() {
  const now = new Date();
  const [state, setState] = useState<NoticeState>({
    branch: NOTICE_BRANCHES[0],
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    includedWeeks: [],
    dayStatus: {},
    bottomEntries: [],
    extraText: "",
  });
  const [previewSize, setPreviewSize] = useState<OutputSize>("insta");
  const [exportSizes, setExportSizes] = useState<OutputSize[]>(["insta"]);
  const [exporting, setExporting] = useState(false);
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 월의 주들 + 다음달 1주차
  const monthWeeks = useMemo(() => weeksOfMonth(state.year, state.month), [state.year, state.month]);
  const extraWeek = useMemo(
    () => nextMonthFirstWeek(state.year, state.month),
    [state.year, state.month],
  );
  const allRows: WeekRow[] = useMemo(() => [...monthWeeks, extraWeek], [monthWeeks, extraWeek]);

  // 월 바뀌면 주차 전체 선택으로 초기화 (다음달주 제외)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, includedWeeks: monthWeeks.map((_, i) => i) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.year, state.month]);

  const includedRows = useMemo(
    () => allRows.filter((_, i) => state.includedWeeks.includes(i)),
    [allRows, state.includedWeeks],
  );

  // 이탈 경고 (저장 안 됨)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function shiftMonth(delta: number) {
    setState((s) => {
      let m = s.month + delta;
      let y = s.year;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { ...s, year: y, month: m };
    });
  }

  function toggleWeek(i: number) {
    setState((s) => ({
      ...s,
      includedWeeks: s.includedWeeks.includes(i)
        ? s.includedWeeks.filter((x) => x !== i)
        : [...s.includedWeeks, i].sort((a, b) => a - b),
    }));
  }

  function cycleDay(iso: string) {
    setState((s) => {
      const cur = s.dayStatus[iso] ?? null;
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
      const ds = { ...s.dayStatus };
      if (next === null) delete ds[iso];
      else ds[iso] = next;
      return { ...s, dayStatus: ds };
    });
  }

  function addEntry() {
    setState((s) => ({
      ...s,
      bottomEntries: [
        ...s.bottomEntries,
        { id: uid(), type: "short", startDate: null, endDate: null, startTime: "10:00", endTime: "19:00" },
      ],
    }));
  }
  function updateEntry(id: string, patch: Partial<BottomEntry>) {
    setState((s) => ({
      ...s,
      bottomEntries: s.bottomEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }
  function removeEntry(id: string) {
    setState((s) => ({ ...s, bottomEntries: s.bottomEntries.filter((e) => e.id !== id) }));
  }

  function onExtraChange(v: string) {
    // 6줄 / 45자 per line / 270자 제한
    const lines = v.split("\n").slice(0, 6).map((l) => l.slice(0, 45));
    let joined = lines.join("\n");
    if (joined.length > 270) joined = joined.slice(0, 270);
    setState((s) => ({ ...s, extraText: joined }));
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
        const dataUrl = await htmlToImage.toPng(node, {
          width: size.w,
          height: size.h,
          pixelRatio: 1,
          cacheBust: true,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${state.branch}_${state.month}월진료안내_${size.label}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      console.error(err);
      alert("이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setExporting(false);
    }
  }

  const previewSpec = OUTPUT_SIZES.find((s) => s.id === previewSize)!;
  const previewMaxW = 460;
  const previewScale = Math.min(previewMaxW / previewSpec.w, 620 / previewSpec.h);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* 상단 경고 배너 */}
      <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-800">
        ⚠️ 이 페이지는 입력 내용을 <b>저장하지 않습니다</b>. 새로고침하거나 창을 닫으면 모두
        사라지니, 완성되면 <b>이미지로 꼭 다운로드</b>하세요.
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:flex-row lg:items-start">
        {/* ===== 컨트롤 ===== */}
        <div className="flex-1 space-y-5">
          <h1 className="text-lg font-bold">진료 안내 이미지 생성기</h1>

          {/* 지점 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <label className="mb-1 block text-sm font-semibold">지점</label>
            <select
              value={state.branch}
              onChange={(e) => setState((s) => ({ ...s, branch: e.target.value }))}
              className="w-full rounded border border-zinc-300 p-2 text-sm"
            >
              {NOTICE_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </section>

          {/* 월 + 주차 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold">월 / 주차 선택</label>
              <div className="flex items-center gap-3 text-sm">
                <button onClick={() => shiftMonth(-1)} className="rounded border px-2 py-0.5">
                  ◀
                </button>
                <span className="font-medium">
                  {state.year}년 {state.month}월 ({MONTH_ENG[state.month - 1]})
                </span>
                <button onClick={() => shiftMonth(1)} className="rounded border px-2 py-0.5">
                  ▶
                </button>
              </div>
            </div>
            <p className="mb-2 text-xs text-zinc-500">
              포스터에 표시할 주차를 선택하세요 (기본: 이번 달 전체). 필요하면 다음달 1주차까지 포함
              가능합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {allRows.map((week, i) => {
                const isNext = i >= monthWeeks.length;
                const first = week[0];
                const last = week[6];
                const label = isNext
                  ? `다음달 1주차`
                  : `${i + 1}주 (${first.day}~${last.day})`;
                const on = state.includedWeeks.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleWeek(i)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      on ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-300 text-zinc-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 달력 날짜 상태 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <label className="mb-1 block text-sm font-semibold">날짜별 진료 상태</label>
            <p className="mb-3 text-xs text-zinc-500">
              날짜를 클릭할 때마다 상태가 바뀝니다: (없음) → 정상진료 → 단축진료 → 휴진일 → (없음)
            </p>
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-400">
                {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              {includedRows.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell) => {
                    const st = state.dayStatus[cell.iso];
                    return (
                      <button
                        key={cell.iso}
                        onClick={() => cycleDay(cell.iso)}
                        className={`aspect-square rounded text-xs ${
                          cell.inMonth ? "" : "opacity-40"
                        }`}
                        style={{
                          background: st ? STATUS_COLORS[st] : "#f4f4f5",
                          color: st ? "#fff" : "#71717a",
                          border: st === "closed" ? "2px solid #E9531F" : "1px solid #e4e4e7",
                        }}
                        title={st ? STATUS_LABEL[st] : ""}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-[11px] text-zinc-500">
              <span>정상/단축진료 = 주황 테두리·글자</span>
              <span>휴진일 = 주황 채움</span>
            </div>
          </section>

          {/* 하단 안내 문구 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold">하단 안내 문구</label>
              <button
                onClick={addEntry}
                className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white"
              >
                + 항목 추가
              </button>
            </div>
            <div className="space-y-3">
              {state.bottomEntries.map((e) => (
                <div key={e.id} className="rounded border border-zinc-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <select
                      value={e.type}
                      onChange={(ev) => updateEntry(e.id, { type: ev.target.value as DayStatus })}
                      className="rounded border border-zinc-300 p-1 text-xs"
                    >
                      <option value="normal">정상 진료</option>
                      <option value="short">단축 진료</option>
                      <option value="closed">휴진일</option>
                    </select>
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="ml-auto text-xs text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="date"
                      value={e.startDate ?? ""}
                      onChange={(ev) => updateEntry(e.id, { startDate: ev.target.value || null })}
                      className="rounded border border-zinc-300 p-1"
                    />
                    <span>~</span>
                    <input
                      type="date"
                      value={e.endDate ?? ""}
                      onChange={(ev) => updateEntry(e.id, { endDate: ev.target.value || null })}
                      className="rounded border border-zinc-300 p-1"
                    />
                    {e.type !== "closed" && (
                      <>
                        <input
                          type="time"
                          value={e.startTime}
                          onChange={(ev) => updateEntry(e.id, { startTime: ev.target.value })}
                          className="rounded border border-zinc-300 p-1"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={e.endTime}
                          onChange={(ev) => updateEntry(e.id, { endTime: ev.target.value })}
                          className="rounded border border-zinc-300 p-1"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
              {state.bottomEntries.length === 0 && (
                <p className="text-xs text-zinc-400">항목을 추가해 안내 문구를 만드세요.</p>
              )}
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">
                기타 문구 (한 줄 최대 45자 · 최대 6줄 · 총 270자)
              </label>
              <textarea
                value={state.extraText}
                onChange={(e) => onExtraChange(e.target.value)}
                rows={4}
                className="w-full rounded border border-zinc-300 p-2 text-sm"
                placeholder="추가로 넣을 안내 문구가 있으면 입력하세요."
              />
              <div className="text-right text-[11px] text-zinc-400">
                {state.extraText.length}/270
              </div>
            </div>
          </section>

          {/* 사이즈 + 변환 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold">이미지 사이즈 (중복 선택)</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {OUTPUT_SIZES.map((sz) => {
                const on = exportSizes.includes(sz.id);
                return (
                  <button
                    key={sz.id}
                    onClick={() =>
                      setExportSizes((prev) =>
                        prev.includes(sz.id) ? prev.filter((x) => x !== sz.id) : [...prev, sz.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs ${
                      on ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-300 text-zinc-500"
                    }`}
                  >
                    {sz.label} ({sz.w}×{sz.h})
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || exportSizes.length === 0}
              className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {exporting ? "이미지 생성 중..." : `이미지 변환하기 (${exportSizes.length}장 다운로드)`}
            </button>
          </section>
        </div>

        {/* ===== 미리보기 ===== */}
        <div className="lg:sticky lg:top-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">미리보기</span>
              <select
                value={previewSize}
                onChange={(e) => setPreviewSize(e.target.value as OutputSize)}
                className="rounded border border-zinc-300 p-1 text-xs"
              >
                {OUTPUT_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="mx-auto overflow-hidden border border-zinc-100"
              style={{ width: previewSpec.w * previewScale, height: previewSpec.h * previewScale }}
            >
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                <NoticePoster variant={previewSize} state={state} weeks={includedRows} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 내보내기용 숨김 포스터 (선택된 사이즈만 네이티브 해상도로 렌더) */}
      <div style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }} aria-hidden>
        {exportSizes.map((sz) => (
          <div key={sz} ref={(el) => { posterRefs.current[sz] = el; }}>
            <NoticePoster variant={sz} state={state} weeks={includedRows} />
          </div>
        ))}
      </div>
    </div>
  );
}
