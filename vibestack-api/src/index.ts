import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main application entry point
const main = async (): Promise<void> => {
  try {
    const port = process.env['PORT'] ?? '3000';
    const environment = process.env['NODE_ENV'] ?? 'development';

    console.log(`Starting VibeStack API...`);
    console.log(`Environment: ${environment}`);
    console.log(`Port: ${port}`);

    // TODO: Initialize Express app
    // TODO: Setup middleware
    // TODO: Setup routes
    // TODO: Start server
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

// Start the application
void main();
