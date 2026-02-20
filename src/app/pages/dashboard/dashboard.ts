import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  user: any = null;
  orders: any[] = [];
  loading = false;
  products: any[] = [];
  cart: any[] = [];
  showCart = false;

  constructor(private auth: AuthService, private router: Router) {
    this.user = this.auth.getCurrentUser();
    this.loadCart();
    this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    try {
      const opts = this.auth.getAuthHeaders();

      // Load user profile
      try {
        const meRes = await fetch('http://localhost:3000/api/me', opts);
        if (meRes.ok) {
          const me: any = await meRes.json();
          if (me && me._id) this.user = me;
        }
      } catch (e) {
        console.warn('Failed to load user profile', e);
      }

      // Load user orders
      try {
        const ordRes = await fetch('http://localhost:3000/api/my-orders', opts);
        if (ordRes.ok) {
          this.orders = await ordRes.json();
        }
      } catch (e) {
        console.warn('Failed to load orders', e);
      }

    } catch (e) {
      console.error('loadProfile error', e);
    }

    // Load public products
    try {
      const prodRes = await fetch('http://localhost:3000/api/products');
      if (prodRes.ok) {
        this.products = await prodRes.json();
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      this.loading = false;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // ---------------- CART FUNCTIONS ----------------

  loadCart() {
    const saved = localStorage.getItem('user-cart');
    try {
      this.cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.cart = [];
    }
  }

  saveCart() {
    localStorage.setItem('user-cart', JSON.stringify(this.cart));
  }

  addToCart(product: any) {
    const existing = this.cart.find(item => item._id === product._id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    this.saveCart();
    alert(`${product.title || product.name} added to cart!`);
  }

  removeFromCart(productId: string) {
    this.cart = this.cart.filter(item => item._id !== productId);
    this.saveCart();
  }

  getCartTotal(): number {
    return this.cart.reduce(
      (sum, item) => sum + ((item.price || 0) * (item.quantity || 1)),
      0
    );
  }

  getCartCount(): number {
    return this.cart.reduce(
      (sum, item) => sum + (item.quantity || 1),
      0
    );
  }

  toggleCart() {
    this.showCart = !this.showCart;
  }

  // ---------------- CHECKOUT (REAL ORDER SAVE) ----------------

  async checkout() {
    if (this.cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const orderData = {
        items: this.cart.map(item => ({
          product: item._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalPrice: this.getCartTotal()
      };

      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeaders().headers
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Order failed');
      }

      alert('Order placed successfully!');

      this.cart = [];
      this.saveCart();
      this.showCart = false;

      // Reload orders
      await this.loadProfile();

    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to place order');
    }
  }
}