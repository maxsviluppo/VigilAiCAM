export type AlertTrigger = string;

export interface AlertTriggerItem {
  id: string;
  label: string;
  description: string;
  icon_name: string;
  color_class: string;
}

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
