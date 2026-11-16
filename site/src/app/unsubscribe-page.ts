import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { alertsEnabled, callRpc } from './config';
import { SiteHeader } from './site-header';

type State = 'working' | 'done' | 'already' | 'invalid' | 'error';

/** Target of the "Unsubscribe" link in every alert email: /unsubscribe?token=<uuid> */
@Component({
  selector: 'app-unsubscribe-page',
  imports: [SiteHeader, RouterLink],
  template: `
    <app-site-header>
      <span class="hero-kicker">Job alerts</span>
      <h1>Unsubscribe</h1>
    </app-site-header>
    <main class="wrap">
      <div class="about-block unsub">
        @switch (state()) {
          @case ('working') { <p>Unsubscribing…</p> }
          @case ('done') {
            <h2>You've been unsubscribed</h2>
            <p>You won't get any more job alert emails. Changed your mind? You can
              <a routerLink="/about" fragment="subscribe">subscribe again</a> any time.</p>
          }
          @case ('already') {
            <h2>You're already unsubscribed</h2>
            <p>This link has already been used, so there's nothing more to do.</p>
          }
          @case ('invalid') {
            <h2>This link doesn't look right</h2>
            <p>Use the unsubscribe link from the bottom of one of your alert emails.</p>
          }
          @default {
            <h2>Something went wrong</h2>
            <p>We couldn't unsubscribe you just now. Please try the link again in a few minutes.</p>
          }
        }
        <a class="primary as-link" routerLink="/">Browse jobs</a>
      </div>
    </main>
  `,
})
export class UnsubscribePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly state = signal<State>('working');

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(token) || !alertsEnabled()) return this.state.set('invalid');
    try {
      const ok = await callRpc<boolean>('unsubscribe', { p_token: token });
      this.state.set(ok ? 'done' : 'already');
    } catch {
      this.state.set('error');
    }
  }
}
