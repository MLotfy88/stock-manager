import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read Supabase credentials from .env or environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration file
const migrationPath = join(__dirname, 'migrations', 'add_gtin_product_mapping.sql');
console.log(`📄 Reading migration file: ${migrationPath}`);

let migrationSQL;
try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded successfully');
} catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
}

// Execute the migration
console.log('🚀 Running migration...\n');
console.log('─'.repeat(60));

try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
        // If exec_sql doesn't exist, try direct SQL execution
        console.log('⚠️  exec_sql not found, trying direct execution...');

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);

            const { error: stmtError } = await supabase.rpc('exec_sql', {
                query: statement
            });

            if (stmtError) {
                throw stmtError;
            }

            console.log(`✅ Statement ${i + 1} executed successfully`);
        }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\n🎉 The gtin_product_mapping table has been created.');
    console.log('🎉 Your invoice entry system is now ready to use!');

} catch (error) {
    console.log('\n' + '─'.repeat(60));
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Copy the SQL from migrations/add_gtin_product_mapping.sql');
    console.error('   and run it in Supabase Dashboard > SQL Editor');
    process.exit(1);
}
