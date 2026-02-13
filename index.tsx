import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()
  ]
}).then(() => {
  // Success: Remove loader if Angular didn't already clear it
  const loader = document.querySelector('.app-loader');
  if (loader) {
    loader.remove();
  }
}).catch(err => {
  console.error('Bootstrap Error:', err);
  // Display error on screen for mobile/web debugging
  const loader = document.querySelector('.app-loader');
  if (loader) {
    loader.innerHTML = `
      <div style="color: #ef4444; padding: 20px; text-align: center; max-width: 90%; font-family: sans-serif;">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️ Startup Error</div>
        <div style="font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; text-align: left; overflow: auto; max-height: 300px; color: white;">
          ${err?.message || JSON.stringify(err)}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Retry</button>
      </div>
    `;
  }
});

// AI Studio always uses an `index.tsx` file for all project types.
