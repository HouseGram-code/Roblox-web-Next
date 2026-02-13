import { Injectable, signal, computed } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, push, onDisconnect, remove, serverTimestamp, runTransaction, get } from 'firebase/database';
import { UserState } from './data.service';

const firebaseConfig = {
  apiKey: "AIzaSyDKCtksw4Nbc8q0DvJ3pZGnj_5hsZcPHDs",
  authDomain: "housegram-beta.firebaseapp.com",
  databaseURL: "https://housegram-beta-default-rtdb.firebaseio.com",
  projectId: "housegram-beta",
  storageBucket: "housegram-beta.firebasestorage.app",
  messagingSenderId: "378536276797",
  appId: "1:378536276797:web:e84f7296602f2e7d888b54",
  measurementId: "G-5PE5JSHG5V"
};

export interface PlayerData {
  id: string;
  username: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  avatar: {
      face: string;
      clothes: string;
      clothesColor?: number;
      accessories: string[];
  };
}

export interface ChatMessage {
  id?: string;
  author: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface GameStats {
  likes: number;
  dislikes: number;
  visits: number;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: any;
  private db: any;
  public currentUserId: string;
  private currentUsername: string = '';
  private initialized = false;
  
  // Signals for components to react to
  public otherPlayers = signal<Record<string, PlayerData>>({});
  public chatMessages = signal<ChatMessage[]>([]);
  public gameStats = signal<GameStats>({ likes: 0, dislikes: 0, visits: 0 });

  // Computed Real-time Online Count (Others + Self)
  public onlineCount = computed(() => Object.keys(this.otherPlayers()).length + 1);

  constructor() {
    this.currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    try {
        this.app = initializeApp(firebaseConfig);
        this.db = getDatabase(this.app);
        this.initialized = true;
        // Listen to Game Stats
        this.listenToGameStats();
    } catch (e) {
        console.error("Firebase Initialization Failed:", e);
    }
  }

  private checkInit() {
      if (!this.initialized) console.warn("Firebase not initialized");
      return this.initialized;
  }

  // --- Persistent User Profile Logic ---
  
  private sanitizeEmail(email: string): string {
      return email.replace(/\./g, ',');
  }

  async getUserProfile(email: string): Promise<UserState | null> {
      if (!this.checkInit()) return null;
      const key = this.sanitizeEmail(email);
      const userRef = ref(this.db, 'users/' + key);
      try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
              return snapshot.val() as UserState;
          }
      } catch (e) {
          console.error("Error fetching profile:", e);
      }
      return null;
  }

  async saveUserProfile(user: UserState) {
      if (!this.checkInit() || !user.email) return;
      const key = this.sanitizeEmail(user.email);
      const userRef = ref(this.db, 'users/' + key);
      await update(userRef, user);
  }

  // --- Realtime Game Logic ---

  joinGame(user: UserState, clothesColor?: number) {
    if (!this.checkInit()) return;

    this.currentUsername = user.username;
    const playerRef = ref(this.db, 'players/' + this.currentUserId);
    
    // Set initial data
    set(playerRef, {
      id: this.currentUserId,
      username: user.username,
      x: 0,
      y: 5,
      z: 0,
      rotation: 0,
      avatar: {
          face: user.avatar.face || 'face_default',
          clothes: user.avatar.clothes || 'clothes_default',
          clothesColor: clothesColor ?? 0x0088ff,
          accessories: user.avatar.accessories || []
      },
      lastActive: serverTimestamp()
    });

    onDisconnect(playerRef).remove();

    this.sendMessage('System', `${user.username} joined the server.`, true);

    const allPlayersRef = ref(this.db, 'players');
    onValue(allPlayersRef, (snapshot: any) => {
      const data = snapshot.val() || {};
      const others: Record<string, PlayerData> = {};
      Object.keys(data).forEach(key => {
        if (key !== this.currentUserId) {
          others[key] = data[key];
        }
      });
      this.otherPlayers.set(others);
    });

    const chatRef = ref(this.db, 'chat');
    onValue(chatRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.values(data) as ChatMessage[];
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        this.chatMessages.set(msgs.slice(-50));
      }
    });

    this.incrementVisits();
  }

  leaveGame() {
    if (!this.checkInit()) return;
    const playerRef = ref(this.db, 'players/' + this.currentUserId);
    remove(playerRef).catch(() => {});
    
    if (this.currentUsername) {
        this.sendMessage('System', `${this.currentUsername} left the server.`, true);
    }
  }

  updatePosition(x: number, y: number, z: number, rotation: number) {
    if (!this.checkInit()) return;
    const playerRef = ref(this.db, 'players/' + this.currentUserId);
    update(playerRef, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
      rotation: Number(rotation.toFixed(2))
    }).catch(() => {}); 
  }

  sendMessage(username: string, text: string, isSystem: boolean = false) {
    if (!this.checkInit()) return;
    const chatRef = ref(this.db, 'chat');
    const newMsgRef = push(chatRef);
    set(newMsgRef, {
      author: username,
      text: text,
      timestamp: Date.now(),
      system: isSystem
    });
  }

  // --- Game Stats Logic ---

  private listenToGameStats() {
      const statsRef = ref(this.db, 'gameStats/rainbow');
      onValue(statsRef, (snapshot) => {
          const val = snapshot.val();
          if (val) {
              this.gameStats.set(val);
          } else {
              set(statsRef, { likes: 0, dislikes: 0, visits: 0 });
          }
      });
  }

  voteGame(type: 'like' | 'dislike') {
      if (!this.checkInit()) return;
      const statsRef = ref(this.db, 'gameStats/rainbow');
      runTransaction(statsRef, (currentData) => {
          if (currentData === null) return { likes: 0, dislikes: 0, visits: 0 };
          
          if (type === 'like') {
              currentData.likes = (currentData.likes || 0) + 1;
          } else {
              currentData.dislikes = (currentData.dislikes || 0) + 1;
          }
          return currentData;
      });
  }

  incrementVisits() {
      if (!this.checkInit()) return;
      const visitsRef = ref(this.db, 'gameStats/rainbow/visits');
      runTransaction(visitsRef, (visits) => {
          return (visits || 0) + 1;
      });
  }
}