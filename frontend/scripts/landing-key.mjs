const cl = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => {
  x = cl(x);
  return x * x * (3 - 2 * x);
};
export function keyPix(a, W, H, P) {
  let o0 = P.clean && P.clean.fill ? new Uint8ClampedArray(a) : null;
  function avg(cx, cy) {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let yy = cy; yy < cy + 14; yy++)
      for (let xx = cx; xx < cx + 14; xx++) {
        let i = (yy * W + xx) * 4;
        r += a[i];
        g += a[i + 1];
        b += a[i + 2];
        n++;
      }
    return [r / n, g / n, b / n];
  }
  let tl = avg(2, 2),
    tr = avg(W - 16, 2),
    bl = avg(2, H - 16),
    br = avg(W - 16, H - 16);
  let T0 = P.T0,
    T1 = P.T1,
    dist = new Float32Array(W * H),
    bgc = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    let v = y / H;
    for (let xx = 0; xx < W; xx++) {
      let u = xx / W,
        i = y * W + xx,
        s = 0;
      for (let k = 0; k < 3; k++) {
        let bv = (tl[k] * (1 - u) + tr[k] * u) * (1 - v) + (bl[k] * (1 - u) + br[k] * u) * v;
        bgc[i * 3 + k] = bv;
        let df = a[i * 4 + k] - bv;
        s += df * df;
      }
      dist[i] = Math.sqrt(s);
    }
  }
  let seen = new Uint8Array(W * H),
    st = new Int32Array(W * H),
    sp = 0;
  function push(i) {
    if (!seen[i] && dist[i] < T1) {
      seen[i] = 1;
      st[sp++] = i;
    }
  }
  for (let xx = 0; xx < W; xx++) {
    push(xx);
    push((H - 1) * W + xx);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }
  /* enclosed background (handle loops) an edge flood cannot reach */
  if (P.seeds)
    P.seeds.forEach(function (s) {
      push(Math.round((s[1] * H) / 1024) * W + Math.round((s[0] * W) / 1024));
    });
  while (sp) {
    let i = st[--sp],
      px = i % W;
    if (px > 0) push(i - 1);
    if (px < W - 1) push(i + 1);
    if (i >= W) push(i - W);
    if (i < W * (H - 1)) push(i + W);
  }
  /* enclosed background pockets (inside handles): small components close to the bg colour */
  function inR(i) {
    return (
      !P.pr ||
      P.pr.some(function (r) {
        let sx = i % W,
          sy = (i / W) | 0;
        return sx >= r[0] && sx < r[2] && sy >= r[1] && sy < r[3];
      })
    );
  }
  let H0 = P.H0;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (seen[s0] || dist[s0] >= H0 || !inR(s0)) continue;
    let comp = [s0],
      hs = 0;
    seen[s0] = 2;
    while (hs < comp.length) {
      let ci = comp[hs++],
        cx = ci % W,
        nb = [
          cx > 0 ? ci - 1 : -1,
          cx < W - 1 ? ci + 1 : -1,
          ci >= W ? ci - W : -1,
          ci < W * (H - 1) ? ci + W : -1,
        ];
      for (let z = 0; z < 4; z++) {
        let ni = nb[z];
        if (ni >= 0 && !seen[ni] && dist[ni] < H0 && inR(ni)) {
          seen[ni] = 2;
          comp.push(ni);
        }
      }
    }
    if (comp.length >= P.PK) for (let z = 0; z < comp.length; z++) seen[comp[z]] = 0;
  }
  /* painted warm ground shadow touching the background: orange-yellow, grown outward a few px at a time from the keyed area */
  if (P.sh) {
    let dp = new Uint8Array(W * H),
      q = [];
    for (let i = 0; i < W * H; i++)
      if (seen[i] === 1) {
        dp[i] = 1;
        q.push(i);
      }
    for (let qi = 0; qi < q.length; qi++) {
      let ci = q[qi],
        d0 = dp[ci];
      if (d0 > P.sh) continue;
      let cx = ci % W,
        nb = [
          cx > 0 ? ci - 1 : -1,
          cx < W - 1 ? ci + 1 : -1,
          ci >= W ? ci - W : -1,
          ci < W * (H - 1) ? ci + W : -1,
        ];
      for (let z = 0; z < 4; z++) {
        let ni = nb[z];
        if (ni < 0 || dp[ni]) continue;
        let r = a[ni * 4],
          g = a[ni * 4 + 1],
          b = a[ni * 4 + 2];
        if (r > 200 && g > 150 && b > 35 && b < 140 && r - b > 85) {
          dp[ni] = d0 + 1;
          seen[ni] = 1;
          dist[ni] = 0;
          q.push(ni);
        }
      }
    }
  }
  let x0 = W,
    y0 = H,
    x1 = 0,
    y1 = 0;
  for (let i = 0; i < W * H; i++) {
    if (P.cut) {
      let qx = ((i % W) - P.cut[0]) / P.cut[2],
        qy = ((i / W) | 0) - P.cut[1];
      if (qy < 0 && qx * qx + (qy * qy) / (P.cut[3] * P.cut[3]) > 1) {
        a[i * 4 + 3] = 0;
        continue;
      }
    }
    if (!seen[i]) {
      a[i * 4 + 3] = 255;
    } else {
      let al = seen[i] === 2 ? 0 : ease((dist[i] - T0) / (T1 - T0));
      if (al < 1) {
        for (let k = 0; k < 3; k++) {
          let cv = al > 0.02 ? (a[i * 4 + k] - (1 - al) * bgc[i * 3 + k]) / al : a[i * 4 + k];
          a[i * 4 + k] = Math.max(0, Math.min(255, cv));
        }
      }
      a[i * 4 + 3] = Math.round(al * 255);
    }
    if (a[i * 4 + 3] > 200) {
      let px = i % W,
        py = (i / W) | 0;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
  }
  if (P.clean) cleanA(a, W, H, P.clean, o0);
  return { x0: x0, y0: y0, x1: x1, y1: y1 };
}
/* alpha cleanup: fill = rects where an alpha closing restores the painted pixels (a pale rim keyed out as background); r = opening that drops hairlines and specks */
function box(m, W, H, r, mx) {
  let o = new Uint8Array(W * H),
    t = new Uint8Array(W * H),
    x,
    y,
    k,
    v;
  for (y = 0; y < H; y++)
    for (x = 0; x < W; x++) {
      v = mx ? 0 : 1;
      for (k = -r; k <= r; k++) {
        let xx = x + k;
        if (xx < 0 || xx >= W) {
          if (!mx) v = 0;
          continue;
        }
        let q = m[y * W + xx];
        if (mx) {
          if (q) {
            v = 1;
            break;
          }
        } else if (!q) {
          v = 0;
          break;
        }
      }
      t[y * W + x] = v;
    }
  for (y = 0; y < H; y++)
    for (x = 0; x < W; x++) {
      v = mx ? 0 : 1;
      for (k = -r; k <= r; k++) {
        let yy = y + k;
        if (yy < 0 || yy >= H) {
          if (!mx) v = 0;
          continue;
        }
        let q = t[yy * W + x];
        if (mx) {
          if (q) {
            v = 1;
            break;
          }
        } else if (!q) {
          v = 0;
          break;
        }
      }
      o[y * W + x] = v;
    }
  return o;
}
function cleanA(a, W, H, C, o0) {
  let i, m;
  if (C.fill)
    C.fill.forEach(function (f) {
      let x0 = f[0],
        y0 = f[1],
        x1 = f[2],
        y1 = f[3],
        r = f[4],
        w = x1 - x0,
        h = y1 - y0,
        mk = new Uint8Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          mk[y * w + x] = a[((y0 + y) * W + x0 + x) * 4 + 3] > 128 ? 1 : 0;
      let cl = box(box(mk, w, h, r, 1), w, h, r, 0);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let j = y * w + x;
          if (cl[j] && !mk[j]) {
            let p = ((y0 + y) * W + x0 + x) * 4;
            a[p] = o0[p];
            a[p + 1] = o0[p + 1];
            a[p + 2] = o0[p + 2];
            a[p + 3] = 255;
          }
        }
    });
  if (C.r) {
    m = new Uint8Array(W * H);
    for (i = 0; i < W * H; i++) m[i] = a[i * 4 + 3] > 24 ? 1 : 0;
    let op = box(box(m, W, H, C.r, 0), W, H, C.r, 1);
    for (i = 0; i < W * H; i++) if (m[i] && !op[i]) a[i * 4 + 3] = 0;
  }
}
