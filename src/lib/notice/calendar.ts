// 달력/날짜 유틸 — 주차(일~토) 기반.

export const MONTH_ENG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const KO_WD = ["일", "월", "화", "수", "목", "금", "토"];

export type DayCell = {
  iso: string;
  day: number;
  inMonth: boolean; // 기준 월에 속하는지
};
export type WeekRow = DayCell[]; // 항상 7칸 (일~토)

function pad(n: number) { return String(n).padStart(2, "0"); }
export function toIso(y: number, m: number, d: number): string { return `${y}-${pad(m)}-${pad(d)}`; }
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function koWeekday(iso: string): string { return KO_WD[isoToDate(iso).getDay()]; }

// 기준 월을 덮는 주(일~토)들. 월의 날이 하나라도 들어간 주만 포함.
export function weeksOfMonth(year: number, month: number): WeekRow[] {
  const first = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - first.getDay()); // 그 주 일요일
  const weeks: WeekRow[] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: WeekRow = [];
    let touches = false;
    for (let i = 0; i < 7; i++) {
      const y = cur.getFullYear(), m = cur.getMonth() + 1, d = cur.getDate();
      const inMonth = m === month && y === year;
      if (inMonth) touches = true;
      row.push({ iso: toIso(y, m, d), day: d, inMonth });
      cur.setDate(cur.getDate() + 1);
    }
    if (touches) weeks.push(row);
    else if (weeks.length > 0) break;
  }
  return weeks;
}

// "9월 8일 (화)"
export function formatDateKo(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일 (${koWeekday(iso)})`;
}
// "8일 (화)" (월 생략)
function formatDayKo(iso: string): string {
  const [, , d] = iso.split("-").map(Number);
  return `${d}일 (${koWeekday(iso)})`;
}

// 연속은 범위, 나머지는 나열. 월 표기는 맨 앞에만.
// [8,11] -> "9월 8일 (화), 11일 (금)"
// [8,9,10] -> "9월 8일 (화) ~ 10일 (목)"
export function formatDateList(isos: string[]): string {
  if (isos.length === 0) return "";
  const sorted = [...isos].sort();
  const groups: string[][] = [];
  let g: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const diff = (isoToDate(sorted[i]).getTime() - isoToDate(sorted[i - 1]).getTime()) / 86400000;
    if (diff === 1) g.push(sorted[i]);
    else { groups.push(g); g = [sorted[i]]; }
  }
  groups.push(g);
  const parts = groups.map((grp) =>
    grp.length === 1 ? formatDayKo(grp[0]) : `${formatDayKo(grp[0])} ~ ${formatDayKo(grp[grp.length - 1])}`,
  );
  // 맨 앞에만 "N월" 붙이기
  const [, fm] = sorted[0].split("-").map(Number);
  parts[0] = `${fm}월 ${parts[0]}`;
  return parts.join(", ");
}

// "10:00 - 19:00" (AM/PM 없음)
export function formatTimeRange(start: string, end: string): string {
  if (!start || !end) return "";
  return `${start} - ${end}`;
}
