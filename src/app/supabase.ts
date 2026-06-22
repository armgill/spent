import { createClient } from "@supabase/supabase-js";

// The anon key is safe to expose in client code — it is protected by the
// Row Level Security policies defined in db/schema.sql.
const SUPABASE_URL = "https://sdqlbcbypwavixnmxisu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcWxiY2J5cHdhdml4bm14aXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDY0MzAsImV4cCI6MjA5NzcyMjQzMH0.OiHE-56HBoJSVCGx-dwcctUWd_atp8cSOBOnBGVBBEQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
