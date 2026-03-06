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

  // User form
  userForm = {
    name: '',
    email: '',
    role: 'user',
    status: 'active'
  };

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
      return this.orders ? this.orders.slice(0, 5) : [];
    }
    return this.orders;
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

  viewOrder(order: Order) {
    this.selectedOrder = order;
    alert(`Order ID: ${order._id}`);
  }

// AdminDashboardComponent
markAsCompleted(orderId: string) {
  this.orderService.updateStatus(orderId, 'Completed').subscribe({
    next: (res) => {
      console.log('Order marked Completed:', res);
      const idx = this.orders.findIndex(o => o._id === orderId);
      if (idx !== -1) this.orders[idx].status = 'Completed';
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
changeOrderStatus(orderId: string, newStatus: string) {
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
      console.log('Users loaded:', this.users);
    })
    .catch(err => {
      console.error('Failed to load users:', err);
      this.users = [];
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

  clearErrorMessage() {
    this.errorMessage = '';
  }

  checkAdminToken() {
    const token = localStorage.getItem('admin-token');
    if (!token) this.router.navigate(['/admin/login']);
  }

  // ✅ AUTH
  logout() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('admin-token');
      localStorage.removeItem('admin-user');
      this.router.navigate(['/admin/login']);
    }
  }

  // ✅ QUICK ACTIONS
  quickAction(action: string) {
    switch (action) {
      case 'add-product':
        this.openAddProductModal();
        break;
      case 'add-user':
        this.openAddUserModal();
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
    // Validation
    if (!this.userForm.name || !this.userForm.name.trim()) {
      this.errorMessage = 'User name is required';
      return;
    }

    if (!this.userForm.email || !this.userForm.email.trim() || !this.validateEmail(this.userForm.email)) {
      this.errorMessage = 'Valid email is required';
      return;
    }

    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'No admin token found';
      return;
    }

    // Check if editing or creating
    const method = this.editingUserId ? 'PUT' : 'POST';
    const endpoint = this.editingUserId 
      ? `http://localhost:3000/api/admin/all-users/${this.editingUserId}`
      : 'http://localhost:3000/api/admin/all-users';

    fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.userForm)
    })
    .then(res => res.json())
    .then(data => {
      this.successMessage = this.editingUserId ? 'User updated successfully!' : 'User added successfully!';
      this.closeAddUserModal();
      this.loadUsers();
    })
    .catch(err => {
      console.error('Failed to save user:', err);
      this.errorMessage = this.editingUserId ? 'Failed to update user' : 'Failed to add user';
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
    // prepare modal for editing an existing user
    this.editingUserId = user._id;
    this.userForm = {
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      status: user.status || 'active'
    };
    // clear any previous messages immediately (avoid 3s timeout delay)
    this.successMessage = '';
    this.errorMessage = '';

    this.showAddUserModal = true;
  }

  deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    const token = localStorage.getItem('admin-token');
    if (!token) {
      this.errorMessage = 'No admin token found';
      this.clearMessages();
      return;
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
      this.successMessage = 'User deleted successfully!';
      this.loadUsers();
      this.clearMessages();
    })
    .catch(err => {
      console.error('Failed to delete user:', err);
      this.errorMessage = 'Failed to delete user';
      this.clearMessages();
    });
  }

  // ✅ HELPER METHODS
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
