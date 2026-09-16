import express from 'express';
import { supabase } from '../config/db.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();

let IN_MEMORY_PRODUCTS = [];

// GET /api/products — public, list/search/filter directly from Supabase
router.get('/', async (req, res) => {
  const { category, search, status } = req.query;

  try {
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase GET Products Error:', error);
      return res.json([]);
    }

    if (!data || data.length === 0) {
      return res.json([]);
    }

    const formatted = data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: parseFloat(p.price),
      originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
      stockCount: p.stock_count || 10,
      images: p.images || (p.image ? [p.image] : []),
      image: p.image || (p.images ? p.images[0] : ''),
      category: p.category,
      status: p.status || (p.stock_count > 0 ? 'active' : 'out_of_stock'),
      inStock: p.stock_count > 0,
      badge: p.badge || 'NEW',
      shapes: p.shapes || ['Short Almond', 'Medium Coffin', 'Long Stiletto'],
      sizes: p.sizes || ['XS (3,6,5,7,9)', 'S (2,5,4,6,9)', 'M (1,4,3,5,8)', 'L (0,3,2,4,7)']
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Server Error fetching products:', err);
    res.json([]);
  }
});

// GET /api/products/:id — public, single product
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      const memoryProd = IN_MEMORY_PRODUCTS.find((p) => p.id === id);
      if (!memoryProd) return res.status(404).json({ error: 'Product not found' });
      return res.json(memoryProd);
    }

    res.json({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price),
      originalPrice: product.original_price ? parseFloat(product.original_price) : undefined,
      stockCount: product.stock_count,
      images: product.images || [product.image],
      image: product.image,
      category: product.category,
      status: product.status,
      inStock: product.stock_count > 0,
      badge: product.badge,
      shapes: product.shapes,
      sizes: product.sizes
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// POST /api/admin/products OR POST /api/products (Admin auth required for creation)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, originalPrice, stockCount, image, images, category, status, badge, shapes, sizes } = req.body;

    const prodImages = images || (image ? [image] : ['https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80']);
    const mainImage = image || prodImages[0];

    const newProd = {
      id: 'n-' + Date.now(),
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      stockCount: parseInt(stockCount) || 10,
      image: mainImage,
      images: prodImages,
      category: category || 'Press-On Sets',
      status: status || (parseInt(stockCount) > 0 ? 'active' : 'out_of_stock'),
      inStock: parseInt(stockCount) > 0,
      badge: badge || 'NEW',
      shapes: shapes || ['Short Almond', 'Medium Coffin'],
      sizes: sizes || ['XS', 'S', 'M', 'L']
    };

    IN_MEMORY_PRODUCTS.unshift(newProd);

    await supabase.from('products').insert([
      {
        name,
        description: description || '',
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        stock_count: parseInt(stockCount) || 10,
        image: mainImage,
        images: prodImages,
        category: category || 'Press-On Sets',
        status: status || (parseInt(stockCount) > 0 ? 'active' : 'out_of_stock'),
        badge: badge || 'NEW',
        shapes: shapes || ['Short Almond', 'Medium Coffin'],
        sizes: sizes || ['XS', 'S', 'M', 'L']
      }
    ]);

    res.status(201).json(newProd);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id (Admin update)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const memoryIdx = IN_MEMORY_PRODUCTS.findIndex((p) => p.id === id);
    if (memoryIdx !== -1) {
      IN_MEMORY_PRODUCTS[memoryIdx] = { ...IN_MEMORY_PRODUCTS[memoryIdx], ...updates };
    }

    await supabase
      .from('products')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price ? parseFloat(updates.price) : undefined,
        stock_count: updates.stockCount,
        status: updates.status,
        category: updates.category
      })
      .eq('id', id);

    res.json({ message: 'Product updated successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Admin delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    IN_MEMORY_PRODUCTS = IN_MEMORY_PRODUCTS.filter((p) => p.id !== id);

    await supabase.from('products').delete().eq('id', id);

    res.json({ message: 'Product deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
