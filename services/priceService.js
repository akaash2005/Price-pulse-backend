import { v4 as uuidv4 } from 'crypto';
import { dbHelpers } from '../database.js';
import { scrapeProductDetails } from './scraperService.js';

// Update price for a single product
export async function updateProductPrice(productId) {
  try {
    const product = dbHelpers.getProductById(productId);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Scrape current product details
    const scrapedProduct = await scrapeProductDetails(product.url);
    
    if (!scrapedProduct) {
      throw new Error(`Failed to scrape product details: ${product.url}`);
    }
    
    const now = new Date().toISOString();
    
    // Add new price history entry
    const priceHistory = {
      id: uuidv4(),
      productId: product.id,
      price: scrapedProduct.price,
      timestamp: now
    };
    
    dbHelpers.addPriceHistory(priceHistory);
    
    // Update product details
    const highestPrice = Math.max(product.highestPrice || 0, scrapedProduct.price);
    const lowestPrice = Math.min(product.lowestPrice || Infinity, scrapedProduct.price);
    
    const updatedProduct = {
      ...product,
      title: scrapedProduct.title || product.title,
      currentPrice: scrapedProduct.price,
      imageUrl: scrapedProduct.imageUrl || product.imageUrl,
      lastChecked: now,
      highestPrice,
      lowestPrice
    };
    
    dbHelpers.updateProduct(updatedProduct);
    
    return { 
      product: updatedProduct, 
      priceHistory: dbHelpers.getPriceHistoryByProductId(product.id) 
    };
  } catch (error) {
    console.error(`Error updating price for product ${productId}:`, error);
    throw error;
  }
}

// Update prices for all products in the database
export async function updateAllProductPrices() {
  try {
    const products = dbHelpers.getAllProducts();
    
    if (products.length === 0) {
      console.log('No products to update');
      return [];
    }
    
    const results = [];
    
    for (const product of products) {
      try {
        const result = await updateProductPrice(product.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
        // Continue with other products even if one fails
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error updating all product prices:', error);
    throw error;
  }
}