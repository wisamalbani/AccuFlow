import express from "express";
import { getSupabase } from "../db";

const router = express.Router();

// Get Attachments for a Client
router.post("/api/attachments/get", async (req, res) => {
  const { auth, clientId } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check access
    const { data: clientRecord } = await supabase.from("clients").select("main_id").eq("client_id", clientId);
    if (!clientRecord || clientRecord.length === 0) return res.status(404).json({ success: false, message: "العميل غير موجود." });
    const client = clientRecord[0];

    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(client.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", clientId)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك." });
      }
    }

    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, attachments: attachments || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;
