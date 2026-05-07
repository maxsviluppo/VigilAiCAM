export type AlertTrigger = 
  | "intrusion" 
  | "violence" 
  | "fire" 
  | "smoke" 
  | "safety_gear" 
  | "fall";

export type ZoneType = "restricted" | "alert" | "privacy" | "excluded";

export interface Point {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

export interface Zone {
  id: string;
  type: ZoneType;
  points: Point[];
  label?: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  type: "webcam" | "ip" | "browser" | "onvif";
  url?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  rtspPath?: string;
  zones?: Zone[];
  status: "online" | "offline";
  enabledTriggers: AlertTrigger[];
}

export interface Incident {
  id: string;
  timestamp: Date;
  cameraId: string;
  cameraName: string;
  description: string;
  threatLevel: "low" | "medium" | "high";
  screenshot?: string;
}
