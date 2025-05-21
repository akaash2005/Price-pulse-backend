import { scrapeProductDetails } from '../services/scraperService.js';
import { dbHelpers } from '../database.js';
import { v4 as uuidv4 } from 'crypto';

export function setupProductRoutes(app) {
  // Get all tracked products
  app.get('/api/products', (req, res) => {
    try {
      const products = dbHelpers.getAllProducts();
      
      // Add price change data to each product
      const productsWithPriceChange = products.map(product => {
        const priceChange = dbHelpers.calculatePriceChange(product.id);
        return { ...product, priceChange };
      });
      
      res.json(productsWithPriceChange);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get a specific product with its price history
  app.get('/api/products/:id', (req, res) => {
    try {
      const product = dbHelpers.getProductById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const priceHistory = dbHelpers.getPriceHistoryByProductId(product.id);
      const priceChange = dbHelpers.calculatePriceChange(product.id);
      
      res.json({ 
        product: { ...product, priceChange }, 
        priceHistory 
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  // Track a new product
  app.post('/api/products', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
      // Check if product is already being tracked
      const existingProduct = dbHelpers.getProductByUrl(url);
      
      if (existingProduct) {
        const priceHistory = dbHelpers.getPriceHistoryByProductId(existingProduct.id);
        const priceChange = dbHelpers.calculatePriceChange(existingProduct.id);
        
        return res.json({ 
          product: { ...existingProduct, priceChange }, 
          priceHistory 
        });
      }
      
      // Scrape product details
      const scrapedProduct = await scrapeProductDetails(url);
      
      if (!scrapedProduct) {
        return res.status(400).json({ error: 'Failed to scrape product details' });
      }
      
      // Create product in database
      const now = new Date().toISOString();
      const product = {
        id: uuidv4(),
        url,
        title: scrapedProduct.title,
        currentPrice: scrapedProduct.price,
        imageUrl: scrapedProduct.imageUrl,
        lastChecked: now,
        createdAt: now,
        highestPrice: scrapedProduct.price,
        lowestPrice: scrapedProduct.price,
        priceChange: null
      };
      
      dbHelpers.createProduct(product);
      
      // Add initial price history entry
      const priceHistory = {
        id: uuidv4(),
        productId: product.id,
        price: scrapedProduct.price,
        timestamp: now
      };
      
      dbHelpers.addPriceHistory(priceHistory);
      
      res.status(201).json({ 
        product, 
        priceHistory: [priceHistory] 
      });
    } catch (error) {
      console.error('Error tracking product:', error);
      res.status(500).json({ error: 'Failed to track product' });
    }
  });
}