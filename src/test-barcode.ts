// Test file for barcode parsing
import { extractGS1DataForSupply } from './hooks/useBarcodeScanner';

const testBarcode = ']C1010695848148506617280625301102506230962';

const result = extractGS1DataForSupply(testBarcode);

console.log('=== Barcode Parsing Test ===');
console.log('Raw Input:', testBarcode);
console.log('\nExpected:');
console.log('  GTIN: 06958481485066');
console.log('  Expiry: 2028-06-25');
console.log('  Quantity: 1');
console.log('  LOT: 2506230962');
console.log('\nActual Result:');
console.log('  GTIN:', result?.gtin);
console.log('  Expiry:', result?.expiryDate);
console.log('  Quantity:', result?.quantity);
console.log('  LOT:', result?.lotNumber);
console.log('  Formatted:', result?.formattedValue);
console.log('\nMatch:',
    result?.gtin === '06958481485066' &&
    result?.expiryDate === '2028-06-25' &&
    result?.quantity === '1' &&
    result?.lotNumber === '2506230962'
);
