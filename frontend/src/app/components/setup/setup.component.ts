import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

import { ApiService } from '../../services/api.service';
import { SseService } from '../../services/sse.service';
import { SetupStatus, Settings, GPUInfo } from '../../models/song.models';

interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  vramRequired: string;
}

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatDividerModule,
  ],
  template: `
    <div class="setup-container">
      <h1>Setup & Settings</h1>

      <!-- GPU Info -->
      <mat-card class="gpu-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>memory</mat-icon>
          <mat-card-title>GPU Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (gpuInfo) {
            <div class="gpu-info">
              <div class="gpu-name">{{ gpuInfo.name }}</div>
              <div class="gpu-stats">
                <span>VRAM: {{ gpuInfo.vram_used.toFixed(1) }} / {{ gpuInfo.vram_total.toFixed(1) }} GB</span>
                <span>Free: {{ gpuInfo.vram_free.toFixed(1) }} GB</span>
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="(gpuInfo.vram_used / gpuInfo.vram_total) * 100"
              />
            </div>
          } @else {
            <p>Loading GPU info...</p>
          }
        </mat-card-content>
      </mat-card>

      <!-- Model Download -->
      <mat-card class="models-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>download</mat-icon>
          <mat-card-title>Models</mat-card-title>
          <mat-card-subtitle>Download and select a model</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="models-grid">
            @for (model of models; track model.name) {
              <div
                class="model-card"
                [class.installed]="isInstalled(model.name)"
                [class.selected]="setupStatus?.current_model === model.name"
              >
                <div class="model-header">
                  <span class="model-name">{{ model.displayName }}</span>
                  @if (isInstalled(model.name)) {
                    <mat-icon class="check-icon">check_circle</mat-icon>
                  }
                </div>
                <p class="model-desc">{{ model.description }}</p>
                <div class="model-vram">{{ model.vramRequired }}</div>
                <div class="model-actions">
                  @if (!isInstalled(model.name)) {
                    <button
                      mat-raised-button
                      color="primary"
                      [disabled]="downloading"
                      (click)="downloadModel(model.name)"
                    >
                      Download
                    </button>
                  } @else if (setupStatus?.current_model !== model.name) {
                    <button
                      mat-raised-button
                      color="accent"
                      (click)="selectModel(model.name)"
                    >
                      Select
                    </button>
                  } @else {
                    <span class="selected-label">Active</span>
                  }
                </div>
              </div>
            }
          </div>

          @if (downloading) {
            <div class="download-progress">
              <mat-progress-bar mode="indeterminate" />
              <p>{{ downloadStatus }}</p>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Settings -->
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>tune</mat-icon>
          <mat-card-title>Generation Settings</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (settings) {
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Low Memory Mode</span>
                  <span class="setting-desc">Reduces quality but uses less VRAM (for 10GB GPUs)</span>
                </div>
                <mat-slide-toggle
                  [checked]="settings.low_mem"
                  (change)="updateSetting('low_mem', $event.checked)"
                />
              </div>
              <mat-divider />
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Flash Attention</span>
                  <span class="setting-desc">Faster generation (requires compatible GPU)</span>
                </div>
                <mat-slide-toggle
                  [checked]="settings.flash_attn"
                  (change)="updateSetting('flash_attn', $event.checked)"
                />
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .setup-container {
      max-width: 900px;
      margin: 0 auto;

      h1 {
        margin-bottom: 24px;
        color: #333;
      }
    }

    mat-card {
      margin-bottom: 24px;

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

    .gpu-card {
      .gpu-info {
        .gpu-name {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .gpu-stats {
          display: flex;
          gap: 24px;
          margin-bottom: 8px;
          font-size: 0.875rem;
          color: #666;
        }
      }
    }

    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .model-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;

      &.installed {
        border-color: #4caf50;
        background: #f1f8e9;
      }

      &.selected {
        border-color: #3f51b5;
        background: #e8eaf6;
      }

      .model-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .model-name {
          font-weight: 500;
        }

        .check-icon {
          color: #4caf50;
        }
      }

      .model-desc {
        font-size: 0.875rem;
        color: #666;
        margin-bottom: 8px;
      }

      .model-vram {
        font-size: 0.75rem;
        color: #999;
        margin-bottom: 12px;
      }

      .model-actions {
        .selected-label {
          color: #3f51b5;
          font-weight: 500;
        }
      }
    }

    .download-progress {
      margin-top: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;

      p {
        margin-top: 8px;
        font-size: 0.875rem;
        color: #666;
      }
    }

    .settings-list {
      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;

        .setting-info {
          .setting-name {
            display: block;
            font-weight: 500;
          }

          .setting-desc {
            display: block;
            font-size: 0.875rem;
            color: #666;
            margin-top: 4px;
          }
        }
      }
    }
  `],
})
export class SetupComponent implements OnInit {
  private api = inject(ApiService);
  private sse = inject(SseService);

  setupStatus: SetupStatus | null = null;
  settings: Settings | null = null;
  gpuInfo: GPUInfo | null = null;

  downloading = false;
  downloadStatus = '';

  models: ModelInfo[] = [
    {
      name: 'SongGeneration-base',
      displayName: 'Base',
      description: 'Standard model, Chinese only',
      vramRequired: '10GB VRAM',
    },
    {
      name: 'SongGeneration-base-new',
      displayName: 'Base New',
      description: 'Chinese + English support',
      vramRequired: '10GB VRAM',
    },
    {
      name: 'SongGeneration-base-full',
      displayName: 'Base Full',
      description: 'Longer songs (up to 4m30s)',
      vramRequired: '12GB VRAM',
    },
    {
      name: 'SongGeneration-large',
      displayName: 'Large',
      description: 'Best quality output',
      vramRequired: '22GB VRAM',
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.api.getSetupStatus().subscribe((status) => {
      this.setupStatus = status;
    });

    this.api.getSettings().subscribe((settings) => {
      this.settings = settings;
    });

    this.api.getGPUInfo().subscribe((info) => {
      this.gpuInfo = info;
    });
  }

  isInstalled(modelName: string): boolean {
    return this.setupStatus?.models.includes(modelName) ?? false;
  }

  downloadModel(modelName: string): void {
    this.downloading = true;
    this.downloadStatus = 'Starting download...';

    this.sse.downloadModel(modelName).subscribe({
      next: (event) => {
        if (event.data.message) {
          this.downloadStatus = event.data.message;
        }
        if (event.event === 'done') {
          this.downloading = false;
          this.loadData();
        }
      },
      error: (err) => {
        this.downloading = false;
        this.downloadStatus = `Error: ${err.message}`;
      },
      complete: () => {
        this.downloading = false;
      },
    });
  }

  selectModel(modelName: string): void {
    this.api.selectModel(modelName).subscribe(() => {
      this.loadData();
    });
  }

  updateSetting(key: string, value: boolean): void {
    this.api.updateSettings({ [key]: value }).subscribe((settings) => {
      this.settings = settings;
    });
  }
}
