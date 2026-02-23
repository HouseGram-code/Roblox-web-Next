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
    <div class="fixed inset-0 bg-[#121810] flex items-center justify-center z-50 overflow-hidden">
      <!-- Camouflage / Military Background Pattern -->
      <div class="absolute inset-0 opacity-20 pointer-events-none" 
           style="background-image: radial-gradient(#3a4a3a 2px, transparent 2px), radial-gradient(#2a3a2a 2px, transparent 2px); background-size: 32px 32px; background-position: 0 0, 16px 16px;">
      </div>
      
      <!-- Animated Stars Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-10 left-10 text-yellow-600/20 text-6xl animate-pulse"><i class="fas fa-star"></i></div>
          <div class="absolute bottom-20 right-20 text-red-600/20 text-8xl animate-pulse" style="animation-delay: 1s"><i class="fas fa-star"></i></div>
          <div class="absolute top-1/2 left-20 text-yellow-600/10 text-4xl animate-pulse" style="animation-delay: 2s"><i class="fas fa-star"></i></div>
      </div>

      <div class="relative bg-[#1e261e] bg-opacity-95 p-10 rounded-xl w-[420px] shadow-[0_0_50px_rgba(76,175,80,0.2)] border-2 border-[#3e4c3e]">
        
        <!-- St. George Ribbon Decor (Top) -->
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gradient-to-r from-orange-500 via-black to-orange-500 flex items-center justify-center shadow-lg transform -skew-x-12 border border-yellow-600/50">
            <div class="w-full h-full flex justify-between px-1">
                <div class="w-1/4 h-full bg-black/80"></div>
                <div class="w-1/4 h-full bg-black/80"></div>
                <div class="w-1/4 h-full bg-black/80"></div>
            </div>
        </div>

        <div class="text-center mb-8 mt-4">
          <div class="flex justify-center mb-2">
             <i class="fas fa-star text-5xl text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"></i>
          </div>
          <div class="text-4xl font-black text-white mb-1 uppercase tracking-wider drop-shadow-md">23 Февраля</div>
          <div class="text-sm font-bold text-[#8ba88b] uppercase tracking-[0.2em]">День Защитника Отечества</div>
        </div>

        <div class="space-y-5">
           @if (error()) {
             <div class="bg-red-900/30 text-red-400 p-3 rounded border border-red-800/50 text-sm text-center font-bold">
               <i class="fas fa-exclamation-triangle mr-2"></i> {{ error() }}
             </div>
           }

           <div>
            <label class="block text-[#8ba88b] text-xs font-bold uppercase mb-2 tracking-wide">Email (Необязательно)</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i class="fas fa-envelope text-[#4a5e4a] group-focus-within:text-[#6a8e6a] transition-colors"></i>
              </div>
              <input type="email" [(ngModel)]="email" (input)="error.set('')" 
                     class="w-full bg-[#121810] text-white pl-11 pr-4 py-3.5 rounded border border-[#2a3a2a] focus:border-[#4caf50] focus:ring-1 focus:ring-[#4caf50] focus:outline-none transition-all placeholder-[#3a4a3a] font-medium" 
                     placeholder="soldier@example.com">
            </div>
           </div>

           <div>
            <label class="block text-[#8ba88b] text-xs font-bold uppercase mb-2 tracking-wide">Позывной (Никнейм)</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i class="fas fa-dog text-[#4a5e4a] group-focus-within:text-[#6a8e6a] transition-colors"></i>
              </div>
              <input type="text" [(ngModel)]="nickname" (input)="error.set('')" 
                     class="w-full bg-[#121810] text-white pl-11 pr-4 py-3.5 rounded border border-[#2a3a2a] focus:border-[#4caf50] focus:ring-1 focus:ring-[#4caf50] focus:outline-none transition-all placeholder-[#3a4a3a] font-medium" 
                     placeholder="Введите ваш ник">
            </div>
           </div>
           
           <button (click)="onAction()" [disabled]="isLoading()" 
                   class="w-full bg-gradient-to-b from-[#4caf50] to-[#2e7d32] hover:from-[#5cb860] hover:to-[#388e3c] text-white py-4 rounded font-black uppercase tracking-widest shadow-[0_4px_0_#1b5e20] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 group relative overflow-hidden">
             
             <!-- Shine effect -->
             <div class="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
             
             @if (isLoading()) {
               <span class="flex items-center justify-center gap-2">
                 <i class="fas fa-cog fa-spin"></i> ЗАГРУЗКА...
               </span>
             } @else {
               <span class="flex items-center justify-center gap-2 text-shadow">
                 <i class="fas fa-star"></i> ВСТУПИТЬ В ОТРЯД
               </span>
             }
           </button>
           
           <div class="text-[10px] text-center text-[#4a5e4a] mt-6 font-mono uppercase">
               Служим России • Roblox Next 2026
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-shadow {
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
  `]
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