import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { SSEEvent } from '../models/song.models';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private zone: NgZone) {}

  /**
   * Download a model with SSE progress updates
   */
  downloadModel(modelName: string): Observable<SSEEvent> {
    return new Observable((observer) => {
      const formData = new FormData();
      formData.append('model', modelName);

      // Use fetch with POST for SSE (EventSource only supports GET)
      fetch(`${this.baseUrl}/setup/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const readChunk = (): void => {
            reader.read().then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let eventType = '';
              let eventData = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.substring(7);
                } else if (line.startsWith('data: ')) {
                  eventData = line.substring(6);
                } else if (line === '' && eventType && eventData) {
                  try {
                    const data = JSON.parse(eventData);
                    this.zone.run(() => {
                      observer.next({ event: eventType, data });
                    });

                    if (eventType === 'done' || eventType === 'error') {
                      observer.complete();
                      return;
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                  eventType = '';
                  eventData = '';
                }
              }

              readChunk();
            }).catch((error) => {
              this.zone.run(() => observer.error(error));
            });
          };

          readChunk();
        })
        .catch((error) => {
          this.zone.run(() => observer.error(error));
        });
    });
  }

  /**
   * Generate a song with SSE progress updates
   */
  generateSong(
    lyrics: string,
    description: string,
    stemType: string,
    title?: string,
    autoStyle?: string,
    referenceAudio?: File
  ): Observable<SSEEvent> {
    return new Observable((observer) => {
      const formData = new FormData();
      formData.append('lyrics', lyrics);
      formData.append('description', description);
      formData.append('stem_type', stemType);

      if (title) {
        formData.append('title', title);
      }
      if (autoStyle) {
        formData.append('auto_style', autoStyle);
      }
      if (referenceAudio) {
        formData.append('reference_audio', referenceAudio);
      }

      fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const readChunk = (): void => {
            reader.read().then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let eventType = '';
              let eventData = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.substring(7);
                } else if (line.startsWith('data: ')) {
                  eventData = line.substring(6);
                } else if (line === '' && eventType && eventData) {
                  try {
                    const data = JSON.parse(eventData);
                    this.zone.run(() => {
                      observer.next({ event: eventType, data });
                    });

                    if (eventType === 'done' || eventType === 'error') {
                      observer.complete();
                      return;
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                  eventType = '';
                  eventData = '';
                }
              }

              readChunk();
            }).catch((error) => {
              this.zone.run(() => observer.error(error));
            });
          };

          readChunk();
        })
        .catch((error) => {
          this.zone.run(() => observer.error(error));
        });
    });
  }
}
