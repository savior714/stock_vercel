const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'presets.json');

try {
    const buffer = fs.readFileSync(filePath);
    console.log('Read ' + buffer.length + ' bytes.');

    // Check for UTF-8 BOM (EF BB BF)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log('🔴 BOM detected! Removing...');
        const newBuffer = buffer.slice(3);
        fs.writeFileSync(filePath, newBuffer);
        console.log('✅ BOM removed. New size: ' + newBuffer.length);
    } else {
        console.log('🟢 No BOM detected in the file header.');
        // Just in case, checking for other invisible chars or whitespace before [
        const text = buffer.toString('utf8');
        const firstBracket = text.indexOf('[');
        if (firstBracket > 0) {
            console.log(`⚠️ Warning: '[' found at index ${firstBracket}. Trimming...`);
            const trimmed = text.substring(firstBracket);
            fs.writeFileSync(filePath, trimmed, 'utf8');
            console.log('✅ Trimmed leading characters.');
        }
    }
} catch (err) {
    console.error('Error:', err);
}
