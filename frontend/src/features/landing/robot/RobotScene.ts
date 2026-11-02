import * as THREE from 'three';
import { landingColors } from '../../../shared/theme/landingTokens';
import { buildRobot, disposeRobot, type Robot } from './buildRobot';
import { Particles } from './particles';
import { easePose, STRIKES, targetPose } from './poses';
import type { Frame, FrameContext, SceneEvents } from './types';

const INTRO_DROP = 1.0; // seconds the robot takes to fall in
const INTRO_END = 4.0; // seconds until the subtext and buttons appear
const INTRO_PUNCH_MODE_END = 4.2;

/**
 * One transparent WebGL scene over the page, in CSS pixels (orthographic, y up). The page supplies where the
 * robots stand each frame through `getFrame` (see journey.ts); null hides them. The scene owns the render loop,
 * pose easing, the hero punch intro and particles.
 * Throws if WebGL cannot be created. Call `dispose` to free the renderer, geometry and materials.
 */
export function createRobotScene(
  canvas: HTMLCanvasElement,
  events: SceneEvents,
  getFrame: (ctx: FrameContext) => Frame | null,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -3000, 3000);
  camera.position.z = 1000;
  let vw = 0;
  let vh = 0;
  const resize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.right = vw;
    camera.top = vh;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(-300, 600, 800);
  const rim = new THREE.DirectionalLight(landingColors.lime, 1.1);
  rim.position.set(700, 300, -500);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(500, -100, 700);
  scene.add(key, rim, fill);

  const robot: Robot = buildRobot(false);
  const buddy: Robot = buildRobot(true); // light grey handshake partner
  buddy.root.visible = false;
  scene.add(robot.root, buddy.root);
  const particles = new Particles(scene);
  const fistAt = new THREE.Vector3();

  const apply = (r: Robot, x: number, yDown: number, size: number) => {
    r.root.visible = true;
    r.root.position.set(x, vh - yDown, 0);
    r.root.scale.setScalar(size / 3.3);
    r.rig.rotation.y = r.pose.yaw;
    r.rig.position.y = r.pose.bob;
    r.torso.rotation.x = r.pose.lean;
    r.torso.rotation.y = r.pose.tw;
    for (let i = 0; i < 2; i++) {
      r.sh[i].rotation.x = r.pose[i ? 'sh1' : 'sh0'];
      r.el[i].rotation.x = r.pose[i ? 'el1' : 'el0'];
      r.hip[i].rotation.x = r.pose[i ? 'h1' : 'h0'];
    }
  };

  let raf = 0;
  let last = 0;
  let clock = 0; // advances by capped frame time, so a hidden tab does not skip the intro
  let started = false;
  let landed = false;
  let introEnded = false;
  let shake = 0;
  let shaking = false;
  const fired = STRIKES.map(() => false);

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const t = now / 1000;
    const dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    clock += dt;
    if (!started) {
      started = true;
      events.onReady();
    }

    const frame = getFrame({ vw, vh, dt, t: clock });
    const place = frame?.main;
    if (!frame || !place) {
      robot.root.visible = false;
      buddy.root.visible = false;
    } else {
      const intro = place.hero && clock < INTRO_PUNCH_MODE_END;
      const { pose: target, K } = targetPose(intro ? 'punch' : place.mode, {
        t: clock,
        yaw: place.yaw,
        ti: clock,
        wave: place.wave,
      });
      easePose(robot.pose, target, dt, K);

      // Drop in: ease down over INTRO_DROP, with a small bounce after landing.
      let drop = 0;
      if (place.hero && clock < INTRO_DROP) {
        const u = clock / INTRO_DROP;
        const e = u < 0.7 ? 1 - Math.pow(1 - u / 0.7, 3) : 1;
        drop = (1 - e) * vh * 0.7 + (u > 0.7 ? Math.sin(((u - 0.7) / 0.3) * Math.PI) * 14 : 0);
        if (!landed && u > 0.7) {
          landed = true;
          particles.burst(place.x, vh - place.y, 36, 260);
        }
      }
      apply(robot, place.x, place.y - drop, place.size);

      const p2 = frame.buddy;
      if (p2) {
        const { pose: t2, K: K2 } = targetPose('shake', { t: clock, yaw: p2.yaw, wave: p2.wave, mirror: true });
        easePose(buddy.pose, t2, dt, K2);
        apply(buddy, p2.x, p2.y, p2.size);
      } else {
        buddy.root.visible = false;
      }
      frame.bursts.forEach((b) => particles.burst(b.x, vh - b.y, b.count, b.speed));

      if (intro) {
        STRIKES.forEach((strike, k) => {
          if (fired[k] || clock < strike) return;
          fired[k] = true;
          shake = k === 2 ? 26 : 16;
          robot.root.updateMatrixWorld(true);
          robot.fist[k % 2].getWorldPosition(fistAt);
          particles.burst(fistAt.x, fistAt.y, 26, 300);
          events.onPunch(k);
        });
      }
    }
    // The intro always finishes on time, even if the user scrolled away from the hero: reveal what was not punched.
    if (clock >= INTRO_END && !introEnded) {
      introEnded = true;
      fired.forEach((f, k) => {
        if (!f) {
          fired[k] = true;
          events.onPunch(k);
        }
      });
      events.onIntroEnd();
    }

    particles.update(dt);
    shake *= Math.pow(0.86, dt * 60);
    if (shake > 0.5) {
      shaking = true;
      events.onShake((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    } else if (shaking) {
      shaking = false;
      events.onShake(0, 0);
    }
    renderer.render(scene, camera);
  };

  // A hidden tab stops rendering entirely; resuming restarts the frame clock so dt does not spike.
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      events.onShake(0, 0);
      particles.dispose();
      disposeRobot(robot);
      disposeRobot(buddy);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
