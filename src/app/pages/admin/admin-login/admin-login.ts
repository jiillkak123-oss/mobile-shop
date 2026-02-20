import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLoginComponent {

  email: string = '';
  password: string = '';
  loading = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.loading = true;

    this.authService.adminLogin(this.email, this.password).subscribe({
      next: (response: any) => {
        this.loading = false;

        if (response && response.token) {

          // ✅ Save real backend token
          localStorage.setItem('admin-token', response.token);

          // ✅ Navigate to dashboard
          this.router.navigate(['/admin/dashboard']);

        } else {
          this.errorMessage = 'Invalid admin credentials';
        }
      },

      error: (error: any) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ||
          'Admin login failed. Please try again.';
        this.password = '';
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !this.loading) {
      this.login();
    }
  }
}