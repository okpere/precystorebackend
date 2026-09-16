import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_precynails_key_2026';

// Simulated Vendor Accounts Database (Connected to Supabase PostgreSQL)
const VENDOR_ACCOUNTS = [
  {
    email: 'vendor@precynails.ng',
    handle: '@precynails.ng',
    shopName: 'PrecyNails Luxury Press-On Studio',
    passwordHash: bcrypt.hashSync('password123', 10)
  }
];

// Vendor Login Endpoint
router.post('/login', async (req, res) => {
  const { emailOrHandle, password } = req.body;

  if (!emailOrHandle || !password) {
    return res.status(400).json({ error: 'Please provide handle/email and password' });
  }

  const vendor = VENDOR_ACCOUNTS.find(
    (v) => v.email.toLowerCase() === emailOrHandle.toLowerCase() || v.handle.toLowerCase() === emailOrHandle.toLowerCase()
  );

  if (!vendor) {
    return res.status(401).json({ error: 'Invalid handle/email or password' });
  }

  const isMatch = await bcrypt.compare(password, vendor.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid handle/email or password' });
  }

  const token = jwt.sign(
    { email: vendor.email, handle: vendor.handle, shopName: vendor.shopName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      email: vendor.email,
      handle: vendor.handle,
      shopName: vendor.shopName,
      isLoggedIn: true
    }
  });
});

// Vendor Registration Endpoint
router.post('/register', async (req, res) => {
  const { shopName, email, handle, password } = req.body;

  if (!shopName || !email || !password) {
    return res.status(400).json({ error: 'Please fill in all required registration fields' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const formattedHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : `@${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const newVendor = {
    email,
    handle: formattedHandle,
    shopName,
    passwordHash
  };

  VENDOR_ACCOUNTS.push(newVendor);

  const token = jwt.sign(
    { email: newVendor.email, handle: newVendor.handle, shopName: newVendor.shopName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      email: newVendor.email,
      handle: newVendor.handle,
      shopName: newVendor.shopName,
      isLoggedIn: true
    }
  });
});

export default router;
