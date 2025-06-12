import 'dotenv/config';
import app from './api';
import { supabase } from './config/supabase';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handling
let server: any;

const startServer = async () => {
  try {
    // Test database connection
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error('Failed to connect to Supabase:', error);
      process.exit(1);
    }

    // Start server
    server = app.listen(PORT, () => {
      console.log(`
🚀 VibeStack API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${NODE_ENV}
🔗 URL: http://localhost:${PORT}
📡 API: http://localhost:${PORT}/api
💚 Health: http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

async function shutdown() {
  console.log('\n📴 Shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start the server
startServer();