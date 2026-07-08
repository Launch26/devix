import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export default function Starfield() {
  const starsRef = useRef();

  // Slowly rotates the entire starfield for a dynamic, living background
  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.x += delta * 0.035;
      starsRef.current.rotation.y += delta * 0.028;
    }
  });

  return (
    <group ref={starsRef}>
      <Stars
        radius={45}       // Radius of the inner sphere
        depth={51}        // Depth of area where stars should fit
        count={3000}      // Amount of stars
        factor={3}        // Size factor
        saturation={0.2}  // Color saturation
        fade={true}       // Faded dots
        speed={0.5}       // Animation speed
      />
    </group>
  );
}
