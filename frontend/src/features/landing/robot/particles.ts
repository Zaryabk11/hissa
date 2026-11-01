import * as THREE from 'three';
import { landingColors } from '../../../shared/theme/landingTokens';

const N = 90;

/** Fixed pool of lime points. Positions live in scene px (y up). Parked offscreen when dead. */
export class Particles {
  private pos = new Float32Array(N * 3).fill(-9999);
  private vel = new Float32Array(N * 3);
  private life = new Float32Array(N);
  private next = 0;
  private geometry = new THREE.BufferGeometry();
  private material = new THREE.PointsMaterial({ color: landingColors.lime, size: 7, sizeAttenuation: false, transparent: true });

  constructor(scene: THREE.Scene) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    scene.add(new THREE.Points(this.geometry, this.material));
  }

  burst(x: number, y: number, count: number, speed: number) {
    for (let k = 0; k < count; k++) {
      const i = this.next++ % N;
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random()) * speed;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = 300;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = Math.sin(a) * s + speed * 0.3;
      this.life[i] = 0.5 + Math.random() * 0.4;
    }
  }

  update(dt: number) {
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.vel[i * 3 + 1] -= 520 * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -9999;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
