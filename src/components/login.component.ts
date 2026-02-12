import { Component, output, signal } from '@angular/core';
import { DataService } from '../services/data.service';
import { FirebaseService } from '../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center z-50">
      <div class="bg-[#232527] bg-opacity-95 p-10 rounded-xl w-[420px] shadow-2xl border border-white/10">
        <div class="text-center mb-6">
          <div class="text-5xl font-black text-white mb-2 drop-shadow-[0_0_20px_rgba(0,162,255,0.5)]">ROBLOX</div>
          <div class="text-3xl font-bold text-blue-400 italic">NEXT</div>
          <h2 class="text-gray-400 text-sm mt-2">The future of blocky worlds</h2>
        </div>

        <div class="space-y-4">
           @if (error()) {
             <div class="bg-red-500/20 text-red-400 p-2 rounded text-sm text-center border border-red-500/30">
               {{ error() }}
             </div>
           }

           <div>
            <label class="block text-gray-400 text-sm font-medium mb-2">Email Address</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-4 top-3.5 text-gray-500"></i>
              <input type="email" [(ngModel)]="email" (input)="error.set('')" class="w-full bg-[#393b3d] text-white pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="name@example.com">
            </div>
           </div>

           <div>
            <label class="block text-gray-400 text-sm font-medium mb-2">Nickname</label>
            <div class="relative">
              <i class="fas fa-user absolute left-4 top-3.5 text-gray-500"></i>
              <input type="text" [(ngModel)]="nickname" (input)="error.set('')" class="w-full bg-[#393b3d] text-white pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Your display name">
            </div>
            <p class="text-xs text-gray-500 mt-1">If you are new, this will create your account instantly.</p>
           </div>
           
           <button (click)="onAction()" [disabled]="isLoading()" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3 rounded-lg font-bold text-white hover:scale-[1.02] transition shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
             @if (isLoading()) {
               <i class="fas fa-circle-notch fa-spin mr-2"></i> Processing...
             } @else {
               <i class="fas fa-play mr-2"></i> Start Playing
             }
           </button>
           
           <div class="text-xs text-center text-gray-500 mt-4">
               2026 Edition • Real-time Multiplayer • No verification required
           </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  nickname = '';
  loginSuccess = output<void>();
  isLoading = signal(false);
  error = signal('');

  constructor(
      private dataService: DataService,
      private firebaseService: FirebaseService
  ) {}

  async onAction() {
    if (!this.email.trim() || !this.email.includes('@')) {
        this.error.set('Please enter a valid email.');
        return;
    }
    if (!this.nickname.trim()) {
        this.error.set('Nickname is required.');
        return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
        // Check if user exists in Firebase DB
        const existingProfile = await this.firebaseService.getUserProfile(this.email);

        if (existingProfile) {
            // Login with existing
            // If they changed the nickname in the input, we could update it, 
            // but standard flow is usually keep DB one unless updated in profile.
            // For this seamless flow: if nickname matches DB, just login. 
            // If different, we can treat it as a login request.
            
            // We'll trust the DB profile for the avatar/items, but maybe they want to update nick?
            // Let's just load the DB profile for consistency.
            this.dataService.setUser(existingProfile);
        } else {
            // Registration: Create new
            const newUser = {
                email: this.email,
                username: this.nickname,
                description: 'Just a Roblox Next player exploring the world.',
                avatar: {
                    face: 'face_default',
                    clothes: 'clothes_default',
                    accessories: []
                }
            };
            await this.firebaseService.saveUserProfile(newUser);
            this.dataService.setUser(newUser);
        }

        this.loginSuccess.emit();
    } catch (e) {
        console.error(e);
        this.error.set('Connection error. Please try again.');
    } finally {
        this.isLoading.set(false);
    }
  }
}