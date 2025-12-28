
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Cpu, Activity, Database, Zap, Share2, 
  Search, Send, Maximize2, Layers, ScanLine, 
  AlertTriangle, CheckCircle, Camera, X, Box, 
  Settings, FileText, ChevronRight, StopCircle,
  Command, Mic
} from 'lucide-react';
import { VoiceModule } from './VoiceModule';
import { SystemAnalysis, SystemComponent, Message, DiagnosticResult } from '../../types';
import { analyzeSystem, chatWithFriday, runDiagnostics } from '../../services/geminiService';

// --- CRAZY LOADING SEQUENCE: HYPER-TUNNEL ---
const InitializationSequence: React.FC = () => {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [displayedText, setDisplayedText] = useState("");

    const statuses = [
        "BOOT_SEQUENCE_INITIATED",
        "CONNECTING_TO_NEURAL_MAINFRAME",
        "ALLOCATING_QUANTUM_VOXELS",
        "COMPILING_GEOMETRIC_SHADERS",
        "OPTIMIZING_POLYGON_MESH_DENSITY",
        "CALIBRATING_PHYSICS_ENGINE_V2.4",
        "SYNTHESIZING_HOLOGRAPHIC_PROJECTION",
        "FINALIZING_SYSTEM_INTEGRITY"
    ];

    // Asymptotic Progress Simulation (Zeno's Paradox)
    // Moves fast initially, then slows down as it approaches 99%, never hitting 100% until unmount.
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 99) return 99;
                // Speed depends on remaining distance: fast start, slow finish
                const remaining = 100 - prev;
                // Add a bit of randomness to make it look like "processing"
                const noise = Math.random() * 0.5;
                const increment = (remaining / 20) + noise; 
                return Math.min(99, prev + increment);
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Sync status text with progress thresholds
    useEffect(() => {
        const total = statuses.length;
        // Map progress 0-99 to index 0-(total-1)
        const newIndex = Math.min(total - 1, Math.floor((progress / 100) * total));
        if (newIndex !== statusIndex) {
            setStatusIndex(newIndex);
        }
    }, [progress, statusIndex]);

    // Glitch Text Effect
    useEffect(() => {
        const targetText = statuses[statusIndex];
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayedText(
                targetText
                    .split("")
                    .map((letter, index) => {
                        if (index < iteration) {
                            return letter;
                        }
                        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"[Math.floor(Math.random() * 36)];
                    })
                    .join("")
            );
            
            if (iteration >= targetText.length) { 
                clearInterval(interval);
            }
            iteration += 2; // Speed of decode
        }, 30);
        return () => clearInterval(interval);
    }, [statusIndex]);

    // Hyper-Tunnel Canvas Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let stars: {x:number, y:number, z:number}[] = [];
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        for (let i = 0; i < 800; i++) {
            stars.push({
                x: (Math.random() - 0.5) * width,
                y: (Math.random() - 0.5) * height,
                z: Math.random() * width
            });
        }

        let animId: number;
        const render = () => {
            // Motion Blur trail effect
            ctx.fillStyle = 'rgba(3, 7, 18, 0.4)'; 
            ctx.fillRect(0, 0, width, height);
            
            const cx = width / 2;
            const cy = height / 2;

            stars.forEach(star => {
                // Move star closer
                star.z -= 15; // Speed
                if (star.z <= 0) {
                    star.z = width;
                    star.x = (Math.random() - 0.5) * width;
                    star.y = (Math.random() - 0.5) * height;
                }

                const x = (star.x / star.z) * width + cx;
                const y = (star.y / star.z) * height + cy;
                const size = (1 - star.z / width) * 4;
                const alpha = (1 - star.z / width);

                ctx.beginPath();
                ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`; // Cyan color
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            });

            animId = requestAnimationFrame(render);
        }
        render();
        return () => cancelAnimationFrame(animId);
    }, []);

    const displayProgress = Math.floor(progress);

    return (
        <div className="absolute inset-0 z-50 bg-[#030712] flex items-center justify-center font-mono overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />
            
            {/* Vignette & Scanlines */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030712_90%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />

            {/* Central HUD */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Rotating Rings */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-2 border-dashed border-cyan-500/30 rounded-full"
                    />
                    <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border border-t-transparent border-l-transparent border-cyan-400/60 rounded-full"
                    />
                    <motion.div 
                        animate={{ rotate: 180, scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full shadow-[0_0_30px_#00f0ff]"
                    />
                    
                    {/* Center Percentage */}
                    <div className="flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm w-40 h-40 rounded-full border border-white/10">
                        <span className="text-4xl font-black text-white tracking-tighter">{displayProgress}<span className="text-sm text-gray-500">%</span></span>
                    </div>
                </div>

                {/* Glitch Text Status */}
                <div className="h-12 flex flex-col items-center">
                    <div className="text-cyan-400 text-sm font-bold tracking-[0.2em] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">
                        {displayedText}
                    </div>
                    {/* Animated Loader Bar */}
                    <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden relative">
                        <motion.div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${displayProgress}%` }}
                            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                        />
                    </div>
                </div>
            </div>

            {/* Corner Decor */}
            <div className="absolute top-10 left-10 text-[10px] text-gray-500 border-l-2 border-cyan-500 pl-2">
                <div>SYS.INTEGRITY: 100%</div>
                <div>MEM.ALLOC: 4096TB</div>
            </div>
            <div className="absolute bottom-10 right-10 text-[10px] text-gray-500 border-r-2 border-cyan-500 pr-2 text-right">
                <div>FRIDAY v2.4</div>
                <div>BUILD 9021.44</div>
            </div>
        </div>
    );
};

interface HUDProps {
  systemData: SystemAnalysis | null;
  selectedComponent: SystemComponent | null;
  onSystemLoad: (data: SystemAnalysis) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  expansion: number;
  setExpansion: (val: number) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  diagnosticResult: DiagnosticResult[];
  setDiagnosticResult: (res: DiagnosticResult[]) => void;
  setSelectedComponentId: (id: string | null) => void;
}

export const HUD: React.FC<HUDProps> = ({ 
    systemData, 
    selectedComponent, 
    onSystemLoad, 
    isLoading, 
    setIsLoading,
    expansion,
    setExpansion,
    isScanning,
    setIsScanning,
    diagnosticResult,
    setDiagnosticResult,
    setSelectedComponentId
}) => {
  // Input State
  const [systemName, setSystemName] = useState('');
  const [description, setDescription] = useState('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'create' | 'info' | 'logs'>('create');
  
  // Chat / Logs
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'system', content: 'FRIDAY v2.4 initialized. Neural Engine Standby.', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  // Image Input
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
      if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [messages, activeTab]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setSelectedImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const clearImage = () => {
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const triggerAnalysis = async (cmdName?: string, cmdDesc?: string) => {
    const finalName = cmdName || systemName;
    const finalDesc = cmdDesc || description;

    if (!finalName.trim() && !selectedImage && !finalDesc.trim()) return;

    setIsLoading(true);
    setDiagnosticResult([]);
    setIsScanning(false);
    
    // Construct Query
    let query = "";
    if (finalName) query += `System Name: ${finalName}. `;
    if (finalDesc) query += `Technical Requirements: ${finalDesc}`;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `Initialize Project: ${finalName || 'Visual Analysis'}`, timestamp: new Date() }]);
    
    try {
      const base64Data = selectedImage ? (selectedImage.includes(',') ? selectedImage.split(',')[1] : selectedImage) : undefined;
      const result = await analyzeSystem(query, base64Data);
      onSystemLoad(result);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'system', 
        content: `Project '${result.systemName}' compiled successfully. ${result.components.length} subsystems generated.`, 
        timestamp: new Date() 
      }]);
      
      if (selectedImage) clearImage();
      setActiveTab('info'); // Auto switch to info tab
      setSystemName('');
      setDescription('');

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: 'Generation failed. Neural Engine data corruption detected. Please retry.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepScan = async () => {
      if (!systemData) return;
      setIsScanning(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Running Deep Scan Diagnostics...`, timestamp: new Date() }]);
      
      try {
          // Delay to simulate scanning
          setTimeout(async () => {
              const results = await runDiagnostics(systemData);
              setDiagnosticResult(results);
              setIsScanning(false);
              setMessages(prev => [...prev, { 
                  id: Date.now().toString(), 
                  role: 'system', 
                  content: `Diagnostics complete. ${results.length} anomalies detected.`, 
                  timestamp: new Date() 
              }]);
          }, 3000);
      } catch (e) {
          setIsScanning(false);
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Diagnostic Scan Failed.`, timestamp: new Date() }]);
      }
  };

  const stopScan = () => {
      setIsScanning(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Diagnostic aborted by user.`, timestamp: new Date() }]);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || isChatting) return;
      
      const userMsg = chatInput.trim();
      setChatInput('');
      
      const newMsg: Message = { 
          id: Date.now().toString(), 
          role: 'user', 
          content: userMsg, 
          timestamp: new Date() 
      };
      
      const newHistory = [...messages, newMsg];
      setMessages(newHistory);
      setIsChatting(true);

      try {
          // Prepare history: map 'system' to 'model' so Gemini understands it, or filter out system logs if needed.
          // We will map system logs to model responses so the AI has context of what happened.
          const apiHistory = newHistory.map(m => ({
                role: m.role === 'system' ? 'model' : m.role,
                content: m.content
            }));

          // Context of the currently loaded system
          const context = systemData ? 
            `ACTIVE SYSTEM CONTEXT:
             System Name: ${systemData.systemName}
             Description: ${systemData.description}
             Components: ${systemData.components.map(c => c.name).join(', ')}
             Status: ${isScanning ? 'Scanning in progress' : 'Standby'}
             ` : '';

          const response = await chatWithFriday(apiHistory, userMsg, context);
          
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              content: response,
              timestamp: new Date()
          }]);
      } catch (e) {
          console.error(e);
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'system',
              content: "Connection to main server lost.",
              timestamp: new Date()
          }]);
      } finally {
          setIsChatting(false);
      }
  };

  // --- RENDER ---

  return (
    <div className="absolute inset-0 pointer-events-none flex overflow-hidden font-sans select-none">
      
      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {isLoading && <InitializationSequence />}
      </AnimatePresence>

      {/* LEFT SIDEBAR - FLOATING TACTICAL DECK */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="fixed top-4 left-4 bottom-4 w-96 flex flex-col pointer-events-auto z-20"
      >
        {/* Main Glass Panel */}
        <div className="relative w-full h-full bg-[#030712]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
            
            {/* Top Decorative Bars */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50"></div>

            {/* Corner Brackets */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-sm"></div>
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-sm"></div>
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-sm"></div>
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyan-500/40 rounded-br-sm"></div>

            {/* Header Area */}
            <div className="relative z-10 px-6 pt-8 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex items-center gap-4">
                     {/* Hexagon Logo Container */}
                     <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                        <svg viewBox="0 0 512 512" className="w-10 h-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                            <defs>
                                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="1"/>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="1"/>
                                </linearGradient>
                            </defs>
                            <g transform="translate(256 256)">
                                <path d="m0-140 121.2 70V70L0 140l-121.2-70V-70Z" fill="none" stroke="url(#logo-gradient)" strokeWidth="14" strokeLinejoin="round"/>
                                <path d="m0-105 91 52.5v105L0 105l-91-52.5v-105Z" fill="none" stroke="#22d3ee" strokeWidth="5" opacity=".4" strokeLinejoin="round"/>
                                <path stroke="#ffffff" strokeWidth="30" strokeLinecap="round" d="M-35-75V75m0-150h75m-75 60h65"/>
                                <circle cx="70" cy="60" r="12" fill="#22d3ee"/>
                            </g>
                        </svg>
                     </div>
                     <div>
                        <h1 className="text-xl font-black text-white tracking-[0.2em] font-mono leading-none flex items-center gap-2">
                            FRIDAY <span className="text-[10px] text-cyan-400 font-normal px-1 border border-cyan-500/30 rounded">OS</span>
                        </h1>
                        <div className="text-[9px] text-gray-400 font-mono tracking-widest mt-1 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></div>
                             NEURAL ENGINE v2.4
                        </div>
                     </div>
                </div>
            </div>

            {/* Segmented Navigation */}
            <div className="px-6 py-4">
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 relative">
                    {/* Sliding Highlight */}
                    <motion.div 
                        layoutId="tab-highlight"
                        className="absolute top-1 bottom-1 bg-white/10 rounded-md border border-white/10 shadow-sm"
                        style={{
                            left: activeTab === 'create' ? '4px' : activeTab === 'info' ? '33.33%' : '66.66%',
                            width: 'calc(33.33% - 5px)'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-2 text-[10px] font-bold tracking-widest relative z-10 transition-colors ${activeTab === 'create' ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        CREATE
                    </button>
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 py-2 text-[10px] font-bold tracking-widest relative z-10 transition-colors ${activeTab === 'info' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        INFO
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`flex-1 py-2 text-[10px] font-bold tracking-widest relative z-10 transition-colors ${activeTab === 'logs' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        LOGS
                    </button>
                </div>
            </div>

            {/* Content Container with custom scrollbar */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-gradient-to-b from-transparent to-black/20">
                <AnimatePresence mode="wait">
                    
                    {/* --- CREATE PANEL --- */}
                    {activeTab === 'create' && (
                        <motion.div 
                            key="create"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="p-6 pt-0 overflow-y-auto custom-scrollbar h-full space-y-6"
                        >
                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-[10px] uppercase text-cyan-500 font-bold tracking-widest">
                                    <Terminal size={12} /> System Designation
                                </label>
                                <input 
                                    type="text"
                                    value={systemName}
                                    onChange={(e) => setSystemName(e.target.value)}
                                    placeholder="ENTER_SYSTEM_NAME..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:bg-cyan-500/5 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all font-mono shadow-inner"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-[10px] uppercase text-purple-500 font-bold tracking-widest">
                                    <FileText size={12} /> Technical Parameters
                                </label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Input constraints and mechanics..."
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 focus:border-purple-500/50 focus:bg-purple-500/5 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all font-mono shadow-inner resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-[10px] uppercase text-green-500 font-bold tracking-widest">
                                    <ScanLine size={12} /> Visual Blueprint
                                </label>
                                
                                {selectedImage ? (
                                    <div className="relative group rounded-lg overflow-hidden border border-green-500/30">
                                        <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay"></div>
                                        <img src={selectedImage} alt="Blueprint" className="w-full h-32 object-cover" />
                                        <div className="absolute inset-0 bg-scan-lines opacity-20 pointer-events-none"></div>
                                        <button onClick={clearImage} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border border-dashed border-white/10 rounded-lg h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 transition-colors group"
                                    >
                                        <div className="p-2 bg-white/5 rounded-full group-hover:bg-green-500/20 transition-colors">
                                            <Camera size={16} className="text-gray-500 group-hover:text-green-400" />
                                        </div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider group-hover:text-green-400">Scan Reference</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <button 
                                onClick={() => triggerAnalysis()}
                                disabled={isLoading}
                                className="w-full relative overflow-hidden group bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 py-4 rounded-lg flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-scan"></div>
                                <Cpu size={16} className={`group-hover:animate-[spin_3s_linear_infinite] ${isLoading ? 'animate-spin' : ''}`} />
                                <span className="text-xs font-black tracking-[0.2em]">INITIATE GENERATION</span>
                            </button>
                        </motion.div>
                    )}

                    {/* --- INFO PANEL --- */}
                    {activeTab === 'info' && (
                        <motion.div
                            key="info"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }} 
                            className="p-6 pt-0 overflow-y-auto custom-scrollbar h-full space-y-6"
                        >
                             {systemData ? (
                                <>
                                    <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-lg border border-white/10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-20"><Activity size={40} /></div>
                                        <h3 className="text-cyan-400 font-bold font-mono text-sm mb-2">{systemData.systemName}</h3>
                                        <p className="text-xs text-gray-400 leading-relaxed border-l-2 border-white/10 pl-3">{systemData.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-center relative group">
                                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="text-2xl font-black text-white">{systemData.components.length}</div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Modules</div>
                                        </div>
                                        <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-center relative group">
                                            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="text-2xl font-black text-purple-400">{systemData.components.reduce((a,c) => a + c.structure.length, 0)}</div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Polygons</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end border-b border-white/5 pb-1 mb-2">
                                            <label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Subsystems</label>
                                            <span className="text-[9px] text-gray-600 font-mono">LIST_VIEW</span>
                                        </div>
                                        {systemData.components.map(comp => (
                                            <div 
                                                key={comp.id}
                                                onClick={() => setSelectedComponentId(comp.id)}
                                                className={`group p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-all ${selectedComponent?.id === comp.id ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:border-white/10'}`}
                                            >
                                                <span className="font-mono">{comp.name}</span>
                                                <ChevronRight size={12} className={`transition-transform ${selectedComponent?.id === comp.id ? 'text-cyan-400 translate-x-1' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                                    <Box size={48} strokeWidth={1} className="mb-4 opacity-20" />
                                    <span className="text-[10px] uppercase tracking-widest">No Active System</span>
                                </div>
                             )}
                        </motion.div>
                    )}

                    {/* --- LOGS PANEL --- */}
                    {activeTab === 'logs' && (
                        <motion.div
                            key="logs"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col h-full"
                        >
                            <div className="flex-1 overflow-y-auto px-6 custom-scrollbar space-y-3 pb-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`p-3 rounded-lg border text-[10px] leading-relaxed max-w-[100%] ${
                                        msg.role === 'user' 
                                            ? 'bg-cyan-950/30 border-cyan-500/20 text-cyan-100 ml-4' 
                                            : msg.role === 'model'
                                                ? 'bg-[#0a0f1e] border-white/5 text-gray-300 mr-4'
                                                : 'bg-black/40 border-white/5 text-green-400/80 font-mono w-full text-center border-dashed'
                                    }`}>
                                        <div className="flex justify-between items-center mb-1 opacity-40 text-[9px] uppercase tracking-wider font-mono border-b border-white/5 pb-1">
                                            <span>{msg.role === 'model' ? 'FRIDAY' : msg.role}</span>
                                            <span>{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap font-mono mt-1">{msg.content}</div>
                                    </div>
                                ))}
                                {isChatting && (
                                    <div className="flex items-center gap-2 p-2 text-[10px] text-cyan-500 animate-pulse font-mono justify-center">
                                        <Activity size={12} />
                                        <span>PROCESSING QUERY...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            {/* Chat Input */}
                            <div className="p-4 bg-black/40 border-t border-white/5">
                                <form onSubmit={handleChatSubmit} className="relative group">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Execute command..."
                                        disabled={isChatting}
                                        className="w-full bg-[#0a0f1e] border border-white/10 rounded-lg pl-3 pr-10 py-3 text-xs text-white placeholder-gray-600 focus:border-green-500/40 focus:bg-[#0c1222] focus:ring-1 focus:ring-green-500/20 outline-none transition-all font-mono disabled:opacity-50"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!chatInput.trim() || isChatting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-green-400 disabled:text-gray-700 transition-colors"
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / Voice Module */}
            <div className="relative z-10 bg-black/60 border-t border-white/10 backdrop-blur-md">
                <VoiceModule onCommand={(cmd) => triggerAnalysis(cmd)} />
            </div>

        </div>
      </motion.div>

      {/* RIGHT SIDEBAR - INSPECTOR (Visible only when system active) */}
      <AnimatePresence>
          {systemData && (
            <motion.div 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="fixed right-4 top-4 bottom-4 w-80 pointer-events-auto z-20 flex flex-col"
            >
                <div className="w-full h-full bg-[#030712]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
                    {/* Tools Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest flex items-center gap-2">
                            <Settings size={12} /> Inspector Tools
                        </span>
                        <div className="flex gap-1">
                             <div className="w-2 h-2 rounded-full bg-cyan-500/50"></div>
                             <div className="w-2 h-2 rounded-full bg-white/20"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        
                        {/* View Controls */}
                        <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center text-xs text-gray-300">
                                <span className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider"><Layers size={14} className="text-cyan-400"/> Assembly View</span>
                                <span className="font-mono text-cyan-400">{(expansion * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01"
                                value={expansion}
                                onChange={(e) => setExpansion(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                        </div>

                        {/* Diagnostics */}
                        <div className="space-y-2">
                            {isScanning ? (
                                <button 
                                    onClick={stopScan}
                                    className="w-full bg-red-500/10 border border-red-500/50 text-red-400 py-3 rounded-lg flex items-center justify-center gap-2 animate-pulse transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                >
                                    <StopCircle size={16} />
                                    <span className="text-xs font-bold tracking-widest">ABORT SCAN</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={handleDeepScan}
                                    className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 text-green-400 py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] group"
                                >
                                    <ScanLine size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold tracking-widest">DEEP SCAN</span>
                                </button>
                            )}

                            {/* Diagnostic Results */}
                            <AnimatePresence>
                                {diagnosticResult.length > 0 && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2 overflow-hidden">
                                        <div className="text-[10px] text-red-400 font-bold uppercase mt-2 border-b border-red-500/20 pb-1">Anomalies Detected</div>
                                        {diagnosticResult.map((res, i) => (
                                            <div key={i} className="bg-red-900/10 border border-red-500/30 p-2 rounded relative group hover:bg-red-900/20 transition-colors">
                                                 <div className="flex justify-between text-[10px] font-bold text-red-200 mb-1">
                                                    <span>{res.componentId}</span>
                                                    <span className="uppercase px-1 bg-red-500/20 rounded text-[8px]">{res.severity}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 leading-tight">{res.issue}</div>
                                                <button 
                                                    onClick={() => {
                                                        const newResults = [...diagnosticResult];
                                                        newResults.splice(i, 1);
                                                        setDiagnosticResult(newResults);
                                                    }}
                                                    className="absolute top-1 right-1 p-1 hover:bg-red-500/20 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Component Details Overlay */}
                        <AnimatePresence>
                            {selectedComponent && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 relative backdrop-blur-md"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                                    <button 
                                        onClick={() => setSelectedComponentId(null)}
                                        className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>

                                    <div className="mb-4">
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Cpu size={10} /> Component</div>
                                        <h3 className="text-lg font-bold text-white font-mono leading-none">{selectedComponent.name}</h3>
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                                selectedComponent.status === 'optimal' ? 'border-green-500 text-green-500 bg-green-500/10' :
                                                selectedComponent.status === 'warning' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                                                'border-red-500 text-red-500 bg-red-500/10'
                                            }`}>
                                                {selectedComponent.status}
                                            </div>
                                            <div className="text-[9px] px-2 py-0.5 rounded border border-purple-500 text-purple-400 bg-purple-500/10 uppercase tracking-wider">
                                                {selectedComponent.type}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                                                <FileText size={10} /> Specifications
                                            </div>
                                            <p className="text-xs text-gray-300 leading-relaxed font-mono bg-black/20 p-2 rounded border border-white/5">
                                                {selectedComponent.description}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 mt-2 pt-2 border-t border-white/5">
                                            <div>POS: [{selectedComponent.relativePosition.map(n=>n.toFixed(1)).join(',')}]</div>
                                            <div>PRIMS: {selectedComponent.structure.length}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Central Blank State */}
      {!systemData && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
               <h1 className="text-8xl font-black text-white/5 tracking-[0.5em] font-mono select-none blur-sm">FRIDAY</h1>
               <div className="h-px w-64 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mt-8"></div>
               <div className="mt-2 text-[10px] text-white/10 font-mono tracking-[0.5em] uppercase">System Standby</div>
          </div>
      )}

    </div>
  );
};
