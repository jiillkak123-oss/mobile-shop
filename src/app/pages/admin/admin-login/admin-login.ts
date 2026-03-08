import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLoginComponent implements OnInit {

  loginForm!: FormGroup;
  loading = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  login(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    this.loading = true;
    // Disable form controls when loading
    this.loginForm.disable();
    
    const { email, password } = this.loginForm.getRawValue();

    this.authService.adminLogin(email, password).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.loginForm.enable();

        if (response && response.token) {

          // ✅ Save real backend token
          localStorage.setItem('admin-token', response.token);
          // store admin info if available (backend may return name or user object)
          if (response.name) {
            localStorage.setItem('admin-name', response.name);
            localStorage.setItem('admin-user', JSON.stringify({ name: response.name }));
          } else if (response.user && response.user.name) {
            localStorage.setItem('admin-name', response.user.name);
            localStorage.setItem('admin-user', JSON.stringify(response.user));
          }

          // ✅ Navigate to dashboard
          this.router.navigate(['/admin/dashboard']);

        } else {
          this.errorMessage = 'Invalid admin credentials';
        }
      },

      error: (error: any) => {
        this.loading = false;
        this.loginForm.enable();
        this.errorMessage =
          error?.error?.message ||
          'Admin login failed. Please try again.';
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading && this.loginForm.valid) {
      this.login();
    }
  }

  get emailErrors(): any {
    return this.loginForm.get('email')?.errors;
  }

  get passwordErrors(): any {
    return this.loginForm.get('password')?.errors;
  }
}