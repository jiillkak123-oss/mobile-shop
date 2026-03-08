import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements OnInit {

  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  serverError = '';
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
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordStrengthValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    // Check for at least one uppercase letter
    const hasUpperCase = /[A-Z]/.test(value);
    // Check for at least one lowercase letter
    const hasLowerCase = /[a-z]/.test(value);
    // Check for at least one digit
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
    this.serverError = '';
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
    const { name, email, password } = this.registerForm.getRawValue();

    this.authService.register(name, email, password).subscribe(
      (response: any) => {
        this.loading = false;
        this.registerForm.enable();
        this.successMessage = 'Registration Successful. Please login.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      (error: any) => {
        this.loading = false;
        this.registerForm.enable();
        this.serverError = error.error?.error || 'Registration failed';
      }
    );
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
}
