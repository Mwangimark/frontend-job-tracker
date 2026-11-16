import { computed, Injectable, signal } from '@angular/core';
import { DayStat, Job, parseCsv, toDayStat, toJob } from './jobs';

/** Loads the tracker's CSV data once and shares it between pages. */
@Injectable({ providedIn: 'root' })
export class JobsData {
  readonly jobs = signal<Job[]>([]);
  readonly stats = signal<DayStat[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly kenyaCount = computed(() => this.jobs().filter(j => j.openToKenya).length);
  readonly today = computed(() => this.stats().at(-1));
  readonly latestDay = computed(() => this.today()?.date ?? '');
  readonly lastUpdated = computed(() => {
    const d = this.latestDay();
    return d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00')) : '';
  });
  readonly roles = computed(() => {
    const counts = new Map<string, number>();
    for (const j of this.jobs()) counts.set(j.role, (counts.get(j.role) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  });

  private started = false;

  load() {
    if (this.started) return;
    this.started = true;
    Promise.all(['data/jobs.csv', 'data/daily_stats.csv'].map(async u => {
      const r = await fetch(u, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`${u} returned ${r.status}`);
      return r.text();
    })).then(([jobsCsv, statsCsv]) => {
      this.jobs.set(parseCsv(jobsCsv).map(toJob));
      this.stats.set(parseCsv(statsCsv).map(toDayStat).sort((a, b) => a.date.localeCompare(b.date)));
    }).catch(e => this.error.set(e instanceof Error ? e.message : String(e)))
      .finally(() => this.loading.set(false));
  }
}
