import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-register.html',
  styleUrls: ['./admin-register.css']
})
export class AdminRegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage: string = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      masterAdminCode: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordStrengthValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumber;

    if (!passwordValid) {
      return { 'passwordStrength': true };
    }
    return null;
  }

  private passwordMatchValidator(formGroup: AbstractControl): { [key: string]: any } | null {
    if (formGroup instanceof FormGroup) {
      const password = formGroup.get('password')?.value;
      const confirmPassword = formGroup.get('confirmPassword')?.value;

      if (password && confirmPassword && password !== confirmPassword) {
        return { 'passwordMismatch': true };
      }
    }
    return null;
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      if (this.registerForm.errors?.['passwordMismatch']) {
        this.errorMessage = 'Passwords do not match';
      } else {
        this.errorMessage = 'Please fill in all fields correctly';
      }
      return;
    }

    this.loading = true;
    // Disable form controls when loading to avoid 'changed after checked' errors
    this.registerForm.disable();
    const { name, email, password, masterAdminCode } = this.registerForm.getRawValue();

    this.authService.adminRegister(name, email, password, masterAdminCode).subscribe(
      (response: any) => {
        this.loading = false;
        this.registerForm.enable();
        this.successMessage = 'Admin registration successful. Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/admin/login']);
        }, 1500);
      },
      (error: any) => {
        this.loading = false;
        this.registerForm.enable();
        this.errorMessage = error.error?.error || 'Admin registration failed. Please try again.';
        this.registerForm.patchValue({
          password: '',
          confirmPassword: '',
          masterAdminCode: ''
        });
      }
    );
  }

  /**
   * Handle Enter key press for registration
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading && this.registerForm.valid) {
      this.register();
    }
  }

  get nameErrors(): any {
    return this.registerForm.get('name')?.errors;
  }

  get emailErrors(): any {
    return this.registerForm.get('email')?.errors;
  }

  get passwordErrors(): any {
    return this.registerForm.get('password')?.errors;
  }

  get confirmPasswordErrors(): any {
    return this.registerForm.get('confirmPassword')?.errors;
  }

  get masterAdminCodeErrors(): any {
    return this.registerForm.get('masterAdminCode')?.errors;
  }
}
