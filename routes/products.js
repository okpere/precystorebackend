import express from 'express';
import { verifyVendorToken } from '../middleware/auth.js';

const router = express.Router();

let PRODUCTS = [
  {
    id: 'n1',
    name: 'French Ombré Chrome Almond Press-Ons',
    price: 18500,
    originalPrice: 24000,
    category: 'Press-On Sets',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80'],
    description: 'Handcrafted 10-piece luxury gel press-on set with pearl chrome finish.',
    inStock: true,
    stockCount: 14,
    badge: 'BESTSELLER',
    shapes: ['Short Almond', 'Medium Almond', 'Long Coffin', 'Stiletto'],
    sizes: ['XS (3,6,5,7,9)', 'S (2,5,4,6,9)', 'M (1,4,3,5,8)', 'L (0,3,2,4,7)']
  }
];

// Get all products
router.get('/', (req, res) => {
  res.json(PRODUCTS);
});

// Add new product (Vendor Protected)
router.post('/', verifyVendorToken, (req, res) => {
  const newProduct = {
    id: 'n-' + Date.now(),
    ...req.body,
    inStock: req.body.stockCount > 0
  };
  PRODUCTS.unshift(newProduct);
  res.status(201).json(newProduct);
});

// Update product stock (Vendor Protected)
router.patch('/:id/stock', verifyVendorToken, (req, res) => {
  const { id } = req.params;
  const { newStock } = req.body;

  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.stockCount = newStock;
  product.inStock = newStock > 0;
  res.json(product);
});

export default router;
