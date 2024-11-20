# DOCX to PDF Conversion Service

This repository contains a Node.js-based server application for uploading DOCX files and converting them to PDF format. The converted file is then sent back to the client as a downloadable response.

## 🛠 Features
```plaintext
- Handles DOCX to PDF conversion via PowerShell or `unoconv`.
- Streams the converted PDF file to the client.
- Supports cleanup of temporary files after processing.
- Implements CORS for cross-origin requests.
- Automatically creates an `uploads` directory for temporary storage.
