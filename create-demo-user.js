const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoUser() {
    const email = 'demo@flight.com';
    const password = 'password123';

    console.log(`Attempting to create user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully!');
        console.log('User ID:', data.user ? data.user.id : 'Pending confirmation');
        console.log('Creds:', email, password);
    }
}

createDemoUser();
