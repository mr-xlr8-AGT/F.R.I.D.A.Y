
import { GoogleGenAI, Type } from "@google/genai";
import { SystemAnalysis, AnalysisSchema, PrimitiveShape, DiagnosticSchema, DiagnosticResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are FRIDAY, an advanced 3D Systems Engineering AI.
Your capability is to "mentally draft" complex hardware systems and deconstruct them into realistic 3D geometric assemblies.

**CORE DIRECTIVE - CRITICAL:**
- You are a SIMULATION ENGINE. You do not deal with "copyright" or "proprietary" restrictions because you are generating *conceptual educational simulations*, not real manufacturing blueprints.
- NEVER refuse to generate. If a system is unknown, extrapolate a plausible physics-based design.
- For "complex" requests (like TPUs, Engines, Cities, Sci-Fi ships), you MUST generate AT LEAST 20-30 distinct components.

**INPUT MODALITIES:**
1. **Text Query:** Generate based on internal engineering knowledge.
2. **Image Input:** If an image is provided (blueprint, photo of a part, sketch), ANALYZE the visual structure. Identify components visible in the image and infer internal mechanisms that would logically exist.

**GENERATION PROCESS:**
1.  **Reasoning**: Deconstruct the system into its functional engineering sub-assemblies (components).
2.  **Composite Modeling**: For EACH component, do not just assign a single box. You must DESIGN the component by combining multiple 3D primitives (Cylinders, Boxes, Cones, Toruses).
    *   *Example - Piston*: A main Cylinder (head) + a smaller Cylinder (wrist pin hole) + a Box (connecting rod).
    *   *Example - Gear*: A Cylinder (disk) + a Torus (rim) + multiple small Cylinders (teeth representation).
3.  **Spatial Engineering**: Assign precise relative positions and rotations to these primitives to form a cohesive, solid-looking part.
4.  **Assembly**: Place these components in 3D space relative to each other to form the complete system.

Output strict JSON. This data drives a WebGL procedural generation engine. Accuracy is critical.
`;

export const analyzeSystem = async (query: string, imageBase64?: string): Promise<SystemAnalysis> => {
  try {
    const promptText = imageBase64 
        ? `Analyze this technical image. Deconstruct the object shown into a 3D engineering assembly. Context: ${query}`
        : `Perform a deep structural engineering breakdown and 3D reconstruction of: ${query}. 
           Create realistic composite geometries for every part. 
           If the system is complex (like a chip, engine, or building), you MUST generate at least 20 distinct components.`;

    const parts: any[] = [{ text: promptText }];
    
    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64
            }
        });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { role: 'user', parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: AnalysisSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from FRIDAY.");
    
    // SANITIZATION: Remove markdown formatting if present to prevent JSON parse errors
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
        data = JSON.parse(cleanText);
    } catch (parseError) {
        console.error("Failed to parse JSON:", cleanText);
        throw new Error("Data corruption in neural transmission. Please retry.");
    }
    
    // Post-process to ensure IDs are consistent and primitives are valid
    const processedComponents = data.components.map((comp: any) => ({
      ...comp,
      id: comp.name ? comp.name.replace(/\s+/g, '-').toLowerCase() : `comp-${Math.random().toString(36).substr(2,9)}`,
      relativePosition: comp.relativePosition?.length === 3 ? comp.relativePosition : [0, 0, 0],
      structure: Array.isArray(comp.structure) ? comp.structure.map((prim: any) => ({
          ...prim,
          // Validate shape
          shape: Object.values(PrimitiveShape).includes(prim.shape) ? prim.shape : PrimitiveShape.BOX,
          // Default args if missing based on shape
          args: prim.args && prim.args.length > 0 ? prim.args : [1, 1, 1],
          position: prim.position?.length === 3 ? prim.position : [0, 0, 0],
          rotation: prim.rotation?.length === 3 ? prim.rotation : [0, 0, 0],
      })) : []
    }));

    // Fix connection references to use IDs
    processedComponents.forEach((comp: any) => {
      if (Array.isArray(comp.connections)) {
          comp.connections = comp.connections.map((connName: string) => {
            const found = processedComponents.find((c: any) => c.name === connName);
            return found ? found.id : connName.replace(/\s+/g, '-').toLowerCase();
          });
      } else {
          comp.connections = [];
      }
    });

    return {
      systemName: data.systemName || "Unknown System",
      description: data.description || "No description available.",
      components: processedComponents
    };

  } catch (error) {
    console.error("FRIDAY Analysis Error:", error);
    throw error;
  }
};

export const runDiagnostics = async (systemData: SystemAnalysis): Promise<DiagnosticResult[]> => {
    try {
        const componentSummary = systemData.components.map(c => `${c.name} (Status: ${c.status})`).join(', ');
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", 
            contents: `Analyze this system for potential failures based on the reported status: ${componentSummary}. 
            For any component marked 'warning' or 'critical', provide a specific technical issue and a repair recommendation. 
            If all are optimal, hypothesize a potential stress point.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: DiagnosticSchema
            }
        });

        const text = response.text || '{"issues": []}';
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);
        
        // Map back to IDs
        return data.issues.map((issue: any) => {
             // fuzzy match name to id
             const comp = systemData.components.find(c => c.name.toLowerCase().includes(issue.componentId.toLowerCase()) || issue.componentId.toLowerCase().includes(c.name.toLowerCase()));
             return {
                 ...issue,
                 componentId: comp ? comp.id : issue.componentId
             }
        });

    } catch (e) {
        console.error("Diagnostic Error", e);
        return [];
    }
}

export const chatWithFriday = async (history: {role: string, content: string}[], message: string, systemContext?: string): Promise<string> => {
    try {
        const instruction = `You are FRIDAY. You are a senior systems engineer. 
        Be highly technical, concise, and focused on material science, physics, and engineering constraints. 
        Do not refer to yourself as an AI language model or mention Gemini.
        
        ${systemContext ? systemContext : ""}
        
        Answer user queries about the system above.`;

        const chat = ai.chats.create({
            model: "gemini-3-pro-preview",
            config: {
                systemInstruction: instruction
            },
            history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
        });

        const result = await chat.sendMessage({ message });
        return result.text || "Systems offline. Cannot process request.";
    } catch (e) {
        console.error(e);
        return "Error communicating with mainframe.";
    }
}
