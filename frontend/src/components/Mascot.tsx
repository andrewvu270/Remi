import React, { useState, useRef, Suspense } from 'react';
import { Box, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface MascotProps {
  mood?: 'happy' | 'thinking' | 'excited' | 'sleeping' | 'studying' | 'dance' | 'gym';
  size?: 'small' | 'medium' | 'large' | 'hero';
  message?: string;
  animated?: boolean;
  onClick?: () => void;
}

// Simple Glasses Component (Lenses + Bridge only)
const Glasses: React.FC = () => {
  return (
    <group position={[-0.1, 2.5, 1.0]}>
      {/* Left Lens - 1.5x bigger */}
      <mesh position={[-0.6, 0, 0]}>
        <torusGeometry args={[0.375, 0.03, 16, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Right Lens - 1.5x bigger */}
      <mesh position={[0.6, 0, 0]}>
        <torusGeometry args={[0.375, 0.03, 16, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Bridge - Adjusted for larger lenses */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};

// Open Book Hat Component
const BookHat: React.FC = () => {
  return (
    <group position={[0, 3.1, 0]} rotation={[0.2, 0, 0]}>
      {/* Left Cover */}
      <mesh position={[-0.6, 0, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Right Cover */}
      <mesh position={[0.6, 0, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Left Pages */}
      <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[1.1, 0.15, 1.4]} />
        <meshStandardMaterial color="#FFF" />
      </mesh>
      {/* Right Pages */}
      <mesh position={[0.6, 0.1, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[1.1, 0.15, 1.4]} />
        <meshStandardMaterial color="#FFF" />
      </mesh>
    </group>
  );
};

// 3D Model Loader
const Model: React.FC<{ animated: boolean; isHovered: boolean; mood: string }> = ({ animated, isHovered, mood }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/mascot.glb');

  // Clone the scene so we can have multiple mascots!
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (!animated || !groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Gentle rotation
    groupRef.current.rotation.y = Math.sin(time * 0.8) * 0.2;

    // Tilt based on mood
    if (mood === 'thinking') {
      groupRef.current.rotation.z = Math.sin(time * 1) * 0.1;
    } else if (mood === 'excited') {
      groupRef.current.rotation.y = time * 0.5; // Spin!
    } else if (mood === 'dance') {
      // Dance Animation
      // Vertical Bounce (fast)
      groupRef.current.position.y = -2 + Math.abs(Math.sin(time * 5)) * 0.5;
      // Side-to-side Rocking
      groupRef.current.rotation.z = Math.sin(time * 5) * 0.2;
      // Squash and Stretch (sync with bounce)
      const scale = 1 + Math.sin(time * 10) * 0.05;
      groupRef.current.scale.set(scale, 1 / scale, scale);
    } else if (mood === 'gym') {
      // Gym/Exercise Mode - Rolling and Stretching
      // Rolling side to side
      groupRef.current.position.x = Math.sin(time * 2) * 1.5;
      groupRef.current.rotation.z = -Math.sin(time * 2) * 1;

      // Squash/Stretch (Breathing/Exertion)
      const stretch = 1 + Math.sin(time * 4) * 0.1;
      groupRef.current.scale.set(1 / stretch, stretch, 1 / stretch);
    }

    // Hover bounce (only if NOT dancing/gym)
    if (isHovered && mood !== 'dance' && mood !== 'gym') {
      const bounce = 1 + Math.sin(time * 10) * 0.1;
      groupRef.current.scale.setScalar(bounce);
    } else if (mood !== 'dance' && mood !== 'gym') {
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <primitive object={clonedScene} scale={1.0} />
      <Glasses />
      <BookHat />
    </group>
  );
};

const Mascot: React.FC<MascotProps> = ({
  mood = 'happy',
  size = 'medium',
  message,
  animated = true,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeMap = {
    small: 100,
    medium: 150,
    large: 250,
    hero: 600 // 3x bigger for Hero section
  };

  const mascotSize = sizeMap[size];

  return (
    <Tooltip title={message || "Your study buddy!"} arrow>
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        sx={{
          width: mascotSize,
          height: mascotSize,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          filter: isHovered ? 'drop-shadow(0 0 20px rgba(25, 118, 210, 0.5))' : 'none',
          transition: 'filter 0.3s ease'
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, 5, 5]} intensity={0.5} color="#ffd700" />
          <Suspense fallback={null}>
            <Model animated={animated} isHovered={isHovered} mood={mood} />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </Box>
    </Tooltip>
  );
};

// Mascot with speech bubble
export const MascotWithMessage: React.FC<{
  mood?: MascotProps['mood'];
  message: string;
  size?: MascotProps['size'];
}> = ({ mood = 'happy', message, size = 'medium' }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Mascot mood={mood} size={size} animated />
      <Box
        component={motion.div}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid',
            borderRightColor: 'primary.light'
          }
        }}
      >
        {message}
      </Box>
    </Box>
  );
};

// Animated mascot for loading states
export const MascotLoading: React.FC = () => {
  return (
    <Box sx={{ width: 150, height: 150, display: 'inline-flex' }}>
      <Mascot mood="thinking" size="medium" animated />
    </Box>
  );
};

export default Mascot;
