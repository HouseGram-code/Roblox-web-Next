import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { DataService } from '../services/data.service';
import { FirebaseService } from '../services/firebase.service';
import { AudioService } from '../services/audio.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="fixed inset-0 bg-[#0f1115] flex items-center justify-center z-50 overflow-hidden font-sans">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
      </div>

      <div class="relative bg-[#181a1d] p-10 rounded-2xl w-[400px] shadow-2xl border border-white/5 backdrop-blur-xl">
        
        <!-- Logo Area -->
        <div class="text-center mb-10">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition duration-300">
             <span class="text-white font-black text-4xl mt-1">R</span>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-1">Roblox <span class="text-blue-500">Next</span></h1>
          <p class="text-gray-500 text-sm font-medium">Enter the metaverse</p>
        </div>

        <div class="space-y-5">
           @if (error()) {
             <div class="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm text-center font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
               <i class="fas fa-exclamation-circle"></i> {{ error() }}
             </div>
           }

           <div>
            <label class="block text-gray-400 text-xs font-bold uppercase mb-2 tracking-wider ml-1">Email (Optional)</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i class="fas fa-envelope text-gray-500 group-focus-within:text-blue-500 transition-colors"></i>
              </div>
              <input type="email" [(ngModel)]="email" (input)="error.set('')" 
                     class="w-full bg-[#0f1115] text-white pl-11 pr-4 py-3.5 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-600 font-medium" 
                     placeholder="player@example.com">
            </div>
           </div>

           <div>
            <label class="block text-gray-400 text-xs font-bold uppercase mb-2 tracking-wider ml-1">Username</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i class="fas fa-user text-gray-500 group-focus-within:text-blue-500 transition-colors"></i>
              </div>
              <input type="text" [(ngModel)]="nickname" (input)="error.set('')" 
                     class="w-full bg-[#0f1115] text-white pl-11 pr-4 py-3.5 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-600 font-medium" 
                     placeholder="Enter your username">
            </div>
           </div>
           
           <button (click)="onAction()" [disabled]="isLoading()" 
                   class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2 group">
             
             @if (isLoading()) {
               <i class="fas fa-circle-notch fa-spin"></i>
               <span>Connecting...</span>
             } @else {
               <span>Start Playing</span>
               <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
             }
           </button>
           
           <div class="text-[10px] text-center text-gray-600 mt-6 font-medium">
               By playing, you agree to our Terms of Service.
           </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  email = '';
  nickname = '';
  @Output() loginSuccess = new EventEmitter<void>();
  isLoading = signal(false);
  error = signal('');

  private dataService = inject(DataService);
  private firebaseService = inject(FirebaseService);
  private audioService = inject(AudioService);

  constructor() {}

  onAction() {
    // 1. Audio Unlock (Best effort)
    try {
        this.audioService.unlockAudio();
    } catch (e) {
        // Ignore audio errors, not critical for login
    }

    // 2. Validation
    if (!this.nickname.trim()) {
        this.error.set('Введите позывной (никнейм)!');
        return;
    }
    this.error.set('');

    // 3. Prepare User Data
    const emailToUse = this.email.trim() || 'guest@roblox.next';
    const userToSet = {
        email: emailToUse,
        username: this.nickname.trim(),
        description: 'Защитник Отечества. Игрок Roblox Next.',
        avatar: {
            face: 'face_default',
            clothes: 'clothes_default',
            accessories: []
        }
    };

    // 4. Update Local State IMMEDIATELY (Optimistic UI)
    this.dataService.setUser(userToSet);

    // 5. Background Sync (Fire & Forget)
    this.firebaseService.getUserProfile(emailToUse).then(existing => {
        if (existing) {
            this.dataService.setUser(existing);
        } else {
            this.firebaseService.saveUserProfile(userToSet);
        }
    }).catch(err => {
        console.warn('Background sync failed:', err);
    });

    // 6. Navigate Immediately
    console.log('Emitting loginSuccess event...');
    this.loginSuccess.emit();
  }
}