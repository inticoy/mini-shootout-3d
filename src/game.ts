import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from './core/graphics';
import { createPerspectiveCamera } from './core/camera';
import { configureSceneLighting } from './core/lighting';
import { createPhysicsWorld } from './physics/world';
import { createField } from './environment/field';
import { Ball, BALL_RADIUS } from './entities/ball';
import { Goal, GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from './entities/goal';
import { GoalKeeper } from './entities/goalkeeper';
import { createDebugHud, createDebugButton, updateDebugButtonState } from './ui/debugHud';

export class MiniShootout3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly onScoreChange: (score: number) => void;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;
  private readonly goalKeeper: GoalKeeper;
  private readonly ballColliderMesh: THREE.Mesh;
  private readonly goalColliderGroup: THREE.Group;
  private readonly debugHud: HTMLDivElement;
  private readonly debugHudInfo: HTMLPreElement;
  private readonly strikeZoneLabel: HTMLDivElement;
  private readonly strikeMapCurrentDot: SVGCircleElement;
  private readonly strikeMapLastDot: SVGCircleElement;
  private readonly vectorReadout: HTMLDivElement;
  private readonly swipeLiveArrow: SVGLineElement;
  private readonly swipeLastArrow: SVGLineElement;
  private readonly strikePanel: HTMLDivElement;
  private readonly axisArrows: THREE.ArrowHelper[];
  private readonly trajectoryGeometry: THREE.BufferGeometry;
  private readonly trajectoryLine: THREE.Line;
  private readonly trajectoryPositions: Float32Array;
  private readonly trajectorySampleStep = 0.05;
  private readonly trajectorySampleCount = 60;
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();
  private readonly tempBallPosition = new THREE.Vector3();
  private readonly tempBallOffset = new THREE.Vector3();
  private readonly debugButton: HTMLButtonElement;

  private pointerStart: { x: number; y: number } | null = null;
  private pointerStartTime = 0;
  private pointerHistory: Array<{ x: number; y: number; time: number }> = [];
  private isShooting = false;
  private goalScoredThisShot = false;
  private score = 0;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handlePointerDownBound = (event: PointerEvent) => this.handlePointerDown(event);
  private readonly handlePointerMoveBound = (event: PointerEvent) => this.handlePointerMove(event);
  private readonly handlePointerUpBound = (event: PointerEvent) => this.handlePointerUp(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private readonly toggleDebugBound = (enabled?: boolean) => this.toggleDebugMode(enabled);
  private readonly handleDebugButtonClickBound = () => this.toggleDebugMode();
  private debugMode = false;
  private ballScreenCenter = { x: 0, y: 0 };
  private ballScreenRadius = 0;
  private strikeContact: { x: number; y: number } | null = null;
  private lastStrikeContact: { x: number; y: number } | null = null;
  private liveSwipeVector: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;
  private lastSwipeVector: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;
  private pointerStartNormalized: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
    this.canvas = canvas;
    this.onScoreChange = onScoreChange;

    this.scene = new THREE.Scene();
    this.renderer = createRenderer(canvas);
    this.camera = createPerspectiveCamera();
    configureSceneLighting(this.scene);

    const { world, materials } = createPhysicsWorld();
    this.world = world;

    createField(this.scene, this.world, materials.ground, {
      goalDepth: GOAL_DEPTH,
      frontExtent: 30
    });

    this.ball = new Ball(this.world, materials.ball);
    void this.ball.load(this.scene).catch((error) => {
      console.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

    this.goalKeeper = new GoalKeeper(this.scene, this.world, GOAL_DEPTH + 0.8, this.ball.body);
    (window as typeof window & { debug?: (enabled?: boolean) => boolean }).debug = this.toggleDebugBound;

    this.ballColliderMesh = this.createBallColliderMesh();
    this.goalColliderGroup = this.createGoalColliderGroup();
    this.axisArrows = this.createAxisArrows();
    const hud = createDebugHud();
    this.debugHud = hud.container;
    this.debugHudInfo = hud.info;
    this.swipeLiveArrow = hud.liveArrow;
    this.swipeLastArrow = hud.lastArrow;
    this.strikePanel = hud.strikePanel;
    this.strikeZoneLabel = hud.label;
    this.strikeMapCurrentDot = hud.currentDot;
    this.strikeMapLastDot = hud.lastDot;
    this.vectorReadout = hud.vectorReadout;
    this.trajectoryPositions = new Float32Array(this.trajectorySampleCount * 3);
    this.trajectoryGeometry = new THREE.BufferGeometry();
    this.trajectoryGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trajectoryPositions, 3)
    );
    this.trajectoryGeometry.setDrawRange(0, this.trajectorySampleCount);
    const trajectoryMaterial = new THREE.LineBasicMaterial({
      color: 0x00aaff
    });
    this.trajectoryLine = new THREE.Line(this.trajectoryGeometry, trajectoryMaterial);
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);
    this.debugButton = createDebugButton(this.handleDebugButtonClickBound);

    this.attachEventListeners();
    this.animate();
  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body || !this.isShooting || this.goalScoredThisShot) return;
    this.goalScoredThisShot = true;
    this.score += 1;
    this.onScoreChange(this.score);
    this.goalKeeper.stopTracking();
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    this.canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.addEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.addEventListener('pointerup', this.handlePointerUpBound);
  }

  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.isShooting) return;
    const contact = this.captureStrikeContact(event);
    if (contact) {
      const startPoint = { x: contact.x, y: contact.y };
      this.pointerStartNormalized = { x: startPoint.x, y: startPoint.y };
      this.liveSwipeVector = { start: startPoint, end: { x: startPoint.x, y: startPoint.y } };
    } else {
      this.liveSwipeVector = null;
      this.pointerStartNormalized = null;
    }
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.pointerStartTime = performance.now();
    this.pointerHistory = [{ x: event.clientX, y: event.clientY, time: this.pointerStartTime }];
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;
    this.updateLiveSwipeVectorEnd(event);
    const now = performance.now();
    this.pointerHistory.push({ x: event.clientX, y: event.clientY, time: now });
    if (this.pointerHistory.length > 8) {
      this.pointerHistory.shift();
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;

    this.updateLiveSwipeVectorEnd(event);

    const end = { x: event.clientX, y: event.clientY };
    const delta = {
      x: end.x - this.pointerStart.x,
      y: end.y - this.pointerStart.y
    };

    const endTime = performance.now();
    const history = this.pointerHistory.length
      ? this.pointerHistory
      : [{ x: this.pointerStart.x, y: this.pointerStart.y, time: this.pointerStartTime }];
    let flickStart = history[0];
    for (let i = history.length - 1; i >= 0; i--) {
      if (endTime - history[i].time >= 60) {
        flickStart = history[i];
        break;
      }
    }

    const flickVector = new THREE.Vector2(end.x - flickStart.x, end.y - flickStart.y);
    const fallback = new THREE.Vector2(delta.x, delta.y);
    if (flickVector.lengthSq() < 4 && fallback.lengthSq() > 0) {
      flickVector.copy(fallback);
    }
    const flickLength = flickVector.length();
    const flickDuration = Math.max(endTime - flickStart.time, 30);
    const flickSpeed = flickLength / flickDuration;

    const strikeContact = this.strikeContact ?? { x: 0, y: 0 };
    const startContact = this.pointerStartNormalized ?? strikeContact;
    const swipeEndPoint = this.computeSwipeVectorEnd(event) ?? this.liveSwipeVector?.end ?? strikeContact;
    this.pointerStart = null;
    this.pointerHistory = [];
    this.isShooting = true;
    this.goalScoredThisShot = false;
    if (this.liveSwipeVector) {
      this.lastSwipeVector = {
        start: { x: this.liveSwipeVector.start.x, y: this.liveSwipeVector.start.y },
        end: { x: swipeEndPoint.x, y: swipeEndPoint.y }
      };
    } else {
      this.lastSwipeVector = {
        start: { x: startContact.x, y: startContact.y },
        end: { x: swipeEndPoint.x, y: swipeEndPoint.y }
      };
    }
    this.liveSwipeVector = null;
    this.pointerStartNormalized = null;

    const basePower = THREE.MathUtils.clamp(flickSpeed * 32 + flickLength / 24, 8, 38);

    const direction = flickLength > 0 ? flickVector.clone().normalize() : new THREE.Vector2();
    const verticalComponent = Math.max(-direction.y, 0);
    const contactLoftInfluence = THREE.MathUtils.clamp(strikeContact.y, -1.1, 1.1);
    const loftFactorRaw = THREE.MathUtils.clamp((verticalComponent + Math.max(contactLoftInfluence, 0) * 0.85 - 0.25) / 0.55, 0, 1);
    const loftFactor = Math.pow(loftFactorRaw, 1.15);
    const swipeLateralFactor = THREE.MathUtils.clamp(direction.x * 0.55, -0.95, 0.95);

    const forwardImpulse = -basePower * (1.22 - loftFactor * 0.2);
    const upwardImpulse = basePower * loftFactor * 0.42 + verticalComponent * 1.35;
    const sideImpulse = basePower * swipeLateralFactor * 0.6;

    const impulse = new CANNON.Vec3(sideImpulse, upwardImpulse, forwardImpulse);
    this.ball.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    this.goalKeeper.resetTracking();

    this.scheduleStrikeSpin(startContact, basePower);

    window.setTimeout(() => this.checkShotOutcome(), 2500);
    this.lastStrikeContact = { x: startContact.x, y: startContact.y };
    this.strikeContact = null;
    this.liveSwipeVector = null;
  }

  private checkShotOutcome() {
    const beforeReset = this.isShooting;
    this.resetShot();
    if (!beforeReset) return;

    const dz = this.ball.body.position.z - (GOAL_DEPTH + 0.8);
    const velocityZ = this.ball.body.velocity.z;
    if (velocityZ > 0 && dz > 0) {
      this.goalKeeper.stopTracking();
    }
  }

  private resetShot() {
    const missed = !this.goalScoredThisShot && this.isShooting;
    this.isShooting = false;

    if (missed && this.score !== 0) {
      this.score = 0;
      this.onScoreChange(this.score);
    }

    this.goalScoredThisShot = false;
    this.pointerStartTime = 0;
    this.pointerHistory = [];
    this.ball.reset();
    this.goalKeeper.resetTracking();
    this.strikeContact = null;
    this.liveSwipeVector = null;
    this.pointerStartNormalized = null;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.world.step(1 / 60, deltaTime, 3);
    this.goalKeeper.update(deltaTime);

    this.ball.syncVisuals();
    this.updateDebugVisuals();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    delete (window as typeof window & { debug?: (enabled?: boolean) => boolean }).debug;
    this.debugButton.removeEventListener('click', this.handleDebugButtonClickBound);
    this.debugButton.remove();
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.debugHud.remove();
    this.strikePanel.remove();
  }

  private createBallColliderMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  private createGoalColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const colliderMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true
    });

    const postGeometry = new THREE.BoxGeometry(POST_RADIUS * 2, GOAL_HEIGHT - POST_RADIUS, POST_RADIUS * 2);
    const leftPost = new THREE.Mesh(postGeometry, colliderMaterial);
    leftPost.position.set(-GOAL_WIDTH / 2, (GOAL_HEIGHT - POST_RADIUS) / 2, GOAL_DEPTH);
    group.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.x = GOAL_WIDTH / 2;
    group.add(rightPost);

    const crossbarGeometry = new THREE.BoxGeometry(GOAL_WIDTH, POST_RADIUS * 2, POST_RADIUS * 2);
    const crossbar = new THREE.Mesh(crossbarGeometry, colliderMaterial);
    crossbar.position.set(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH);
    group.add(crossbar);

    const sensorGeometry = new THREE.BoxGeometry(GOAL_WIDTH, GOAL_HEIGHT - POST_RADIUS, 0.2);
    const sensor = new THREE.Mesh(sensorGeometry, colliderMaterial);
    sensor.position.set(0, (GOAL_HEIGHT - POST_RADIUS) / 2, GOAL_DEPTH - 0.5);
    group.add(sensor);

    this.scene.add(group);
    return group;
  }

  private createAxisArrows(): THREE.ArrowHelper[] {
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 1.1;
    const headLength = 0.35;
    const headWidth = 0.18;

    const createArrow = (direction: THREE.Vector3, color: number) => {
      const arrow = new THREE.ArrowHelper(direction.clone(), origin, length, color, headLength, headWidth);
      arrow.visible = false;
      this.scene.add(arrow);
      return arrow;
    };

    const arrows = [
      createArrow(new THREE.Vector3(1, 0, 0), 0xff5555),
      createArrow(new THREE.Vector3(0, 1, 0), 0x55ff55),
      createArrow(new THREE.Vector3(0, 0, 1), 0x5599ff)
    ];
    return arrows;
  }

  private createDebugButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'Debug';
    button.style.position = 'fixed';
    button.style.left = '18px';
    button.style.top = '18px';
    button.style.padding = '8px 14px';
    button.style.background = 'rgba(0, 0, 0, 0.65)';
    button.style.color = '#d9faff';
    button.style.border = '1px solid rgba(120, 200, 255, 0.65)';
    button.style.borderRadius = '6px';
    button.style.fontFamily = 'monospace';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '999';
    button.style.transition = 'background 0.16s ease';
    button.addEventListener('mouseenter', () => {
      if (!this.debugMode) {
        button.style.background = 'rgba(20, 60, 80, 0.75)';
      }
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = this.debugMode ? 'rgba(30, 80, 110, 0.85)' : 'rgba(0, 0, 0, 0.65)';
    });
    button.addEventListener('click', this.handleDebugButtonClickBound);
    document.body.appendChild(button);
    return button;
  }

  private createDebugHud(): {
    container: HTMLDivElement;
    strikePanel: HTMLDivElement;
    info: HTMLPreElement;
    vectorReadout: HTMLDivElement;
    currentDot: SVGCircleElement;
    lastDot: SVGCircleElement;
    liveArrow: SVGLineElement;
    lastArrow: SVGLineElement;
    label: HTMLDivElement;
  } {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '16px';
    container.style.bottom = '16px';
    container.style.padding = '16px 20px';
    container.style.background = 'rgba(0, 0, 0, 0.65)';
    container.style.color = '#d9faff';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '13px';
    container.style.lineHeight = '1.6';
    container.style.borderRadius = '8px';
    container.style.pointerEvents = 'none';
    container.style.display = 'none';
    container.style.maxWidth = '320px';

    const infoBlock = document.createElement('pre');
    infoBlock.style.margin = '0';
    infoBlock.style.whiteSpace = 'pre-wrap';
    infoBlock.style.fontSize = '13px';
    infoBlock.style.lineHeight = '1.55';
    infoBlock.textContent = 'Ball Diagnostics';
    container.appendChild(infoBlock);

    const zoneLabel = document.createElement('div');
    zoneLabel.style.fontSize = '12px';
    zoneLabel.style.marginTop = '12px';
    zoneLabel.style.textAlign = 'left';
    zoneLabel.style.opacity = '0.9';
    zoneLabel.textContent = 'Contact: (none)';
    container.appendChild(zoneLabel);

    const vectorReadout = document.createElement('div');
    vectorReadout.style.fontSize = '12px';
    vectorReadout.style.marginTop = '6px';
    vectorReadout.style.textAlign = 'left';
    vectorReadout.style.opacity = '0.85';
    vectorReadout.textContent = 'Vector Δ: n/a';
    container.appendChild(vectorReadout);

    const strikePanel = document.createElement('div');
    strikePanel.style.position = 'fixed';
    strikePanel.style.left = '20px';
    strikePanel.style.top = '14vh';
    strikePanel.style.padding = '18px 22px';
    strikePanel.style.background = 'rgba(10, 18, 22, 0.72)';
    strikePanel.style.color = '#d9faff';
    strikePanel.style.fontFamily = 'monospace';
    strikePanel.style.fontSize = '13px';
    strikePanel.style.borderRadius = '10px';
    strikePanel.style.pointerEvents = 'none';
    strikePanel.style.display = 'none';
    strikePanel.style.flexDirection = 'column';
    strikePanel.style.alignItems = 'center';
    strikePanel.style.gap = '14px';
    strikePanel.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.35)';

    const strikeHeading = document.createElement('div');
    strikeHeading.style.fontSize = '12px';
    strikeHeading.style.textAlign = 'center';
    strikeHeading.style.letterSpacing = '0.04em';
    strikeHeading.textContent = 'Strike Zones';
    strikePanel.appendChild(strikeHeading);

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '-2.4 -2.6 4.8 4.8');
    svg.setAttribute('width', '320');
    svg.setAttribute('height', '320');
    svg.style.background = 'rgba(12, 24, 24, 0.5)';
    svg.style.borderRadius = '10px';
    svg.style.border = '1px solid rgba(160, 220, 255, 0.3)';

    const defs = document.createElementNS(svgNs, 'defs');
    const createArrowMarker = (id: string, color: string) => {
      const marker = document.createElementNS(svgNs, 'marker');
      marker.setAttribute('id', id);
      marker.setAttribute('viewBox', '0 0 6 6');
      marker.setAttribute('refX', '4.2');
      marker.setAttribute('refY', '3');
      marker.setAttribute('markerWidth', '4');
      marker.setAttribute('markerHeight', '4');
      marker.setAttribute('orient', 'auto');
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', 'M0,0 L6,3 L0,6 L1.3,3 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
    };
    createArrowMarker('swipe-arrow-live', 'rgba(120, 255, 200, 0.9)');
    createArrowMarker('swipe-arrow-last', 'rgba(255, 210, 0, 0.85)');
    svg.appendChild(defs);

    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '1');
    circle.setAttribute('fill', 'rgba(90, 160, 190, 0.12)');
    circle.setAttribute('stroke', 'rgba(160, 220, 255, 0.35)');
    circle.setAttribute('stroke-width', '0.02');
    svg.appendChild(circle);

    const addGuide = (x1: number, y1: number, x2: number, y2: number) => {
      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', x1.toString());
      line.setAttribute('y1', y1.toString());
      line.setAttribute('x2', x2.toString());
      line.setAttribute('y2', y2.toString());
      line.setAttribute('stroke', 'rgba(200, 240, 255, 0.35)');
      line.setAttribute('stroke-width', '0.02');
      line.setAttribute('stroke-dasharray', '0.04 0.08');
      svg.appendChild(line);
    };

    addGuide(-1.6, 0.55, 1.6, 0.55);
    addGuide(-1.6, -0.45, 1.6, -0.45);
    addGuide(-0.32, -1.9, -0.32, 2.1);
    addGuide(0.32, -1.9, 0.32, 2.1);

    const addLabel = (text: string, x: number, y: number) => {
      const label = document.createElementNS(svgNs, 'text');
      label.setAttribute('x', x.toString());
      label.setAttribute('y', y.toString());
      label.setAttribute('fill', 'rgba(220, 240, 255, 0.75)');
      label.setAttribute('font-size', '0.12');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = text;
      svg.appendChild(label);
    };

    addLabel('Scoop', 0, 1.4);
    addLabel('Top Spin', 0, -1.15);
    addLabel('Outside Curve', -1.25, 0.05);
    addLabel('Inside Curve', 1.25, 0.05);
    addLabel('No Spin', 0, 0.05);

    const lastArrow = document.createElementNS(svgNs, 'line');
    lastArrow.setAttribute('stroke', 'rgba(255, 210, 0, 0.8)');
    lastArrow.setAttribute('stroke-width', '0.05');
    lastArrow.setAttribute('marker-end', 'url(#swipe-arrow-last)');
    lastArrow.style.display = 'none';
    svg.appendChild(lastArrow);

    const liveArrow = document.createElementNS(svgNs, 'line');
    liveArrow.setAttribute('stroke', 'rgba(120, 255, 200, 0.9)');
    liveArrow.setAttribute('stroke-width', '0.05');
    liveArrow.setAttribute('marker-end', 'url(#swipe-arrow-live)');
    liveArrow.style.display = 'none';
    svg.appendChild(liveArrow);

    const lastDot = document.createElementNS(svgNs, 'circle');
    lastDot.setAttribute('r', '0.08');
    lastDot.setAttribute('fill', 'rgba(255, 210, 0, 0.75)');
    lastDot.setAttribute('stroke', 'rgba(255, 180, 0, 0.9)');
    lastDot.setAttribute('stroke-width', '0.02');
    lastDot.style.display = 'none';
    svg.appendChild(lastDot);

    const currentDot = document.createElementNS(svgNs, 'circle');
    currentDot.setAttribute('r', '0.1');
    currentDot.setAttribute('fill', 'rgba(120, 255, 180, 0.85)');
    currentDot.setAttribute('stroke', 'rgba(60, 240, 150, 0.9)');
    currentDot.setAttribute('stroke-width', '0.02');
    currentDot.style.display = 'none';
    svg.appendChild(currentDot);

    const legend = document.createElement('div');
    legend.style.fontSize = '12px';
    legend.style.textAlign = 'center';
    legend.style.opacity = '0.75';
    legend.style.marginTop = '8px';
    legend.innerHTML =
      'Current: <span style="color:#7dffb6">●</span>  Last: <span style="color:#ffd200">●</span><br />' +
      'Swipe: <span style="color:#78ffb4">&rarr;</span> live  <span style="color:#ffd24a">&rarr;</span> last';

    strikePanel.appendChild(svg);
    strikePanel.appendChild(legend);

    document.body.appendChild(container);
    document.body.appendChild(strikePanel);

    return {
      container,
      strikePanel,
      info: infoBlock,
      vectorReadout,
      currentDot,
      lastDot,
      liveArrow,
      lastArrow,
      label: zoneLabel
    };
  }

  private toggleDebugMode(enabled?: boolean): boolean {
    const next = enabled ?? !this.debugMode;
    if (this.debugMode === next) {
      return this.debugMode;
    }

    this.debugMode = next;
    this.goalKeeper.setColliderDebugVisible(this.debugMode);
    this.ballColliderMesh.visible = this.debugMode;
    this.goalColliderGroup.visible = this.debugMode;
    this.trajectoryLine.visible = this.debugMode;
    this.debugHud.style.display = this.debugMode ? 'block' : 'none';
    this.strikePanel.style.display = this.debugMode ? 'flex' : 'none';
    updateDebugButtonState(this.debugButton, this.debugMode);
    this.axisArrows.forEach((arrow) => {
      arrow.visible = this.debugMode;
    });
    if (this.debugMode) {
      this.updateDebugVisuals();
    }
    return this.debugMode;
  }

  private updateDebugVisuals() {
    if (!this.debugMode) return;

    this.ballColliderMesh.position.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.updateTrajectoryLine();
    this.updateDebugHud();
    this.updateAxisArrows();
  }

  private updateTrajectoryLine() {
    const positions = this.trajectoryPositions;
    const basePosition = this.ball.body.position;
    const velocity = this.ball.body.velocity;
    const gravity = this.world.gravity;
    const sampleStep = this.trajectorySampleStep;
    const sampleCount = this.trajectorySampleCount;

    for (let i = 0; i < sampleCount; i++) {
      const t = i * sampleStep;
      const idx = i * 3;
      const x = basePosition.x + velocity.x * t + 0.5 * gravity.x * t * t;
      const y = basePosition.y + velocity.y * t + 0.5 * gravity.y * t * t;
      const z = basePosition.z + velocity.z * t + 0.5 * gravity.z * t * t;
      positions[idx] = x;
      positions[idx + 1] = Math.max(y, BALL_RADIUS);
      positions[idx + 2] = z;
    }

    const positionAttribute = this.trajectoryGeometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    this.trajectoryGeometry.computeBoundingSphere();
  }

  private updateAxisArrows() {
    const { position, quaternion } = this.ball.body;
    this.axisArrows.forEach((arrow) => {
      arrow.position.set(position.x, position.y, position.z);
    });

    this.tempQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    this.tempAxisX.set(1, 0, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisY.set(0, 1, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisZ.set(0, 0, 1).applyQuaternion(this.tempQuaternion);

    this.axisArrows[0].setDirection(this.tempAxisX.normalize());
    this.axisArrows[1].setDirection(this.tempAxisY.normalize());
    this.axisArrows[2].setDirection(this.tempAxisZ.normalize());
  }

  private updateDebugHud() {
    const velocity = this.ball.body.velocity;
    const speed = velocity.length();
    const spin = this.ball.body.angularVelocity;
    const spinSpeed = spin.length();

    const formatVector = (vec: CANNON.Vec3) =>
      `[${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)}]`;
    const formatDirection = (vec: CANNON.Vec3) => {
      const length = vec.length();
      if (length === 0) return '[0.00, 0.00, 0.00]';
      const inv = 1 / length;
      return `[${(vec.x * inv).toFixed(2)}, ${(vec.y * inv).toFixed(2)}, ${(vec.z * inv).toFixed(2)}]`;
    };

    const currentContact = this.strikeContact;
    const lastContact = this.lastStrikeContact;
    const currentZone = currentContact ? this.classifyStrikeContact(currentContact) : 'None';
    const lastZone = lastContact ? this.classifyStrikeContact(lastContact) : 'None';

    this.debugHudInfo.textContent = [
      'Ball Diagnostics',
      `Velocity:  ${formatVector(velocity)}`,
      `Speed:     ${speed.toFixed(2)} m/s`,
      `Direction: ${formatDirection(velocity)}`,
      '',
      `Spin:      ${formatVector(spin)}`,
      `Spin Mag:  ${spinSpeed.toFixed(2)} rad/s`,
      `Spin Dir:  ${formatDirection(spin)}`,
      '',
      `Strike (live): ${currentZone}`,
      `Strike (last): ${lastZone}`
    ].join('\n');

    this.updateStrikeMap(currentContact, lastContact);
  }

  private updateStrikeMap(
    current: { x: number; y: number } | null,
    last: { x: number; y: number } | null
  ) {
    const applyDot = (dot: SVGCircleElement, contact: { x: number; y: number } | null, visible: boolean) => {
      if (!contact || !visible) {
        dot.style.display = 'none';
        return;
      }
      const clampedX = THREE.MathUtils.clamp(contact.x, -2.1, 2.1);
      const clampedY = THREE.MathUtils.clamp(contact.y, -2.3, 2.3);
      dot.setAttribute('cx', clampedX.toString());
      dot.setAttribute('cy', clampedY.toString());
      dot.style.display = 'block';
    };

    applyDot(this.strikeMapCurrentDot, current, this.debugMode);
    applyDot(this.strikeMapLastDot, last, this.debugMode && !!last);

    const clampCoord = (value: number) => THREE.MathUtils.clamp(value, -2.3, 2.3);
    const vectorScale = 0.12;
    const applyArrow = (
      arrow: SVGLineElement,
      vector: { start: { x: number; y: number }; end: { x: number; y: number } } | null,
      visible: boolean
    ) => {
      if (!vector || !visible) {
        arrow.style.display = 'none';
        return;
      }
      const startX = clampCoord(vector.start.x);
      const startY = clampCoord(vector.start.y);
      const scaledEndX = vector.start.x + (vector.end.x - vector.start.x) * vectorScale;
      const scaledEndY = vector.start.y + (vector.end.y - vector.start.y) * vectorScale;
      const endX = clampCoord(scaledEndX);
      const endY = clampCoord(scaledEndY);
      arrow.setAttribute('x1', startX.toString());
      arrow.setAttribute('y1', startY.toString());
      arrow.setAttribute('x2', endX.toString());
      arrow.setAttribute('y2', endY.toString());
      arrow.style.display = 'block';
    };

    applyArrow(this.swipeLastArrow, this.lastSwipeVector, this.debugMode && !!this.lastSwipeVector);
    applyArrow(this.swipeLiveArrow, this.liveSwipeVector, this.debugMode && !!this.liveSwipeVector);

    const liveText = current
      ? `Live (x:${current.x.toFixed(2)}, y:${current.y.toFixed(2)})`
      : 'Live: none';
    const lastText = last
      ? `Last (x:${last.x.toFixed(2)}, y:${last.y.toFixed(2)})`
      : 'Last: none';
    this.strikeZoneLabel.textContent = `${liveText}  |  ${lastText}`;

    if (this.vectorReadout) {
      if (this.lastSwipeVector) {
        const lastVector = this.lastSwipeVector;
        const vx = lastVector.end.x - lastVector.start.x;
        const vy = lastVector.end.y - lastVector.start.y;
        const mag = Math.sqrt(vx * vx + vy * vy);
        this.vectorReadout.textContent = `Swipe Δ (x:${vx.toFixed(2)}, y:${vy.toFixed(2)})  |  Mag:${mag.toFixed(2)}`;
      } else {
        this.vectorReadout.textContent = 'Swipe Δ: n/a';
      }
    }
  }

  private computeStrikePoint(event: PointerEvent): { x: number; y: number } | null {
    if (!this.updateBallScreenMetrics()) {
      return null;
    }

    const radius = Math.max(this.ballScreenRadius, 10);
    const localX = (event.clientX - this.ballScreenCenter.x) / radius;
    const localY = (event.clientY - this.ballScreenCenter.y) / radius;
    const distance = Math.hypot(localX, localY);
    const clampRange = 1.25;
    const falloff = Math.max(0, 1 - Math.max(distance - 1, 0) * 0.8);

    const contactX = THREE.MathUtils.clamp(localX, -clampRange, clampRange) * falloff;
    const contactY = THREE.MathUtils.clamp(localY, -clampRange, clampRange) * falloff;

    return { x: contactX, y: contactY };
  }

  private captureStrikeContact(event: PointerEvent): { x: number; y: number } | null {
    const contact = this.computeStrikePoint(event);
    this.strikeContact = contact;
    return contact;
  }

  private computeSwipeVectorEnd(event: PointerEvent): { x: number; y: number } | null {
    if (!this.pointerStartNormalized || !this.pointerStart) {
      return this.computeStrikePoint(event);
    }
    if (!this.updateBallScreenMetrics()) {
      return null;
    }

    const radius = Math.max(this.ballScreenRadius, 10);
    const deltaX = (event.clientX - this.pointerStart.x) / radius;
    const deltaY = (event.clientY - this.pointerStart.y) / radius;

    return {
      x: this.pointerStartNormalized.x + deltaX,
      y: this.pointerStartNormalized.y + deltaY
    };
  }

  private updateLiveSwipeVectorEnd(event: PointerEvent) {
    if (!this.liveSwipeVector) {
      return;
    }
    const point = this.computeSwipeVectorEnd(event);
    if (!point) {
      return;
    }
    this.liveSwipeVector.end = point;
  }

  private updateBallScreenMetrics(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return false;

    this.tempBallPosition.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    this.tempBallPosition.project(this.camera);

    const screenX = rect.left + ((this.tempBallPosition.x + 1) * 0.5) * width;
    const screenY = rect.top + ((1 - (this.tempBallPosition.y + 1) * 0.5)) * height;

    this.tempBallOffset
      .set(this.ball.body.position.x + BALL_RADIUS, this.ball.body.position.y, this.ball.body.position.z)
      .project(this.camera);

    const offsetX = rect.left + ((this.tempBallOffset.x + 1) * 0.5) * width;
    const offsetY = rect.top + ((1 - (this.tempBallOffset.y + 1) * 0.5)) * height;

    this.ballScreenCenter = { x: screenX, y: screenY };
    this.ballScreenRadius = Math.max(Math.hypot(offsetX - screenX, offsetY - screenY), 16);
    return Number.isFinite(this.ballScreenRadius);
  }

  private classifyStrikeContact(contact: { x: number; y: number }): string {
    const { x, y } = contact;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (y > 0.5 && absX < 0.6) {
      return 'Chip / Scoop';
    }

    if (y < -0.45 && absX < 0.55) {
      return 'Top / Knuckle';
    }

    if (x > 0.28) {
      if (y > 0.45) {
        return 'Inside Scoop';
      }
      if (y < -0.45) {
        return 'Inside Brush';
      }
      return 'Inside Foot Curl';
    }

    if (x < -0.28) {
      if (y > 0.45) {
        return 'Outside Scoop';
      }
      if (y < -0.45) {
        return 'Outside Brush';
      }
      return 'Outside Foot Curl';
    }

    if (absX < 0.35 && absY < 0.4) {
      return 'Instep Drive';
    }

    if (absX > 0.24) {
      return x > 0 ? 'Inside Brush' : 'Outside Brush';
    }

    if (y > 0.3) {
      return x >= 0 ? 'Inside Scoop' : 'Outside Scoop';
    }

    return 'Mixed Contact';
  }

  private computeStrikeSpin(strikeContact: { x: number; y: number }, basePower: number): {
    side: number;
    top: number;
    roll: number;
  } {
    const horizontal = THREE.MathUtils.clamp(strikeContact.x, -1.25, 1.25);
    const vertical = THREE.MathUtils.clamp(strikeContact.y, -1.25, 1.25);
    const contactMagnitude = Math.min(Math.hypot(horizontal, vertical), 1.35);

    const powerScale = THREE.MathUtils.lerp(1.25, 2.4, THREE.MathUtils.clamp(basePower / 38, 0, 1));
    const baseSpin = basePower * 0.38 * powerScale;
    const magnitudeBoost = THREE.MathUtils.lerp(0.55, 1.25, contactMagnitude);

    const yawSpinRaw = -horizontal * baseSpin * 1.35 * magnitudeBoost; // (Z axis) curve component
    const pitchSpinRaw = -vertical * baseSpin * 0.88 * magnitudeBoost; // (X axis) top/bottom component
    const rollSpinRaw = -horizontal * baseSpin * 1.35 * magnitudeBoost; // (Y axis) inside/outside component

    const maxSpin = 65;
    const clampSpin = (value: number) => THREE.MathUtils.clamp(value, -maxSpin, maxSpin);
    const sideSpin = clampSpin(-pitchSpinRaw);
    const topSpin = clampSpin(-yawSpinRaw);
    const rollSpin = clampSpin(rollSpinRaw);

    return {
      side: sideSpin,
      top: topSpin,
      roll: rollSpin
    };
  }

  private scheduleStrikeSpin(contact: { x: number; y: number }, basePower: number, attempt = 0) {
    const applySpin = () => {
      const spin = this.computeStrikeSpin(contact, basePower);
      this.ball.body.angularVelocity.set(spin.side, spin.roll, spin.top);
    };

    const body = this.ball.body;
    if (body.position.y > BALL_RADIUS + 0.02 || attempt >= 3) {
      applySpin();
      return;
    }

    window.setTimeout(() => {
      this.scheduleStrikeSpin(contact, basePower, attempt + 1);
    }, 16);
  }
}
