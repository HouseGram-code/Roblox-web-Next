import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  // Reliable, high-quality upbeat electronic track
  private music = new Audio('https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg');
  private jump = new Audio('https://commondatastorage.googleapis.com/codeskulptor-assets/jump.ogg'); // Better jump sound
  private step = new Audio('https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a'); // Softer step sound

  constructor() {
    this.music.loop = true;
    this.music.volume = 0.25; 
    
    this.jump.volume = 0.4; // Increased volume
    
    this.step.volume = 0.15; // Adjusted volume
  }

  // Call this immediately on a click event (e.g., "Play Game" button)
  unlockAudio() {
    // Play and immediately pause to unlock the AudioContext on iOS/Android/Chrome
    this.music.play().then(() => {
        this.music.pause();
        this.music.currentTime = 0;
    }).catch(() => {});
    
    this.jump.play().then(() => {
        this.jump.pause();
        this.jump.currentTime = 0;
    }).catch(() => {});
  }

  playMusic() {
    this.music.currentTime = 0;
    this.music.play().catch(e => console.warn('Audio play failed (browser policy):', e));
  }

  stopMusic() {
    this.music.pause();
  }

  playJump() {
    this.jump.currentTime = 0;
    this.jump.play().catch(() => {});
  }

  playStep() {
    this.step.currentTime = 0;
    this.step.play().catch(() => {});
  }
}