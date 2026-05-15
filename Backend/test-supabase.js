const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('candidates').select('id').limit(1);
        if (error) {
            console.error('Candidates Table Error:', error);
        } else {
            console.log('Success! Candidates connection established. Found', data.length, 'candidates.');
        }

        console.log('Testing Districts table...');
        const { data: dData, error: dError } = await supabase.from('districts').select('name').limit(1);
        if (dError) {
            console.error('Districts Table Error:', dError);
        } else {
            console.log('Success! Districts connection established.');
        }
    } catch (err) {
        console.error('System Error:', err.message);
    }
}

test();
