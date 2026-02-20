import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-register.html',
  styleUrls: ['./admin-register.css']
})
export class AdminRegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  masterAdminCode: string = '';
  loading = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    // Clear previous error message
    this.errorMessage = '';

    // Form validation
    if (!this.name || !this.email || !this.password || !this.confirmPassword || !this.masterAdminCode) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    // Name validation
    if (this.name.trim().length < 3) {
      this.errorMessage = 'Name must be at least 3 characters';
      return;
    }

    // Email validation
    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Password validation
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    // Password match validation
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Master admin code validation
    if (this.masterAdminCode.trim().length < 4) {
      this.errorMessage = 'Master admin code must be at least 4 characters';
      return;
    }

    this.loading = true;
    this.authService.adminRegister(
      this.name,
      this.email,
      this.password,
      this.masterAdminCode
    ).subscribe(
      (response: any) => {
        this.loading = false;
        this.router.navigate(['/admin/login']);
      },
      (error: any) => {
        this.loading = false;
        this.errorMessage = error.error?.error || 'Admin registration failed. Please try again.';
        this.password = '';
        this.confirmPassword = '';
        this.masterAdminCode = '';
      }
    );
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if passwords match in real-time
   */
  getPasswordMatchError(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  /**
   * Handle Enter key press for registration
   */
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !this.loading) {
      this.register();
    }
  }
}
