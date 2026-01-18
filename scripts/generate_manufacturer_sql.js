
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('Starting Manufacturer SQL generation...');

    // 1. Read CSV
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

    // 2. Parse CSV
    const text = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n');

    const manufacturers = new Set();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = parseCSVLine(line);
        // Expected: Type,Product Name,Variant,Reorder Point,Brand/Model,Manufacturer
        if (row.length < 6) continue;

        const manufacturer = row[5]?.trim();

        if (manufacturer) {
            manufacturers.add(manufacturer);
        }
    }

    console.log(`Found ${manufacturers.size} unique manufacturers.`);

    // 3. Generate SQL Script
    const sqlStatements = [];
    sqlStatements.push('-- GENERATED AUTOMATICALLY BY scripts/generate_manufacturer_sql.js');
    sqlStatements.push('-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR');
    sqlStatements.push('');
    sqlStatements.push('-- Optionally clear old manufacturers (Careful with FKs!)');
    sqlStatements.push('-- DELETE FROM manufacturers;');
    sqlStatements.push('');
    sqlStatements.push('INSERT INTO manufacturers (name) VALUES');

    const values = [];
    Array.from(manufacturers).forEach(m => {
        // Escape single quotes
        const safeName = m.replace(/'/g, "''");
        values.push(`('${safeName}')`);
    });

    if (values.length > 0) {
        sqlStatements.push(values.join(',\n') + ';');
    } else {
        sqlStatements.push('-- No manufacturers found in CSV.');
    }

    const outputPath = path.join(__dirname, 'insert_manufacturers.sql');
    fs.writeFileSync(outputPath, sqlStatements.join('\n'));

    console.log(`\nSUCCESS: SQL script generated at: ${outputPath}`);
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
