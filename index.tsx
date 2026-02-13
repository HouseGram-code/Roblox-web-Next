import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
// Note: In Angular 18, it is named provideExperimentalZonelessChangeDetection
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
}).then(() => {
  // Success: Remove loader
  const loader = document.querySelector('.app-loader');
  if (loader) {
    loader.remove();
  }
}).catch(err => {
  console.error('Bootstrap Error:', err);
  const loader = document.querySelector('.app-loader');
  if (loader) {
    loader.innerHTML = `
      <div style="color: #ef4444; padding: 20px; text-align: center; max-width: 90%; font-family: sans-serif; background: #111;">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️ Startup Error</div>
        <div style="font-family: monospace; font-size: 12px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; text-align: left; overflow: auto; max-height: 300px; color: white;">
          ${err?.message || JSON.stringify(err)}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Retry</button>
      </div>
    `;
  }
});

// AI Studio always uses an `index.tsx` file for all project types.
