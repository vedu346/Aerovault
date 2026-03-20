const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAccounts() {
    const accounts = [
        { email: 'admin@flight.com', password: 'password123', fullName: 'Main Admin' },
        { email: 'delta@flight.com', password: 'password123', fullName: 'Delta Airlines' },
        { email: 'united@flight.com', password: 'password123', fullName: 'United Airlines' },
        { email: 'demo@flight.com', password: 'password123', fullName: 'Demo User' }, // Ensure normal user exists
    ];

    for (const acc of accounts) {
        console.log(`Setting up account: ${acc.email}...`);
        const { data, error } = await supabase.auth.signUp({
            email: acc.email,
            password: acc.password,
            options: {
                data: { full_name: acc.fullName }
            }
        });

        if (error) {
            console.error(`  Error creating ${acc.email}:`, error.message);
        } else {
            console.log(`  Success for ${acc.email} | ID:`, data.user?.id || 'Already exists/Pending');
        }
    }
}

setupAccounts();
