// client/src/components/HumanBody3DModel.jsx

import React, { useRef, useState, Suspense } from 'react'; // Added Suspense
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Select, useCursor } from '@react-three/drei';
import * as THREE from 'three';

// Optional: A simple loading component for when the 3D model is being fetched
const Loader = () => (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#3B82F6',
    fontSize: '1.2rem'
  }}>
    Loading 3D Model...
  </div>
);

const MuscleGroupMesh = ({ name, model, onMuscleClick, ...props }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  useCursor(hovered);

  // !!! IMPORTANT: 'name' here needs to match the actual name of a mesh/object
  // within your loaded GLTF model that represents a specific muscle group.
  // You might need to inspect your 3D model file to find these names.
  const muscleMesh = model.scene ? model.scene.getObjectByName(name) : null;

  // Define materials for different states
  const initialMaterial = new THREE.MeshStandardMaterial({ color: '#E5E7EB', roughness: 0.5, metalness: 0.1 });
  const hoverMaterial = new THREE.MeshStandardMaterial({ color: '#3B82F6', roughness: 0.5, metalness: 0.1 });
  const activeMaterial = new THREE.MeshStandardMaterial({ color: '#1D4ED8', roughness: 0.5, metalness: 0.1 });

  if (!muscleMesh) {
    console.warn(`Muscle mesh "${name}" not found in the loaded 3D model. This mesh will not be interactive.`);
    return null; // Don't render if the mesh isn't found
  }

  return (
    <Select
      box
      multiple={false}
      onChange={(selection) => {
        if (selection.length > 0 && selection[0].object === muscleMesh) {
          setActive(true);
          onMuscleClick(name); // Notify parent component with the muscle name
        } else {
          setActive(false);
        }
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh
        ref={meshRef}
        geometry={muscleMesh.geometry}
        material={active ? activeMaterial : (hovered ? hoverMaterial : initialMaterial)}
        position={muscleMesh.position}
        rotation={muscleMesh.rotation}
        scale={muscleMesh.scale}
        {...props}
      />
    </Select>
  );
};


const HumanBody3DModel = ({ onMuscleClick }) => {
  // !!! IMPORTANT: Replace '/your_3d_model.gltf' with the actual path to your
  // 3D model file in your `client/public` folder.
  // Example: useGLTF('/human_body.gltf'); if human_body.gltf is in client/public
  const gltf = useGLTF('/your_3d_model.gltf');

  // Log the loaded GLTF object to inspect its structure in the console
  // This is crucial for debugging if muscle meshes aren't found
  console.log("Loaded GLTF model:", gltf);

  // !!! IMPORTANT: These names must EXACTLY match the names of the meshes or objects
  // within your loaded 3D model that represent these muscle groups.
  // You will need to inspect your 3D model to get these names.
  const clickableMuscles = ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders', 'Core']; // Example names

  if (!gltf || !gltf.scene) {
    console.error("3D model failed to load or has no scene. Check the model path and file integrity.");
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '500px',
        background: '#FFE0E0',
        color: '#D32F2F',
        borderRadius: '8px',
        border: '1px solid #EF9A9A'
      }}>
        Error: 3D model could not be loaded. Please check the model path and file.
      </div>
    );
  }

  return (
    // Suspense is important for handling the asynchronous loading of 3D models
    <Suspense fallback={<Loader />}>
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        style={{ width: '100%', height: '500px', background: '#F3F4F6', borderRadius: '8px' }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize-width={2048} shadow-mapSize-height={2048} castShadow />
        <pointLight position={[-10, -10, -10]} />

        {/* Render each clickable muscle group */}
        {clickableMuscles.map((muscleName) => (
          <MuscleGroupMesh
            key={muscleName}
            name={muscleName} // This 'name' is used to find the corresponding mesh in your GLTF model
            model={gltf}
            onMuscleClick={onMuscleClick}
          />
        ))}

        {/* If your model has a base body that isn't part of the clickable muscle meshes,
            you might render it here. For example, a single 'Body' mesh that encompasses everything.
            You'd need to ensure not to render duplicate meshes.
            You can often render the entire scene and then selectively make parts interactive.
        */}
        {/*
          If your model is a single mesh and uses materials to define muscle groups,
          you might render it once and adjust materials in the MuscleGroupMesh component
          based on raycasting. This is more advanced.
        */}
        <primitive object={gltf.scene} scale={1} /> {/* Render the whole GLTF scene. Adjust scale as needed */}


        <OrbitControls /> {/* Allows user to rotate, zoom, and pan the model */}
      </Canvas>
    </Suspense>
  );
};

// Preload the GLTF model for faster loading
// !!! IMPORTANT: Match this path with the one in useGLTF above
useGLTF.preload('/your_3d_model.gltf');

export default HumanBody3DModel;