import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'] 
})
export class Login implements OnInit {

  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  serverError = '';

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
    this.serverError = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    this.loading = true;
    // Disable form controls when loading to avoid 'changed after checked' errors
    this.loginForm.disable();
    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email, password).subscribe(
      (response: any) => {
        this.loading = false;
        this.loginForm.enable();
        const user = response?.user || response;
        const token = response?.token || (response?.user && response.user.token) || null;
        if (user) {
          this.authService.saveUser(user, token || (`token-${(user && user._id) || 'unknown'}`));
          // navigate after successful login
          if (user.role === 'admin') this.router.navigate(['/admin/dashboard']); else this.router.navigate(['/dashboard']);
        } else {
          // unexpected response
          this.serverError = 'Login failed: unexpected server response';
        }
      },
      (error: any) => {
        this.loading = false;
        this.loginForm.enable();
        this.serverError = error.error?.error || error.error?.message || 'Login failed';
      }
    );
  }

  get emailErrors(): any {
    return this.loginForm.get('email')?.errors;
  }

  get passwordErrors(): any {
    return this.loginForm.get('password')?.errors;
  }
}
