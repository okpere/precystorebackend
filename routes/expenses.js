import express from 'express';
import { verifyVendorToken } from '../middleware/auth.js';

const router = express.Router();

let EXPENSES = [
  { id: '1', title: 'IG Ad Campaign - Pearl Ombre Nails', amount: 15000, date: 'Today' },
  { id: '2', title: 'Custom Branded Nail Packaging Boxes & Glue', amount: 24000, date: 'Yesterday' }
];

// Get expenses (Vendor Protected)
router.get('/', verifyVendorToken, (req, res) => {
  res.json(EXPENSES);
});

// Add new expense (Vendor Protected)
router.post('/', verifyVendorToken, (req, res) => {
  const newExpense = {
    id: Date.now().toString(),
    date: 'Today',
    ...req.body
  };
  EXPENSES.unshift(newExpense);
  res.status(201).json(newExpense);
});

export default router;
