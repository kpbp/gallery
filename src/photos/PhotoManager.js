import * as THREE from "three";
import { EventEmitter } from "../utils/EventEmitter.js";
import { PhotoLoader } from "./PhotoLoader.js";
import { PhotoMesh } from "./PhotoMesh.js";
import { PhotoScatterer } from "./PhotoScatterer.js";

/**
 * Photo Manager
 * Manages photo loading, creation, and positioning in the 3D scene
 */
export class PhotoManager extends EventEmitter {
  constructor(scene) {
    super();
    this.scene = scene;

    // Components
    this.photoLoader = new PhotoLoader();
    this.photoScatterer = new PhotoScatterer();

    // Photo data and meshes
    this.photoData = [];
    this.photoMeshes = [];
    this.selectedPhoto = null;

    // Scene group for photos
    this.photosGroup = new THREE.Group();
    this.photosGroup.name = "Photos";
    this.scene.add(this.photosGroup);

    // Table bounds (will be set by scene manager)
    this.tableBounds = null;

    // Camera reference (will be set by GalleryApp)
    this.camera = null;
  }

  async init() {
    try {
      // Load photo data
      this.photoData = await this.photoLoader.loadPhotos();
      console.log(`Loaded ${this.photoData.length} photos`);

      if (this.photoData.length === 0) {
        console.warn("No photos found. Creating sample photos.");
        this.createSamplePhotos();
      }

      // Create photo meshes
      this.createPhotoMeshes();

      // Scatter photos on table
      this.scatterPhotos();

      console.log("Photo manager initialized");
    } catch (error) {
      console.error("Failed to initialize photo manager:", error);
      // Create sample photos as fallback
      this.createSamplePhotos();
      this.createPhotoMeshes();
      this.scatterPhotos();
    }
  }

  setTableBounds(bounds) {
    this.tableBounds = bounds;
    this.photoScatterer.setTableBounds(bounds);
  }

  setCamera(camera) {
    this.camera = camera;
    // Update all existing photo meshes with camera reference
    this.photoMeshes.forEach((photoMesh) => {
      photoMesh.setCamera(camera);
    });
  }

  createSamplePhotos() {
    // Create sample photo data for testing with more realistic variety
    const samplePhotos = [
      {
        id: "sample1",
        texture: this.createSampleTexture(0xff6b6b, "Sunset Landscape"),
        aspectRatio: 1.5,
        metadata: {
          title: "Golden Hour Valley",
          description: "A breathtaking sunset over rolling hills",
          date: "2024-01-15",
          dimensions: { width: 1920, height: 1280 },
        },
      },
      {
        id: "sample2",
        texture: this.createSampleTexture(0x4ecdc4, "Ocean Portrait"),
        aspectRatio: 1.33,
        metadata: {
          title: "Coastal Serenity",
          description: "Peaceful ocean waves at dawn",
          date: "2024-02-20",
          dimensions: { width: 1600, height: 1200 },
        },
      },
      {
        id: "sample3",
        texture: this.createSampleTexture(0x45b7d1, "Urban Square"),
        aspectRatio: 1.0,
        metadata: {
          title: "City Life",
          description: "Modern architecture meets street art",
          date: "2024-03-10",
          dimensions: { width: 1080, height: 1080 },
        },
      },
      {
        id: "sample4",
        texture: this.createSampleTexture(0xf9ca24, "Mountain Vista"),
        aspectRatio: 1.77,
        metadata: {
          title: "Alpine Adventure",
          description: "Snow-capped peaks in morning light",
          date: "2024-03-05",
          dimensions: { width: 1920, height: 1080 },
        },
      },
      {
        id: "sample5",
        texture: this.createSampleTexture(0x6c5ce7, "Forest Detail"),
        aspectRatio: 0.8,
        metadata: {
          title: "Woodland Macro",
          description: "Delicate forest flora in soft focus",
          date: "2024-02-28",
          dimensions: { width: 1200, height: 1500 },
        },
      },
      {
        id: "sample6",
        texture: this.createSampleTexture(0xe17055, "Desert Dunes"),
        aspectRatio: 1.6,
        metadata: {
          title: "Sahara Dreams",
          description: "Endless sand dunes under starlit sky",
          date: "2024-01-08",
          dimensions: { width: 1920, height: 1200 },
        },
      },
      {
        id: "sample7",
        texture: this.createSampleTexture(0x2d3436, "Night Street"),
        aspectRatio: 1.25,
        metadata: {
          title: "Neon Reflections",
          description: "Rain-soaked city streets at midnight",
          date: "2024-03-18",
          dimensions: { width: 1500, height: 1200 },
        },
      },
      {
        id: "sample8",
        texture: this.createSampleTexture(0x00b894, "Tropical Paradise"),
        aspectRatio: 1.4,
        metadata: {
          title: "Island Escape",
          description: "Crystal clear waters and palm trees",
          date: "2024-02-14",
          dimensions: { width: 1680, height: 1200 },
        },
      },
    ];

    this.photoData = samplePhotos;
  }

  createSampleTexture(color, text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    // Convert color to RGB components
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;

    // Fill with completely solid color - no noise, no patterns, nothing
    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
    context.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.NearestFilter; // Use nearest filter to avoid any interpolation artifacts
    texture.magFilter = THREE.NearestFilter;
    texture.encoding = THREE.sRGBEncoding;
    texture.generateMipmaps = false; // Disable mipmaps to avoid any filtering issues

    return texture;
  }

  createPhotoMeshes() {
    this.photoMeshes = [];

    this.photoData.forEach((photoData, index) => {
      const photoMesh = new PhotoMesh(photoData, index);

      // Set camera reference if available
      if (this.camera) {
        photoMesh.setCamera(this.camera);
      }

      this.photoMeshes.push(photoMesh);
      this.photosGroup.add(photoMesh.mesh);

      // No need for event listeners since we handle selection directly
    });
  }

  scatterPhotos() {
    if (!this.tableBounds) {
      console.warn("Table bounds not set, using default positions");
      this.setDefaultPositions();
      return;
    }

    const positions = this.photoScatterer.generatePositions(
      this.photoMeshes.length,
    );

    this.photoMeshes.forEach((photoMesh, index) => {
      if (positions[index]) {
        const position = positions[index].position || positions[index];
        photoMesh.setPosition(position);
      }
    });
  }

  setDefaultPositions() {
    // Fallback positioning if table bounds not available
    this.photoMeshes.forEach((photoMesh, index) => {
      const angle = (index / this.photoMeshes.length) * Math.PI * 2;
      const radius = 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      photoMesh.setPosition(new THREE.Vector3(x, 0.85, z));
    });
  }

  selectPhoto(photoMesh) {
    // Always deselect current photo first (if any)
    if (this.selectedPhoto) {
      this.selectedPhoto.deselect();
    }

    // Only select the new photo if it's different from the current one
    if (this.selectedPhoto !== photoMesh) {
      this.selectedPhoto = photoMesh;
      photoMesh.select();
      this.emit("photoSelected", photoMesh.photoData);
    } else {
      // If clicking the same photo, just deselect it
      this.selectedPhoto = null;
      this.emit("photoDeselected");
    }
  }

  deselectPhoto() {
    if (this.selectedPhoto) {
      this.selectedPhoto.deselect();
      this.selectedPhoto = null;
      this.emit("photoDeselected");
    }
  }

  shufflePhotos() {
    if (!this.tableBounds) return;

    // Generate new positions
    const positions = this.photoScatterer.generatePositions(
      this.photoMeshes.length,
    );

    // Animate photos to new positions
    this.photoMeshes.forEach((photoMesh, index) => {
      if (positions[index]) {
        const position = positions[index].position || positions[index];
        photoMesh.animateToPosition(position, 1500);
      }
    });

    this.emit("photosShuffled");
  }

  getPhotoAt(position) {
    // Find photo at given world position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(position, this.scene.camera);

    const photoMeshObjects = this.photoMeshes.map((pm) => pm.mesh);
    const intersects = raycaster.intersectObjects(photoMeshObjects);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      return this.photoMeshes.find((pm) => pm.mesh === mesh);
    }

    return null;
  }

  update(deltaTime) {
    // Update all photo meshes
    this.photoMeshes.forEach((photoMesh) => {
      photoMesh.update(deltaTime);
    });
  }

  // Performance optimization methods
  setLODLevel(level) {
    this.photoMeshes.forEach((photoMesh) => {
      photoMesh.setLODLevel(level);
    });
  }

  setVisibilityDistance(distance) {
    this.photoMeshes.forEach((photoMesh) => {
      photoMesh.setVisibilityDistance(distance);
    });
  }

  dispose() {
    // Clean up photo meshes
    this.photoMeshes.forEach((photoMesh) => {
      photoMesh.dispose();
    });

    // Remove from scene
    this.scene.remove(this.photosGroup);

    // Clean up photo data
    this.photoData.forEach((photo) => {
      if (photo.texture) {
        photo.texture.dispose();
      }
    });

    this.photoMeshes = [];
    this.photoData = [];
    this.selectedPhoto = null;
  }
}
