import fs from 'fs';
const logs = fs.readFileSync('scripts/api-debug.log', 'utf8').split('\n');
let output = 'DEBUG LOG ANALYSIS\n==================\n\n';

logs.forEach((l, i) => {
    if (l.includes('BK-96A81ECC')) {
        output += `Found ${l} at line ${i+1}\n`;
        output += `Context (-5, +5):\n`;
        for (let j = i - 5; j <= i + 5; j++) {
            if (logs[j]) output += `${j+1}: ${logs[j]}\n`;
        }
        output += '\n------------------\n';
    }
});

fs.writeFileSync('scripts/id-summary.txt', output);
console.log('Analysis written to scripts/id-summary.txt');
