import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function SnookerTable() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[2.8, 0.04, 5.2]} />
        <meshStandardMaterial color="hsl(142, 55%, 22%)" roughness={0.85} />
      </mesh>
      {/* Cushions */}
      {[
        [0, 0.06, 2.62, 2.8, 0.12, 0.08],
        [0, 0.06, -2.62, 2.8, 0.12, 0.08],
        [1.42, 0.06, 0, 0.08, 0.12, 5.2],
        [-1.42, 0.06, 0, 0.08, 0.12, 5.2],
      ].map((c, i) => (
        <mesh key={i} position={[c[0] as number, c[1] as number, c[2] as number]}>
          <boxGeometry args={[c[3] as number, c[4] as number, c[5] as number]} />
          <meshStandardMaterial color="hsl(142, 60%, 18%)" roughness={0.6} />
        </mesh>
      ))}
      {/* Rails */}
      {[
        [0, 0.08, 2.75, 3.2, 0.18, 0.2],
        [0, 0.08, -2.75, 3.2, 0.18, 0.2],
        [1.55, 0.08, 0, 0.2, 0.18, 5.7],
        [-1.55, 0.08, 0, 0.2, 0.18, 5.7],
      ].map((r, i) => (
        <mesh key={i} position={[r[0] as number, r[1] as number, r[2] as number]}>
          <boxGeometry args={[r[3] as number, r[4] as number, r[5] as number]} />
          <meshStandardMaterial color="#4A2810" roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
      {/* Pockets */}
      {[
        [-1.35, 0.05, -2.55], [1.35, 0.05, -2.55],
        [-1.35, 0.05, 2.55], [1.35, 0.05, 2.55],
        [-1.35, 0.05, 0], [1.35, 0.05, 0],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 16]} />
          <meshStandardMaterial color="#0A0A0A" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CueBall() {
  const ref = useRef<THREE.Mesh>(null);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === 0) startTime.current = t;
    const elapsed = (t - startTime.current) % 7;

    if (elapsed < 1.5) {
      // Waiting
      ref.current.position.set(-0.5, 0.1, -1.5);
    } else if (elapsed < 3.0) {
      // Rolling toward red ball
      const progress = (elapsed - 1.5) / 1.5;
      const ease = 1 - Math.pow(1 - progress, 3);
      ref.current.position.set(
        -0.5 + ease * 0.5,
        0.1,
        -1.5 + ease * 2.3
      );
      ref.current.rotation.x += 0.08;
    } else {
      // Slow down
      const progress = Math.min((elapsed - 3.0) / 1.0, 1);
      ref.current.position.set(
        0 + progress * 0.15,
        0.1,
        0.8 + progress * 0.2
      );
      ref.current.rotation.x += 0.02 * (1 - progress);
    }
  });

  return (
    <mesh ref={ref} position={[-0.5, 0.1, -1.5]} castShadow>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial color="#FFFFF0" roughness={0.1} metalness={0.2} envMapIntensity={1.5} />
    </mesh>
  );
}

function RedBall() {
  const ref = useRef<THREE.Mesh>(null);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === 0) startTime.current = t;
    const elapsed = (t - startTime.current) % 7;

    if (elapsed < 3.0) {
      ref.current.position.set(0, 0.1, 0.8);
      ref.current.scale.setScalar(1);
      (ref.current.material as THREE.MeshStandardMaterial).opacity = 1;
    } else if (elapsed < 5.0) {
      const progress = (elapsed - 3.0) / 2.0;
      const ease = progress * progress;
      // Roll toward pocket
      ref.current.position.set(
        ease * 1.35,
        0.1 - ease * 0.05,
        0.8 - ease * 0.8
      );
      ref.current.scale.setScalar(1 - ease * 0.3);
      ref.current.rotation.x += 0.06;
      ref.current.rotation.z -= 0.04;
      if (progress > 0.85) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = 1 - (progress - 0.85) / 0.15;
      }
    } else {
      // Reset
      ref.current.position.set(0, 0.1, 0.8);
      ref.current.scale.setScalar(1);
      (ref.current.material as THREE.MeshStandardMaterial).opacity = 1;
    }
  });

  return (
    <mesh ref={ref} position={[0, 0.1, 0.8]} castShadow>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial color="#CC0000" roughness={0.15} metalness={0.25} transparent envMapIntensity={1.2} />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight position={[0, 6, 0]} intensity={2.5} angle={0.5} penumbra={0.6} castShadow color="#FFF8DC" />
      <pointLight position={[-3, 4, -2]} intensity={0.4} color="#FFD700" />
      <pointLight position={[3, 4, 2]} intensity={0.3} color="#F0E68C" />
      <SnookerTable />
      <CueBall />
      <RedBall />
      <Environment preset="studio" />
    </>
  );
}

export default function SnookerScene() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [3, 4, -3.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
