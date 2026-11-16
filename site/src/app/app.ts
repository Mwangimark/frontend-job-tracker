import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Logo } from './logo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Logo],
  template: `
    <router-outlet />

    <footer class="foot">
      <div class="wrap foot-inner">
        <div class="foot-brand">
          <app-logo [size]="32" />
          <div>
            <strong>Remote Software Jobs</strong>
            <span>Updated daily by a GitHub Actions workflow.</span>
          </div>
        </div>
        <div class="foot-links">
          <div class="foot-nav">
            <a routerLink="/">Jobs</a>
            <a routerLink="/about">About</a>
            <a routerLink="/about" fragment="subscribe">Job alerts</a>
          </div>
          <a class="gh" href="https://github.com/Mwangimark/frontend-job-tracker" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>
            View source on GitHub
          </a>
        </div>
      </div>
      <div class="wrap foot-bottom">
        <span>Built with Angular by Mark Mwangi · © {{ year }}</span>
        <span>Listings from <a href="https://remotive.com" target="_blank" rel="noopener">Remotive</a> and
          <a href="https://jobicy.com" target="_blank" rel="noopener">Jobicy</a></span>
      </div>
    </footer>
  `,
})
export class App {
  readonly year = new Date().getFullYear();
}
