import express from 'express';
import { supabase } from '../config/db.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();

let IN_MEMORY_PRODUCTS = [];

// Helper function: Converts Base64 data URL into a file buffer & uploads to Supabase Storage Bucket 'product-images'
async function uploadBase64ToSupabaseStorage(base64Str) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  try {
    const mimeMatch = base64Str.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';
    const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.warn('⚠️ Supabase Storage Bucket Upload Note:', error.message);
      return base64Str;
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    if (publicUrlData && publicUrlData.publicUrl) {
      console.log('✅ Image uploaded successfully to Supabase Storage Bucket:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    }
    return base64Str;
  } catch (err) {
    console.error('⚠️ Storage upload helper exception:', err);
    return base64Str;
  }
}

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

    const defaultFallbackImage = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80';
    let rawMainImage = (typeof image === 'string' && image.trim() !== '') 
      ? image 
      : (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string' && images[0].trim() !== '') 
        ? images[0] 
        : defaultFallbackImage;

    // Upload base64 image to Supabase Storage Bucket if base64 provided
    const storedImageUrl = await uploadBase64ToSupabaseStorage(rawMainImage);

    const prodImages = (Array.isArray(images) && images.length > 0) ? images : [storedImageUrl];

    const newProd = {
      id: 'n-' + Date.now(),
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      stockCount: parseInt(stockCount) || 10,
      image: storedImageUrl,
      images: prodImages,
      category: category || 'Press-On Sets',
      status: status || (parseInt(stockCount) > 0 ? 'active' : 'out_of_stock'),
      inStock: parseInt(stockCount) > 0,
      badge: badge || 'NEW',
      shapes: shapes || ['Short Almond', 'Medium Coffin'],
      sizes: sizes || ['XS', 'S', 'M', 'L']
    };

    IN_MEMORY_PRODUCTS.unshift(newProd);

    const { data: dbData, error: dbError } = await supabase.from('products').insert([
      {
        name,
        description: description || '',
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        stock_count: parseInt(stockCount) || 10,
        image: storedImageUrl,
        images: prodImages,
        category: category || 'Press-On Sets',
        status: status || (parseInt(stockCount) > 0 ? 'active' : 'out_of_stock'),
        badge: badge || 'NEW',
        shapes: shapes || ['Short Almond', 'Medium Coffin'],
        sizes: sizes || ['XS', 'S', 'M', 'L']
      }
    ]).select();

    if (dbError) {
      console.error('❌ Supabase Product Insert Error:', dbError);
    } else if (dbData && dbData.length > 0) {
      newProd.id = dbData[0].id;
    }

    res.status(201).json(newProd);
  } catch (err) {
    console.error('❌ API Product Creation Error:', err);
    res.status(500).json({ error: 'Failed to create product', details: err.message });
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

    let storedImageUrl = updates.image;
    if (updates.image && typeof updates.image === 'string' && updates.image.startsWith('data:image/')) {
      storedImageUrl = await uploadBase64ToSupabaseStorage(updates.image);
    }

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = parseFloat(updates.price);
    if (updates.originalPrice !== undefined) payload.original_price = updates.originalPrice ? parseFloat(updates.originalPrice) : null;
    if (updates.stockCount !== undefined) {
      const stock = parseInt(updates.stockCount);
      payload.stock_count = stock;
      if (stock <= 0) {
        payload.status = 'out_of_stock';
      } else if (!updates.status) {
        payload.status = 'active';
      }
    }
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.badge !== undefined) payload.badge = updates.badge;
    if (storedImageUrl !== undefined) {
      payload.image = storedImageUrl;
      payload.images = [storedImageUrl];
    }

    const { data: updatedData, error: dbError } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select();

    if (dbError) {
      console.error('❌ Supabase Product Update Error:', dbError);
    }

    res.json({
      id,
      ...updates,
      price: updates.price ? parseFloat(updates.price) : undefined,
      stockCount: updates.stockCount !== undefined ? parseInt(updates.stockCount) : undefined,
      image: storedImageUrl
    });
  } catch (err) {
    console.error('❌ API Product Update Error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Admin delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    IN_MEMORY_PRODUCTS = IN_MEMORY_PRODUCTS.filter((p) => p.id !== id);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('❌ Supabase Delete Error:', error);

    res.json({ message: 'Product deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
