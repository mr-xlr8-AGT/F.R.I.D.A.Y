
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

const generateSystemTool: FunctionDeclaration = {
    name: "generate_system",
    description: "Generates a 3D engineering model and simulation of the requested system.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            system_description: {
                type: Type.STRING,
                description: "The name or description of the system to generate (e.g., 'warp drive', 'V8 engine', 'robot arm')."
            }
        },
        required: ["system_description"]
    }
};

export const useLiveSession = (onCommand?: (cmd: string) => void) => {
    const [isConnected, setIsConnected] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState({ input: 0, output: 0 });
    const [error, setError] = useState<string | null>(null);

    // Refs for state tracking across async operations
    const volumeRef = useRef({ input: 0, output: 0 });
    const isMutedRef = useRef(false);
    
    // Core Session State Refs
    const isReadyRef = useRef(false); 
    const shouldBeConnectedRef = useRef(false); // Tracks user intent
    const activeSessionRef = useRef<any>(null); // Stores the actual Gemini Session object
    const retryCountRef = useRef(0);
    
    // Audio Resources
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
    const nextStartTimeRef = useRef<number>(0);
    const isPlayingRef = useRef(false);
    const rafIdRef = useRef<number | null>(null);

    // Analyzers
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const disconnect = useCallback(() => {
        console.log("Closing Voice Session...");
        shouldBeConnectedRef.current = false;
        isReadyRef.current = false;
        
        // 1. Close Gemini Session Explicitly
        if (activeSessionRef.current) {
            try {
                // Remove listeners if possible or just close
                activeSessionRef.current.close();
            } catch (e) {
                console.warn("Error closing Gemini socket:", e);
            }
            activeSessionRef.current = null;
        }

        // 2. Reset UI State
        setIsConnected(false);
        setVoiceState('idle');
        setVolume({ input: 0, output: 0 });
        volumeRef.current = { input: 0, output: 0 };
        
        // 3. Clean up Audio Loop
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        // 4. Close Audio Nodes
        if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch(e){}
            processorRef.current = null;
        }
        if (inputSourceRef.current) {
            try { inputSourceRef.current.disconnect(); } catch(e){}
            inputSourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                if (audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
            } catch(e) { /* ignore */ }
            audioContextRef.current = null;
        }
        
        // 5. Clear Audio Queue
        audioQueueRef.current.forEach(source => {
            try { source.stop(); } catch(e){}
        });
        audioQueueRef.current = [];
        
        isPlayingRef.current = false;
        nextStartTimeRef.current = 0;
    }, []);

    const connect = useCallback(async () => {
        // Prevent double connection attempts
        if (shouldBeConnectedRef.current) return;

        console.log("Initializing Voice Session...");
        setError(null);
        setIsMuted(false);
        shouldBeConnectedRef.current = true;
        retryCountRef.current = 0;

        const attemptConnection = async () => {
            if (!shouldBeConnectedRef.current) return;

            try {
                // CRITICAL FIX: Instantiate a FRESH client for every connection attempt.
                // Reusing the client can cause state caching issues on reconnect.
                const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

                // 1. Setup Audio Contexts
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass({ sampleRate: 24000 }); 
                audioContextRef.current = audioCtx;
                
                // Wait for context to be running (browsers sometimes suspend it)
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                // 2. Setup Analyzers
                const inputAnalyser = audioCtx.createAnalyser();
                inputAnalyser.fftSize = 64;
                inputAnalyser.smoothingTimeConstant = 0.5;
                inputAnalyserRef.current = inputAnalyser;

                const outputAnalyser = audioCtx.createAnalyser();
                outputAnalyser.fftSize = 64;
                outputAnalyser.smoothingTimeConstant = 0.5;
                outputAnalyserRef.current = outputAnalyser;
                outputAnalyser.connect(audioCtx.destination);

                // 3. Get Microphone
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true,
                        autoGainControl: true,
                        noiseSuppression: true
                    }
                });
                
                // If user cancelled during mic request
                if (!shouldBeConnectedRef.current) {
                    stream.getTracks().forEach(t => t.stop());
                    audioCtx.close();
                    return;
                }
                
                mediaStreamRef.current = stream;

                // 4. Input Pipeline
                const micSource = audioCtx.createMediaStreamSource(stream);
                inputSourceRef.current = micSource;
                
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                micSource.connect(inputAnalyser); 
                micSource.connect(processor);
                
                // Mute local feedback loop
                const muteNode = audioCtx.createGain();
                muteNode.gain.value = 0;
                processor.connect(muteNode);
                muteNode.connect(audioCtx.destination);

                // 5. Connect to Gemini Live
                const sessionPromise = client.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                        },
                        systemInstruction: `You are FRIDAY, an advanced AI systems architect.
                        You have FULL ACCESS to a 3D visualization engine.
                        
                        PROTOCOL FOR GENERATION REQUESTS:
                        1. When the user asks to "generate", "show", "visualize", or "create" something (e.g., "TPU", "Engine", "Warp Drive"):
                           - You MUST use the 'generate_system' tool.
                           - Do NOT apologize or say you cannot generate images. You CAN generate 3D models via the tool.
                           - If the request is for proprietary tech (like "Google TPU" or "Nvidia GPU") or fictional items, you MUST NOT REFUSE. Instead, assume the persona of an engineer drafting a "conceptual simulation" based on public knowledge.
                           - Acknowledge the command with technical brevity (e.g. "Compiling schematic for TPU structure...") and trigger the tool immediately.
                        
                        2. GENERAL BEHAVIOR:
                           - Never end the conversation.
                           - Speak English only.
                           - Be professional, technical, and concise.
                        `,
                        tools: [{ functionDeclarations: [generateSystemTool] }]
                    },
                    callbacks: {
                        onopen: () => {
                            // Race condition check
                            if (!shouldBeConnectedRef.current) {
                                console.log("Connection established after disconnect requested. Closing...");
                                sessionPromise.then(s => s.close());
                                return;
                            }
                            
                            console.log("Voice Session Established");
                            setIsConnected(true);
                            setVoiceState('listening');
                            
                            // Warm-up to prevent initial packet loss/error
                            setTimeout(() => {
                                if (shouldBeConnectedRef.current) {
                                    isReadyRef.current = true;
                                }
                            }, 500);
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            if (!shouldBeConnectedRef.current) return;

                            if (msg.serverContent?.turnComplete) {
                                if (!isPlayingRef.current) setVoiceState('listening');
                            }

                            // Handle Audio
                            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (audioData) {
                                setVoiceState('speaking');
                                isPlayingRef.current = true;
                                
                                const binaryString = atob(audioData);
                                const len = binaryString.length;
                                const bytes = new Uint8Array(len);
                                for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                                
                                const int16 = new Int16Array(bytes.buffer);
                                const float32 = new Float32Array(int16.length);
                                for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

                                const buffer = audioCtx.createBuffer(1, float32.length, 24000);
                                buffer.getChannelData(0).set(float32);
                                
                                const source = audioCtx.createBufferSource();
                                source.buffer = buffer;
                                source.connect(outputAnalyser);

                                const now = audioCtx.currentTime;
                                const startTime = Math.max(now, nextStartTimeRef.current);
                                source.start(startTime);
                                nextStartTimeRef.current = startTime + buffer.duration;
                                
                                audioQueueRef.current.push(source);
                                source.onended = () => {
                                    const idx = audioQueueRef.current.indexOf(source);
                                    if (idx > -1) audioQueueRef.current.splice(idx, 1);
                                    if (audioQueueRef.current.length === 0) {
                                        isPlayingRef.current = false;
                                        setVoiceState('listening');
                                        nextStartTimeRef.current = audioCtx.currentTime;
                                    }
                                };
                            }

                            // Handle Tool Call
                            if (msg.toolCall) {
                                for (const fc of msg.toolCall.functionCalls) {
                                    if (fc.name === 'generate_system') {
                                        const desc = fc.args['system_description'] as string;
                                        console.log("Tool Call: generate_system", desc);
                                        if (onCommand) onCommand(desc);

                                        sessionPromise.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "ok, system generation started" }
                                                }
                                            });
                                        });
                                    }
                                }
                            }
                        },
                        onclose: (e) => {
                             console.log("Session Closed", e);
                             if (shouldBeConnectedRef.current) {
                                 // If closed unexpectedly, treat as error/disconnect
                                 disconnect();
                             }
                        },
                        onerror: (err) => {
                            // Only report errors if we intended to stay connected
                            if (shouldBeConnectedRef.current) {
                                console.error("Session Error:", err);
                                // Retry logic for service unavailable
                                if (retryCountRef.current < 3) {
                                    console.log(`Retrying connection... Attempt ${retryCountRef.current + 1}`);
                                    retryCountRef.current += 1;
                                    
                                    // Soft reset
                                    isReadyRef.current = false;
                                    setTimeout(() => {
                                        disconnect(); // Cleanup partial state
                                        shouldBeConnectedRef.current = true; // Re-enable intent
                                        attemptConnection(); // Retry
                                    }, 1000);
                                } else {
                                    setError("System Unreachable");
                                    disconnect();
                                }
                            }
                        }
                    }
                });

                // Capture the session object when promise resolves
                sessionPromise.then(sess => {
                    if (shouldBeConnectedRef.current) {
                        activeSessionRef.current = sess;
                    } else {
                        // If we disconnected while waiting for promise, close immediately
                        sess.close();
                    }
                }).catch(e => {
                    if (shouldBeConnectedRef.current) {
                         console.error("Connection failed:", e);
                         // Retry logic here as well for initial connection failures
                         if (retryCountRef.current < 3) {
                             retryCountRef.current += 1;
                             setTimeout(attemptConnection, 1000);
                         } else {
                             setError("Connection Failed");
                             disconnect();
                         }
                    }
                });

                // 6. Audio Send Loop
                processor.onaudioprocess = (e) => {
                    if (isMutedRef.current || !isReadyRef.current || !shouldBeConnectedRef.current) return; 

                    const inputData = e.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) {
                        int16[i] = inputData[i] * 32768;
                    }
                    
                    const bytes = new Uint8Array(int16.buffer);
                    let binary = '';
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                    const base64 = btoa(binary);

                    // Send to the *active* session if available
                    if (activeSessionRef.current) {
                        try {
                            activeSessionRef.current.sendRealtimeInput({
                                media: {
                                    mimeType: `audio/pcm;rate=${audioCtx.sampleRate}`,
                                    data: base64
                                }
                            });
                        } catch(err) {
                            // Ignore
                        }
                    }
                };
                
                // 7. Volume Animation Loop
                let frameCount = 0;
                const updateVolume = () => {
                    if (!audioContextRef.current) return;
                    
                    let inVol = 0;
                    let outVol = 0;

                    if (inputAnalyserRef.current) {
                        const data = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
                        inputAnalyserRef.current.getByteFrequencyData(data);
                        inVol = data.reduce((a,b)=>a+b,0) / data.length / 255;
                    }
                    
                    if (outputAnalyserRef.current) {
                        const data = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
                        outputAnalyserRef.current.getByteFrequencyData(data);
                        outVol = data.reduce((a,b)=>a+b,0) / data.length / 255;
                    }
                    
                    if (isMutedRef.current) inVol = 0;
                    volumeRef.current = { input: inVol, output: outVol };
                    
                    frameCount++;
                    if (frameCount % 5 === 0) setVolume({ input: inVol, output: outVol });
                    
                    rafIdRef.current = requestAnimationFrame(updateVolume);
                };
                updateVolume();

            } catch (e) {
                console.error("Initialization Error", e);
                if (shouldBeConnectedRef.current) {
                    setError("System Malfunction");
                    disconnect();
                }
            }
        };

        attemptConnection();

    }, [disconnect, onCommand]); // Removed 'ai' from dependency array since we instantiate locally

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Force disconnect on unmount
            disconnect();
        };
    }, []);

    return { connect, disconnect, isConnected, voiceState, volume, volumeRef, error, isMuted, toggleMute };
};
