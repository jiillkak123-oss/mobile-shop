import { Component, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class OrderService {
  // Admin API base
  private apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) {}

  // ✅ Get all orders for admin
  getAll(): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.get(`${this.apiUrl}/all-orders`, { headers });
  }

  // ✅ Get order by ID
  getById(id: string): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.get(`${this.apiUrl}/orders/${id}`, { headers });
  }

  // ✅ Create a new order
  create(order: any): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.post(`${this.apiUrl}/create-order`, order, { headers });
  }

  // ✅ Update entire order
  update(id: string, order: any): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.put(`${this.apiUrl}/orders/${id}`, order, { headers });
  }

  // ✅ Delete order
  delete(id: string): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.delete(`${this.apiUrl}/orders/${id}`, { headers });
  }

  // ✅ Update only the status of an order
  updateStatus(id: string, status: string): Observable<any> {
    const token = localStorage.getItem('admin-token') || '';
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    return this.http.put(`${this.apiUrl}/update-order/${id}`, { status }, { headers });
  }
}