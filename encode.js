const fs = require('fs');
let html = fs.readFileSync('omnixipl.html', 'utf8');
const match = html.match(/const m3uData = `([\s\S]*?)`;/);
if (match) {
    const rawData = match[1];
    const encoded = Buffer.from(rawData).toString('base64');
    html = html.replace(
        match[0],
        `const encodedM3u = "${encoded}";\n        const m3uData = atob(encodedM3u);`
    );
    fs.writeFileSync('omnixipl.html', html);
    console.log('Successfully obfuscated M3U data');
} else {
    console.log('Match not found');
}
