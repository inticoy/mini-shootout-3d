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
}
