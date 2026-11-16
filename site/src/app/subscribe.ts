import { Component, computed, inject, signal } from '@angular/core';
import { alertsEnabled, callRpc } from './config';
import { JobsData } from './jobs-data';

type Frequency = 'daily' | 'weekly';

/**
 * Job-alert signup. Saves preferences through the Supabase subscribe() function;
 * the daily GitHub Actions run emails matching jobs. Signing up again with the
 * same email updates the preferences.
 */
@Component({
  selector: 'app-subscribe',
  template: `
    <section class="sub-card" id="subscribe" aria-labelledby="sub-title">
      <div class="sub-intro">
        <span class="kicker">🔔 Job alerts</span>
        <h2 id="sub-title">Get new jobs in your inbox</h2>
        <p>Pick the roles you care about and we'll email you when new ones are posted. Free, and you can
          unsubscribe any time.</p>
        <ul class="perks">
          <li>Only the roles you choose</li>
          <li>Optionally only roles open to Kenya</li>
          <li>A daily or weekly digest, never spam</li>
        </ul>
      </div>

      <div class="sub-form">
        @if (done()) {
          <div class="sub-success" role="status">
            <div class="check" aria-hidden="true">✓</div>
            <h3>{{ updated() ? 'Preferences updated' : "You're on the list" }}</h3>
            <p>We'll send {{ frequency() === 'daily' ? 'a daily' : 'a weekly' }} email to <strong>{{ email() }}</strong> with new
              {{ summary() }} jobs{{ kenyaOnly() ? ' open to Kenya' : '' }}.</p>
            <button type="button" class="link-btn" (click)="reset()">Change preferences</button>
          </div>
        } @else {
          <form (submit)="submit($event)" novalidate>
            <fieldset>
              <legend>Roles</legend>
              <div class="chips">
                <button type="button" class="chip" [class.on]="allSelected()" (click)="toggleAll()"
                        [attr.aria-pressed]="allSelected()">All roles</button>
                @for (r of roleNames(); track r) {
                  <button type="button" class="chip" [class.on]="selected().has(r)" (click)="toggle(r)"
                          [attr.aria-pressed]="selected().has(r)">{{ r }}</button>
                }
              </div>
            </fieldset>

            <div class="row">
              <fieldset>
                <legend>How often</legend>
                <div class="segmented" role="radiogroup" aria-label="How often">
                  @for (f of frequencies; track f.value) {
                    <button type="button" role="radio" [class.on]="frequency() === f.value"
                            [attr.aria-checked]="frequency() === f.value" (click)="frequency.set(f.value)">{{ f.label }}</button>
                  }
                </div>
              </fieldset>
              <label class="toggle switch">
                <input type="checkbox" [checked]="kenyaOnly()" (change)="kenyaOnly.set($any($event.target).checked)" />
                <span class="track" aria-hidden="true"><span class="thumb"></span></span>
                Only roles open to Kenya
              </label>
            </div>

            <label class="field">
              <span>Email address</span>
              <div class="email-row">
                <input type="email" placeholder="you@example.com" autocomplete="email" [value]="email()"
                       (input)="email.set($any($event.target).value); error.set('')" [attr.aria-invalid]="!!error()" />
                <button type="submit" class="primary" [disabled]="!enabled || busy()">
                  {{ !enabled ? 'Coming soon' : busy() ? 'Subscribing…' : 'Subscribe' }}
                </button>
              </div>
            </label>
            @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
            @if (enabled) {
              <p class="fine">We only use your email for job alerts. Every email has a one-click unsubscribe link.</p>
            } @else {
              <p class="fine soon">🚧 Email alerts are launching soon. Check back in a few days.</p>
            }
          </form>
        }
      </div>
    </section>
  `,
})
export class Subscribe {
  private readonly data = inject(JobsData);

  readonly frequencies: { value: Frequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ];

  /** Common developer roles first, then the rest by job count. */
  private readonly preferred = ['Frontend', 'Backend', 'Full-stack', 'Mobile', 'DevOps & Cloud', 'Data & AI', 'QA & Testing'];
  readonly roleNames = computed(() => {
    const names = this.data.roles().map(r => r.name);
    const rank = (n: string) => { const i = this.preferred.indexOf(n); return i === -1 ? 99 : i; };
    return [...names].sort((x, y) => rank(x) - rank(y));
  });
  readonly selected = signal<Set<string>>(new Set(['Frontend']));
  readonly frequency = signal<Frequency>('daily');
  readonly kenyaOnly = signal(true);
  readonly email = signal('');
  readonly error = signal('');
  readonly done = signal(false);
  readonly updated = signal(false);
  readonly busy = signal(false);
  readonly enabled = alertsEnabled();

  readonly allSelected = computed(() => this.roleNames().length > 0 && this.roleNames().every(r => this.selected().has(r)));
  readonly summary = computed(() => {
    if (this.allSelected()) return 'software';
    const list = [...this.selected()];
    return list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
  });

  toggle(role: string) {
    const next = new Set(this.selected());
    next.has(role) ? next.delete(role) : next.add(role);
    this.selected.set(next);
    this.error.set('');
  }

  toggleAll() {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.roleNames()));
    this.error.set('');
  }

  async submit(e: Event) {
    e.preventDefault();
    if (!this.enabled || this.busy()) return;
    if (!this.selected().size) return this.error.set('Pick at least one role.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim())) return this.error.set('Enter a valid email address.');
    this.busy.set(true);
    try {
      const status = await callRpc<string>('subscribe', {
        p_email: this.email().trim(),
        p_roles: [...this.selected()],
        p_kenya_only: this.kenyaOnly(),
        p_frequency: this.frequency(),
      });
      this.updated.set(status === 'updated');
      this.done.set(true);
    } catch {
      this.error.set("Couldn't subscribe right now. Please try again in a moment.");
    } finally {
      this.busy.set(false);
    }
  }

  reset() {
    this.done.set(false);
  }
}
