import { getSupabase } from "./db";

export async function logAudit(
  userId: any,
  userRole: string,
  action: string,
  tableName: string | null,
  recordId: any,
  oldValues: any,
  newValues: any
) {
  try {
    const supabase = getSupabase();
    await supabase.from("audit_log").insert([
      {
        user_id: userId ? parseInt(userId) : null,
        user_role: userRole || "unknown",
        action: action,
        table_name: tableName,
        record_id: recordId ? parseInt(recordId) : null,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("[Audit Log Failed]:", err);
  }
}
