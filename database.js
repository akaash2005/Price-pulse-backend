import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data', 'price_tracker.db');

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize database connection
let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// Initialize database schema
export function initializeDatabase() {
  const db = getDb();

  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      current_price REAL NOT NULL,
      image_url TEXT,
      last_checked TEXT NOT NULL,
      created_at TEXT NOT NULL,
      highest_price REAL,
      lowest_price REAL
    )
  `);

  // Create price_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      price REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  console.log('Database initialized successfully');
}

// Helper functions for database operations
export const dbHelpers = {
  // Products
  createProduct(product) {
    const stmt = getDb().prepare(`
      INSERT INTO products (id, url, title, current_price, image_url, last_checked, created_at, highest_price, lowest_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      product.id,
      product.url,
      product.title,
      product.currentPrice,
      product.imageUrl,
      product.lastChecked,
      product.createdAt,
      product.highestPrice || product.currentPrice,
      product.lowestPrice || product.currentPrice
    );
    
    return product;
  },
  
  getProductById(id) {
    const stmt = getDb().prepare('SELECT * FROM products WHERE id = ?');
    const result = stmt.get(id);
    
    if (!result) return null;
    
    return {
      id: result.id,
      url: result.url,
      title: result.title,
      currentPrice: result.current_price,
      imageUrl: result.image_url,
      lastChecked: result.last_checked,
      createdAt: result.created_at,
      highestPrice: result.highest_price,
      lowestPrice: result.lowest_price,
      priceChange: null // Will be calculated later
    };
  },
  
  getProductByUrl(url) {
    const stmt = getDb().prepare('SELECT * FROM products WHERE url = ?');
    const result = stmt.get(url);
    
    if (!result) return null;
    
    return {
      id: result.id,
      url: result.url,
      title: result.title,
      currentPrice: result.current_price,
      imageUrl: result.image_url,
      lastChecked: result.last_checked,
      createdAt: result.created_at,
      highestPrice: result.highest_price,
      lowestPrice: result.lowest_price,
      priceChange: null // Will be calculated later
    };
  },
  
  getAllProducts() {
    const stmt = getDb().prepare('SELECT * FROM products ORDER BY last_checked DESC');
    const results = stmt.all();
    
    return results.map(result => ({
      id: result.id,
      url: result.url,
      title: result.title,
      currentPrice: result.current_price,
      imageUrl: result.image_url,
      lastChecked: result.last_checked,
      createdAt: result.created_at,
      highestPrice: result.highest_price,
      lowestPrice: result.lowest_price,
      priceChange: null // Will be calculated later
    }));
  },
  
  updateProduct(product) {
    const stmt = getDb().prepare(`
      UPDATE products
      SET title = ?, current_price = ?, image_url = ?, last_checked = ?, highest_price = ?, lowest_price = ?
      WHERE id = ?
    `);
    
    stmt.run(
      product.title,
      product.currentPrice,
      product.imageUrl,
      product.lastChecked,
      product.highestPrice,
      product.lowestPrice,
      product.id
    );
    
    return product;
  },
  
  // Price History
  addPriceHistory(priceHistory) {
    const stmt = getDb().prepare(`
      INSERT INTO price_history (id, product_id, price, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      priceHistory.id,
      priceHistory.productId,
      priceHistory.price,
      priceHistory.timestamp
    );
    
    return priceHistory;
  },
  
  getPriceHistoryByProductId(productId) {
    const stmt = getDb().prepare('SELECT * FROM price_history WHERE product_id = ? ORDER BY timestamp ASC');
    const results = stmt.all(productId);
    
    return results.map(result => ({
      id: result.id,
      productId: result.product_id,
      price: result.price,
      timestamp: result.timestamp
    }));
  },
  
  getLatestPriceByProductId(productId) {
    const stmt = getDb().prepare(`
      SELECT * FROM price_history 
      WHERE product_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    
    const result = stmt.get(productId);
    
    if (!result) return null;
    
    return {
      id: result.id,
      productId: result.product_id,
      price: result.price,
      timestamp: result.timestamp
    };
  },
  
  calculatePriceChange(productId) {
    const stmt = getDb().prepare(`
      SELECT price FROM price_history 
      WHERE product_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 2
    `);
    
    const results = stmt.all(productId);
    
    if (results.length < 2) return null;
    
    // Current price minus previous price
    return results[0].price - results[1].price;
  }
};