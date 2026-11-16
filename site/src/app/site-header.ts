import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { JobsData } from './jobs-data';
import { Logo } from './logo';

/** Dark header with navigation; each page projects its own hero content below the nav. */
@Component({
  selector: 'app-site-header',
  imports: [Logo, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <div class="wrap">
        <nav class="nav" aria-label="Main">
          <a class="brand" routerLink="/">
            <app-logo [size]="40" />
            <span class="brand-name">Remote Software Jobs</span>
          </a>
          <div class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Jobs</a>
            <a routerLink="/about" routerLinkActive="active">About</a>
            <a class="nav-cta" routerLink="/about" fragment="subscribe">🔔 Get job alerts</a>
          </div>
        </nav>
        @if (data.lastUpdated()) {
          <span class="live"><span class="dot"></span>Updated {{ data.lastUpdated() }}</span>
        }
        <ng-content />
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly data = inject(JobsData);
}
