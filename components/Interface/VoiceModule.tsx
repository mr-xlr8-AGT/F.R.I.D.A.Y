import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Power, Zap, Activity } from 'lucide-react';
import { useLiveSession } from '../../hooks/useLiveSession';

interface Point3D {
    x: number;
    y: number;
    z: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    phase: number;
}

interface VoiceModuleProps {
    onCommand?: (command: string) => void;
}

export const VoiceModule: React.FC<VoiceModuleProps> = ({ onCommand }) => {
    const { connect, disconnect, isConnected, voiceState, volumeRef, error, isMuted, toggleMute } = useLiveSession(onCommand);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Point3D[]>([]);
    const rotationRef = useRef({ x: 0, y: 0 });
    
    // Initialize 3D Sphere Particles
    useEffect(() => {
        const particles: Point3D[] = [];
        const count = 400; // Dense particle cloud for high-end look
        
        for (let i = 0; i < count; i++) {
            // Fibonacci Sphere distribution for perfect even spread
            const phi = Math.acos(1 - 2 * (i + 0.5) / count);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            
            const r = 90; // Radius
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            particles.push({
                x, y, z,
                baseX: x,
                baseY: y,
                baseZ: z,
                phase: Math.random() * Math.PI * 2
            });
        }
        particlesRef.current = particles;
    }, []);

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isConnected) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationId: number;
        let time = 0;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;
            
            ctx.clearRect(0, 0, width, height);

            // Audio Reactive Params
            const inputVol = volumeRef.current.input; 
            const outputVol = volumeRef.current.output; 
            const activeVol = Math.max(inputVol, outputVol);
            
            // Dynamic Styling based on State
            let baseColor = '100, 116, 139'; // Slate (Idle)
            let glowColor = 'rgba(0,0,0,0)';
            let expansion = 1;
            let jitter = 0;
            let rotationSpeedY = 0.002;
            let rotationSpeedX = 0.001;
            let connectionDistance = 0;

            if (voiceState === 'listening') {
                baseColor = '34, 211, 238'; // Cyan-400
                glowColor = 'rgba(34, 211, 238, 0.15)';
                expansion = 1.05 + (activeVol * 0.1);
                jitter = activeVol * 2;
                rotationSpeedY = 0.01;
            } else if (voiceState === 'speaking') {
                baseColor = '192, 132, 252'; // Purple-400
                glowColor = 'rgba(192, 132, 252, 0.25)';
                expansion = 1.1 + (activeVol * 0.6); // Beat pulsing
                jitter = activeVol * 8; // Vibration
                rotationSpeedY = 0.02 + (activeVol * 0.02);
                connectionDistance = 40; // Plexus effect
            } else if (voiceState === 'thinking') {
                baseColor = '255, 255, 255';
                glowColor = 'rgba(255, 255, 255, 0.2)';
                rotationSpeedY = 0.05; // Fast processing spin
                expansion = 0.9;
            }

            // Update Rotation
            rotationRef.current.y += rotationSpeedY;
            rotationRef.current.x += rotationSpeedX;
            time += 0.05;

            // Draw Central Glow
            if (voiceState !== 'idle') {
                const gradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140 * expansion);
                gradient.addColorStop(0, glowColor);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }

            // 3D Projection Logic
            const projected = particlesRef.current.map(p => {
                // Rotation Matrix
                let x1 = p.baseX * Math.cos(rotationRef.current.y) - p.baseZ * Math.sin(rotationRef.current.y);
                let z1 = p.baseX * Math.sin(rotationRef.current.y) + p.baseZ * Math.cos(rotationRef.current.y);
                
                let y1 = p.baseY * Math.cos(rotationRef.current.x) - z1 * Math.sin(rotationRef.current.x);
                let z2 = p.baseY * Math.sin(rotationRef.current.x) + z1 * Math.cos(rotationRef.current.x);

                // Audio Distortion
                const pulse = 1 + Math.sin(time + p.phase) * 0.02 + (activeVol * 0.4 * Math.sin(p.phase * 3));
                x1 *= pulse * expansion;
                y1 *= pulse * expansion;
                z2 *= pulse * expansion;

                // Jitter
                if (jitter > 0) {
                    x1 += (Math.random() - 0.5) * jitter;
                    y1 += (Math.random() - 0.5) * jitter;
                }

                // Perspective Projection
                const fov = 250;
                const scale = fov / (fov + z2);
                const x2d = cx + x1 * scale;
                const y2d = cy + y1 * scale;
                
                return { x: x2d, y: y2d, scale, z: z2, x3d: x1, y3d: y1 };
            });

            // Sort by Z for correct depth drawing
            projected.sort((a, b) => b.z - a.z);

            // Draw Particles & Connections
            projected.forEach((p, index) => {
                const alpha = Math.max(0.1, p.scale); 
                
                // Draw Connections (Plexus) for speaking state
                if (voiceState === 'speaking' && index % 2 === 0) {
                     // Check neighbors (simplified to next few particles for perf)
                     for (let j = 1; j < 3; j++) {
                         const p2 = projected[index + j];
                         if (p2) {
                             const dx = p.x - p2.x;
                             const dy = p.y - p2.y;
                             const dist = Math.sqrt(dx*dx + dy*dy);
                             if (dist < connectionDistance * p.scale) {
                                 ctx.beginPath();
                                 ctx.strokeStyle = `rgba(${baseColor}, ${0.15 * alpha})`;
                                 ctx.lineWidth = 0.5;
                                 ctx.moveTo(p.x, p.y);
                                 ctx.lineTo(p2.x, p2.y);
                                 ctx.stroke();
                             }
                         }
                     }
                }

                // Draw Dot
                const size = Math.max(0.8, 2.5 * p.scale + (activeVol * 1.5));
                ctx.beginPath();
                ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [isConnected, voiceState]);

    // --- RENDER ---

    if (!isConnected) {
        return (
            <div className="w-full mt-auto flex flex-col items-center justify-center py-8">
                <button 
                    onClick={connect}
                    className="group relative flex items-center justify-center"
                >
                    {/* Idle Pulse Rings */}
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
                    <div className="absolute -inset-6 bg-cyan-500/5 rounded-full animate-[pulse_4s_ease-in-out_infinite] opacity-30"></div>
                    
                    {/* Main Activation Orb */}
                    <div className="relative w-16 h-16 bg-[#0a0f1e] rounded-full border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:border-cyan-400/80 group-hover:shadow-[0_0_60px_rgba(0,240,255,0.4)]">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-t border-cyan-500/50"
                        />
                        <Mic className="text-cyan-400 w-6 h-6 group-hover:text-white transition-colors" />
                    </div>
                </button>
                <div className="mt-6 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-[0.2em] uppercase">TALK TO FRIDAY</span>
                    <span className="text-[9px] text-cyan-500/50">STATUS: OFFLINE</span>
                </div>
                {error && <div className="mt-2 text-[9px] text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-500/20">{error}</div>}
            </div>
        );
    }

    return (
        <div className="relative w-full h-56 bg-gradient-to-t from-[#030712] to-transparent flex flex-col items-center justify-end overflow-hidden group">
            
            {/* Holographic Header */}
            <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="flex items-center gap-3 px-4 py-1.5 bg-[#030712]/60 backdrop-blur-md rounded-full border border-white/5 shadow-lg">
                    <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-1.5 h-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-purple-400' : voiceState === 'listening' ? 'bg-cyan-400' : 'bg-gray-500'}`} 
                    />
                    <span className="text-[9px] font-mono text-gray-200 uppercase tracking-widest font-bold">
                        {voiceState === 'speaking' ? 'Voice Active' : voiceState === 'listening' ? 'Listening' : 'Processing'}
                    </span>
                </div>
            </div>

            {/* Main Visualizer */}
            <canvas 
                ref={canvasRef} 
                width={360} 
                height={260} 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Floating Glass Control Island */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-20 mb-4 flex items-center gap-3"
            >
                 <div className="flex items-center gap-1 bg-[#0f172a]/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors hover:bg-[#0f172a]/60 hover:border-white/20">
                    <button 
                        onClick={toggleMute}
                        className={`p-3 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    
                    <button 
                        onClick={disconnect}
                        className="p-3 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-300"
                        title="Disconnect Neural Link"
                    >
                        <Power size={16} />
                    </button>
                </div>
            </motion.div>
            
            {/* Decorative Scanline */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50"></div>
        </div>
    );
};