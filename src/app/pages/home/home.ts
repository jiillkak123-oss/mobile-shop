import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  isLoggedIn: boolean = false;
  products: any[] = [];
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadFeaturedProducts();
  }

  async loadFeaturedProducts() {
    this.loading = true;
    try {
      console.log('Loading featured products from home page...');
      const res = await fetch('http://localhost:3000/api/products');
      if (res.ok) {
        const allProducts = await res.json();
        // Show top 6 products
        this.products = allProducts.slice(0, 6);
        console.log('Loaded', this.products.length, 'featured products');
      }
    } catch (e) {
      console.error('Failed to load featured products', e);
    } finally {
      this.loading = false;
    }
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  browseDashboard() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToAdminLogin() {
    this.router.navigate(['/admin/login']);
  }
}
