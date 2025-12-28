
import React, { useState, useRef, useCallback } from 'react';
import { Scene3D } from './components/Simulation/Scene3D';
import { HUD } from './components/Interface/HUD';
import { HandControls } from './components/Simulation/HandControls';
import { SystemAnalysis, SystemComponent, DiagnosticResult, CursorState } from './types';
import { Hand } from 'lucide-react';

const App: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemAnalysis | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expansion, setExpansion] = useState(0); 
  const [isScanning, setIsScanning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult[]>([]);
  
  // Hand & Cursor State
  const [isHandTrackingEnabled, setIsHandTrackingEnabled] = useState(false);
  const [cursorState, setCursorState] = useState<CursorState>({ x: 0.5, y: 0.5, active: false, mode: 'IDLE' });

  // Controls Ref for imperatively handling Camera via gestures
  const controlsRef = useRef<any>(null);

  const handleSystemLoad = (data: SystemAnalysis) => {
    setSystemData(data);
    setSelectedComponentId(null);
    setExpansion(0); // Reset expansion on new load
    setDiagnosticResult([]);
  };

  const selectedComponent = systemData?.components.find(c => c.id === selectedComponentId) || null;

  // Gesture Handlers
  const handleRotate = useCallback((deltaX: number, deltaY: number) => {
      if (controlsRef.current) {
          // Adjust azimuthal (horizontal) and polar (vertical) angles
          const currentAzimuth = controlsRef.current.getAzimuthalAngle();
          const currentPolar = controlsRef.current.getPolarAngle();
          
          controlsRef.current.setAzimuthalAngle(currentAzimuth + deltaX);
          controlsRef.current.setPolarAngle(currentPolar + deltaY);
          controlsRef.current.update();
      }
  }, []);

  const handleZoom = useCallback((delta: number) => {
      if (controlsRef.current) {
          const scale = 1 + Math.abs(delta);
          if (delta > 0) {
              controlsRef.current.dollyIn(scale);
          } else {
              controlsRef.current.dollyOut(scale);
          }
          controlsRef.current.update();
      }
  }, []);

  const handleExplode = useCallback((value: number) => {
      setExpansion(value);
  }, []);

  const handleResetCamera = useCallback(() => {
      if (controlsRef.current) {
          controlsRef.current.reset();
      }
      setExpansion(0);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-lumina-base overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      
      {/* Main 3D Viewport - Centered relative to available space */}
      <div className="absolute inset-0 z-0 transition-all duration-500 ease-in-out">
        <Scene3D 
           components={systemData?.components || []} 
           selectedId={selectedComponentId}
           onSelect={setSelectedComponentId}
           expansion={expansion}
           isScanning={isScanning}
           controlsRef={controlsRef}
           cursorState={cursorState}
        />
      </div>

      {/* Interface Layer */}
      <HUD 
        systemData={systemData}
        selectedComponent={selectedComponent}
        onSystemLoad={handleSystemLoad}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        expansion={expansion}
        setExpansion={setExpansion}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        diagnosticResult={diagnosticResult}
        setDiagnosticResult={setDiagnosticResult}
        setSelectedComponentId={setSelectedComponentId}
      />
      
      {/* Hand Gesture Controls (Bottom Right Cluster) */}
      <div className="absolute bottom-6 right-8 z-40 flex flex-col items-end gap-3 pointer-events-none">
          {/* Toggle Button */}
          <button 
            onClick={() => setIsHandTrackingEnabled(!isHandTrackingEnabled)}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all duration-300 font-mono text-[10px] uppercase font-bold tracking-widest ${
              isHandTrackingEnabled 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]' 
                : 'bg-black/40 border-white/10 text-gray-500 hover:text-white hover:border-white/30'
            }`}
          >
            <Hand size={14} className={isHandTrackingEnabled ? 'animate-pulse' : ''} />
            {isHandTrackingEnabled ? 'Gestures Active' : 'Enable Gestures'}
          </button>

          {/* Actual Controls Widget */}
          <HandControls 
            onRotate={handleRotate} 
            onZoom={handleZoom} 
            onExplode={handleExplode}
            onCursorMove={setCursorState}
            onResetCamera={handleResetCamera}
            enabled={isHandTrackingEnabled}
          />
      </div>
    </div>
  );
};

export default App;
