import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, { name, email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }

  adminRegister(name: string, email: string, password: string, masterAdminCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/admin-register`, { name, email, password, masterAdminCode });
  }

  adminLogin(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/admin-login`, { email, password });
  }

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user');
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  saveUser(user: any, token: string) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  // Admin endpoints
  adminGetAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/all-users`, this.getAuthHeaders());
  }

  adminGetAllAdmins(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/all-admins`, this.getAuthHeaders());
  }

  adminGetAllProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/all-products`, this.getAuthHeaders());
  }

  adminGetAllOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/all-orders`, this.getAuthHeaders());
  }
}
