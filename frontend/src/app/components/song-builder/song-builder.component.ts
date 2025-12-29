import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { SseService } from '../../services/sse.service';
import {
  SongSection,
  SectionType,
  SECTION_TYPES,
  GENRES,
  MOODS,
  TIMBRES,
  INSTRUMENTS,
  StemType,
} from '../../models/song.models';

@Component({
  selector: 'app-song-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSliderModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="builder-container">
      <div class="main-area">
        <!-- Song Structure -->
        <mat-card class="sections-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>queue_music</mat-icon>
            <mat-card-title>Song Structure</mat-card-title>
            <mat-card-subtitle>Drag to reorder sections</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div
              cdkDropList
              class="sections-list"
              (cdkDropListDropped)="dropSection($event)"
            >
              @for (section of sections; track section.id; let i = $index) {
                <div class="section-item" cdkDrag>
                  <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>

                  <mat-form-field appearance="outline" class="type-select">
                    <mat-select [(ngModel)]="section.type">
                      @for (type of sectionTypes; track type.type) {
                        <mat-option [value]="type.type">{{ type.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (hasLyrics(section.type)) {
                    <mat-form-field appearance="outline" class="lyrics-input">
                      <mat-label>Lyrics</mat-label>
                      <textarea
                        matInput
                        [(ngModel)]="section.lyrics"
                        rows="2"
                        placeholder="Enter lyrics (each line ends with a period)"
                      ></textarea>
                    </mat-form-field>
                  }

                  <button mat-icon-button color="warn" (click)="removeSection(i)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>

            <button mat-stroked-button (click)="addSection()" class="add-btn">
              <mat-icon>add</mat-icon>
              Add Section
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Lyrics Preview -->
        <mat-card class="preview-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>preview</mat-icon>
            <mat-card-title>Formatted Output</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <pre class="lyrics-preview">{{ formattedLyrics }}</pre>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="sidebar">
        <!-- Style Panel -->
        <mat-card class="style-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>palette</mat-icon>
            <mat-card-title>Style</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Voice Gender -->
            <div class="form-group">
              <label>Voice</label>
              <mat-button-toggle-group [(ngModel)]="style.gender">
                <mat-button-toggle value="female">Female</mat-button-toggle>
                <mat-button-toggle value="male">Male</mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            <!-- Timbre -->
            <div class="form-group">
              <label>Timbre</label>
              <mat-form-field appearance="outline">
                <mat-select [(ngModel)]="style.timbre">
                  @for (t of timbres; track t) {
                    <mat-option [value]="t.toLowerCase()">{{ t }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Genre -->
            <div class="form-group">
              <label>Genre</label>
              <mat-form-field appearance="outline">
                <mat-select [(ngModel)]="style.genres" multiple>
                  @for (g of genres; track g) {
                    <mat-option [value]="g.toLowerCase()">{{ g }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Mood -->
            <div class="form-group">
              <label>Mood</label>
              <mat-form-field appearance="outline">
                <mat-select [(ngModel)]="style.moods" multiple>
                  @for (m of moods; track m) {
                    <mat-option [value]="m.toLowerCase()">{{ m }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Instruments -->
            <div class="form-group">
              <label>Instruments</label>
              <mat-form-field appearance="outline">
                <mat-select [(ngModel)]="style.instruments" multiple>
                  @for (i of instruments; track i) {
                    <mat-option [value]="i.toLowerCase()">{{ i }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- BPM -->
            <div class="form-group">
              <label>BPM: {{ style.bpm }}</label>
              <mat-slider [min]="60" [max]="180" [step]="5" discrete>
                <input matSliderThumb [(ngModel)]="style.bpm" />
              </mat-slider>
            </div>

            <mat-divider />

            <div class="description-preview">
              <label>Style Description:</label>
              <code>{{ formattedDescription }}</code>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Reference Audio -->
        <mat-card class="reference-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>audio_file</mat-icon>
            <mat-card-title>Reference Audio</mat-card-title>
            <mat-card-subtitle>Optional - for style cloning</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div
              class="drop-zone"
              [class.has-file]="referenceFile"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              @if (referenceFile) {
                <mat-icon>audiotrack</mat-icon>
                <span>{{ referenceFile.name }}</span>
                <button mat-icon-button (click)="clearReference($event)">
                  <mat-icon>close</mat-icon>
                </button>
              } @else {
                <mat-icon>upload</mat-icon>
                <span>Drop audio or click to upload</span>
                <span class="hint">First 10 seconds will be used</span>
              }
            </div>
            <input
              #fileInput
              type="file"
              accept="audio/*"
              hidden
              (change)="onFileSelected($event)"
            />
          </mat-card-content>
        </mat-card>

        <!-- Stem Type -->
        <mat-card class="stem-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>tune</mat-icon>
            <mat-card-title>Output Type</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-button-toggle-group [(ngModel)]="stemType" class="stem-toggles">
              <mat-button-toggle value="full">Full Mix</mat-button-toggle>
              <mat-button-toggle value="vocal">Vocals</mat-button-toggle>
              <mat-button-toggle value="bgm">Instrumental</mat-button-toggle>
              <mat-button-toggle value="separate">Separate</mat-button-toggle>
            </mat-button-toggle-group>
          </mat-card-content>
        </mat-card>

        <!-- Title -->
        <mat-card class="title-card">
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Song Title</mat-label>
              <input matInput [(ngModel)]="songTitle" placeholder="Optional" />
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- Generate Button -->
        <button
          mat-raised-button
          color="primary"
          class="generate-btn"
          [disabled]="generating || sections.length === 0"
          (click)="generate()"
        >
          @if (generating) {
            <mat-icon>hourglass_empty</mat-icon>
            Generating...
          } @else {
            <mat-icon>auto_awesome</mat-icon>
            Generate Song
          }
        </button>

        @if (generating) {
          <mat-card class="progress-card">
            <mat-card-content>
              <mat-progress-bar mode="indeterminate" />
              <p class="status">{{ generationStatus }}</p>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .builder-container {
      display: flex;
      gap: 24px;
      min-height: calc(100vh - 180px);
    }

    .main-area {
      flex: 1;
      min-width: 0;
    }

    .sidebar {
      width: 350px;
      flex-shrink: 0;
    }

    mat-card {
      margin-bottom: 16px;

      mat-card-header {
        margin-bottom: 16px;

        mat-icon[mat-card-avatar] {
          background: #3f51b5;
          color: white;
          padding: 8px;
          border-radius: 50%;
        }
      }
    }

    .sections-list {
      min-height: 100px;
    }

    .section-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      margin-bottom: 8px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e0e0e0;

      .drag-handle {
        cursor: move;
        color: #999;
        margin-top: 16px;
      }

      .type-select {
        width: 180px;
      }

      .lyrics-input {
        flex: 1;
      }
    }

    .cdk-drag-preview {
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .add-btn {
      margin-top: 16px;
    }

    .preview-card {
      pre {
        background: #f5f5f5;
        padding: 16px;
        border-radius: 4px;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 0.875rem;
        max-height: 200px;
        overflow: auto;
      }
    }

    .form-group {
      margin-bottom: 16px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #666;
      }

      mat-form-field {
        width: 100%;
      }

      mat-slider {
        width: 100%;
      }
    }

    .description-preview {
      margin-top: 16px;
      padding-top: 16px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #666;
      }

      code {
        display: block;
        background: #f5f5f5;
        padding: 8px;
        border-radius: 4px;
        font-size: 0.875rem;
        word-break: break-word;
      }
    }

    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #3f51b5;
        background: #f5f5f5;
      }

      &.has-file {
        border-style: solid;
        border-color: #4caf50;
        background: #f1f8e9;
      }

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        margin-bottom: 8px;
      }

      span {
        display: block;
      }

      .hint {
        font-size: 0.75rem;
        color: #999;
        margin-top: 4px;
      }
    }

    .stem-toggles {
      width: 100%;

      mat-button-toggle {
        flex: 1;
      }
    }

    .full-width {
      width: 100%;
    }

    .generate-btn {
      width: 100%;
      padding: 16px;
      font-size: 1.1rem;

      mat-icon {
        margin-right: 8px;
      }
    }

    .progress-card {
      .status {
        margin-top: 8px;
        font-size: 0.875rem;
        color: #666;
        text-align: center;
      }
    }

    .title-card {
      mat-card-content {
        padding-bottom: 0;
      }
    }
  `],
})
export class SongBuilderComponent {
  private sse = inject(SseService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  sectionTypes = SECTION_TYPES;
  genres = GENRES;
  moods = MOODS;
  timbres = TIMBRES;
  instruments = INSTRUMENTS;

  sections: SongSection[] = [
    { id: '1', type: 'intro-short', lyrics: '' },
    { id: '2', type: 'verse', lyrics: 'First verse lyrics here.' },
    { id: '3', type: 'chorus', lyrics: 'Chorus lyrics here.' },
    { id: '4', type: 'outro-short', lyrics: '' },
  ];

  style = {
    gender: 'female',
    timbre: 'bright',
    genres: ['pop'] as string[],
    moods: ['happy'] as string[],
    instruments: ['piano', 'drums'] as string[],
    bpm: 120,
  };

  stemType: StemType = 'full';
  songTitle = '';
  referenceFile: File | null = null;

  generating = false;
  generationStatus = '';

  private idCounter = 5;

  get formattedLyrics(): string {
    return this.sections
      .map((s) => {
        if (this.hasLyrics(s.type) && s.lyrics.trim()) {
          const lyrics = s.lyrics
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line)
            .map((line) => (line.endsWith('.') ? line : line + '.'))
            .join(' ');
          return `[${s.type}] ${lyrics}`;
        }
        return `[${s.type}]`;
      })
      .join(' ; ');
  }

  get formattedDescription(): string {
    const parts = [
      this.style.gender,
      this.style.timbre,
      ...this.style.genres,
      ...this.style.moods,
      this.style.instruments.length > 0
        ? this.style.instruments.join(' and ')
        : null,
      `the bpm is ${this.style.bpm}`,
    ].filter(Boolean);

    return parts.join(', ');
  }

  hasLyrics(type: SectionType): boolean {
    return SECTION_TYPES.find((t) => t.type === type)?.hasLyrics ?? false;
  }

  dropSection(event: CdkDragDrop<SongSection[]>): void {
    moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
  }

  addSection(): void {
    this.sections.push({
      id: String(this.idCounter++),
      type: 'verse',
      lyrics: '',
    });
  }

  removeSection(index: number): void {
    this.sections.splice(index, 1);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.setReferenceFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setReferenceFile(input.files[0]);
    }
  }

  private setReferenceFile(file: File): void {
    if (file.type.startsWith('audio/')) {
      this.referenceFile = file;
    } else {
      this.snackBar.open('Please select an audio file', 'OK', { duration: 3000 });
    }
  }

  clearReference(event: Event): void {
    event.stopPropagation();
    this.referenceFile = null;
  }

  generate(): void {
    if (this.sections.length === 0) {
      this.snackBar.open('Add at least one section', 'OK', { duration: 3000 });
      return;
    }

    this.generating = true;
    this.generationStatus = 'Starting generation...';

    this.sse
      .generateSong(
        this.formattedLyrics,
        this.formattedDescription,
        this.stemType,
        this.songTitle || undefined,
        undefined,
        this.referenceFile || undefined
      )
      .subscribe({
        next: (event) => {
          if (event.data.message) {
            this.generationStatus = event.data.message;
          }
          if (event.event === 'done' && event.data.song_id) {
            this.generating = false;
            this.snackBar.open('Song generated successfully!', 'View', {
              duration: 5000,
            }).onAction().subscribe(() => {
              this.router.navigate(['/library']);
            });
          }
          if (event.event === 'error') {
            this.generating = false;
            this.snackBar.open(
              event.data.message || 'Generation failed',
              'OK',
              { duration: 5000 }
            );
          }
        },
        error: (err) => {
          this.generating = false;
          this.generationStatus = '';
          this.snackBar.open(`Error: ${err.message}`, 'OK', { duration: 5000 });
        },
      });
  }
}
