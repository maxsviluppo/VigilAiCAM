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
