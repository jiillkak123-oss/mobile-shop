import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';
import { AdminLoginComponent } from './pages/admin/admin-login/admin-login';
import { AdminRegisterComponent } from './pages/admin/admin-register/admin-register';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'home', component: Home },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin/register', component: AdminRegisterComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent },
  { path: '**', redirectTo: 'home' }
];