export interface DebugPanelCallbacks {
  onToggleDebug: () => void;
  onNextTheme: () => void;
}

export function createDebugButton(callbacks: DebugPanelCallbacks): HTMLButtonElement {
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
  button.style.zIndex = '50';
  button.style.transition = 'background 0.16s ease';
  button.addEventListener('mouseenter', () => {
    if (button.dataset.active !== 'true') {
      button.style.background = 'rgba(20, 60, 80, 0.75)';
    }
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = button.dataset.active === 'true' ? 'rgba(30, 80, 110, 0.85)' : 'rgba(0, 0, 0, 0.65)';
  });
  button.addEventListener('click', () => {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
    }
  });
  document.body.appendChild(button);

  // 디버그 패널 생성
  createDebugPanel(callbacks);

  return button;
}

function createDebugPanel(callbacks: DebugPanelCallbacks): void {
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.position = 'fixed';
  panel.style.left = '18px';
  panel.style.top = '60px';
  panel.style.padding = '12px';
  panel.style.background = 'rgba(0, 0, 0, 0.85)';
  panel.style.border = '1px solid rgba(120, 200, 255, 0.65)';
  panel.style.borderRadius = '6px';
  panel.style.fontFamily = 'monospace';
  panel.style.fontSize = '12px';
  panel.style.color = '#d9faff';
  panel.style.zIndex = '50';
  panel.style.display = 'none';
  panel.style.minWidth = '180px';

  // 디버그 모드 토글 버튼
  const debugToggleBtn = createPanelButton('Toggle Debug Mode', () => {
    callbacks.onToggleDebug();
  });
  panel.appendChild(debugToggleBtn);

  // 테마 전환 버튼
  const themeBtn = createPanelButton('Next Theme', () => {
    callbacks.onNextTheme();
  });
  panel.appendChild(themeBtn);

  document.body.appendChild(panel);
}

function createPanelButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;
  button.style.display = 'block';
  button.style.width = '100%';
  button.style.padding = '8px 12px';
  button.style.marginBottom = '6px';
  button.style.background = 'rgba(30, 80, 110, 0.7)';
  button.style.color = '#d9faff';
  button.style.border = '1px solid rgba(120, 200, 255, 0.5)';
  button.style.borderRadius = '4px';
  button.style.fontFamily = 'monospace';
  button.style.fontSize = '11px';
  button.style.cursor = 'pointer';
  button.style.transition = 'background 0.16s ease';
  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(40, 100, 130, 0.85)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(30, 80, 110, 0.7)';
  });
  button.addEventListener('click', onClick);
  return button;
}

export function updateDebugButtonState(button: HTMLButtonElement, enabled: boolean) {
  button.dataset.active = enabled ? 'true' : 'false';
  button.textContent = enabled ? 'Debug ON' : 'Debug';
  button.style.background = enabled ? 'rgba(30, 80, 110, 0.85)' : 'rgba(0, 0, 0, 0.65)';
}
