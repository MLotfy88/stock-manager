
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
    console.log(`\nInspecting table: ${tableName}`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`Error inspecting ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('Table is empty or no data returned. Cannot infer columns easily via select *.');
        // Try to insert a dummy to get error? No, that's risky.
        // If empty, we can't see columns via JS client select * easily without data.
        // But we can try to select specific columns we expect.
    }
}

async function main() {
    await inspectTable('supply_types');
    await inspectTable('product_definitions');
    await inspectTable('inventory_items');
}

main();
