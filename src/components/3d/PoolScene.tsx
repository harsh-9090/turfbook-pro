import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

const BALL_COLORS = [
  "#FFD700", "#0000FF", "#FF0000", "#800080",
  "#FF8C00", "#006400", "#8B0000", "#000000",
  "#FFD700", "#0000FF", "#FF0000", "#800080",
  "#FF8C00", "#006400", "#8B0000",
];

interface BallData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
}

function PoolBall({ position, color, scale = 1 }: { position: THREE.Vector3; color: string; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[0.12 * scale, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.15}
        metalness={0.3}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

function CueBall({ ballsRef, onBreak }: { ballsRef: React.MutableRefObject<BallData[]>; onBreak: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const hasShot = useRef(false);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    if (!hasShot.current) {
      if (startTime.current === 0) startTime.current = t;
      const elapsed = t - startTime.current;

      if (elapsed > 1.5 && elapsed < 1.55) {
        velocityRef.current.set(0, 0, 3.5);
        hasShot.current = true;
        onBreak();
      } else {
        meshRef.current.position.set(0, 0.12, -1.8);
      }
    }

    if (hasShot.current) {
      meshRef.current.position.add(velocityRef.current.clone().multiplyScalar(0.016));
      velocityRef.current.multiplyScalar(0.985);

      // Check collision with racked balls
      ballsRef.current.forEach((ball) => {
        const dist = meshRef.current!.position.distanceTo(ball.position);
        if (dist < 0.26 && dist > 0) {
          const dir = ball.position.clone().sub(meshRef.current!.position).normalize();
          const speed = velocityRef.current.length() * 0.6;
          ball.velocity.copy(dir.multiplyScalar(speed));
          ball.velocity.x += (Math.random() - 0.5) * 0.8;
          ball.velocity.z += (Math.random() - 0.5) * 0.3;
          velocityRef.current.multiplyScalar(0.3);
        }
      });

      // Bounce off table edges
      const pos = meshRef.current.position;
      if (Math.abs(pos.x) > 1.0) {
        velocityRef.current.x *= -0.7;
        pos.x = Math.sign(pos.x) * 1.0;
      }
      if (Math.abs(pos.z) > 2.0) {
        velocityRef.current.z *= -0.7;
        pos.z = Math.sign(pos.z) * 2.0;
      }

      // Reset after animation
      if (t - startTime.current > 8) {
        hasShot.current = false;
        startTime.current = t;
        meshRef.current.position.set(0, 0.12, -1.8);
        velocityRef.current.set(0, 0, 0);
        ballsRef.current.forEach((ball, i) => {
          const row = Math.floor((-1 + Math.sqrt(1 + 8 * i)) / 2);
          const col = i - (row * (row + 1)) / 2;
          ball.position.set(
            (col - row / 2) * 0.26,
            0.12,
            0.8 + row * 0.23
          );
          ball.velocity.set(0, 0, 0);
        });
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.12, -1.8]} castShadow>
      <sphereGeometry args={[0.12, 32, 32]} />
      <meshStandardMaterial color="#FFFDF0" roughness={0.1} metalness={0.2} envMapIntensity={1.5} />
    </mesh>
  );
}

function RackedBalls({ ballsRef }: { ballsRef: React.MutableRefObject<BallData[]> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    ballsRef.current.forEach((ball) => {
      ball.position.add(ball.velocity.clone().multiplyScalar(0.016));
      ball.velocity.multiplyScalar(0.975);

      // Table edge bouncing
      if (Math.abs(ball.position.x) > 1.0) {
        ball.velocity.x *= -0.7;
        ball.position.x = Math.sign(ball.position.x) * 1.0;
      }
      if (Math.abs(ball.position.z) > 2.0) {
        ball.velocity.z *= -0.7;
        ball.position.z = Math.sign(ball.position.z) * 2.0;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {ballsRef.current.map((ball, i) => (
        <PoolBall key={i} position={ball.position} color={ball.color} />
      ))}
    </group>
  );
}

function PoolTable() {
  return (
    <group>
      {/* Table bed */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.04, 4.4]} />
        <meshStandardMaterial color="hsl(142, 50%, 25%)" roughness={0.8} />
      </mesh>
      {/* Cushions */}
      {[
        [0, 0.06, 2.22, 2.4, 0.12, 0.08],
        [0, 0.06, -2.22, 2.4, 0.12, 0.08],
        [1.22, 0.06, 0, 0.08, 0.12, 4.4],
        [-1.22, 0.06, 0, 0.08, 0.12, 4.4],
      ].map((c, i) => (
        <mesh key={i} position={[c[0] as number, c[1] as number, c[2] as number]} castShadow>
          <boxGeometry args={[c[3] as number, c[4] as number, c[5] as number]} />
          <meshStandardMaterial color="hsl(142, 60%, 20%)" roughness={0.6} />
        </mesh>
      ))}
      {/* Rails */}
      {[
        [0, 0.08, 2.35, 2.8, 0.16, 0.2],
        [0, 0.08, -2.35, 2.8, 0.16, 0.2],
        [1.35, 0.08, 0, 0.2, 0.16, 4.9],
        [-1.35, 0.08, 0, 0.2, 0.16, 4.9],
      ].map((r, i) => (
        <mesh key={i} position={[r[0] as number, r[1] as number, r[2] as number]}>
          <boxGeometry args={[r[3] as number, r[4] as number, r[5] as number]} />
          <meshStandardMaterial color="#5C3317" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      {/* Pockets */}
      {[
        [-1.15, 0.05, -2.15],
        [1.15, 0.05, -2.15],
        [-1.15, 0.05, 2.15],
        [1.15, 0.05, 2.15],
        [-1.15, 0.05, 0],
        [1.15, 0.05, 0],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function PoolSceneContent() {
  const [shaking, setShaking] = useState(false);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const ballsRef = useRef<BallData[]>(
    Array.from({ length: 15 }, (_, i) => {
      const row = Math.floor((-1 + Math.sqrt(1 + 8 * i)) / 2);
      const col = i - (row * (row + 1)) / 2;
      return {
        position: new THREE.Vector3((col - row / 2) * 0.26, 0.12, 0.8 + row * 0.23),
        velocity: new THREE.Vector3(0, 0, 0),
        color: BALL_COLORS[i],
      };
    })
  );

  const handleBreak = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  useFrame(({ camera }) => {
    if (shaking) {
      camera.position.x += (Math.random() - 0.5) * 0.03;
      camera.position.y += (Math.random() - 0.5) * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight position={[0, 5, 0]} intensity={2} angle={0.6} penumbra={0.5} castShadow />
      <pointLight position={[-2, 3, -2]} intensity={0.5} color="#FFD700" />
      <pointLight position={[2, 3, 2]} intensity={0.5} color="#87CEEB" />
      <PoolTable />
      <CueBall ballsRef={ballsRef} onBreak={handleBreak} />
      <RackedBalls ballsRef={ballsRef} />
      <Environment preset="studio" />
    </>
  );
}

export default function PoolScene() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [2.5, 3.5, -3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <PoolSceneContent />
      </Canvas>
    </div>
  );
}
