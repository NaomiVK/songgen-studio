import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { ApiService } from './services/api.service';
import { SetupStatus } from './models/song.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    AudioPlayerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private api = inject(ApiService);

  setupStatus: SetupStatus | null = null;
  showSetupWarning = false;

  ngOnInit(): void {
    this.checkSetup();
  }

  checkSetup(): void {
    this.api.getSetupStatus().subscribe({
      next: (status) => {
        this.setupStatus = status;
        this.showSetupWarning = !status.installed;
      },
      error: () => {
        this.showSetupWarning = true;
      },
    });
  }
}
