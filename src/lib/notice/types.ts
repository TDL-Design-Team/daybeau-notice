// 진료안내 생성기 데이터 모델 (연속 날짜 strip 버전)

export type DayStatus = "normal" | "short" | "closed"; // 정상 / 단축 / 휴진

export const STATUS_LABEL: Record<DayStatus, string> = {
  normal: "정상 진료",
  short: "단축 진료",
  closed: "휴진",
};

export const STATUS_ORDER: DayStatus[] = ["normal", "short", "closed"];

// 상태별 하단 안내문구 설정 (달력 선택으로 날짜는 자동, 여기선 시간·표시여부만)
export type StatusConfig = {
  include: boolean; // 이미지에 표시할지 (체크박스)
  startTime: string; // "10:00" (정상/단축만)
  endTime: string; // "19:00"
};

export type OutputSize = "a4" | "insta" | "mo" | "pc";

export const OUTPUT_SIZES: { id: OutputSize; label: string; w: number; h: number; fmt: "jpg" | "png" }[] = [
  { id: "a4", label: "A4", w: 2480, h: 3508, fmt: "jpg" }, // 출력용(고용량 방지 JPG)
  { id: "insta", label: "인스타", w: 1080, h: 1350, fmt: "png" },
  { id: "mo", label: "팝업 MO", w: 480, h: 720, fmt: "png" },
  { id: "pc", label: "팝업 PC", w: 1200, h: 720, fmt: "png" },
];

export type NoticeState = {
  branch: string;
  year: number;
  month: number; // 1-12
  dayStatus: Record<string, DayStatus>; // iso -> status (달력 선택)
  statusConfig: Record<DayStatus, StatusConfig>; // 하단 문구 상태별 설정
  extraText: string; // 기타 문구
};

export function defaultStatusConfig(): Record<DayStatus, StatusConfig> {
  return {
    normal: { include: true, startTime: "10:00", endTime: "19:00" },
    short: { include: true, startTime: "10:00", endTime: "17:00" },
    closed: { include: true, startTime: "", endTime: "" },
  };
}
