import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FloatingParticles({ count = 80, color = "#22c55e" }: { count?: number; color?: string }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += Math.sin(t + i) * 0.002;
      if (pos.array[i * 3 + 1] > 6) pos.array[i * 3 + 1] = 0;
    }
    pos.needsUpdate = true;
    ref.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
