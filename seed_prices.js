const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('Seeding egg_prices...');

    const initialPrices = [
        { grade: 'market', price_per_kg: 180.00 },
        { grade: 'retail', price_per_kg: 210.00 },
        { grade: 'powder', price_per_kg: 150.00 }
    ];

    for (const p of initialPrices) {
        const { error } = await supabase
            .from('egg_prices')
            .upsert(p, { onConflict: 'grade' });

        if (error) console.error(`Error seeding ${p.grade}:`, error);
        else console.log(`Seeded ${p.grade}`);
    }
}

seed();
