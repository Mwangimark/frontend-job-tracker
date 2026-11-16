import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Remote Software Jobs · Mark Mwangi', loadComponent: () => import('./jobs-page').then(m => m.JobsPage) },
  { path: 'about', title: 'About · Remote Software Jobs', loadComponent: () => import('./about-page').then(m => m.AboutPage) },
  { path: 'unsubscribe', title: 'Unsubscribe · Remote Software Jobs', loadComponent: () => import('./unsubscribe-page').then(m => m.UnsubscribePage) },
  { path: '**', redirectTo: '' },
];
