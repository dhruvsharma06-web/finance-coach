/** Adapted from ThreeUI Community's Orbital Sphere, by Meng To.
 * https://github.com/MengTo/threeui/blob/main/src/shaders/orbital-sphere/orbitalSphereRenderer.ts
 * Changes: reusable scene group, Kosh palette, reduced particle count and deterministic orbits.
 * MIT License — Copyright (c) 2026 Meng To
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as THREE from "three";

export function createThreeUIOrbitalField() {
  const group = new THREE.Group();
  const positions: number[] = [], colors: number[] = [];
  const bright = new THREE.Color(0xf6cb7a), dim = new THREE.Color(0x2d9e8c);
  const radius = 1.16, count = 6500;
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + 2 * i / count), theta = Math.sqrt(count * Math.PI) * phi;
    const x = radius * Math.cos(theta) * Math.sin(phi), y = radius * Math.sin(theta) * Math.sin(phi), z = radius * Math.cos(phi);
    const noise = Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) + Math.cos(x * 6) * .4;
    if (noise <= -.1) continue;
    const distortion = 1 + noise * .1;
    positions.push(x * distortion, y * distortion, z * distortion);
    const color = dim.clone().lerp(bright, noise > .5 ? 1 : .3);
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: .022, vertexColors: true, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })));
  for (let i = 0; i < 6; i++) {
    const points: number[] = [], r = radius * (1.1 + i * .035);
    for (let j = 0; j <= 90; j++) { const a = j / 90 * Math.PI * 2; points.push(Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 4) * .1); }
    const path = new THREE.BufferGeometry(); path.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const line = new THREE.Line(path, new THREE.LineBasicMaterial({ color: i % 2 ? 0x85dcca : 0xf1bd65, transparent: true, opacity: .35, blending: THREE.AdditiveBlending }));
    line.rotation.set(i * .8, i * .55, 0); group.add(line);
  }
  return group;
}
