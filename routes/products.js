import express from 'express';
import { supabase } from '../config/db.js';
import { verifyVendorToken } from '../middleware/auth.js';

const router = express.Router();

let IN_MEMORY_PRODUCTS = [];

// Get all products (Public for Storefront visitors)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return res.json(IN_MEMORY_PRODUCTS);
    }

    // Format products for frontend component expectations
    const formatted = data.map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
      category: p.category,
      image: p.image,
      images: [p.image],
      description: p.description || '',
      inStock: p.in_stock,
      stockCount: p.stock_count || 10,
      badge: p.badge || 'NEW',
      shapes: p.shapes || ['Short Almond', 'Medium Coffin', 'Long Stiletto'],
      sizes: p.sizes || ['XS (3,6,5,7,9)', 'S (2,5,4,6,9)', 'M (1,4,3,5,8)', 'L (0,3,2,4,7)']
    }));

    res.json(formatted);
  } catch (err) {
    res.json(IN_MEMORY_PRODUCTS);
  }
});

// Add new product (Vendor Upload)
router.post('/', async (req, res) => {
  try {
    const { name, price, originalPrice, category, image, description, stockCount, badge, shapes, sizes } = req.body;

    const newProdObj = {
      id: 'n-' + Date.now(),
      name,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      category: category || 'Press-On Sets',
      image: image || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
      images: [image || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80'],
      description: description || '',
      inStock: parseInt(stockCount) > 0,
      stockCount: parseInt(stockCount) || 10,
      badge: badge || 'NEW',
      shapes: shapes || ['Short Almond', 'Medium Coffin', 'Long Stiletto'],
      sizes: sizes || ['XS (3,6,5,7,9)', 'S (2,5,4,6,9)', 'M (1,4,3,5,8)', 'L (0,3,2,4,7)']
    };

    IN_MEMORY_PRODUCTS.unshift(newProdObj);

    // Save to Supabase PostgreSQL database asynchronously
    await supabase.from('products').insert([
      {
        name,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        category: category || 'Press-On Sets',
        image: image || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
        description: description || '',
        in_stock: parseInt(stockCount) > 0,
        stock_count: parseInt(stockCount) || 10,
        badge: badge || 'NEW',
        shapes: shapes || ['Short Almond', 'Medium Coffin'],
        sizes: sizes || ['XS', 'S', 'M', 'L']
      }
    ]);

    res.status(201).json(newProdObj);
  } catch (err) {
    res.status(500).json({ error: 'Failed saving product' });
  }
});

// Update product stock
router.patch('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { newStock } = req.body;

  const product = IN_MEMORY_PRODUCTS.find((p) => p.id === id);
  if (product) {
    product.stockCount = newStock;
    product.inStock = newStock > 0;
  }

  try {
    await supabase
      .from('products')
      .update({ stock_count: newStock, in_stock: newStock > 0 })
      .eq('id', id);
  } catch (e) {}

  res.json({ success: true, newStock });
});

export default router;
