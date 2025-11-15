# Difficulty Configuration Guide

이 문서는 골키퍼/장애물 난이도를 설계하거나 조정할 때 참고할 수 있는 설정 절차와 개념을 정리한 가이드입니다. `src/config/obstacles.ts`에 블루프린트를 추가하고, `src/config/difficulty.ts`에서 레벨별 조합을 구성하는 흐름을 순서대로 살펴봅니다.

---

## 1. 장애물 블루프린트(Obstacle Blueprints)

블루프린트는 하나의 장애물 타입을 정의합니다. 파일 경로는 `src/config/obstacles.ts`이며, `OBSTACLE_BLUEPRINTS` 객체에 키-값으로 등록합니다.

### 1.1 필수/선택 속성

```ts
export interface ObstacleBlueprint {
  id: string;
  render: ObstacleRenderConfig;        // 외형을 결정
  collider?: ObstacleColliderConfig;   // 물리 콜라이더
  defaultTransform?: ObstacleTransformConfig; // 기본 위치/회전/스케일
}
```

#### Render 설정 (`ObstacleRenderConfig`)

- `kind: 'primitive' | 'model'`
- primitive일 때 `shape`(`box`, `plane`, `cylinder`, `capsule`, `sphere`)와 `size`
- model일 때 `assetUrl`, `scale`, `pivotOffset`
- `material` 옵션 (선택)
  - `color`: HEX 문자열 또는 숫자 (예: `'#ff3355'`, `0xffffff`)
  - `textureUrl`: `import ...?url`로 가져온 텍스처 경로
  - `transparent`: 불리언. `true`일 때 알파 블렌딩 활성화
  - `opacity`: 0~1 불투명도
  - `doubleSided`: 양면 렌더링 여부
  - `alphaTest`: 절단형 투명도 임계값 (PNG 투명 영역 처리 시 사용)
  - `depthWrite`, `depthTest`: 깊이 버퍼 동작 제어

#### Collider 설정 (`ObstacleColliderConfig`)

- `box`, `cylinder`, `capsule`, `sphere`, `auto` 중 택1
- 각 타입별 필수 파라미터: 예) `box` → `{ size: { x, y, z } }`, `capsule` → `{ radius, height, axis }`
- `axis`는 `x`, `y`, `z` 중 하나이고 캡슐/실린더 기준축을 결정합니다.

| shape      | 필수 필드                                            | 설명 |
|------------|------------------------------------------------------|------|
| `box`      | `size: { x, y, z }`                                  | BoxGeometry 기준으로 half-extents를 계산하여 Cannon Box를 생성 |
| `cylinder` | `radius`, `height`, `axis`(기본값 `'x'`)              | Cannon Cylinder + Three CylinderGeometry. `axis`에 따라 디버그/콜라이더 회전이 보정됨 |
| `capsule`  | `radius`, `height`, `axis`(기본값 `'x'`)              | Cylinder + Sphere 두 개로 구성. `axis`에 따라 offset이 옮겨짐 |
| `sphere`   | `radius`                                             | 단일 Cannon Sphere |
| `auto`     | `margin`(선택)                                       | 현재는 1x1x1 Box로 fallback. 추후 자동 맞춤 구현 예정 |

> 캡슐/실린더는 기본 축이 X이므로 Y축 정렬이 필요하면 `axis: 'y'`를 지정해야 합니다.

#### Default Transform (`ObstacleTransformConfig`)

- `position`: 기본 위치 (x/y/z 개별 지정 가능)
- `positionRange`: 위치 랜덤 범위 ( `[min, max]` )
- `rotation`: 기본 회전(라디안). `GoalKeeper` 시절 배치와 동일한 상태가 필요할 때 사용
- `rotationRange`: 회전 랜덤 범위. 0을 기준으로 오프셋만 적용됩니다.
- `scale`: 단일 스칼라 혹은 `{ x, y, z }`

**좌표계 & 회전 참고**
- X+: 오른쪽, X-: 왼쪽
- Y+: 위쪽, Y-: 아래쪽
- Z+: 플레이어 쪽, Z-: 골대 쪽
- Euler 회전은 기본적으로 `XYZ` 순서로 적용됩니다. `rotation`은 블루프린트 기준값, 인스턴스에서 지정하는 `rotation`은 추가 오프셋입니다.

> **Tip**: 블루프린트에는 기본값만 넣고, 실제 레벨에서 필요한 오버라이드는 `ObstacleInstanceConfig`에 설정합니다.

### 1.2 새 블루프린트 추가 예시

```ts
OBSTACLE_BLUEPRINTS.myFence = {
  id: 'myFence',
  render: {
    kind: 'primitive',
    shape: 'box',
    size: { x: 1.2, y: 1.0, z: 0.2 },
    material: {
      color: '#7a5b3c',
      doubleSided: true
    }
  },
  collider: {
    shape: 'box',
    size: { x: 1.2, y: 1.0, z: 0.2 }
  },
  defaultTransform: {
    position: { y: 0.5 }
  }
};
```

---

## 2. 난이도 구성 (`src/config/difficulty.ts`)

난이도 레벨은 `DifficultyLevelConfig` 배열인 `DIFFICULTY_LEVELS`로 관리합니다.

```ts
export interface DifficultyLevelConfig {
  threshold: number;                     // 해당 레벨이 적용되는 최소 점수
  name: string;                          // 레벨 표시 이름
  obstacles: ObstacleInstanceConfig[];   // 블루프린트 인스턴스 목록
}
```

점수가 특정 `threshold` 이상이 되면 해당 레벨이 활성화됩니다. 예시: `threshold: 3`이면 3점부터 해당 레벨이 적용.

### 2.1 장애물 인스턴스 (`ObstacleInstanceConfig`)

```ts
export interface ObstacleInstanceConfig {
  blueprintId: string;               // 사용할 블루프린트 ID
  label?: string;                    // 디버그용 라벨
  transform?: ObstacleTransformConfig; // 레벨 전용 오버라이드 (위치/회전/스케일/랜덤범위)
  collider?: ObstacleColliderConfig;    // 필요 시 콜라이더 오버라이드
  behavior?: ObstacleBehaviorConfig;    // 이동/스핀 등의 행동
}
```

- `label`은 디버그 모드에서 장애물 식별용 문자열입니다.
- `transform`을 생략하면 블루프린트의 `defaultTransform`만 적용됩니다.
- 인스턴스 `rotation`은 블루프린트의 기본 회전에 **추가로 곱해지는 오프셋**입니다.
- `positionRange`와 `rotationRange`는 리셋 시마다 Math.random()을 사용해 독립적으로 샘플링합니다.
- `behavior`를 지정하지 않으면 해당 장애물은 `static`으로 간주됩니다.

### 2.2 행동 타입 (`ObstacleBehaviorConfig`)

- `static`: 움직이지 않음
- `patrol`:
  - `axis`: 이동할 축 (`x`, `y`, `z`)
  - `range`: `[min, max]`
  - `speed`: 라디안/초 또는 pingpong 주기
  - `waveform`: `sine`(기본) 또는 `pingpong`
  - `startPhase`: 시작 위상 (라디안)
- `spin`:
  - `axis`: 회전 축
  - `speed`: 라디안/초
  - `radius`: 회전 반경(옵션)
  - `orbit`: `patrol`과 유사한 구조 (`axis`, `range`, `speed`, `startPhase`)
  - `startAngle`: 시작 각도

추가 설명:
- `static`은 별도 설정 없이 위치에 고정됩니다.
- `patrol`의 `range`는 이동 가능한 최소/최대 위치를 절대 좌표로 지정합니다.
- `patrol.speed`는 양수/음수 모두 허용되며, 음수일 경우 이동 방향이 반대로 진행합니다. 지정하지 않으면 1.0.
- `patrol.startPhase`를 생략하면 0~2π 범위에서 무작위 값이 설정됩니다.
- `spin`은 `radius`나 `orbit`을 생략하면 **제자리 회전만 수행**하며, 두 옵션을 조합하여 회전+이동 패턴을 만들 수 있습니다.
- `spin.startAngle`을 생략하면 0~2π 랜덤 값이 적용됩니다.
- `spin.orbit.speed`가 음수이면 궤도 이동 방향이 반대가 됩니다.

#### 2.2.1 동작 구성 예시

```ts
// 1) 고정 배치
{ blueprintId: 'cubeColor', behavior: { type: 'static' } }

// 2) X축 왕복 이동 (sin 파형)
{
  blueprintId: 'keeperWall',
  transform: { position: { z: -5.2 } },
  behavior: {
    type: 'patrol',
    axis: 'x',
    range: [-0.6, 0.6],
    speed: 1.4
  }
}

// 3) Y축 상하 이동 (pingpong)
{
  blueprintId: 'cylinderBasic',
  transform: { position: { x: 0, z: -4.6 } },
  behavior: {
    type: 'patrol',
    axis: 'y',
    range: [0.6, 1.4],
    speed: 2.0,
    waveform: 'pingpong'
  }
}

// 4) 회전 + 좌우 궤도 이동
{
  blueprintId: 'keeperWall',
  transform: { position: { z: -4.3 } },
  behavior: {
    type: 'spin',
    axis: 'z',
    speed: 5.0,
    radius: 0.2,
    orbit: {
      axis: 'x',
      range: [-1.0, 1.0],
      speed: 2.2,
      startPhase: Math.PI / 2
    }
  }
}

// 5) 제자리 회전 (orbit/radius 없음)
{
  blueprintId: 'keeperWall',
  transform: { position: { z: -4.2 } },
  behavior: {
    type: 'spin',
    axis: 'z',
    speed: 4.6
  }
}

// 6) Z축 회전 + Y축 궤도 이동
{
  blueprintId: 'capsuleGuard',
  transform: { position: { x: 0.8, z: -4.6 } },
  behavior: {
    type: 'spin',
    axis: 'z',
    speed: 4.0,
    orbit: {
      axis: 'y',
      range: [0.5, 1.4],
      speed: 1.8
    }
  }
}
```

### 2.3 레벨 구성 예시

```ts
{
  threshold: 4,
  name: 'Level 5',
  obstacles: [
    {
      blueprintId: 'keeperWall',
      transform: { position: { z: -4.95 } },
      behavior: { type: 'patrol', axis: 'x', range: [-0.5, 0.5], speed: 1.2 }
    },
    {
      blueprintId: 'capsuleGuard',
      transform: { position: { x: -1.2, z: -5.0 } }, // 기본 블루프린트에서 y=0.7 유지
      behavior: { type: 'static' }
    },
    {
      blueprintId: 'capsuleGuard',
      transform: { position: { x: 1.2, z: -5.0 } },
      behavior: { type: 'static' }
    }
  ]
}
```

레벨 단계가 오를수록 `obstacles` 배열에 더 많은 장애물을 조합하거나 이동 범위를 넓혀 난이도를 조절합니다.

### 2.4 Threshold & Ordering 규칙

- `threshold`는 오름차순으로 유지해야 하며, 값이 같은 레벨이 여러 개면 나중 항목이 이전 항목을 덮어씁니다.
- 레벨 추가/수정 시 목표한 난이도 순서를 유지하도록 전체 리스트를 재검토하세요.
- `name` 필드는 로그 및 디버깅 메시지에 사용됩니다 (UI 텍스트와는 별개).
- 난이도는 `resetBall()` 또는 게임 시작 시 재평가되며, 골 성공 직후에는 점수만 증가합니다.  
  (즉, 새로운 난이도는 공이 원위치로 돌아온 뒤 적용됩니다.)
- 동일한 `threshold` 값을 가진 레벨을 여러 개 배치해 두면, `getDifficultyForScore`가 그 threshold에 해당하는 후보 중 하나를 **무작위로** 선택합니다.  
  예: `threshold: 5`인 레벨이 세 개라면, 점수가 5~9 사이일 때 매번 그 세 가지 중 하나가 랜덤으로 선택됩니다.  
  배열에 있는 동일 threshold 레벨이 전부 후보이므로, 패턴 다양화를 위해 여러 “variations”를 넣을 수 있습니다.

---

## 3. 설계 팁 & 체크리스트

- **단계적 난이도 상승**: 초기 레벨에서는 장애물 수를 최소화하고, 점차 회전/패트롤 범위를 늘리는 방식으로 플레이어가 학습할 시간을 줍니다.
- **블루프린트 재사용**: 하나의 블루프린트를 여러 레벨에서 적용하되, `transform`과 `behavior`를 인스턴스별로 다르게 설정해 다양성을 확보합니다.
- **Collider & Visual 일치 여부 확인**: 디버그 모드에서 콜라이더 위치/회전이 의도한 방향과 맞는지 확인합니다. 캡슐/실린더의 `axis` 설정과 디버그 회전이 일치하는지 체크.
- **투명 텍스처**: PNG나 알파가 있는 텍스처를 사용할 때는 `alphaTest`를 지정해 완전 투명 영역이 깔끔하게 잘리도록 합니다. 필요하면 `depthWrite`/`depthTest`도 블루프린트에서 조정 가능.
- **랜덤 범위**: `positionRange`, `rotationRange`는 레벨 리셋마다 새로운 값을 뽑습니다. 범위를 과도하게 넓히면 패턴 예측이 힘들어지므로 주의하세요.
- **행동과 범위의 상관 관계**: `patrol.range`는 움직임의 최소/최대 값을 직접 지정하므로, collider가 골대 밖으로 나가지 않게 미리 범위를 계산합니다.
- **행동 조합 전략**: 단일 인스턴스는 하나의 `behavior`만 가질 수 있습니다. 복합 패턴이 필요하면 여러 인스턴스를 겹치거나 `spin`의 `orbit` 기능을 활용하세요.
- **디버그 라벨**: `label`을 지정하면 디버그 HUD에서 장애물 이름이 표시되어 테스트가 편해집니다.
- **머티리얼 설정**: 투명 PNG는 `alphaTest`, `transparent`, `opacity`, `depthWrite`, `depthTest` 등을 적절히 조합해 원본 Goalkeeper와 동일한 시각 효과를 재현하세요.
- **프리뷰 vs 실 게임**: `/admin` 프리뷰는 actual goal geometry와 동일한 좌표/깊이(`GOAL_DEPTH`, `GOAL_NET_CONFIG.layout.depthBottom`)를 사용하도록 맞춰져 있습니다. 프리뷰에서 보이는 거리감이 실제 인게임과 동일하게 유지되도록 조정되어 있으니, 프리뷰에서 겹치는 느낌이 들면 threshold나 transform을 직접 조정하세요.

---

## 4. 디버그 및 검증 절차

1. **디버그 모드 켜기**: 게임 내 디버그 옵션으로 콜라이더 오버레이를 확인합니다.
2. **레벨별 리셋 테스트**: 각 threshold에 맞춰 점수를 조정하거나 직접 `DIFFICULTY_LEVELS`에서 특정 레벨만 남겨 동작을 검증합니다.
3. **빌드 검증**: `pnpm build`로 TypeScript 및 Vite 빌드가 정상적으로 통과하는지 확인합니다.
4. **Node 버전**: 현재 프로젝트는 Vite 7 기반이라 Node.js 20.19 이상 사용을 권장합니다. (Node 18.x는 경고만 출력되지만 가능하다면 업그레이드 권장)
5. **런타임 확인**: 새 레벨을 추가했다면 실제 게임 플레이에서 해당 점수대에 도달해 정상적으로 스폰/움직임/회전이 동작하는지 검증합니다.

---

## 5. 참고

- `Obstacle` 런타임 클래스: `src/entities/obstacle.ts`
- 난이도 반영 루틴: `src/game.ts`의 `updateDifficulty`, `syncObstacles`
- 기존 골키퍼 로직은 완전히 대체되었으므로 `GoalKeeper` 관련 클래스는 더 이상 사용하지 않습니다.

필요한 블루프린트나 레벨 구성이 추가되면 이 문서도 함께 업데이트해 주세요.

---

## 6. 새 난이도 추가 절차 (Quick Checklist)

1. **필요한 장애물 정의**: 기존 블루프린트로 충분한지 확인. 없으면 `src/config/obstacles.ts`에 신규 블루프린트 추가.
2. **`DIFFICULTY_LEVELS` 업데이트**: threshold 순서를 확인하고 새 레벨 혹은 장애물 인스턴스 추가.
   - 위치/회전/행동이 의도한 범위를 벗어나지 않는지 수치 검토.
3. **디버그 플레이**: 디버그 모드 켜고 레벨을 강제로 재현해 콜라이더와 움직임이 맞는지 확인.
4. **빌드 & 경고 확인**: `pnpm build` 실행, Node 버전 경고가 없는지 확인.
5. **문서 갱신**: 블루프린트나 행동 양식이 추가되면 이 문서를 최신 상태로 유지.
