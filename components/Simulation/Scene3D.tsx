
import React, { useMemo, useRef, useState, useEffect, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Text, Edges, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { SystemComponent, NodeType, PrimitiveShape, GeometricPrimitive, CursorState } from '../../types';

// Register custom shader material if needed, but we'll use a local const for safety in HMR
const HologramShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#00f0ff') },
    scanPos: { value: -100.0 }, // Y position of the scan plane
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float scanPos;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
      
      // Holographic interference lines
      float scanline = sin(vPosition.y * 50.0 + time * 2.0) * 0.1 + 0.9;
      
      // Deep Scan Effect
      float scanDist = abs(vPosition.y - scanPos);
      float scanBeam = smoothstep(0.5, 0.0, scanDist) * 2.0;
      
      vec3 finalColor = color * scanline;
      finalColor += color * fresnel; // Rim light
      finalColor += vec3(1.0, 1.0, 1.0) * scanBeam; // White scan beam
      
      float alpha = 0.15 + fresnel * 0.5 + scanBeam;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

// Colors mapped to node types
const TypeColors: Record<NodeType, string> = {
  [NodeType.COMPUTE]: '#00f0ff', // Cyan
  [NodeType.STORAGE]: '#ffd700', // Gold
  [NodeType.NETWORK]: '#bd00ff', // Purple
  [NodeType.SENSOR]: '#ff0055', // Red/Pink
  [NodeType.MECHANICAL]: '#55ff55', // Green
  [NodeType.POWER]: '#ffa500', // Orange
  [NodeType.UNKNOWN]: '#ffffff',
};

interface PartProps {
  data: SystemComponent;
  onSelect: (id: string) => void;
  isSelected: boolean;
  expansion: number;
  registerRef: (id: string, obj: THREE.Object3D) => void;
  scanY: number;
}

const GeometryRenderer: React.FC<{ shape: PrimitiveShape, args: number[] }> = React.memo(({ shape, args }) => {
    try {
        switch (shape) {
            case PrimitiveShape.BOX: return <boxGeometry args={[args[0] || 1, args[1] || 1, args[2] || 1]} />;
            case PrimitiveShape.CYLINDER: return <cylinderGeometry args={[args[0] || 0.5, args[1] || 0.5, args[2] || 1, 32]} />;
            case PrimitiveShape.SPHERE: return <sphereGeometry args={[args[0] || 0.5, 32, 32]} />;
            case PrimitiveShape.CAPSULE: return <capsuleGeometry args={[args[0] || 0.5, args[1] || 1, 4, 16]} />;
            case PrimitiveShape.CONE: return <coneGeometry args={[args[0] || 0.5, args[1] || 1, 32]} />;
            case PrimitiveShape.TORUS: return <torusGeometry args={[args[0] || 0.5, args[1] || 0.2, 16, 32]} />;
            default: return <boxGeometry args={[1, 1, 1]} />;
        }
    } catch (e) {
        return <boxGeometry args={[0.5, 0.5, 0.5]} />;
    }
});

const ProceduralMesh: React.FC<{ primitive: GeometricPrimitive; baseColor: string; isSelected: boolean; scanY: number }> = ({ primitive, baseColor, isSelected, scanY }) => {
    const { shape, args, position, rotation, colorHex } = primitive;
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    
    // Use specific color if defined in primitive, else base
    const finalColor = new THREE.Color(isSelected ? '#ffffff' : (colorHex || baseColor));

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
            materialRef.current.uniforms.color.value.lerp(finalColor, 0.1);
            materialRef.current.uniforms.scanPos.value = scanY;
        }
    });

    return (
        <group position={position} rotation={rotation}>
            <mesh ref={meshRef}>
                <GeometryRenderer shape={shape} args={args} />
                {/* Holographic Shader Material */}
                <shaderMaterial 
                    ref={materialRef}
                    args={[HologramShader]}
                    transparent
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            {/* Structural Wireframe Overlay (Blueprint look) */}
            <mesh>
                 <GeometryRenderer shape={shape} args={args} />
                 <meshBasicMaterial color={finalColor} wireframe transparent opacity={0.2} />
            </mesh>
            {/* Accent Edges for sharpness */}
            <mesh>
                 <GeometryRenderer shape={shape} args={args} />
                 <Edges threshold={15} color={isSelected ? "white" : baseColor} scale={1} />
                 <meshBasicMaterial visible={false} />
            </mesh>
        </group>
    );
};

const TechPart: React.FC<PartProps> = ({ data, onSelect, isSelected, expansion, registerRef, scanY }) => {
  const { type, relativePosition, id, structure } = data;
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate target position based on expansion (Exploded View)
  const targetPos = new THREE.Vector3(
    relativePosition[0] * (1 + expansion * 2),
    relativePosition[1] * (1 + expansion * 2),
    relativePosition[2] * (1 + expansion * 2)
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Smooth lerp to target position
    groupRef.current.position.lerp(targetPos, 0.1);
    // Slowly rotate if selected for inspection
    if (isSelected) {
        groupRef.current.rotation.y += delta * 0.5;
    } else {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
    }
    // Update connection ref
    registerRef(id, groupRef.current);
  });

  const baseColor = TypeColors[type] || TypeColors.UNKNOWN;

  return (
    <group 
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onSelect(id); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
    >
        {structure && structure.length > 0 ? (
            structure.map((prim, idx) => (
                <ProceduralMesh 
                    key={`${id}-prim-${idx}`} 
                    primitive={prim} 
                    baseColor={baseColor} 
                    isSelected={isSelected} 
                    scanY={scanY}
                />
            ))
        ) : (
            <ProceduralMesh 
                primitive={{ shape: PrimitiveShape.BOX, args:[1,1,1], position:[0,0,0], rotation:[0,0,0] }} 
                baseColor={baseColor} 
                isSelected={isSelected} 
                scanY={scanY}
            />
        )}
      
      {/* Label */}
      <Billboard position={[0, 1.5, 0]}>
          <Text
            fontSize={0.2}
            color={isSelected ? '#ffffff' : baseColor}
            anchorX="center"
            anchorY="middle"
          >
            {data.name}
          </Text>
      </Billboard>
    </group>
  );
};

const DataStreams: React.FC<{ 
    components: SystemComponent[], 
    nodeRefs: React.MutableRefObject<Record<string, THREE.Object3D>> 
}> = ({ components, nodeRefs }) => {
    
    const connections = useMemo(() => {
        const conns: {start: string, end: string}[] = [];
        components.forEach(comp => {
            comp.connections.forEach(target => {
                if (comp.id < target) {
                    conns.push({ start: comp.id, end: target });
                }
            });
        });
        return conns;
    }, [components]);

    return (
        <group>
            {connections.map((conn, i) => (
                <DynamicLine key={i} startId={conn.start} endId={conn.end} nodeRefs={nodeRefs} />
            ))}
        </group>
    );
};

const DynamicLine: React.FC<{ startId: string, endId: string, nodeRefs: React.MutableRefObject<Record<string, THREE.Object3D>> }> = ({ startId, endId, nodeRefs }) => {
    const lineRef = useRef<any>(null);
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(6); 
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame(() => {
        const s = nodeRefs.current[startId];
        const e = nodeRefs.current[endId];
        
        if (s && e && lineRef.current) {
            const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
            if (posAttr) {
                posAttr.setXYZ(0, s.position.x, s.position.y, s.position.z);
                posAttr.setXYZ(1, e.position.x, e.position.y, e.position.z);
                posAttr.needsUpdate = true;
                lineRef.current.computeLineDistances();
                geometry.computeBoundingSphere();
            }
        }
    });

    return (
        <line ref={lineRef} geometry={geometry} frustumCulled={false}>
            <lineDashedMaterial 
                color="#777777" 
                transparent 
                opacity={0.4} 
                dashSize={0.2} 
                gapSize={0.1} 
                depthTest={false}
            />
        </line>
    )
}

const ScanningPlane: React.FC<{ scanning: boolean; setScanY: (y: number) => void }> = ({ scanning, setScanY }) => {
    const ref = useRef<THREE.Mesh>(null);
    
    useFrame((state, delta) => {
        if (!ref.current) return;
        
        if (scanning) {
            const y = Math.sin(state.clock.elapsedTime * 2) * 10;
            ref.current.position.y = y;
            setScanY(y);
            ref.current.visible = true;
        } else {
            ref.current.visible = false;
            setScanY(-100);
        }
    });

    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <planeGeometry args={[50, 50]} />
            <meshBasicMaterial color="#00ff9d" transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            <Edges color="#00ff9d" />
        </mesh>
    );
};

// --- 3D HAND CURSOR ---
const HoloCursor: React.FC<{ cursorState: CursorState }> = ({ cursorState }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport, camera } = useThree();
    
    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        // Map 0-1 (Screen) to -W/2 to W/2 (World) at z=0 (approx)
        // Note: For a true projection we'd use raycaster, but for a cursor 'overlay' this is cleaner
        const x = (cursorState.x - 0.5) * viewport.width;
        const y = -(cursorState.y - 0.5) * viewport.height;
        
        // Smooth lerp
        meshRef.current.position.lerp(new THREE.Vector3(x, y, 0), 0.2);
        
        // Rotation effect
        meshRef.current.rotation.z += delta * 2;
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.2;

        // Scale effect based on activity
        const targetScale = cursorState.active ? 1.5 : 1;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });
    
    if (!cursorState.active && cursorState.mode === 'IDLE') return null;

    const color = cursorState.mode === 'ROTATE' ? '#4ade80' : 
                  cursorState.mode === 'ZOOM' ? '#c084fc' :
                  cursorState.mode === 'EXPLODE' ? '#facc15' : '#22d3ee';

    return (
        <group>
             {/* Cursor Ring */}
             <mesh ref={meshRef}>
                <torusGeometry args={[0.3, 0.02, 16, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
             </mesh>
             {/* Text Label */}
             {meshRef.current && (
                 <mesh position={[meshRef.current.position.x, meshRef.current.position.y - 0.5, 0]}>
                     <Text fontSize={0.2} color={color} anchorX="center" anchorY="top">
                         {cursorState.mode}
                     </Text>
                 </mesh>
             )}
        </group>
    )
}

const SceneContent: React.FC<{ 
  components: SystemComponent[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  expansion: number;
  isScanning: boolean;
  controlsRef: React.MutableRefObject<any>;
  cursorState: CursorState;
}> = ({ components, selectedId, onSelect, expansion, isScanning, controlsRef, cursorState }) => {
    
  const nodeRefs = React.useRef<Record<string, THREE.Object3D>>({});
  const [scanY, setScanY] = useState(-100);

  const registerRef = (id: string, obj: THREE.Object3D) => {
      nodeRefs.current[id] = obj;
  };

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[20, 20, 20]} intensity={2} color="#ffffff" />
      <pointLight position={[-20, -10, -10]} intensity={1} color="#00aaff" />
      <spotLight position={[0, 30, 0]} angle={0.6} penumbra={1} intensity={2} castShadow />

      <ScanningPlane scanning={isScanning} setScanY={setScanY} />
      
      {/* Camera attached HUD elements usually go in a separate scene, 
          but for simple cursor we render it in world space and ensure it's in front */}
      <HoloCursor cursorState={cursorState} />

      <group>
        {components.map((comp) => (
          <TechPart 
            key={comp.id} 
            data={comp} 
            isSelected={selectedId === comp.id} 
            onSelect={onSelect}
            expansion={expansion}
            registerRef={registerRef}
            scanY={scanY}
          />
        ))}
      </group>

      <DataStreams components={components} nodeRefs={nodeRefs} />
      
      <Environment preset="city" blur={0.8} />
      <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
      
      <gridHelper args={[60, 60, 0x111111, 0x050505]} position={[0, -8, 0]} />
      <OrbitControls 
            ref={controlsRef}
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true} 
            autoRotate={false}
            dampingFactor={0.05}
        />
    </>
  );
};

export const Scene3D: React.FC<{ 
  components: SystemComponent[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  expansion: number;
  isScanning: boolean;
  cursorState: CursorState;
  controlsRef?: React.MutableRefObject<any>;
}> = ({ controlsRef, ...props }) => {
    const internalRef = useRef<any>(null);
    const finalRef = controlsRef || internalRef;

  return (
    <div className="w-full h-full bg-lumina-base">
      <Canvas shadows camera={{ position: [12, 8, 12], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}>
        <SceneContent {...props} controlsRef={finalRef} />
      </Canvas>
    </div>
  );
};
