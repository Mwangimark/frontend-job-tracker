import { Component, computed, OnInit, signal } from '@angular/core';
import { DailyChart } from './daily-chart';
import { DayStat, Job, jobTypeLabel, parseCsv, toDayStat, toJob } from './jobs';

type SortKey = 'newest' | 'company';

@Component({
  selector: 'app-root',
  imports: [DailyChart],
  template: `
    <header class="top">
      <div class="wrap top-inner">
        <div>
          <h1>Remote Frontend Jobs</h1>
          <p class="sub">Remote Angular, TypeScript and frontend roles, updated every morning.
            Roles open to candidates in Kenya are marked.</p>
        </div>
        <a class="gh" href="https://github.com/Mwangimark/frontend-job-tracker" target="_blank" rel="noopener">View on GitHub</a>
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

        <p class="count">{{ filtered().length }} of {{ jobs().length }} jobs</p>

        @if (filtered().length) {
          <section class="grid">
            @for (j of filtered(); track j.id) {
              <article class="card">
                <div class="card-head">
                  <span class="company">{{ j.company }}</span>
                  @if (isNew(j)) { <span class="badge new">New</span> }
                </div>
                <h3>{{ j.title }}</h3>
                <div class="meta">
                  <span>📍 {{ j.location || 'Location not stated' }}</span>
                  <span>💼 {{ typeLabel(j.jobType) }}</span>
                  @if (j.salary) { <span>💰 {{ j.salary }}</span> }
                </div>
                <div class="card-foot">
                  @if (j.openToKenya) {
                    <span class="badge kenya">✓ Open to Kenya</span>
                  } @else {
                    <span class="badge restricted">Region restricted</span>
                  }
                  <span class="date">{{ relative(j.published) }}</span>
                </div>
                <a class="apply" [href]="j.url" target="_blank" rel="noopener">View & apply →</a>
              </article>
            }
          </section>
        } @else {
          <div class="notice">No jobs match these filters.</div>
        }
      }
    </main>

    <footer class="wrap foot">
      Job listings from <a href="https://remotive.com" target="_blank" rel="noopener">Remotive</a>.
      Collected daily by a GitHub Actions workflow · Built with Angular by Mark Mwangi.
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
  readonly kenyaOnly = signal(false);
  readonly sort = signal<SortKey>('newest');

  readonly kenyaCount = computed(() => this.jobs().filter(j => j.openToKenya).length);
  readonly today = computed(() => this.stats().at(-1));
  readonly latestDay = computed(() => this.today()?.date ?? '');
  readonly lastUpdated = computed(() => {
    const d = this.latestDay();
    return d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00')) : '—';
  });
  readonly jobTypes = computed(() => [...new Set(this.jobs().map(j => j.jobType).filter(Boolean))].sort());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.jobType();
    const list = this.jobs().filter(j =>
      (!this.kenyaOnly() || j.openToKenya) &&
      (!type || j.jobType === type) &&
      (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)));
    return this.sort() === 'company'
      ? list.sort((a, b) => a.company.localeCompare(b.company))
      : list.sort((a, b) => b.published.localeCompare(a.published));
  });

  readonly typeLabel = jobTypeLabel;

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
