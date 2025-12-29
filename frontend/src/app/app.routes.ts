import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'builder',
    pathMatch: 'full',
  },
  {
    path: 'builder',
    loadComponent: () =>
      import('./components/song-builder/song-builder.component').then(
        (m) => m.SongBuilderComponent
      ),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./components/library/library.component').then(
        (m) => m.LibraryComponent
      ),
  },
  {
    path: 'setup',
    loadComponent: () =>
      import('./components/setup/setup.component').then(
        (m) => m.SetupComponent
      ),
  },
];
