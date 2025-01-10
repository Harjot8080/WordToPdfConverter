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


app.get('/'),async(req,res)=>{
  res.write('heelo you are connected to wordtoPd connverter');
}

// Middleware to parse JSON body (for Base64 string)
app.use(express.json({ limit: '50mb' })); // Increase the body size limit if necessary

// Function to decode the Base64 string and save it as a DOCX file
const saveBase64ToFile = (base64String, filePath) => {
  const buffer = Buffer.from(base64String, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log('File saved at:', filePath);
};

// Endpoint to handle Base64 file upload and conversion to PDF
app.post('/convert', async (req, res) => {
  try {
    const { base64String, fileName } = req.body; // Expecting the Base64 string and file name in the request body

    if (!base64String) {
      return res.status(400).json({ message: 'Base64 string is required.' });
    }

    // Generate unique filenames for the uploaded and output files
    const outputName = `${Date.now()}_output.pdf`;
    const tempFileName = fileName || 'uploaded.docx'; // Default to 'uploaded.docx' if no filename is provided
    const tempPath = path.join('uploads', `${Date.now()}_${tempFileName}`);
    const outputPath = path.join('uploads', outputName);

    // Ensure the 'uploads' directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }

    // Save the Base64 string as a DOCX file
    saveBase64ToFile(base64String, tempPath);

    // Paths for the PowerShell script and input/output files
    const inputFilePath = path.resolve(tempPath);
    const outputFilePath = path.resolve(outputPath);
   // const keepActive = false; // Flag for additional PowerShell behavior (if needed)

    // Command to execute the PowerShell script (or unoconv)
    // Ensure this is a Linux-compatible command if running on EC2 Linux instance
    const command = `unoconv -f pdf -o "${outputPath}" "${inputFilePath}"`;
    execSync(command); // Execute the command synchronously

    console.log("Output path:", outputPath);

    // Check if the output PDF file exists
    if (!fs.existsSync(outputPath)) {
      console.error("File not found at path:", outputPath);
      return res.status(404).send("File not found");
    }

    // Stream the PDF file to the client
    const stat = fs.statSync(outputPath);
    const file = fs.createReadStream(outputPath);
    res.setHeader('Content-Length', stat.size); // Set content length
    res.setHeader('Content-Type', 'application/pdf'); // Set MIME type
    res.setHeader('Content-Disposition', `inline; filename=${outputName}`); // Prompt download with a specific name
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
    if (fs.existsSync(tempPath)) {
      fs.unlink(tempPath, (err) => {
        if (err) console.error("Error deleting temp DOCX file:", err);
      });
    }
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
