import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function CricketBall() {
  const ref = useRef<THREE.Mesh>(null);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === 0) startTime.current = t;
    const elapsed = (t - startTime.current) % 5;

    if (elapsed < 2.5) {
      // Ball spinning and approaching
      const progress = elapsed / 2.5;
      const ease = progress * progress;
      ref.current.position.set(
        Math.sin(progress * Math.PI * 0.3) * 0.3,
        1.2 + Math.sin(progress * Math.PI) * 0.3,
        3 - ease * 5
      );
      ref.current.rotation.x += 0.15;
      ref.current.rotation.y += 0.1;
      ref.current.rotation.z += 0.05;
    } else if (elapsed < 2.7) {
      // Impact moment
      const progress = (elapsed - 2.5) / 0.2;
      ref.current.position.set(0, 1.2, -2 + progress * 0.5);
      ref.current.rotation.x += 0.3;
    } else {
      // Fly away after hit
      const progress = (elapsed - 2.7) / 2.3;
      const ease = 1 - Math.pow(1 - progress, 2);
      ref.current.position.set(
        ease * 4,
        1.2 + ease * 5 - ease * ease * 3,
        -1.5 - ease * 6
      );
      ref.current.rotation.x += 0.2;
      ref.current.rotation.y += 0.15;
    }
  });

  return (
    <group ref={ref} position={[0, 1.2, 3]}>
      <mesh castShadow>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshStandardMaterial color="#CC2200" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Seam */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.14, 0.008, 8, 32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
    </group>
  );
}

function CricketBat() {
  const ref = useRef<THREE.Group>(null);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === 0) startTime.current = t;
    const elapsed = (t - startTime.current) % 5;

    if (elapsed < 2.2) {
      // Ready position
      ref.current.rotation.z = -0.3;
      ref.current.position.set(0.3, 0.8, -2);
    } else if (elapsed < 2.7) {
      // Swing
      const progress = (elapsed - 2.2) / 0.5;
      const swing = Math.sin(progress * Math.PI) * 1.2;
      ref.current.rotation.z = -0.3 + swing;
      ref.current.position.set(0.3 - progress * 0.2, 0.8 + Math.sin(progress * Math.PI) * 0.1, -2);
    } else {
      // Follow through and reset
      const progress = (elapsed - 2.7) / 2.3;
      ref.current.rotation.z = 0.9 - progress * 1.2;
      ref.current.position.set(0.1 + progress * 0.2, 0.8, -2);
    }
  });

  return (
    <group ref={ref} position={[0.3, 0.8, -2]}>
      {/* Blade */}
      <mesh castShadow>
        <boxGeometry args={[0.12, 0.7, 0.04]} />
        <meshStandardMaterial color="#DEB887" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.4, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[0.03, 0.028, 0.15, 8]} />
        <meshStandardMaterial color="#2F4F4F" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ImpactParticles() {
  const ref = useRef<THREE.Points>(null);
  const startTime = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const count = 40;
    const pos = new Float32Array(count * 3);
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 1.2;
      pos[i * 3 + 2] = -2;
      vel.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2,
          (Math.random() - 0.5) * 3
        )
      );
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === 0) startTime.current = t;
    const elapsed = (t - startTime.current) % 5;

    const geo = ref.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;

    if (elapsed > 2.5 && elapsed < 3.5) {
      const progress = (elapsed - 2.5) / 1.0;
      for (let i = 0; i < velocities.length; i++) {
        pos.array[i * 3] = velocities[i].x * progress;
        pos.array[i * 3 + 1] = 1.2 + velocities[i].y * progress - progress * progress * 2;
        pos.array[i * 3 + 2] = -2 + velocities[i].z * progress;
      }
      (ref.current.material as THREE.PointsMaterial).opacity = 1 - progress;
    } else {
      for (let i = 0; i < velocities.length; i++) {
        pos.array[i * 3] = 0;
        pos.array[i * 3 + 1] = -10;
        pos.array[i * 3 + 2] = 0;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#FFD700"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Stumps() {
  return (
    <group position={[0, 0, -2.5]}>
      {[-0.08, 0, 0.08].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
          <meshStandardMaterial color="#DEB887" roughness={0.5} />
        </mesh>
      ))}
      {/* Bails */}
      {[-0.04, 0.04].map((x, i) => (
        <mesh key={i} position={[x, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
          <meshStandardMaterial color="#DEB887" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FloodLights() {
  return (
    <>
      {[
        [-4, 6, -4],
        [4, 6, -4],
        [-4, 6, 4],
        [4, 6, 4],
      ].map((pos, i) => (
        <group key={i}>
          <pointLight position={pos as [number, number, number]} intensity={0.3} color="#FFFACD" distance={15} />
          <mesh position={pos as [number, number, number]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#FFFACD" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="hsl(142, 40%, 28%)" roughness={0.9} />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight position={[0, 8, -2]} intensity={3} angle={0.4} penumbra={0.5} castShadow color="#FFF8DC" />
      <fog attach="fog" args={["#0A1A0A", 5, 20]} />
      <Ground />
      <CricketBall />
      <CricketBat />
      <ImpactParticles />
      <Stumps />
      <FloodLights />
      <Environment preset="night" />
    </>
  );
}

export default function CricketScene() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [2, 2.5, 2], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
