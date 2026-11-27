"use client";

import { useEffect, useRef } from "react";
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import styles from "./laser-catalog.module.css";

type Triple = [number, number, number];

type View = {
  center: Triple;
  height: number;
  minWidth: number;
  yaw: number;
  pitch: number;
};

const views = {
  overview: { center: [0, 1.01, 0], height: 2.38, minWidth: 1.02, yaw: 0, pitch: 0.035 },
  face: { center: [0, 1.77, 0.035], height: 0.73, minWidth: 0.42, yaw: -0.32, pitch: 0.035 },
  arms: { center: [0.32, 1.33, 0.12], height: 0.98, minWidth: 0.67, yaw: 0.83, pitch: 0.025 },
  body: { center: [0, 1.38, -0.035], height: 0.92, minWidth: 0.61, yaw: -2.64, pitch: 0.045 },
  bikini: { center: [0.12, 1.08, 0.03], height: 1.12, minWidth: 0.64, yaw: 1.15, pitch: 0.035 },
  legs: { center: [0, 0.5, 0], height: 1.3, minWidth: 0.76, yaw: 0.35, pitch: 0.045 }
} satisfies Record<string, View>;

export type LaserZone = Exclude<keyof typeof views, "overview">;

const zones = ["face", "arms", "body", "bikini", "legs"] as const satisfies readonly LaserZone[];
const landmarks = {
  neck: 1.66,
  neckWidth: 0.14,
  shoulder: 1.65,
  upperArm: 1.46,
  upperArmWidth: 0.19,
  armWidth: 0.24,
  hand: 1.02,
  waist: 1.11,
  thigh: 0.935,
  innerHip: 0.04,
  outerHip: 0.21,
  waistCurve: 0.025,
  thighCurve: 0.055,
  pelvisFront: -0.06
};

type Props = {
  focus: LaserZone | null;
  bodySide?: "front" | "back";
  onSelect: (zone: LaserZone) => void;
};

type Selection = { focus: Props["focus"]; bodySide: NonNullable<Props["bodySide"]> };

const abdomenView: View = {
  center: [0, 1.34, 0.02],
  height: 0.92,
  minWidth: 0.61,
  yaw: -0.38,
  pitch: 0.04
};

function viewFor({ focus, bodySide }: Selection) {
  const view = focus === "body" && bodySide === "front" ? abdomenView : views[focus ?? "overview"];
  return {
    ...view,
    center: new Vector3(...view.center),
    lift: focus === null ? 0 : 0.07
  };
}

function zoneAt({ x, y, z }: Vector3): LaserZone {
  const side = Math.abs(x);
  const armEdge = MathUtils.lerp(
    landmarks.armWidth,
    landmarks.upperArmWidth,
    MathUtils.smoothstep(y, landmarks.upperArm, landmarks.shoulder)
  );
  if (y > landmarks.neck && side < landmarks.neckWidth) return "face";
  if (side > armEdge && y > landmarks.hand) return "arms";
  const front = z > landmarks.pelvisFront;
  const hip = front ? MathUtils.smoothstep(side, landmarks.innerHip, landmarks.outerHip) : 0;
  if (y < landmarks.thigh + landmarks.thighCurve * hip) return "legs";
  if (front && y < landmarks.waist + landmarks.waistCurve * hip) return "bikini";
  return "body";
}

export default function LaserZoneScene({ focus, bodySide = "back", onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selection = useRef<Selection>({ focus, bodySide });
  const move = useRef<(next: Selection) => void>(null);
  const hitTest = useRef<((x: number, y: number) => LaserZone | undefined) | null>(null);

  useEffect(() => {
    selection.current = { focus, bodySide };
    move.current?.(selection.current);
  }, [focus, bodySide]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contextOptions = { alpha: true, antialias: true, powerPreference: "low-power" } as const;
    let renderer: WebGLRenderer;
    try {
      const context = canvas.getContext("webgl2", contextOptions);
      if (!(context instanceof WebGL2RenderingContext)) return;
      renderer = new WebGLRenderer({ canvas, context, ...contextOptions });
    } catch {
      return;
    }

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearAlpha(0);

    scene.add(new HemisphereLight("#ede9e0", "#726c63", 1.9));
    const key = new DirectionalLight("#f9f4ec", 1.95);
    key.position.set(-3, 4, 5);
    const rim = new DirectionalLight("#e0d7ca", 1.45);
    rim.position.set(3, 2, -3);
    const fill = new DirectionalLight("#d4dbe2", 0.9);
    fill.position.set(4, 0, 2);
    scene.add(key, rim, fill);

    const current = viewFor(selection.current);
    const weights = Float32Array.from(zones, (zone) => Number(zone === selection.current.focus));
    const uniforms = {
      zoneWeights: { value: weights },
      zoneBrass: { value: new Color("#d2b784") }
    };
    const material = new MeshStandardMaterial({ color: "#a09c94", roughness: 0.82 });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 bodyPosition;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nbodyPosition = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 bodyPosition;
          uniform vec3 zoneBrass;
          uniform float zoneWeights[${zones.length}];

          float softEdge(float value, float edge, float width) {
            return smoothstep(edge - width, edge + width, value);
          }`
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float side = abs(bodyPosition.x);
          float y = bodyPosition.y;
          float z = bodyPosition.z;
          float armEdge = mix(${landmarks.armWidth}, ${landmarks.upperArmWidth},
            smoothstep(${landmarks.upperArm}, ${landmarks.shoulder}, y));
          float arms = softEdge(side, armEdge, 0.018) * softEdge(y, ${landmarks.hand}, 0.025);
          float aboveNeck = softEdge(y, ${landmarks.neck}, 0.022);
          float face = aboveNeck * (1.0 - softEdge(side, ${landmarks.neckWidth}, 0.022))
            * (1.0 - smoothstep(1.79, 1.89, y) * (1.0 - softEdge(z, 0.025, 0.025)))
            * (1.0 - smoothstep(1.92, 1.97, y));
          float front = softEdge(z, ${landmarks.pelvisFront}, 0.042);
          float hip = smoothstep(${landmarks.innerHip}, ${landmarks.outerHip}, side) * front;
          float bikiniTop = ${landmarks.waist} + ${landmarks.waistCurve} * hip;
          float bikiniBottom = ${landmarks.thigh} + ${landmarks.thighCurve} * hip;
          float legs = (1.0 - softEdge(y, bikiniBottom, 0.024)) * softEdge(y, 0.08, 0.045);
          float bikini = softEdge(y, bikiniBottom, 0.022)
            * (1.0 - softEdge(y, bikiniTop, 0.026))
            * softEdge(side, 0.13, 0.045) * front * (1.0 - arms);
          float torso = (1.0 - arms) * (1.0 - aboveNeck) * softEdge(y, bikiniTop, 0.032);
          float highlight = clamp(face * zoneWeights[0] + arms * zoneWeights[1]
            + torso * zoneWeights[2] + bikini * zoneWeights[3] + legs * zoneWeights[4], 0.0, 1.0);

          float neckline = mix(1.56, 1.66, smoothstep(0.06, 0.13, side));
          float sleeve = mix(0.255, 0.205, smoothstep(1.25, 1.63, y));
          float hem = 0.81 + 0.035 * smoothstep(0.05, 0.24, side);
          float suit = softEdge(y, hem, 0.011) * (1.0 - softEdge(y, neckline, 0.011))
            * (1.0 - softEdge(side, sleeve, 0.012));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.39, 0.4, 0.42), suit);
          float brassTone = mix(1.0, 0.72, suit);
          diffuseColor.rgb = mix(diffuseColor.rgb, zoneBrass * brassTone, highlight * 0.8);`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += zoneBrass * highlight * 0.025;`
        );
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let frame = 0;
    let disposed = false;
    let contextAvailable = true;
    let figure: Mesh | undefined;

    function render() {
      if (!figure || !contextAvailable) return;
      const center = current.center;
      const aspect = width / height;
      const vertical = Math.max(current.height, current.minWidth / aspect) / 2;
      const compactOffset = 0.025 * (1 - MathUtils.smoothstep(width, 285, 355));
      const lift = current.lift * Math.min(1, 360 / height) - compactOffset;
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical * (1 - lift);
      camera.bottom = -vertical * (1 + lift);
      camera.position.set(
        center.x + 5 * Math.sin(current.yaw),
        center.y + 5 * Math.sin(current.pitch),
        center.z + 5 * Math.cos(current.yaw)
      );
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      renderer.setSize(width, height, false);
      render();
    }

    function animateTo(next: Selection, immediate = false) {
      cancelAnimationFrame(frame);
      const to = viewFor(next);
      const from = { ...current, center: current.center.clone() };
      const fromWeights = weights.slice();
      const angle = to.yaw - from.yaw;
      const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
      const duration = immediate || reducedMotion.matches ? 0 : 820;
      const start = performance.now();

      function step(now: number) {
        const elapsed = duration ? Math.min((now - start) / duration, 1) : 1;
        const ease = elapsed < 0.5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
        current.center.lerpVectors(from.center, to.center, ease);
        current.height = MathUtils.lerp(from.height, to.height, ease);
        current.minWidth = MathUtils.lerp(from.minWidth, to.minWidth, ease);
        current.yaw = elapsed === 1 ? to.yaw : from.yaw + turn * ease;
        current.pitch = MathUtils.lerp(from.pitch, to.pitch, ease);
        current.lift = MathUtils.lerp(from.lift, to.lift, ease);
        zones.forEach((zone, index) => {
          weights[index] = MathUtils.lerp(fromWeights[index], Number(zone === next.focus), ease);
        });
        render();
        if (elapsed < 1) frame = requestAnimationFrame(step);
      }

      step(start);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const contextLost = () => {
      contextAvailable = false;
      cancelAnimationFrame(frame);
      canvas.dataset.ready = "false";
    };
    const contextRestored = () => {
      contextAvailable = true;
      if (!figure) return;
      animateTo(selection.current, true);
      canvas.dataset.ready = "true";
    };
    const motionChanged = () => {
      if (reducedMotion.matches) animateTo(selection.current, true);
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    reducedMotion.addEventListener("change", motionChanged);

    new GLTFLoader()
      .loadAsync("/clinic/laser-zone-figure.glb")
      .then(({ scene: model }) => {
        const source = model.children[0];
        if (!(source instanceof Mesh)) return;
        const geometry = source.geometry;
        for (const original of [source.material].flat()) original.dispose();
        if (disposed) {
          geometry.dispose();
          return;
        }
        geometry.computeVertexNormals();
        figure = new Mesh(geometry, material);
        scene.add(figure);
        move.current = animateTo;
        hitTest.current = (x, y) => {
          if (!figure || !contextAvailable) return;
          const bounds = canvas.getBoundingClientRect();
          pointer.set(
            (2 * (x - bounds.left)) / bounds.width - 1,
            1 - (2 * (y - bounds.top)) / bounds.height
          );
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObject(figure)[0];
          return hit ? zoneAt(hit.point) : undefined;
        };
        resize();
        animateTo(selection.current, true);
        canvas.dataset.ready = String(contextAvailable);
      })
      .catch(() => {
        canvas.dataset.ready = "false";
      });

    return () => {
      disposed = true;
      move.current = null;
      hitTest.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      reducedMotion.removeEventListener("change", motionChanged);
      figure?.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.scene}
      aria-hidden="true"
      onClick={(event) => {
        const zone = hitTest.current?.(event.clientX, event.clientY);
        if (zone && zone !== focus) onSelect(zone);
      }}
    />
  );
}
