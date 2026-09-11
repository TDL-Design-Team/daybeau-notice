// 진료안내 생성기 데이터 모델

// 날짜별 진료 상태 (날짜당 1개)
export type DayStatus = "normal" | "short" | "closed"; // 정상진료 / 단축진료 / 휴진일

export const STATUS_LABEL: Record<DayStatus, string> = {
  normal: "정상 진료",
  short: "단축 진료",
  closed: "휴진",
};

// 하단 안내 문구 한 항목
export type BottomEntry = {
  id: string;
  type: DayStatus;
  startDate: string | null; // ISO yyyy-mm-dd
  endDate: string | null; // ISO, 단일 날짜면 null
  startTime: string; // "10:00" — 정상/단축만
  endTime: string; // "19:00" — 정상/단축만
};

export type OutputSize = "a4" | "insta" | "mo" | "pc";

export const OUTPUT_SIZES: { id: OutputSize; label: string; w: number; h: number }[] = [
  { id: "a4", label: "A4", w: 2480, h: 3508 },
  { id: "insta", label: "인스타", w: 1080, h: 1350 },
  { id: "mo", label: "팝업 MO", w: 480, h: 720 },
  { id: "pc", label: "팝업 PC", w: 1200, h: 720 },
];

// 생성기 전체 상태
export type NoticeState = {
  branch: string;
  year: number;
  month: number; // 1-12 (표지 제목 기준 달)
  includedWeeks: number[]; // 표시할 주차 인덱스 (0-base, calendar.weeks 기준)
  dayStatus: Record<string, DayStatus>; // iso -> status (달력 강조)
  bottomEntries: BottomEntry[];
  extraText: string; // 기타 문구 (45자/줄, 6줄, 270자)
};
