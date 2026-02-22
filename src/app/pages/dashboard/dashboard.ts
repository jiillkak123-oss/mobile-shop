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
  filteredProducts: any[] = [];
  categories: string[] = ['All', 'Oppo', 'Vivo', 'Realme', 'Samsung', 'Apple'];
  selectedCategory: string = 'All';
  cart: any[] = [];
  showCart = false;
  successMessage: string = '';
  errorMessage: string = '';
  sessionNotice: string = '';

  constructor(private auth: AuthService, private router: Router) {
    this.user = this.auth.getCurrentUser();
    this.loadCart();
    this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    try {
      const token = this.auth.getToken();

      if (!token) {
        // No auth token: show public (guest) orders so the dashboard isn't empty
        if (this.user) {
          this.sessionNotice = 'Session expired. Please log in again to view your personal orders.';
        }
        this.user = null;
        try {
          const pubRes = await fetch('http://localhost:3000/api/orders/public');
          if (pubRes.ok) {
            this.orders = await pubRes.json();
          } else {
            this.orders = [];
          }
        } catch (e) {
          console.warn('Failed to load public orders', e);
          this.orders = [];
        }
      } else {
        this.sessionNotice = '';
        const headers: any = { Authorization: `Bearer ${token}` };

        // Load user profile
        try {
          const meRes = await fetch('http://localhost:3000/api/me', { headers });
          if (meRes.ok) {
            const me: any = await meRes.json();
            if (me && me._id) this.user = me;
          } else if (meRes.status === 401 || meRes.status === 403 || meRes.status === 404) {
            // token invalid or user not found: clear local auth and continue
            this.auth.logout();
            this.user = null;
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
        }

        // Load all orders from server (includes public and user orders) to ensure none are omitted
        try {
          const allRes = await fetch('http://localhost:3000/api/orders/all', { headers });
          if (allRes.ok) {
            this.orders = await allRes.json();
          } else {
            this.orders = [];
          }
        } catch (e) {
          console.warn('Failed to load all orders', e);
          this.orders = [];
        }
      }

    } catch (e) {
      console.error('loadProfile error', e);
    }

    // Load public products
    try {
      const prodRes = await fetch('http://localhost:3000/api/products');
      console.log('Products response status:', prodRes.status, prodRes.ok);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        console.log('Products fetched:', prodData);
        this.products = Array.isArray(prodData) ? prodData : [];
        // initialize filtered list
        this.filteredProducts = Array.isArray(this.products) ? [...this.products] : [];
        console.log('Products set:', this.products.length, 'Filtered:', this.filteredProducts.length);
      } else {
        console.error('Products endpoint failed with status:', prodRes.status);
        this.products = [];
        this.filteredProducts = [];
      }
    } catch (e) {
      console.error('Failed to load products', e);
      this.products = [];
      this.filteredProducts = [];
    } finally {
      this.loading = false;
    }
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category || 'All';
    if (!this.selectedCategory || this.selectedCategory === 'All') {
      this.filteredProducts = Array.isArray(this.products) ? [...this.products] : [];
      return;
    }

    const cat = this.selectedCategory.toLowerCase();
    this.filteredProducts = (this.products || []).filter((p: any) => {
      const c = (p.category || '').toString().toLowerCase();
      const title = (p.title || p.name || '').toString().toLowerCase();
      return c.includes(cat) || title.includes(cat);
    });
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

  addToCart(product: any, qty?: number) {
    const addQty = qty || product._qty || 1;
    const existing = this.cart.find(item => item._id === product._id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + addQty;
    } else {
      this.cart.push({ ...product, quantity: addQty });
    }
    // normalize to integers
    this.cart = this.cart.map(i => ({ ...i, quantity: Math.max(1, Number(i.quantity || 1)) }));
    this.saveCart();
    this.successMessage = `${product.title || product.name} added to cart (${addQty})!`;
    setTimeout(() => this.successMessage = '', 3000);
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

  viewProduct(p: any) {
    if (!p) return;
    try {
      // try navigate to product route if available
      this.router.navigate(['/product', p._id || p.id]);
    } catch (e) {
      // fallback: show basic info
      // fallback: show basic info as non-blocking toast
      this.successMessage = `${p.title || p.name || 'Product'}`;
      setTimeout(() => this.successMessage = '', 3000);
    }
  }

  // ---------------- CHECKOUT (REAL ORDER SAVE) ----------------

  async checkout() {
    if (this.cart.length === 0) {
      this.errorMessage = 'Cart is empty';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }
    const token = this.auth.getToken();
    const orderData = {
      items: this.cart.map(item => ({ product: item._id, quantity: item.quantity, price: item.price })),
      totalPrice: this.getCartTotal()
    };

    try {
      let response: Response;
      if (token) {
        response = await fetch('http://localhost:3000/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(orderData)
        });
      } else {
        // guest/public order
        response = await fetch('http://localhost:3000/api/orders/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
      }

      // read response text once, then try to parse JSON from it
      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseErr) {
        // not JSON, keep raw text
        data = rawText;
      }

      if (!response.ok) {
        // If server returned HTML (Express error page), try to extract the <pre> message
        let errMsg = 'Order failed';
        if (data && (data.error || data.message)) {
          errMsg = data.error || data.message;
        } else if (typeof data === 'string') {
          const html = data as string;
          const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
          if (preMatch && preMatch[1]) errMsg = preMatch[1].trim();
          else if (html.indexOf('<!DOCTYPE') === 0 || html.indexOf('<html') >= 0) {
            // fallback to short status text when full HTML returned
            errMsg = response.status + ' ' + (response.statusText || 'Error');
          } else {
            errMsg = html;
          }
        } else {
          errMsg = response.status + ' ' + (response.statusText || 'Error');
        }

        throw new Error(errMsg);
      }

      const createdOrder = (data && data.order) ? data.order : (data && typeof data === 'object' ? data : null);
      if (createdOrder) {
        this.orders = [createdOrder, ...(this.orders || [])];
      }

      this.successMessage = 'Order placed successfully!';
      setTimeout(() => this.successMessage = '', 3000);

      this.cart = [];
      this.saveCart();
      this.showCart = false;

      await this.loadProfile();
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      let msg = 'Failed to place order';
      if (typeof err === 'string') msg = err;
      else if (err && typeof (err as any).message === 'string') msg = (err as any).message;
      this.errorMessage = msg;
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }
}