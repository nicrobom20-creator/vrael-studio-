import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { MascotId, PathNode } from "../types";

type Spot = { x: number; y: number };

function toWorld(spot: Spot): [number, number, number] {
  return [(spot.x / 100 - 0.5) * 3.1, 0.16, (spot.y / 100 - 0.45) * 2.2];
}

function Diorama({
  city,
  mascot,
  nodes,
  spots,
  onOpen,
}: {
  city: string;
  mascot: MascotId;
  nodes: PathNode[];
  spots: Spot[];
  onOpen: (node: PathNode) => void;
}) {
  const backdrop = useTexture(`/art/${city}-540.webp`);
  const face = useTexture(`/mascots/${mascot}-idle.webp`);
  const focus = useRef(new THREE.Vector3(0, 0.2, 0));
  const current = nodes.findIndex((node) => node.status === "current");
  const spot = spots[current >= 0 ? current : 0];

  useFrame((state) => {
    if (!spot) return;
    const [x, , z] = toWorld(spot);
    focus.current.set(x * 0.4, 0.25, z);
    state.camera.position.lerp(new THREE.Vector3(x * 0.25, 2.05, z + 3.35), 0.05);
    state.camera.lookAt(focus.current);
  });

  return (
    <>
      <color attach="background" args={["#1a120d"]} />
      <fog attach="fog" args={["#1a120d", 5.5, 14]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[2.2, 4, 1.4]} intensity={1.15} color="#ffd7a1" />
      <mesh position={[0, 1.25, -1.55]}>
        <planeGeometry args={[6.4, 3.5]} />
        <meshBasicMaterial map={backdrop} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.35]}>
        <circleGeometry args={[3.3, 48]} />
        <meshStandardMaterial color="#2a2118" roughness={0.92} />
      </mesh>
      {spots.map((item, index) => {
        const node = nodes[index];
        if (!node) return null;
        const [x, y, z] = toWorld(item);
        const live = node.status === "current";
        const done = node.status === "done";
        return (
          <mesh
            key={node.id}
            position={[x, y, z]}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(node);
            }}
          >
            <sphereGeometry args={[live ? 0.16 : 0.11, 24, 24]} />
            <meshStandardMaterial
              color={done ? "#e7c98a" : live ? "#fff6df" : "#6a5848"}
              emissive={live ? "#c6a15a" : "#000000"}
              emissiveIntensity={live ? 0.55 : 0}
            />
          </mesh>
        );
      })}
      {spot && (
        <sprite position={[toWorld(spot)[0], 0.62, toWorld(spot)[2]]} scale={[0.72, 0.72, 1]}>
          <spriteMaterial map={face} transparent />
        </sprite>
      )}
    </>
  );
}

export function MapDiorama(props: {
  city: string;
  mascot: MascotId;
  nodes: PathNode[];
  spots: Spot[];
  onOpen: (node: PathNode) => void;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.05, 3.6], fov: 42 }}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power", preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        const ctx = gl.getContext();
        requestAnimationFrame(() => {
          const pixels = new Uint8Array(4);
          ctx.readPixels(8, 8, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
          if (pixels[0] + pixels[1] + pixels[2] > 8) props.onReady?.();
        });
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Diorama {...props} />
      </Suspense>
    </Canvas>
  );
}
