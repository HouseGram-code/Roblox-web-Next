
import { Component, computed, signal, effect, ViewChild, ElementRef, OnDestroy, untracked } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule, LoginComponent, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnDestroy {
  currentView = signal<View>('LOGIN');
  selectedGameId: string | null = null;
  
  // Game Hud Signals
  hudUser = this.dataService.user;
  showCheckpoint = this.threeGame.showCheckpointMsg;
  isVictory = this.threeGame.isVictory;
  
  // Loading Signals
  isLoading = this.threeGame.isLoading;
  loadingProgress = this.threeGame.loadingProgress;
  loadingStatus = this.threeGame.loadingStatus;

  isMenuOpen = signal(false);
  activeMenuTab = signal<MenuTab>('PLAYERS');
  currentGraphics = signal('high');
  currentCameraMode = signal<'first'|'third'>('third');

  // Chat State
  isChatVisible = signal(false); 
  unreadMessagesCount = signal(0);
  
  // Connect to Firebase Chat
  chatMessages = this.firebaseService.chatMessages;
  
  // Real-time Game Stats
  onlineCount = this.firebaseService.onlineCount;
  gameStats = this.firebaseService.gameStats;

  // Joystick State
  joystickActive = signal(false);
  joystickTransform = signal('translate(0px, 0px)');
  private joystickStart = { x: 0, y: 0 };
  private touchLookStart = { x: 0, y: 0 };

  // Profile Editing State
  isEditingProfile = signal(false);
  editName = '';
  editDesc = '';

  // Computed Rating %
  ratingPercentage = computed(() => {
      const likes = this.gameStats().likes;
      const dislikes = this.gameStats().dislikes;
      const total = likes + dislikes;
      if (total === 0) return 0;
      return Math.round((likes / total) * 100);
  });
  
  chatInput = '';
  isChatFocused = false;
  private lastProcessedMsgId = '';

  // Modals
  showGameModal = signal(false);
  hasVoted = signal(false); // Local state to prevent spamming
  
  // View References
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  @ViewChild('profileContainer') profileContainer!: ElementRef;
  @ViewChild('joystickZone') joystickZone!: ElementRef;

  constructor(
    public dataService: DataService, 
    private threeGame: ThreeGameService,
    private threeProfile: ThreeProfileService,
    private audioService: AudioService,
    public firebaseService: FirebaseService
  ) {
    // Check for existing session (Auto-Login)
    const savedUser = this.dataService.user();
    if (savedUser.email && savedUser.email.includes('@')) {
        this.currentView.set('DISCOVERY');
    }

    // Effect to handle view changes related to canvas
    effect(() => {
        const view = this.currentView();
        
        // Clean up previous states
        if (view !== 'GAME') {
             this.threeGame.isPlaying.set(false);
             this.threeGame.exitPointerLock();
             this.isMenuOpen.set(false);
        }

        if (view !== 'PROFILE') {
            this.threeProfile.cleanup();
            this.isEditingProfile.set(false);
        }

        // Initialize new states
        setTimeout(() => {
            if (view === 'GAME' && this.gameContainer) {
                // Initialize Game
                this.threeGame.init(this.gameContainer.nativeElement);
                this.threeGame.loadLevel(); 
                this.threeGame.isPlaying.set(true);
                this.threeGame.requestPointerLock();
                
                // Connect to Server
                const user = this.dataService.user();
                const clothesItem = this.dataService.getItem(user.avatar.clothes);
                const color = clothesItem ? clothesItem.color : 0x0088ff;
                this.firebaseService.joinGame(user, color);
            }
            if (view === 'PROFILE' && this.profileContainer) {
                this.threeProfile.init(this.profileContainer.nativeElement);
            }
        });
    });

    // Effect for unread messages
    effect(() => {
        const msgs = this.chatMessages();
        if (msgs.length > 0) {
             const lastMsg = msgs[msgs.length - 1];
             const msgId = lastMsg.timestamp + '_' + lastMsg.author;
             
             // Check if we've already processed this message to prevent duplicates on re-runs
             if (msgId !== this.lastProcessedMsgId) {
                 this.lastProcessedMsgId = msgId;

                 // untrack visibility so toggling chat doesn't trigger this effect again
                 const isVisible = untracked(this.isChatVisible);
                 const isMe = lastMsg.author === this.dataService.user().username;

                 // Update counter if chat is hidden AND message is NOT from me
                 if (!isVisible && !isMe) {
                    this.unreadMessagesCount.update(c => Math.min(c + 1, 99));
                 }
                 
                 // Show 3D Bubble for recent messages (including my own)
                 if (Date.now() - lastMsg.timestamp < 3000) {
                     this.threeGame.showChatBubble(lastMsg.author, lastMsg.text);
                 }
             }
        }
    });

    // Save profile changes to Firebase whenever user changes
    effect(() => {
        const u = this.dataService.user();
        this.firebaseService.saveUserProfile(u);
    });
  }

  onLoginSuccess() {
    this.currentView.set('DISCOVERY');
  }

  navTo(view: View) {
    this.currentView.set(view);
  }

  openGameModal(id: string) {
    this.selectedGameId = id;
    this.showGameModal.set(true);
  }

  closeGameModal() {
    this.showGameModal.set(false);
  }

  playGame() {
    this.threeGame.isLoading.set(true);
    this.threeGame.loadingStatus.set('Initializing...');
    this.threeGame.loadingProgress.set(0);

    this.audioService.unlockAudio(); // Unlock audio context on user gesture
    this.closeGameModal();
    this.currentView.set('GAME');
  }

  toggleGameMenu() {
      if (this.isVictory()) return;
      const newState = !this.isMenuOpen();
      this.isMenuOpen.set(newState);
      if (newState) {
          this.threeGame.exitPointerLock();
          this.activeMenuTab.set('PLAYERS'); 
      } else {
          this.threeGame.requestPointerLock();
      }
  }
  
  setMenuTab(tab: MenuTab) {
      this.activeMenuTab.set(tab);
  }
  
  setGraphics(level: 'low' | 'medium' | 'high') {
      this.currentGraphics.set(level);
      this.threeGame.setGraphicsQuality(level);
  }

  setCameraMode(mode: 'first' | 'third') {
      this.currentCameraMode.set(mode);
      this.threeGame.setCameraMode(mode);
  }

  resetCharacter() {
      this.threeGame.resetCharacter();
      this.toggleGameMenu(); 
  }
  
  replay() {
      this.threeGame.loadLevel(); 
      this.threeGame.requestPointerLock();
  }

  exitGame() {
    this.threeGame.cleanup();
    this.isMenuOpen.set(false);
    this.currentView.set('DISCOVERY');
  }
  
  // --- Mobile Controls ---

  // Joystick
  handleJoystickStart(e: TouchEvent) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickStart = { x: touch.clientX, y: touch.clientY };
      this.joystickActive.set(true);
  }

  handleJoystickMove(e: TouchEvent) {
      if (!this.joystickActive()) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      
      const maxDist = 50;
      let dx = touch.clientX - this.joystickStart.x;
      let dy = touch.clientY - this.joystickStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Clamp distance
      if (distance > maxDist) {
          dx = (dx / distance) * maxDist;
          dy = (dy / distance) * maxDist;
      }
      
      this.joystickTransform.set(`translate(${dx}px, ${dy}px)`);

      // Normalize for Game Service (-1 to 1)
      // Screen Y is down-positive, we need Up-positive for forward
      const normX = dx / maxDist;
      const normY = -(dy / maxDist);
      
      this.threeGame.updateMobileJoystick(normX, normY);
  }

  handleJoystickEnd(e: TouchEvent) {
      e.preventDefault();
      this.joystickActive.set(false);
      this.joystickTransform.set('translate(0px, 0px)');
      this.threeGame.updateMobileJoystick(0, 0);
  }

  // Mobile Look
  handleTouchLookStart(e: TouchEvent) {
    const touch = e.changedTouches[0];
    this.touchLookStart = { x: touch.clientX, y: touch.clientY };
  }

  handleTouchLookMove(e: TouchEvent) {
    if (e.cancelable) e.preventDefault();
    const touch = e.changedTouches[0];
    
    // Calculate delta
    const deltaX = touch.clientX - this.touchLookStart.x;
    const deltaY = touch.clientY - this.touchLookStart.y;
    
    this.threeGame.updateMobileLook(deltaX, deltaY);
    
    // Reset for relative movement next frame
    this.touchLookStart = { x: touch.clientX, y: touch.clientY };
  }

  handleMobileJump(e: TouchEvent) {
      e.preventDefault();
      this.threeGame.doJump();
  }

  // --- Interaction & UI ---

  toggleChat() {
      this.isChatVisible.update(v => !v);
      if (this.isChatVisible()) {
          this.unreadMessagesCount.set(0);
      }
  }

  sendMessage() {
      if (!this.chatInput.trim()) return;
      this.firebaseService.sendMessage(this.dataService.user().username, this.chatInput);
      this.chatInput = '';
  }

  onChatFocus() {
      this.isChatFocused = true;
      this.threeGame.exitPointerLock();
  }

  onChatBlur() {
      this.isChatFocused = false;
  }

  vote(type: 'like' | 'dislike') {
      if (this.hasVoted()) return;
      this.firebaseService.voteGame(type);
      this.hasVoted.set(true);
  }

  equip(itemId: string, type: 'face' | 'clothes' | 'accessory') {
    this.dataService.equipItem(itemId, type);
    this.threeProfile.updateAppearance();
  }

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

  ngOnDestroy() {
    this.threeGame.cleanup();
    this.threeProfile.cleanup();
  }
}
