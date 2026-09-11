// 달력/날짜 유틸 — 월~일 7열, 주차 단위.

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

export const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];

export type DayCell = {
  iso: string; // yyyy-mm-dd
  day: number; // 날짜 숫자
  inMonth: boolean; // 기준 월에 속하는지
  weekdayIndex: number; // 0=월 ... 6=일
};

export type WeekRow = DayCell[]; // 항상 7칸 (월~일)

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

// JS getDay(): 0=일 ... 6=토  →  월=0 기준으로 변환
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

// 기준 월의 모든 주(월~일)를 반환. 다음달로 넘어가는 마지막 주까지 포함.
export function weeksOfMonth(year: number, month: number): WeekRow[] {
  const first = new Date(year, month - 1, 1);
  const startOffset = mondayIndex(first.getDay());
  // 그리드 시작일 = 그 주의 월요일
  const gridStart = new Date(year, month - 1, 1 - startOffset);

  const weeks: WeekRow[] = [];
  const cursor = new Date(gridStart);
  // 기준 월의 날이 한 칸이라도 들어있는 주는 모두 포함
  for (let w = 0; w < 6; w++) {
    const row: WeekRow = [];
    let touchesMonth = false;
    for (let i = 0; i < 7; i++) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const d = cursor.getDate();
      const inMonth = m === month && y === year;
      if (inMonth) touchesMonth = true;
      row.push({ iso: toIso(y, m, d), day: d, inMonth, weekdayIndex: i });
      cursor.setDate(cursor.getDate() + 1);
    }
    // 이번 주가 기준 월을 전혀 안 건드리고, 이미 월을 지난 경우 종료
    if (!touchesMonth && weeks.length > 0) break;
    if (touchesMonth || weeks.length === 0) weeks.push(row);
    else break;
  }
  return weeks;
}

// "다음달 1주차" 옵션용 — 기준 월 다음주(그리드상 다음 주) 한 줄
export function nextMonthFirstWeek(year: number, month: number): WeekRow {
  const weeks = weeksOfMonth(year, month);
  const last = weeks[weeks.length - 1];
  const lastSun = last[6];
  const [ly, lm, ld] = lastSun.iso.split("-").map(Number);
  const start = new Date(ly, lm - 1, ld + 1); // 다음 월요일
  const row: WeekRow = [];
  const cursor = new Date(start);
  for (let i = 0; i < 7; i++) {
    row.push({
      iso: toIso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()),
      day: cursor.getDate(),
      inMonth: false,
      weekdayIndex: i,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return row;
}

export function weekdayKoForIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAY_KO[mondayIndex(new Date(y, m - 1, d).getDay())];
}

// "9월 24일(목)" 형식
export function formatDateKo(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일(${weekdayKoForIso(iso)})`;
}

// 하단 문구용 날짜 범위 문자열: "9월 24일(목) ~ 26(토)"
export function formatDateRangeKo(startIso: string, endIso: string | null): string {
  if (!endIso || endIso === startIso) return formatDateKo(startIso);
  const [, , sd] = startIso.split("-").map(Number);
  const [, em, ed] = endIso.split("-").map(Number);
  const [, sm] = startIso.split("-").map(Number);
  void sd;
  const startPart = formatDateKo(startIso);
  // 같은 달이면 끝은 "26(토)"만, 다른 달이면 "10월 3일(금)"
  if (sm === em) return `${startPart} ~ ${ed}(${weekdayKoForIso(endIso)})`;
  return `${startPart} ~ ${formatDateKo(endIso)}`;
}
