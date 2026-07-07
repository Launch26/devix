import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import Starfield from './Starfield';
import './StarBackground.css';

export default function InteractiveStarBackground() {
  return (
    <div className="star-background-container">
      <Canvas
        camera={{ position: [0, 0, 18], fov: 55, near: 0.1, far: 1000 }}
        style={{ background: '#0a0a0f' }} // Deep space dark background
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          {/* Subtle ambient lighting */}
          <ambientLight intensity={0.15} color="#8888aa" />
          <pointLight position={[0, 0, 5]} intensity={1.2} color="#fff5e6" distance={50} />

          {/* The stars component */}
          <Starfield />

          {/* Makes the scene interactive (drag to rotate, scroll to zoom) */}
          <OrbitControls
            enablePan={true}
            enableZoom={true} 
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
            autoRotate={false}
            dampingFactor={0.1}
            enableDamping={true}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
