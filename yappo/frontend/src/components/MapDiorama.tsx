import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { MascotId, PathNode } from "../types";

type Spot = { x: number; y: number };

const THEME: Record<string, { house: string; stone: string; water: string; accent: string }> = {
  london: { house: "#8d735c", stone: "#6e6258", water: "#1c4d5e", accent: "#d7c4a2" },
  newyork: { house: "#5e6874", stone: "#4e5560", water: "#16384a", accent: "#c5ccd4" },
  sydney: { house: "#c2b8a2", stone: "#8a8172", water: "#1a6a78", accent: "#f4f1ea" },
  rome: { house: "#c4956a", stone: "#a48462", water: "#3d6e62", accent: "#e6d2b4" },
  paris: { house: "#b7a48c", stone: "#7d7368", water: "#24586a", accent: "#efe6d6" },
  madrid: { house: "#c47a52", stone: "#a56b4a", water: "#2f6a62", accent: "#f0d2a4" },
  berlin: { house: "#8a8f86", stone: "#6a6e68", water: "#2a4a44", accent: "#d7d2c8" },
  beijing: { house: "#8c3d3a", stone: "#7a5a48", water: "#2a5a68", accent: "#e7c36a" },
};

function cobbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = "#6a5e54";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const shade = 90 + ((x * 17 + y * 29) % 50);
      ctx.fillStyle = `rgb(${shade}, ${shade - 12}, ${shade - 24})`;
      ctx.beginPath();
      ctx.ellipse(8 + x * 16, 8 + y * 16, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function route(count: number) {
  return Array.from({ length: Math.max(count, 1) }, (_, index) => {
    const t = count <= 1 ? 0.35 : index / (count - 1);
    return new THREE.Vector3(Math.sin(t * Math.PI) * 1.15, 0, 4.2 - t * 11.2);
  });
}

function SunsetSky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: "varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `
          varying vec3 vPos;
          void main() {
            float h = normalize(vPos).y;
            vec3 top = vec3(0.16, 0.20, 0.42);
            vec3 mid = vec3(0.86, 0.42, 0.24);
            vec3 horizon = vec3(0.98, 0.74, 0.46);
            vec3 color = mix(horizon, mid, smoothstep(0.02, 0.28, h));
            color = mix(color, top, smoothstep(0.28, 0.85, h));
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[48, 20, 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

const HOUSE_SIDES = [-2.35, 3.55];

function BlockRow({ color, tall = false, sides = HOUSE_SIDES }: { color: string; tall?: boolean; sides?: number[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let z = 4.4; z >= -8.2; z -= 1.55) {
      for (const side of sides) {
        const height = (tall ? 1.5 : 0.9) + ((index * 5) % 4) * (tall ? 0.55 : 0.22);
        dummy.position.set(side, height / 2, z);
        dummy.scale.set(1.05, height, 0.85);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
  }, [tall, sides]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 24]} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.84} metalness={0.05} />
    </instancedMesh>
  );
}

function Windows() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let z = 4.2; z >= -8; z -= 1.55) {
      for (const side of [-1.82, 3.08]) {
        dummy.position.set(side, 0.85, z);
        dummy.scale.set(0.16, 0.22, 0.04);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 24]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f6e2b4" emissive="#e7b15a" emissiveIntensity={0.85} roughness={0.3} />
    </instancedMesh>
  );
}

function Landmark({ city }: { city: string }) {
  if (city === "newyork") {
    return (
      <group position={[1.2, 0, -6.6]}>
        <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.7, 3.2, 0.7]} /><meshStandardMaterial color="#9aa3ad" roughness={0.45} metalness={0.35} /></mesh>
        <mesh position={[0.8, 2.4, 0]}><boxGeometry args={[0.45, 4.8, 0.45]} /><meshStandardMaterial color="#c5ccd4" roughness={0.4} metalness={0.4} /></mesh>
        <mesh position={[0.8, 5, 0]}><coneGeometry args={[0.08, 0.8, 4]} /><meshStandardMaterial color="#d9dee4" metalness={0.6} roughness={0.3} /></mesh>
      </group>
    );
  }
  if (city === "sydney") {
    return (
      <group position={[1.15, 0.15, -6.4]}>
        {[0, 0.7, 1.3].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, 0.15]}>
            <sphereGeometry args={[0.55, 16, 10, 0, Math.PI]} />
            <meshStandardMaterial color="#f7f4ee" roughness={0.32} metalness={0.08} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    );
  }
  if (city === "rome") {
    return (
      <group position={[1.15, 0.55, -6.4]}>
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 1.1, 18, 1, true]} />
          <meshStandardMaterial color="#d2b48a" roughness={0.78} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <torusGeometry args={[1.05, 0.08, 8, 20]} />
          <meshStandardMaterial color="#c4a27a" roughness={0.7} />
        </mesh>
      </group>
    );
  }
  if (city === "paris") {
    return (
      <group position={[1.15, 0, -6.5]}>
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.1, 2.4, 1.1]} /><meshStandardMaterial color="#8d8072" /></mesh>
        <mesh position={[0, 2.8, 0]}><boxGeometry args={[0.55, 1.2, 0.55]} /><meshStandardMaterial color="#6e655c" metalness={0.2} /></mesh>
        <mesh position={[0, 3.6, 0]}><coneGeometry args={[0.12, 0.5, 4]} /><meshStandardMaterial color="#d7c4a2" metalness={0.4} /></mesh>
      </group>
    );
  }
  if (city === "berlin") {
    return (
      <group position={[1.15, 0, -6.5]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.08, 0.12, 3.2, 8]} /><meshStandardMaterial color="#d9d4cc" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[0, 3.3, 0]}><sphereGeometry args={[0.38, 18, 14]} /><meshStandardMaterial color="#efeae2" metalness={0.25} roughness={0.3} /></mesh>
      </group>
    );
  }
  if (city === "beijing") {
    return (
      <group position={[1.15, 0, -6.4]}>
        <mesh position={[0, 0.7, 0]}><boxGeometry args={[1.8, 1.2, 0.8]} /><meshStandardMaterial color="#8c3d3a" roughness={0.8} /></mesh>
        <mesh position={[0, 1.5, 0]}><boxGeometry args={[2.2, 0.18, 1.2]} /><meshStandardMaterial color="#e7c36a" roughness={0.55} metalness={0.1} /></mesh>
        <mesh position={[0, 1.85, 0]}><boxGeometry args={[1.5, 0.16, 0.9]} /><meshStandardMaterial color="#c4473a" /></mesh>
      </group>
    );
  }
  if (city === "madrid") {
    return (
      <group position={[1.15, 0.7, -6.4]}>
        <mesh>
          <torusGeometry args={[0.7, 0.12, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#e0b07a" roughness={0.62} />
        </mesh>
        <mesh position={[0, -0.55, 0]}><boxGeometry args={[1.6, 0.9, 0.5]} /><meshStandardMaterial color="#c47a52" roughness={0.8} /></mesh>
      </group>
    );
  }
  return (
    <group position={[1.15, 0, -6.5]}>
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.72, 4.6, 0.72]} />
        <meshStandardMaterial color="#d9c7a6" roughness={0.72} />
      </mesh>
      <mesh position={[0, 3.9, 0.38]}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color="#f6e7c4" emissive="#e7c98a" emissiveIntensity={0.45} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.9, 0]}>
        <coneGeometry args={[0.42, 1.05, 4]} />
        <meshStandardMaterial color="#6a6258" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Walker({ mascot, point, reduced }: { mascot: MascotId; point: THREE.Vector3; reduced: boolean }) {
  const tex = useTexture(`/mascots/${mascot}-point.webp`);
  const ref = useRef<THREE.Group>(null);
  const pos = useRef(point.clone());
  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    pos.current.lerp(point, reduced ? 1 : 0.08);
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 7) * 0.045;
    group.position.set(pos.current.x, bob, pos.current.z);
  });
  return (
    <group ref={ref}>
      <sprite position={[0, 0.62, 0]} scale={[0.72, 0.9, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function CityMesh({
  city,
  mascot,
  nodes,
  onOpen,
  reduced,
}: {
  city: string;
  mascot: MascotId;
  nodes: PathNode[];
  onOpen: (node: PathNode) => void;
  reduced: boolean;
}) {
  const theme = THEME[city] || THEME.london;
  const points = useMemo(() => route(nodes.length), [nodes.length]);
  const ground = useMemo(() => cobbleTexture(), []);
  const current = Math.max(0, nodes.findIndex((node) => node.status === "current"));
  const focus = points[current] || points[0];
  const look = useRef(new THREE.Vector3());
  useFrame((state) => {
    if (!focus) return;
    const next = new THREE.Vector3(focus.x - 0.45, 1.85, focus.z + 2.7);
    state.camera.position.lerp(next, reduced ? 1 : 0.06);
    look.current.set(0.85, 1.15, focus.z - 4.5);
    state.camera.lookAt(look.current);
  });
  return (
    <>
      <color attach="background" args={["#c98358"]} />
      <fog attach="fog" args={["#c98358", 7, 20]} />
      <hemisphereLight args={["#ffd0a4", "#3a2a22", 0.7]} />
      <directionalLight position={[6, 8, 3]} intensity={1.45} color="#ffb06a" />
      <ambientLight intensity={0.18} />
      <pointLight position={[-1.2, 1.4, 1.5]} intensity={0.7} distance={6} color="#ffd7a1" />
      <SunsetSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial map={ground} color={theme.stone} roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.35, 0.03, -2]}>
        <planeGeometry args={[1.7, 16]} />
        <meshStandardMaterial color={theme.water} roughness={0.12} metalness={0.7} />
      </mesh>
      <group position={[1.7, 0.14, -2.2]}>
        <mesh>
          <boxGeometry args={[2.5, 0.12, 0.7]} />
          <meshStandardMaterial color="#8b8178" roughness={0.7} />
        </mesh>
        <mesh position={[-0.9, 0.4, 0]}><boxGeometry args={[0.08, 0.7, 0.7]} /><meshStandardMaterial color="#5c534c" metalness={0.2} /></mesh>
        <mesh position={[0.9, 0.4, 0]}><boxGeometry args={[0.08, 0.7, 0.7]} /><meshStandardMaterial color="#5c534c" metalness={0.2} /></mesh>
      </group>
      <BlockRow color={theme.house} tall={city === "newyork"} />
      <Windows />
      <Landmark city={city} />
      {points.map((point, index) => {
        const node = nodes[index];
        if (!node) return null;
        const live = node.status === "current";
        const done = node.status === "done";
        return (
          <mesh
            key={node.id}
            position={[point.x, 0.16, point.z]}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(node);
            }}
          >
            <cylinderGeometry args={[live ? 0.16 : 0.11, live ? 0.18 : 0.12, 0.28, 16]} />
            <meshStandardMaterial
              color={done ? "#e7c98a" : live ? "#fff4d4" : "#5c5148"}
              emissive={live ? "#c6a15a" : "#000000"}
              emissiveIntensity={live ? 0.7 : 0}
              roughness={0.4}
              metalness={done ? 0.45 : 0.1}
            />
          </mesh>
        );
      })}
      {focus && <Walker mascot={mascot} point={focus} reduced={reduced} />}
    </>
  );
}

class CityError extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MapDiorama({
  city,
  mascot,
  nodes,
  onOpen,
  reduced,
  fallback,
}: {
  city: string;
  mascot: MascotId;
  nodes: PathNode[];
  spots?: Spot[];
  onOpen: (node: PathNode) => void;
  reduced?: boolean;
  fallback?: ReactNode;
}) {
  return (
    <CityError fallback={fallback || null}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.9, 6], fov: 48, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <CityMesh city={city} mascot={mascot} nodes={nodes} onOpen={onOpen} reduced={Boolean(reduced)} />
        </Suspense>
      </Canvas>
    </CityError>
  );
}
