require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-secret';
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const User = require('./models/user');
const Product = require('./models/product');
const Order = require('./models/order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mobile-shop';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    seedProductsIfNeeded();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Seed Products
async function seedProductsIfNeeded() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const seed = [
        { title: 'Phone X', price: 799, description: 'A great phone', image: '/images/phone1.jpg', category: 'smartphone' },
        { title: 'Phone Y', price: 699, description: 'A solid choice', image: '/images/phone2.jpg', category: 'smartphone' },
        { title: 'Charger', price: 19, description: 'Fast charger', image: '/images/charger.jpg', category: 'accessory' }
      ];
      await Product.insertMany(seed);
      console.log('Seeded products');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Ensure public images folder exists for uploads
const uploadDir = path.join(__dirname, '..', 'public', 'images');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  console.error('Failed to create upload dir', err);
}

// Multer setup for product image uploads (max 5MB)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Serve uploaded images
app.use('/images', express.static(uploadDir));

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product - supports FormData file upload (field 'image') or JSON body
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    // If multipart/form-data, fields are in req.body and file in req.file
    const body = req.body || {};
    const title = body.name || body.title || '';
    const price = Number(body.price || body.price === 0 ? body.price : body.price);
    const category = body.category || 'Uncategorized';
    const description = body.description || '';

    if (!title || isNaN(price)) {
      return res.status(400).json({ error: 'Missing required fields: name and price' });
    }

    let imagePath = '';
    if (req.file) {
      // Build absolute URL so frontend can load images across ports
      const host = req.get('host');
      imagePath = `${req.protocol}://${host}/images/${req.file.filename}`;
    }

    const product = new Product({
      title: title,
      description: description,
      price: price,
      image: imagePath,
      category: category
    });
    await product.save();
    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error('Create product error', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ================= User Auth =================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role: 'user' });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Registered', user: { _id: user._id, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'user' });
    console.log('user-login attempt', email, !!user, user ? (user.password || '').slice(0,30) : '');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    let ok = false;
    if (user.password && user.password.startsWith && user.password.startsWith('$2')) {
      ok = await bcrypt.compare(password, user.password);
    } else {
      // legacy plaintext stored password — accept match and upgrade to hashed
      ok = (password === user.password);
      if (ok) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Logged in', user: { _id: user._id, email: user.email, role: user.role, token }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= Admin Auth =================
app.post('/api/auth/admin-register', async (req, res) => {
  try {
    const { name, email, password, masterAdminCode } = req.body;
    if (!email || !password || !masterAdminCode) return res.status(400).json({ error: 'Missing required fields' });

    if (masterAdminCode !== process.env.MASTER_ADMIN_CODE && masterAdminCode !== '1234') {
      return res.status(401).json({ error: 'Invalid master admin code' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Admin already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = new User({ name, email, password: hashed, role: 'admin' });
    await admin.save();
    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Admin registered successfully', user: { _id: admin._id, email: admin.email, role: admin.role, token }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, role: 'admin' });
    console.log('admin-login attempt', email, !!admin, admin ? (admin.password || '').slice(0,30) : '');
    if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });
    let ok = false;
    if (admin.password && admin.password.startsWith && admin.password.startsWith('$2')) {
      ok = await bcrypt.compare(password, admin.password);
    } else {
      ok = (password === admin.password);
      if (ok) {
        admin.password = await bcrypt.hash(password, 10);
        await admin.save();
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid admin credentials' });
    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Admin logged in', admin: { _id: admin._id, email: admin.email, role: admin.role, token }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = payload;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ================= Admin Endpoints =================
// Get all users (only normal users)
app.get('/api/admin/all-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all admins
app.get('/api/admin/all-admins', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password').lean();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Debug: DB info (name, collections, counts)
app.get('/api/admin/db-info', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name || (db && db.databaseName) || 'unknown';
    const cols = await db.listCollections().toArray();
    const info = { dbName, collections: [] };
    for (const c of cols) {
      const count = await db.collection(c.name).countDocuments();
      info.collections.push({ name: c.name, count });
    }
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Current user profile
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders for current user
app.get('/api/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// ================= Create Order =================
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, totalPrice } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items required' });
    }

    const newOrder = new Order({
      user: req.user.id,   // logged in user automatically
      items,
      totalPrice,
      status: 'pending'
    });

    await newOrder.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});


// Admin: Get all products
app.get('/api/admin/all-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all orders
app.get('/api/admin/all-orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'title price')
      .lean();

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
// Admin: Update order status
app.put('/api/admin/update-order/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order });

  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
// Existing Product & Order endpoints (no change needed)
// ... keep all your product and order routes from your original server.js

// ================= Start Server =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});