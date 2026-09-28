import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Camera } from "../src/types";
import { mapDbCamera, toDbCameraRecord } from "../src/utils/cameraNetwork";

export function getSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_URL non configurati");
  }
  return createClient(supabaseUrl, serviceKey);
}

export async function listAdminUserCameras(userId: string): Promise<Camera[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cameras")
    .select("*")
    .eq("user_id", userId)
    .order("order", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => mapDbCamera(row as Record<string, unknown>));
}

export async function updateAdminUserCamera(
  userId: string,
  cameraId: string,
  patch: Partial<Camera>
): Promise<Camera> {
  const supabase = getSupabaseServiceClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("cameras")
    .select("*")
    .eq("id", cameraId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error("Telecamera non trovata per questo utente");

  const current = mapDbCamera(existing as Record<string, unknown>);
  const merged: Camera = {
    ...current,
    ...patch,
    id: current.id,
    enabledTriggers: patch.enabledTriggers ?? current.enabledTriggers,
    triggerSchedules: patch.triggerSchedules ?? current.triggerSchedules,
    zones: patch.zones ?? current.zones,
  };

  const record = toDbCameraRecord(merged, userId);
  delete record.user_id;

  const { data: updated, error: updateErr } = await supabase
    .from("cameras")
    .update(record)
    .eq("id", cameraId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return mapDbCamera(updated as Record<string, unknown>);
}

export interface AdminUserEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  description: string;
  threatLevel: "high" | "medium" | "low";
  screenshot: string | null;
  createdAt: string;
}

export interface AdminUserOverview {
  user: {
    id: string;
    email: string;
    companyName: string;
    notificationEmails: string[];
  };
  events: AdminUserEvent[];
}

export async function getUserOverview(userId: string): Promise<AdminUserOverview> {
  const supabase = getSupabaseServiceClient();

  // 1. Dati utente e metadati
  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !userData?.user) {
    throw new Error(userErr?.message || "Utente non trovato");
  }

  const u = userData.user;
  const meta = u.user_metadata || {};
  let notifEmails: string[] = [];
  if (Array.isArray(meta.notification_emails)) {
    notifEmails = meta.notification_emails.filter((e: any) => typeof e === "string" && e.trim());
  } else if (typeof meta.notification_emails === "string" && meta.notification_emails.trim()) {
    notifEmails = meta.notification_emails.split(",").map((e: string) => e.trim()).filter(Boolean);
  } else if (u.email) {
    notifEmails = [u.email];
  }

  const companyName = meta.company_name || (u.email ? u.email.split("@")[0].toUpperCase() : "Azienda");

  // 2. Ultimi 5 eventi registrati nella tabella 'alerts'
  let events: AdminUserEvent[] = [];
  try {
    const { data: alertRows } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (alertRows && Array.isArray(alertRows)) {
      events = alertRows.map((row: any) => {
        let camName = "Camera";
        let desc = row.description || "Evento registrato";
        const match = desc.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          camName = match[1];
          desc = match[2];
        }
        return {
          id: row.id || Math.random().toString(36).slice(2),
          cameraId: row.camera_id || "",
          cameraName: camName,
          description: desc,
          threatLevel: (row.threat_level as any) || "high",
          screenshot: row.screenshot || null,
          createdAt: row.created_at || new Date().toISOString()
        };
      });
    }
  } catch (e: any) {
    console.warn("[AdminUserCameras] Impossibile recuperare eventi alerts:", e.message);
  }

  return {
    user: {
      id: u.id,
      email: u.email || "",
      companyName,
      notificationEmails: notifEmails
    },
    events
  };
}

export async function updateUserNotificationEmails(
  userId: string,
  emails: string[]
): Promise<string[]> {
  const supabase = getSupabaseServiceClient();

  const sanitized = Array.from(
    new Set(
      emails
        .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
        .filter((e) => e.includes("@") && e.includes("."))
    )
  );

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !userData?.user) {
    throw new Error(userErr?.message || "Utente non trovato");
  }

  const existingMeta = userData.user.user_metadata || {};
  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMeta,
      notification_emails: sanitized
    }
  });

  if (updateErr) throw new Error(updateErr.message);
  return sanitized;
}

