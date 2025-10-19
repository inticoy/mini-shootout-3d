import * as THREE from 'three';
import { GOAL_NET_CONFIG } from '../config/net';
import type { GoalNet, GoalNetNode } from './goalNet';

interface NetPulse {
  center: THREE.Vector2;
  age: number;
  strength: number;
}

export class GoalNetAnimator {
  private readonly pulses: NetPulse[] = [];
  private readonly tempLocal = new THREE.Vector3();
  private time = 0;
  private idleEnabled = true;
  private readonly net: GoalNet;

  constructor(net: GoalNet) {
    this.net = net;
  }

  update(deltaTime: number): void {
    if (!this.idleEnabled && this.pulses.length === 0) {
      return;
    }

    const config = GOAL_NET_CONFIG.animation;
    const idleAmp = config.idleAmplitude;
    const idleFreq = config.idleFrequency;
    const idleFalloff = config.idleFalloff;

    this.time += deltaTime;

    const activePulses = this.pulses;
    for (let i = activePulses.length - 1; i >= 0; i -= 1) {
      activePulses[i].age += deltaTime;
      const decay = Math.exp(-config.pulseDecay * activePulses[i].age);
      if (decay < 0.01) {
        activePulses.splice(i, 1);
      }
    }

    const requiresUpdate = this.idleEnabled || activePulses.length > 0;
    if (!requiresUpdate) {
      return;
    }

    for (const node of this.net.nodes) {
      this.applyOffsetToNode(node, idleAmp, idleFreq, idleFalloff, activePulses);
    }

    this.net.refreshVisual();
  }

  triggerPulse(worldPoint: THREE.Vector3, strength: number): void {
    const relative = this.tempLocal.copy(worldPoint);
    relative.sub(this.net.object.position);
    this.pulses.push({
      center: new THREE.Vector2(relative.x, relative.y),
      age: 0,
      strength: strength * GOAL_NET_CONFIG.animation.pulseAmplitude
    });
  }

  setIdleEnabled(enabled: boolean): void {
    this.idleEnabled = enabled;
    if (!enabled && this.pulses.length === 0) {
      this.net.resetToRest();
    }
  }

  reset(): void {
    this.pulses.length = 0;
    this.net.resetToRest();
  }

  private applyOffsetToNode(
    node: GoalNetNode,
    idleAmplitude: number,
    idleFrequency: number,
    idleFalloff: number,
    pulses: NetPulse[]
  ): void {
    const bounds = this.net.restBounds;
    const height = Math.max(bounds.maxY - bounds.minY, 0.001);
    const width = Math.max(bounds.maxX - bounds.minX, 0.001);

    const rest = node.restPosition;
    const vertical = THREE.MathUtils.clamp((rest.y - bounds.minY) / height, 0, 1);
    const horizontal = (rest.x - bounds.minX) / width;

    let offset = 0;

    if (this.idleEnabled) {
      const falloff = Math.pow(1 - vertical, idleFalloff);
      offset += Math.sin(this.time * idleFrequency * 2 * Math.PI + horizontal * Math.PI * 2) * idleAmplitude * falloff;
    }

    if (pulses.length > 0 && !node.fixed) {
      pulses.forEach((pulse) => {
        const dx = rest.x - pulse.center.x;
        const dy = rest.y - pulse.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = GOAL_NET_CONFIG.animation.pulseRadius + pulse.age * 0.6;
        if (radius <= 0 || distance > radius) return;

        const attenuation = Math.cos((distance / radius) * Math.PI * 0.5);
        const decay = Math.exp(-GOAL_NET_CONFIG.animation.pulseDecay * pulse.age);
        const oscillation = Math.sin(pulse.age * GOAL_NET_CONFIG.animation.pulseDamping * Math.PI);
        offset += pulse.strength * attenuation * decay * oscillation;
      });
    }

    node.position.set(rest.x, rest.y, rest.z - offset);
  }
}
