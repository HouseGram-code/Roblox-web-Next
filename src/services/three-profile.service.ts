import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';

declare const THREE: any;

@Injectable({
  providedIn: 'root'
})
export class ThreeProfileService {
  private scene: any;
  private camera: any;
  private renderer: any;
  private playerGroup: any;
  private animationId: number | null = null;
  private isDragging = false;
  private prevMouse = { x: 0 };

  private dataService = inject(DataService);

  constructor() {}

  init(container: HTMLElement) {
    this.scene = new THREE.Scene();
    // Use clear background for seamless integration
    this.scene.background = null;

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, 1.5, 6.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Better Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 5, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    
    // Backlight for edge definition
    const backLight = new THREE.DirectionalLight(0x4455ff, 0.4);
    backLight.position.set(-3, 3, -5);
    this.scene.add(backLight);

    this.playerGroup = this.createPlayerMesh();
    this.updateAppearance();
    this.scene.add(this.playerGroup);

    // Interaction
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        this.isDragging = true;
        this.prevMouse.x = e.clientX;
    });
    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!this.isDragging) return;
        const delta = e.clientX - this.prevMouse.x;
        this.playerGroup.rotation.y += delta * 0.01;
        this.prevMouse.x = e.clientX;
    });
    window.addEventListener('mouseup', () => this.isDragging = false);
    
    // Touch support
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
        this.isDragging = true;
        this.prevMouse.x = e.touches[0].clientX;
    });
    window.addEventListener('touchmove', (e: TouchEvent) => {
        if (!this.isDragging) return;
        const delta = e.touches[0].clientX - this.prevMouse.x;
        this.playerGroup.rotation.y += delta * 0.01;
        this.prevMouse.x = e.touches[0].clientX;
    });
    window.addEventListener('touchend', () => this.isDragging = false);

    this.animate();
  }

  createPlayerMesh() {
    // Same mesh logic, duplicated to be self-contained or could share via another util service
    const group = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcd38 }); 
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x0088ff });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
    torso.position.y = 1;
    torso.name = 'torso';
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat.clone());
    head.position.y = 2.6;
    head.name = 'head';
    head.castShadow = true;
    group.add(head);

    const createLimb = (w: number, h: number, d: number, mat: any, x: number, y: number, name: string) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.y = -h/2;
        mesh.castShadow = true;
        const g = new THREE.Group();
        g.position.set(x, y, 0);
        g.name = name;
        g.add(mesh);
        return g;
    };

    group.add(createLimb(1, 2, 1, skinMat, -1.5, 2, 'armL'));
    group.add(createLimb(1, 2, 1, skinMat, 1.5, 2, 'armR'));
    group.add(createLimb(1, 2, 1, pantsMat, -0.5, 0, 'legL'));
    group.add(createLimb(1, 2, 1, pantsMat, 0.5, 0, 'legR'));

    return group;
  }

  updateAppearance() {
     if (!this.playerGroup) return;
    const user = this.dataService.user();
    
    const clothesItem = this.dataService.getItem(user.avatar.clothes);
    const torso = this.playerGroup.getObjectByName('torso');
    if (torso && clothesItem && clothesItem.color) {
        torso.material.color.setHex(clothesItem.color);
    }
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const t = Date.now() * 0.002;
    if(this.playerGroup) {
        // Idle animation
        const armL = this.playerGroup.getObjectByName('armL');
        const armR = this.playerGroup.getObjectByName('armR');
        if(armL) armL.rotation.z = Math.sin(t) * 0.05 + 0.1;
        if(armR) armR.rotation.z = -Math.sin(t) * 0.05 - 0.1;
        
        // Slight rotation if not dragging
        if (!this.isDragging) {
            this.playerGroup.rotation.y += 0.005;
        }
    }

    if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
    }
  }

  cleanup() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
  }
}