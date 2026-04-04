const { format } = require('date-fns');

const normalizeDateForDB = (date) => {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return undefined;
  return format(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), 'yyyy-MM-dd');
};

console.log("Test 1: GS1 parsed local date (Midnight UTC -> GMT+02)");
const test1 = new Date('2026-04-04');
console.log("Original Date object: ", test1.toString());
console.log("Normalized: ", normalizeDateForDB(test1));

console.log("\nTest 2: DatePicker local date (Midnight Local -> GMT+02)");
// simulate Egypt timezone for a midnight local date
// If running in a different timezone, let's just create year, month, day
const test2 = new Date(2026, 3, 4); // April 4, 2026 00:00:00 Local
console.log("Original Date object: ", test2.toString());
console.log("Normalized: ", normalizeDateForDB(test2));

console.log("\nTest 3: String from DB '2026-04-04'");
console.log("Normalized: ", normalizeDateForDB('2026-04-04'));

console.log("\nTest 4: GS1 YYMMDD = 260404. JS Date parsing");
const test4 = new Date('2026-04-04T00:00:00.000Z');
console.log("Normalized UTC midnight: ", normalizeDateForDB(test4));

