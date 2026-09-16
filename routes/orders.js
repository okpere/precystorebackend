import express from 'express';
import { verifyVendorToken } from '../middleware/auth.js';

const router = express.Router();

let ORDERS = [];

// Get all orders (Vendor Protected)
router.get('/', verifyVendorToken, (req, res) => {
  res.json(ORDERS);
});

// Create new customer order (Public)
router.post('/', (req, res) => {
  const newOrder = {
    id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
    status: 'Confirmed',
    ...req.body
  };
  ORDERS.unshift(newOrder);
  res.status(201).json(newOrder);
});

// Update order status (Vendor Protected)
router.patch('/:id/status', verifyVendorToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = ORDERS.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  res.json(order);
});

export default router;
