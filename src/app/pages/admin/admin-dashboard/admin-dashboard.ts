import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProductService } from '../../../services/product';
import { OrderService } from '../../../services/order';
import { ReviewService } from '../../../services/review';
import { HttpClientModule, HttpClient } from '@angular/common/http';
// Type for navigation sections
export type NavSection = 'dashboard' | 'products' | 'orders' | 'users' | 'revenue' | 'reviews';

interface Order {
  _id: string;
  user?: { name?: string; email?: string };
  items?: { product?: { name?: string; title?: string }; quantity?: number }[];
  totalPrice: number;
  status: string;
  createdAt: string;
}


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})

export class AdminDashboardComponent implements OnInit {
  
  activeNav: NavSection = 'dashboard';
  adminName: string = 'Admin User';
  searchQuery: string = '';
  // Categories matching user dashboard
  categories: string[] = ['Oppo', 'Vivo', 'Realme', 'Samsung', 'Apple', 'Redmi', 'Oneplus', 'Motorola'];

  // Modal states
  showAddProductModal: boolean = false;
  showAddUserModal: boolean = false;
  showReportModal: boolean = false;
  showDeleteConfirmModal: boolean = false;
  userToDelete: any = null;

  // Product form
  productForm = {
    name: '',
    price: '',
    category: '',
    stock: '',
    description: '',
    image: null as File | null,
    variants: [] as Array<{ name: string; value: string }>
  };
  productImagePreview: string | null = null;

  // Orders & Users
  orders: any[] = [];
  filteredOrders: any[] = [];
  ordersSearchQuery: string = '';
  ordersFilterStatus: string = 'all';
  ordersSortBy: 'date' | 'amount' = 'date';
  ordersSortOrder: 'asc' | 'desc' = 'desc';
  
  // Reviews
  reviews: any[] = [];
  filteredReviews: any[] = [];
  // filters
  reviewRatingFilter: string = 'all';
  reviewSearchQuery: string = '';
  // Review modal for admin
  showAddReviewModal = false;
  newReview = { productId: null as string | null, rating: 5, text: '' };
  selectedOrder: Order | null = null;
  users: any[] = [];
  paginatedUsers: any[] = [];
  currentUserPage: number = 1;
  usersPerPage: number = 10;
  totalUsers: number = 0;

  // User form
  userForm = {
    name: '',
    email: '',
    role: 'user',
    status: 'active'
  };

  // track submission/loading state for add/edit user
  isSubmittingUser: boolean = false;

  // Report form
  reportForm = {
    type: 'sales',
    startDate: '',
    endDate: '',
    format: 'pdf'
  };

  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  // Products list
  products: any[] = [];
  filteredProducts: any[] = [];
  useBackend: boolean = true;
  isEditing: boolean = false;
  editingProductId: string | null = null;
  editingUserId: string | null = null;
  isLoadingProducts: boolean = false;

  // ✅ REVENUE TRACKING
  revenueData: any = {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    completedOrders: 0,
    dailyRevenue: [] as Array<{ date: string; revenue: number }>,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    revenueGrowth: 0,
    topProducts: [] as Array<{ name: string; revenue: number; orders: number }>
  };
  revenueFilterPeriod: 'all' | '7days' | '30days' | '90days' | 'year' = '30days';

  // Math object for template
  Math = Math;

  // ✅ SINGLE constructor
  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private reviewService: ReviewService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // try to read stored admin name
    const storedName = localStorage.getItem('admin-name');
    if (storedName) {
      this.adminName = storedName;
    } else {
      const storedUser = localStorage.getItem('admin-user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u.name) this.adminName = u.name;
        } catch {}
      }
    }

    this.loadOrdersForRevenue();
    this.loadOrders();
    this.loadReviews();
    this.loadProducts();
    this.loadUsers();
    this.checkAdminToken();
  }

  // Load reviews (admin)
  loadReviews() {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.reviews = [];
      return;
    }

    fetch('http://localhost:3000/api/admin/all-reviews', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then((data: any) => {
      if (Array.isArray(data)) {
        this.reviews = data;
      } else {
        this.reviews = [];
      }
      this.applyReviewFilters();
    })
    .catch(err => {
      console.error('Failed to load reviews:', err);
      this.reviews = [];
      this.applyReviewFilters();
    });
  }

  // Admin: delete a review
  deleteReview(reviewId: string) {
    if (!confirm('Delete this review?')) return;
    const token = localStorage.getItem('admin-token');
    if (!token) return;
    // remove immediately from UI
    const originalIndex = this.filteredReviews.findIndex(r => r._id === reviewId);
    if (originalIndex !== -1) {
      this.filteredReviews.splice(originalIndex, 1);
    }
    this.reviews = this.reviews.filter(r => r._id !== reviewId);
    this.successMessage = 'Review deleted';
    this.clearMessages();
    
    // then sync with server
    fetch(`http://localhost:3000/api/admin/reviews/${reviewId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
      .then(res => res.json())
      .then(() => {
        // server confirmed, all good
      })
      .catch(err => {
        console.error('Failed to delete review:', err);
        // reload on error to ensure consistency
        this.loadReviews();
        this.errorMessage = 'Failed to delete review';
        this.clearMessages();
      });
  }


  // Admin: open add-review modal
  openAddReviewModal() {
    this.newReview = { productId: null, rating: 5, text: '' };
    this.showAddReviewModal = true;
  }

  applyReviewFilters() {
    let result = [...this.reviews];
    
    // Remove guest reviews (reviews without user information)
    result = result.filter(r => {
      const hasUserInfo = (r.user?.name && r.user.name.trim()) || 
                          (r.user?.email && r.user.email.trim());
      return hasUserInfo;
    });
    
    if (this.reviewRatingFilter !== 'all') {
      const num = Number(this.reviewRatingFilter);
      result = result.filter(r => r.rating === num);
    }
    if (this.reviewSearchQuery && this.reviewSearchQuery.trim()) {
      const q = this.reviewSearchQuery.toLowerCase();
      result = result.filter(r => {
        const prod = r.product?.title || '';
        const user = r.user?.name || r.user?.email || '';
        const text = r.text || '';
        return prod.toLowerCase().includes(q) || user.toLowerCase().includes(q) || text.toLowerCase().includes(q);
      });
    }
    this.filteredReviews = result;
  }

  // Mark review as helpful
  markHelpful(reviewId: string) {
    const reviewIdx = this.reviews.findIndex(r => r._id === reviewId);
    if (reviewIdx === -1) return;
    
    // optimistic UI update
    this.reviews[reviewIdx].helpfulCount = (this.reviews[reviewIdx].helpfulCount || 0) + 1;
    this.applyReviewFilters();
    
    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'Not authenticated';
      this.clearMessages();
      return;
    }
    
    // sync with server (optional endpoint - may not exist yet)
    fetch(`http://localhost:3000/api/reviews/${reviewId}/helpful`, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    .catch(err => console.warn('Failed to update helpful count:', err));
  }

  // Admin: submit new review
  submitNewReview() {
    if (!this.newReview.productId || !this.newReview.text.trim()) {
      this.errorMessage = 'Please select a product and enter review text';
      this.clearMessages();
      return;
    }
    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'Not authenticated';
      this.clearMessages();
      return;
    }
    this.reviewService.create(this.newReview.productId, this.newReview.rating, this.newReview.text, token)
      .subscribe({
        next: (res) => {
              // reload from server to avoid duplicates
        this.loadReviews();
        this.showAddReviewModal = false;
        this.successMessage = 'Review added';
        this.clearMessages();
        },
        error: (err) => {
          console.error('Failed to add review', err);
          this.errorMessage = 'Failed to add review';
          this.clearMessages();
        }
      });
  }

  /** ---------------- Orders ---------------- **/
loadOrders() {
  this.orderService.getAll().subscribe({
    next: (data: any) => {
      if (Array.isArray(data)) {
        this.orders = data;
      } else if (data.orders) {
        this.orders = data.orders;
      } else {
        this.orders = [];
      }
      this.applyOrderFilters();
    },
    error: (err) => {
      console.error('Failed to load orders', err);
      this.errorMessage = 'Failed to load orders';
      this.clearMessages();
    }
  });
}

  // ✅ Load orders and calculate revenue
  loadOrdersForRevenue(): void {
    this.orderService.getAll().subscribe({
      next: (data: any) => {
        this.orders = Array.isArray(data) ? data : (data.orders || []);
        this.calculateRevenue();
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.orders = [];
      }
    });
  }

  // helper to show limited orders on dashboard
  get displayedOrders() {
    if (this.activeNav === 'dashboard') {
      return this.filteredOrders ? this.filteredOrders.slice(0, 5) : [];
    }
    return this.filteredOrders;
  }

  // ✅ Apply filters and sorting to orders
  applyOrderFilters(): void {
    let result = [...this.orders];

    // Remove guest orders (orders without user information)
    result = result.filter(order => {
      const hasUserInfo = (order.user?.name && order.user.name.trim()) || 
                          (order.user?.email && order.user.email.trim());
      return hasUserInfo;
    });

    // Filter by status
    if (this.ordersFilterStatus !== 'all') {
      result = result.filter(order => 
        (order.status || '').toLowerCase() === this.ordersFilterStatus.toLowerCase()
      );
    }

    // Search by order ID, customer, email, or product
    if (this.ordersSearchQuery && this.ordersSearchQuery.trim()) {
      const q = this.ordersSearchQuery.toLowerCase();
      result = result.filter(order => {
        const orderId = (order._id || '').toLowerCase();
        const customerName = (order.user?.name || '').toLowerCase();
        const customerEmail = (order.user?.email || '').toLowerCase();
        const productNames = order.items?.map((item: any) => 
          (item.product?.title || item.product?.name || '').toLowerCase()
        ).join(' ') || '';
        
        return orderId.includes(q) || 
               customerName.includes(q) || 
               customerEmail.includes(q) || 
               productNames.includes(q);
      });
    }

    // Sort by date or amount
    if (this.ordersSortBy === 'date') {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return this.ordersSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (this.ordersSortBy === 'amount') {
      result.sort((a, b) => {
        const amountA = a.totalPrice || 0;
        const amountB = b.totalPrice || 0;
        return this.ordersSortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      });
    }

    this.filteredOrders = result;
  }

  // ✅ Calculate revenue from orders
  calculateRevenue(): void {
    if (!this.orders || this.orders.length === 0) {
      this.revenueData = {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        dailyRevenue: [],
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        revenueGrowth: 0,
        topProducts: []
      };
      return;
    }

    const now = new Date();
    let filteredOrders = this.orders;
    const dailyMap = new Map<string, number>();
    
    // Filter orders by date range
    if (this.revenueFilterPeriod !== 'all') {
      filteredOrders = this.orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (this.revenueFilterPeriod) {
          case '7days': return daysDiff <= 7;
          case '30days': return daysDiff <= 30;
          case '90days': return daysDiff <= 90;
          case 'year': return daysDiff <= 365;
          default: return true;
        }
      });
    }

    // Calculate metrics
    let totalRevenue = 0;
    const productMap = new Map<string, { revenue: number; orders: number }>();

    filteredOrders.forEach((order: any) => {
      totalRevenue += order.totalPrice || 0;

      // Daily revenue
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + (order.totalPrice || 0));

      // Top products
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          const productName = item.product?.title || item.product?.name || 'Unknown';
          const productRevenue = (item.price || 0) * (item.quantity || 1);
          
          if (productMap.has(productName)) {
            const existing = productMap.get(productName)!;
            existing.revenue += productRevenue;
            existing.orders += 1;
          } else {
            productMap.set(productName, { revenue: productRevenue, orders: 1 });
          }
        });
      }
    });

    // Convert daily revenue to sorted array
    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);

    // Top products
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate growth
    const previousRevenue = this.calculatePreviousPeriodRevenue();
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    this.revenueData = {
      totalRevenue: Math.round(totalRevenue),
      totalOrders: filteredOrders.length,
      averageOrderValue: filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0,
      completedOrders: this.orders.filter((o: any) => o.status === 'completed' || o.status === 'Completed').length,
      dailyRevenue,
      monthlyRevenue: Math.round(totalRevenue / (this.revenueFilterPeriod === '30days' ? 1 : 30)),
      yearlyRevenue: Math.round((totalRevenue / (this.revenueFilterPeriod === 'year' ? 1 : 365)) * 365),
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      topProducts
    };
  }

  // ✅ Calculate previous period revenue for comparison
  calculatePreviousPeriodRevenue(): number {
    if (!this.orders || this.orders.length === 0) return 0;

    const now = new Date();
    let daysInPeriod = 30;
    
    switch (this.revenueFilterPeriod) {
      case '7days': daysInPeriod = 7; break;
      case '30days': daysInPeriod = 30; break;
      case '90days': daysInPeriod = 90; break;
      case 'year': daysInPeriod = 365; break;
    }

    const previousOrders = this.orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > daysInPeriod && daysDiff <= daysInPeriod * 2;
    });

    return previousOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  }

  // ✅ Filter revenue by period
  filterRevenueByPeriod(period: 'all' | '7days' | '30days' | '90days' | 'year'): void {
    this.revenueFilterPeriod = period;
    this.calculateRevenue();
  }

  // ✅ Get revenue status color
  getRevenueStatusColor(): string {
    if (this.revenueData.revenueGrowth > 0) return 'green';
    if (this.revenueData.revenueGrowth < 0) return 'red';
    return 'gray';
  }

  // Get max daily revenue for chart scaling
  getMaxDailyRevenue(): number {
    if (!this.revenueData.dailyRevenue || this.revenueData.dailyRevenue.length === 0) return 0;
    return Math.max(...this.revenueData.dailyRevenue.map((d: any) => d.revenue));
  }

  // Calculate percentage height for chart bar
  getBarHeight(revenue: number): number {
    const max = this.getMaxDailyRevenue();
    if (max === 0) return 0;
    return (revenue / max) * 100;
  }

  // ✅ Format currency in Indian Rupees
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  viewOrderDetails(order: any) {
    const customerName = order.user?.name || order.user?.email || 'Guest';
    const items = order.items?.map((item: any) => 
      `${item.product?.title || item.product?.name || 'Product'} (Qty: ${item.quantity})`
    ).join('\n') || 'No items';

    const details = `
📦 Order Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: #${order._id?.slice(-6)}
Customer: ${customerName}
Status: ${order.status || 'Pending'}
Total: ₹${order.totalPrice?.toFixed(2) || '0.00'}
Date: ${new Date(order.createdAt).toLocaleString()}

🛒 Items:
${items}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    alert(details);
  }

// AdminDashboardComponent
markAsCompleted(orderId: string) {
  this.orderService.updateStatus(orderId, 'Completed').subscribe({
    next: (res) => {
      console.log('Order marked Completed:', res);
      const idx = this.orders.findIndex(o => o._id === orderId);
      if (idx !== -1) {
        this.orders[idx].status = 'Completed';
        this.calculateRevenue();
      }
    },
    error: (err) => {
      console.error('Failed to update order status', err);
    }
  });
  
}

navigateToSection(section: NavSection) {
  this.activeNav = section;
  console.log('Navigated to:', section);
}

  // admin-dashboard.component.ts
changeOrderStatus(orderId: string, event: Event) {
  const newStatus = (event.target as HTMLSelectElement).value;
  // Update UI immediately
  const orderIdx = this.orders.findIndex(o => o._id === orderId);
  if (orderIdx !== -1) {
    this.orders[orderIdx].status = newStatus;
    this.orders = [...this.orders]; // Trigger change detection
  }
  
  this.successMessage = `Order marked ${newStatus}!`;
  this.clearMessages();

  this.orderService.updateStatus(orderId, newStatus).subscribe({
    next: () => {
      console.log('Order status updated');
      // recalculate revenue since status change may affect completedOrders
      this.calculateRevenue();
    },
    error: (err) => {
      console.error('Error updating status:', err);
      // Reload on error
      this.loadOrders();
      this.errorMessage = 'Failed to update order status';
      this.clearMessages();
    }
  });

}

  /** ---------------- Products ---------------- **/
  loadProducts() {
    this.isLoadingProducts = true;
    if (this.useBackend) {
      // Prefer admin endpoint when available for freshest data
      const list$ = (this.productService as any).getAllAdmin ? (this.productService as any).getAllAdmin() : this.productService.getAll();
      list$.subscribe({
        next: (res: any) => {
          const arr = Array.isArray(res) ? res : (res.products || res.items || []);
          this.products = Array.isArray(arr) ? arr.slice().reverse() : [];
          this.filteredProducts = this.products;
          this.isLoadingProducts = false;
        },
        error: (err: any) => {
          console.error('Failed to load products', err);
          this.errorMessage = 'Failed to load products';
          this.clearMessages();
          this.isLoadingProducts = false;
        }
      });
    } else {
      const saved = localStorage.getItem('admin-products');
      try {
        this.products = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.products = [];
      }
      this.products = this.products.slice().reverse();
      this.filteredProducts = this.products;
      this.isLoadingProducts = false;
    }
  }

  /** ---- Load Users from MongoDB ---- **/
  loadUsers() {
    const token = localStorage.getItem('admin-token');
    
    if (!token) {
      console.error('No admin token found');
      this.errorMessage = 'Not authenticated';
      this.clearMessages();
      return;
    }

    fetch('http://localhost:3000/api/admin/all-users', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        this.users = data;
      } else if (data.users && Array.isArray(data.users)) {
        this.users = data.users;
      } else {
        this.users = [];
      }
      this.totalUsers = this.users.length;
      this.currentUserPage = 1;
      this.updatePaginatedUsers();
      this.successMessage = 'Users loaded';
      this.clearMessages();
    })
    .catch(err => {
      console.error('Failed to load users:', err);
      this.errorMessage = 'Failed to load users';
      this.users = [];
      this.totalUsers = 0;
      this.clearMessages();
    });
  }

  // ✅ SEARCH FUNCTIONALITY
  onSearchKeyDown(event: any) {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (query === '') {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(product => {
        const name = (product.title || product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const price = String(product.price || '');
        const description = (product.description || '').toLowerCase();
        
        return name.includes(query) || 
               category.includes(query) || 
               price.includes(query) ||
               description.includes(query);
      });
    }
  }

  // ✅ OPEN EDIT PRODUCT
  openEditProduct(product: any) {
    this.isEditing = true;
    this.editingProductId = product._id || product.id;
    
    // Load product data into form
    this.productForm = {
      name: product.title || product.name || '',
      price: String(product.price || ''),
      category: product.category || '',
      stock: String(product.stock || product.quantity || 0),
      description: product.description || '',
      image: null,
      variants: product.variants ? [...product.variants] : []
    };

    // Set image preview if available
    if (product.image) {
      this.productImagePreview = product.image;
    }

    // Clear any old messages immediately
    this.successMessage = '';
    this.errorMessage = '';
    this.showAddProductModal = true;
  }

  // ✅ DELETE PRODUCT
  deleteProduct(product: any) {
    const productId = product._id || product.id;
    const productName = product.title || product.name || 'Product';

    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    if (this.useBackend) {
      // WAIT for backend confirmation before removing from UI
      this.productService.delete(productId).subscribe({
        next: (res) => {
          console.log('Product deleted successfully:', res);
          // Only remove from UI after backend confirms
          this.products = this.products.filter(p => (p._id || p.id) !== productId);
          this.filteredProducts = this.filteredProducts.filter(p => (p._id || p.id) !== productId);
          this.successMessage = `${productName} deleted successfully!`;
        },
        error: (err) => {
          console.error('Failed to delete product:', err);
          this.errorMessage = 'Failed to delete product. Please try again.';
        }
      });
    } else {
      // For localStorage: delete from UI
      this.products = this.products.filter(p => (p._id || p.id) !== productId);
      this.filteredProducts = this.filteredProducts.filter(p => (p._id || p.id) !== productId);
      localStorage.setItem('admin-products', JSON.stringify(this.products));
      this.successMessage = `${productName} deleted successfully!`;
    }
  }

  // ✅ PRODUCT IMAGE SELECTION
  onProductImageSelected(event: any) {
    const file = event.target.files[0];
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
        this.clearMessages();
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size must be less than 5MB';
        this.clearMessages();
        return;
      }

      this.productForm.image = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeProductImage() {
    this.productImagePreview = null;
    this.productForm.image = null;
  }

  // ✅ SUBMIT PRODUCT (ADD OR EDIT)
  submitAddProduct() {
    // Clear any previous messages
    this.successMessage = '';
    this.errorMessage = '';

    // Validation with better error handling
    if (!this.productForm || !this.productForm.name) {
      this.errorMessage = 'Product name is required';
      return;
    }

    const trimmedName = this.productForm.name.trim();
    if (!trimmedName) {
      this.errorMessage = 'Product name cannot be empty or contain only spaces';
      return;
    }

    if (!this.productForm.price || parseFloat(this.productForm.price) <= 0) {
      this.errorMessage = 'Valid product price is required (must be greater than 0)';
      return;
    }

    if (!this.productForm.category || !this.productForm.category.trim()) {
      this.errorMessage = 'Product category is required';
      return;
    }

    if (!this.productForm.stock || parseInt(this.productForm.stock) < 0) {
      this.errorMessage = 'Valid stock quantity is required (cannot be negative)';
      return;
    }

    if (this.useBackend) {
      const formData = new FormData();
      formData.append('title', trimmedName);
      formData.append('name', trimmedName);
      formData.append('price', this.productForm.price);
      formData.append('category', this.productForm.category.trim());
      formData.append('stock', this.productForm.stock);
      formData.append('quantity', this.productForm.stock);
      formData.append('description', this.productForm.description || '');

      if (this.productForm.variants.length > 0) {
        formData.append('variants', JSON.stringify(this.productForm.variants));
      }

      if (this.productForm.image) {
        formData.append('image', this.productForm.image);
      }

      if (this.isEditing && this.editingProductId) {
        // Update product - WAIT for backend before closing modal
        this.productService.update(this.editingProductId, formData).subscribe({
          next: (res) => {
            console.log('Product updated successfully:', res);
            this.successMessage = 'Product updated successfully!';
            this.closeAddProductModal();
            this.loadProducts(); // Reload to ensure fresh data from backend
          },
          error: (err) => {
            console.error('Failed to update product:', err);
            this.errorMessage = 'Failed to update product. Please try again.';
          }
        });
      } else {
        // Add new product - WAIT for backend to get real ID
        this.productService.create(formData).subscribe({
          next: (res: any) => {
            console.log('Product added successfully:', res);
            this.successMessage = 'Product added successfully!';
            this.closeAddProductModal();
            this.loadProducts(); // Reload to show real data from backend
            this.isEditing = false;
            this.editingProductId = null;
          },
          error: (err) => {
            console.error('Failed to add product:', err);
            this.errorMessage = 'Failed to add product. Please try again.';
          }
        });
      }
    } else {
      // Save to localStorage if not using backend
      const newProduct = {
        _id: this.isEditing ? this.editingProductId : Date.now().toString(),
        title: trimmedName,
        name: trimmedName,
        price: parseFloat(this.productForm.price),
        category: this.productForm.category.trim(),
        stock: parseInt(this.productForm.stock),
        quantity: parseInt(this.productForm.stock),
        description: this.productForm.description || '',
        image: this.productImagePreview,
        variants: this.productForm.variants
      };

      if (this.isEditing) {
        const index = this.products.findIndex(p => (p._id || p.id) === this.editingProductId);
        if (index !== -1) {
          this.products[index] = newProduct;
          this.successMessage = 'Product updated successfully!';
        }
      } else {
        this.products.unshift(newProduct);
        this.successMessage = 'Product added successfully!';
      }

      localStorage.setItem('admin-products', JSON.stringify(this.products));
      this.loadProducts();
      this.closeAddProductModal();
      this.clearMessages();
    }
  }

  openAddProductModal() {
    this.isEditing = false;
    this.editingProductId = null;
    this.resetProductForm();
    this.productImagePreview = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.showAddProductModal = true;
  }

  closeAddProductModal() {
    this.showAddProductModal = false;
    this.isEditing = false;
    this.editingProductId = null;
    this.resetProductForm();
    this.productImagePreview = null;
    this.successMessage = '';
    this.errorMessage = '';
  }

  resetProductForm() {
    this.productForm = {
      name: '',
      price: '',
      category: '',
      stock: '',
      description: '',
      image: null,
      variants: []
    };
  }

  clearMessages() {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  clearMessagesAfter(milliseconds: number) {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, milliseconds);
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  checkAdminToken() {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.router.navigate(['/admin/login']);
      return;
    }
    // also refresh admin name if token still present
    const name = localStorage.getItem('admin-name');
    if (name) {
      this.adminName = name;
    }
  }

  // ✅ AUTH
  logout() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('admin-token');
      localStorage.removeItem('admin-user');
      localStorage.removeItem('admin-name');
      this.router.navigate(['/admin/login']);
    }
  }

  // ✅ QUICK ACTIONS
  quickAction(action: string) {
    switch (action) {
      case 'add-product':
        this.openAddProductModal();
        break;
      case 'generate-report':
        this.openReportModal();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  // ✅ USER MANAGEMENT
  openAddUserModal() {
    this.showAddUserModal = true;
    this.editingUserId = null;
    this.resetUserForm();
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeAddUserModal() {
    this.showAddUserModal = false;
    this.resetUserForm();
    this.editingUserId = null;
    this.isSubmittingUser = false;
    this.successMessage = '';
    this.errorMessage = '';
  }

  resetUserForm() {
    this.userForm = {
      name: '',
      email: '',
      role: 'user',
      status: 'active'
    };
  }

  submitAddUser() {
    // prevent double submission
    if (this.isSubmittingUser) return;

    // basic validation
    if (!this.userForm.name || !this.userForm.name.trim()) {
      this.errorMessage = '❌ User name is required';
      this.clearMessagesAfter(4000);
      return;
    }

    if (!this.userForm.email || !this.userForm.email.trim() || !this.validateEmail(this.userForm.email)) {
      this.errorMessage = '❌ Please enter a valid email address';
      this.clearMessagesAfter(4000);
      return;
    }

    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = '❌ Admin authentication required';
      this.clearMessagesAfter(4000);
      return;
    }

    const isEditing = !!this.editingUserId;
    
    // For edit operations, skip loading state for instant updates
    if (!isEditing) {
      this.isSubmittingUser = true;
    }
    
    this.successMessage = `⏳ ${isEditing ? 'Updating user...' : 'Creating user...'}`;
    this.errorMessage = ''; // clear previous errors

    const method = this.editingUserId ? 'PUT' : 'POST';
    const endpoint = this.editingUserId
      ? `http://localhost:3000/api/admin/all-users/${this.editingUserId}`
      : `http://localhost:3000/api/admin/all-users`;

    fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.userForm)
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const userName = this.userForm.name;
      const isEditing = !!this.editingUserId;
      
      if (isEditing) {
        // EDIT MODE: Update user in local array immediately for instant UI update
        const userIndex = this.users.findIndex(u => u._id === this.editingUserId);
        if (userIndex !== -1) {
          this.users[userIndex] = { ...this.users[userIndex], ...this.userForm };
          // Update paginated users if needed
          this.updatePaginatedUsers();
        }
        
        // Show success message clearly in modal - NO LOADING
        this.successMessage = `✅ User "${userName}" updated successfully!`;
        this.errorMessage = '';
        
        // Close modal after 2 seconds so user sees the message
        setTimeout(() => {
          this.closeAddUserModal();
          // Keep message visible in global toast for 3 more seconds
          this.clearMessagesAfter(3000);
        }, 2000);
      } else {
        // CREATE MODE: Close modal immediately and reload
        this.isSubmittingUser = false;
        this.closeAddUserModal();
        this.successMessage = `✅ User "${userName}" created successfully!`;
        this.errorMessage = '';
        this.loadUsers(); // Reload list only for new users
        this.clearMessagesAfter(5000);
      }
    })
    .catch(err => {
      console.error('Failed to save user:', err);
      const isEditing = !!this.editingUserId;
      const action = isEditing ? 'update' : 'create';
      this.errorMessage = `❌ Failed to ${action} user. Please try again.`;
      this.successMessage = '';
      
      // Only reset loading state for create operations
      if (!isEditing) {
        this.isSubmittingUser = false;
      }
      
      // Show error message for 4 seconds
      this.clearMessagesAfter(4000);
    })
    .finally(() => {
      // Only reset loading state for create operations
      if (!this.editingUserId) {
        this.isSubmittingUser = false;
      }
    });
  }

  // ✅ REPORTS
  openReportModal() {
    this.showReportModal = true;
    this.clearMessages();
  }

  closeReportModal() {
    this.showReportModal = false;
    this.reportForm = {
      type: 'sales',
      startDate: '',
      endDate: '',
      format: 'pdf'
    };
  }

  submitGenerateReport() {
    // Validation
    if (!this.reportForm.startDate) {
      this.errorMessage = 'Start date is required';
      this.clearMessages();
      return;
    }

    if (!this.reportForm.endDate) {
      this.errorMessage = 'End date is required';
      this.clearMessages();
      return;
    }

    if (new Date(this.reportForm.startDate) > new Date(this.reportForm.endDate)) {
      this.errorMessage = 'Start date must be before end date';
      this.clearMessages();
      return;
    }

    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'No admin token found';
      this.clearMessages();
      return;
    }

    // Call backend to generate report
    const reportUrl = `http://localhost:3000/api/admin/report?type=${this.reportForm.type}&startDate=${this.reportForm.startDate}&endDate=${this.reportForm.endDate}&format=${this.reportForm.format}`;
    
    fetch(reportUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to generate report');
      return res.blob();
    })
    .then(blob => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = this.reportForm.format === 'csv' ? 'csv' : (this.reportForm.format === 'excel' ? 'xlsx' : 'txt');
      link.href = url;
      link.download = `${this.reportForm.type}_report_${new Date().getTime()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.successMessage = `${this.reportForm.type} report generated and downloaded successfully!`;
      this.closeReportModal();
      this.clearMessages();
    })
    .catch(err => {
      console.error('Report generation error:', err);
      this.errorMessage = 'Failed to generate report';
      this.clearMessages();
    });
  }

  private get reportFormat(): string {
    const formatMap: { [key: string]: string } = {
      'pdf': 'pdf',
      'excel': 'xlsx',
      'csv': 'csv',
      'txt': 'txt'
    };
    return formatMap[this.reportForm.format] || 'pdf';
  }

  // ✅ USER MANAGEMENT
  editUser(user: any) {
    // Open modal instantly - no delays
    this.editingUserId = user._id;
    this.userForm = {
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      status: user.status || 'active'
    };
    this.showAddUserModal = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  deleteUser(user: any) {
    // Open professional delete confirmation modal
    this.userToDelete = user;
    this.showDeleteConfirmModal = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  performDeleteUser(userId: string) {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = '❌ No admin token found';
      this.clearMessagesAfter(4000);
      this.showDeleteConfirmModal = false;
      return;
    }

    // Close modal immediately and show processing message
    this.showDeleteConfirmModal = false;
    this.successMessage = '⏳ Deleting user...';
    this.errorMessage = '';

    // Optimistically remove user from UI immediately
    const userIndex = this.users.findIndex(u => u._id === userId);
    let removedUser = null;
    if (userIndex !== -1) {
      removedUser = this.users.splice(userIndex, 1)[0];
      this.updatePaginatedUsers();
    }

    fetch(`http://localhost:3000/api/admin/all-users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete user');
      return res.json();
    })
    .then(data => {
      this.successMessage = '✅ User deleted successfully!';
      this.errorMessage = '';
      // Clear message after 5 seconds
      this.clearMessagesAfter(5000);
    })
    .catch(err => {
      console.error('Failed to delete user:', err);
      // Restore user to list if deletion failed
      if (removedUser) {
        this.users.splice(userIndex, 0, removedUser);
        this.updatePaginatedUsers();
      }
      this.errorMessage = '❌ Failed to delete user';
      this.successMessage = '';
      // Clear error after 5 seconds
      this.clearMessagesAfter(5000);
    });
  }

  confirmDeleteUser() {
    if (!this.userToDelete) return;
    this.performDeleteUser(this.userToDelete._id);
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.userToDelete = null;
  }

  // ✅ HELPER METHODS
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ✅ PAGINATION HELPERS
  updatePaginatedUsers() {
    const startIdx = (this.currentUserPage - 1) * this.usersPerPage;
    const endIdx = startIdx + this.usersPerPage;
    this.paginatedUsers = this.users.slice(startIdx, endIdx);
  }

  getTotalUserPages(): number {
    return Math.ceil(this.totalUsers / this.usersPerPage);
  }

  goToUserPage(page: number) {
    const totalPages = this.getTotalUserPages();
    if (page < 1 || page > totalPages) return;
    this.currentUserPage = page;
    this.updatePaginatedUsers();
  }

  nextUserPage() {
    if (this.currentUserPage < this.getTotalUserPages()) {
      this.currentUserPage++;
      this.updatePaginatedUsers();
    }
  }

  prevUserPage() {
    if (this.currentUserPage > 1) {
      this.currentUserPage--;
      this.updatePaginatedUsers();
    }
  }

  getVisiblePageNumbers(): number[] {
    const total = this.getTotalUserPages();
    const current = this.currentUserPage;
    const pages = [];

    // Show up to 5 page buttons
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(total, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Change a user's status (active / inactive / blocked) with optimistic UI update.
   */
  changeUserStatus(userId: string, newStatus: string) {
    // confirm when blocking or making inactive
    if ((newStatus === 'blocked' || newStatus === 'inactive') && !confirm(`Are you sure you want to set user status to "${newStatus}"?`)) {
      return;
    }

    const idx = this.users.findIndex(u => u._id === userId);
    if (idx !== -1) {
      this.users[idx].status = newStatus;
      this.users = [...this.users]; // trigger change detection
    }

    let msg = '';
    if (newStatus === 'inactive') msg = 'User set to inactive';
    else if (newStatus === 'blocked') msg = 'User blocked';
    else if (newStatus === 'active') msg = 'User activated';
    this.successMessage = msg;
    this.clearMessages();

    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'Not authenticated';
      this.clearMessages();
      return;
    }

    fetch(`http://localhost:3000/api/admin/all-users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    })
    .catch(err => {
      console.error('Failed to change user status:', err);
      this.errorMessage = 'Failed to change user status';
      this.clearMessages();
      // reload users to sync
      this.loadUsers();
    });
  }
}
