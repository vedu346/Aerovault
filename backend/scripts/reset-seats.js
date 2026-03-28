import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSeats() {
  console.log("Resetting all flight seats...");
  
  // Since 'flight_seats' represents locks/bookings, resetting means deleting them
  // Or if it was a boolean, updating them. Our schema relies on row presence.
  const { data, error } = await supabase
    .from('flight_seats')
    .delete()
    .neq('flight_id', '00000000-0000-0000-0000-000000000000'); // delete all
    
  if (error) {
    console.error("Error resetting seats:", error);
  } else {
    console.log("Seats successfully reset! All seats are now available.");
  }
}

resetSeats();
