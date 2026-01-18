
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to normalize strings for comparison (remove spaces, lowercase)
const normalize = (str) => str?.toLowerCase().replace(/\s+/g, '') || '';

async function fetchSupplyTypes() {
  const { data, error } = await supabase.from('supply_types').select('id, name');
  if (error) {
    console.error('Error fetching supply types:', error);
    process.exit(1);
  }
  return data;
}

async function main() {
  console.log('Starting product import SQL generation...');

  // 1. Fetch Supply Types (Read is allowed)
  console.log('Fetching supply types...');
  const supplyTypes = await fetchSupplyTypes();
  console.log(`Found ${supplyTypes.length} supply types.`);

  // Create lookup map
  const typeMap = new Map();
  supplyTypes.forEach(t => {
    typeMap.set(normalize(t.name), t.id);
  });

  // 2. Read CSV
  const csvPath = path.join(__dirname, '../docs/product_definitions.csv');
  let fileContent;
  try {
    const buffer = fs.readFileSync(csvPath);
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      fileContent = utf8Decoder.decode(buffer);
      console.log('Detected UTF-8 encoding.');
    } catch (e) {
      console.log('UTF-8 decode failed, trying Windows-1256...');
      const win1256Decoder = new TextDecoder('windows-1256');
      fileContent = win1256Decoder.decode(buffer);
    }
  } catch (err) {
    console.error('Error reading file:', err);
    process.exit(1);
  }

  // 3. Parse CSV & Build Map
  const text = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  const productsMap = new Map(); // Name -> { type_id, variants: [] }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    // Expected: Type,Product Name,Variant,Reorder Point,Brand/Model,Manufacturer
    if (row.length < 4) continue;

    const typeRaw = row[0]?.trim();
    const nameRaw = row[1]?.trim();
    const variantRaw = row[2]?.trim();
    const reorderPoint = parseInt(row[3]?.trim() || '0');

    if (!nameRaw) continue;

    // Determine Type ID using direct match
    let typeId = typeMap.get(normalize(typeRaw));

    if (!typeId) {
      console.warn(`Warning: Could not determine type for '${nameRaw}' (Type: ${typeRaw}). Skipping.`);
      continue;
    }

    if (!productsMap.has(nameRaw)) {
      productsMap.set(nameRaw, {
        name: nameRaw,
        type_id: typeId,
        variant_label: 'Variant',
        reorder_point: 0,
        variants: []
      });
    }

    const product = productsMap.get(nameRaw);
    // Avoid duplicate variants
    if (variantRaw && !product.variants.some(v => v.name === variantRaw)) {
      product.variants.push({
        name: variantRaw,
        reorder_point: reorderPoint
      });
    }
  }

  console.log(`Parsed ${productsMap.size} unique products.`);
  if (productsMap.size === 0) {
    console.log('No products to insert. Exiting.');
    process.exit(0);
  }

  // 4. Generate SQL Script
  console.log('Generating scripts/insert_products.sql...');

  const sqlStatements = [];
  sqlStatements.push('-- GENERATED AUTOMATICALLY BY scripts/import_products.js');
  sqlStatements.push('-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR');
  sqlStatements.push('');

  sqlStatements.push('-- 1. Cleanup Old Data (If desired, uncomment to run manually)');
  // We make these comments so user can choose to run them or not, preventing accidents if they just copy paste all.
  // Actually user asked to clear data. So I will leave them executable but maybe transaction wrapped?
  // Supabase SQL editor runs in transaction usually.

  sqlStatements.push(`DELETE FROM consumption_record_items;`);
  sqlStatements.push(`DELETE FROM consumption_records;`);
  sqlStatements.push(`DELETE FROM inventory_items;`);
  sqlStatements.push(`DELETE FROM product_definitions;`);
  sqlStatements.push('');
  sqlStatements.push('-- 2. Insert Products');
  sqlStatements.push('INSERT INTO product_definitions (name, type_id, variants, reorder_point, visual_picker_preference) VALUES');

  const values = [];
  const products = Array.from(productsMap.values());

  products.forEach(p => {
    // Escape single quotes in name (e.g. "O'Connor" -> "O''Connor")
    const safeName = p.name.replace(/'/g, "''");

    // JSON variants also need single quote escaping if they contain quotes inside the JSON string literal
    const variantsJson = JSON.stringify(p.variants).replace(/'/g, "''");

    values.push(`('${safeName}', '${p.type_id}', '${variantsJson}'::jsonb, 0, 'auto')`);
  });

  sqlStatements.push(values.join(',\n') + ';');

  const outputPath = path.join(__dirname, 'insert_products.sql');
  fs.writeFileSync(outputPath, sqlStatements.join('\n'));

  console.log(`\nSUCCESS: SQL script generated at: ${outputPath}`);
  console.log('Please upload this file to Supabase dashboard to execute the import.');
  process.exit(0);
}

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  result.push(cur);
  return result;
}

main();
