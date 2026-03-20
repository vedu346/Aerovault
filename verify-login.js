const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLogin() {
    const email = 'demo@flight.com';
    const password = 'password123';

    console.log(`Testing login for: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Login FAILED:', error.message);
    } else {
        console.log('Login SUCCESS!');
        console.log('User ID:', data.user.id);
        console.log('Email Confirmed At:', data.user.email_confirmed_at);
    }
}

verifyLogin();
