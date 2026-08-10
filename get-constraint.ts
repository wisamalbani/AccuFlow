import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
async function run() {
  const { data, error } = await supabase.rpc('get_table_constraints', { table_name: 'wallet_transactions' });
  if (error) {
     console.log("No rpc, let's just insert one with bad value and it will show");
     const {error} = await supabase.from("wallet_transactions").insert([{ main_id: 11, amount: 0, type: "invalid" }]);
     console.log(error);
  } else {
    console.log(data);
  }
}
run();
