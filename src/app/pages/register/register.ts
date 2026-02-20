import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    if (!this.name || !this.email || !this.password) {
      alert('Please fill all fields');
      return;
    }
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    this.loading = true;
    this.authService.register(this.name, this.email, this.password).subscribe(
      (response: any) => {
        this.loading = false;
        alert('Registration Successful. Please login.');
        this.router.navigate(['/login']);
      },
      (error: any) => {
        this.loading = false;
        alert(error.error?.error || 'Registration failed');
      }
    );
  }
}
