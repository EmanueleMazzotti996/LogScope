const fs = require('fs');

const inputPath = 'c:\\Users\\emanu\\Desktop\\Parvis\\GODLOG\\eventmap.csv';
const outputPath = 'c:\\Users\\emanu\\Desktop\\Parvis\\GODLOG\\eventmap_detailed.csv';

try {
    const data = fs.readFileSync(inputPath, 'utf8');
    const lines = data.split('\n');
    const outputLines = [];

        // Handle header
        const header = lines[0].trim().replace(/,/g, ';');
        outputLines.push(`${header};Label Description`);

        // Handle rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            // Native CSV handling: replace commas with semicolons
            // NOTE: This assumes the original CSV doesn't have commas inside quoted fields.
            // Based on view_file, it's simple data.
            outputLines.push(`${line.replace(/,/g, ';')};`);
        }

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`Successfully created ${outputPath}`);
} catch (err) {
    console.error('Error processing CSV:', err);
    process.exit(1);
}
