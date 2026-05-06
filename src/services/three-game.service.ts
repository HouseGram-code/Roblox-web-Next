import { Injectable, signal, effect, inject } from '@angular/core';
import { DataService } from './data.service';
import { AudioService } from './audio.service';
import { FirebaseService, PlayerData } from './firebase.service';

declare const THREE: any;

@Injectable({
  providedIn: 'root'
})
export class ThreeGameService {
  private scene: any;
  private camera: any;
  private renderer: any;
  private playerGroup: any;
  private platforms: any[] = [];
  private animationId: number | null = null;
  
  // Remote Players
  private remotePlayerMeshes: Map<string, any> = new Map();
  // Map to store timeout IDs for removing chat bubbles
  private chatBubbleTimeouts: Map<string, any> = new Map();
  
  // Game State
  private velocity = { x: 0, y: 0, z: 0 };
  private onGround = false;
  private keys = { w: false, a: false, s: false, d: false, space: false };
  
  // Mobile Input State
  private mobileInput = { x: 0, y: 0 }; // x=strafe, y=forward
  private mobileLookSpeed = 0.005;

  private cameraAngleX = 0;
  private cameraAngleY = 0;
  private checkpoint = { x: 0, y: 5, z: 0 };
  private gravity = 0.015;
  
  // Camera Settings
  private cameraMode: 'first' | 'third' = 'third';
  
  // Audio State
  private lastStepTime = 0;
  
  // Network State
  private lastNetworkUpdate = 0;

  // Settings
  private quality = 'high'; // low, medium, high

  // Loading State
  public isLoading = signal(false);
  public loadingProgress = signal(0);
  public loadingStatus = signal('Initializing...');

  public isPlaying = signal(false);
  public showCheckpointMsg = signal(false);
  public isVictory = signal(false);
  public canDoubleJump = false;

  private dataService = inject(DataService);
  private audio = inject(AudioService);
  private firebaseService = inject(FirebaseService);

  constructor() {
      // Effect to handle remote player updates
      effect(() => {
          if (!this.scene) return;
          const others = this.firebaseService.otherPlayers();
          this.updateRemotePlayers(others);
      });
  }

  init(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Default renderer settings (High)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    this.scene.add(dirLight);

    this.playerGroup = this.createPlayerMesh();
    this.playerGroup.userData = { isLocal: true, username: this.dataService.user().username };
    
    // Add Name Tag for Local Player
    const localName = this.dataService.user().username;
    const nameSprite = this.createNameSprite(localName);
    if (nameSprite) this.playerGroup.add(nameSprite);

    this.updateCharacterAppearance();
    this.scene.add(this.playerGroup);

    this.setupInputs();
    this.applyGraphicsSettings(this.quality); // Apply default
    
    // Animation loop starts, but logic is paused by isLoading flag
    this.animate();
  }

  // --- Multiplayer Logic ---

  private updateRemotePlayers(players: Record<string, PlayerData>) {
      // 1. Remove players who left
      this.remotePlayerMeshes.forEach((mesh, id) => {
          if (!players[id]) {
              this.scene.remove(mesh);
              this.remotePlayerMeshes.delete(id);
          }
      });

      // 2. Add or Update players
      Object.values(players).forEach(p => {
          let mesh = this.remotePlayerMeshes.get(p.id);
          
          if (!mesh) {
              // Create new player mesh
              const color = p.avatar?.clothesColor || 0x0088ff;
              mesh = this.createRemotePlayerMesh(color);
              mesh.userData = { 
                  id: p.id,
                  username: p.username,
                  targetPos: new THREE.Vector3(p.x, p.y, p.z),
                  targetRot: p.rotation
              };
              
              // Add username label
              const nameSprite = this.createNameSprite(p.username);
              if (nameSprite) mesh.add(nameSprite);
              
              this.scene.add(mesh);
              this.remotePlayerMeshes.set(p.id, mesh);
              
              // Set initial pos immediately
              mesh.position.set(p.x, p.y, p.z);
          } else {
              // Update target for interpolation
              if (!mesh.userData.targetPos) mesh.userData.targetPos = new THREE.Vector3();
              mesh.userData.targetPos.set(p.x, p.y, p.z);
              mesh.userData.targetRot = p.rotation;
          }
      });
  }

  public showChatBubble(username: string, text: string) {
      if (!this.scene) return;

      // Find player by username (local or remote)
      let targetMesh = null;
      if (this.playerGroup && this.playerGroup.userData.username === username) {
          targetMesh = this.playerGroup;
      } else {
          // Search remote meshes
          for (let mesh of this.remotePlayerMeshes.values()) {
              if (mesh.userData.username === username) {
                  targetMesh = mesh;
                  break;
              }
          }
      }

      if (!targetMesh) return;

      // Remove old bubble if exists
      const oldBubble = targetMesh.getObjectByName('chatBubble');
      if (oldBubble) targetMesh.remove(oldBubble);

      // Create new Bubble
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fontSize = 40;
      const font = `bold ${fontSize}px "Inter", sans-serif`;
      ctx.font = font;

      // Wrap text logic
      const maxWidth = 500;
      const words = text.split(' ');
      let line = '';
      const lines = [];

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
      }
      lines.push(line);

      const padding = 20;
      const lineHeight = fontSize * 1.2;
      const w = Math.min(maxWidth, ctx.measureText(text).width) + padding * 2;
      const h = lines.length * lineHeight + padding * 2 + 20; // +20 for tail

      canvas.width = 512; // Power of 2 mostly for older GPU support habit, but flexible here
      canvas.height = 256;

      // Redraw context after resize
      ctx.font = font;
      ctx.textBaseline = 'top';

      // Bubble Background
      const r = 20;
      const bx = (canvas.width - w) / 2;
      const by = 10;
      
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 4;
      
      // Draw rounded rect
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + w - r, by);
      ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
      ctx.lineTo(bx + w, by + h - r - 20); // -20 for tail space
      ctx.quadraticCurveTo(bx + w, by + h - 20, bx + w - r, by + h - 20);
      ctx.lineTo(bx + w / 2 + 20, by + h - 20);
      ctx.lineTo(bx + w / 2, by + h); // Tail tip
      ctx.lineTo(bx + w / 2 - 20, by + h - 20);
      ctx.lineTo(bx + r, by + h - 20);
      ctx.quadraticCurveTo(bx, by + h - 20, bx, by + h - r - 20);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      
      lines.forEach((l, i) => {
          ctx.fillText(l.trim(), canvas.width / 2, by + padding + (i * lineHeight));
      });

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      
      sprite.name = 'chatBubble';
      sprite.scale.set(6, 3, 1);
      sprite.position.set(0, 8.5, 0); // Above name tag
      
      targetMesh.add(sprite);

      // Auto remove logic
      const id = targetMesh.userData.username;
      if (this.chatBubbleTimeouts.has(id)) {
          clearTimeout(this.chatBubbleTimeouts.get(id));
      }
      
      const timeout = setTimeout(() => {
          targetMesh.remove(sprite);
          this.chatBubbleTimeouts.delete(id);
      }, 6000);
      
      this.chatBubbleTimeouts.set(id, timeout);
  }

  private createNameSprite(name: string) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const fontSize = 50;
      const font = `bold ${fontSize}px "Inter", sans-serif`;
      ctx.font = font;
      
      const textMetrics = ctx.measureText(name);
      const width = textMetrics.width + 20; // padding
      const height = fontSize + 20;

      canvas.width = width;
      canvas.height = height;

      // Reset font after resize
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(name, width/2, height/2);

      // Fill
      ctx.fillStyle = 'white';
      ctx.fillText(name, width/2, height/2);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      
      const mat = new THREE.SpriteMaterial({ 
          map: tex, 
          transparent: true,
          depthTest: false // See through walls like typical MMO names
      });
      
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 10; // Ensure it renders on top of opaque geometry
      
      // World Scale
      // Map pixel width to world units. 
      const pixelScale = 0.025; 
      sprite.scale.set(width * pixelScale, height * pixelScale, 1);
      
      sprite.position.y = 6.2; // Position above the head
      
      return sprite;
  }

  private createRemotePlayerMesh(color: number) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcd38 }); 
    const shirtMat = new THREE.MeshLambertMaterial({ color: color }); // Use their unique color
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const legL = new THREE.Mesh(legGeo, pantsMat); legL.position.set(-0.5, 1, 0); legL.name = 'legL';
    const legR = new THREE.Mesh(legGeo, pantsMat); legR.position.set(0.5, 1, 0); legR.name = 'legR';
    
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
    torso.position.y = 3; 

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat);
    head.position.y = 4.6;

    const armGeo = new THREE.BoxGeometry(1, 2, 1);
    const armL = new THREE.Mesh(armGeo, skinMat); armL.position.set(-1.5, 3, 0); armL.name = 'armL';
    const armR = new THREE.Mesh(armGeo, skinMat); armR.position.set(1.5, 3, 0); armR.name = 'armR';

    group.add(legL, legR, torso, head, armL, armR);
    return group;
  }

  // --- End Multiplayer Logic ---

  setGraphicsQuality(level: 'low' | 'medium' | 'high') {
    this.quality = level;
    this.applyGraphicsSettings(level);
  }

  setCameraMode(mode: 'first' | 'third') {
      this.cameraMode = mode;
      // In 1st person, hide local player to prevent clipping. 
      // In a real engine, we might use layers or shadowOnly, but this is simple and robust.
      if (this.playerGroup) {
          this.playerGroup.visible = (mode === 'third');
      }
  }

  // --- Mobile Controls ---
  updateMobileJoystick(x: number, y: number) {
      this.mobileInput.x = x;
      this.mobileInput.y = y;
  }

  updateMobileLook(deltaX: number, deltaY: number) {
      if (this.isPlaying() && !this.isVictory() && !this.isLoading()) {
          this.cameraAngleX -= deltaX * this.mobileLookSpeed;
          this.cameraAngleY -= deltaY * this.mobileLookSpeed;

          // Clamp angles same as mouse logic
          if (this.cameraMode === 'third') {
              this.cameraAngleY = Math.max(-1.2, Math.min(0.5, this.cameraAngleY));
          } else {
              this.cameraAngleY = Math.max(-1.5, Math.min(1.5, this.cameraAngleY));
          }
      }
  }

  doJump() {
    if (this.isPlaying() && !this.isLoading() && !this.isVictory()) {
        if (this.onGround) {
            this.velocity.y = 0.5;
            this.onGround = false;
            this.canDoubleJump = true;
            this.audio.playJump();
        } else if (this.canDoubleJump) {
            this.velocity.y = 0.45; // Second jump slightly weaker
            this.canDoubleJump = false;
            this.audio.playJump();
            // Spin effect for double jump
            if (this.playerGroup) {
                this.playerGroup.rotation.y += Math.PI;
            }
        }
    }
  }
  // ---------------------

  private applyGraphicsSettings(level: string) {
    if (!this.renderer) return;

    if (level === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(0.75); // Lower res for FPS
    } else if (level === 'medium') {
      this.renderer.shadowMap.enabled = false; // No shadows
      this.renderer.setPixelRatio(1);
    } else { // High
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    this.scene.traverse((object: any) => {
        if (object.isMesh) {
            object.castShadow = (level === 'high');
            object.receiveShadow = (level === 'high');
        }
    });
  }

  // Async function to simulate loading process
  async loadLevel() {
    if (!this.scene) return;
    
    // Start Loading Sequence
    this.isLoading.set(true);
    this.loadingProgress.set(0);
    this.loadingStatus.set('Requesting Server...');
    
    await this.delay(500);

    this.platforms.forEach(p => this.scene.remove(p));
    this.platforms = [];
    this.isVictory.set(false);
    
    this.gravity = 0.015;
    this.scene.background.setHex(0x87CEEB);
    this.scene.fog.color.setHex(0x87CEEB);

    this.loadingProgress.set(25);
    this.loadingStatus.set('Loading Assets...');
    await this.delay(600);

    // Spawn platform
    this.createPlat(0, -1, 0, 10, 1, 10, 0x555555);

    this.loadingProgress.set(50);
    this.loadingStatus.set('Building Terrain...');

    // Rainbow Obby Generation
    let z = -8;
    for(let i=0; i<50; i++) {
        const color = new THREE.Color().setHSL(i/30, 1, 0.5);
        const xOffset = (Math.sin(i) * 5); 
        this.createPlat(xOffset, 0, z, 4, 1, 4, color);
        
        if (i % 5 === 0) {
           z -= 4;
           this.createPlat(xOffset, 1, z, 1, 0.5, 3, 0xffffff);
        }
        
        z -= 6;
    }
    
    // Final platform - Mark as finish
    const finishPlat = this.createPlat(0, 0, z - 5, 20, 1, 20, 0xffff00);
    finishPlat.userData.isFinish = true;
    
    this.checkpoint = { x: 0, y: 2, z: 0 };
    this.respawn();

    this.loadingProgress.set(80);
    this.loadingStatus.set('Joining Server...');
    await this.delay(600);

    this.loadingProgress.set(100);
    this.loadingStatus.set('Ready!');
    await this.delay(300);

    // Finish Loading
    this.isLoading.set(false);
    
    // Play Music only after loading finishes successfully
    this.audio.playMusic();
  }

  private delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createPlat(x: number, y: number, z: number, w: number, h: number, d: number, color: any) {
    const mat = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    const topY = y + h/2;
    mesh.userData = { w, h, d, top: topY };
    
    mesh.castShadow = true; 
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.platforms.push(mesh);
    return mesh;
  }

  private createPlayerMesh() {
    const group = new THREE.Group();
    
    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcd38 }); 
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x0088ff });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

    // LEGS
    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.y = -1;
    const legLGroup = new THREE.Group();
    legLGroup.name = 'legL';
    legLGroup.position.set(-0.5, 2, 0);
    legLGroup.add(legL);
    group.add(legLGroup);

    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.y = -1;
    const legRGroup = new THREE.Group();
    legRGroup.name = 'legR';
    legRGroup.position.set(0.5, 2, 0);
    legRGroup.add(legR);
    group.add(legRGroup);

    // TORSO
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
    torso.position.set(0, 3, 0); 
    torso.name = 'torso';
    torso.castShadow = true;
    group.add(torso);

    // HEAD
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat.clone());
    head.position.set(0, 4.6, 0);
    head.name = 'head';
    head.castShadow = true;
    group.add(head);

    // ARMS
    const armGeo = new THREE.BoxGeometry(1, 2, 1);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.y = -1;
    const armLGroup = new THREE.Group();
    armLGroup.name = 'armL';
    armLGroup.position.set(-1.5, 4, 0);
    armLGroup.add(armL);
    group.add(armLGroup);

    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.y = -1;
    const armRGroup = new THREE.Group();
    armRGroup.name = 'armR';
    armRGroup.position.set(1.5, 4, 0);
    armRGroup.add(armR);
    group.add(armRGroup);

    return group;
  }

  private updateCharacterAppearance() {
    if (!this.playerGroup) return;
    const user = this.dataService.user();
    
    // 1. Update Clothes
    const clothesItem = this.dataService.getItem(user.avatar.clothes);
    const torso = this.playerGroup.getObjectByName('torso');
    if (torso && clothesItem && clothesItem.color) {
        // @ts-ignore
        torso.material.color.setHex(clothesItem.color);
    }

    // 2. Update Accessories (Hat)
    const head = this.playerGroup.getObjectByName('head');
    
    // Remove old accessories
    if (head) {
        const oldHat = head.getObjectByName('hat_defender');
        if (oldHat) head.remove(oldHat);

        // Add Defender Hat if equipped
        if (user.avatar.accessories?.includes('hat_defender')) {
            const hatGroup = new THREE.Group();
            hatGroup.name = 'hat_defender';
            
            // Military Cap Base
            const capBaseGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.3, 32);
            const capMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 }); // Dark Green
            const capBase = new THREE.Mesh(capBaseGeo, capMat);
            capBase.position.y = 0.65; // On top of head (head is 1.2 high, center at 0)
            hatGroup.add(capBase);

            // Cap Visor
            const visorGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
            const visorMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 }); // Darker Green
            const visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 0.55, 0.5); // Front of cap
            hatGroup.add(visor);

            // Red Star Badge
            const starGeo = new THREE.BoxGeometry(0.2, 0.2, 0.05);
            const starMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f }); // Red
            const star = new THREE.Mesh(starGeo, starMat);
            star.position.set(0, 0.65, 0.66); // Front of cap base
            hatGroup.add(star);

            head.add(hatGroup);
        }
    }

    if (torso) {
        const oldWings = torso.getObjectByName('wings_spring');
        if (oldWings) torso.remove(oldWings);

        if (user.avatar.accessories?.includes('wings_spring')) {
            const wingsGroup = new THREE.Group();
            wingsGroup.name = 'wings_spring';
            
            const wingMat = new THREE.MeshLambertMaterial({ 
                color: 0xffb7c5, 
                transparent: true, 
                opacity: 0.8,
                emissive: 0xff69b4,
                emissiveIntensity: 0.5,
                side: THREE.DoubleSide
            });

            const wingGeoL = new THREE.BoxGeometry(1.8, 2.2, 0.05);
            wingGeoL.translate(0.9, 0, 0); // Pivot at the edge
            const wingL = new THREE.Mesh(wingGeoL, wingMat);
            wingL.name = 'wingL';
            wingL.position.set(0, 0.2, -0.6);

            const wingGeoR = new THREE.BoxGeometry(1.8, 2.2, 0.05);
            wingGeoR.translate(-0.9, 0, 0); // Pivot at the edge
            const wingR = new THREE.Mesh(wingGeoR, wingMat);
            wingR.name = 'wingR';
            wingR.position.set(0, 0.2, -0.6);

            wingsGroup.add(wingL);
            wingsGroup.add(wingR);
            torso.add(wingsGroup);
        }
    }
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      // Prevent input during loading
      if (!this.isPlaying() || this.isLoading()) return;
      if (this.isVictory()) return; 
      
      if (e.code === 'KeyW') this.keys.w = true;
      if (e.code === 'KeyS') this.keys.s = true;
      if (e.code === 'KeyA') this.keys.a = true;
      if (e.code === 'KeyD') this.keys.d = true;
      if (e.code === 'Space') {
          this.doJump();
      }
    });
    
    window.addEventListener('keyup', e => {
      if (e.code === 'KeyW') this.keys.w = false;
      if (e.code === 'KeyS') this.keys.s = false;
      if (e.code === 'KeyA') this.keys.a = false;
      if (e.code === 'KeyD') this.keys.d = false;
    });

    // Mouse Look (Desktop)
    window.addEventListener('mousemove', e => {
        if (document.pointerLockElement === document.body && this.isPlaying() && !this.isVictory() && !this.isLoading()) {
            this.cameraAngleX -= e.movementX * 0.003;
            this.cameraAngleY -= e.movementY * 0.003;
            
            if (this.cameraMode === 'third') {
                 // Clamp for 3rd person to prevent clipping underground or flipping
                 this.cameraAngleY = Math.max(-1.2, Math.min(0.5, this.cameraAngleY));
            } else {
                 // Relax clamp for 1st person
                 this.cameraAngleY = Math.max(-1.5, Math.min(1.5, this.cameraAngleY));
            }
        }
    });

    window.addEventListener('resize', () => {
        if(this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
  }

  private checkCollisions() {
    const playerFeet = this.playerGroup.position;
    this.onGround = false;
    const playerRadius = 0.8;

    for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];
        const data = plat.userData;
        
        const xDist = Math.abs(playerFeet.x - plat.position.x);
        const zDist = Math.abs(playerFeet.z - plat.position.z);
        
        const xBounds = data.w / 2 + playerRadius;
        const zBounds = data.d / 2 + playerRadius;

        if (xDist < xBounds && zDist < zBounds) {
            const distToPlatTop = playerFeet.y - data.top;

            if (distToPlatTop > -0.5 && distToPlatTop < 0.5 && this.velocity.y <= 0) {
                 this.playerGroup.position.y = data.top; 
                 this.velocity.y = 0;
                 this.onGround = true;
                 this.canDoubleJump = true;

                 // Check Victory
                 if (data.isFinish && !this.isVictory()) {
                     this.isVictory.set(true);
                     this.exitPointerLock();
                 }

                 if (!data.isFinish && Math.abs(plat.position.z) > Math.abs(this.checkpoint.z) + 50) {
                    this.checkpoint = { x: plat.position.x, y: data.top + 2, z: plat.position.z };
                    this.showCheckpointMsg.set(true);
                    setTimeout(() => this.showCheckpointMsg.set(false), 2000);
                 }
            }
        }
    }
  }

  public resetCharacter() {
    this.respawn();
  }

  private respawn() {
    this.playerGroup.position.set(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z);
    this.velocity = { x: 0, y: 0, z: 0 };
    this.cameraAngleX = 0;
    this.cameraAngleY = 0;
  }

  private animate = () => {
    if (!this.isPlaying()) {
        this.animationId = requestAnimationFrame(this.animate);
        return;
    }

    // Pause physics if loading
    if (this.isLoading()) {
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(this.animate);
        return;
    }

    // --- REMOTE PLAYERS INTERPOLATION (SMOOTHING) ---
    const lerpFactor = 0.1;
    this.remotePlayerMeshes.forEach(mesh => {
        if (mesh.userData.targetPos) {
            mesh.position.lerp(mesh.userData.targetPos, lerpFactor);
        }
        if (mesh.userData.targetRot !== undefined) {
             // Simple lerp for Y rotation. 
             // Ideally we check shortest path for angles, but for small deltas this is fine.
             mesh.rotation.y += (mesh.userData.targetRot - mesh.rotation.y) * lerpFactor;
             
             // Animate Limbs for remote players if they are moving
             const dist = mesh.position.distanceTo(mesh.userData.targetPos);
             const time = Date.now() * 0.015;
             const legL = mesh.getObjectByName('legL');
             const legR = mesh.getObjectByName('legR');
             const armL = mesh.getObjectByName('armL');
             const armR = mesh.getObjectByName('armR');

             if (dist > 0.05) { // Moving
                 const angle = Math.sin(time) * 0.8;
                 if(legL) legL.rotation.x = angle;
                 if(legR) legR.rotation.x = -angle;
                 if(armL) armL.rotation.x = -angle;
                 if(armR) armR.rotation.x = angle;
             } else { // Idle
                 const lerp = (c: number, t: number) => c + (t - c) * 0.1;
                 if(legL) legL.rotation.x = lerp(legL.rotation.x, 0);
                 if(legR) legR.rotation.x = lerp(legR.rotation.x, 0);
                 if(armL) armL.rotation.x = lerp(armL.rotation.x, 0);
                 if(armR) armR.rotation.x = lerp(armR.rotation.x, 0);
             }
        }
    });

    // Physics Loop
    if (!this.isVictory()) {
        this.velocity.y -= this.gravity;
        this.playerGroup.position.y += this.velocity.y;
    }
    
    // Kill floor
    if (this.playerGroup.position.y < -30) {
        this.respawn();
    } else {
        this.checkCollisions();
    }

    // Movement
    if (!this.isVictory()) {
        let move = false;
        const speed = 0.3;
        
        // Combine Keyboard and Mobile Input
        // Forward/Back
        let forward = 0;
        if (this.keys.w) forward += 1;
        if (this.keys.s) forward -= 1;
        forward += this.mobileInput.y;

        // Strafe
        let strafe = 0;
        if (this.keys.a) strafe -= 1; // Left
        if (this.keys.d) strafe += 1; // Right
        strafe += this.mobileInput.x;

        // Cap magnitude to 1
        const magnitude = Math.sqrt(forward * forward + strafe * strafe);
        if (magnitude > 1) {
            forward /= magnitude;
            strafe /= magnitude;
        }

        let dx = 0, dz = 0;
        
        // If there is movement input
        if (Math.abs(forward) > 0.01 || Math.abs(strafe) > 0.01) {
            move = true;
            // Calculate movement direction relative to camera
            // Forward (z) corresponds to cos(angle), sin(angle) logic in existing code needs care
            // Standard 3D: Z is Forward/Back.
            
            // Reusing existing math logic structure:
            // W moves along +sin(angle), +cos(angle)
            // D moves along +sin(angle - 90), +cos(angle - 90) -> -cos(angle), +sin(angle)
            
            // Total Move Vector rotated by CameraAngleX
            // dx = forward * sin(A) + strafe * sin(A - 90)
            // dz = forward * cos(A) + strafe * cos(A - 90)
            
            dx += forward * Math.sin(this.cameraAngleX);
            dz += forward * Math.cos(this.cameraAngleX);
            
            dx += strafe * Math.sin(this.cameraAngleX - Math.PI/2);
            dz += strafe * Math.cos(this.cameraAngleX - Math.PI/2);
            
            this.playerGroup.position.x -= dx * speed;
            this.playerGroup.position.z -= dz * speed;
            
            this.playerGroup.rotation.y = Math.atan2(-dx, -dz);

            // Play Step Sound
            if (this.onGround) {
                const now = Date.now();
                if (now - this.lastStepTime > 350) { 
                    this.audio.playStep();
                    this.lastStepTime = now;
                }
            }
        }

        // --- NETWORK UPDATE ---
        const now = Date.now();
        if (now - this.lastNetworkUpdate > 50) { // 20 updates per second max
            this.firebaseService.updatePosition(
                this.playerGroup.position.x,
                this.playerGroup.position.y,
                this.playerGroup.position.z,
                this.playerGroup.rotation.y
            );
            this.lastNetworkUpdate = now;
        }

        // Animation
        const time = Date.now() * 0.015;
        const legL = this.playerGroup.getObjectByName('legL');
        const legR = this.playerGroup.getObjectByName('legR');
        const armL = this.playerGroup.getObjectByName('armL');
        const armR = this.playerGroup.getObjectByName('armR');
        const torso = this.playerGroup.getObjectByName('torso');

        if (!this.onGround) {
            // Jumping or Falling
            const lerp = (current: number, target: number) => current + (target - current) * 0.2;
            if (this.velocity.y > 0) {
                // Going up - Jump pose
                if(armL) armL.rotation.x = lerp(armL.rotation.x, Math.PI * 0.9);
                if(armR) armR.rotation.x = lerp(armR.rotation.x, Math.PI * 0.9);
                if(armL) armL.rotation.z = lerp(armL.rotation.z, 0.2);
                if(armR) armR.rotation.z = lerp(armR.rotation.z, -0.2);
                if(legL) legL.rotation.x = lerp(legL.rotation.x, -0.4);
                if(legR) legR.rotation.x = lerp(legR.rotation.x, 0.4);
            } else {
                // Falling pose
                if(armL) armL.rotation.x = lerp(armL.rotation.x, Math.PI * 0.75);
                if(armR) armR.rotation.x = lerp(armR.rotation.x, Math.PI * 0.75);
                if(armL) armL.rotation.z = lerp(armL.rotation.z, 0.5);
                if(armR) armR.rotation.z = lerp(armR.rotation.z, -0.5);
                if(legL) legL.rotation.x = lerp(legL.rotation.x, 0.1);
                if(legR) legR.rotation.x = lerp(legR.rotation.x, -0.1);
            }
        } else if (move) {
            // Running
            const lerp = (current: number, target: number) => current + (target - current) * 0.2;
            // Reset Z rotations
            if(armL) armL.rotation.z = lerp(armL.rotation.z, 0);
            if(armR) armR.rotation.z = lerp(armR.rotation.z, 0);
            
            const angle = Math.sin(time) * 0.8;
            if(legL) legL.rotation.x = angle;
            if(legR) legR.rotation.x = -angle;
            if(armL) armL.rotation.x = -angle;
            if(armR) armR.rotation.x = angle;
            
            // Running bobbing handled via whole mesh container or child parts
            const head = this.playerGroup.getObjectByName('head');
            if (torso) torso.position.y = 3 + Math.abs(Math.sin(time * 2)) * 0.1;
            if (head) head.position.y = 4.6 + Math.abs(Math.sin(time * 2)) * 0.1;
        } else {
            // Idle
            const lerp = (current: number, target: number) => current + (target - current) * 0.1;
            // Reset Z rotations
            if(armL) armL.rotation.z = lerp(armL.rotation.z, 0);
            if(armR) armR.rotation.z = lerp(armR.rotation.z, 0);
            
            if(legL) legL.rotation.x = lerp(legL.rotation.x, 0);
            if(legR) legR.rotation.x = lerp(legR.rotation.x, 0);
            
            // Breathing animation
            const breath = Math.sin(time * 0.2) * 0.03;
            if(armL) armL.rotation.x = lerp(armL.rotation.x, breath);
            if(armR) armR.rotation.x = lerp(armR.rotation.x, -breath);
            
            const head = this.playerGroup.getObjectByName('head');
            if (torso) {
                torso.scale.y = 1 + breath;
                torso.position.y = 3 + breath * 0.5;
            }
            if (head) head.position.y = 4.6 + breath;
        }

        // Animate Wings if equipped
        if (torso) {
            const wings = torso.getObjectByName('wings_spring');
            if (wings) {
                const wingL = wings.getObjectByName('wingL');
                const wingR = wings.getObjectByName('wingR');
                // Flap faster if moving
                const flapSpeed = move ? 0.8 : 0.2;
                const flap = Math.sin(time * flapSpeed) * 0.4 + 0.4;
                if (wingL) wingL.rotation.y = -flap;
                if (wingR) wingR.rotation.y = flap;
            }
        }
    }

    // Camera Logic
    if (this.cameraMode === 'first') {
        // 1st Person: Camera at head position, invisible body
        // Calculate Head Position (Local Y 4.6 relative to player base)
        const headX = this.playerGroup.position.x;
        const headY = this.playerGroup.position.y + 4.6;
        const headZ = this.playerGroup.position.z;
        
        this.camera.position.set(headX, headY, headZ);

        // Look direction based on cameraAngleX (Yaw) and cameraAngleY (Pitch)
        // We project a point in front of the camera to look at.
        // Similar to 3rd person inverse logic, but purely rotational from head center.
        const lookDist = 10;
        const targetX = headX - Math.sin(this.cameraAngleX) * lookDist * Math.cos(this.cameraAngleY);
        const targetZ = headZ - Math.cos(this.cameraAngleX) * lookDist * Math.cos(this.cameraAngleY);
        const targetY = headY - Math.sin(this.cameraAngleY) * lookDist; 

        this.camera.lookAt(targetX, targetY, targetZ);

    } else {
        // 3rd Person: Camera orbits player, visible body
        const dist = 10;
        const targetY = this.playerGroup.position.y + 3; 
        
        this.camera.position.x = this.playerGroup.position.x + Math.sin(this.cameraAngleX) * dist * Math.cos(this.cameraAngleY);
        this.camera.position.z = this.playerGroup.position.z + Math.cos(this.cameraAngleX) * dist * Math.cos(this.cameraAngleY);
        this.camera.position.y = targetY + Math.sin(this.cameraAngleY) * dist;
        
        this.camera.lookAt(this.playerGroup.position.x, targetY, this.playerGroup.position.z);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  }

  cleanup() {
    this.audio.stopMusic();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
  }

  requestPointerLock() {
      // Only request pointer lock on desktop (non-touch)
      if (window.matchMedia("(pointer: fine)").matches) {
        document.body.requestPointerLock();
      }
  }
  
  exitPointerLock() {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
  }
}