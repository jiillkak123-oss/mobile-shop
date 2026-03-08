import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ReviewService } from '../../services/review';
import { BRANDS, BRAND_KEYWORDS } from '../../shared/brand-constants';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  user: any = null;
  orders: any[] = [];
  loading = false;
  products: any[] = [];
  filteredProducts: any[] = [];
  categories: string[] = BRANDS;          // use shared list
  selectedCategory: string = 'All';
  cart: any[] = [];
  showCart = false;
  successMessage: string = '';
  errorMessage: string = '';
  sessionNotice: string = '';
  // Reviews
  reviews: any[] = [];
  showAddReviewModal = false;
  newReview = { productId: null as string | null, rating: 5, text: '' };
  // Bill System
  showBillModal = false;
  selectedOrder: any = null;
  TAX_RATE = 0.10; // 10% tax
  SHIPPING_COST = 10; // flat $10 shipping

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private reviewService: ReviewService
  ) {
    this.user = this.auth.getCurrentUser();
  }

  ngOnInit(): void {
    // ensure user is authenticated in case guard was bypassed
    if (!this.auth.isLoggedIn()) {
      // if route had a returnUrl or query param we leave it alone, guard should redirect
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.loadCart();
    void this.loadProfile();
    this.loadReviews();
  }

  async loadProfile() {
    this.loading = true;
    // if queryparam "cat" provided, set category filter early
    this.route.queryParams.subscribe(params => {
      if (params['cat']) {
        this.onCategoryChange(params['cat']);
      }
    });

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
            try { this.cd.detectChanges(); } catch (e) {}
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
            // If user is blocked, clear their cart
            if (this.user && this.user.status === 'blocked') {
              this.cart = [];
              this.saveCart();
            }
          } else if (meRes.status === 401 || meRes.status === 403 || meRes.status === 404) {
            // token invalid or user not found: clear local auth and continue
            this.auth.logout();
            this.user = null;
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
        }

        // Load user's personal orders only
        try {
          const myRes = await fetch('http://localhost:3000/api/my-orders', { headers });
          if (myRes.ok) {
            this.orders = await myRes.json();
            try { this.cd.detectChanges(); } catch (e) {}
          } else {
            this.orders = [];
          }
        } catch (e) {
          console.warn('Failed to load user orders', e);
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
        this.onCategoryChange(this.selectedCategory || 'All');
        try { this.cd.detectChanges(); } catch (e) {}
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
    const keywords = BRAND_KEYWORDS[this.selectedCategory] || [cat];
    this.filteredProducts = (this.products || []).filter((p: any) => {
      const c = (p.category || '').toString().toLowerCase();
      const title = (p.title || p.name || '').toString().toLowerCase();
      // check against all keywords for the selected brand
      return keywords.some(k => c.includes(k) || title.includes(k));
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  adminLogin() {
    try {
      this.router.navigate(['/admin/login']);
    } catch (e) {
      console.warn('Admin navigation failed', e);
    }
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
    // Check if user is blocked
    if (this.user && this.user.status === 'blocked') {
      this.errorMessage = 'Your account has been blocked. Contact support for assistance.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    const addQty = Math.max(1, Number(qty ?? product._qty ?? 1));
    const existing = this.cart.find(item => item._id === product._id);
    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + addQty;
    } else {
      this.cart.push({ ...product, quantity: addQty });
    }
    // normalize to integers
    this.cart = this.cart.map(i => ({ ...i, quantity: Math.max(1, Math.floor(Number(i.quantity || 1))) }));
    this.saveCart();
    try { this.cd.detectChanges(); } catch (e) {}
    this.successMessage = `${product.title || product.name} added to cart (${addQty})!`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  removeFromCart(productId: string) {
    // Check if user is blocked
    if (this.user && this.user.status === 'blocked') {
      this.errorMessage = 'Your account has been blocked. Contact support for assistance.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    this.cart = this.cart.filter(item => item._id !== productId);
    this.saveCart();
    try { this.cd.detectChanges(); } catch (e) {}
  }

  changeCartQty(productId: string, delta: number) {
    // Check if user is blocked
    if (this.user && this.user.status === 'blocked') {
      this.errorMessage = 'Your account has been blocked. Contact support for assistance.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    const idx = this.cart.findIndex(i => i._id === productId);
    if (idx === -1) return;
    const cur = Math.floor(Number(this.cart[idx].quantity) || 0);
    const next = Math.max(1, cur + Math.floor(Number(delta)));
    this.cart[idx].quantity = next;
    this.saveCart();
    try { this.cd.detectChanges(); } catch (e) {}
  }

  onCartQtyInput(productId: string, value: any) {
    // Check if user is blocked
    if (this.user && this.user.status === 'blocked') {
      this.errorMessage = 'Your account has been blocked. Contact support for assistance.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    const idx = this.cart.findIndex(i => i._id === productId);
    if (idx === -1) return;
    let n = Number(value);
    if (!isFinite(n) || n < 1) n = 1;
    n = Math.floor(n);
    this.cart[idx].quantity = n;
    this.saveCart();
    try { this.cd.detectChanges(); } catch (e) {}
  }

  getCartTotal(): number {
    return this.cart.reduce(
      (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)),
      0
    );
  }

  getCartCount(): number {
    return this.cart.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
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

  // ================= REVIEWS =================
  loadReviews() {
    const token = this.auth.getToken();
    if (!token) {
      this.reviews = [];
      return;
    }

    this.reviewService.getAll().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          // Filter only reviews created by current user
          const userId = this.user?._id;
          this.reviews = data.filter((r: any) => r.user?._id === userId);
        } else {
          this.reviews = [];
        }
      },
      error: (err) => {
        console.error('Failed to load reviews:', err);
        this.reviews = [];
      }
    });
  }

  openAddReviewModal() {
    this.newReview = { productId: null, rating: 5, text: '' };
    this.showAddReviewModal = true;
  }

  closeAddReviewModal() {
    this.showAddReviewModal = false;
    this.newReview = { productId: null, rating: 5, text: '' };
  }

  submitReview() {
    // Check if user is blocked
    if (this.user && this.user.status === 'blocked') {
      this.errorMessage = 'Your account has been blocked. Contact support for assistance.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    const token = this.auth.getToken();
    if (!token) {
      // shouldn't happen since add-review modal is only available to logged-in users
      this.errorMessage = 'You must be logged in to add a review';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.reviewService.create(this.newReview.productId, this.newReview.rating, this.newReview.text, token).subscribe({
      next: (res: any) => {
        this.successMessage = 'Review added successfully!';
        this.reviews.unshift(res);
        this.closeAddReviewModal();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Failed to add review', err);
        this.errorMessage = 'Failed to add review. Try again later.';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  // ================= BILL/INVOICE SYSTEM =================

  viewBill(order: any) {
    this.selectedOrder = order;
    this.showBillModal = true;
  }

  closeBillModal() {
    this.showBillModal = false;
    this.selectedOrder = null;
  }

  calculateSubtotal(order: any): number {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
  }

  calculateTax(order: any): number {
    const subtotal = this.calculateSubtotal(order);
    return subtotal * this.TAX_RATE;
  }

  calculateTotal(order: any): number {
    const subtotal = this.calculateSubtotal(order);
    const tax = this.calculateTax(order);
    return subtotal + tax + this.SHIPPING_COST;
  }

  printBill() {
    window.print();
  }

  downloadBill() {
    if (!this.selectedOrder) return;
    const order = this.selectedOrder;
    const subtotal = this.calculateSubtotal(order);
    const tax = this.calculateTax(order);
    const total = this.calculateTotal(order);
    
    let billText = `INVOICE\n`;
    billText += `${'='.repeat(40)}\n\n`;
    billText += `Order ID: ${order._id}\n`;
    billText += `Date: ${new Date(order.createdAt).toLocaleDateString()}\n`;
    billText += `Status: ${order.status}\n\n`;
    billText += `${'='.repeat(40)}\n`;
    billText += `ITEMS:\n`;
    billText += `-`.repeat(40) + `\n`;
    
    order.items.forEach((item: any) => {
      const itemName = item.product?.title || item.product || 'Product';
      const lineTotal = (item.price || 0) * (item.quantity || 0);
      billText += `${itemName}\n`;
      billText += `  Qty: ${item.quantity} × $${item.price?.toFixed(2)} = $${lineTotal.toFixed(2)}\n`;
    });
    
    billText += `-`.repeat(40) + `\n`;
    billText += `Subtotal: $${subtotal.toFixed(2)}\n`;
    billText += `Tax (10%): $${tax.toFixed(2)}\n`;
    billText += `Shipping: $${this.SHIPPING_COST.toFixed(2)}\n`;
    billText += `${'='.repeat(40)}\n`;
    billText += `TOTAL: $${total.toFixed(2)}\n`;
    billText += `${'='.repeat(40)}\n`;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(billText));
    element.setAttribute('download', `bill-${order._id?.substring(0, 8) || 'unknown'}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}
