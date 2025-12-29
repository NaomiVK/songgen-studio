import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { ApiService } from '../../services/api.service';
import { AudioService } from '../../services/audio.service';
import { Song } from '../../models/song.models';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
  ],
  template: `
    <div class="library-container">
      <div class="header">
        <h1>Library</h1>
        <span class="count">{{ total }} songs</span>
      </div>

      @if (songs.length === 0 && !loading) {
        <mat-card class="empty-state">
          <mat-icon>library_music</mat-icon>
          <h2>No songs yet</h2>
          <p>Generate your first song to see it here</p>
        </mat-card>
      } @else {
        <div class="songs-grid">
          @for (song of songs; track song.id) {
            <mat-card class="song-card" [class.playing]="audio.currentSong()?.id === song.id">
              <mat-card-header>
                <mat-card-title>
                  @if (editingId === song.id) {
                    <input
                      #titleInput
                      [value]="song.title || 'Untitled'"
                      (keyup.enter)="saveTitle(song, titleInput.value)"
                      (keyup.escape)="editingId = null"
                      (blur)="saveTitle(song, titleInput.value)"
                      class="title-input"
                    />
                  } @else {
                    <span (dblclick)="editingId = song.id">
                      {{ song.title || 'Untitled' }}
                    </span>
                  }
                </mat-card-title>
                <mat-card-subtitle>
                  {{ formatDate(song.created_at) }}
                  @if (song.duration_seconds) {
                    <span class="duration">{{ formatDuration(song.duration_seconds) }}</span>
                  }
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="song-meta">
                  <mat-chip-set>
                    <mat-chip>{{ song.stem_type }}</mat-chip>
                    @if (song.model_version) {
                      <mat-chip>{{ song.model_version }}</mat-chip>
                    }
                  </mat-chip-set>
                </div>

                <div class="description">
                  {{ song.description }}
                </div>
              </mat-card-content>

              <mat-card-actions>
                <div class="play-controls">
                  @if (song.output_path) {
                    <button
                      mat-icon-button
                      color="primary"
                      (click)="playSong(song, 'full')"
                      [class.active]="audio.currentSong()?.id === song.id && audio.audioType() === 'full'"
                    >
                      <mat-icon>
                        {{ audio.currentSong()?.id === song.id && audio.audioType() === 'full' && audio.isPlaying() ? 'pause' : 'play_arrow' }}
                      </mat-icon>
                    </button>
                  }
                  @if (song.output_vocal_path) {
                    <button
                      mat-icon-button
                      (click)="playSong(song, 'vocal')"
                      matTooltip="Vocals"
                      [class.active]="audio.currentSong()?.id === song.id && audio.audioType() === 'vocal'"
                    >
                      <mat-icon>mic</mat-icon>
                    </button>
                  }
                  @if (song.output_bgm_path) {
                    <button
                      mat-icon-button
                      (click)="playSong(song, 'bgm')"
                      matTooltip="Instrumental"
                      [class.active]="audio.currentSong()?.id === song.id && audio.audioType() === 'bgm'"
                    >
                      <mat-icon>piano</mat-icon>
                    </button>
                  }
                </div>

                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editingId = song.id">
                    <mat-icon>edit</mat-icon>
                    <span>Rename</span>
                  </button>
                  @if (song.output_path) {
                    <a mat-menu-item [href]="api.getDownloadUrl(song.id, 'full')" target="_blank">
                      <mat-icon>download</mat-icon>
                      <span>Download Full</span>
                    </a>
                  }
                  @if (song.output_vocal_path) {
                    <a mat-menu-item [href]="api.getDownloadUrl(song.id, 'vocal')" target="_blank">
                      <mat-icon>download</mat-icon>
                      <span>Download Vocals</span>
                    </a>
                  }
                  @if (song.output_bgm_path) {
                    <a mat-menu-item [href]="api.getDownloadUrl(song.id, 'bgm')" target="_blank">
                      <mat-icon>download</mat-icon>
                      <span>Download Instrumental</span>
                    </a>
                  }
                  <mat-divider />
                  <button mat-menu-item (click)="deleteSong(song)" class="delete-btn">
                    <mat-icon color="warn">delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </mat-card-actions>
            </mat-card>
          }
        </div>

        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="page - 1"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPageChange($event)"
        />
      }
    </div>
  `,
  styles: [`
    .library-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 24px;

      h1 {
        margin: 0;
      }

      .count {
        color: #666;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
      }

      h2 {
        margin: 16px 0 8px;
        color: #666;
      }

      p {
        color: #999;
      }
    }

    .songs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .song-card {
      transition: all 0.2s;

      &.playing {
        border: 2px solid #3f51b5;
      }

      mat-card-header {
        .title-input {
          border: none;
          border-bottom: 2px solid #3f51b5;
          font-size: inherit;
          font-weight: inherit;
          background: transparent;
          outline: none;
          width: 100%;
        }

        mat-card-subtitle {
          display: flex;
          gap: 8px;

          .duration {
            &::before {
              content: '•';
              margin-right: 8px;
            }
          }
        }
      }

      mat-card-content {
        .song-meta {
          margin-bottom: 8px;
        }

        .description {
          font-size: 0.875rem;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }

      mat-card-actions {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;

        .play-controls {
          display: flex;
          gap: 4px;

          button.active {
            color: #3f51b5;
          }
        }
      }
    }

    mat-paginator {
      background: transparent;
    }

    .delete-btn {
      color: #f44336;
    }
  `],
})
export class LibraryComponent implements OnInit {
  api = inject(ApiService);
  audio = inject(AudioService);
  private snackBar = inject(MatSnackBar);

  songs: Song[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  loading = false;

  editingId: string | null = null;

  ngOnInit(): void {
    this.loadSongs();
  }

  loadSongs(): void {
    this.loading = true;
    this.api.getSongs(this.page, this.pageSize).subscribe({
      next: (result) => {
        this.songs = result.songs;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load songs', 'OK', { duration: 3000 });
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadSongs();
  }

  playSong(song: Song, type: 'full' | 'vocal' | 'bgm'): void {
    if (
      this.audio.currentSong()?.id === song.id &&
      this.audio.audioType() === type
    ) {
      this.audio.toggle();
    } else {
      this.audio.play(song, type);
    }
  }

  saveTitle(song: Song, newTitle: string): void {
    this.editingId = null;
    if (newTitle.trim() !== song.title) {
      this.api.updateSong(song.id, newTitle.trim()).subscribe({
        next: (updated) => {
          const index = this.songs.findIndex((s) => s.id === song.id);
          if (index >= 0) {
            this.songs[index] = updated;
          }
        },
        error: () => {
          this.snackBar.open('Failed to update title', 'OK', { duration: 3000 });
        },
      });
    }
  }

  deleteSong(song: Song): void {
    if (confirm(`Delete "${song.title || 'Untitled'}"?`)) {
      // Stop if currently playing
      if (this.audio.currentSong()?.id === song.id) {
        this.audio.stop();
      }

      this.api.deleteSong(song.id).subscribe({
        next: () => {
          this.songs = this.songs.filter((s) => s.id !== song.id);
          this.total--;
          this.snackBar.open('Song deleted', 'OK', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Failed to delete song', 'OK', { duration: 3000 });
        },
      });
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
