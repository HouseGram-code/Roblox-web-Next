import { Injectable, signal, effect } from '@angular/core';

export interface Item {
  id: string;
  name: string;
  type: 'face' | 'clothes' | 'accessory';
  img: string;
  color?: number;
  description: string;
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
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Added default items to populate the UI
  readonly ITEMS: Item[] = [
      { id: 'clothes_default', name: 'Blue Shirt', type: 'clothes', img: 'https://picsum.photos/id/1/100/100', color: 0x0088ff, description: 'Standard issue.' },
      { id: 'clothes_red', name: 'Red Hoodie', type: 'clothes', img: 'https://picsum.photos/id/2/100/100', color: 0xff3333, description: 'Fiery and bold.' },
      { id: 'clothes_green', name: 'Camo Vest', type: 'clothes', img: 'https://picsum.photos/id/3/100/100', color: 0x33aa33, description: 'Blend in.' },
      { id: 'clothes_black', name: 'Midnight Tee', type: 'clothes', img: 'https://picsum.photos/id/4/100/100', color: 0x1a1a1a, description: 'Stealth mode.' },
      { id: 'clothes_purple', name: 'Royal Robe', type: 'clothes', img: 'https://picsum.photos/id/5/100/100', color: 0x8800cc, description: 'For kings.' },
      { id: 'clothes_orange', name: 'Orange Jumpsuit', type: 'clothes', img: 'https://picsum.photos/id/6/100/100', color: 0xff8800, description: 'Construction chic.' },
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
    }
  });

  constructor() {
    this.loadData();
    // Auto-save effect to localStorage
    effect(() => {
      localStorage.setItem('roblux_save_v4', JSON.stringify(this.user()));
    });
  }

  loadData() {
    const saved = localStorage.getItem('roblux_save_v4');
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

        this.user.set(parsed as UserState);
      } catch (e) {
        console.error('Failed to load save', e);
      }
    }
  }

  setUser(data: UserState) {
    this.user.set(data);
  }

  updateProfile(username: string, description: string) {
    this.user.update(u => ({ ...u, username, description }));
  }

  equipItem(itemId: string, type: 'face' | 'clothes' | 'accessory') {
    // Logic remains in case items are added later
    this.user.update(u => {
      const newAvatar = { ...u.avatar };
      if (type === 'accessory') {
        const idx = newAvatar.accessories.indexOf(itemId);
        if (idx > -1) newAvatar.accessories = newAvatar.accessories.filter(id => id !== itemId);
        else newAvatar.accessories = [...newAvatar.accessories, itemId];
      } else {
        // @ts-ignore
        newAvatar[type] = itemId;
      }
      return { ...u, avatar: newAvatar };
    });
  }

  getItem(id: string) {
    return this.ITEMS.find(i => i.id === id);
  }
}