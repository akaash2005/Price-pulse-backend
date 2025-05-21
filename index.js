import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { initializeDatabase } from './database.js';
import { setupProductRoutes } from './routes/productRoutes.js';
import { updateAllProductPrices } from './services/priceService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
setupProductRoutes(app);

// Schedule price updates (every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled price update...');
  try {
    await updateAllProductPrices();
    console.log('Price update completed successfully');
  } catch (error) {
    console.error('Error updating prices:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});