import { Injectable, signal, effect } from '@angular/core';

export interface Item {
  id: string;
  name: string;
  type: 'face' | 'clothes' | 'accessory';
  img: string;
  color?: number;
  description: string;
  price?: number; // 0 for free
}

export interface UserState {
  email: string;
  username: string;
  description: string;
  avatar: {
    face: string;
    clothes: string;
    accessories: string[];
  };
  inventory?: string[]; // List of owned item IDs
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Added default items to populate the UI
  readonly ITEMS: Item[] = [
      { id: 'clothes_default', name: 'Blue Shirt', type: 'clothes', img: 'https://picsum.photos/id/1/100/100', color: 0x0088ff, description: 'Standard issue.', price: 0 },
      { id: 'clothes_red', name: 'Red Hoodie', type: 'clothes', img: 'https://picsum.photos/id/2/100/100', color: 0xff3333, description: 'Fiery and bold.', price: 0 },
      { id: 'clothes_green', name: 'Camo Vest', type: 'clothes', img: 'https://picsum.photos/id/3/100/100', color: 0x33aa33, description: 'Blend in.', price: 0 },
      { id: 'clothes_black', name: 'Midnight Tee', type: 'clothes', img: 'https://picsum.photos/id/4/100/100', color: 0x1a1a1a, description: 'Stealth mode.', price: 0 },
      { id: 'clothes_purple', name: 'Royal Robe', type: 'clothes', img: 'https://picsum.photos/id/5/100/100', color: 0x8800cc, description: 'For kings.', price: 0 },
      { id: 'clothes_orange', name: 'Orange Jumpsuit', type: 'clothes', img: 'https://picsum.photos/id/6/100/100', color: 0xff8800, description: 'Construction chic.', price: 0 },
      
      // NEW ITEM: Defender Hat
      { id: 'hat_defender', name: 'Шляпа Защитника', type: 'accessory', img: '', color: 0x4caf50, description: 'Символ мужества и чести. 23 Февраля.', price: 0 }
  ];

  // State Signals
  user = signal<UserState>({
    email: '',
    username: 'Guest',
    description: 'Just a Roblox Next player exploring the world.',
    avatar: {
      face: 'face_default',
      clothes: 'clothes_default',
      accessories: []
    },
    inventory: ['clothes_default', 'clothes_red', 'clothes_green', 'clothes_black', 'clothes_purple', 'clothes_orange'] // Default owned items
  });

  constructor() {
    this.loadData();
    
    // Auto-save effect to localStorage
    effect(() => {
      const u = this.user();
      if (u.username && u.username !== 'Guest') {
          localStorage.setItem('roblux_save_v5', JSON.stringify(u));
      }
    });
  }

  loadData() {
    const saved = localStorage.getItem('roblux_save_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Sanitize loaded data to ensure no undefined values causing Firebase crashes
        if (!parsed.avatar) parsed.avatar = {};
        if (!Array.isArray(parsed.avatar.accessories)) parsed.avatar.accessories = [];
        if (!parsed.avatar.face) parsed.avatar.face = 'face_default';
        if (!parsed.avatar.clothes) parsed.avatar.clothes = 'clothes_default';
        
        if (!parsed.username) parsed.username = 'Guest';
        if (!parsed.description) parsed.description = 'Just a Roblox Next player exploring the world.';
        
        // Ensure inventory exists
        if (!parsed.inventory || !Array.isArray(parsed.inventory)) {
            parsed.inventory = ['clothes_default', 'clothes_red', 'clothes_green', 'clothes_black', 'clothes_purple', 'clothes_orange'];
        }

        this.user.set(parsed as UserState);
      } catch (e) {
        console.error('Failed to load save', e);
      }
    }
  }

  setUser(data: UserState) {
    // Merge with defaults to ensure structure
    const current = this.user();
    
    // Deep merge avatar to ensure accessories exist
    const mergedAvatar = {
        ...current.avatar,
        ...(data.avatar || {})
    };
    
    if (!Array.isArray(mergedAvatar.accessories)) {
        mergedAvatar.accessories = [];
    }

    this.user.set({
        ...current,
        ...data,
        avatar: mergedAvatar,
        inventory: data.inventory || current.inventory || []
    });
  }

  updateProfile(username: string, description: string) {
    this.user.update(u => ({ ...u, username, description }));
  }

  equipItem(itemId: string, type: 'face' | 'clothes' | 'accessory') {
    this.user.update(u => {
      // Check ownership
      if (u.inventory && !u.inventory.includes(itemId)) return u;

      const newAvatar = { ...u.avatar };
      if (type === 'accessory') {
        // Toggle logic for accessories
        const idx = newAvatar.accessories.indexOf(itemId);
        if (idx > -1) {
            // Unequip
            newAvatar.accessories = newAvatar.accessories.filter(id => id !== itemId);
        } else {
            // Equip (limit to 1 hat for simplicity if needed, but array supports multiple)
            // For this specific request, let's just add it.
            newAvatar.accessories = [...newAvatar.accessories, itemId];
        }
      } else {
        // @ts-ignore
        newAvatar[type] = itemId;
      }
      return { ...u, avatar: newAvatar };
    });
  }

  buyItem(itemId: string) {
      this.user.update(u => {
          if (u.inventory?.includes(itemId)) return u;
          return {
              ...u,
              inventory: [...(u.inventory || []), itemId]
          };
      });
  }

  getItem(id: string) {
    return this.ITEMS.find(i => i.id === id);
  }
  
  hasItem(id: string): boolean {
      return this.user().inventory?.includes(id) || false;
  }
}