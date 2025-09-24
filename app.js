const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel-optimized: Use /tmp directory for temporary Excel files only
// Note: We still need outputDir because XLSX.writeFile() requires a file path
// and the ZIP download needs to read the generated Excel files
const outputDir = '/tmp/output';

// Create output directory for temporary Excel files
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer - memory storage only (no upload directory needed)
const upload = multer({ 
    storage: multer.memoryStorage(), // Files processed directly from memory
    limits: {
        fileSize: 4.5 * 1024 * 1024 // 4.5MB limit optimized for Vercel serverless functions
    }
});

// Serve static files
app.use(express.static('public'));

// Custom route for output files with cleanup after download
app.get('/output/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Send file and clean up after download
    res.download(filePath, filename, (err) => {
        if (!err) {
            // Delete file after successful download
            try {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up downloaded file: ${filename}`);
            } catch (cleanupError) {
                console.error(`Failed to cleanup ${filename}:`, cleanupError.message);
            }
        }
    });
});

// Download all files as ZIP
app.get('/download-all', (req, res) => {
    try {
        // Check if output directory exists first
        if (!fs.existsSync(outputDir)) {
            return res.status(404).json({ error: 'No files available for download' });
        }
        
        const files = fs.readdirSync(outputDir);
        
        if (files.length === 0) {
            return res.status(404).json({ error: 'No files available for download' });
        }
        
        // Set response headers for ZIP download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipName = `converted-files-${timestamp}.zip`;
        
        res.attachment(zipName);
        res.setHeader('Content-Type', 'application/zip');
        
        // Create archiver instance
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        // Handle archiver errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create ZIP file' });
            }
        });
        
        // Handle archiver warnings
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archive warning:', err);
            } else {
                throw err;
            }
        });
        
        // Pipe archive data to the response
        archive.pipe(res);
        
        // Add files to archive and clean up after adding
        const filesToCleanup = [];
        files.forEach(file => {
            const filePath = path.join(outputDir, file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
                filesToCleanup.push(filePath);
            }
        });
        
        // Finalize the archive
        archive.finalize().then(() => {
            // Clean up files after ZIP is created
            filesToCleanup.forEach(filePath => {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up file: ${path.basename(filePath)}`);
                } catch (cleanupError) {
                    console.error(`Failed to cleanup ${path.basename(filePath)}:`, cleanupError.message);
                }
            });
        });
        
    } catch (error) {
        console.error('Download all error:', error);
        res.status(500).json({ error: 'Failed to prepare download' });
    }
});

// Vercel-optimized conversion function - processes buffer data directly
function tdsToExcel(buffer, outputFile) {
    try {
        // Convert buffer to string
        const data = buffer.toString('utf8');
        const lines = data.split('\n');
        
        // Parse delimited data (^ delimiter)
        const rows = lines.map(line => line.trim().split('^'));
        const maxLen = Math.max(...rows.map(row => row.length));
        
        // Pad rows to ensure consistent column count
        const paddedRows = rows.map(row => {
            while (row.length < maxLen) {
                row.push('');
            }
            return row;
        });
        
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(paddedRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, outputFile);
        
        return true;
    } catch (error) {
        console.error(`Error processing file:`, error.message);
        return false;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    
    req.files.forEach(file => {
        try {
            // Create output filename
            let outputFilename;
            if (file.originalname.includes('.')) {
                outputFilename = file.originalname.substring(0, file.originalname.lastIndexOf('.')) + '.xlsx';
            } else {
                outputFilename = file.originalname + '.xlsx';
            }
            
            const outputPath = path.join(outputDir, outputFilename);
            
            // Convert file directly from buffer (Vercel-optimized)
            const success = tdsToExcel(file.buffer, outputPath);
            
            if (success) {
                results.push({
                    originalName: file.originalname,
                    convertedName: outputFilename,
                    downloadUrl: `/output/${outputFilename}`,
                    status: 'success'
                });
            } else {
                results.push({
                    originalName: file.originalname,
                    status: 'error',
                    message: 'Conversion failed'
                });
            }
        } catch (error) {
            console.error(`Error processing ${file.originalname}:`, error.message);
            results.push({
                originalName: file.originalname,
                status: 'error',
                message: 'Processing failed'
            });
        }
    });
    
    res.json({ results });
});

// Clean up old files (optional endpoint)
app.delete('/cleanup', (req, res) => {
    try {
        const files = fs.readdirSync(outputDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(outputDir, file));
        });
        res.json({ message: 'Output directory cleaned' });
    } catch (error) {
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});