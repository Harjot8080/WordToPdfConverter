// Import required modules
const express = require('express'); // Web framework for Node.js
const cors = require('cors'); // Middleware to handle Cross-Origin Resource Sharing (CORS)
const fs = require('fs'); // File system module for file operations
const path = require('path'); // Utility for handling file and directory paths
const { execSync } = require('child_process'); // Module to execute shell commands
const app = express(); // Initialize the express app
const port = 3000; // Port number for the server

// Enable CORS for all requests
app.use(cors());

// Function to convert DOCX to PDF
const convertToPDF = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Placeholder for actual conversion logic
    let result = topdf.convert(inputPath, outputPath); 
    resolve(result);
  });
};

// Endpoint to handle Blob file upload and conversion to PDF
app.post('/convert', (req, res) => {
  // Generate unique filenames for the uploaded and output files
  const outputName = `${Date.now()}_output.pdf`;
  const filename = req.headers['x-filename'] || 'uploaded.docx';
  const tempPath = path.join('uploads', `${Date.now()}_${filename}`);
  const outputPath = path.join('uploads', outputName);

  const chunks = []; // Array to store incoming data chunks

  // Event listener to collect data chunks from the request
  req.on('data', chunk => {
    chunks.push(chunk);
  });

  // Event listener to process data once the upload is complete
  req.on('end', async () => {
    try {
      // Ensure the 'uploads' directory exists
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }

      // Combine all chunks and save the uploaded file
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(tempPath, buffer);

      // Paths for the PowerShell script and input/output files
      // const scriptPath = path.resolve(__dirname, 'convert.ps1');
      const inputFilePath = path.resolve(tempPath);
      const outputFilePath = path.resolve(outputPath);
      const keepActive = false; // Flag for additional PowerShell behavior

      // Command to execute the PowerShell script
      const command = `powershell -File "${scriptPath}" "${inputFilePath}" "${outputFilePath}" ${keepActive ? 'true' : 'false'}`;
     //const command = `unoconv -f pdf -o "${outputPath}" "${tempPath}"`;
    execSync(command); // Execute the command synchronously

      console.log("Output path:", outputPath);

      // Check if the output PDF file exists
      if (!fs.existsSync(outputPath)) {
        console.error("File not found at path:", outputPath);
        res.status(404).send("File not found");
        return;
      }

      // Stream the PDF file to the client
      const stat = fs.statSync(outputPath);
      const file = fs.createReadStream(outputPath);
      res.setHeader('Content-Length', stat.size); // Set content length
      res.setHeader('Content-Type', 'application/pdf'); // Set MIME type
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`); // Prompt download with a specific name
      file.pipe(res); // Pipe the file to the response

      // Cleanup function to delete temporary files
      const cleanup = () => {
        fs.unlink(tempPath, (err) => {
          if (err) console.error("Error deleting temp DOCX file:", err);
        });
        fs.unlink(outputPath, (err) => {
          if (err) console.error("Error deleting output PDF file:", err);
        });
      };

      // Trigger cleanup after the response finishes
      res.on('finish', cleanup);

    } catch (error) {
      console.error("Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error converting file', error: error.message });
      }
      // Cleanup temporary file in case of error
      fs.unlink(tempPath, (err) => {
        if (err) console.error("Error deleting temp DOCX file:", err);
      });
    }
  });

  // Event listener to handle errors during the request
  req.on('error', (error) => {
    console.error("Request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Request error', error: error.message });
    }
  });
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
