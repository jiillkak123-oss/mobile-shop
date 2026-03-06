import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ReviewService } from '../../services/review';
import { BRANDS } from '../../shared/brand-constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  isLoggedIn: boolean = false;
  products: any[] = [];
  loading = false;
  brands: string[] = BRANDS.slice(1); // exclude 'All'

  // Review modal state
  showReviewModal = false;
  reviewForm = { productId: null as string | null, rating: 5, text: '' };
  reviewStatusMessage = '';


  constructor(private authService: AuthService, private router: Router, private reviewService: ReviewService) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadFeaturedProducts();
  }

  openReviewModal(product: any) {
    if (!this.authService.isLoggedIn()) {
      this.reviewStatusMessage = 'Please login to add a review.';
      return;
    }
    this.reviewForm = { productId: product._id || null, rating: 5, text: '' };
    this.showReviewModal = true;
    this.reviewStatusMessage = '';
  }

  closeReviewModal() {
    this.showReviewModal = false;
  }

  async submitReview() {
    this.reviewStatusMessage = '';
    const token = this.authService.getToken();
    if (!token) {
      this.reviewStatusMessage = 'You must be logged in to submit a review.';
      return;
    }

    try {
      await this.reviewService.create(this.reviewForm.productId, this.reviewForm.rating, this.reviewForm.text, token).toPromise();
      this.reviewStatusMessage = 'Review submitted. Thank you!';
      this.showReviewModal = false;
    } catch (e) {
      console.error('Failed to submit review', e);
      this.reviewStatusMessage = 'Failed to submit review. Try again later.';
    }
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

  navigateToBrand(brand: string) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard'], { queryParams: { cat: brand } });
    } else {
      // send to login and preserve intended dashboard url
      const returnUrl = `/dashboard?cat=${encodeURIComponent(brand)}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/home']);
  }

  navigateToAdminLogin() {
    this.router.navigate(['/admin/login']);
  }
}
