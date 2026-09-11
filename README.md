# DayBeau 진료 안내 이미지 생성기

지점·디자인팀·외주팀이 로그인 없이 사용하는 **진료 안내 팝업 이미지 생성 도구**입니다.
디자인(프레임/그라데이션/로고)은 고정이고, 지점·월·달력·안내문구만 입력하면
A4 / 인스타 / 팝업 MO / 팝업 PC 사이즈로 이미지를 뽑아 다운로드합니다.

- 서버·DB·로그인 **없음** (100% 브라우저에서 동작하는 정적 사이트)
- 입력값은 저장되지 않음 → 완성하면 반드시 이미지로 다운로드

## 로컬 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 정적 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## GitHub Pages 배포 (무료 · 공개)

1. 이 폴더 내용을 **public 저장소**에 올립니다.
2. GitHub 저장소 → **Settings → Pages → Build and deployment → Source** 를
   **GitHub Actions** 로 설정합니다.
3. `main` 브랜치에 push 하면 `.github/workflows/deploy.yml` 이 자동으로 빌드·배포합니다.
4. 배포 후 `https://<계정 또는 조직>.github.io/<저장소이름>/` 링크로 접속·공유합니다.

> `vite.config.ts` 의 `base: "./"` 덕분에 어떤 하위 경로에서도 동작합니다.

## 구조

```
src/
  App.tsx                     입력 컨트롤 + 미리보기 + 이미지 변환
  components/notice/NoticePoster.tsx   포스터 4종(A4/인스타/MO/PC) 렌더
  lib/notice/                 지점 목록·달력 유틸·타입
  assets/fonts/               Pretendard / Broshock (woff2)
  assets/notice/              배경 장식 PNG (PSD에서 추출)
```

## 수정 자주 하는 것

- **지점 목록**: `src/lib/notice/branches.ts`
- **레이아웃 좌표**(글자 위치·크기): `src/components/notice/NoticePoster.tsx` 의 `SPECS`
- **배경 디자인**: `src/assets/notice/bg-*.png` 교체
