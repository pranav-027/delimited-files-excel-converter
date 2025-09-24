# Delimited Files to Excel Converter

A serverless web application designed exclusively for Vercel deployment. Converts delimited files (with ^ delimiter) to Excel format with file upload, conversion, and bulk download functionality.

## Features

- 📁 **Drag & Drop Upload**: Easy file upload with drag-and-drop interface
- 🔄 **Batch Conversion**: Convert multiple files at once
- 📊 **Excel Output**: Converts to standard .xlsx format
- 📦 **Download All**: Bulk download all converted files as ZIP
- 🧹 **Auto Cleanup**: Automatic file cleanup after download
- 🌐 **Serverless**: 100% optimized for Vercel's serverless environment
- ⚡ **Memory Processing**: Fast in-memory file processing

## Vercel-Only Architecture

This application is built exclusively for Vercel deployment with:

- **Memory Storage**: Processes files entirely in memory
- **Serverless Functions**: Uses `/tmp` directory for temporary file operations
- **Auto Cleanup**: Cleans up temporary files automatically
- **Size Optimized**: 4.5MB file size limit for optimal serverless performance

#### Deploy Steps:

1. **Push to GitHub** (already done):
   ```bash
   git add .
   git commit -m "Add Vercel compatibility"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

3. **Environment Variables** (if needed):
   - `VERCEL=1` (automatically set by Vercel)

#### Vercel Configuration (`vercel.json`):
- Uses `@vercel/node` runtime
- 30-second function timeout
- Automatic environment detection

### Development

This app is designed for Vercel deployment. For development:

```bash
npm install
vercel dev       # Run locally with Vercel CLI (recommended)
# OR
npm start        # Direct Node.js (may have limitations)
```

**Note**: Local development with `npm start` may have limited functionality since the app is optimized for Vercel's serverless environment.

## File Structure

```
├── app.js              # Main serverless function
├── package.json        # Dependencies
├── vercel.json         # Vercel configuration
├── public/
│   └── index.html      # Frontend interface
├── README.md           # Documentation
└── .gitignore          # Git ignore rules

**Note**: No local upload/output directories - all processing happens in Vercel's `/tmp` directory
```

## API Endpoints

- `GET /` - Main interface
- `POST /upload` - File upload and conversion
- `GET /output/:filename` - Download individual file
- `GET /download-all` - Download all files as ZIP
- `DELETE /cleanup` - Manual cleanup endpoint

## Technical Details

### Vercel-Optimized Features:

1. **Memory Processing**: Files processed entirely in memory for speed
2. **Serverless Storage**: Uses `/tmp` directory exclusively
3. **Buffer Handling**: Direct buffer-to-Excel conversion
4. **Size Optimization**: 4.5MB limit for optimal serverless performance
5. **Auto Cleanup**: Automatic temporary file cleanup

### File Processing:

- Reads files with `^` delimiters
- Converts to Excel format using `xlsx` library
- Creates ZIP archives using `archiver` library
- Automatic cleanup after download

## Troubleshooting

### Performance Considerations:

1. **File Size**: Maximum 4.5MB per file for optimal performance
2. **Batch Size**: Process files in reasonable batches to avoid memory limits
3. **Timeout**: 30-second function execution limit
4. **Memory**: Serverless functions have memory constraints

### Best Practices:

- Keep individual files under 4.5MB
- Process 5-10 files at once for best performance  
- Check Vercel function logs for detailed error information
- Files are automatically cleaned up after download

## Dependencies

- `express`: Web framework
- `multer`: File upload handling
- `xlsx`: Excel file creation
- `archiver`: ZIP file creation
- `nodemon`: Development server (dev dependency)