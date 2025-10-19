type SwipeVector =
  | {
      start: { x: number; y: number };
      end: { x: number; y: number };
    }
  | null;

export interface DebugHudState {
  velocity: { x: number; y: number; z: number };
  speed: number;
  spin: { x: number; y: number; z: number };
  spinSpeed: number;
  currentContact: { x: number; y: number } | null;
  lastContact: { x: number; y: number } | null;
  liveSwipe: SwipeVector;
  lastSwipe: SwipeVector;
}

export class DebugHudController {
  private readonly container: HTMLDivElement;
  private readonly infoBlock: HTMLPreElement;
  private readonly strikeLabel: HTMLDivElement;
  private readonly vectorReadout: HTMLDivElement;
  private readonly strikePanel: HTMLDivElement;
  private readonly currentDot: SVGCircleElement;
  private readonly lastDot: SVGCircleElement;
  private readonly liveArrow: SVGLineElement;
  private readonly lastArrow: SVGLineElement;

  private readonly clampCoord = (value: number) => Math.max(-2.3, Math.min(2.3, value));
  private readonly vectorScale = 0.12;

  constructor() {
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

    const strikeLabel = document.createElement('div');
    strikeLabel.style.fontSize = '12px';
    strikeLabel.style.marginTop = '12px';
    strikeLabel.style.textAlign = 'left';
    strikeLabel.style.opacity = '0.9';
    strikeLabel.textContent = 'Contact: (none)';
    container.appendChild(strikeLabel);

    const vectorReadout = document.createElement('div');
    vectorReadout.style.fontSize = '12px';
    vectorReadout.style.marginTop = '6px';
    vectorReadout.style.textAlign = 'left';
    vectorReadout.style.opacity = '0.85';
    vectorReadout.textContent = 'Swipe Δ: n/a';
    container.appendChild(vectorReadout);

    const strikePanel = this.createStrikePanel();

    document.body.appendChild(container);
    document.body.appendChild(strikePanel.panel);

    this.container = container;
    this.infoBlock = infoBlock;
    this.strikeLabel = strikeLabel;
    this.vectorReadout = vectorReadout;
    this.strikePanel = strikePanel.panel;
    this.currentDot = strikePanel.currentDot;
    this.lastDot = strikePanel.lastDot;
    this.liveArrow = strikePanel.liveArrow;
    this.lastArrow = strikePanel.lastArrow;
  }

  setVisible(visible: boolean) {
    this.container.style.display = visible ? 'block' : 'none';
    this.strikePanel.style.display = visible ? 'flex' : 'none';
  }

  update(state: DebugHudState) {
    if (this.container.style.display === 'none') return;

    const formatVector = (vec: { x: number; y: number; z: number }) =>
      `[${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)}]`;
    const formatDirection = (vec: { x: number; y: number; z: number }) => {
      const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
      if (length === 0) return '[0.00, 0.00, 0.00]';
      const inv = 1 / length;
      return `[${(vec.x * inv).toFixed(2)}, ${(vec.y * inv).toFixed(2)}, ${(vec.z * inv).toFixed(2)}]`;
    };

    this.infoBlock.textContent = [
      'Ball Diagnostics',
      `Velocity:  ${formatVector(state.velocity)}`,
      `Speed:     ${state.speed.toFixed(2)} m/s`,
      `Direction: ${formatDirection(state.velocity)}`,
      '',
      `Spin:      ${formatVector(state.spin)}`,
      `Spin Mag:  ${state.spinSpeed.toFixed(2)} rad/s`,
      `Spin Dir:  ${formatDirection(state.spin)}`
    ].join('\n');

    const liveText = state.currentContact
      ? `Live (x:${state.currentContact.x.toFixed(2)}, y:${state.currentContact.y.toFixed(2)})`
      : 'Live: none';
    const lastText = state.lastContact
      ? `Last (x:${state.lastContact.x.toFixed(2)}, y:${state.lastContact.y.toFixed(2)})`
      : 'Last: none';

    this.strikeLabel.textContent = `${liveText}  |  ${lastText}`;

    if (state.lastSwipe) {
      const vx = state.lastSwipe.end.x - state.lastSwipe.start.x;
      const vy = state.lastSwipe.end.y - state.lastSwipe.start.y;
      const mag = Math.sqrt(vx * vx + vy * vy);
      this.vectorReadout.textContent = `Swipe Δ (x:${vx.toFixed(2)}, y:${vy.toFixed(2)})  |  Mag:${mag.toFixed(2)}`;
    } else {
      this.vectorReadout.textContent = 'Swipe Δ: n/a';
    }

    this.applyStrikeDot(this.currentDot, state.currentContact, true);
    this.applyStrikeDot(this.lastDot, state.lastContact, !!state.lastContact);
    this.applySwipeArrow(this.liveArrow, state.liveSwipe, !!state.liveSwipe);
    this.applySwipeArrow(this.lastArrow, state.lastSwipe, !!state.lastSwipe);
  }

  destroy() {
    this.container.remove();
    this.strikePanel.remove();
  }

  private applyStrikeDot(dot: SVGCircleElement, contact: { x: number; y: number } | null, visible: boolean) {
    if (!contact || !visible) {
      dot.style.display = 'none';
      return;
    }
    dot.setAttribute('cx', this.clampCoord(contact.x).toString());
    dot.setAttribute('cy', this.clampCoord(contact.y).toString());
    dot.style.display = 'block';
  }

  private applySwipeArrow(arrow: SVGLineElement, swipe: SwipeVector, visible: boolean) {
    if (!swipe || !visible) {
      arrow.style.display = 'none';
      return;
    }
    const startX = this.clampCoord(swipe.start.x);
    const startY = this.clampCoord(swipe.start.y);
    const scaledEndX = swipe.start.x + (swipe.end.x - swipe.start.x) * this.vectorScale;
    const scaledEndY = swipe.start.y + (swipe.end.y - swipe.start.y) * this.vectorScale;
    const endX = this.clampCoord(scaledEndX);
    const endY = this.clampCoord(scaledEndY);
    arrow.setAttribute('x1', startX.toString());
    arrow.setAttribute('y1', startY.toString());
    arrow.setAttribute('x2', endX.toString());
    arrow.setAttribute('y2', endY.toString());
    arrow.style.display = 'block';
  }

  private createStrikePanel(): {
    panel: HTMLDivElement;
    currentDot: SVGCircleElement;
    lastDot: SVGCircleElement;
    liveArrow: SVGLineElement;
    lastArrow: SVGLineElement;
  } {
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

    const heading = document.createElement('div');
    heading.style.fontSize = '12px';
    heading.style.textAlign = 'center';
    heading.style.letterSpacing = '0.04em';
    heading.textContent = 'Strike Zones';
    strikePanel.appendChild(heading);

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
      'Swipe: <span style="color:#78ffb4">→</span> live  <span style="color:#ffd24a">→</span> last';

    strikePanel.appendChild(svg);
    strikePanel.appendChild(legend);

    return {
      panel: strikePanel,
      currentDot,
      lastDot,
      liveArrow,
      lastArrow
    };
  }
}

export function createDebugButton(onToggle: () => void): HTMLButtonElement {
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
    if (button.dataset.active !== 'true') {
      button.style.background = 'rgba(20, 60, 80, 0.75)';
    }
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = button.dataset.active === 'true' ? 'rgba(30, 80, 110, 0.85)' : 'rgba(0, 0, 0, 0.65)';
  });
  button.addEventListener('click', onToggle);
  document.body.appendChild(button);
  return button;
}

export function updateDebugButtonState(button: HTMLButtonElement, enabled: boolean) {
  button.dataset.active = enabled ? 'true' : 'false';
  button.textContent = enabled ? 'Debug ON' : 'Debug';
  button.style.background = enabled ? 'rgba(30, 80, 110, 0.85)' : 'rgba(0, 0, 0, 0.65)';
  button.style.borderColor = enabled ? 'rgba(160, 240, 255, 0.9)' : 'rgba(120, 200, 255, 0.65)';
}
