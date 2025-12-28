
import { Type } from "@google/genai";

export enum NodeType {
  COMPUTE = 'COMPUTE',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  SENSOR = 'SENSOR',
  MECHANICAL = 'MECHANICAL',
  POWER = 'POWER',
  UNKNOWN = 'UNKNOWN'
}

export enum PrimitiveShape {
  BOX = 'BOX',
  CYLINDER = 'CYLINDER',
  SPHERE = 'SPHERE',
  CAPSULE = 'CAPSULE',
  CONE = 'CONE',
  TORUS = 'TORUS'
}

export interface GeometricPrimitive {
  shape: PrimitiveShape;
  args: number[]; // [width, height, depth] or [radius, height] etc
  position: [number, number, number]; // Offset from component center
  rotation: [number, number, number]; // Euler rotation [x, y, z]
  colorHex?: string; // Optional override for specific parts (e.g. copper coil vs steel core)
}

export interface SystemComponent {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  details: Record<string, string>;
  connections: string[]; 
  relativePosition: [number, number, number]; // Structural position of the assembly
  structure: GeometricPrimitive[]; // The list of primitives that form this component
  status: 'optimal' | 'warning' | 'critical';
}

export interface SystemAnalysis {
  systemName: string;
  description: string;
  components: SystemComponent[];
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
}

export interface DiagnosticResult {
  componentId: string;
  issue: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CursorState {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  active: boolean;
  mode: 'IDLE' | 'ROTATE' | 'ZOOM' | 'EXPLODE' | 'RESET';
}

// Schema for Gemini JSON output
export const AnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    systemName: { type: Type.STRING },
    description: { type: Type.STRING },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, description: "One of: COMPUTE, STORAGE, NETWORK, SENSOR, MECHANICAL, POWER" },
          relativePosition: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "[x, y, z] coordinates for the center of this component in the global assembly."
          },
          structure: {
            type: Type.ARRAY,
            description: "A list of geometric primitives that combine to form the shape of this component. Use multiple primitives to create complex, realistic engineering shapes.",
            items: {
                type: Type.OBJECT,
                properties: {
                    shape: { type: Type.STRING, description: "BOX, CYLINDER, SPHERE, CAPSULE, CONE, TORUS" },
                    args: { 
                        type: Type.ARRAY, 
                        items: { type: Type.NUMBER },
                        description: "Dimensions. BOX:[w,h,d], CYLINDER:[radTop, radBot, height, seg], SPHERE:[rad], CONE:[rad, height], TORUS:[rad, tube, radSeg, tubSeg]"
                    },
                    position: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                        description: "Local [x,y,z] offset from the component center."
                    },
                    rotation: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                        description: "Local [x,y,z] rotation in radians."
                    },
                    colorHex: { type: Type.STRING, description: "Optional hex color for this specific primitive (e.g., #b87333 for copper)" }
                },
                required: ["shape", "args", "position", "rotation"]
            }
          },
          description: { type: Type.STRING },
          details: { 
            type: Type.OBJECT,
            description: "Key value pairs of technical specs",
            properties: {
               spec1: { type: Type.STRING },
               spec2: { type: Type.STRING }
            }
          },
          connections: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Names of other components this connects to"
          },
          status: { type: Type.STRING, description: "optimal, warning, or critical" }
        },
        required: ["name", "type", "structure", "relativePosition", "description", "connections", "status"]
      }
    }
  },
  required: ["systemName", "description", "components"]
};

export const DiagnosticSchema = {
  type: Type.OBJECT,
  properties: {
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          componentId: { type: Type.STRING },
          issue: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          severity: { type: Type.STRING, description: "low, medium, high" }
        },
        required: ["componentId", "issue", "recommendation", "severity"]
      }
    }
  },
  required: ["issues"]
};
