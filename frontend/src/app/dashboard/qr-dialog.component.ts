import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Link } from '../core/models';
import { downloadBlob } from '../shared/format';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'k-qr-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="qr-title">
        <div class="modal-head">
          <h2 id="qr-title">QR code</h2>
          <button class="btn icon" (click)="close.emit()" aria-label="Close"><k-icon name="close" /></button>
        </div>
        <div class="modal-body">
          <p class="mono muted">{{ link().shortUrl }}</p>
          <div class="preview" [style.background]="bg">
            @if (src()) { <img [src]="src()" [alt]="'QR code for ' + link().shortUrl" /> }
          </div>
          <div class="row">
            <label class="field"><span>Code colour</span><input type="color" name="fg" [(ngModel)]="fg" (change)="render()" /></label>
            <label class="field"><span>Background</span><input type="color" name="bg" [(ngModel)]="bg" (change)="render()" /></label>
            <label class="field"><span>Size</span>
              <select class="input" name="size" [(ngModel)]="size">
                <option [ngValue]="512">512 px</option><option [ngValue]="1024">1024 px</option><option [ngValue]="2048">2048 px (print)</option>
              </select>
            </label>
          </div>
          <p class="muted small">Keep strong contrast between the two colours, or phones may not scan it.</p>
        </div>
        <div class="modal-foot">
          <button class="btn primary" (click)="download()"><k-icon name="download" [size]="16" />Download PNG</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .preview { display: grid; place-items: center; border: 1px solid var(--line); border-radius: var(--r-md); padding: 1rem; }
    img { width: 240px; height: 240px; image-rendering: pixelated; }
    .row { display: grid; grid-template-columns: auto auto 1fr; gap: 1rem; align-items: end; }
    input[type=color] { width: 56px; height: 38px; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); padding: 2px; }
  `,
})
export class QrDialogComponent implements OnInit, OnDestroy {
  link = input.required<Link>();
  close = output<void>();
  private api = inject(ApiService);
  fg = '#1e1a33';
  bg = '#ffffff';
  size = 1024;
  src = signal<string | null>(null);

  ngOnInit() { this.render(); }
  ngOnDestroy() { if (this.src()) URL.revokeObjectURL(this.src()!); }

  render() {
    this.api.qr(this.link().id, 512, this.fg, this.bg).subscribe(blob => {
      if (this.src()) URL.revokeObjectURL(this.src()!);
      this.src.set(URL.createObjectURL(blob));
    });
  }

  download() {
    this.api.qr(this.link().id, this.size, this.fg, this.bg)
      .subscribe(blob => downloadBlob(blob, `${this.link().slug}-qr.png`));
  }
}
