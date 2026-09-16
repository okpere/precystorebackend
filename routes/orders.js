import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

let IN_MEMORY_ORDERS = [];

// GET /api/orders — List all orders (Admin view)
router.get('/', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !orders || orders.length === 0) {
      return res.json(IN_MEMORY_ORDERS);
    }

    res.json(orders);
  } catch (err) {
    res.json(IN_MEMORY_ORDERS);
  }
});

// POST /api/orders — Customer Checkout & Order Creation
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      deliveryFee,
      discount,
      total,
      paymentMethod,
      paymentReference,
      logisticsProvider
    } = req.body;

    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      id: orderId,
      customerName,
      customerPhone,
      customerAddress,
      items,
      subtotal: parseFloat(subtotal),
      deliveryFee: parseFloat(deliveryFee),
      discount: parseFloat(discount || 0),
      total: parseFloat(total),
      paymentMethod: paymentMethod || 'WhatsApp',
      paymentReference: paymentReference || null,
      logisticsProvider: logisticsProvider || 'Shipbubble',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    IN_MEMORY_ORDERS.unshift(newOrder);

    // Save order to Supabase
    const { error: dbError } = await supabase.from('orders').insert([
      {
        id: orderId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: Array.isArray(items) ? items : [],
        subtotal: parseFloat(subtotal),
        delivery_fee: parseFloat(deliveryFee),
        discount: parseFloat(discount || 0),
        total: parseFloat(total),
        payment_method: paymentMethod || 'WhatsApp',
        payment_reference: paymentReference || null,
        logistics_provider: logisticsProvider || 'Shipbubble',
        status: 'pending'
      }
    ]);

    if (dbError) {
      console.error('❌ Supabase Order Insert Error:', dbError);
    }

    // Save individual line items (OrderItem snapshot)
    if (Array.isArray(items) && items.length > 0) {
      const orderItemsToInsert = items.map((item) => ({
        order_id: orderId,
        product_id: item.product?.id || null,
        product_name: item.product?.name || 'Press-On Nail Set',
        unit_price: item.product?.price || 0,
        quantity: item.quantity || 1,
        selected_shape: item.selectedShape || null,
        selected_size: item.selectedSize || null
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) {
        console.error('❌ Supabase Order Items Insert Error:', itemsError);
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('❌ API Order Creation Error:', err);
    res.status(500).json({ error: 'Failed creating order', details: err.message });
  }
});

// GET /api/orders/:id — Single order lookup
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error || !order) {
      const memOrder = IN_MEMORY_ORDERS.find((o) => o.id === id);
      if (!memOrder) return res.status(404).json({ error: 'Order not found' });
      return res.json(memOrder);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

export default router;
