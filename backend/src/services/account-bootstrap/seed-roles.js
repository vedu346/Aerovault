const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({
    path: path.resolve(__dirname, '../../../../.env.local'),
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    // 1. Create Admin
    let { data: adminData, error: adminErr } = await supabase.auth.signUp({
        email: 'admin@skywings.com',
        password: 'AdminPassword123!',
        options: { data: { role: 'admin' } }
    });
    if (adminErr && adminErr.status !== 422) console.error('Admin Error:', adminErr);
    else console.log('Admin signed up');

    // 2. Create Airline 1
    let { data: a1, error: a1Err } = await supabase.auth.signUp({
        email: 'emirates@skywings.com',
        password: 'AirlinePassword123!',
        options: { data: { role: 'airline_admin' } }
    });
    if (a1Err && a1Err.status !== 422) console.error('Emirates Error:', a1Err);
    else console.log('Emirates signed up');

    // 3. Create Airline 2
    let { data: a2, error: a2Err } = await supabase.auth.signUp({
        email: 'delta@skywings.com',
        password: 'AirlinePassword123!',
        options: { data: { role: 'airline_admin' } }
    });
    if (a2Err && a2Err.status !== 422) console.error('Delta Error:', a2Err);
    else console.log('Delta signed up');
}

run();
