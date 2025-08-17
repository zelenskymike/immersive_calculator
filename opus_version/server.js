const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create server
const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Parse URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Read file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                // Server error
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🧊 Immersion Cooling TCO Calculator v2.0        ║
╠══════════════════════════════════════════════════════╣
║  🌐 Server running at: http://localhost:${PORT}        ║
║  📊 Status: Ready                                    ║║  ✅ All systems operational                          ║
╚══════════════════════════════════════════════════════╝

Features:
  ✨ Multi-language support (EN/AR)
  💱 Multi-currency (USD/EUR/SAR/AED)
  📈 Advanced TCO calculations
  🌍 Environmental impact analysis
  📊 Interactive charts
  📄 PDF/Excel export
  🔗 Shareable links
  🎨 Modern UI with animations

Press Ctrl+C to stop the server
    `);
});