import type { SwipeData } from '../input/SwipeTracker';

/**
 * 정규화된 스와이프 포인트
 * x, y 모두 0~1 범위로 정규화됨
 */
export interface NormalizedPoint {
  x: number;  // 0 (시작) ~ 1 (끝) 범위
  y: number;  // 시작점 기준으로 정규화
}

/**
 * 정규화된 스와이프 데이터
 */
export interface NormalizedSwipeData {
  points: NormalizedPoint[];      // 정규화된 5개 포인트
  originalDistance: number;       // 원본 스와이프 거리 (픽셀)
  duration: number;               // 스와이프 지속 시간 (ms)
  speed: number;                  // 속도 (픽셀/초)
  angle: number;                  // 스와이프 각도 (라디안, 0 = 오른쪽, Math.PI/2 = 위)
  horizontalDistance: number;     // 좌우 이동 거리 (픽셀, 양수=오른쪽, 음수=왼쪽)
  verticalDistance: number;       // 상하 이동 거리 (픽셀, 양수=위, 음수=아래)
}

/**
 * 스와이프 데이터를 0~1 범위로 정규화
 *
 * 정규화 방식:
 * - 시작점을 (0, 0)으로 이동
 * - 끝점을 기준으로 모든 점을 회전 및 스케일링
 * - X축: 0 (시작) ~ 1 (끝)
 * - Y축: 시작-끝 거리를 1로 했을 때의 비율
 */
export function normalizeSwipeData(swipeData: SwipeData): NormalizedSwipeData {
  const { points, duration } = swipeData;

  if (points.length < 2) {
    throw new Error('At least 2 points required for normalization');
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  // 시작점을 원점으로 이동
  const translatedPoints = points.map(p => ({
    x: p.x - startPoint.x,
    y: p.y - startPoint.y
  }));

  // 시작점에서 끝점까지의 거리 계산
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    // 거리가 0이면 모든 점을 (0, 0)으로
    return {
      points: points.map(() => ({ x: 0, y: 0 })),
      originalDistance: 0,
      duration,
      speed: 0,
      angle: 0,
      horizontalDistance: 0,
      verticalDistance: 0
    };
  }

  // 스와이프 각도 계산 (라디안)
  const angle = Math.atan2(dy, dx);

  // 회전 변환을 위한 코사인, 사인 값
  const cos = Math.cos(-angle);  // 음수: 반시계 방향으로 회전해서 수평으로 만듦
  const sin = Math.sin(-angle);

  // 회전 + 스케일링 적용
  const normalizedPoints: NormalizedPoint[] = translatedPoints.map(p => {
    // 회전 변환
    const rotatedX = p.x * cos - p.y * sin;
    const rotatedY = p.x * sin + p.y * cos;

    // 거리로 나눠서 정규화 (X축이 0~1 범위가 됨)
    return {
      x: rotatedX / distance,
      y: rotatedY / distance
    };
  });

  // 속도 계산 (픽셀/초)
  const speed = duration > 0 ? (distance / duration) * 1000 : 0;

  // 좌우/상하 이동 거리 (원본 좌표)
  const horizontalDistance = dx; // 양수 = 오른쪽, 음수 = 왼쪽
  const verticalDistance = dy;   // 양수 = 위, 음수 = 아래

  return {
    points: normalizedPoints,
    originalDistance: distance,
    duration,
    speed,
    angle,
    horizontalDistance,
    verticalDistance
  };
}

/**
 * 정규화된 데이터를 디버그 출력용 문자열로 변환
 */
export function debugNormalizedSwipe(normalized: NormalizedSwipeData): string {
  const pointsStr = normalized.points
    .map((p, i) => `  [${i + 1}] (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`)
    .join('\n');

  return `
Normalized Swipe Data:
${pointsStr}
Distance: ${normalized.originalDistance.toFixed(1)}px
Duration: ${normalized.duration.toFixed(0)}ms
Speed: ${normalized.speed.toFixed(1)}px/s
Angle: ${(normalized.angle * 180 / Math.PI).toFixed(1)}°
Horizontal: ${normalized.horizontalDistance.toFixed(1)}px
Vertical: ${normalized.verticalDistance.toFixed(1)}px
  `.trim();
}
