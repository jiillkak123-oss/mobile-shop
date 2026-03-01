import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class App implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Ensure default landing page is /home (guards against clients opening root or cached /)
    try {
      const current = this.router.url || window.location.pathname || '/';
      if (!current || current === '/' || current === '') {
        // use a microtask so router has a chance to initialize
        setTimeout(() => this.router.navigate(['/home']), 0);
      }
    } catch (e) {
      // noop
    }
  }
}