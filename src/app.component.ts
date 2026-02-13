import { Component, computed, signal, effect, ViewChild, ElementRef, OnDestroy, untracked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login.component';
import { ThreeGameService } from './services/three-game.service';
import { ThreeProfileService } from './services/three-profile.service';
import { AudioService } from './services/audio.service';
import { FirebaseService, ChatMessage } from './services/firebase.service';

type View = 'LOGIN' | 'DISCOVERY' | 'PROFILE' | 'GAME';
type MenuTab = 'PLAYERS' | 'SETTINGS';

@Component({
  selector: 'app-root',
  imports: [CommonModule, LoginComponent, FormsModule],
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
        <div class="flex items-center gap-6">
            <button (click)="navTo('DISCOVERY')" [class.text-white]="currentView() === 'DISCOVERY'" [class.text-gray-400]="currentView() !== 'DISCOVERY'" class="font-bold text-sm hover:text-white flex items-center gap-2 transition-colors">
            <i class="fas fa-gamepad text-lg"></i> Games
            </button>
            <button (click)="navTo('PROFILE')" [class.text-white]="currentView() === 'PROFILE'" [class.text-gray-400]="currentView() !== 'PROFILE'" class="font-bold text-sm hover:text-white flex items-center gap-2 transition-colors">
            <i class="fas fa-user text-lg"></i> Profile
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
      <h1 class="text-2xl font-black text-white mb-6 flex items-center gap-3"><i class="fas fa-fire text-orange-500"></i> Popular Experiences</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Card 1: Rainbow Obby -->
        <div (click)="openGameModal('rainbow')" class="bg-[#232527] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-2xl transition border border-white/5 group">
          <div class="h-40 bg-gradient-to-br from-pink-500 via-yellow-400 to-blue-400 relative overflow-hidden">
             <!-- Shine effect -->
            <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <span class="absolute top-3 left-3 bg-black/70 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10 flex items-center gap-1">
                <i class="fas fa-fire text-orange-500 text-[10px]"></i> TRENDING
            </span>
          </div>
          <div class="p-4">
            <h3 class="text-xl font-bold mb-2 text-white leading-tight">Mega Rainbow Obby</h3>
            <div class="flex items-center gap-4 text-xs font-bold text-gray-400">
              <span class="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded">
                  <i class="fas fa-thumbs-up"></i> {{ ratingPercentage() }}%
              </span>
              <span class="flex items-center gap-1">
                  <i class="fas fa-user"></i> {{ onlineCount() }}
              </span>
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
                      <span class="text-blue-500/50 font-mono">v0.2 Beta</span>
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
                           <div 
                             (click)="equip(item.id, item.type)"
                             class="group relative bg-[#232527] rounded-xl p-3 cursor-pointer border-2 transition-all hover:-translate-y-1 hover:shadow-xl"
                             [class.border-blue-500]="dataService.user().avatar.clothes === item.id || dataService.user().avatar.face === item.id"
                             [class.border-transparent]="dataService.user().avatar.clothes !== item.id && dataService.user().avatar.face !== item.id"
                             [class.bg-blue-900-10]="dataService.user().avatar.clothes === item.id"
                           >
                             @if (dataService.user().avatar.clothes === item.id) {
                                 <div class="absolute top-2 right-2 text-blue-500 text-[10px] font-black bg-blue-900/40 px-1.5 py-0.5 rounded backdrop-blur-md"><i class="fas fa-check"></i> EQUIPPED</div>
                             }
                             <div class="aspect-square bg-[#111213] rounded-lg mb-3 overflow-hidden flex items-center justify-center relative shadow-inner">
                                 <!-- Color Preview for Clothes -->
                                 <div class="w-16 h-16 rounded shadow-lg transform group-hover:scale-110 transition" [style.background-color]="'#' + item.color?.toString(16)?.padStart(6, '0')"></div>
                             </div>
                             
                             <div class="font-bold text-white text-sm truncate">{{ item.name }}</div>
                             <div class="text-xs text-gray-500">{{ item.type | titlecase }}</div>
                           </div>
                        }
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  }
}

<!-- GAME VIEW (NO UI CHROME) -->
@if (currentView() === 'GAME') {
  <!-- GAME CANVAS LAYER -->
  <div 
    class="fixed inset-0 z-0 touch-none"
    (touchstart)="handleTouchLookStart($event)"
    (touchmove)="handleTouchLookMove($event)"
  >
    <div #gameContainer class="w-full h-full"></div>
  </div>
  
  <!-- MOBILE CONTROLS (Only visible on small/touch screens) -->
  <div class="lg:hidden fixed inset-0 z-30 pointer-events-none select-none">
      
      <!-- JOYSTICK ZONE (Left Bottom) -->
      <div 
        #joystickZone
        class="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 pointer-events-auto touch-none flex items-center justify-center"
        (touchstart)="handleJoystickStart($event)"
        (touchmove)="handleJoystickMove($event)"
        (touchend)="handleJoystickEnd($event)"
      >
          <!-- Joystick Knob -->
          <div 
            class="w-14 h-14 bg-white/80 rounded-full shadow-lg transition-transform duration-75 ease-out"
            [style.transform]="joystickTransform()"
          ></div>
      </div>

      <!-- JUMP BUTTON (Right Bottom) -->
      <div 
        class="absolute bottom-12 right-10 w-24 h-24 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 pointer-events-auto touch-none active:bg-white/40 active:scale-95 transition flex items-center justify-center"
        (touchstart)="handleMobileJump($event)"
      >
          <div class="w-20 h-20 rounded-full border-2 border-white/50 flex items-center justify-center">
             <i class="fas fa-arrow-up text-white/90 text-3xl"></i>
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
                 
                 <div class="mt-auto text-[10px] text-gray-600 font-mono font-bold mb-2">v0.1B</div>
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
                 <div class="flex justify-end gap-4">
                     <button (click)="resetCharacter()" class="px-6 py-3 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10 transition flex items-center gap-2">
                         <i class="fas fa-skull"></i> Reset Character
                     </button>
                     <button (click)="exitGame()" class="px-6 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-lg flex items-center gap-2">
                         <i class="fas fa-sign-out-alt"></i> Leave
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
  audio = inject(AudioService);
  firebaseService = inject(FirebaseService);

  // View State
  currentView = signal<View>('LOGIN');
  showGameModal = signal(false);
  
  // Game Menu State
  isMenuOpen = signal(false);
  activeMenuTab = signal<MenuTab>('PLAYERS');
  
  // Chat State
  isChatVisible = signal(false);
  chatInput = '';
  // Derived chat state
  chatMessages = this.firebaseService.chatMessages;
  unreadMessagesCount = signal(0);
  
  // Profile State
  isEditingProfile = signal(false);
  editName = '';
  editDesc = '';

  // Game Stats (from Firebase)
  onlineCount = this.firebaseService.onlineCount;
  gameStats = this.firebaseService.gameStats;
  ratingPercentage = computed(() => {
    const s = this.gameStats();
    const total = (s.likes || 0) + (s.dislikes || 0);
    if (total === 0) return 100;
    return Math.round((s.likes / total) * 100);
  });
  hasVoted = signal(false);

  // ThreeJS Containers
  @ViewChild('profileContainer') profileContainer?: ElementRef;
  @ViewChild('gameContainer') gameContainer?: ElementRef;
  
  // Mobile Input
  joystickTransform = signal('translate(0px, 0px)');
  private joystickActive = false;
  private joystickOrigin = { x: 0, y: 0 };

  // Game State Proxy (to use in template)
  isLoading = this.threeGame.isLoading;
  loadingProgress = this.threeGame.loadingProgress;
  loadingStatus = this.threeGame.loadingStatus;
  isVictory = this.threeGame.isVictory;
  showCheckpoint = this.threeGame.showCheckpointMsg;

  // Settings Proxy
  currentGraphics = signal<'low'|'medium'|'high'>('high');
  currentCameraMode = signal<'first'|'third'>('third');

  // Helper for template
  hudUser = this.dataService.user;

  constructor() {
    // Effect to handle unread messages
    effect(() => {
        const msgs = this.chatMessages();
        if (!this.isChatVisible() && msgs.length > 0) {
            // Simple increment if new message comes in and chat is closed
            untracked(() => {
                 // Logic to detect NEW messages only would require storing last read count
                 // For simplicity, just showing a count if not visible
                 this.unreadMessagesCount.update(c => c + 1);
            });
        }
    });

    // Effect to initialize Profile 3D view when container becomes available
    effect(() => {
        if (this.currentView() === 'PROFILE' && this.profileContainer) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => {
                if (this.profileContainer) {
                   this.threeProfile.init(this.profileContainer.nativeElement);
                }
            }, 100);
        } else {
            this.threeProfile.cleanup();
        }
    });
  }

  ngOnDestroy() {
      this.threeGame.cleanup();
      this.threeProfile.cleanup();
      this.firebaseService.leaveGame();
  }

  onLoginSuccess() {
    this.currentView.set('DISCOVERY');
  }

  navTo(view: View) {
    if (this.currentView() === 'GAME') {
        // If leaving game, cleanup
        this.exitGame();
    }
    this.currentView.set(view);
    
    // Reset Profile Edit state
    this.isEditingProfile.set(false);
  }

  // --- Profile Logic ---
  toggleEditProfile() {
      if (this.isEditingProfile()) {
          // Save
          this.dataService.updateProfile(this.editName, this.editDesc);
          this.isEditingProfile.set(false);
          // Sync with Firebase if needed (FirebaseService could have updateProfile)
          // For now local state + DataService
          const u = this.dataService.user();
          this.firebaseService.saveUserProfile(u);
      } else {
          // Edit
          const u = this.dataService.user();
          this.editName = u.username;
          this.editDesc = u.description;
          this.isEditingProfile.set(true);
      }
  }

  equip(itemId: string, type: 'face' | 'clothes' | 'accessory') {
      this.dataService.equipItem(itemId, type);
      this.threeProfile.updateAppearance();
      
      const u = this.dataService.user();
      this.firebaseService.saveUserProfile(u);
  }

  // --- Game Launcher ---
  openGameModal(id: string) {
      this.showGameModal.set(true);
  }

  closeGameModal() {
      this.showGameModal.set(false);
  }

  async playGame() {
      this.showGameModal.set(false);
      this.currentView.set('GAME');
      
      // Init Game
      setTimeout(() => {
          if (this.gameContainer) {
              this.threeGame.init(this.gameContainer.nativeElement);
              this.threeGame.loadLevel();
              this.threeGame.isPlaying.set(true);
              
              // Join Network
              // Get clothes color from item
              const clothesId = this.dataService.user().avatar.clothes;
              const item = this.dataService.getItem(clothesId);
              this.firebaseService.joinGame(this.dataService.user(), item?.color);
          }
      }, 100);
  }

  exitGame() {
      this.threeGame.cleanup();
      this.threeGame.isPlaying.set(false);
      this.firebaseService.leaveGame();
      this.currentView.set('DISCOVERY');
      this.isMenuOpen.set(false);
      this.isVictory.set(false);
      
      // Unlock cursor
      document.exitPointerLock();
  }

  replay() {
      this.threeGame.loadLevel();
      this.isVictory.set(false);
  }

  // --- In-Game UI ---
  toggleGameMenu() {
      this.isMenuOpen.update(v => !v);
      if (this.isMenuOpen()) {
          this.threeGame.exitPointerLock();
      } else {
          // Resume game focus
          this.threeGame.requestPointerLock();
      }
  }

  setMenuTab(tab: MenuTab) {
      this.activeMenuTab.set(tab);
  }
  
  // Settings
  setGraphics(level: 'low'|'medium'|'high') {
      this.currentGraphics.set(level);
      this.threeGame.setGraphicsQuality(level);
  }

  setCameraMode(mode: 'first'|'third') {
      this.currentCameraMode.set(mode);
      this.threeGame.setCameraMode(mode);
  }

  resetCharacter() {
      this.threeGame.resetCharacter();
      this.isMenuOpen.set(false);
      this.threeGame.requestPointerLock();
  }

  // --- Chat ---
  toggleChat() {
      this.isChatVisible.update(v => !v);
      if (this.isChatVisible()) {
          this.unreadMessagesCount.set(0);
          // Focus input handled by template logic or user click
      }
  }

  sendMessage() {
      if (!this.chatInput.trim()) return;
      this.firebaseService.sendMessage(this.dataService.user().username, this.chatInput);
      
      // Show bubble locally immediately for responsiveness (optional, but good for UX)
      this.threeGame.showChatBubble(this.dataService.user().username, this.chatInput);

      this.chatInput = '';
  }

  onChatFocus() {
      // Maybe disable game controls
  }
  
  onChatBlur() {
      // Re-enable game controls
  }
  
  // --- Voting ---
  vote(type: 'like' | 'dislike') {
      if (this.hasVoted()) return;
      this.firebaseService.voteGame(type);
      this.hasVoted.set(true);
  }

  // --- Mobile Controls ---
  handleJoystickStart(e: TouchEvent) {
      this.joystickActive = true;
      const touch = e.changedTouches[0];
      this.joystickOrigin = { x: touch.clientX, y: touch.clientY };
  }

  handleJoystickMove(e: TouchEvent) {
      if (!this.joystickActive) return;
      const touch = e.changedTouches[0];
      
      const maxDist = 40;
      let dx = touch.clientX - this.joystickOrigin.x;
      let dy = touch.clientY - this.joystickOrigin.y;
      
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
      }
      
      this.joystickTransform.set(`translate(${dx}px, ${dy}px)`);
      
      // Normalize to -1..1
      const nx = dx / maxDist;
      const ny = dy / maxDist; // Up is negative in screen coords, but we want Forward (usually -1)
      
      this.threeGame.updateMobileJoystick(nx, -ny);
  }

  handleJoystickEnd(e: TouchEvent) {
      this.joystickActive = false;
      this.joystickTransform.set(`translate(0px, 0px)`);
      this.threeGame.updateMobileJoystick(0, 0);
  }

  handleMobileJump(e: TouchEvent) {
      this.threeGame.doJump();
  }

  // Mobile Look (Touch anywhere else)
  private lookTouchId: number | null = null;
  private lookOrigin = { x: 0, y: 0 };

  handleTouchLookStart(e: TouchEvent) {
      // Avoid conflict with joystick
      for (let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          // Check if it's on right side or not inside joystick
          // Simple heuristic: if x > windowWidth/2 or not joystick
          if (t.clientX > window.innerWidth / 2) {
              this.lookTouchId = t.identifier;
              this.lookOrigin = { x: t.clientX, y: t.clientY };
              break;
          }
      }
  }

  handleTouchLookMove(e: TouchEvent) {
      if (this.lookTouchId === null) return;
      for (let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.lookTouchId) {
              const dx = t.clientX - this.lookOrigin.x;
              const dy = t.clientY - this.lookOrigin.y;
              
              this.threeGame.updateMobileLook(dx, dy);
              
              this.lookOrigin = { x: t.clientX, y: t.clientY };
              break;
          }
      }
  }
}