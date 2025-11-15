# 안전한 리팩토링 가이드

## 목적
이 문서는 Snapshoot 프로젝트를 리팩토링하면서 **기능이 변경되지 않도록** 보장하기 위한 전략과 체크리스트를 제공합니다.

---

## ⚠️ 리팩토링 시 핵심 원칙

### 1. 기능 변경 없음 (No Behavior Change)
리팩토링은 **코드 구조만 개선**하고, **기능은 절대 변경하지 않습니다**.
- ❌ 버그 수정과 리팩토링을 동시에 하지 않습니다
- ❌ 새로운 기능 추가와 리팩토링을 동시에 하지 않습니다
- ✅ 리팩토링만 집중합니다

### 2. 작은 단위로 진행 (Small Steps)
한 번에 하나의 작은 변경만 수행합니다.
- ✅ 한 번에 하나의 파일/클래스만 리팩토링
- ✅ 각 단계마다 테스트
- ✅ 각 단계마다 커밋

### 3. 지속적인 검증 (Continuous Validation)
매 단계마다 게임이 정상 작동하는지 확인합니다.
- ✅ 개발 서버로 실시간 확인
- ✅ 주요 기능 테스트
- ✅ 빌드 성공 확인

---

## 🛡️ 리팩토링 전 준비사항

### 1. 현재 상태 보존
```bash
# 현재 브랜치 확인
git status

# 변경사항이 있으면 커밋
git add .
git commit -m "refactor: 리팩토링 시작 전 현재 상태 커밋"

# 리팩토링 전용 브랜치 생성 (선택사항)
git checkout -b refactor/game-ts-split
```

### 2. 개발 환경 확인
```bash
# 의존성 설치 확인
pnpm install

# 개발 서버 실행 테스트
pnpm dev
# ✅ 확인: http://localhost:5173 접속 가능

# 빌드 테스트
pnpm build
# ✅ 확인: 빌드 성공
```

### 3. 주요 기능 테스트 체크리스트
리팩토링 전과 후에 다음 기능들을 **직접 테스트**합니다:

- [ ] **게임 시작**: 페이지 로드 후 게임이 정상적으로 표시됨
- [ ] **공 발사**: 스와이프로 공 발사 가능
- [ ] **일반 슛**: 직선 슛이 정상 작동
- [ ] **커브 슛**: 커브 슛이 정상 작동
- [ ] **골 득점**: 골대에 공이 들어가면 점수 증가
- [ ] **골키퍼 세이브**: 골키퍼가 공을 막음
- [ ] **장애물 충돌**: 장애물과 충돌 시 공이 튕김
- [ ] **난이도 증가**: 점수 증가 시 장애물이 추가됨
- [ ] **실패 처리**: 3번 실패 시 게임 오버
- [ ] **일시정지**: 일시정지 버튼 작동
- [ ] **재시작**: 재시작 기능 정상 작동
- [ ] **사운드**: 발차기, 골, 관중 소리 재생
- [ ] **볼 테마 변경**: 설정에서 볼 테마 변경 가능

---

## 📋 리팩토링 프로세스 (단계별)

### 단계 0: 기준선(Baseline) 설정
```bash
# 1. 현재 상태 커밋
git add .
git commit -m "refactor: baseline - 리팩토링 시작 전"

# 2. 주요 기능 테스트 (위 체크리스트 사용)
# 3. 스크린샷 또는 화면 녹화 (선택사항)
```

### 단계 1: 작은 변경 수행
예: `game.ts`에서 상수를 `config/game.ts`로 이동

```typescript
// 변경 전 (game.ts)
const MIN_VERTICAL_BOUNCE_SPEED = 0.45;
const BOUNCE_COOLDOWN_MS = 120;

// 변경 후 (config/game.ts - 새 파일)
export const GAME_CONFIG = {
  bounceSound: {
    minVerticalSpeed: 0.45,
    cooldownMs: 120
  }
};

// game.ts에서 사용
import { GAME_CONFIG } from './config/Game';
// ...
if (speed > GAME_CONFIG.bounceSound.minVerticalSpeed) {
  // ...
}
```

### 단계 2: 즉시 검증
```bash
# 1. 타입스크립트 컴파일 에러 확인
pnpm build

# 2. 개발 서버 실행
pnpm dev

# 3. 브라우저에서 테스트
# - 공 발사 테스트
# - 바운스 사운드 재생 확인 (이 예제의 경우)
```

### 단계 3: 주요 기능 재테스트
위의 "주요 기능 테스트 체크리스트" 중 관련된 항목들만 테스트
- 이 예제의 경우: 공 발사, 장애물 충돌, 사운드

### 단계 4: 즉시 커밋
```bash
git add .
git commit -m "refactor: config/game.ts로 바운스 사운드 상수 이동

- MIN_VERTICAL_BOUNCE_SPEED, BOUNCE_COOLDOWN_MS를 GAME_CONFIG로 이동
- 기능 변경 없음 (테스트 완료)"
```

### 단계 5: 다음 작은 변경으로 이동
위 단계 1-4를 반복

---

## 🔍 변경 감지 방법

### 1. 컴파일 타임 체크
```bash
# TypeScript 타입 에러 확인
pnpm build

# ✅ 성공: 타입 에러 없음
# ❌ 실패: 에러 수정 후 다시 확인
```

### 2. 런타임 테스트
```bash
# 개발 서버 실행
pnpm dev

# 브라우저 콘솔 확인
# ❌ 에러 발생: 즉시 수정
# ⚠️ 경고 발생: 확인 후 수정
# ✅ 에러 없음: 계속 진행
```

### 3. 수동 기능 테스트
브라우저에서 게임을 직접 플레이하며:
- 이전과 동일하게 작동하는지 확인
- 특히 변경한 부분과 관련된 기능을 집중 테스트

### 4. 비교 테스트 (선택사항)
```bash
# 리팩토링 전 브랜치로 전환
git checkout main
pnpm dev  # 포트 5173에서 실행

# 새 터미널에서 리팩토링 브랜치로 전환
git checkout refactor/game-ts-split
pnpm dev --port 5174  # 다른 포트에서 실행

# 두 버전을 나란히 비교하며 테스트
```

---

## 🚨 문제 발생 시 대응

### 1. 타입 에러 발생
```bash
# 즉시 수정 시도
# 5분 내 해결 안 되면 되돌리기

git checkout .  # 변경사항 취소
# 또는
git reset --hard HEAD  # 마지막 커밋으로 되돌리기
```

### 2. 런타임 에러 발생
```bash
# 콘솔 에러 메시지 확인
# 원인 파악 후 수정

# 해결 안 되면 되돌리기
git checkout .
```

### 3. 기능 변경 감지
```bash
# 예: 공 발사 속도가 달라짐, 사운드가 안 들림 등

# 즉시 되돌리기
git checkout .

# 원인 분석:
# - 상수 값을 잘못 옮겼는지 확인
# - import 경로가 맞는지 확인
# - 변수명이 일치하는지 확인
```

### 4. 롤백 전략
```bash
# 최근 커밋으로 되돌리기
git reset --hard HEAD

# 특정 커밋으로 되돌리기
git log  # 커밋 해시 확인
git reset --hard <commit-hash>

# 리팩토링 시작 전으로 완전히 되돌리기
git checkout main
git branch -D refactor/game-ts-split  # 브랜치 삭제
```

---

## 📝 리팩토링 체크리스트 (예: game.ts 분리)

### Phase 1: 상수 추출 (1-2시간)
- [ ] `MIN_VERTICAL_BOUNCE_SPEED` → `config/game.ts`
- [ ] `BOUNCE_COOLDOWN_MS` → `config/game.ts`
- [ ] `maxFailsBeforeGameOver` → `config/game.ts`
- [ ] `shotResetTimer` → `config/game.ts`
- [ ] `touchGuideDelay` → `config/game.ts`
- [ ] 색상 상수들 → `config/colors.ts`
- [ ] 각 변경마다 테스트 + 커밋

### Phase 2: SceneManager 추출 (2-3시간)
- [ ] Three.js scene, camera, renderer 관련 코드 → `core/SceneManager.ts`
- [ ] 디버그 시각화 (trajectory, swipe, target) → `SceneManager.ts`
- [ ] `SnapShoot`에서 SceneManager 사용하도록 변경
- [ ] 테스트: 화면 렌더링, 카메라 시점, 디버그 모드
- [ ] 커밋

### Phase 3: PhysicsManager 추출 (2-3시간)
- [ ] Cannon.js world 관련 코드 → `core/PhysicsManager.ts`
- [ ] 충돌 감지 로직 → `PhysicsManager.ts`
- [ ] `SnapShoot`에서 PhysicsManager 사용하도록 변경
- [ ] 테스트: 공 발사, 충돌, 바운스
- [ ] 커밋

### Phase 4: DifficultyManager 추출 (2-3시간)
- [ ] 난이도 관리 로직 → `core/DifficultyManager.ts`
- [ ] 장애물 생성/제거 로직 → `DifficultyManager.ts`
- [ ] `SnapShoot`에서 DifficultyManager 사용하도록 변경
- [ ] 테스트: 점수 증가 시 난이도 변경, 장애물 추가
- [ ] 커밋

### Phase 5: GameEngine 정리 (2-3시간)
- [ ] `SnapShoot`를 `GameEngine`으로 리네임 (선택사항)
- [ ] 남은 코드 정리 및 주석 추가
- [ ] 불필요한 코드 제거
- [ ] 테스트: 전체 기능 재테스트
- [ ] 커밋

### Phase 6: 최종 검증 (1시간)
- [ ] 전체 주요 기능 테스트 체크리스트 수행
- [ ] 빌드 테스트 (`pnpm build`)
- [ ] 코드 리뷰 (가능하면 동료에게 요청)
- [ ] PR 생성 또는 메인 브랜치에 머지

---

## 🎯 리팩토링 성공 기준

### 1. 기능 무결성
- ✅ 모든 주요 기능이 리팩토링 전과 동일하게 작동
- ✅ 버그가 새로 발생하지 않음
- ✅ 성능 저하가 없음

### 2. 코드 품질
- ✅ 타입 에러 0개
- ✅ 빌드 성공
- ✅ 파일 크기 감소 (game.ts 1,264줄 → 각 파일 200-300줄)
- ✅ 코드 가독성 향상

### 3. 유지보수성
- ✅ 각 파일/클래스의 책임이 명확함
- ✅ 새로운 기능 추가가 더 쉬워짐
- ✅ 버그 수정이 더 쉬워짐

---

## 🔧 유용한 명령어

```bash
# 개발 서버 실행
pnpm dev

# 빌드 (타입 체크 포함)
pnpm build

# 특정 파일 변경사항 확인
git diff src/game.ts

# 변경사항 취소
git checkout src/game.ts

# 마지막 커밋 수정 (커밋 메시지 변경 또는 파일 추가)
git add .
git commit --amend

# 커밋 히스토리 확인
git log --oneline

# 특정 커밋으로 되돌리기 (변경사항 유지)
git reset --soft <commit-hash>

# 특정 커밋으로 되돌리기 (변경사항 삭제)
git reset --hard <commit-hash>
```

---

## 📚 추가 리소스

### 리팩토링 관련 문서
- `SPEC.md` - 프로젝트 명세
- `refactoring.md` - 기존 리팩토링 계획
- 이 문서 - 안전한 리팩토링 가이드

### 참고 자료
- [Refactoring Guru](https://refactoring.guru/refactoring)
- [마틴 파울러 - Refactoring](https://martinfowler.com/books/refactoring.html)

---

## ✅ 리팩토링 완료 후 체크리스트

- [ ] 모든 주요 기능 테스트 통과
- [ ] `pnpm build` 성공
- [ ] 타입 에러 0개
- [ ] 콘솔 에러/경고 없음
- [ ] 코드 리뷰 완료 (가능한 경우)
- [ ] 커밋 메시지가 명확함
- [ ] 불필요한 파일/코드 제거됨
- [ ] 문서 업데이트됨 (필요한 경우)

---

**중요**: 이 가이드를 따르면 리팩토링 중 기능이 변경되는 문제를 최소화할 수 있습니다.
작은 단위로 진행하고, 매 단계마다 테스트하고, 즉시 커밋하는 것이 핵심입니다.
