# Technical Implementation Specification

## Core Dependencies

### Package.json Configuration

```json
{
  "name": "3d-photo-gallery",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.160.0",
    "three-stdlib": "^2.28.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@types/three": "^0.160.0"
  }
}
```

## Scene Configuration

### Camera Setup

```javascript
// Optimal camera positioning for gallery viewing
const camera = new THREE.PerspectiveCamera(
  45, // FOV - natural viewing angle
  window.innerWidth / window.innerHeight,
  0.1, // Near plane
  100, // Far plane
);

// Initial position: elevated view of table
camera.position.set(0, 3, 5);
camera.lookAt(0, 0.8, 0); // Focus on table surface
```

### Renderer Configuration

```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
```

## Lighting System Design

### Museum-Quality Lighting Setup

```javascript
class MuseumLighting {
  constructor(scene) {
    this.scene = scene;
    this.setupPrimaryLighting();
    this.setupSecondaryLighting();
    this.setupAmbientLighting();
  }

  setupPrimaryLighting() {
    // Main gallery lighting - soft box effect
    const primaryLight = new THREE.DirectionalLight(0xffffff, 1.5);
    primaryLight.position.set(0, 8, 2);
    primaryLight.target.position.set(0, 0.8, 0);

    // Soft shadows
    primaryLight.castShadow = true;
    primaryLight.shadow.mapSize.width = 2048;
    primaryLight.shadow.mapSize.height = 2048;
    primaryLight.shadow.camera.near = 0.5;
    primaryLight.shadow.camera.far = 15;
    primaryLight.shadow.camera.left = -8;
    primaryLight.shadow.camera.right = 8;
    primaryLight.shadow.camera.top = 8;
    primaryLight.shadow.camera.bottom = -8;
    primaryLight.shadow.radius = 8;
    primaryLight.shadow.blurSamples = 25;

    this.scene.add(primaryLight);
    this.scene.add(primaryLight.target);
  }

  setupSecondaryLighting() {
    // Rim lighting for photo edges
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight1.position.set(-5, 4, -3);

    const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight2.position.set(5, 4, -3);

    this.scene.add(rimLight1, rimLight2);
  }

  setupAmbientLighting() {
    // Soft ambient fill
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Environment lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemisphereLight);
  }
}
```

## Gallery Room Implementation

### Room Geometry and Materials

```javascript
class GalleryRoom {
  constructor() {
    this.group = new THREE.Group();
    this.createWalls();
    this.createFloor();
    this.createCeiling();
  }

  createWalls() {
    const wallMaterial = new THREE.MeshLambertMaterial({
      color: 0xf8f8f8,
      roughness: 0.8,
    });

    // Back wall
    const backWall = new THREE.PlaneGeometry(12, 4);
    const backWallMesh = new THREE.Mesh(backWall, wallMaterial);
    backWallMesh.position.set(0, 2, -4);
    backWallMesh.receiveShadow = true;

    // Side walls
    const sideWall = new THREE.PlaneGeometry(8, 4);

    const leftWallMesh = new THREE.Mesh(sideWall, wallMaterial);
    leftWallMesh.position.set(-6, 2, 0);
    leftWallMesh.rotation.y = Math.PI / 2;
    leftWallMesh.receiveShadow = true;

    const rightWallMesh = new THREE.Mesh(sideWall, wallMaterial);
    rightWallMesh.position.set(6, 2, 0);
    rightWallMesh.rotation.y = -Math.PI / 2;
    rightWallMesh.receiveShadow = true;

    this.group.add(backWallMesh, leftWallMesh, rightWallMesh);
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(12, 8);
    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe0e0e0,
      roughness: 0.1,
      metalness: 0.0,
      reflectivity: 0.3,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    this.group.add(floor);
  }
}
```

## Marble Table Implementation

### Realistic Marble Material

```javascript
class MarbleTable {
  constructor() {
    this.group = new THREE.Group();
    this.createTableTop();
    this.createTableLegs();
  }

  createTableTop() {
    const tableGeometry = new THREE.BoxGeometry(3, 0.1, 2);

    // Marble material with realistic properties
    const marbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5f5f5,
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.5,
      ior: 1.5,
    });

    // Add marble texture (to be loaded)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "./assets/textures/marble/marble_diffuse.jpg",
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 1.5);
        marbleMaterial.map = texture;
      },
    );

    const tableTop = new THREE.Mesh(tableGeometry, marbleMaterial);
    tableTop.position.set(0, 0.8, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;

    this.group.add(tableTop);
  }

  createTableLegs() {
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
    const legMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd0d0d0,
      roughness: 0.2,
      metalness: 0.1,
    });

    const legPositions = [
      [-1.3, 0.4, -0.8],
      [1.3, 0.4, -0.8],
      [-1.3, 0.4, 0.8],
      [1.3, 0.4, 0.8],
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.group.add(leg);
    });
  }

  getTableBounds() {
    return {
      minX: -1.5,
      maxX: 1.5,
      minZ: -1.0,
      maxZ: 1.0,
      y: 0.85,
    };
  }
}
```

## Photo System Implementation

### Dynamic Photo Loading

```javascript
class PhotoLoader {
  constructor() {
    this.photos = [];
    this.textureLoader = new THREE.TextureLoader();
  }

  async loadPhotosFromFolder(folderPath) {
    try {
      // Get photo manifest (this would need a build-time script)
      const response = await fetch("./assets/photo-manifest.json");
      const manifest = await response.json();

      const loadPromises = manifest.photos.map((photo) =>
        this.loadSinglePhoto(photo),
      );

      this.photos = await Promise.all(loadPromises);
      return this.photos;
    } catch (error) {
      console.error("Failed to load photos:", error);
      return [];
    }
  }

  async loadSinglePhoto(photoData) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        photoData.path,
        (texture) => {
          const photo = {
            texture,
            aspectRatio: texture.image.width / texture.image.height,
            metadata: photoData.metadata || {},
          };
          resolve(photo);
        },
        undefined,
        reject,
      );
    });
  }
}
```

### Photo Mesh Creation

```javascript
class PhotoMesh {
  constructor(photoData, position) {
    this.photoData = photoData;
    this.position = position;
    this.mesh = this.createMesh();
    this.isDragging = false;
    this.isSelected = false;
    this.originalPosition = position.clone();
  }

  createMesh() {
    const { texture, aspectRatio } = this.photoData;

    // Standard photo size with aspect ratio
    const photoWidth = Math.min(0.4, 0.3 * aspectRatio);
    const photoHeight = photoWidth / aspectRatio;

    const geometry = new THREE.PlaneGeometry(photoWidth, photoHeight);

    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      transparent: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    mesh.rotation.x = -Math.PI / 2; // Lay flat on table
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add reference for interaction
    mesh.userData = { photoMesh: this };

    return mesh;
  }

  animateToPosition(targetPosition, duration = 1000) {
    const startPosition = this.mesh.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);

      this.mesh.position.lerpVectors(startPosition, targetPosition, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  liftAndRotate() {
    this.isSelected = true;
    const targetPosition = this.mesh.position.clone();
    targetPosition.y += 0.5;

    this.animateToPosition(targetPosition);

    // Rotate to face camera
    const targetRotation = new THREE.Euler(0, 0, 0);
    this.animateRotation(targetRotation);
  }

  returnToTable() {
    this.isSelected = false;
    this.animateToPosition(this.originalPosition);

    // Return to flat position
    const targetRotation = new THREE.Euler(-Math.PI / 2, 0, 0);
    this.animateRotation(targetRotation);
  }
}
```

## Interaction System

### Drag and Drop Controller

```javascript
class DragController {
  constructor(camera, scene, tableBounds) {
    this.camera = camera;
    this.scene = scene;
    this.tableBounds = tableBounds;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -tableBounds.y,
    );
    this.isDragging = false;
    this.draggedPhoto = null;
    this.dragOffset = new THREE.Vector3();

    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
  }

  onMouseDown(event) {
    this.updateMousePosition(event);

    const intersects = this.getIntersectedPhotos();
    if (intersects.length > 0) {
      const photoMesh = intersects[0].object.userData.photoMesh;

      if (!photoMesh.isSelected) {
        this.startDragging(photoMesh, intersects[0].point);
      }
    }
  }

  startDragging(photoMesh, intersectionPoint) {
    this.isDragging = true;
    this.draggedPhoto = photoMesh;
    photoMesh.isDragging = true;

    // Calculate offset from photo center to click point
    this.dragOffset.copy(intersectionPoint).sub(photoMesh.mesh.position);

    // Disable camera controls
    this.scene.cameraControls.enabled = false;
  }

  onMouseMove(event) {
    if (!this.isDragging || !this.draggedPhoto) return;

    this.updateMousePosition(event);

    // Project mouse to table plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectionPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);

    // Apply offset and bounds checking
    const newPosition = intersectionPoint.sub(this.dragOffset);
    newPosition.x = Math.max(
      this.tableBounds.minX,
      Math.min(this.tableBounds.maxX, newPosition.x),
    );
    newPosition.z = Math.max(
      this.tableBounds.minZ,
      Math.min(this.tableBounds.maxZ, newPosition.z),
    );
    newPosition.y = this.tableBounds.y;

    this.draggedPhoto.mesh.position.copy(newPosition);
  }

  onMouseUp() {
    if (this.isDragging && this.draggedPhoto) {
      this.draggedPhoto.isDragging = false;
      this.draggedPhoto.originalPosition.copy(this.draggedPhoto.mesh.position);
      this.draggedPhoto = null;
      this.isDragging = false;

      // Re-enable camera controls
      this.scene.cameraControls.enabled = true;
    }
  }
}
```

## Performance Optimization Strategies

### Level of Detail (LOD) System

```javascript
class PhotoLODManager {
  constructor(camera) {
    this.camera = camera;
    this.photos = [];
    this.lodLevels = {
      high: { distance: 5, resolution: 1.0 },
      medium: { distance: 10, resolution: 0.5 },
      low: { distance: 20, resolution: 0.25 },
    };
  }

  updateLOD() {
    this.photos.forEach((photo) => {
      const distance = this.camera.position.distanceTo(photo.mesh.position);

      let targetLOD = "low";
      if (distance < this.lodLevels.high.distance) targetLOD = "high";
      else if (distance < this.lodLevels.medium.distance) targetLOD = "medium";

      this.applyLOD(photo, targetLOD);
    });
  }

  applyLOD(photo, level) {
    if (photo.currentLOD === level) return;

    const resolution = this.lodLevels[level].resolution;
    // Implement texture resolution switching logic here
    photo.currentLOD = level;
  }
}
```

### Memory Management

```javascript
class ResourceManager {
  constructor() {
    this.textureCache = new Map();
    this.geometryCache = new Map();
    this.materialCache = new Map();
  }

  getTexture(path) {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path);
    }

    const texture = new THREE.TextureLoader().load(path);
    this.textureCache.set(path, texture);
    return texture;
  }

  dispose() {
    // Clean up all cached resources
    this.textureCache.forEach((texture) => texture.dispose());
    this.geometryCache.forEach((geometry) => geometry.dispose());
    this.materialCache.forEach((material) => material.dispose());

    this.textureCache.clear();
    this.geometryCache.clear();
    this.materialCache.clear();
  }
}
```

## Build Configuration

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ["three", "three-stdlib"],
  },
});
```

This technical specification provides the detailed implementation guidelines needed to build your 3D photo gallery. Each component is designed to work together seamlessly while maintaining high performance and visual quality.
