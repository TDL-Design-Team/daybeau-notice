// 지점 목록 (가나다순) — 진료안내 생성기 지점 선택용.
export const NOTICE_BRANCHES = [
  "강남 더 프리미엄점",
  "강서발산점",
  "광주상무점",
  "대전점",
  "명동 더 프리미엄점",
  "명동 시그니처점",
  "부산 서면점",
  "분당점",
  "수원점",
  "안양점",
  "여의도점",
  "영등포점",
  "인천구월점",
  "전주점",
] as const;

export type NoticeBranch = (typeof NOTICE_BRANCHES)[number];
