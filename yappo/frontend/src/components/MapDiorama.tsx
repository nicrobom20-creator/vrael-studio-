import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshReflectorMaterial, useGLTF, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { MascotId, PathNode } from "../types";

useGLTF.preload("/city/lamp/street_lamp.gltf");

function pixelRatio() {
  const cores = navigator.hardwareConcurrency || 4;
  const cap = cores <= 4 ? 1.25 : 1.5;
  return [1, Math.min(cap, window.devicePixelRatio || 1)] as [number, number];
}

function bend(t: number, y = 0.08) {
  return new THREE.Vector3(Math.sin(t * Math.PI * 1.15) * 1.45, y, 2.6 - t * 14);
}

function route(count: number) {
  return Array.from({ length: Math.max(count, 1) }, (_, index) => {
    const t = count <= 1 ? 0.12 : 0.06 + (index / (count - 1)) * 0.78;
    return bend(t);
  });
}

function roadGeometry() {
  const steps = 28;
  const width = 1.05;
  const positions: number[] = [];
  const uvs: number[] = [];
  const pts = Array.from({ length: steps }, (_, index) => bend(index / (steps - 1), 0.04));
  for (let index = 0; index < pts.length; index += 1) {
    const prev = pts[Math.max(0, index - 1)];
    const next = pts[Math.min(pts.length - 1, index + 1)];
    const dir = next.clone().sub(prev);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width);
    const left = pts[index].clone().add(side);
    const right = pts[index].clone().sub(side);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    const v = index / 2.2;
    uvs.push(0, v, 1, v);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const indices: number[] = [];
  for (let index = 0; index < steps - 1; index += 1) {
    const a = index * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
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
  wall = "#e7d3c0",
  roofTint = "#6e3d34",
}: {
  position: [number, number, number];
  maps: ReturnType<typeof useMaps>;
  stories: number;
  wall?: string;
  roofTint?: string;
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
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} roughness={0.78} color={wall} />
      </mesh>
      <mesh position={[-0.55, 0.7 + height * 0.35, 0.52]} castShadow>
        <boxGeometry args={[0.42, height * 0.55, 0.28]} />
        <meshStandardMaterial map={maps.brick} normalMap={maps.brickNor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.36 + height, -0.68]} geometry={roof} castShadow>
        <meshStandardMaterial map={maps.roof} roughness={0.68} color={roofTint} />
      </mesh>
      <mesh position={[0.42, 0.36 + height + 0.85, 0.2]}>
        <boxGeometry args={[0.16, 0.46, 0.16]} />
        <meshStandardMaterial map={maps.brick} color="#5c463c" />
      </mesh>
      {Array.from({ length: stories }, (_, floor) => (
        <group key={floor} position={[0.18, 0.78 + floor * 0.78, 0.62]}>
          <mesh position={[0, 0, -0.01]}>
            <boxGeometry args={[0.46, 0.58, 0.06]} />
            <meshStandardMaterial color="#2c2118" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.32, 0.42]} />
            <meshStandardMaterial color="#ffe6b8" emissive="#e39a3c" emissiveIntensity={1.35} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.02, 0.42, 0.02]} />
            <meshStandardMaterial color="#3a2a1c" />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.38, 0.1, 0.78]} castShadow>
        <boxGeometry args={[0.46, 0.12, 0.28]} />
        <meshStandardMaterial color="#d5cbbd" roughness={0.8} />
      </mesh>
      <mesh position={[-0.38, 0.2, 0.7]} castShadow>
        <boxGeometry args={[0.36, 0.08, 0.18]} />
        <meshStandardMaterial color="#cfc4b4" roughness={0.8} />
      </mesh>
      <mesh position={[-0.38, 0.62, 0.64]}>
        <boxGeometry args={[0.32, 0.7, 0.06]} />
        <meshStandardMaterial color="#4a3024" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ClockTower({ maps }: { maps: ReturnType<typeof useMaps> }) {
  const face = useMemo(() => clockFace(), []);
  return (
    <group>
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
    <group position={position} scale={0.72}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.7]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.58, 1.62, 0.58]} />
        <meshStandardMaterial color="#c23a32" roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <boxGeometry args={[0.68, 0.1, 0.68]} />
        <meshStandardMaterial color="#e7c98a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <sphereGeometry args={[0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b4332c" roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.22, 6]} />
        <meshStandardMaterial color="#e7c98a" metalness={0.7} roughness={0.25} />
      </mesh>
      {[-0.12, 0, 0.12].map((x) =>
        [0.7, 1.15].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.3]}>
            <planeGeometry args={[0.1, 0.28]} />
            <meshStandardMaterial color="#f3e2b4" emissive="#e7b15a" emissiveIntensity={0.7} transparent opacity={0.9} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.95, 0.305]}>
        <boxGeometry args={[0.4, 1.05, 0.02]} />
        <meshStandardMaterial color="#7a221c" />
      </mesh>
      <pointLight position={[0, 1.1, 0.15]} color="#ffd2a0" intensity={0.35} distance={1.6} />
    </group>
  );
}

function Bushes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let t = 0.04; t < 0.86 && index < 40; t += 0.07) {
      for (const sign of [-1, 1]) {
        const here = bend(t, 0);
        const ahead = bend(Math.min(0.98, t + 0.03), 0);
        const dir = ahead.clone().sub(here);
        dir.y = 0;
        dir.normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(sign * (1.45 + (index % 3) * 0.12));
        dummy.position.copy(here).add(side);
        dummy.position.y = 0.16;
        dummy.scale.setScalar(0.32 + (index % 4) * 0.07);
        dummy.rotation.set(0, index, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 40]}>
      <sphereGeometry args={[0.26, 7, 5]} />
      <meshStandardMaterial color="#3c6840" roughness={0.92} />
    </instancedMesh>
  );
}

function Skyline() {
  return (
    <group position={[-0.2, 0, -15.2]}>
      {[-2.4, -1.2, 0.1, 1.4, 2.6].map((x, index) => (
        <mesh key={x} position={[x, 0.4 + (index % 3) * 0.3, (index % 2) * 0.35]}>
          <boxGeometry args={[0.72, 0.8 + (index % 3) * 0.5, 0.46]} />
          <meshStandardMaterial color="#6a5344" roughness={1} />
        </mesh>
      ))}
      <mesh position={[-2.7, 1.25, 0.2]}>
        <coneGeometry args={[0.1, 1.05, 4]} />
        <meshStandardMaterial color="#5a4638" />
      </mesh>
    </group>
  );
}

function StreetLamps() {
  const { scene } = useGLTF("/city/lamp/street_lamp.gltf");
  const lamps = useMemo(() => [0, 1, 2, 3].map(() => scene.clone(true)), [scene]);
  const spots: [number, number, number][] = [0.12, 0.32, 0.52, 0.7].map((t) => {
    const here = bend(t, 0);
    const ahead = bend(t + 0.04, 0);
    const dir = ahead.clone().sub(here);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(1.15);
    const at = here.clone().add(side);
    return [at.x, 0, at.z];
  });
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

function MarkerLabel({ text, position }: { text: string; position: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 72;
    const pen = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    if (!pen) return tex;
    pen.fillStyle = "rgba(20,12,8,0.86)";
    pen.beginPath();
    pen.moveTo(32, 8);
    pen.arcTo(316, 8, 316, 64, 24);
    pen.arcTo(316, 64, 4, 64, 24);
    pen.arcTo(4, 64, 4, 8, 24);
    pen.arcTo(4, 8, 316, 8, 24);
    pen.closePath();
    pen.fill();
    pen.fillStyle = "#f6e6bf";
    pen.font = "600 30px Manrope, sans-serif";
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.fillText(text, 160, 38);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [text]);
  useFrame(({ camera }) => {
    ref.current?.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={ref} position={[position.x + 0.15, position.y + 1.05, position.z]}>
      <planeGeometry args={[0.72, 0.16]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} />
    </mesh>
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
    group.position.set(pos.current.x - 0.4, bob, pos.current.z - 0.75);
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

function Landmarks({ city, maps }: { city: string; maps: ReturnType<typeof useMaps> }) {
  const spot = bend(0.22, 0);
  if (city === "newyork") {
    return (
      <group>
        <group position={[spot.x - 3.1, 0, spot.z - 1.4]}>
          <mesh position={[0, 2.4, 0]} castShadow><boxGeometry args={[0.85, 4.8, 0.6]} /><meshStandardMaterial color="#c5ccd4" metalness={0.35} roughness={0.4} /></mesh>
          <mesh position={[0, 5.1, 0]}><boxGeometry args={[0.4, 0.7, 0.35]} /><meshStandardMaterial color="#d5dbe2" metalness={0.4} /></mesh>
          <mesh position={[0, 5.7, 0]}><coneGeometry args={[0.05, 0.85, 4]} /><meshStandardMaterial color="#e7c96a" metalness={0.7} roughness={0.25} /></mesh>
        </group>
        {[-0.4, 0.8, 1.8].map((x, index) => (
          <mesh key={x} position={[spot.x - 2.2 + x * 0.45, 1.6 + index * 0.55, spot.z - 0.6]} castShadow>
            <boxGeometry args={[0.55, 2.2 + index * 0.7, 0.45]} />
            <meshStandardMaterial color={index % 2 ? "#9aa6b2" : "#d8c4a4"} metalness={0.25} roughness={0.45} />
          </mesh>
        ))}
        <Bus position={[bend(0.62).x + 0.7, 0, bend(0.62).z]} color="#f2c21a" />
      </group>
    );
  }
  if (city === "sydney") {
    return (
      <group>
        <group position={[spot.x - 3.2, 0.15, spot.z - 1.1]}>
          {[0, 0.75, 1.4].map((x, index) => (
            <mesh key={x} position={[x, 0.5, 0]} rotation={[0, 0.15, 0.15]}>
              <sphereGeometry args={[0.62 - index * 0.06, 16, 10, 0, Math.PI]} />
              <meshStandardMaterial color="#f6f3ec" roughness={0.32} metalness={0.06} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
        <mesh position={[spot.x - 1.6, 1.6, spot.z - 0.2]} rotation={[0, 0.8, 0]}>
          <torusGeometry args={[1.7, 0.05, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#b7c0c6" metalness={0.75} roughness={0.28} />
        </mesh>
      </group>
    );
  }
  if (city === "rome") {
    return (
      <group position={[spot.x - 2.8, 0.45, spot.z - 0.8]} scale={0.72}>
        <mesh castShadow>
          <cylinderGeometry args={[1.35, 1.35, 1.15, 24, 1, true]} />
          <meshStandardMaterial color="#e2c49a" roughness={0.78} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.2, 0]}><torusGeometry args={[1.35, 0.08, 8, 24]} /><meshStandardMaterial color="#c4a574" /></mesh>
        <mesh position={[0, -0.35, 0]}><torusGeometry args={[1.28, 0.05, 6, 20]} /><meshStandardMaterial color="#b89568" /></mesh>
        <mesh position={[2.2, -0.2, 1.4]}>
          <cylinderGeometry args={[0.55, 0.6, 0.18, 16]} />
          <meshStandardMaterial color="#d9d3c8" roughness={0.4} metalness={0.1} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <group position={[spot.x - 3.4, 0, spot.z - 2.4]} scale={1.15}>
        <ClockTower maps={maps} />
      </group>
      <mesh position={[spot.x - 4.2, 2.2, spot.z + 0.4]} rotation={[0, 0.6, 0]}>
        <torusGeometry args={[1.15, 0.035, 8, 28]} />
        <meshStandardMaterial color="#e7eef3" metalness={0.65} roughness={0.28} />
      </mesh>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2;
        return (
          <mesh key={index} position={[spot.x - 4.2 + Math.cos(angle) * 0.55, 2.2 + Math.sin(angle) * 0.55, spot.z + 0.4]} rotation={[0, 0.6, angle]}>
            <boxGeometry args={[1.05, 0.015, 0.015]} />
            <meshStandardMaterial color="#d5dee6" metalness={0.5} roughness={0.35} />
          </mesh>
        );
      })}
      <group position={[-0.2, 0.14, -6.2]} rotation={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.8, 0.18, 0.85]} />
          <meshStandardMaterial map={maps.brick} color="#d7cbb8" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.28, 0.4]}>
          <boxGeometry args={[3.8, 0.1, 0.06]} />
          <meshStandardMaterial color="#1f6b4a" metalness={0.25} roughness={0.45} />
        </mesh>
        {[-1.2, 0, 1.2].map((x) => (
          <mesh key={x} position={[x, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
            <torusGeometry args={[0.42, 0.07, 8, 14, Math.PI]} />
            <meshStandardMaterial color="#cbb89a" roughness={0.75} />
          </mesh>
        ))}
      </group>
        <Bus position={[bend(0.62).x + 0.7, 0, bend(0.62).z]} color="#c43732" />
        <Cab position={[bend(0.7).x - 0.5, 0, bend(0.7).z]} />
        <PhoneBox position={[spot.x - 4.2, 0, spot.z + 0.4]} />
    </group>
  );
}

function Bus({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position} scale={0.72}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.72, 0.62, 1.7]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      <mesh position={[0, 1.02, -0.02]} castShadow><boxGeometry args={[0.68, 0.42, 1.55]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      <mesh position={[0.37, 0.62, 0]}><boxGeometry args={[0.02, 0.26, 1.15]} /><meshStandardMaterial color="#d7e8ef" emissive="#9ec4d4" emissiveIntensity={0.15} /></mesh>
      <mesh position={[0.37, 1.02, 0]}><boxGeometry args={[0.02, 0.2, 1.1]} /><meshStandardMaterial color="#d7e8ef" /></mesh>
      {[0.55, -0.55].map((z) => (
        <mesh key={z} position={[0, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.78, 10]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Cab({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.7}>
      <mesh position={[0, 0.38, 0]} castShadow><boxGeometry args={[0.62, 0.38, 1.15]} /><meshStandardMaterial color="#1c1c1c" metalness={0.4} roughness={0.35} /></mesh>
      <mesh position={[0, 0.68, -0.05]}><boxGeometry args={[0.56, 0.28, 0.62]} /><meshStandardMaterial color="#141414" /></mesh>
      <mesh position={[0, 0.86, 0.35]}><boxGeometry args={[0.12, 0.06, 0.08]} /><meshStandardMaterial color="#f2c21a" emissive="#e7b423" emissiveIntensity={0.8} /></mesh>
      <mesh position={[0, 0.18, 0.4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.68, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 0.18, -0.4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.68, 8]} /><meshStandardMaterial color="#222" /></mesh>
    </group>
  );
}

function Street({
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
  const maps = useMaps();
  const points = useMemo(() => route(nodes.length), [nodes.length]);
  const road = useMemo(() => roadGeometry(), []);
  const current = Math.max(0, nodes.findIndex((node) => node.status === "current"));
  const focus = points[current] || points[0];
  const look = useRef(new THREE.Vector3());
  const drag = useRef(new THREE.Vector2());
  const homes = [0.08, 0.2, 0.33, 0.46, 0.58, 0.7].map((t, index) => {
    const p = bend(t, 0);
    const ahead = bend(Math.min(0.95, t + 0.04), 0);
    const dir = ahead.clone().sub(p);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const at = p.clone().add(side.multiplyScalar(1.7));
    return { at: [at.x, 0, at.z] as [number, number, number], stories: index % 2 ? 4 : 3 };
  });
  useFrame((state) => {
    if (!focus) return;
    const ahead = points[Math.min(points.length - 1, current + 1)] || focus;
    const dir = ahead.clone().sub(focus);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.y = 0;
    dir.normalize();
    const next = focus.clone().addScaledVector(dir, -4.4);
    next.y = 2.85 + drag.current.y;
    next.x += drag.current.x;
    state.camera.position.lerp(next, reduced ? 1 : 0.05);
    look.current.copy(focus).addScaledVector(dir, 7.2);
    look.current.y = 1.05;
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
        environmentIntensity={0.62}
        backgroundIntensity={0.48}
        environmentRotation={[0, Math.PI * 0.72, 0]}
        backgroundRotation={[0, Math.PI * 0.72, 0]}
      />
      <fog attach="fog" args={["#b56a3a", 11, 28]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0, -4]} receiveShadow>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial map={maps.cobble} normalMap={maps.cobbleNor} roughnessMap={maps.cobbleRough} color="#b7aa9c" roughness={1} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial map={maps.cobble} normalMap={maps.cobbleNor} roughnessMap={maps.cobbleRough} color="#f0e2d0" roughness={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.5, 0.01, -4]}>
        <planeGeometry args={[3.6, 16]} />
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
      {city !== "london" && city !== "newyork" && (
        <group position={[-0.2, 0.14, -4.8]} rotation={[0, 0.35, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.16, 0.75]} />
            <meshStandardMaterial map={maps.brick} color={city === "rome" ? "#e2c49a" : "#d5dbe0"} roughness={0.7} />
          </mesh>
        </group>
      )}
      {homes.map((home) => (
        <Townhouse
          key={home.at.join(",")}
          position={home.at}
          maps={maps}
          stories={home.stories}
          wall={city === "rome" ? "#e6c48a" : city === "newyork" ? "#8d6a52" : city === "sydney" ? "#f4f0e6" : "#e7d3c0"}
          roofTint={city === "rome" ? "#c45a32" : city === "newyork" ? "#3e3834" : city === "sydney" ? "#d9cfc2" : "#6e3d34"}
        />
      ))}
      <Landmarks city={city} maps={maps} />
      <Skyline />
      <Bushes />
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
            {live && <MarkerLabel text={node.title} position={point} />}
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
  city,
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
        camera={{ position: [0.2, 2.6, 6], fov: 42, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.68;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            onLost();
          });
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <Street city={city} mascot={mascot} nodes={nodes} onOpen={onOpen} reduced={Boolean(reduced)} />
        </Suspense>
      </Canvas>
    </CityBoundary>
  );
}
