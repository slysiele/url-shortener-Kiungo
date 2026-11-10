import { Injectable, signal } from '@angular/core';
import { Link } from './models';

/** Lets the top-bar quick shortener tell the links table that a new link exists. */
@Injectable({ providedIn: 'root' })
export class LinksBus {
  readonly created = signal<Link | null>(null);
}
