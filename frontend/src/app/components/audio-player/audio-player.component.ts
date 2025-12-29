import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';

import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
  ],
  template: `
    <div class="audio-player" [class.hidden]="!audio.currentSong()">
      <div class="song-info">
        @if (audio.currentSong(); as song) {
          <span class="title">{{ song.title || 'Untitled' }}</span>
          <span class="type">{{ audio.audioType() }}</span>
        }
      </div>

      <div class="controls">
        <button mat-icon-button (click)="audio.toggle()">
          <mat-icon>{{ audio.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>

        <span class="time">{{ audio.formatTime(audio.currentTime()) }}</span>

        <mat-slider
          class="seek-slider"
          [min]="0"
          [max]="audio.duration() || 100"
          [step]="1"
          discrete
        >
          <input
            matSliderThumb
            [value]="audio.currentTime()"
            (valueChange)="audio.seek($event)"
          />
        </mat-slider>

        <span class="time">{{ audio.formatTime(audio.duration()) }}</span>

        <button mat-icon-button (click)="audio.stop()">
          <mat-icon>stop</mat-icon>
        </button>
      </div>

      <div class="volume">
        <mat-icon>volume_up</mat-icon>
        <mat-slider [min]="0" [max]="1" [step]="0.1">
          <input
            matSliderThumb
            [value]="audio.volume()"
            (valueChange)="audio.setVolume($event)"
          />
        </mat-slider>
      </div>
    </div>
  `,
  styles: [`
    .audio-player {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #3f51b5;
      color: white;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 24px;
      z-index: 1000;

      &.hidden {
        display: none;
      }
    }

    .song-info {
      min-width: 200px;
      display: flex;
      flex-direction: column;

      .title {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .type {
        font-size: 0.75rem;
        opacity: 0.8;
        text-transform: uppercase;
      }
    }

    .controls {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;

      button {
        color: white;
      }

      .time {
        font-size: 0.875rem;
        min-width: 40px;
        text-align: center;
      }

      .seek-slider {
        flex: 1;
        max-width: 500px;
      }
    }

    .volume {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 150px;

      mat-slider {
        width: 100px;
      }
    }
  `],
})
export class AudioPlayerComponent {
  audio = inject(AudioService);
}
