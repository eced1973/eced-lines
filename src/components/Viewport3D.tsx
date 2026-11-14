import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { SolvedLineProjection } from '../geometry/lineSolver';

interface Viewport3DProps {
  solution: SolvedLineProjection;
  activeHighlight?: string[] | null;
}

interface ProjectedLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  visible: boolean;
  tone: 'line' | 'fv' | 'tv' | 'trace' | 'plane';
}

interface LabelTarget {
  id: string;
  text: string;
  tone: ProjectedLabel['tone'];
  getWorldPos: (out: THREE.Vector3) => void;
}

function createGridPlaneTexture(baseColor: string, majorColor: string, minorColor: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    const step = size / 16;
    ctx.strokeStyle = minorColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.strokeStyle = majorColor;
    ctx.lineWidth = 1.8;
    for (let i = 0; i <= 16; i += 4) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildCylinderBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh | null {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  if (len < 0.001) return null;
  const geom = new THREE.CylinderGeometry(radius, radius, len, 14);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function buildDashedLine(p1: THREE.Vector3, p2: THREE.Vector3, color: number, dashSize = 0.2, gapSize = 0.14): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({ color, dashSize, gapSize, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ solution, activeHighlight = null }) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [unfoldDeg, setUnfoldDeg] = useState(0);
  const [showProjectors, setShowProjectors] = useState(true);
  const [showTraces, setShowTraces] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);
  const [contextLost, setContextLost] = useState(false);

  const unfoldTargetRef = useRef(0);
  const unfoldCurrentRef = useRef(0);
  const camTargetPresetRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const rebuildSceneRef = useRef<() => void>(() => {});

  const latestPropsRef = useRef({ solution, showProjectors, showTraces, activeHighlight });
  latestPropsRef.current = { solution, showProjectors, showTraces, activeHighlight };

  useEffect(() => {
    unfoldTargetRef.current = (unfoldDeg * Math.PI) / 180;
    requestRenderRef.current();
  }, [unfoldDeg]);

  useEffect(() => {
    rebuildSceneRef.current();
    requestRenderRef.current();
  }, [solution, showProjectors, showTraces, activeHighlight]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 480);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.022);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (mount.clientWidth || 640) / (mount.clientHeight || 480),
      0.1,
      200
    );
    camera.position.set(10.5, 7.2, 12.2);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 35;
    controls.target.set(2.2, 1.5, 1.2);
    controls.update();

    controls.addEventListener('start', () => {
      camTargetPresetRef.current = null;
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    // Warm/cool 3-point lighting rig
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0xe2e8f0, 0.95);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    keyLight.position.set(10, 14, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.65);
    rimLight.position.set(-8, 6, -10);
    scene.add(rimLight);

    // Materials & procedural textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const hpTex = createGridPlaneTexture('#eff6ff', '#bfdbfe', '#dbeafe');
    hpTex.anisotropy = maxAniso;
    const vpTex = createGridPlaneTexture('#f8fafc', '#cbd5e1', '#e2e8f0');
    vpTex.anisotropy = maxAniso;

    // Scene groups
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const planesGroup = new THREE.Group();
    const hpRotateGroup = new THREE.Group(); // rotates around X axis for unfolding HP -> VP!
    const dynamicGroup = new THREE.Group();
    const hpContentGroup = new THREE.Group(); // Top view + HT live inside here so they rotate with HP!
    hpRotateGroup.add(hpContentGroup);
    rootGroup.add(planesGroup, hpRotateGroup, dynamicGroup);

    const labelTargets: LabelTarget[] = [];
    const disposableItems: Array<{ dispose: () => void }> = [hpTex, vpTex];

    const disposeDynamic = () => {
      const clearGroup = (grp: THREE.Group) => {
        while (grp.children.length > 0) {
          const child = grp.children[0];
          grp.remove(child);
          child.traverse((obj) => {
            if ((obj as THREE.Mesh).geometry) {
              (obj as THREE.Mesh).geometry.dispose();
            }
            const mat = (obj as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else if (mat) mat.dispose();
          });
        }
      };
      clearGroup(planesGroup);
      clearGroup(hpContentGroup);
      clearGroup(dynamicGroup);
      labelTargets.length = 0;
    };

    const rebuildScene = () => {
      disposeDynamic();
      const { solution: sol, showProjectors: showProj, showTraces: showTr, activeHighlight: hi } = latestPropsRef.current;

      const scale = 0.085; // 10 mm = 0.85 Three.js units
      let extentX = 11;
      let extentY = 7.5;
      let extentZ = 7.5;
      let centerX = 2.5;

      if (sol.valid) {
        const xs = [sol.A3D.x * scale, sol.B3D.x * scale];
        const ys = [sol.A3D.y * scale, sol.B3D.y * scale];
        const zs = [sol.A3D.z * scale, sol.B3D.z * scale];
        if (sol.HT.exists && sol.HT.point3D) {
          xs.push(sol.HT.point3D.x * scale);
          zs.push(sol.HT.point3D.z * scale);
        }
        if (sol.VT.exists && sol.VT.point3D) {
          xs.push(sol.VT.point3D.x * scale);
          ys.push(sol.VT.point3D.y * scale);
        }
        const minX = Math.min(...xs, -1);
        const maxX = Math.max(...xs, 4);
        centerX = (minX + maxX) / 2;
        extentX = Math.max(11, maxX - minX + 4.5);
        extentY = Math.max(6.5, Math.max(...ys.map(Math.abs), 3) * 2 + 2.5);
        extentZ = Math.max(6.5, Math.max(...zs.map(Math.abs), 3) * 2 + 2.5);
      }

      // Vertical Plane (VP) at z = 0
      const vpGeom = new THREE.PlaneGeometry(extentX, extentY);
      const vpMat = new THREE.MeshStandardMaterial({
        map: vpTex,
        transparent: true,
        opacity: 0.42,
        roughness: 0.45,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const vpMesh = new THREE.Mesh(vpGeom, vpMat);
      vpMesh.position.set(centerX, 0, 0);
      vpMesh.renderOrder = 1;
      planesGroup.add(vpMesh);

      const vpEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(vpGeom),
        new THREE.LineBasicMaterial({ color: 0x94a3b8 })
      );
      vpEdges.position.copy(vpMesh.position);
      planesGroup.add(vpEdges);

      // Horizontal Plane (HP) at y = 0 inside hpContentGroup so it rotates cleanly!
      const hpGeom = new THREE.PlaneGeometry(extentX, extentZ);
      const hpMat = new THREE.MeshStandardMaterial({
        map: hpTex,
        transparent: true,
        opacity: 0.48,
        roughness: 0.5,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const hpMesh = new THREE.Mesh(hpGeom, hpMat);
      hpMesh.rotation.x = -Math.PI / 2;
      hpMesh.position.set(centerX, 0, 0);
      hpMesh.renderOrder = 1;
      hpContentGroup.add(hpMesh);

      const hpEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(hpGeom),
        new THREE.LineBasicMaterial({ color: 0x60a5fa })
      );
      hpEdges.rotation.x = -Math.PI / 2;
      hpEdges.position.copy(hpMesh.position);
      hpContentGroup.add(hpEdges);

      // XY Reference Line
      const xyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 });
      const xyStart = new THREE.Vector3(centerX - extentX / 2 - 0.5, 0, 0);
      const xyEnd = new THREE.Vector3(centerX + extentX / 2 + 0.5, 0, 0);
      const xyRod = buildCylinderBetween(xyStart, xyEnd, 0.032, xyMat);
      if (xyRod) planesGroup.add(xyRod);

      labelTargets.push(
        {
          id: 'X',
          text: 'X',
          tone: 'plane',
          getWorldPos: (out) => out.set(xyStart.x - 0.3, 0.15, 0),
        },
        {
          id: 'Y',
          text: 'Y',
          tone: 'plane',
          getWorldPos: (out) => out.set(xyEnd.x + 0.3, 0.15, 0),
        },
        {
          id: 'VP',
          text: 'VP',
          tone: 'plane',
          getWorldPos: (out) => out.set(centerX - extentX / 2 + 0.7, extentY / 2 - 0.5, 0),
        },
        {
          id: 'HP',
          text: 'HP',
          tone: 'plane',
          getWorldPos: (out) => {
            out.set(centerX - extentX / 2 + 0.7, 0, extentZ / 2 - 0.5);
            hpContentGroup.localToWorld(out);
          },
        }
      );

      if (!sol.valid) return;

      const A = new THREE.Vector3(sol.A3D.x * scale, sol.A3D.y * scale, sol.A3D.z * scale);
      const B = new THREE.Vector3(sol.B3D.x * scale, sol.B3D.y * scale, sol.B3D.z * scale);
      const aP = new THREE.Vector3(A.x, A.y, 0);
      const bP = new THREE.Vector3(B.x, B.y, 0);
      const aT = new THREE.Vector3(A.x, 0, A.z);
      const bT = new THREE.Vector3(B.x, 0, B.z);

      const showEndA = !hi || hi.includes('endA');
      const showViews = !hi || hi.includes('finalViews');
      const showTracesLayer = showTr && (!hi || hi.includes('traces'));

      // 3D True Line AB (composite assembly: shaft + machined end spheres)
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.22, metalness: 0.55 });
      const endCapMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.6 });
      const fvMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2 });
      const tvMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.3, metalness: 0.2 });
      const traceMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.35 });

      const sphereGeom = new THREE.SphereGeometry(0.11, 20, 20);
      const smallSphereGeom = new THREE.SphereGeometry(0.085, 16, 16);

      if (showEndA) {
        const meshA = new THREE.Mesh(sphereGeom, endCapMat);
        meshA.position.copy(A);
        dynamicGroup.add(meshA);

        const meshaP = new THREE.Mesh(smallSphereGeom, fvMat);
        meshaP.position.copy(aP);
        dynamicGroup.add(meshaP);

        const meshaT = new THREE.Mesh(smallSphereGeom, tvMat);
        meshaT.position.copy(aT);
        hpContentGroup.add(meshaT);

        labelTargets.push(
          { id: 'A', text: 'A', tone: 'line', getWorldPos: (out) => out.copy(A).add(new THREE.Vector3(0, 0.22, 0)) },
          { id: "a'", text: "a'", tone: 'fv', getWorldPos: (out) => out.copy(aP).add(new THREE.Vector3(-0.18, 0.16, 0)) },
          {
            id: 'a',
            text: 'a',
            tone: 'tv',
            getWorldPos: (out) => {
              out.copy(aT).add(new THREE.Vector3(-0.18, 0.08, 0.18));
              hpContentGroup.localToWorld(out);
            },
          }
        );

        if (showProj) {
          dynamicGroup.add(buildDashedLine(A, aP, 0x94a3b8));
          dynamicGroup.add(buildDashedLine(A, aT, 0x94a3b8));
          dynamicGroup.add(buildDashedLine(aP, new THREE.Vector3(A.x, 0, 0), 0xcbd5e1));
          hpContentGroup.add(buildDashedLine(aT, new THREE.Vector3(A.x, 0, 0), 0xcbd5e1));
        }
      }

      if (showViews) {
        // 3D True Segment AB
        const rodAB = buildCylinderBetween(A, B, 0.052, lineMat);
        if (rodAB) dynamicGroup.add(rodAB);

        const meshB = new THREE.Mesh(sphereGeom, endCapMat);
        meshB.position.copy(B);
        dynamicGroup.add(meshB);

        // Front view a'b' on VP
        const rodFV = buildCylinderBetween(aP, bP, 0.04, fvMat);
        if (rodFV) dynamicGroup.add(rodFV);
        const meshbP = new THREE.Mesh(smallSphereGeom, fvMat);
        meshbP.position.copy(bP);
        dynamicGroup.add(meshbP);

        // Top view ab on HP (rotates with HP)
        const rodTV = buildCylinderBetween(aT, bT, 0.04, tvMat);
        if (rodTV) hpContentGroup.add(rodTV);
        const meshbT = new THREE.Mesh(smallSphereGeom, tvMat);
        meshbT.position.copy(bT);
        hpContentGroup.add(meshbT);

        labelTargets.push(
          { id: 'B', text: 'B', tone: 'line', getWorldPos: (out) => out.copy(B).add(new THREE.Vector3(0, 0.22, 0)) },
          { id: "b'", text: "b'", tone: 'fv', getWorldPos: (out) => out.copy(bP).add(new THREE.Vector3(0.18, 0.16, 0)) },
          {
            id: 'b',
            text: 'b',
            tone: 'tv',
            getWorldPos: (out) => {
              out.copy(bT).add(new THREE.Vector3(0.18, 0.08, 0.18));
              hpContentGroup.localToWorld(out);
            },
          }
        );

        if (showProj) {
          dynamicGroup.add(buildDashedLine(B, bP, 0x94a3b8));
          dynamicGroup.add(buildDashedLine(B, bT, 0x94a3b8));
          dynamicGroup.add(buildDashedLine(bP, new THREE.Vector3(B.x, 0, 0), 0xcbd5e1));
          hpContentGroup.add(buildDashedLine(bT, new THREE.Vector3(B.x, 0, 0), 0xcbd5e1));
        }
      }

      // Traces in 3D: HT on HP, VT on VP
      if (showTracesLayer) {
        const ringGeom = new THREE.TorusGeometry(0.16, 0.03, 12, 24);
        if (sol.HT.exists && sol.HT.point3D) {
          const htPt = new THREE.Vector3(sol.HT.point3D.x * scale, 0, sol.HT.point3D.z * scale);
          const htSphere = new THREE.Mesh(smallSphereGeom, traceMat);
          htSphere.position.copy(htPt);
          hpContentGroup.add(htSphere);

          const htRing = new THREE.Mesh(ringGeom, traceMat);
          htRing.rotation.x = Math.PI / 2;
          htRing.position.copy(htPt);
          hpContentGroup.add(htRing);

          // Extend 3D line to HT
          const nearestToHT = A.distanceToSquared(htPt) < B.distanceToSquared(htPt) ? A : B;
          dynamicGroup.add(buildDashedLine(nearestToHT, htPt, 0xdc2626, 0.16, 0.12));
          hpContentGroup.add(buildDashedLine(aT, htPt, 0x059669, 0.14, 0.12));
          hpContentGroup.add(buildDashedLine(htPt, new THREE.Vector3(htPt.x, 0, 0), 0xdc2626, 0.12, 0.1));

          labelTargets.push({
            id: 'HT',
            text: 'HT',
            tone: 'trace',
            getWorldPos: (out) => {
              out.copy(htPt).add(new THREE.Vector3(0.16, 0.12, 0.2));
              hpContentGroup.localToWorld(out);
            },
          });
        }

        if (sol.VT.exists && sol.VT.point3D) {
          const vtPt = new THREE.Vector3(sol.VT.point3D.x * scale, sol.VT.point3D.y * scale, 0);
          const vtSphere = new THREE.Mesh(smallSphereGeom, traceMat);
          vtSphere.position.copy(vtPt);
          dynamicGroup.add(vtSphere);

          const vtRing = new THREE.Mesh(ringGeom, traceMat);
          vtRing.position.copy(vtPt);
          dynamicGroup.add(vtRing);

          const nearestToVT = A.distanceToSquared(vtPt) < B.distanceToSquared(vtPt) ? A : B;
          dynamicGroup.add(buildDashedLine(nearestToVT, vtPt, 0xdc2626, 0.16, 0.12));
          dynamicGroup.add(buildDashedLine(aP, vtPt, 0x0284c7, 0.14, 0.12));
          dynamicGroup.add(buildDashedLine(vtPt, new THREE.Vector3(vtPt.x, 0, 0), 0xdc2626, 0.12, 0.1));

          labelTargets.push({
            id: 'VT',
            text: 'VT',
            tone: 'trace',
            getWorldPos: (out) => out.copy(vtPt).add(new THREE.Vector3(0.2, 0.18, 0)),
          });
        }
      }
    };

    rebuildSceneRef.current = rebuildScene;
    rebuildScene();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const _vec3 = new THREE.Vector3();
    const updateProjectedLabels = () => {
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 480;
      scene.updateMatrixWorld(true);
      const next: ProjectedLabel[] = [];
      for (const item of labelTargets) {
        item.getWorldPos(_vec3);
        _vec3.project(camera);
        const visible = _vec3.z >= -1 && _vec3.z <= 1;
        next.push({
          id: item.id,
          text: item.text,
          x: ((_vec3.x + 1) / 2) * w,
          y: (-(_vec3.y - 1) / 2) * h,
          visible,
          tone: item.tone,
        });
      }
      setLabels(next);
    };

    // On-demand render loop with software WebGL fence pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastClock = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastClock) / 1000);
        lastClock = now;

        // Smooth exponential damping for HP Unfold angle
        const unfoldDiff = Math.abs(unfoldCurrentRef.current - unfoldTargetRef.current);
        if (unfoldDiff > 0.002) {
          unfoldCurrentRef.current = THREE.MathUtils.damp(
            unfoldCurrentRef.current,
            unfoldTargetRef.current,
            10,
            delta
          );
          hpRotateGroup.rotation.x = unfoldCurrentRef.current;
          renderDirty = true;
        } else {
          unfoldCurrentRef.current = unfoldTargetRef.current;
          hpRotateGroup.rotation.x = unfoldCurrentRef.current;
        }

        // Smooth camera preset transition
        if (camTargetPresetRef.current) {
          const { pos, target } = camTargetPresetRef.current;
          camera.position.lerp(pos, 1 - Math.exp(-8 * delta));
          controls.target.lerp(target, 1 - Math.exp(-8 * delta));
          if (camera.position.distanceTo(pos) < 0.04 && controls.target.distanceTo(target) < 0.04) {
            camera.position.copy(pos);
            controls.target.copy(target);
            camTargetPresetRef.current = null;
          } else {
            renderDirty = true;
          }
        }

        const controlsMoving = controls.update();
        if (controlsMoving && controls.enableDamping) {
          renderDirty = true;
        }

        renderer.render(scene, camera);
        updateProjectedLabels();

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    requestRender();

    // Camera preset helper exposed via window event or ref? Let's attach to canvasMountRef dataset? Better: use a ref on component!
    (mount as unknown as { __setCamPreset?: (p: 'iso' | 'front' | 'top') => void }).__setCamPreset = (preset) => {
      const cx = latestPropsRef.current.solution.valid
        ? (latestPropsRef.current.solution.B3D.x * 0.085) / 2
        : 2;
      if (preset === 'iso') {
        camTargetPresetRef.current = {
          pos: new THREE.Vector3(cx + 8.5, 6.8, 11.2),
          target: new THREE.Vector3(cx, 1.4, 1.0),
        };
      } else if (preset === 'front') {
        camTargetPresetRef.current = {
          pos: new THREE.Vector3(cx, 1.6, 14.5),
          target: new THREE.Vector3(cx, 1.6, 0),
        };
      } else if (preset === 'top') {
        camTargetPresetRef.current = {
          pos: new THREE.Vector3(cx, 15.0, 0.25),
          target: new THREE.Vector3(cx, 0, 1.2),
        };
      }
      requestRender();
    };

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(mount);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeDynamic();
      disposableItems.forEach((d) => d.dispose());
      controls.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) {
        mount.removeChild(canvas);
      }
    };
  }, []);

  const triggerPreset = (preset: 'iso' | 'front' | 'top') => {
    const mount = canvasMountRef.current as unknown as { __setCamPreset?: (p: 'iso' | 'front' | 'top') => void } | null;
    mount?.__setCamPreset?.(preset);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      {/* Minimal Top-Left Viewport Title */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/95 border border-slate-200 rounded-lg text-xs text-slate-700 shadow-xs">
        <span className="font-semibold text-slate-900">3D Spatial Planes (HP &amp; VP)</span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
          HP Unfold {unfoldDeg}°
        </span>
      </div>

      {/* Dedicated Isolated WebGL Mount */}
      <div ref={canvasMountRef} className="relative flex-1 min-h-[340px] w-full">
        {contextLost && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-700">
            WebGL context paused. Restoring 3D viewport...
          </div>
        )}
      </div>

      {/* Projected Semantic DOM Labels */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {labels.map((lbl) => {
          if (!lbl.visible) return null;
          const colorClass =
            lbl.tone === 'fv'
              ? 'text-sky-700 bg-white/90 border-sky-200'
              : lbl.tone === 'tv'
                ? 'text-emerald-700 bg-white/90 border-emerald-200'
                : lbl.tone === 'trace'
                  ? 'text-rose-700 bg-white/90 border-rose-200'
                  : lbl.tone === 'line'
                    ? 'text-amber-800 bg-amber-50/95 border-amber-300'
                    : 'text-slate-500 bg-white/85 border-slate-200';
          return (
            <span
              key={lbl.id}
              style={{
                transform: `translate3d(${lbl.x.toFixed(1)}px, ${lbl.y.toFixed(1)}px, 0) translate(-50%, -50%)`,
              }}
              className={`absolute top-0 left-0 px-1.5 py-0.5 text-[11px] font-mono font-semibold border rounded ${colorClass}`}
            >
              {lbl.text}
            </span>
          );
        })}
      </div>

      {/* Unified Collapsible Bottom Control Dock (solid/semi-opaque, NO backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[94%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-b-0 border-slate-200 rounded-t-md hover:bg-slate-50 transition-colors"
        >
          {dockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{dockCollapsed ? 'Show 3D Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-3 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => triggerPreset('iso')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white rounded-md transition-colors whitespace-nowrap"
              >
                Iso 3D
              </button>
              <button
                type="button"
                onClick={() => triggerPreset('front')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white rounded-md transition-colors whitespace-nowrap"
              >
                Front (VP)
              </button>
              <button
                type="button"
                onClick={() => triggerPreset('top')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white rounded-md transition-colors whitespace-nowrap"
              >
                Top (HP)
              </button>
            </div>

            {/* HP Unfold Slider (0° to 90° -> flattens 3D into 2D!) */}
            <div className="flex items-center gap-2">
              <label htmlFor="hp-unfold-slider" className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                Unfold HP:
              </label>
              <input
                id="hp-unfold-slider"
                type="range"
                min={0}
                max={90}
                step={1}
                value={unfoldDeg}
                onChange={(e) => setUnfoldDeg(Number(e.target.value))}
                className="draft-slider w-24"
              />
              <span className="text-[11px] font-mono tabular-nums text-slate-800 w-7 text-right">
                {unfoldDeg}°
              </span>
              {unfoldDeg > 0 && (
                <button
                  type="button"
                  onClick={() => setUnfoldDeg(0)}
                  aria-label="Reset HP fold"
                  className="p-1 text-slate-500 hover:text-slate-900 rounded"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowProjectors((p) => !p)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap ${
                  showProjectors ? 'bg-sky-50 text-sky-800 border-sky-200' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Projectors
              </button>
              <button
                type="button"
                onClick={() => setShowTraces((t) => !t)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap ${
                  showTraces ? 'bg-rose-50 text-rose-800 border-rose-200' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Traces
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
