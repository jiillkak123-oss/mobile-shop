require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/user');
const Product = require('./models/product');
const Order = require('./models/order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mobile-shop';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('\n========== DATABASE RECORDS ==========\n');

    const users = await User.find();
    console.log(`✓ USERS (${users.length} records):`);
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
    });

    const products = await Product.find();
    console.log(`\n✓ PRODUCTS (${products.length} records):`);
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. Title: ${p.title}, Price: $${p.price}, Category: ${p.category}`);
    });

    const orders = await Order.find();
    console.log(`\n✓ ORDERS (${orders.length} records):`);
    orders.forEach((o, i) => {
      console.log(`  ${i + 1}. Order ID: ${o._id}, User: ${o.user}, Total: $${o.totalPrice}, Status: ${o.status}`);
    });

    console.log('\n=====================================\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
