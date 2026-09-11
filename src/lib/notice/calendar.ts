// 달력/날짜 유틸 — "연속 날짜 strip" 모델.
// 선택한 날짜들의 최소~최대 구간을 7일씩 여러 줄로 보여준다.

export const MONTH_ENG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const KO_WD = ["일", "월", "화", "수", "목", "금", "토"];

export type DayCell = {
  iso: string;
  day: number;
  weekdayKo: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function koWeekday(iso: string): string {
  return KO_WD[isoToDate(iso).getDay()];
}

// startIso ~ endIso(포함) 사이의 모든 날짜
export function daysBetween(startIso: string, endIso: string): DayCell[] {
  const out: DayCell[] = [];
  const cur = isoToDate(startIso);
  const end = isoToDate(endIso);
  while (cur <= end) {
    const iso = toIso(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    out.push({ iso, day: cur.getDate(), weekdayKo: KO_WD[cur.getDay()] });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// 선택된 날짜들 → strip 행들(7일씩). 최소~최대 구간 전체를 연속으로 채운다.
export function buildStrip(selectedIsos: string[]): DayCell[][] {
  if (selectedIsos.length === 0) return [];
  const sorted = [...selectedIsos].sort();
  const all = daysBetween(sorted[0], sorted[sorted.length - 1]);
  const rows: DayCell[][] = [];
  for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
  return rows;
}

// "10월 3일 (토)"
export function formatDateKo(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일 (${koWeekday(iso)})`;
}
// "3일 (토)" — 범위 끝 표기용
function formatDayKo(iso: string): string {
  const [, , d] = iso.split("-").map(Number);
  return `${d}일 (${koWeekday(iso)})`;
}

// 연속 날짜는 범위로 묶고 나머지는 나열:
// [3,5,9] -> "10월 3일 (토), 10월 5일 (월), 10월 9일 (금)"
// [3,4,5,9] -> "10월 3일 (토) ~ 5일 (월), 10월 9일 (금)"
export function formatDateList(isos: string[]): string {
  if (isos.length === 0) return "";
  const sorted = [...isos].sort();
  const groups: string[][] = [];
  let cur: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = isoToDate(sorted[i - 1]);
    const now = isoToDate(sorted[i]);
    const diff = (now.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) cur.push(sorted[i]);
    else {
      groups.push(cur);
      cur = [sorted[i]];
    }
  }
  groups.push(cur);
  return groups
    .map((g) => (g.length === 1 ? formatDateKo(g[0]) : `${formatDateKo(g[0])} ~ ${formatDayKo(g[g.length - 1])}`))
    .join(", ");
}

// "10:00" -> "AM 10:00" / "19:00" -> "PM 19:00" (숫자는 그대로, PSD 표기 방식)
export function formatTimeAmPm(hhmm: string): string {
  if (!hhmm) return "";
  const h = Number(hhmm.split(":")[0]);
  const ap = h < 12 ? "AM" : "PM";
  return `${ap} ${hhmm}`;
}
