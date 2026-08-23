// An Angular component written correctly. The template interpolates rather than
// binding innerHTML, and the one sanitizer bypass is a reviewed constant.

import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const LOGO_URL = 'https://cdn.example.com/logo.svg';

@Component({
  selector: 'app-profile',
  template: `
    <section class="profile">
      <h2>{{ user.displayName }}</h2>
      <p>{{ user.bio }}</p>
      <a [href]="safeHomepage" target="_blank" rel="noopener noreferrer">homepage</a>
      <img [src]="logo" alt="logo" />
    </section>
  `,
})
export class ProfileComponent {
  @Input() user!: { displayName: string; bio: string; homepage: string };

  readonly logo: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.logo = this.sanitizer.bypassSecurityTrustResourceUrl(LOGO_URL);
  }

  get safeHomepage(): string {
    return /^https?:\/\//.test(this.user.homepage) ? this.user.homepage : '#';
  }
}
