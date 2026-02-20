import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProductService } from '../../../services/product';
import { OrderService } from '../../../services/order';
import { HttpClientModule, HttpClient } from '@angular/common/http';
// Type for navigation sections
export type NavSection = 'dashboard' | 'products' | 'orders' | 'users' | 'revenue' | 'reviews' | 'settings';

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

  // Modal states
  showAddProductModal: boolean = false;
  showAddUserModal: boolean = false;
  showReportModal: boolean = false;
  showEmailModal: boolean = false;

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


  orders: any[] = [];
  selectedOrder: Order | null = null;

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

  // Email form
  emailForm = {
    recipient: '',
    subject: '',
    message: ''
  };

  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  // Products list
  products: any[] = [];
  useBackend: boolean = true;
  isEditing: boolean = false;
  editingProductId: string | null = null;

  // ✅ SINGLE constructor
  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.checkAdminToken();
  }

  /** ---------------- Orders ---------------- **/
loadOrders() {
  const token = localStorage.getItem('admin-token'); // token fetch karo

  if (!token) {
    console.error('No admin token found');
    return;
  }

  fetch('http://localhost:3000/api/admin/all-orders', {
    headers: {
      Authorization: 'Bearer ' + token  // <-- ye token bhej raha hai
    }
  })
  .then(res => res.json())
  .then(data => {
    if (Array.isArray(data)) {
      this.orders = data;
    } else if (data.orders) {
      this.orders = data.orders;
    } else {
      this.orders = [];
    }
  })
  .catch(err => console.error('Failed to load orders', err));
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
  this.orderService.updateStatus(orderId, newStatus).subscribe({
    next: () => {
      // Refresh the list to show updated status
      this.loadOrders();
    },
    error: (err) => {
      console.error('Error updating status:', err);
    }
  });

}

  /** ---------------- Products ---------------- **/
  loadProducts() {
    if (this.useBackend) {
      this.productService.getAll().subscribe({
        next: (res: any) => {
          this.products = Array.isArray(res) ? res.reverse() : [];
        },
        error: (err: any) => console.error('Failed to load products', err)
      });
    } else {
      const saved = localStorage.getItem('admin-products');
      try {
        this.products = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.products = [];
      }
      this.products = this.products.slice().reverse();
    }
  }

  openAddProductModal() {
    this.showAddProductModal = true;
    this.clearMessages();
  }

  closeAddProductModal() {
    this.showAddProductModal = false;
    this.resetProductForm();
    this.productImagePreview = '';
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

  checkAdminToken() {
    const token = localStorage.getItem('admin-token');
    if (!token) this.router.navigate(['/admin/login']);
  }
   isProductFormFilled: boolean = false;


  

  
  // Auth
  logout() {
    console.log('Logging out');
  }

  // Search
  onSearchKeyDown(event: any) {
    console.log('Search key pressed:', event);
  }
 
  // Product Actions
  openEditProduct(product: any) {
    console.log('Editing product:', product);
  }

  deleteProduct(productId: string) {
    console.log('Deleting product with ID:', productId);
  }

  quickAction(action: string) {
    console.log('Quick action:', action);
  }

  onProductImageSelected(event: any) {
    console.log('Image selected:', event);
  }


  removeProductImage() {
    console.log('Removing image preview');
    this.productImagePreview = null;
  }

  submitAddProduct() {
    console.log('Submitting new product');
  }

  // User Management
  closeAddUserModal() {
    console.log('Closing add user modal');
  }

  submitAddUser() {
    console.log('Adding user');
  }

  // Reports
  closeReportModal() {
    console.log('Closing report modal');
  }

  submitGenerateReport() {
    console.log('Generating report');
  }

  // Email
  closeEmailModal() {
    console.log('Closing email modal');
  }

  submitSendEmail() {
    console.log('Sending email');
  }
}
