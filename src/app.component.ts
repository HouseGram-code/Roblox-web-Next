import { Component, computed, signal, effect, ViewChild, ElementRef, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login.component';
import { ThreeGameService } from './services/three-game.service';
import { ThreeProfileService } from './services/three-profile.service';
import { AudioService } from './services/audio.service';
import { FirebaseService, ChatMessage } from './services/firebase.service';

type View = 'LOGIN' | 'DISCOVERY' | 'PROFILE' | 'GAME' | 'SHOP' | 'UPDATES';
type MenuTab = 'PLAYERS' | 'SETTINGS';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, FormsModule],
  // ChangeDetectionStrategy.OnPush removed to ensure initial render in zoneless mode
  template: `
@if (currentView() === 'LOGIN') {
  <app-login (loginSuccess)="onLoginSuccess()"></app-login>
} @else {
  @if (currentView() !== 'GAME') {
    <!-- Top Navigation -->
    <nav class="h-16 bg-[#232527] border-b border-white/5 flex justify-between items-center px-6 relative z-10 sticky top-0 shadow-xl">
      <div class="flex items-center gap-10">
        <!-- New Block Logo -->
        <a (click)="navTo('DISCOVERY')" class="cursor-pointer group hover:opacity-90 transition">
             <div class="w-10 h-10 bg-white rounded-[10px] flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-200">
                <span class="text-[#232527] font-black text-3xl leading-none select-none mt-1">R</span>
             </div>
        </a>

        <!-- Nav Links -->
        <div class="flex items-center gap-2">
            <button (click)="navTo('DISCOVERY')" [ngClass]="currentView() === 'DISCOVERY' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'" class="font-bold text-sm flex items-center gap-2 transition-all px-4 py-2 rounded-lg">
            <i class="fas fa-gamepad text-lg" [class.text-blue-500]="currentView() === 'DISCOVERY'"></i> Games
            </button>
            <button (click)="navTo('SHOP')" [ngClass]="currentView() === 'SHOP' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'" class="font-bold text-sm flex items-center gap-2 transition-all px-4 py-2 rounded-lg">
            <i class="fas fa-store text-lg" [class.text-yellow-500]="currentView() === 'SHOP'"></i> Shop
            </button>
            <button (click)="navTo('PROFILE')" [ngClass]="currentView() === 'PROFILE' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'" class="font-bold text-sm flex items-center gap-2 transition-all px-4 py-2 rounded-lg">
            <i class="fas fa-user text-lg" [class.text-green-500]="currentView() === 'PROFILE'"></i> Profile
            </button>
            <button (click)="navTo('UPDATES')" [ngClass]="currentView() === 'UPDATES' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'" class="font-bold text-sm flex items-center gap-2 transition-all px-4 py-2 rounded-lg">
            <i class="fas fa-bell text-lg" [class.text-orange-500]="currentView() === 'UPDATES'"></i> Updates
            </button>
        </div>
      </div>

      <!-- New Profile Pill -->
      <div class="flex items-center">
        <div (click)="navTo('PROFILE')" class="flex items-center gap-3 bg-[#111111] border border-[#333] px-1 py-1 pr-4 rounded-full hover:bg-[#1a1a1a] hover:border-gray-600 transition cursor-pointer group shadow-sm">
          <!-- Status / Avatar Circle -->
          <div class="w-8 h-8 rounded-full bg-[#00b06f] flex items-center justify-center border-2 border-[#111111] shadow-inner relative">
              <div class="w-full h-full rounded-full bg-gradient-to-tr from-[#00b06f] to-[#26d696] opacity-90"></div>
          </div>
          
          <span class="font-bold text-sm text-gray-200 group-hover:text-white transition">{{ dataService.user().username }}</span>
          <span class="bg-[#2563eb] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">LVL 0</span>
        </div>
      </div>
    </nav>
  }

  <!-- DISCOVERY PAGE -->
  @if (currentView() === 'DISCOVERY') {
    <div class="p-8 h-[calc(100vh-64px)] overflow-y-auto bg-[#1a1c1e]">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 class="text-3xl font-black text-white flex items-center gap-3"><i class="fas fa-fire text-orange-500"></i> Popular Experiences</h1>
        
        <!-- Search Bar -->
        <div class="relative w-full md:w-96">
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              placeholder="Search experiences..." 
              class="w-full bg-[#232527] text-white text-sm px-4 py-3 pl-10 rounded-xl border border-white/10 focus:border-blue-500 focus:outline-none transition shadow-inner"
            >
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Card 1: Rainbow Obby -->
        @if (matchesSearch('Mega Rainbow Obby', 'Obby, Parkour, Fun, Rainbow, Mega, Easy, Platformer')) {
            <div (click)="openGameModal('rainbow')" class="bg-[#232527] rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 border border-white/5 group relative">
              <div class="h-44 bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-500 relative overflow-hidden">
                 <!-- Shine effect -->
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                <!-- Play overlay -->
                <div class="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none backdrop-blur-sm">
                   <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                      <i class="fas fa-play text-white ml-1 text-2xl"></i>
                   </div>
                </div>
                <span class="absolute top-3 left-3 z-30 bg-black/70 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg">
                    <i class="fas fa-fire text-orange-500"></i> TRENDING
                </span>
                
                <!-- Floating decorative elements to enhance visual weight -->
                <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
                <div class="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              </div>
              <div class="p-5">
                <h3 class="text-xl font-bold mb-2 text-white leading-tight group-hover:text-blue-400 transition-colors">Mega Rainbow Obby</h3>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">Jump through 50+ stages of colorful platforming fun! Reach the end for a special badge!</p>
                <div class="flex items-center justify-between mt-auto border-t border-white/10 pt-3">
                  <div class="flex items-center gap-4 text-xs font-bold text-gray-400">
                    <span class="text-green-400 flex items-center gap-1.5 bg-green-400/10 px-2 py-1 rounded-md">
                        <i class="fas fa-thumbs-up"></i> {{ ratingPercentage() }}%
                    </span>
                    <span class="flex items-center gap-1.5">
                        <i class="fas fa-user-friends text-blue-400"></i> {{ onlineCount() }} Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
        }
        
        @if (searchQuery().trim() !== '' && !matchesSearch('Mega Rainbow Obby', 'Obby, Parkour, Fun, Rainbow, Mega, Easy, Platformer')) {
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
                <h3 class="text-xl font-bold text-white mb-2">No experiences found</h3>
                <p>Try searching for different keywords.</p>
            </div>
        }
      </div>
    </div>
  }

  <!-- SHOP PAGE -->
  @if (currentView() === 'SHOP') {
      <div class="p-8 h-[calc(100vh-64px)] overflow-y-auto bg-[#1a1c1e]">
          <div class="flex items-center justify-between mb-8">
              <h1 class="text-3xl font-black text-white flex items-center gap-3">
                  <i class="fas fa-store text-blue-500"></i> Avatar Shop
              </h1>
              <div class="bg-[#232527] px-4 py-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <i class="fas fa-coins text-yellow-500"></i>
                  <span class="text-white font-bold">0 Robux</span>
              </div>
          </div>

          <!-- Featured Section -->
          <div class="mb-10">
              <h2 class="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Featured Items</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <!-- Defender Hat Special -->
                  <div class="bg-gradient-to-br from-[#1b5e20] to-[#2e7d32] rounded-xl p-1 shadow-lg relative overflow-hidden group">
                      <div class="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-md">LIMITED TIME</div>
                      <div class="bg-[#1a1c1e] h-full rounded-lg p-6 flex flex-col relative z-0">
                          <div class="flex-grow flex flex-col items-center text-center">
                              <div class="w-32 h-32 bg-[#232527] rounded-full mb-4 flex items-center justify-center shadow-inner relative overflow-hidden">
                                  <i class="fas fa-star text-6xl text-red-600 drop-shadow-lg absolute opacity-20 animate-pulse"></i>
                                  <i class="fas fa-hard-hat text-5xl text-[#4caf50] relative z-10"></i>
                              </div>
                              <h3 class="text-2xl font-black text-white mb-1">Шляпа Защитника</h3>
                              <p class="text-gray-400 text-sm mb-4">Эксклюзивный предмет в честь 23 Февраля. Символ мужества.</p>
                          </div>
                          
                          @if (dataService.hasItem('hat_defender')) {
                              <button disabled class="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                  <i class="fas fa-check"></i> ALREADY OWNED
                              </button>
                          } @else {
                              <button (click)="buyItem('hat_defender')" class="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                                  <i class="fas fa-shopping-cart"></i> CLAIM FREE
                              </button>
                          }
                      </div>
                  </div>

                  <!-- Spring Wings -->
                  <div class="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-1 shadow-lg relative overflow-hidden group">
                      <div class="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-md">NEW</div>
                      <div class="bg-[#1a1c1e] h-full rounded-lg p-6 flex flex-col relative z-0">
                          <div class="flex-grow flex flex-col items-center text-center">
                              <div class="w-32 h-32 bg-[#232527] rounded-full mb-4 flex items-center justify-center shadow-inner relative overflow-hidden">
                                  <div class="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 animate-pulse"></div>
                                  <i class="fas fa-feather-alt text-5xl text-pink-400 relative z-10"></i>
                              </div>
                              <h3 class="text-2xl font-black text-white mb-1">Крылья Весны</h3>
                              <p class="text-gray-400 text-sm mb-4">Живые анимированные крылья с эффектами. Почувствуй весну!</p>
                          </div>
                          
                          @if (dataService.hasItem('wings_spring')) {
                              <button disabled class="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                  <i class="fas fa-check"></i> ALREADY OWNED
                              </button>
                          } @else {
                              <button (click)="buyItem('wings_spring')" class="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                                  <i class="fas fa-shopping-cart"></i> CLAIM FREE
                              </button>
                          }
                      </div>
                  </div>
              </div>
          </div>
      </div>
  }

  <!-- PROFILE PAGE -->
  @if (currentView() === 'PROFILE') {
    <div class="h-[calc(100vh-64px)] overflow-y-auto bg-[#111213]">
      
      <!-- Profile Header / Banner -->
      <div class="h-48 bg-gradient-to-r from-blue-900 to-slate-900 relative border-b border-white/5">
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          <div class="absolute -bottom-16 left-8 flex items-end">
               <!-- Avatar Container -->
               <div class="w-40 h-40 bg-[#1a1c1e] rounded-full border-[6px] border-[#111213] overflow-hidden shadow-2xl relative z-10 group cursor-grab active:cursor-grabbing">
                   <div #profileContainer class="w-full h-full"></div>
                   <div class="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition bg-black/50 py-1 backdrop-blur-sm">Rotate 360°</div>
               </div>
               
               <div class="mb-4 ml-6 pb-2 w-full">
                   <div class="flex items-center gap-4">
                       @if (isEditingProfile()) {
                         <input type="text" [(ngModel)]="editName" class="text-4xl font-black text-white bg-white/10 rounded px-2 outline-none border border-white/30 w-1/2">
                       } @else {
                         <h1 class="text-4xl font-black text-white drop-shadow-md tracking-tight">{{ dataService.user().username }}</h1>
                       }
                       
                       <button (click)="toggleEditProfile()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-gray-300">
                           <i class="fas" [class.fa-pencil-alt]="!isEditingProfile()" [class.fa-save]="isEditingProfile()" [class.text-green-400]="isEditingProfile()"></i>
                       </button>
                   </div>
                   
                   <div class="text-gray-400 font-medium text-sm flex items-center gap-2 mt-1">
                       <span>{{ dataService.user().email }}</span>
                       <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                       <span class="text-green-500 font-bold">Online</span>
                   </div>
               </div>
          </div>
      </div>

      <!-- Main Content -->
      <div class="mt-20 px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left Column: Stats -->
          <div class="space-y-6">
              <div class="bg-[#1a1c1e] rounded-xl p-6 border border-white/5 shadow-lg">
                  <!-- Character Editor Button -->
                  <button (click)="openCharacterEditor()" class="w-full mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95">
                      <i class="fas fa-tshirt"></i> Customize Character
                  </button>

                  <h3 class="text-gray-400 font-bold uppercase text-xs mb-4 tracking-wider">Statistics</h3>
                  <div class="grid grid-cols-2 gap-4">
                      <div class="bg-[#232527] p-3 rounded-lg text-center hover:bg-[#2a2c2e] transition">
                          <div class="text-2xl font-bold text-white">0</div>
                          <div class="text-[10px] text-gray-500 uppercase font-bold">Friends</div>
                      </div>
                      <div class="bg-[#232527] p-3 rounded-lg text-center hover:bg-[#2a2c2e] transition">
                          <div class="text-2xl font-bold text-white">0</div>
                          <div class="text-[10px] text-gray-500 uppercase font-bold">Followers</div>
                      </div>
                      <div class="bg-[#232527] p-3 rounded-lg text-center hover:bg-[#2a2c2e] transition">
                          <div class="text-2xl font-bold text-white">0</div>
                          <div class="text-[10px] text-gray-500 uppercase font-bold">Visits</div>
                      </div>
                      <div class="bg-[#232527] p-3 rounded-lg text-center hover:bg-[#2a2c2e] transition">
                          <div class="text-2xl font-bold text-white">0</div>
                          <div class="text-[10px] text-gray-500 uppercase font-bold">Level</div>
                      </div>
                  </div>
                  
                  <div class="mt-6">
                      <h3 class="text-gray-400 font-bold uppercase text-xs mb-2 tracking-wider">About</h3>
                      @if (isEditingProfile()) {
                          <textarea [(ngModel)]="editDesc" class="w-full bg-white/10 rounded p-2 text-gray-300 text-sm h-24 outline-none resize-none border border-white/30"></textarea>
                      } @else {
                          <p class="text-gray-300 text-sm italic">"{{ dataService.user().description }}"</p>
                      }
                  </div>
                  
                  <div class="mt-6 pt-6 border-t border-white/5 text-xs text-gray-500 font-medium flex justify-between">
                      <span>Joined Feb 2026</span>
                      <span class="text-blue-500/50 font-mono">v0.3B</span>
                  </div>
              </div>
          </div>

          <!-- Right Column: Inventory / Customization -->
          <div class="lg:col-span-2">
              <div class="bg-[#1a1c1e] rounded-xl border border-white/5 shadow-lg overflow-hidden">
                  <div class="px-6 py-4 border-b border-white/5 bg-[#232527] flex justify-between items-center">
                      <h2 class="text-lg font-bold text-white">Character Customization</h2>
                      <span class="bg-blue-600/20 text-blue-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Inventory</span>
                  </div>
                  
                  <div class="p-6">
                      @if (dataService.ITEMS.length === 0) {
                        <div class="text-center py-10 text-gray-500">
                            <i class="fas fa-box-open text-4xl mb-3 opacity-50"></i>
                            <div class="font-medium">No items available.</div>
                        </div>
                      }
                      
                      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        @for (item of dataService.ITEMS; track item.id) {
                           <!-- Only show owned items -->
                           @if (dataService.hasItem(item.id)) {
                               <div 
                                 (click)="equip(item.id, item.type)"
                                 class="group relative bg-[#232527] rounded-xl p-3 cursor-pointer border-2 transition-all hover:-translate-y-1 hover:shadow-xl"
                                 [class.border-blue-500]="dataService.user().avatar.clothes === item.id || dataService.user().avatar.face === item.id || dataService.user().avatar.accessories?.includes(item.id)"
                                 [class.border-transparent]="dataService.user().avatar.clothes !== item.id && dataService.user().avatar.face !== item.id && !dataService.user().avatar.accessories?.includes(item.id)"
                                 [class.bg-blue-900-10]="dataService.user().avatar.clothes === item.id"
                               >
                                 @if (dataService.user().avatar.clothes === item.id || dataService.user().avatar.accessories?.includes(item.id)) {
                                     <div class="absolute top-2 right-2 text-blue-500 text-[10px] font-black bg-blue-900/40 px-1.5 py-0.5 rounded backdrop-blur-md"><i class="fas fa-check"></i> EQUIPPED</div>
                                 }
                                 <div class="aspect-square bg-[#111213] rounded-lg mb-3 overflow-hidden flex items-center justify-center relative shadow-inner">
                                     <!-- Color Preview for Clothes -->
                                     @if (item.type === 'clothes') {
                                        <div class="w-16 h-16 rounded shadow-lg transform group-hover:scale-110 transition" [style.background-color]="'#' + item.color?.toString(16)?.padStart(6, '0')"></div>
                                     } @else if (item.id === 'hat_defender') {
                                        <i class="fas fa-hard-hat text-4xl text-[#4caf50]"></i>
                                     } @else if (item.id === 'wings_spring') {
                                        <i class="fas fa-feather-alt text-4xl text-pink-400"></i>
                                     }
                                 </div>
                                 
                                 <div class="font-bold text-white text-sm truncate">{{ item.name }}</div>
                                 <div class="text-xs text-gray-500">{{ item.type | titlecase }}</div>
                               </div>
                           }
                        }
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  }

  <!-- UPDATES PAGE -->
  @if (currentView() === 'UPDATES') {
    <div class="p-8 h-[calc(100vh-64px)] overflow-y-auto bg-[#1a1c1e]">
      <h1 class="text-3xl font-black text-white mb-8 flex items-center gap-3">
          <i class="fas fa-bell text-yellow-500"></i> Updates
      </h1>

      <div class="max-w-3xl mx-auto space-y-8">
          <!-- Update 0.3B -->
          <div class="bg-[#232527] rounded-xl border border-white/5 overflow-hidden shadow-lg">
              <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                  <h2 class="text-xl font-bold text-white">Update 0.3B</h2>
                  <span class="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded">LATEST</span>
              </div>
              <div class="p-6">
                  <div class="mb-6">
                      <h3 class="text-green-400 font-bold uppercase text-xs mb-3 tracking-wider flex items-center gap-2">
                          <i class="fas fa-plus-circle"></i> What's New
                      </h3>
                      <ul class="space-y-2 text-gray-300 text-sm">
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>UI & Design:</strong> Complete visual overhaul of the main page, game cards, and top navigation for better readability and style.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>Double Jump:</strong> Added double jump capability with a spin effect! Press jump while in the air to activate.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>Character Animations:</strong> New dynamic 3D animations for running, jumping, falling, and idling (breathing).</span>
                          </li>
                      </ul>
                  </div>

                  <div>
                      <h3 class="text-orange-400 font-bold uppercase text-xs mb-3 tracking-wider flex items-center gap-2">
                          <i class="fas fa-wrench"></i> Fixes & Improvements
                      </h3>
                      <ul class="space-y-2 text-gray-300 text-sm">
                          <li class="flex items-start gap-2">
                              <i class="fas fa-bug text-orange-500 mt-1"></i>
                              <span><strong>Anti-Spam System:</strong> Implemented a 1.5s chat cooldown to prevent spamming in global chat.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-bug text-orange-500 mt-1"></i>
                              <span>Improved mobile touch controls, fixing the jump button triggering camera movement.</span>
                          </li>
                      </ul>
                  </div>
              </div>
          </div>

          <!-- Update 0.2B -->
          <div class="bg-[#232527] rounded-xl border border-white/5 overflow-hidden shadow-lg opacity-80">
              <div class="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4 flex justify-between items-center">
                  <h2 class="text-xl font-bold text-white">Update 0.2B</h2>
                  <span class="bg-white/10 text-white/50 text-xs font-bold px-2 py-1 rounded">PREVIOUS</span>
              </div>
              <div class="p-6">
                  <div class="mb-6">
                      <h3 class="text-green-400 font-bold uppercase text-xs mb-3 tracking-wider flex items-center gap-2">
                          <i class="fas fa-plus-circle"></i> What's New
                      </h3>
                      <ul class="space-y-2 text-gray-300 text-sm">
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>Character Editor:</strong> Customize your avatar with a new 3D editor in the Profile tab.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>Sound Effects:</strong> Improved jumping and walking sounds for better immersion.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-check text-green-500 mt-1"></i>
                              <span><strong>Updates Tab:</strong> Added this section to track game changes.</span>
                          </li>
                      </ul>
                  </div>

                  <div>
                      <h3 class="text-orange-400 font-bold uppercase text-xs mb-3 tracking-wider flex items-center gap-2">
                          <i class="fas fa-wrench"></i> Fixes & Improvements
                      </h3>
                      <ul class="space-y-2 text-gray-300 text-sm">
                          <li class="flex items-start gap-2">
                              <i class="fas fa-bug text-orange-500 mt-1"></i>
                              <span>Fixed chat notification badge persisting after reading messages.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-bug text-orange-500 mt-1"></i>
                              <span>Reverted login theme to standard dark mode.</span>
                          </li>
                          <li class="flex items-start gap-2">
                              <i class="fas fa-bug text-orange-500 mt-1"></i>
                              <span>General performance improvements.</span>
                          </li>
                      </ul>
                  </div>
              </div>
          </div>
      </div>
    </div>
  }
}

  <!-- CHARACTER EDITOR MODAL -->
  @if (isCharacterEditorOpen()) {
      <div class="fixed inset-0 z-[100] bg-[#0f1115] flex flex-col animate-in fade-in duration-300">
          <!-- Editor Header -->
          <div class="h-16 bg-[#1a1c1e] border-b border-white/5 flex justify-between items-center px-6">
              <h2 class="text-xl font-black text-white flex items-center gap-2">
                  <i class="fas fa-paint-brush text-blue-500"></i> Character Editor
              </h2>
              <div class="flex items-center gap-4">
                  <button (click)="toggleEditorTheme()" class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition" title="Change Background Theme">
                      <i class="fas fa-palette"></i>
                  </button>
                  <button (click)="closeCharacterEditor()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition">
                      Done
                  </button>
              </div>
          </div>

          <div class="flex-grow flex flex-col lg:flex-row overflow-hidden">
              <!-- 3D Preview Area -->
              <div class="flex-grow relative" [class.bg-[#111213]]="editorTheme() === 'dark'" [class.bg-gray-200]="editorTheme() === 'light'" [class.bg-blue-900]="editorTheme() === 'blue'">
                  <div class="absolute inset-0 flex items-center justify-center">
                       <div #editorContainer class="w-full h-full cursor-grab active:cursor-grabbing"></div>
                  </div>
                  
                  <!-- Controls Overlay -->
                  <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                      <div class="text-white text-xs font-bold flex items-center gap-2">
                          <i class="fas fa-arrows-alt-h"></i> DRAG TO ROTATE
                      </div>
                  </div>
              </div>

              <!-- Customization Sidebar -->
              <div class="w-full lg:w-96 bg-[#1a1c1e] border-l border-white/5 flex flex-col">
                  <div class="p-4 border-b border-white/5">
                      <h3 class="text-white font-bold mb-1">Wardrobe</h3>
                      <p class="text-gray-500 text-xs">Select items to equip</p>
                  </div>
                  
                  <div class="flex-grow overflow-y-auto p-4">
                      <div class="grid grid-cols-3 gap-3">
                        @for (item of dataService.ITEMS; track item.id) {
                           @if (dataService.hasItem(item.id)) {
                               <div 
                                 (click)="equip(item.id, item.type)"
                                 class="group relative bg-[#232527] rounded-xl p-2 cursor-pointer border-2 transition-all hover:shadow-lg"
                                 [class.border-blue-500]="dataService.user().avatar.clothes === item.id || dataService.user().avatar.face === item.id || dataService.user().avatar.accessories?.includes(item.id)"
                                 [class.border-transparent]="dataService.user().avatar.clothes !== item.id && dataService.user().avatar.face !== item.id && !dataService.user().avatar.accessories?.includes(item.id)"
                               >
                                 <div class="aspect-square bg-[#111213] rounded-lg mb-2 overflow-hidden flex items-center justify-center relative">
                                     @if (item.type === 'clothes') {
                                        <div class="w-10 h-10 rounded shadow-lg" [style.background-color]="'#' + item.color?.toString(16)?.padStart(6, '0')"></div>
                                     } @else if (item.id === 'hat_defender') {
                                        <i class="fas fa-hard-hat text-2xl text-[#4caf50]"></i>
                                     } @else if (item.id === 'wings_spring') {
                                        <i class="fas fa-feather-alt text-2xl text-pink-400"></i>
                                     }
                                 </div>
                                 <div class="font-bold text-white text-xs truncate">{{ item.name }}</div>
                               </div>
                           }
                        }
                      </div>
                  </div>
              </div>
          </div>
      </div>
  }

<!-- GAME VIEW (NO UI CHROME) -->
@if (currentView() === 'GAME') {
  <!-- GAME CANVAS LAYER -->
  <div 
    class="fixed inset-0 z-0 touch-none"
    (touchstart)="handleTouchLookStart($event)"
    (touchmove)="handleTouchLookMove($event)"
    (touchend)="handleTouchLookEnd($event)"
  >
    <div #gameContainer class="w-full h-full"></div>
  </div>
  
  <!-- MOBILE CONTROLS (Only visible on small/touch screens) -->
  <div class="lg:hidden fixed inset-0 z-30 pointer-events-none select-none">
      
      <!-- JOYSTICK ZONE (Left Bottom) -->
      <div 
        #joystickZone
        class="absolute bottom-12 left-12 w-36 h-36 bg-black/20 rounded-full backdrop-blur-md border-2 border-white/10 pointer-events-auto touch-none flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)]"
        (touchstart)="handleJoystickStart($event)"
        (touchmove)="handleJoystickMove($event)"
        (touchend)="handleJoystickEnd($event)"
      >
          <!-- Joystick Knob -->
          <div 
            class="w-16 h-16 bg-white/90 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-transform duration-75 ease-out"
            [style.transform]="joystickTransform()"
          ></div>
      </div>

      <!-- JUMP BUTTON (Right Bottom) -->
      <div 
        class="jump-btn absolute bottom-16 right-12 w-28 h-28 bg-black/20 rounded-full backdrop-blur-md border-2 border-white/10 pointer-events-auto touch-none active:bg-white/30 active:scale-90 transition-all duration-150 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)]"
        (touchstart)="handleMobileJump($event)"
      >
          <div class="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
             <i class="fas fa-arrow-up text-white text-4xl drop-shadow-lg"></i>
          </div>
      </div>
  </div>
  
  <!-- LOADING OVERLAY -->
  @if (isLoading()) {
      <div class="fixed inset-0 z-[200] bg-gradient-to-b from-[#2a2c2e] to-[#111213] flex flex-col items-center justify-center p-8 select-none">
          <!-- Roblox Style Rotating Logo -->
          <div class="relative w-24 h-24 mb-16 animate-[spin_3s_linear_infinite]">
              <!-- Tilted inner container to maintain Roblox logo shape while spinning -->
              <div class="absolute inset-0 bg-white/5 rounded-2xl rotate-12 blur-lg transform scale-125"></div>
              <div class="relative w-full h-full bg-[#1e2022] border-[6px] border-white/80 rounded-2xl rotate-12 flex items-center justify-center shadow-2xl">
                  <div class="w-8 h-8 bg-white/90 rounded-sm"></div>
              </div>
          </div>
          
          <h2 class="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-lg">{{ loadingStatus() }}</h2>
          
          <!-- Progress Bar Container -->
          <div class="w-full max-w-sm h-1.5 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 mb-8">
              <div class="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out" [style.width.%]="loadingProgress()"></div>
          </div>
          
          <!-- Cycling Tips (Simple static for now) -->
          <div class="text-gray-500 text-xs font-medium tracking-wide animate-pulse">
              TIPS: JUMP TO CLIMB OBSTACLES FASTER
          </div>
          
          <div class="absolute bottom-8 right-8 flex items-center gap-2 opacity-30">
             <div class="w-6 h-6 rounded bg-white"></div>
             <span class="font-black text-xl text-white italic">ROBLOX <span class="text-blue-400">NEXT</span></span>
          </div>
      </div>
  }

  <!-- GAME HUD -->
  <div class="fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000" [class.opacity-0]="isLoading()">
     
     <!-- Top Bar (Menu & Chat Icons) -->
     <div class="absolute top-5 left-5 pointer-events-auto flex gap-3">
        <!-- Menu Icon -->
        <button (click)="toggleGameMenu()" class="w-10 h-10 bg-[#393b3d]/90 hover:bg-gray-600 rounded-lg flex items-center justify-center transition shadow-md border border-white/10">
           <div class="w-6 h-6 bg-white/90 mask-logo rounded-sm flex items-center justify-center">
               <div class="w-2.5 h-2.5 bg-[#393b3d] rotate-12 transform scale-75 border-2 border-[#393b3d]"></div>
           </div>
        </button>

        <!-- Chat Icon -->
        <button (click)="toggleChat()" class="w-10 h-10 bg-[#393b3d]/90 hover:bg-gray-600 rounded-lg flex items-center justify-center transition shadow-md relative border border-white/10">
           <i class="fas fa-comment-dots text-white text-lg"></i>
           <!-- Red Notification Badge -->
           @if (unreadMessagesCount() > 0 && !isChatVisible()) {
               <div class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[#232527] shadow-sm animate-bounce">
                   {{ unreadMessagesCount() }}
               </div>
           }
        </button>
     </div>
     
     <!-- Checkpoint Msg -->
     @if (showCheckpoint()) {
       <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-xl text-xl font-bold animate-bounce shadow-lg">
         CHECKPOINT
       </div>
     }

     <!-- Chat System -->
     @if (isChatVisible()) {
        <div class="absolute top-20 left-5 w-80 flex flex-col pointer-events-auto animate-in fade-in slide-in-from-left-5 duration-200">
            <!-- Chat Header -->
            <div class="bg-[#1a1c1e]/90 backdrop-blur-md rounded-t-lg p-2 flex justify-between items-center border-b border-white/5">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wide ml-2">Chat</span>
                <button (click)="toggleChat()" class="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>

            <!-- Messages -->
            <div class="bg-[#1a1c1e]/80 backdrop-blur-sm p-3 h-48 overflow-y-auto flex flex-col gap-1.5 shadow-lg scrollbar-hide border-x border-white/5">
                @for (msg of chatMessages(); track $index) {
                    <div [class.text-yellow-400]="msg.system" [class.font-bold]="msg.system" class="text-white text-sm break-words leading-tight drop-shadow-sm">
                    @if (!msg.system) {
                        <span class="font-bold text-blue-400 drop-shadow-sm">[{{ msg.author }}]:</span>
                    }
                    <span class="text-gray-100">{{ msg.text }}</span>
                    </div>
                }
            </div>
            <!-- Input -->
            <div class="bg-[#1a1c1e]/90 p-2 rounded-b-lg flex gap-2 border-t border-white/5">
                <input 
                type="text" 
                [(ngModel)]="chatInput" 
                (keydown.enter)="sendMessage()"
                (focus)="onChatFocus()"
                (blur)="onChatBlur()"
                placeholder="Tap here to chat..." 
                class="w-full bg-black/40 text-white text-sm px-3 py-2 rounded border border-white/10 focus:border-white/30 focus:outline-none placeholder-gray-500 transition-colors"
                >
            </div>
        </div>
     }
  </div>

  <!-- VICTORY OVERLAY -->
  @if (isVictory()) {
     <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
         <div class="bg-[#232527] p-10 rounded-2xl border border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
             <i class="fas fa-trophy text-6xl text-yellow-400 mb-6 drop-shadow-lg"></i>
             <h2 class="text-4xl font-black text-white mb-2 uppercase italic tracking-wider">Victory!</h2>
             <p class="text-gray-400 mb-8">You completed the Mega Rainbow Obby.</p>
             
             <div class="flex flex-col gap-3">
                 <button (click)="replay()" class="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg">
                    Replay
                 </button>
                 <button (click)="exitGame()" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition">
                    Exit to Menu
                 </button>
             </div>
         </div>
     </div>
  }

  <!-- ROBLOX STYLE GAME MENU OVERLAY -->
  @if (isMenuOpen()) {
      <div class="fixed inset-0 bg-[#111111]/80 backdrop-blur-sm z-[90] flex items-center justify-center p-6 pointer-events-auto">
         <div class="bg-[#2a2c2e] w-full max-w-3xl h-[600px] rounded-2xl flex overflow-hidden shadow-2xl border border-white/5">
             <!-- Sidebar -->
             <div class="w-20 bg-[#232527] flex flex-col items-center py-6 gap-6 border-r border-white/5">
                 <button (click)="toggleGameMenu()" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                     <i class="fas fa-times"></i>
                 </button>
                 
                 <button (click)="setMenuTab('PLAYERS')" [class.bg-white-20]="activeMenuTab() === 'PLAYERS'" [class.text-white]="activeMenuTab() === 'PLAYERS'" class="w-10 h-10 rounded-lg hover:bg-white/10 text-white/50 transition flex items-center justify-center">
                     <i class="fas fa-user-friends text-xl"></i>
                 </button>
                 
                 <button (click)="setMenuTab('SETTINGS')" [class.bg-white-20]="activeMenuTab() === 'SETTINGS'" [class.text-white]="activeMenuTab() === 'SETTINGS'" class="w-10 h-10 rounded-lg hover:bg-white/10 text-white/50 transition flex items-center justify-center">
                     <i class="fas fa-cog text-xl"></i>
                 </button>
                 
                 <div class="mt-auto text-[10px] text-gray-600 font-mono font-bold mb-2">v0.3B</div>
             </div>

             <!-- Content -->
             <div class="flex-grow p-8 flex flex-col">
                 <div class="flex justify-between items-center mb-8">
                     <div class="flex items-center gap-4">
                         <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">R</div>
                         <div>
                             <h2 class="text-2xl font-bold text-white">Mega Rainbow Obby</h2>
                             <div class="text-gray-400 text-sm">By RobluxOfficial</div>
                         </div>
                     </div>
                 </div>

                 <!-- PLAYERS TAB -->
                 @if (activeMenuTab() === 'PLAYERS') {
                    <div class="bg-[#1a1c1e] rounded-xl flex-grow overflow-hidden mb-6">
                         <div class="bg-[#232527] px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider flex">
                             <span class="w-1/2">Player</span>
                             <span class="w-1/2">Level</span>
                         </div>
                         <div class="p-2">
                             <div class="flex items-center px-4 py-3 hover:bg-white/5 rounded-lg transition">
                                 <div class="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 mr-3"></div>
                                 <span class="text-white font-bold w-1/2">{{ hudUser().username }}</span>
                                 <span class="text-gray-400 w-1/2">0</span>
                             </div>
                             @for (remote of firebaseService.otherPlayers() | keyvalue; track remote.key) {
                                @if (remote.value.username) {
                                    <div class="flex items-center px-4 py-3 hover:bg-white/5 rounded-lg transition">
                                         <div class="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
                                         <span class="text-white font-bold w-1/2">{{ remote.value.username }}</span>
                                         <span class="text-gray-400 w-1/2">0</span>
                                    </div>
                                }
                             }
                         </div>
                    </div>
                 }
                 
                 <!-- SETTINGS TAB -->
                 @if (activeMenuTab() === 'SETTINGS') {
                    <div class="bg-[#1a1c1e] rounded-xl flex-grow overflow-y-auto mb-6 p-6">
                        
                        <!-- Camera Mode -->
                        <div class="mb-6 border-b border-white/10 pb-2">
                             <h3 class="text-xl font-bold">Camera View</h3>
                        </div>

                        <div class="flex gap-4 mb-8">
                            <button (click)="setCameraMode('first')" [class.border-blue-500]="currentCameraMode() === 'first'" class="flex-1 bg-[#232527] p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:bg-white/5 transition">
                                <i class="fas fa-eye text-2xl" [class.text-blue-500]="currentCameraMode() === 'first'"></i>
                                <span class="font-bold">First Person</span>
                            </button>
                            
                            <button (click)="setCameraMode('third')" [class.border-blue-500]="currentCameraMode() === 'third'" class="flex-1 bg-[#232527] p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:bg-white/5 transition">
                                <i class="fas fa-user text-2xl" [class.text-blue-500]="currentCameraMode() === 'third'"></i>
                                <span class="font-bold">Third Person</span>
                            </button>
                        </div>

                        <!-- Graphics -->
                        <div class="mb-6 border-b border-white/10 pb-2">
                             <h3 class="text-xl font-bold">Graphics Quality</h3>
                        </div>
                        
                        <div class="flex flex-col gap-4">
                            <button (click)="setGraphics('low')" [class.border-blue-500]="currentGraphics() === 'low'" class="bg-[#232527] p-4 rounded-lg flex justify-between items-center border-2 border-transparent hover:bg-white/5 transition">
                                <div>
                                    <div class="font-bold">Low Mode</div>
                                    <div class="text-xs text-gray-400">Best performance. No shadows, lower resolution.</div>
                                </div>
                                @if (currentGraphics() === 'low') { <i class="fas fa-check-circle text-blue-500 text-xl"></i> }
                            </button>
                            
                            <button (click)="setGraphics('medium')" [class.border-blue-500]="currentGraphics() === 'medium'" class="bg-[#232527] p-4 rounded-lg flex justify-between items-center border-2 border-transparent hover:bg-white/5 transition">
                                <div>
                                    <div class="font-bold">Medium</div>
                                    <div class="text-xs text-gray-400">Balanced. Standard resolution, no shadows.</div>
                                </div>
                                @if (currentGraphics() === 'medium') { <i class="fas fa-check-circle text-blue-500 text-xl"></i> }
                            </button>

                            <button (click)="setGraphics('high')" [class.border-blue-500]="currentGraphics() === 'high'" class="bg-[#232527] p-4 rounded-lg flex justify-between items-center border-2 border-transparent hover:bg-white/5 transition">
                                <div>
                                    <div class="font-bold">High (Default)</div>
                                    <div class="text-xs text-gray-400">Full quality. Shadows enabled, max resolution.</div>
                                </div>
                                @if (currentGraphics() === 'high') { <i class="fas fa-check-circle text-blue-500 text-xl"></i> }
                            </button>
                        </div>
                    </div>
                 }

                 <!-- Actions -->
                 <div class="flex justify-end gap-4 mt-auto">
                     <button (click)="resetCharacter()" class="px-6 py-3 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10 transition flex items-center gap-2">
                         <i class="fas fa-skull"></i> Reset Character
                     </button>
                     <button (click)="exitGame()" class="px-6 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-lg flex items-center gap-2">
                         <i class="fas fa-sign-out-alt"></i> Leave Game
                     </button>
                 </div>
             </div>
         </div>
      </div>
  }
}

<!-- GAME DETAILS PAGE (MODAL) -->
@if (showGameModal()) {
  <div class="fixed inset-0 bg-[#111111]/95 z-[100] flex justify-center overflow-y-auto">
    <div class="w-full max-w-[1000px] p-6 pt-10 animate-in fade-in slide-in-from-bottom-5 duration-300">
        
        <!-- Header -->
        <div class="flex justify-between items-start mb-6">
            <div>
                 <h1 class="text-4xl font-extrabold text-white mb-2">Mega Rainbow Obby</h1>
                 <div class="text-gray-400 font-medium">By <span class="text-white hover:underline cursor-pointer">RobluxOfficial</span></div>
            </div>
            <button (click)="closeGameModal()" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
               <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <!-- Main Content -->
        <div class="flex flex-col md:flex-row gap-8">
            <!-- Left Column: Media & Description -->
            <div class="flex-grow space-y-6">
                <!-- Thumbnail -->
                <div class="w-full aspect-video bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500 rounded-xl relative shadow-2xl overflow-hidden group">
                     <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                     <!-- Play Icon Overlay -->
                     <div class="absolute bottom-4 left-4">
                         <div class="bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm">VIDEO 0:30</div>
                     </div>
                </div>

                <!-- Description -->
                <div class="bg-[#1a1c1e] p-6 rounded-xl border border-white/5">
                    <h3 class="font-bold text-lg mb-4 text-white">Description</h3>
                    <p class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
Welcome to Mega Rainbow Obby! 🌈 
Jump through 50+ stages of colorful fun!

🏆 Reach the end to win a badge!
💾 Progress Auto-Saves!
✨ Premium benefits: +2 Speed

Tags: Obby, Parkour, Fun, Rainbow, Mega, Easy, Platformer.
                    </p>
                </div>
            </div>

            <!-- Right Column: Stats & Actions -->
            <div class="w-full md:w-[350px] space-y-6">
                 <!-- Play Button -->
                 <button (click)="playGame()" class="w-full bg-[#00b06f] hover:bg-[#009e63] py-4 rounded-xl font-black text-2xl text-white shadow-[0_4px_0_#008253] active:translate-y-1 active:shadow-none transition flex items-center justify-center gap-3">
                     <div class="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center"><i class="fas fa-play"></i></div>
                     Play
                 </button>

                 <!-- Stats Grid -->
                 <div class="grid grid-cols-3 gap-y-6 gap-x-2 py-4 border-b border-white/10">
                     <div class="text-center group cursor-help" title="Players Online">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Active</div>
                         <div class="text-white font-bold text-lg">{{ onlineCount() }}</div>
                     </div>
                     <div class="text-center">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Visits</div>
                         <div class="text-white font-bold text-lg" title="{{ gameStats().visits }}">{{ gameStats().visits | number:'1.0-0' }}</div>
                     </div>
                     <div class="text-center">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Created</div>
                         <div class="text-white font-bold text-lg">2/15/2026</div>
                     </div>
                     <div class="text-center">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Updated</div>
                         <div class="text-white font-bold text-lg">Today</div>
                     </div>
                     <div class="text-center">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Server Size</div>
                         <div class="text-white font-bold text-lg">50</div>
                     </div>
                     <div class="text-center">
                         <div class="text-gray-400 text-xs font-bold uppercase mb-1">Genre</div>
                         <div class="text-white font-bold text-lg">Adventure</div>
                     </div>
                 </div>

                 <!-- Like / Dislike -->
                 <div>
                     <div class="flex justify-between items-end mb-2">
                         <div class="flex items-center gap-2">
                             <button (click)="vote('like')" [disabled]="hasVoted()" class="text-gray-400 hover:text-green-500 transition disabled:opacity-50">
                                 <i class="fas fa-thumbs-up text-xl"></i>
                             </button>
                             <span class="text-sm font-bold text-white">{{ gameStats().likes }}</span>
                         </div>
                         <div class="flex items-center gap-2">
                             <span class="text-sm font-bold text-white">{{ gameStats().dislikes }}</span>
                             <button (click)="vote('dislike')" [disabled]="hasVoted()" class="text-gray-400 hover:text-red-500 transition disabled:opacity-50">
                                 <i class="fas fa-thumbs-down text-xl"></i>
                             </button>
                         </div>
                     </div>
                     <!-- Progress Bar -->
                     <div class="h-2 w-full bg-gray-700 rounded-full overflow-hidden flex">
                         <div class="h-full bg-green-500" [style.width.%]="ratingPercentage()"></div>
                         <div class="h-full bg-gray-700 flex-grow"></div>
                     </div>
                     <div class="flex justify-between mt-1 text-xs text-gray-500 font-bold">
                         <span>Rate this game!</span>
                         <span>{{ ratingPercentage() }}% Approval</span>
                     </div>
                 </div>
            </div>
        </div>
    </div>
  </div>
}
`
})
export class AppComponent implements OnDestroy {
  // Services
  dataService = inject(DataService);
  threeGame = inject(ThreeGameService);
  threeProfile = inject(ThreeProfileService);
  audioService = inject(AudioService);
  firebaseService = inject(FirebaseService);
  cdr = inject(ChangeDetectorRef);

  // View State
  currentView = signal<View>('LOGIN');
  showGameModal = signal(false);
  isMenuOpen = signal(false);
  activeMenuTab = signal<MenuTab>('PLAYERS');
  
  // Game State Proxies (Signals from ThreeGameService)
  isLoading = this.threeGame.isLoading;
  loadingProgress = this.threeGame.loadingProgress;
  loadingStatus = this.threeGame.loadingStatus;
  isVictory = this.threeGame.isVictory;
  showCheckpoint = this.threeGame.showCheckpointMsg;

  // Chat
  isChatVisible = signal(false);
  chatInput = '';
  chatMessages = this.firebaseService.chatMessages;
  unreadMessagesCount = signal(0);
  private lastMsgCount = 0;
  private lastMessageTime = 0;
  
  // Profile
  isEditingProfile = signal(false);
  isCharacterEditorOpen = signal(false); // New Editor Mode
  editorTheme = signal('dark'); // 'dark' | 'light' | 'blue'
  editName = '';
  editDesc = '';

  // Discovery
  gameStats = this.firebaseService.gameStats;
  hasVoted = signal(false);
  searchQuery = signal('');

  matchesSearch(title: string, tags: string): boolean {
      const q = this.searchQuery().toLowerCase().trim();
      if (!q) return true;
      return title.toLowerCase().includes(q) || tags.toLowerCase().includes(q);
  }

  // References
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  @ViewChild('profileContainer') profileContainer!: ElementRef;
  @ViewChild('editorContainer') editorContainer!: ElementRef; // For the big editor
  @ViewChild('joystickZone') joystickZone!: ElementRef;

  // Computed
  onlineCount = this.firebaseService.onlineCount;
  
  ratingPercentage = computed(() => {
    const s = this.gameStats();
    const total = (s.likes || 0) + (s.dislikes || 0);
    if (total === 0) return 100;
    return Math.round((s.likes / total) * 100);
  });

  currentCameraMode = signal<'first' | 'third'>('third');
  currentGraphics = signal<'low' | 'medium' | 'high'>('high');

  // Helpers
  hudUser = this.dataService.user;

  // Mobile Input
  joystickActive = false;
  joystickStartPos = { x: 0, y: 0 };
  joystickCurrentPos = { x: 0, y: 0 };
  joystickTransform = signal('translate(0px, 0px)');

  // Touch Look State
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lookTouchId: number | null = null;
  
    constructor() {
        effect(() => {
            // Chat listener
            const msgs = this.chatMessages();
            // Only increment if we have NEW messages and chat is closed
            if (msgs.length > this.lastMsgCount) {
                if (!this.isChatVisible()) {
                    this.unreadMessagesCount.update(c => c + (msgs.length - this.lastMsgCount));
                }
                this.lastMsgCount = msgs.length;
            }
        }, { allowSignalWrites: true });

        // Auto-Login Check
        const u = this.dataService.user();
        if (u.username && u.username !== 'Guest') {
            this.currentView.set('DISCOVERY');
        }
    }

  buyItem(id: string) {
      this.dataService.buyItem(id);
  }

  onLoginSuccess() {
      console.log('EVENT RECEIVED: onLoginSuccess in AppComponent');
      this.currentView.set('DISCOVERY');
      this.cdr.detectChanges();
  }

  navTo(view: View) {
    if (this.currentView() === 'GAME') return; // Must exit game first
    this.currentView.set(view);
    this.isCharacterEditorOpen.set(false); // Reset editor
    
    if (view === 'PROFILE') {
        setTimeout(() => this.initProfilePreview(), 100);
    } else {
        this.threeProfile.cleanup();
    }
  }

  initProfilePreview() {
      if (this.profileContainer) {
          this.threeProfile.cleanup();
          this.threeProfile.init(this.profileContainer.nativeElement);
      }
  }
  
  initEditorPreview() {
      if (this.editorContainer) {
          // Re-use the same service, just re-init in new container
          this.threeProfile.cleanup();
          this.threeProfile.init(this.editorContainer.nativeElement);
      }
  }

  // --- Game Modal & Launch ---
  
  openGameModal(id: string) {
      this.showGameModal.set(true);
  }

  closeGameModal() {
      this.showGameModal.set(false);
  }

  async playGame() {
      this.closeGameModal();
      this.currentView.set('GAME');
      
      // Init Game
      setTimeout(() => {
          if (this.gameContainer) {
              this.threeGame.init(this.gameContainer.nativeElement);
              this.threeGame.loadLevel();
              this.threeGame.isPlaying.set(true); // Enable logic
              this.firebaseService.joinGame(this.dataService.user(), this.dataService.getItem(this.dataService.user().avatar.clothes)?.color);
          }
      }, 100);
      
      this.threeGame.requestPointerLock();
  }

  exitGame() {
      this.threeGame.cleanup();
      this.firebaseService.leaveGame();
      this.threeGame.isPlaying.set(false);
      this.isVictory.set(false);
      this.isMenuOpen.set(false);
      this.currentView.set('DISCOVERY');
      this.threeGame.exitPointerLock();
  }
  
  replay() {
      this.threeGame.resetCharacter();
      this.isVictory.set(false);
      this.threeGame.requestPointerLock();
  }

  // --- Profile Logic ---
  toggleEditProfile() {
      if (this.isEditingProfile()) {
          // Save
          this.dataService.updateProfile(this.editName, this.editDesc);
          this.isEditingProfile.set(false);
      } else {
          // Start Edit
          this.editName = this.dataService.user().username;
          this.editDesc = this.dataService.user().description;
          this.isEditingProfile.set(true);
      }
  }
  
  openCharacterEditor() {
      this.isCharacterEditorOpen.set(true);
      setTimeout(() => this.initEditorPreview(), 100);
  }
  
  closeCharacterEditor() {
      this.isCharacterEditorOpen.set(false);
      // Re-init small preview
      setTimeout(() => this.initProfilePreview(), 100);
  }
  
  toggleEditorTheme() {
      const themes = ['dark', 'light', 'blue'];
      const idx = themes.indexOf(this.editorTheme());
      this.editorTheme.set(themes[(idx + 1) % themes.length]);
  }

  equip(itemId: string, type: 'face' | 'clothes' | 'accessory') {
      this.dataService.equipItem(itemId, type);
      this.threeProfile.updateAppearance();
  }

  // --- In-Game Menu & HUD ---

  toggleGameMenu() {
      this.isMenuOpen.update(v => !v);
      if (this.isMenuOpen()) {
          this.threeGame.exitPointerLock();
      } else {
          this.threeGame.requestPointerLock();
      }
  }

  setMenuTab(tab: MenuTab) {
      this.activeMenuTab.set(tab);
  }

  toggleChat() {
      this.isChatVisible.update(v => !v);
      if (this.isChatVisible()) {
          this.unreadMessagesCount.set(0);
      }
  }

  sendMessage() {
      if (!this.chatInput.trim()) return;
      
      const now = Date.now();
      if (now - this.lastMessageTime < 1500) {
          // Spam protection: wait 1.5 seconds between messages
          // Optional: Add a local "slow down" system message temporarily
          return;
      }
      this.lastMessageTime = now;

      this.firebaseService.sendMessage(this.dataService.user().username, this.chatInput);
      
      // Show bubble locally immediately for responsiveness
      this.threeGame.showChatBubble(this.dataService.user().username, this.chatInput);
      
      this.chatInput = '';
  }

  onChatFocus() {
      // Logic for typing state can go here
      // Release pointer lock when typing
      if (document.pointerLockElement === document.body) {
          document.exitPointerLock();
      }
  }
  
  onChatBlur() {
      if (!this.isMenuOpen() && !this.joystickActive) {
          this.threeGame.requestPointerLock();
      }
  }

  vote(type: 'like' | 'dislike') {
      if (this.hasVoted()) return;
      this.firebaseService.voteGame(type);
      this.hasVoted.set(true);
  }

  // --- Settings ---
  setCameraMode(mode: 'first' | 'third') {
      this.currentCameraMode.set(mode);
      this.threeGame.setCameraMode(mode);
  }

  setGraphics(level: 'low' | 'medium' | 'high') {
      this.currentGraphics.set(level);
      this.threeGame.setGraphicsQuality(level);
  }
  
  resetCharacter() {
      this.threeGame.resetCharacter();
      this.toggleGameMenu();
  }

  // --- Mobile Controls ---

  handleTouchLookStart(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      // If touch is on the right half of the screen and we don't have a look touch yet
      // AND it's not starting on the jump button
      const target = t.target as HTMLElement;
      if (t.clientX > window.innerWidth / 2 && this.lookTouchId === null && (!target || !target.closest('.jump-btn'))) {
        this.lookTouchId = t.identifier;
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
        break; 
      }
    }
  }

  handleTouchLookMove(e: TouchEvent) {
    if (this.lookTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.lookTouchId) {
        const deltaX = t.clientX - this.lastTouchX;
        const deltaY = t.clientY - this.lastTouchY;
        
        this.threeGame.updateMobileLook(deltaX, deltaY);
        
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
        break;
      }
    }
  }

  handleTouchLookEnd(e: TouchEvent) {
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
              this.lookTouchId = null;
          }
      }
  }

  handleJoystickStart(e: TouchEvent) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickActive = true;
      this.joystickStartPos = { x: touch.clientX, y: touch.clientY };
      this.joystickCurrentPos = { ...this.joystickStartPos };
      this.updateJoystickVisual();
  }

  handleJoystickMove(e: TouchEvent) {
      e.preventDefault();
      if (!this.joystickActive) return;
      const touch = e.changedTouches[0];
      this.joystickCurrentPos = { x: touch.clientX, y: touch.clientY };
      this.updateJoystickVisual();
  }

  handleJoystickEnd(e: TouchEvent) {
      e.preventDefault();
      this.joystickActive = false;
      this.joystickTransform.set(`translate(0px, 0px)`);
      this.threeGame.updateMobileJoystick(0, 0);
  }

  updateJoystickVisual() {
      // Calculate delta
      let dx = this.joystickCurrentPos.x - this.joystickStartPos.x;
      let dy = this.joystickCurrentPos.y - this.joystickStartPos.y;
      
      // Clamp magnitude
      const maxDist = 40;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
      }
      
      // Update visual
      this.joystickTransform.set(`translate(${dx}px, ${dy}px)`);
      
      // Update Game Input (Normalized -1 to 1)
      this.threeGame.updateMobileJoystick(dx / maxDist, -(dy / maxDist)); // Invert Y for standard forward
  }

  handleMobileJump(e: TouchEvent) {
      e.preventDefault();
      this.threeGame.doJump();
  }
  
  ngOnDestroy() {
      this.threeGame.cleanup();
      this.threeProfile.cleanup();
  }
}
