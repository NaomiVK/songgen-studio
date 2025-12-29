import { Injectable, signal } from '@angular/core';
import { Song } from '../models/song.models';

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentSong: Song | null;
  audioType: 'full' | 'vocal' | 'bgm';
}

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private baseUrl = 'http://localhost:8000/api';

  // Signals for reactive state
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(1);
  readonly currentSong = signal<Song | null>(null);
  readonly audioType = signal<'full' | 'vocal' | 'bgm'>('full');

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    this.audio = new Audio();
    this.audio.volume = this.volume();

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio!.currentTime);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio!.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });
  }

  play(song: Song, type: 'full' | 'vocal' | 'bgm' = 'full'): void {
    if (!this.audio) return;

    // If same song and type, just resume
    if (
      this.currentSong()?.id === song.id &&
      this.audioType() === type &&
      this.audio.src
    ) {
      this.audio.play();
      return;
    }

    // Load new song
    const audioUrl = `${this.baseUrl}/library/${song.id}/audio?type=${type}`;
    this.audio.src = audioUrl;
    this.currentSong.set(song);
    this.audioType.set(type);
    this.audio.load();
    this.audio.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  toggle(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.audio?.play();
    }
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  setVolume(volume: number): void {
    this.volume.set(volume);
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
    }
    this.currentSong.set(null);
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
