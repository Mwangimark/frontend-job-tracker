import { Component, computed, linkedSignal, OnInit, signal } from '@angular/core';
import { DailyChart } from './daily-chart';
import { Logo } from './logo';
import { DayStat, Job, jobTypeLabel, parseCsv, toDayStat, toJob } from './jobs';

type SortKey = 'newest' | 'company';

@Component({
  selector: 'app-root',
  imports: [DailyChart, Logo],
  template: `
    <header class="top">
      <div class="wrap">
        <div class="brand">
          <app-logo [size]="44" />
          <span class="brand-name">Remote Software Jobs</span>
          @if (lastUpdated() !== '—') {
            <span class="live"><span class="dot"></span>Updated {{ lastUpdated() }}</span>
          }
        </div>
        <h1>Find remote developer roles you can actually apply for.</h1>
        <p class="sub">Frontend, backend, full-stack, mobile and more, collected every day from public job boards.
          Roles open to candidates in Kenya are marked.</p>
      </div>
    </header>

    <main class="wrap">
      @if (error()) {
        <div class="notice">Couldn't load the job data. {{ error() }}</div>
      } @else if (loading()) {
        <div class="notice">Loading jobs…</div>
      } @else {
        <section class="tiles" aria-label="Summary">
          <div class="tile"><span class="label">Jobs tracked</span><span class="value">{{ jobs().length }}</span></div>
          <div class="tile"><span class="label">Open to Kenya</span><span class="value">{{ kenyaCount() }}</span></div>
          <div class="tile"><span class="label">New today</span><span class="value">{{ today()?.newJobs ?? 0 }}</span></div>
          <div class="tile"><span class="label">Last updated</span><span class="value small">{{ lastUpdated() }}</span></div>
        </section>

        <app-daily-chart [stats]="stats()" />

        <section class="filters" aria-label="Filters">
          <input type="search" placeholder="Search role, company or location" [value]="query()"
                 (input)="query.set($any($event.target).value)" aria-label="Search jobs" />
          <select [value]="role()" (change)="role.set($any($event.target).value)" aria-label="Role">
            <option value="">All roles</option>
            @for (r of roles(); track r.name) { <option [value]="r.name">{{ r.name }} ({{ r.count }})</option> }
          </select>
          <select [value]="jobType()" (change)="jobType.set($any($event.target).value)" aria-label="Job type">
            <option value="">All job types</option>
            @for (t of jobTypes(); track t) { <option [value]="t">{{ typeLabel(t) }}</option> }
          </select>
          <select [value]="sort()" (change)="sort.set($any($event.target).value)" aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="company">Company A–Z</option>
          </select>
          <label class="toggle">
            <input type="checkbox" [checked]="kenyaOnly()" (change)="kenyaOnly.set($any($event.target).checked)" />
            Open to Kenya only
          </label>
        </section>

        <p class="count" id="jobs">
          @if (filtered().length) {
            Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ filtered().length }}
            @if (filtered().length !== jobs().length) { matching } jobs
          } @else { 0 of {{ jobs().length }} jobs }
        </p>

        @if (filtered().length) {
          <section class="grid">
            @for (j of paged(); track j.id) {
              <article class="card">
                <div class="card-head">
                  <span class="who">
                    <span class="avatar" [style.background]="avatarColor(j.company)" aria-hidden="true">{{ initials(j.company) }}</span>
                    <span class="company">{{ j.company }}</span>
                  </span>
                  @if (isNew(j)) { <span class="badge new">New</span> }
                </div>
                <div class="title-block">
                  <span class="eyebrow">{{ j.role }}</span>
                  <h3>{{ j.title }}</h3>
                </div>
                <div class="meta">
                  <span>📍 {{ j.location || 'Location not stated' }}</span>
                  <span>💼 {{ typeLabel(j.jobType) }}</span>
                  @if (j.salary) { <span>💰 {{ salary(j.salary) }}</span> }
                </div>
                <div class="card-foot">
                  @if (j.openToKenya) {
                    <span class="badge kenya">✓ Open to Kenya</span>
                  } @else {
                    <span class="badge restricted">Region restricted</span>
                  }
                  <span class="date">{{ relative(j.published) }} · via {{ j.source }}</span>
                </div>
                <a class="apply" [href]="j.url" target="_blank" rel="noopener">View & apply →</a>
              </article>
            }
          </section>

          @if (totalPages() > 1) {
            <nav class="pager" aria-label="Job pages">
              <button type="button" (click)="goTo(page() - 1)" [disabled]="page() === 1" aria-label="Previous page">← Prev</button>
              @for (p of pageNumbers(); track $index) {
                @if (p === 0) {
                  <span class="ellipsis">…</span>
                } @else {
                  <button type="button" class="num" [class.current]="p === page()" (click)="goTo(p)"
                          [attr.aria-current]="p === page() ? 'page' : null">{{ p }}</button>
                }
              }
              <button type="button" (click)="goTo(page() + 1)" [disabled]="page() === totalPages()" aria-label="Next page">Next →</button>
            </nav>
          }
        } @else {
          <div class="notice">No jobs match these filters.</div>
        }
      }
    </main>

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
          <a class="gh" href="https://github.com/Mwangimark/frontend-job-tracker" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>
            View source on GitHub
          </a>
          <span class="muted">Listings from
            <a href="https://remotive.com" target="_blank" rel="noopener">Remotive</a> and
            <a href="https://jobicy.com" target="_blank" rel="noopener">Jobicy</a></span>
        </div>
      </div>
      <div class="wrap foot-bottom">Built with Angular by Mark Mwangi · © {{ year }}</div>
    </footer>
  `,
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly jobs = signal<Job[]>([]);
  readonly stats = signal<DayStat[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly query = signal('');
  readonly jobType = signal('');
  readonly role = signal('');
  readonly kenyaOnly = signal(false);
  readonly sort = signal<SortKey>('newest');

  readonly kenyaCount = computed(() => this.jobs().filter(j => j.openToKenya).length);
  readonly today = computed(() => this.stats().at(-1));
  readonly latestDay = computed(() => this.today()?.date ?? '');
  readonly lastUpdated = computed(() => {
    const d = this.latestDay();
    return d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00')) : '—';
  });
  readonly roles = computed(() => {
    const counts = new Map<string, number>();
    for (const j of this.jobs()) counts.set(j.role, (counts.get(j.role) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  });
  readonly jobTypes = computed(() => [...new Set(this.jobs().map(j => j.jobType).filter(Boolean))].sort());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.jobType();
    const list = this.jobs().filter(j =>
      (!this.kenyaOnly() || j.openToKenya) &&
      (!type || j.jobType === type) &&
      (!this.role() || j.role === this.role()) &&
      (!q || `${j.title} ${j.company} ${j.location} ${j.role}`.toLowerCase().includes(q)));
    return this.sort() === 'company'
      ? list.sort((a, b) => a.company.localeCompare(b.company))
      : list.sort((a, b) => b.published.localeCompare(a.published));
  });

  readonly typeLabel = jobTypeLabel;
  readonly year = new Date().getFullYear();

  /** "USD 130000–145000 / yearly" -> "$130k–$145k / year". Other formats are shown as written. */
  salary(raw: string): string {
    const m = raw.match(/^([A-Z]{3}) (\d+)(?:–(\d+))?(?: \/ (\w+))?$/);
    if (!m) return raw;
    const [, cur, lo, hi, per] = m;
    const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
    const fmt = (n: string) => {
      const v = Number(n);
      return (sym[cur] ?? cur + ' ') + (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);
    };
    const period: Record<string, string> = { yearly: 'year', monthly: 'month', hourly: 'hour', weekly: 'week', daily: 'day' };
    return `${fmt(lo)}${hi ? '–' + fmt(hi) : ''}${per ? ' / ' + (period[per] ?? per) : ''}`;
  }

  initials(company: string): string {
    const words = company.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
  }

  /** Stable colour per company, so the same company always gets the same avatar. */
  avatarColor(company: string): string {
    let h = 0;
    for (const c of company) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 45% 40%)`;
  }

  // Pagination: page resets to 1 whenever the filtered list changes (search, filters, sort).
  readonly pageSize = 12;
  readonly page = linkedSignal({ source: this.filtered, computation: () => 1 });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  readonly rangeStart = computed(() => (this.page() - 1) * this.pageSize + 1);
  readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));

  /** Page numbers to show, with 0 marking a gap: 1 … 4 5 6 … 10 */
  readonly pageNumbers = computed(() => {
    const total = this.totalPages(), cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, cur - 1, cur, cur + 1].filter(p => p >= 1 && p <= total));
    const sorted = [...pages].sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((p, i) => {
      if (i && p - sorted[i - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });

  goTo(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async ngOnInit() {
    try {
      const [jobsCsv, statsCsv] = await Promise.all(
        ['data/jobs.csv', 'data/daily_stats.csv'].map(async u => {
          const r = await fetch(u, { cache: 'no-cache' });
          if (!r.ok) throw new Error(`${u} returned ${r.status}`);
          return r.text();
        }));
      this.jobs.set(parseCsv(jobsCsv).map(toJob));
      this.stats.set(parseCsv(statsCsv).map(toDayStat).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }

  isNew(j: Job): boolean {
    return !!this.latestDay() && j.firstSeen === this.latestDay();
  }

  relative(iso: string): string {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'Posted today';
    if (days === 1) return 'Posted yesterday';
    if (days < 30) return `Posted ${days} days ago`;
    return `Posted ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))}`;
  }
}
