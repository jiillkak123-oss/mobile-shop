import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private base = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Public reviews
  getAll(): Observable<any> {
    return this.http.get(`${this.base}/reviews`);
  }

  // Create review (requires user token)
  create(productId: string | null, rating: number, text: string, token?: string): Observable<any> {
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }) : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/reviews`, { productId, rating, text }, { headers });
  }
}
