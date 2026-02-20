// routes/order.js
const express = require('express');
const router = express.Router();
const Order = require('../models/order');

// ---------------- CREATE ORDER ----------------
router.post('/create', async (req, res) => {
  try {
    const { user, items, totalPrice, status } = req.body;

    if (!user || !items || items.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    const newOrder = new Order({
      user,
      items,
      totalPrice,
      status: status || 'Pending', // default status
    });

    await newOrder.save();

    res.status(201).json({
      message: "Order placed successfully",
      order: newOrder
    });
  } catch (error) {
    console.error("Order Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------- GET ALL ORDERS ----------------
router.get('/all-orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------- UPDATE ORDER STATUS ----------------
router.put('/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ message: error.message });
  }
});


// ---------------- DELETE ORDER ----------------
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findByIdAndDelete(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete Order Error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;