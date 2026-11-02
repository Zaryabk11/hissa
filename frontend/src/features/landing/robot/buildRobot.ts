import * as THREE from 'three';
import { landingColors } from '../../../shared/theme/landingTokens';

export type Pose = {
  sh0: number;
  sh1: number;
  el0: number;
  el1: number;
  h0: number;
  h1: number;
  lean: number;
  yaw: number;
  tw: number;
  bob: number;
};

/** Joint groups the poses drive. Arms and hips come as [left, right]. `pose` is the current, eased state. */
export type Robot = {
  root: THREE.Group;
  rig: THREE.Group;
  torso: THREE.Group;
  sh: THREE.Group[];
  el: THREE.Group[];
  hip: THREE.Group[];
  fist: THREE.Mesh[];
  pose: Pose;
};

const limeEmissive = 0x88aa00;

/** Procedural robot from the landing HTML (mk). `light` is the lighter paint used for the buddy robot in e2. */
export function buildRobot(light: boolean): Robot {
  const mat = (color: number | string, metalness: number, roughness: number, emissive = 0) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: emissive ? 0.55 : 0 });
  const body = mat(light ? 0xdadcde : 0x4a4d52, 0.45, 0.4);
  const dark = mat(light ? 0x8e9196 : 0x1b1c1e, 0.3, 0.5);
  const lime = mat(landingColors.lime, 0.1, 0.35, limeEmissive);
  const glass = mat(0x0b0b0c, 0.9, 0.12);

  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cy = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 20);
  const bx = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const sp = (r: number) => new THREE.SphereGeometry(r, 20, 16);

  const torso = new THREE.Group();
  torso.position.y = 0.95;
  rig.add(torso);
  add(torso, bx(1.0, 1.1, 0.7), body, 0, 0.65, 0);
  add(torso, bx(0.5, 0.28, 0.06), lime, 0, 0.8, 0.37);
  add(torso, cy(0.42, 0.14), dark, 0, 0.05, 0);
  add(torso, bx(0.62, 0.72, 0.22), dark, 0, 0.7, -0.44);
  add(torso, cy(0.12, 0.22), dark, 0, 1.3, 0);

  const head = new THREE.Group();
  head.position.y = 1.72;
  torso.add(head);
  add(head, bx(0.84, 0.62, 0.68), body);
  add(head, bx(0.66, 0.26, 0.06), glass, 0, 0.02, 0.35);
  add(head, bx(0.13, 0.09, 0.03), lime, -0.16, 0.02, 0.385);
  add(head, bx(0.13, 0.09, 0.03), lime, 0.16, 0.02, 0.385);
  [-1, 1].forEach((s) => {
    const ear = add(head, cy(0.1, 0.14), lime, s * 0.47, 0, 0);
    ear.rotation.z = Math.PI / 2;
  });
  add(head, cy(0.025, 0.4), dark, 0, 0.5, 0);
  add(head, sp(0.07), lime, 0, 0.72, 0);

  const sh: THREE.Group[] = [];
  const el: THREE.Group[] = [];
  const hip: THREE.Group[] = [];
  const fist: THREE.Mesh[] = [];
  [-1, 1].forEach((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.68, 1.05, 0);
    torso.add(shoulder);
    add(shoulder, sp(0.22), body);
    add(shoulder, cy(0.12, 0.55), dark, 0, -0.3, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.6;
    shoulder.add(elbow);
    add(elbow, sp(0.13), dark);
    add(elbow, cy(0.14, 0.5), body, 0, -0.27, 0);
    fist.push(add(elbow, sp(0.19), lime, 0, -0.62, 0));
    sh.push(shoulder);
    el.push(elbow);

    const h = new THREE.Group();
    h.position.set(s * 0.28, 0.95, 0);
    rig.add(h);
    add(h, cy(0.15, 0.8), dark, 0, -0.4, 0);
    add(h, sp(0.16), body, 0, -0.02, 0);
    add(h, bx(0.34, 0.14, 0.55), body, 0, -0.85, 0.1);
    hip.push(h);
  });

  return { root, rig, torso, sh, el, hip, fist, pose: { sh0: 0, sh1: 0, el0: -0.2, el1: -0.2, h0: 0, h1: 0, lean: 0, yaw: 0, tw: 0, bob: 0 } };
}

/** Frees every geometry and material under the robot. */
export function disposeRobot(robot: Robot) {
  robot.root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
