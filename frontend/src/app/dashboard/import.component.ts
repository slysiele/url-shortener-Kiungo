import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { BulkResponse } from '../core/models';
import { ToastService } from '../core/toast.service';
import { downloadBlob } from '../shared/format';
import { IconComponent } from '../shared/icon.component';

const SAMPLE = 'url,slug,title,tags\nhttps://example.com/black-friday,bf26,Black Friday,sales;sms\nhttps://example.com/blog/launch,,Launch post,blog\n';

@Component({
  selector: 'k-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="page-head">
      <div><h2>Import &amp; export</h2><p>Bring links from a spreadsheet or another shortener, or take all of yours with you.</p></div>
    </div>

    <div class="cols">
      <section class="panel">
        <div class="panel-head"><h3>Import from CSV</h3>@if (!canImport()) { <span class="pill">Starter and up</span> }</div>
        <div class="panel-body body">
          <label class="drop" [class.over]="over()" (dragover)="$event.preventDefault(); over.set(true)" (dragleave)="over.set(false)" (drop)="drop($event)">
            <k-icon name="upload" [size]="22" />
            <span><strong>Choose a CSV file</strong> or drag it here</span>
            <small class="muted">Up to 500 rows per file</small>
            <input type="file" accept=".csv,text/csv" (change)="pick($event)" [disabled]="busy()" />
          </label>
          <div>
            <p class="small">Your file needs a header row. Only <span class="mono">url</span> is required:</p>
            <pre>{{ sample }}</pre>
            <button class="btn" (click)="downloadSample()"><k-icon name="download" [size]="16" />Download a template</button>
          </div>
          <p class="muted small">Moving from Bitly? Export your links there as CSV. We recognise its <span class="mono">long_url</span> column.</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Export</h3></div>
        <div class="panel-body body">
          <p>Download every link with its slug, destination, tags, click count and status as a CSV you can open in Excel or Google Sheets.</p>
          <button class="btn primary" (click)="export()"><k-icon name="download" [size]="16" />Export all links</button>
        </div>
      </section>
    </div>

    @if (result(); as r) {
      <section class="panel result">
        <div class="panel-head">
          <h3>Imported {{ r.created }} of {{ r.created + r.failed }} rows</h3>
          <button class="btn icon" (click)="result.set(null)" aria-label="Close"><k-icon name="close" /></button>
        </div>
        @if (r.failed) {
          <table class="data">
            <thead><tr><th>Row</th><th>Problem</th></tr></thead>
            <tbody>@for (x of failures(); track x.row) { <tr><td>{{ x.row + 1 }}</td><td>{{ x.error }}</td></tr> }</tbody>
          </table>
        }
      </section>
    }
  `,
  styles: `
    .cols { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1rem; align-items: start; }
    .cols > * { min-width: 0; }
    .body { display: grid; gap: 1.1rem; }
    .body > * { min-width: 0; }
    .drop { position: relative; display: grid; justify-items: center; gap: .35rem; padding: 2rem 1rem; border: 2px dashed var(--line);
      border-radius: var(--r-md); cursor: pointer; text-align: center; color: var(--muted); }
    .drop span { color: var(--ink); }
    .drop.over, .drop:hover { border-color: var(--accent); background: var(--accent-soft); }
    .drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    pre { background: var(--surface-2); border: 1px solid var(--line); padding: .8rem; border-radius: var(--r-sm); font: .8rem/1.6 var(--font-mono); overflow-x: auto; margin: .5rem 0 .75rem; }
    .result { margin-top: 1rem; }
    @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class ImportComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  sample = SAMPLE;
  over = signal(false);
  busy = signal(false);
  result = signal<BulkResponse | null>(null);

  canImport() { return this.auth.user()?.effectivePlan !== 'FREE'; }
  failures() { return this.result()?.results.filter(r => !r.ok) ?? []; }

  pick(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.upload(f);
    input.value = '';
  }

  drop(e: DragEvent) {
    e.preventDefault();
    this.over.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.upload(f);
  }

  upload(file: File) {
    this.busy.set(true);
    this.api.importCsv(file).subscribe({
      next: r => {
        this.busy.set(false);
        this.result.set(r);
        this.auth.refresh();
        this.toast.show(`Imported ${r.created} links`);
      },
      error: e => {
        this.busy.set(false);
        if (e.status !== 402) this.toast.error(errorMessage(e, 'Import failed'));
      },
    });
  }

  downloadSample() { downloadBlob(new Blob([SAMPLE], { type: 'text/csv' }), 'kiungo-import-template.csv'); }

  export() { this.api.exportCsv().subscribe(b => downloadBlob(b, 'kiungo-links.csv')); }
}
