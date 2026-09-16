import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { supabase } from '../config/db.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_precynails_key_2026';

// Single Admin default credentials fallback
const DEFAULT_ADMIN = {
  email: 'vendor@precynails.ng',
  handle: '@precynails.ng',
  shopName: 'PrecyNails Studio',
  password_hash: bcrypt.hashSync('password123', 10)
};

// POST /api/auth/admin/login — admin login, returns JWT
router.post('/admin/login', async (req, res) => {
  const { email, password_hash, password } = req.body;
  const inputPassword = password || password_hash;

  if (!email || !inputPassword) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Check Supabase admins table
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    let validAdmin = null;

    if (admin && !error) {
      const isMatch = bcrypt.compareSync(inputPassword, admin.password_hash);
      if (isMatch) validAdmin = admin;
    } else if (email.toLowerCase().trim() === DEFAULT_ADMIN.email) {
      const isMatch = bcrypt.compareSync(inputPassword, DEFAULT_ADMIN.password_hash);
      if (isMatch) {
        validAdmin = {
          id: 'admin-default-id',
          email: DEFAULT_ADMIN.email,
          handle: DEFAULT_ADMIN.handle,
          shopName: DEFAULT_ADMIN.shopName,
          role: 'admin'
        };
      }
    }

    if (!validAdmin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: validAdmin.id, email: validAdmin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin authentication successful 💅',
      token,
      admin: {
        id: validAdmin.id,
        email: validAdmin.email,
        handle: validAdmin.handle || '@precynails.ng',
        shopName: validAdmin.shopName || 'PrecyNails Studio',
        isLoggedIn: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

// POST /api/auth/admin/register — admin registration
router.post('/admin/register', async (req, res) => {
  const { email, password, shopName, handle } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const formattedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('*')
      .eq('email', formattedEmail)
      .single();

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin account with this email already exists' });
    }

    // Insert into Supabase admins table
    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          email: formattedEmail,
          password_hash,
          role: 'admin'
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Register Error:', error);
    }

    const adminId = data && data[0] ? data[0].id : 'admin-' + Date.now();

    const token = jwt.sign(
      { id: adminId, email: formattedEmail, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Admin account created successfully 💅',
      token,
      admin: {
        id: adminId,
        email: formattedEmail,
        handle: handle || '@precynails.ng',
        shopName: shopName || 'PrecyNails Studio',
        isLoggedIn: true
      }
    });
  } catch (err) {
    console.error('Register API Error:', err);
    res.status(500).json({ error: 'Server error during admin registration' });
  }
});

// POST /api/auth/admin/logout
router.post('/admin/logout', (req, res) => {
  res.json({ message: 'Admin logged out successfully' });
});

export default router;
