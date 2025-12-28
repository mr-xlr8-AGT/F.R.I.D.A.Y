
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Scan, Activity, RefreshCcw, Hand, Move, ZoomIn, Layers, Settings, X, HelpCircle, AlertCircle } from 'lucide-react';
import { CursorState } from '../../types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface HandControlsProps {
  onRotate: (deltaX: number, deltaY: number) => void;
  onZoom: (delta: number) => void;
  onExplode: (value: number) => void;
  onCursorMove: (cursor: CursorState) => void;
  onResetCamera: () => void;
  enabled: boolean;
}

export const HandControls: React.FC<HandControlsProps> = ({ 
    onRotate, onZoom, onExplode, onCursorMove, onResetCamera, enabled 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [status, setStatus] = useState<'IDLE' | 'TRACKING' | 'ERROR'>('IDLE');
  const [activeGesture, setActiveGesture] = useState<string>('NONE');
  const [confidence, setConfidence] = useState<number>(0);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Sensitivity Settings (Persisted)
  const [sensitivity, setSensitivity] = useState({
      rotate: parseFloat(localStorage.getItem('sens_rotate') || '3.0'),
      zoom: parseFloat(localStorage.getItem('sens_zoom') || '5.0'),
      explode: parseFloat(localStorage.getItem('sens_explode') || '2.5')
  });

  const saveSettings = (key: string, val: number) => {
      localStorage.setItem(`sens_${key}`, val.toString());
      setSensitivity(prev => ({ ...prev, [key]: val }));
  };

  // Gesture State Refs
  const prevPinchRef = useRef<{x: number, y: number} | null>(null);
  const prevDistRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup if disabled
    if (!enabled) {
      return; 
    }

    let camera: any = null;
    let hands: any = null;
    let isMounted = true;

    const onResults = (results: any) => {
      if (!isMounted) return;

      const hasHands = results.multiHandLandmarks?.length > 0;
      setStatus(hasHands ? 'TRACKING' : 'IDLE');
      
      // Update Confidence Visuals (Mocked based on handedness score if available, or just binary)
      const score = results.multiHandedness?.[0]?.score || 0;
      setConfidence(hasHands ? (score > 0.9 ? 3 : score > 0.7 ? 2 : 1) : 0);

      const canvasCtx = canvasRef.current?.getContext('2d');
      if (canvasRef.current && canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw image (Mirrored)
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvasRef.current.width, 0);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Darken for HUD effect
        canvasCtx.fillStyle = 'rgba(3, 7, 18, 0.6)';
        canvasCtx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw skeletons
        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00f0ff', lineWidth: 2 });
            window.drawLandmarks(canvasCtx, landmarks, { color: '#bd00ff', lineWidth: 1, radius: 3 });
          }
        }
        canvasCtx.restore();

        processGestures(results.multiHandLandmarks);
      }
    };

    const processGestures = (landmarks: any[]) => {
      if (!landmarks || landmarks.length === 0) {
        prevPinchRef.current = null;
        prevDistRef.current = null;
        setActiveGesture('STANDBY');
        onCursorMove({ x: 0, y: 0, active: false, mode: 'IDLE' });
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        return;
      }

      // Helper: Distance
      const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
      // Helper: Check Pinch (Index tip close to Thumb tip)
      const isPinching = (lm: any[]) => dist(lm[4], lm[8]) < 0.08; 
      // Helper: Check Open (Fingers extended)
      const isOpen = (lm: any[]) => dist(lm[4], lm[8]) > 0.1 && dist(lm[8], lm[12]) > 0.1;
      // Helper: Check Fist (Tips below PIP joints)
      const isFist = (lm: any[]) => lm[8].y > lm[6].y && lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y;

      // 1. RESET GESTURE (Fist held for 1s)
      if (landmarks.length === 1 && isFist(landmarks[0])) {
          if (!resetTimerRef.current) {
              setActiveGesture('RESETTING...');
              resetTimerRef.current = window.setTimeout(() => {
                  if (isMounted) {
                      onResetCamera();
                      setActiveGesture('RESET COMPLETE');
                  }
              }, 1000);
          }
          // Don't process other gestures
          return; 
      } else {
          if (resetTimerRef.current) {
              clearTimeout(resetTimerRef.current);
              resetTimerRef.current = null;
          }
      }

      // Cursor Calculation (Centroid of first hand)
      const hand = landmarks[0];
      const cursorX = 1 - hand[9].x; // Mirror x
      const cursorY = hand[9].y;
      
      // 2. TWO HANDS LOGIC
      if (landmarks.length === 2) {
        const hand1 = landmarks[0];
        const hand2 = landmarks[1];
        const h1Center = hand1[9]; 
        const h2Center = hand2[9];
        const handDistance = dist(h1Center, h2Center);

        // A. EXPLODE: Both hands open
        if (isOpen(hand1) && isOpen(hand2)) {
             setActiveGesture('EXPLODE');
             onCursorMove({ x: cursorX, y: cursorY, active: true, mode: 'EXPLODE' });
             
             let val = (handDistance - 0.1) * sensitivity.explode; 
             val = Math.max(0, Math.min(1, val));
             onExplode(val);
             prevPinchRef.current = null;
             prevDistRef.current = null;
             return;
        }

        // B. ZOOM: Both hands pinching
        if (isPinching(hand1) || isPinching(hand2)) { 
            setActiveGesture('ZOOM');
            onCursorMove({ x: cursorX, y: cursorY, active: true, mode: 'ZOOM' });

            if (prevDistRef.current !== null) {
                const delta = handDistance - prevDistRef.current;
                onZoom(delta * sensitivity.zoom); 
            }
            prevDistRef.current = handDistance;
            prevPinchRef.current = null;
            return;
        }
      } 
      
      // 3. ONE HAND LOGIC
      if (landmarks.length >= 1) {
          const activeHand = isPinching(landmarks[0]) ? landmarks[0] : (landmarks[1] && isPinching(landmarks[1]) ? landmarks[1] : null);

          // C. ROTATE: Pinch and Drag
          if (activeHand) {
              setActiveGesture('ROTATE');
              onCursorMove({ x: cursorX, y: cursorY, active: true, mode: 'ROTATE' });

              const pinchCenter = {
                  x: (activeHand[4].x + activeHand[8].x) / 2,
                  y: (activeHand[4].y + activeHand[8].y) / 2
              };

              if (prevPinchRef.current) {
                  const dx = pinchCenter.x - prevPinchRef.current.x;
                  const dy = pinchCenter.y - prevPinchRef.current.y;
                  
                  // Deadzone
                  const threshold = 0.005;
                  if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                      onRotate(-dx * sensitivity.rotate, -dy * sensitivity.rotate); 
                  }
              }
              prevPinchRef.current = pinchCenter;
              prevDistRef.current = null; 
          } else {
              prevPinchRef.current = null;
              prevDistRef.current = null;
              if (landmarks.length === 1 && isOpen(landmarks[0])) {
                  setActiveGesture('DETECTED');
                  onCursorMove({ x: cursorX, y: cursorY, active: true, mode: 'IDLE' });
              }
          }
      }
    };

    const initMP = async () => {
      if (!isMounted) return;
      
      try {
        if (!window.Hands || !window.Camera) {
           // Retry with exponential backoff if scripts aren't loaded yet
           setTimeout(initMP, 500); 
           return;
        }
        
        hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        hands.onResults(onResults);

        if (videoRef.current) {
          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (isMounted && videoRef.current && hands) {
                try {
                  await hands.send({ image: videoRef.current });
                } catch (err) {
                  // Suppress send errors during unmount/transition
                }
              }
            },
            width: 320,
            height: 240
          });
          await camera.start();
          if (isMounted) setIsInitializing(false);
        }
      } catch (e) {
        console.error("MP Error", e);
        if (isMounted) setStatus('ERROR');
      }
    };

    // Small delay to ensure DOM is ready and prevent double-init in StrictMode
    const timer = setTimeout(initMP, 100);

    return () => {
        isMounted = false;
        clearTimeout(timer);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        
        if (camera) {
            try { 
                camera.stop(); 
            } catch(e) { console.error("Cam stop error", e); }
        }
        
        // CRITICAL FIX: Do NOT call hands.close(). 
        // Calling close() on the JS wrapper while the C++ WASM is processing a frame
        // causes the "deleted object" pointer crash.
        // We simply nullify the reference and let the GC handle it safely.
        hands = null;
        camera = null;
    };
  }, [enabled, onRotate, onZoom, onExplode, sensitivity]);

  if (!enabled) return null;

  return (
    <div className="flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 animate-in slide-in-from-right-10 fade-in">
        {/* Holographic Container */}
        <div className="relative w-56 h-40 bg-[#030712]/90 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.1)] group pointer-events-auto transition-all hover:border-cyan-500/60">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-cyan-500/10 p-1.5 flex justify-between items-center px-3 z-10 border-b border-cyan-500/20">
                <div className="flex items-center gap-1.5">
                    <Scan size={12} className="text-cyan-400" />
                    <span className="text-[9px] font-mono text-cyan-300 uppercase tracking-wider font-bold">Motion Capture</span>
                </div>
                <div className="flex items-center gap-2">
                     {/* Confidence Meter */}
                     <div className="flex gap-0.5">
                        <div className={`w-1 h-3 rounded-sm ${confidence >= 1 ? (confidence === 1 ? 'bg-red-500' : 'bg-green-400') : 'bg-gray-800'}`} />
                        <div className={`w-1 h-3 rounded-sm ${confidence >= 2 ? (confidence === 2 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-gray-800'}`} />
                        <div className={`w-1 h-3 rounded-sm ${confidence >= 3 ? 'bg-green-400' : 'bg-gray-800'}`} />
                     </div>
                </div>
            </div>

            {/* Video & Canvas */}
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-20 transform scale-x-[-1]" playsInline muted />
            <canvas ref={canvasRef} width={320} height={240} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />

            {/* Initializing State */}
            {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-cyan-500 animate-spin"><RefreshCcw size={20} /></div>
                        <span className="text-[9px] text-cyan-500/70 font-mono">INITIALIZING SENSORS...</span>
                    </div>
                </div>
            )}

            {/* Active Gesture Indicator */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 text-center">
                 <span className={`text-[10px] font-mono font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${
                     activeGesture.includes('RESET') ? 'text-red-400 animate-pulse' :
                     activeGesture === 'ROTATE' ? 'text-green-400' :
                     activeGesture === 'ZOOM' ? 'text-purple-400' :
                     activeGesture === 'EXPLODE' ? 'text-yellow-400' :
                     'text-gray-500'
                 }`}>
                    {activeGesture === 'STANDBY' ? 'WAITING FOR INPUT' : activeGesture}
                 </span>
            </div>

            {/* Settings & Help Toggles */}
            <div className="absolute top-8 right-2 flex flex-col gap-2">
                <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 bg-black/40 rounded hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors">
                    <Settings size={12} />
                </button>
                <button onClick={() => setShowHelp(!showHelp)} className="p-1.5 bg-black/40 rounded hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors">
                    <HelpCircle size={12} />
                </button>
            </div>
        </div>

        {/* Dynamic Panel: Settings or Help */}
        {(showSettings || showHelp) && (
            <div className="bg-[#030712]/90 backdrop-blur border border-white/10 rounded-lg p-3 w-56 pointer-events-auto space-y-3 relative">
                <button onClick={() => { setShowSettings(false); setShowHelp(false); }} className="absolute top-2 right-2 text-gray-500 hover:text-white"><X size={12} /></button>
                
                {showSettings && (
                    <div className="space-y-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-1">Sensitivity</div>
                        {[
                            { label: 'Rotation', key: 'rotate', max: 5 },
                            { label: 'Zoom', key: 'zoom', max: 10 },
                            { label: 'Explode', key: 'explode', max: 5 }
                        ].map(opt => (
                            <div key={opt.key} className="space-y-1">
                                <div className="flex justify-between text-[9px] text-gray-400">
                                    <span>{opt.label}</span>
                                    <span>{(sensitivity as any)[opt.key].toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max={opt.max} step="0.1"
                                    value={(sensitivity as any)[opt.key]}
                                    onChange={(e) => saveSettings(opt.key, parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {showHelp && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-1">Gesture Guide</div>
                        <div className="grid grid-cols-1 gap-2">
                            <GestureRow icon={<Move size={12} className="text-cyan-400" />} label="Rotate" desc="Pinch & Drag (1 Hand)" />
                            <GestureRow icon={<ZoomIn size={12} className="text-purple-400" />} label="Zoom" desc="Pinch In/Out (2 Hands)" />
                            <GestureRow icon={<Layers size={12} className="text-yellow-400" />} label="Explode" desc="Open Hands Apart" />
                            <GestureRow icon={<RefreshCcw size={12} className="text-red-400" />} label="Reset" desc="Hold Fist (1 sec)" />
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

const GestureRow = ({ icon, label, desc }: any) => (
    <div className="flex items-center justify-between text-[9px] text-gray-400">
        <div className="flex items-center gap-2">
            {icon}
            <span className="font-bold text-white">{label}</span>
        </div>
        <span>{desc}</span>
    </div>
);
