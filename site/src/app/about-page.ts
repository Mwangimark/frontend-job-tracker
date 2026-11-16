import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobsData } from './jobs-data';
import { SiteHeader } from './site-header';
import { Subscribe } from './subscribe';

@Component({
  selector: 'app-about-page',
  imports: [SiteHeader, Subscribe, RouterLink],
  template: `
    <app-site-header>
      <span class="hero-kicker">About</span>
      <h1>Remote developer jobs, sorted for people outside the US and Europe.</h1>
      <p class="sub">Most remote job boards fill up with roles that quietly require you to live in the US or Europe.
        This site collects new software jobs every day and tells you, at a glance, which ones you can apply for from Kenya.</p>
    </app-site-header>

    <main class="wrap about">
      <section class="tiles" aria-label="At a glance">
        <div class="tile"><span class="label">Jobs tracked</span><span class="value">{{ data.jobs().length || '—' }}</span></div>
        <div class="tile"><span class="label">Open to Kenya</span><span class="value">{{ data.kenyaCount() || '—' }}</span></div>
        <div class="tile"><span class="label">Role categories</span><span class="value">{{ data.roles().length || '—' }}</span></div>
        <div class="tile"><span class="label">Job boards</span><span class="value">2</span></div>
      </section>

      <section class="about-block">
        <h2>How it works</h2>
        <ol class="steps">
          <li>
            <span class="step-icon" aria-hidden="true">⏰</span>
            <h3>Collect</h3>
            <p>Every day a scheduled GitHub Actions job pulls the latest software jobs from the Remotive and Jobicy public APIs.</p>
          </li>
          <li>
            <span class="step-icon" aria-hidden="true">🏷️</span>
            <h3>Sort</h3>
            <p>Each job gets a role (Frontend, Backend, Full-stack and more) from its title, and is checked for whether
              candidates in Kenya can apply.</p>
          </li>
          <li>
            <span class="step-icon" aria-hidden="true">🚀</span>
            <h3>Publish</h3>
            <p>New jobs are saved to the repository and this site is rebuilt and redeployed automatically.</p>
          </li>
          <li>
            <span class="step-icon" aria-hidden="true">✉️</span>
            <h3>Apply</h3>
            <p>Every card links straight to the original listing, so you always apply directly with the employer.</p>
          </li>
        </ol>
      </section>

      <section class="about-grid">
        <div class="about-block note">
          <h2>What "Open to Kenya" means</h2>
          <p>A job is marked open to Kenya when its listed location is worldwide, anywhere, Africa, EMEA or Kenya.
            Jobs limited to specific countries, like "USA only", are marked region restricted.</p>
          <p class="muted">Locations come from the employers, so always double-check the listing before you apply.</p>
        </div>
        <div class="about-block maker">
          <h2>Who built this</h2>
          <div class="maker-row">
            <span class="avatar big" aria-hidden="true">MM</span>
            <div>
              <strong>Mark Mwangi</strong>
              <p>Front-end engineer in Nairobi, working with Angular and TypeScript. I built this to make my own job
                search easier, and to share it.</p>
              <div class="maker-links">
                <a href="https://github.com/Mwangimark" target="_blank" rel="noopener">GitHub</a>
                <a href="https://github.com/Mwangimark/frontend-job-tracker" target="_blank" rel="noopener">Source code</a>
                <a routerLink="/">Browse jobs →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <app-subscribe />
    </main>
  `,
})
export class AboutPage implements OnInit {
  protected readonly data = inject(JobsData);
  ngOnInit() { this.data.load(); }
}
