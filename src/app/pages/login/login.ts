import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'] 
})
export class Login {

  email = '';
  password = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.password) {
      alert('Please provide email and password');
      return;
    }
    this.loading = true;
    this.authService.login(this.email, this.password).subscribe(
      (response: any) => {
        this.loading = false;
        const user = response.user || response.user || response;
        const token = response.token || null;
        if (user) {
          this.authService.saveUser(user, token || ('token-' + user._id));
          alert('Login Successful');
          if (user.role === 'admin') this.router.navigate(['/admin/dashboard']); else this.router.navigate(['/dashboard']);
        }
      },
      (error: any) => {
        this.loading = false;
        alert(error.error?.error || 'Login failed');
      }
    );
  }
}
