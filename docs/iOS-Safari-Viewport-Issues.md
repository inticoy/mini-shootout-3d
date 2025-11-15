# iOS Safari Viewport 및 Safe Area 문제 해결 시도 기록

## 프로젝트 정보
- **앱**: Snapshoot (Three.js 축구 슈팅 게임)
- **대상 환경**: iOS 26 Safari
- **문제 발생 시점**: 2025-01-XX

---

## 현재 상황 (최종)

### ✅ 정상 작동하는 부분
- **안전 영역 (Safe Area)**: 로딩스크린, 인게임, UI 모두 정상 표시
- **게임 콘텐츠**: Three.js 렌더링 정상
- **UI 배치**: 점수판 등 안전 영역 내 정상 배치

### ❌ 문제가 있는 부분
- **노치 영역**: 하늘색으로 고정 (의도한 색상으로 변경 안 됨)
- **하단 주소창 영역**: 연두색으로 고정 (의도한 색상으로 변경 안 됨)
- **로딩/인게임 구분 없음**: 두 화면 모두 동일한 하늘-연두 배경 표시

### 🎯 원하는 동작
- **로딩스크린**: 노치~주소창까지 하늘-연두 그라디언트
- **인게임**: 노치~주소창까지 빨강-녹색 그라디언트

---

## 시도했던 해결 방법들

### 1. Viewport Meta Tag 설정
#### 시도
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

#### 의도
- `viewport-fit=cover`: 노치와 하단 바 영역까지 콘텐츠 확장

#### 결과
- ✅ 메타 태그는 올바르게 설정됨
- ❌ 배경색 변경에는 효과 없음

---

### 2. CSS 높이 단위 변경

#### 시도 순서
1. `100vh` (초기)
2. `100svh` (Small Viewport Height)
3. `100lvh` (Large Viewport Height)
4. `100dvh` (Dynamic Viewport Height - 최종)

#### 각 단위의 의도
- `100vh`: 기본 뷰포트 높이
- `100svh`: iOS에서 주소창 펼친 상태 기준 (안전 영역만)
- `100lvh`: 주소창 숨긴 상태 기준 (노치~하단바 포함)
- `100dvh`: 동적으로 주소창 상태 반영

#### 발생한 문제들
- `100vh`: iOS에서 하단에 흰색 여백 발생
- `100svh`: 노치/하단바 영역 제외됨
- `100lvh`: 노치/하단바 포함했지만 배경색 변경 안 됨
- `100dvh`: 동일한 문제 (배경색 변경 안 됨)

#### 최종 선택
```css
body {
  height: 100svh;  /* 안전 영역 기준 */
}

#game-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
}
```

---

### 3. Three.js 렌더러 크기 설정 방식 변경

#### 시도 A: `window.innerWidth/innerHeight` (초기)
```typescript
renderer.setSize(window.innerWidth, window.innerHeight);
```
- **문제**: iOS에서 주소창 표시 여부에 따라 크기 변동
- **결과**: 일부만 렌더링되거나 여백 발생

#### 시도 B: `canvas.clientWidth/clientHeight`
```typescript
const rect = canvas.getBoundingClientRect();
renderer.setSize(rect.width, rect.height);
```
- **문제**: CSS 픽셀 단위라 devicePixelRatio 고려 필요
- **결과**: 캔버스가 2/3만 렌더링됨

#### 시도 C: `window.visualViewport`
```typescript
const width = window.visualViewport?.width || window.innerWidth;
const height = window.visualViewport?.height || window.innerHeight;
renderer.setSize(width, height);
```
- **문제**: visualViewport는 안전 영역만 반환
- **결과**: 노치/하단바 영역 제외됨

#### 시도 D: `canvas.getBoundingClientRect()`
```typescript
const rect = canvas.getBoundingClientRect();
renderer.setSize(rect.width, rect.height);
```
- **문제**: clientWidth/clientHeight와 동일한 문제
- **결과**: 렌더링 버퍼 크기 부족

#### 최종: `window.innerWidth/innerHeight` (회귀)
```typescript
renderer.setSize(window.innerWidth, window.innerHeight);
```
- **이유**: 가장 안정적으로 전체 화면 렌더링
- **단점**: 주소창 동적 변화 시 대응 필요

---

### 4. Safe Area Inset 적용

#### 시도 A: 모든 요소에 적용
```css
#game-container {
  top: env(safe-area-inset-top, 0);
  right: env(safe-area-inset-right, 0);
  bottom: env(safe-area-inset-bottom, 0);
  left: env(safe-area-inset-left, 0);
}
```
- **문제**: 게임 콘텐츠가 안전 영역에만 표시됨
- **결과**: 노치/하단바 영역에 배경만 보임

#### 시도 B: UI에만 적용
```css
#ui {
  top: env(safe-area-inset-top, 0);
  left: env(safe-area-inset-left, 0);
  right: env(safe-area-inset-right, 0);
  bottom: env(safe-area-inset-bottom, 0);
}
```
- **의도**: 게임은 전체 화면, UI만 안전 영역
- **결과**: ✅ UI 배치는 성공, ❌ 배경색 변경 실패

#### 최종 적용
- `#game-container`: `inset: 0` (전체 화면)
- `#game-canvas`: `inset: 0` (전체 화면)
- `#ui`: `env(safe-area-inset-*)` (안전 영역만)

---

### 5. 레이아웃 방식 변경

#### 시도 A: Relative Positioning
```css
#game-container {
  position: relative;
  width: 100%;
  height: 100%;
}
```
- **문제**: 부모 요소 크기에 의존
- **결과**: 크기 계산 복잡, 노치/하단바 대응 어려움

#### 시도 B: Fixed Positioning + env()
```css
#game-container {
  position: fixed;
  top: env(safe-area-inset-top, 0);
  /* ... */
  width: calc(100vw - env(safe-area-inset-left, 0) - env(safe-area-inset-right, 0));
  height: calc(100svh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
}
```
- **문제**: 안전 영역에만 배치됨
- **결과**: 노치/하단바 영역에 배경 표시됨

#### 최종: Fixed Positioning + inset: 0
```css
#game-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
}
```
- **의도**: 전체 화면을 덮되, 내부 요소만 안전 영역에 배치
- **결과**: ✅ 레이아웃은 성공, ❌ 배경색 변경 실패

---

### 6. Three.js 배경 설정

#### 시도 A: 불투명 배경 (초기)
```typescript
renderer = new THREE.WebGLRenderer({
  alpha: false
});
scene.background = new THREE.Color(0x87CEEB); // 하늘색
```
- **의도**: Three.js가 자체 배경 표시
- **결과**: ✅ 작동하지만 HTML 배경 사용 불가

#### 시도 B: 투명 배경
```typescript
renderer = new THREE.WebGLRenderer({
  alpha: true
});
scene.background = null;
```
- **의도**: HTML 배경 그라디언트가 보이도록
- **결과**: ❌ 로딩스크린 배경이 그대로 보임

#### 최종
```typescript
alpha: true  // HTML 배경 보이도록
scene.background = null
```

---

### 7. HTML 배경 동적 변경

#### 시도 A: CSS에서 설정
```css
html {
  background: linear-gradient(180deg, #ef4444 0%, #22c55e 100%);
}
```
- **문제**: 로딩스크린 배경과 충돌
- **결과**: 항상 빨강-녹색만 보임

#### 시도 B: JavaScript로 동적 변경
```typescript
// 로딩스크린 숨기기 시
document.documentElement.style.background =
  'linear-gradient(180deg, #ef4444 0%, #22c55e 100%)';
```
- **의도**: 인게임 진입 시 배경 변경
- **결과**: ❌ 노치/주소창 영역의 색상이 변경되지 않음

#### 시도 C: CSS 우선순위 확인
- Tailwind `@layer base` 제거
- `!important` 추가 고려
- `classList` 사용 고려

#### 최종 상태
```typescript
// loadingScreen.ts - hide()
document.documentElement.style.background =
  'linear-gradient(180deg, #ef4444 0%, #22c55e 100%)';
```
- **문제**: 여전히 작동하지 않음

---

## 웹 검색 결과 및 참고 자료

### iOS 26 "Liquid Glass" 디자인 변경사항
- **출처**: Medium - "iOS 26.0 | Be prepared for viewport changes in Safari"
- **내용**:
  - iOS 26에서 Safari 탭 모드 변경
  - `window.outerHeight` 사용 권장
  - `vh` 단위가 `window.outerHeight`의 1 포인트를 차지하도록 변경
  - 주소창 확장/축소와 무관하게 `window.outerHeight`는 일정

### viewport-fit=cover 이슈
- **출처**: Stack Overflow, WebKit Blog
- **내용**:
  - `viewport-fit=cover` 필수
  - `env(safe-area-inset-*)` 사용 가능하게 함
  - 일부 iOS 버전에서 버그 보고됨

### visualViewport API 한계
- **출처**: GitHub WICG/visual-viewport Issue #78
- **내용**:
  - iOS 15에서 `window.visualViewport.height` 부정확
  - 키보드 표시 여부에 따라 값 변동
  - 안전 영역만 반환, 노치/하단바 제외

### 100dvh 권장
- **출처**: Three.js Journey, CSS-Tricks
- **내용**:
  - Dynamic Viewport Height 사용 권장
  - 주소창 동적 변화 대응
  - 단, 배경 확장과는 별개 문제

---

## 최종 구현 상태

### 파일 구조
```
index.html
├── <meta viewport-fit=cover>
└── <div id="game-container">
    ├── <div id="loading-screen">  (z-index: 9999)
    ├── <canvas id="game-canvas">
    └── <div id="ui">
```

### CSS 설정
```css
/* style.css */
html {
  height: 100dvh;
  min-height: 100dvh;
  /* 배경은 JavaScript에서 동적 설정 */
}

body {
  background: transparent;
  height: 100dvh;
  min-height: 100dvh;
}

#game-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
  background: transparent;
}

#game-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
}

#ui {
  position: absolute;
  top: env(safe-area-inset-top, 0);
  left: env(safe-area-inset-left, 0);
  right: env(safe-area-inset-right, 0);
  bottom: env(safe-area-inset-bottom, 0);
}
```

### 로딩스크린
```typescript
// loadingScreen.ts
container: 'loading-screen fixed inset-0 z-[9999] flex w-screen h-[100dvh]
  bg-[linear-gradient(180deg,#5BA3E8_0%,#87CEEB_30%,#B8E6F5_55%,#B8E6F5_100%)]'

// hide() 메서드
public hide() {
  // HTML 배경을 빨강-녹색으로 변경 시도
  document.documentElement.style.background =
    'linear-gradient(180deg, #ef4444 0%, #22c55e 100%)';

  this.container.classList.add('loading-screen--hidden');
  setTimeout(() => {
    this.container.remove();
  }, 500);
}
```

### Three.js 설정
```typescript
// game.ts
scene.background = null;  // 투명

// graphics.ts
renderer = new THREE.WebGLRenderer({
  alpha: true  // HTML 배경 보이도록
});
renderer.setSize(window.innerWidth, window.innerHeight);
```

---

## 남은 문제 및 원인 추정

### 현재 증상
- ✅ 안전 영역: 모든 콘텐츠 정상 표시
- ❌ 노치 영역: 하늘색으로 고정
- ❌ 주소창 영역: 연두색으로 고정
- ❌ 로딩/인게임 구분 없음

### 가능한 원인

#### 1. 로딩스크린 DOM 제거 타이밍
- `opacity: 0` 후 500ms 지연
- 이 시간 동안 로딩스크린 배경이 보임
- DOM 제거 후에도 배경이 남아있을 가능성

#### 2. iOS Safari의 viewport-fit=cover 버그
- 일부 iOS 버전에서 제대로 작동하지 않음
- 특히 동적 배경 변경 시 문제
- 하드웨어 가속 관련 이슈일 가능성

#### 3. CSS 우선순위 및 캐싱
- Tailwind `@layer base`와 인라인 스타일 충돌
- Safari의 CSS 캐싱 정책
- `!important` 미사용으로 인한 우선순위 문제

#### 4. 렌더링 레이어 문제
- 로딩스크린 (`z-index: 9999`)
- 게임 캔버스 (`z-index: 기본`)
- HTML 배경 (최하위)
- 레이어 순서에서 로딩스크린 배경이 최상위에 남아있을 가능성

#### 5. Three.js 투명 렌더링
- `alpha: true`로 설정했지만
- 캔버스가 전체를 덮지 못함
- 또는 GPU 가속으로 인한 레이어 분리

---

## 시도하지 않은 대안들

### 1. 즉시 DOM 제거
```typescript
public hide() {
  this.container.remove();  // 지연 없이 즉시 제거
  document.documentElement.style.background = '...';
}
```

### 2. CSS 클래스 방식
```typescript
// 인라인 스타일 대신 클래스 전환
document.documentElement.classList.remove('loading-bg');
document.documentElement.classList.add('game-bg');
```

### 3. !important 사용
```typescript
document.documentElement.style.setProperty(
  'background',
  'linear-gradient(...)',
  'important'
);
```

### 4. 배경 이미지 사용
```css
html {
  background-image: url('gradient.png');
  background-size: cover;
}
```

### 5. Canvas 배경 레이어 추가
```html
<canvas id="bg-canvas"></canvas>  <!-- 배경 전용 캔버스 -->
<canvas id="game-canvas"></canvas>
```

### 6. WebGL 풀스크린 배경
- Three.js로 전체 화면 배경 평면 렌더링
- 노치/주소창까지 덮도록 설정

### 7. 메타 태그 조합 시도
```html
<meta name="viewport" content="initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

---

## 차선책

### 옵션 1: 검은색으로 통일 (권장)
```css
html {
  background: #000000;  /* 검은색 단색 */
}
```
- **장점**: 가장 안정적, 많은 게임에서 사용
- **단점**: 디자인 의도와 다름

### 옵션 2: 안전 영역에만 맞추기
```css
#game-container {
  top: env(safe-area-inset-top, 0);
  /* ... */
}
html {
  background: #FFFFFF;  /* 시스템 기본 */
}
```
- **장점**: iOS 권장사항 준수
- **단점**: 노치/주소창 영역 활용 못함

### 옵션 3: 단색 배경
```css
html {
  background: #6AB534;  /* 잔디색 단색 */
}
```
- **장점**: 게임 테마와 어울림
- **단점**: 그라디언트 효과 포기

---

## 결론

### 성공한 부분
1. ✅ viewport-fit=cover 설정
2. ✅ 안전 영역 내 콘텐츠 정상 표시
3. ✅ Three.js 렌더링 성공
4. ✅ UI 안전 영역 배치
5. ✅ 로딩스크린 배경 표시

### 실패한 부분
1. ❌ 노치/주소창 영역 배경색 동적 변경
2. ❌ 로딩/인게임 배경 구분

### 추정 원인
- iOS Safari의 viewport-fit=cover 제한적 지원
- 동적 배경 변경에 대한 브라우저 최적화 문제
- 렌더링 레이어 간섭

### 다음 단계 권장사항
1. 검은색 배경 또는 잔디색 단색 배경 사용
2. 또는 차선책 옵션 1-3 중 선택
3. iOS Safari의 향후 업데이트 대기
