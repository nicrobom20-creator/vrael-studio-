import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, MeshReflectorMaterial, useGLTF, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { MascotId, PathNode } from "../types";

useGLTF.preload("/city/lamp/street_lamp.gltf");

function pixelRatio() {
  const cores = navigator.hardwareConcurrency || 4;
  const cap = cores <= 4 ? 1.25 : 1.5;
  return [1, Math.min(cap, window.devicePixelRatio || 1)] as [number, number];
}

function route(count: number) {
  return Array.from({ length: Math.max(count, 1) }, (_, index) => {
    const t = count <= 1 ? 0.22 : index / (count - 1);
    return new THREE.Vector3(Math.sin(t * Math.PI) * 0.42, 0.07, 1.5 - t * 10.5);
  });
}

function useMaps() {
  const maps = useTexture({
    cobble: "/city/cobble_diff.jpg",
    cobbleNor: "/city/cobble_nor.jpg",
    cobbleRough: "/city/cobble_rough.jpg",
    brick: "/city/brick_diff.jpg",
    brickNor: "/city/brick_nor.jpg",
    roof: "/city/roof_diff.jpg",
  });
  for (const tex of Object.values(maps)) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
  }
  maps.cobble.colorSpace = THREE.SRGBColorSpace;
  maps.brick.colorSpace = THREE.SRGBColorSpace;
  maps.roof.colorSpace = THREE.SRGBColorSpace;
  maps.cobble.repeat.set(3, 10);
  maps.cobbleNor.repeat.set(3, 10);
  maps.cobbleRough.repeat.set(3, 10);
  maps.brick.repeat.set(1.2, 1.8);
  maps.brickNor.repeat.set(1.2, 1.8);
  maps.roof.repeat.set(2, 1.2);
  return maps;
}

function clockFace() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const pen = canvas.getContext("2d");
  if (!pen) return new THREE.CanvasTexture(canvas);
  pen.fillStyle = "#f6edd4";
  pen.beginPath();
  pen.arc(128, 128, 120, 0, Math.PI * 2);
  pen.fill();
  pen.strokeStyle = "#1c140e";
  pen.lineWidth = 10;
  pen.stroke();
  pen.fillStyle = "#1c140e";
  pen.beginPath();
  pen.arc(128, 128, 96, 0, Math.PI * 2);
  pen.stroke();
  pen.font = "600 22px Georgia, serif";
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  for (let hour = 1; hour <= 12; hour += 1) {
    const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
    pen.fillText(String(hour), 128 + Math.cos(angle) * 74, 128 + Math.sin(angle) * 74);
  }
  pen.lineCap = "round";
  pen.lineWidth = 6;
  pen.beginPath();
  pen.moveTo(128, 128);
  pen.lineTo(128, 62);
  pen.stroke();
  pen.lineWidth = 4;
  pen.beginPath();
  pen.moveTo(128, 128);
  pen.lineTo(168, 146);
  pen.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function gableGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.85, 0);
  shape.lineTo(0.85, 0);
  shape.lineTo(0, 0.72);
  return new THREE.ExtrudeGeometry(shape, { depth: 1.35, bevelEnabled: false });
}

function Townhouse({
  position,
  maps,
  stories,
}: {
  position: [number, number, number];
  maps: ReturnType<typeof useMaps>;
  stories: number;
}) {
  const roof = useMemo(() => gableGeometry(), []);
  const height = stories * 0.78;
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.36, 1.25]} />
        <meshStandardMaterial color="#d9d0c2" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.36 + height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, height, 1.18]} />
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} roughness={0.78} color="#e7d3c0" />
      </mesh>
      <mesh position={[-0.55, 0.7 + height * 0.35, 0.52]} castShadow>
        <boxGeometry args={[0.42, height * 0.55, 0.28]} />
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.36 + height, -0.68]} geometry={roof} castShadow>
        <meshStandardMaterial map={maps.roof} roughness={0.68} color="#6e3d34" />
      </mesh>
      <mesh position={[0.42, 0.36 + height + 0.85, 0.2]}>
        <boxGeometry args={[0.16, 0.46, 0.16]} />
        <meshStandardMaterial map={maps.brick} color="#5c463c" />
      </mesh>
      {Array.from({ length: stories }, (_, floor) => (
        <group key={floor} position={[0.15, 0.72 + floor * 0.78, 0.62]}>
          <mesh>
            <planeGeometry args={[0.36, 0.5]} />
            <meshStandardMaterial color="#f8e2b8" emissive="#e8a85a" emissiveIntensity={1.15} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.4, 0.54]} />
            <meshStandardMaterial color="#2a2118" />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.35, 0.58, 0.62]}>
        <planeGeometry args={[0.28, 0.62]} />
        <meshStandardMaterial color="#3a2418" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ClockTower({ maps }: { maps: ReturnType<typeof useMaps> }) {
  const face = useMemo(() => clockFace(), []);
  return (
    <group position={[-2.2, 0, -11.2]} scale={0.82}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.7, 1.7]} />
        <meshStandardMaterial color="#d8cbb6" roughness={0.75} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 4.8, 1.15]} />
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} roughness={0.72} color="#efe0cf" />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 3.1, 0.59]}>
          <boxGeometry args={[0.06, 4.4, 0.04]} />
          <meshStandardMaterial color="#c8b8a2" />
        </mesh>
      ))}
      <mesh position={[0, 5.85, 0]} castShadow>
        <boxGeometry args={[1.45, 1.15, 1.45]} />
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} color="#f3e6d4" />
      </mesh>
      {[
        [0, 5.9, 0.74],
        [0, 5.9, -0.74],
        [0.74, 5.9, 0],
        [-0.74, 5.9, 0],
      ].map((spot) => (
        <mesh key={spot.join(",")} position={spot as [number, number, number]} rotation={spot[0] !== 0 ? [0, Math.PI / 2, 0] : undefined}>
          <circleGeometry args={[0.34, 32]} />
          <meshStandardMaterial map={face} emissive="#f6e7c0" emissiveIntensity={0.45} roughness={0.28} metalness={0.12} />
        </mesh>
      ))}
      <mesh position={[0, 6.7, 0]}>
        <boxGeometry args={[1.2, 0.18, 1.2]} />
        <meshStandardMaterial color="#e7c98a" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 7.7, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.42, 1.7, 8]} />
        <meshStandardMaterial color="#6d645c" metalness={0.25} roughness={0.45} />
      </mesh>
      <mesh position={[0, 8.7, 0]}>
        <coneGeometry args={[0.16, 0.7, 6]} />
        <meshStandardMaterial color="#e7c98a" metalness={0.6} roughness={0.3} />
      </mesh>
      {[
        [0.55, 6.35, 0.55],
        [-0.55, 6.35, 0.55],
        [0.55, 6.35, -0.55],
        [-0.55, 6.35, -0.55],
      ].map((spot) => (
        <mesh key={spot.join(",")} position={spot as [number, number, number]}>
          <coneGeometry args={[0.08, 0.55, 5]} />
          <meshStandardMaterial color="#d7c4a4" />
        </mesh>
      ))}
    </group>
  );
}

function PhoneBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.55, 1.55, 0.55]} />
        <meshStandardMaterial color="#c43732" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[0.62, 0.16, 0.62]} />
        <meshStandardMaterial color="#9e2b28" />
      </mesh>
      <mesh position={[0, 0.95, 0.29]}>
        <planeGeometry args={[0.38, 0.85]} />
        <meshStandardMaterial color="#d7e7ef" emissive="#8fb4c4" emissiveIntensity={0.25} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function StreetLamps() {
  const { scene } = useGLTF("/city/lamp/street_lamp.gltf");
  const lamps = useMemo(() => [0, 1, 2, 3].map(() => scene.clone(true)), [scene]);
  const spots: [number, number, number][] = [
    [1.35, 0, 1.1],
    [1.7, 0, -2.2],
    [1.45, 0, -5.2],
    [-1.15, 0, -1.6],
  ];
  const lights = useRef<Array<THREE.PointLight | null>>([]);
  useFrame(({ clock }) => {
    const flicker = 1.1 + Math.sin(clock.elapsedTime * 8) * 0.08;
    lights.current.forEach((light) => {
      if (light) light.intensity = flicker;
    });
  });
  return (
    <group>
      {lamps.map((lamp, index) => (
        <group key={index} position={spots[index]} scale={0.38} rotation={[0, index % 2 ? 0.4 : -0.6, 0]}>
          <primitive object={lamp} />
        </group>
      ))}
      {spots.map((spot, index) => (
        <pointLight
          key={spot.join(":")}
          ref={(node) => {
            lights.current[index] = node;
          }}
          position={[spot[0], 1.7, spot[2]]}
          color="#ffc27a"
          intensity={1.15}
          distance={5}
          decay={2}
        />
      ))}
    </group>
  );
}

function Motes() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(120 * 3);
    for (let index = 0; index < 120; index += 1) {
      values[index * 3] = (Math.random() - 0.5) * 7;
      values[index * 3 + 1] = 0.4 + Math.random() * 3.4;
      values[index * 3 + 2] = 2 - Math.random() * 12;
    }
    return values;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffe7bf" size={0.03} transparent opacity={0.75} depthWrite={false} />
    </points>
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
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 6.5) * 0.035;
    group.position.set(pos.current.x, bob, pos.current.z);
    group.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group ref={ref}>
      <sprite position={[0, 0.48, 0]} scale={[0.7, 0.88, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function London({
  mascot,
  nodes,
  onOpen,
  reduced,
}: {
  mascot: MascotId;
  nodes: PathNode[];
  onOpen: (node: PathNode) => void;
  reduced: boolean;
}) {
  const maps = useMaps();
  const points = useMemo(() => route(nodes.length), [nodes.length]);
  const current = Math.max(0, nodes.findIndex((node) => node.status === "current"));
  const focus = points[current] || points[0];
  const look = useRef(new THREE.Vector3());
  const drag = useRef(new THREE.Vector2());
  const homes: Array<{ at: [number, number, number]; stories: number }> = [
    { at: [1.85, 0, 1.3], stories: 3 },
    { at: [2.05, 0, -0.5], stories: 4 },
    { at: [1.95, 0, -2.3], stories: 3 },
    { at: [2.15, 0, -4.1], stories: 4 },
    { at: [2.0, 0, -5.9], stories: 3 },
    { at: [2.2, 0, -7.6], stories: 3 },
  ];
  useFrame((state) => {
    if (!focus) return;
    const next = new THREE.Vector3(focus.x + 0.55 + drag.current.x, 1.85 + drag.current.y, focus.z + 3.6);
    state.camera.position.lerp(next, reduced ? 1 : 0.05);
    look.current.set(focus.x - 0.15, 1.35, focus.z - 5.2);
    state.camera.lookAt(look.current);
  });
  return (
    <group
      onPointerMove={(event) => {
        drag.current.set(event.pointer.x * 0.35, event.pointer.y * 0.08);
      }}
    >
      <hemisphereLight args={["#ffd7ae", "#3a2a22", 0.35]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[-6, 8, 2]}
        intensity={1.35}
        color="#ffc48a"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
        shadow-camera-near={0.5}
        shadow-camera-far={28}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Environment
        files="/city/venice_sunset_1k.hdr"
        background
        environmentIntensity={0.85}
        backgroundIntensity={0.72}
        environmentRotation={[0, Math.PI * 0.72, 0]}
        backgroundRotation={[0, Math.PI * 0.72, 0]}
      />
      <fog attach="fog" args={["#c9845a", 14, 36]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0, -4]} receiveShadow>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial map={maps.cobble} normalMap={maps.cobbleNor} roughnessMap={maps.cobbleRough} color="#b7aa9c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.025, -3.2]} receiveShadow>
        <planeGeometry args={[1.7, 13]} />
        <meshStandardMaterial map={maps.cobble} normalMap={maps.cobbleNor} roughnessMap={maps.cobbleRough} color="#efe4d4" roughness={0.84} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.4, 0.01, -4]}>
        <planeGeometry args={[4.2, 16]} />
        <MeshReflectorMaterial
          mirror={0.72}
          color="#0e2c38"
          metalness={0.8}
          roughness={0.2}
          resolution={256}
          mixBlur={1}
          mixStrength={1.4}
          blur={[180, 60]}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.2}
        />
      </mesh>
      <group position={[-1.6, 0.12, -4.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.16, 0.7]} />
          <meshStandardMaterial map={maps.brick} color="#d9cbb8" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.28, 0.28]}>
          <boxGeometry args={[3.4, 0.12, 0.06]} />
          <meshStandardMaterial color="#4a4038" metalness={0.4} roughness={0.4} />
        </mesh>
        {[-1.1, 0, 1.1].map((x) => (
          <mesh key={x} position={[x, -0.15, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.38, 0.07, 8, 12, Math.PI]} />
            <meshStandardMaterial map={maps.brick} color="#d9cbb8" roughness={0.7} />
          </mesh>
        ))}
      </group>
      {homes.map((home) => (
        <Townhouse key={home.at.join(",")} position={home.at} maps={maps} stories={home.stories} />
      ))}
      <ClockTower maps={maps} />
      <PhoneBox position={[-0.85, 0, 0.15]} />
      <PhoneBox position={[-1.35, 0, -0.25]} />
      <StreetLamps />
      <Motes />
      {points.map((point, index) => {
        const node = nodes[index];
        const next = points[index + 1];
        if (!node) return null;
        const live = node.status === "current";
        const done = node.status === "done";
        const mid = next ? point.clone().lerp(next, 0.5) : null;
        const span = next ? point.distanceTo(next) : 0;
        const yaw = next ? Math.atan2(next.x - point.x, next.z - point.z) : 0;
        return (
          <group key={node.id}>
            {mid && (
              <mesh position={[mid.x, 0.045, mid.z]} rotation={[0, yaw, 0]}>
                <boxGeometry args={[0.035, 0.015, Math.max(0.05, span)]} />
                <meshStandardMaterial color="#f6e6bf" emissive="#e7c98a" emissiveIntensity={0.9} />
              </mesh>
            )}
            <mesh
              position={[point.x, 0.06, point.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(node);
              }}
            >
              <circleGeometry args={[live ? 0.34 : 0.2, 28]} />
              <meshStandardMaterial
                color={live ? "#1a140f" : "#f3e0b0"}
                emissive={done || !live ? "#e7c98a" : "#000000"}
                emissiveIntensity={live ? 0 : 0.55}
                roughness={0.35}
                metalness={0.45}
              />
            </mesh>
            {live && (
              <Html position={[point.x + 0.55, 0.95, point.z]} center distanceFactor={11} zIndexRange={[20, 0]}>
                <div className="max-w-[108px] rounded-2xl bg-black/70 px-2 py-1 text-center text-[10px] leading-tight text-[#f6e6bf]">
                  {node.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
      {focus && <Walker mascot={mascot} point={focus} reduced={reduced} />}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.28} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
      </EffectComposer>
    </group>
  );
}

class CityBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MapDiorama({
  mascot,
  nodes,
  onOpen,
  reduced,
  onLost,
}: {
  city: string;
  mascot: MascotId;
  nodes: PathNode[];
  onOpen: (node: PathNode) => void;
  reduced?: boolean;
  onLost: () => void;
}) {
  return (
    <CityBoundary fallback={<p className="grid h-full place-items-center px-6 text-center text-sm text-cream/70">3D-карта не открылась на этом экране.</p>}>
      <Canvas
        dpr={pixelRatio()}
        shadows
        camera={{ position: [0.6, 1.9, 5.2], fov: 48, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.92;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            onLost();
          });
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <London mascot={mascot} nodes={nodes} onOpen={onOpen} reduced={Boolean(reduced)} />
        </Suspense>
      </Canvas>
    </CityBoundary>
  );
}
