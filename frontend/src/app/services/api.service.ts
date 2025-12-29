import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Song,
  SongList,
  Settings,
  GPUInfo,
  SetupStatus,
} from '../models/song.models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Health check
  healthCheck(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`);
  }

  // Settings
  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(`${this.baseUrl}/settings`);
  }

  updateSettings(settings: Partial<Settings>): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/settings`, settings);
  }

  getGPUInfo(): Observable<GPUInfo> {
    return this.http.get<GPUInfo>(`${this.baseUrl}/gpu`);
  }

  // Setup/Models
  getSetupStatus(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>(`${this.baseUrl}/setup/status`);
  }

  selectModel(model: string): Observable<{ status: string; current_model: string }> {
    return this.http.post<{ status: string; current_model: string }>(
      `${this.baseUrl}/setup/select-model`,
      { model }
    );
  }

  // Library
  getSongs(
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'desc'
  ): Observable<SongList> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sort)
      .set('order', order);

    return this.http.get<SongList>(`${this.baseUrl}/library`, { params });
  }

  getSong(id: string): Observable<Song> {
    return this.http.get<Song>(`${this.baseUrl}/library/${id}`);
  }

  updateSong(id: string, title: string): Observable<Song> {
    return this.http.patch<Song>(`${this.baseUrl}/library/${id}`, { title });
  }

  deleteSong(id: string): Observable<{ status: string; id: string }> {
    return this.http.delete<{ status: string; id: string }>(
      `${this.baseUrl}/library/${id}`
    );
  }

  getAudioUrl(id: string, type: 'full' | 'vocal' | 'bgm' = 'full'): string {
    return `${this.baseUrl}/library/${id}/audio?type=${type}`;
  }

  getDownloadUrl(id: string, type: 'full' | 'vocal' | 'bgm' = 'full'): string {
    return `${this.baseUrl}/library/${id}/download?type=${type}`;
  }
}
