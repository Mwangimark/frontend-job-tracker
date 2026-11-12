import { Component, computed, input, signal } from '@angular/core';
import { DayStat } from './jobs';

interface Bar { x: number; y: number; h: number; w: number; stat: DayStat; label: string; }

@Component({
  selector: 'app-daily-chart',
  template: `
    <figure class="chart">
      <figcaption>
        <h2>New jobs per day</h2>
        <span class="muted">Last {{ days().length }} {{ days().length === 1 ? 'day' : 'days' }}</span>
      </figcaption>

      @if (days().length) {
        <div class="plot" (mouseleave)="hover.set(null)">
          <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img"
               [attr.aria-label]="'Bar chart of new jobs per day, latest ' + days().length + ' days'">
            @for (t of ticks(); track t.v) {
              <line class="grid" [attr.x1]="PAD_L" [attr.x2]="W" [attr.y1]="t.y" [attr.y2]="t.y" />
            }
            @for (b of bars(); track b.stat.date) {
              <path class="bar" [class.active]="hover()?.stat?.date === b.stat.date" [attr.d]="barPath(b)" />
              <rect class="hit" [attr.x]="b.x - gap() / 2" [attr.y]="0" [attr.width]="b.w + gap()" [attr.height]="H - PAD_B"
                    (mouseenter)="hover.set(b)" (focus)="hover.set(b)" tabindex="0"
                    [attr.aria-label]="b.label + ': ' + b.stat.newJobs + ' new jobs'" />
            }
          </svg>
          <div class="y-labels">
            @for (t of ticks(); track t.v) {
              <span [style.top.%]="(t.y / H) * 100">{{ t.v }}</span>
            }
          </div>
          <div class="x-labels">
            <span>{{ bars()[0]?.label }}</span>
            @if (bars().length > 1) { <span>{{ bars()[bars().length - 1].label }}</span> }
          </div>
          @if (hover(); as h) {
            <div class="tooltip" [style.left.%]="((h.x + h.w / 2) / W) * 100">
              <strong>{{ h.label }}</strong>
              <div>{{ h.stat.newJobs }} new {{ h.stat.newJobs === 1 ? 'job' : 'jobs' }}</div>
              <div class="muted">{{ h.stat.newOpenToKenya }} open to Kenya</div>
            </div>
          }
        </div>
      } @else {
        <p class="muted">No data yet.</p>
      }
    </figure>
  `,
  styles: `
    .chart { margin: 0; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    figcaption { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
    h2 { font-size: 15px; font-weight: 600; margin: 0; }
    .muted { color: var(--text-muted); font-size: 13px; }
    .plot { position: relative; height: 180px; padding-left: 28px; padding-bottom: 22px; }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .grid { stroke: var(--grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .bar { fill: var(--accent); transition: opacity .15s; }
    .plot:hover .bar:not(.active) { opacity: .45; }
    .hit { fill: transparent; cursor: default; outline: none; }
    .y-labels { position: absolute; left: 0; top: 0; bottom: 22px; width: 24px; }
    .y-labels span { position: absolute; right: 0; transform: translateY(-50%); font-size: 11px; color: var(--text-muted); }
    .x-labels { position: absolute; left: 28px; right: 0; bottom: 0; display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
    .tooltip { position: absolute; top: -8px; transform: translate(-50%, -100%); background: var(--tooltip-bg); color: var(--tooltip-text);
      padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.4; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
    .tooltip .muted { color: inherit; opacity: .75; font-size: 12px; }
  `,
})
export class DailyChart {
  readonly stats = input.required<DayStat[]>();
  readonly hover = signal<Bar | null>(null);

  readonly W = 600;
  readonly H = 180;
  readonly PAD_L = 0;
  readonly PAD_B = 0;

  readonly days = computed(() => this.stats().slice(-30));
  readonly max = computed(() => {
    const m = Math.max(1, ...this.days().map(d => d.newJobs));
    return m <= 4 ? 4 : Math.ceil(m / 2) * 2;   // even max so the midpoint tick is a whole number
  });
  readonly gap = computed(() => (this.days().length > 15 ? 2 : 6));

  readonly ticks = computed(() => {
    const m = this.max();
    return [0, m / 2, m].map(v => ({ v: Math.round(v), y: this.H - (v / m) * this.H }));
  });

  readonly bars = computed<Bar[]>(() => {
    const d = this.days();
    const slots = Math.max(d.length, 7);              // keep bars from getting too wide early on
    const slot = this.W / slots;
    const w = Math.max(2, slot - this.gap());
    const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
    return d.map((stat, i) => {
      const h = (stat.newJobs / this.max()) * this.H;
      return { x: i * slot + this.gap() / 2, y: this.H - h, h, w, stat, label: fmt.format(new Date(stat.date + 'T00:00:00')) };
    });
  });

  /** Bar with 4px rounded top, square base on the baseline. */
  barPath(b: Bar): string {
    if (b.h <= 0) return '';
    const r = Math.min(4, b.w / 2, b.h);
    const { x, y, w, h } = b;
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }
}
