import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api/products';

  constructor(private http: HttpClient) {}

  // Auth headers without forcing Content-Type (useful for FormData)
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin-token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // JSON headers (for application/json requests)
  private jsonHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin-token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Admin product list (requires auth)
  getAllAdmin(): Observable<any> {
    const headers = this.authHeaders();
    return this.http.get('http://localhost:3000/api/admin/all-products', { headers });
  }

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getByCategory(category: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/category/${category}`);
  }

  create(product: any): Observable<any> {
    // If sending FormData (file upload), don't set Content-Type header; browser will set boundary
    if (product instanceof FormData) {
      return this.http.post(this.apiUrl, product, { headers: this.authHeaders() });
    }
    return this.http.post(this.apiUrl, product, { headers: this.jsonHeaders() });
  }

  update(id: string, product: any): Observable<any> {
    if (product instanceof FormData) {
      return this.http.put(`${this.apiUrl}/${id}`, product, { headers: this.authHeaders() });
    }
    return this.http.put(`${this.apiUrl}/${id}`, product, { headers: this.jsonHeaders() });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.authHeaders() });
  }
}
