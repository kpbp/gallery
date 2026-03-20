import * as THREE from "three";
import { GalleryRoom } from "../environment/GalleryRoom.js";
import { MarbleTable } from "../environment/MarbleTable.js";
import { MuseumLighting } from "../environment/MuseumLighting.js";

/**
 * Scene Manager
 * Manages the 3D scene setup, environment, and lighting
 */
export class SceneManager {
  constructor(scene) {
    this.scene = scene;

    // Environment components
    this.galleryRoom = null;
    this.marbleTable = null;
    this.lighting = null;

    // Scene objects
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = "Environment";

    this.scene.add(this.environmentGroup);
  }

  async init() {
    try {
      // Create gallery room
      this.galleryRoom = new GalleryRoom();
      await this.galleryRoom.init();
      this.environmentGroup.add(this.galleryRoom.group);

      // Create marble table
      this.marbleTable = new MarbleTable();
      await this.marbleTable.init();
      this.environmentGroup.add(this.marbleTable.group);

      // Set up museum lighting
      this.lighting = new MuseumLighting(this.scene);
      this.lighting.setGalleryRoom(this.galleryRoom);
      this.lighting.init();

      console.log("Scene environment initialized");
    } catch (error) {
      console.error("Failed to initialize scene:", error);
      throw error;
    }
  }

  getTableBounds() {
    return this.marbleTable ? this.marbleTable.getTableBounds() : null;
  }

  getTableSurface() {
    return this.marbleTable ? this.marbleTable.getTableSurface() : null;
  }

  update(deltaTime) {
    // Update any animated elements
    if (this.lighting) {
      this.lighting.update(deltaTime);
    }
  }

  toggleDimLights(postProcessing) {
    console.log("SceneManager: toggleDimLights called");
    if (this.lighting) {
      this.lighting.setDimLighting(null, postProcessing);
    } else {
      console.log("SceneManager: No lighting system found");
    }
  }

  dispose() {
    // Clean up resources
    if (this.galleryRoom) {
      this.galleryRoom.dispose();
    }

    if (this.marbleTable) {
      this.marbleTable.dispose();
    }

    if (this.lighting) {
      this.lighting.dispose();
    }

    // Remove from scene
    this.scene.remove(this.environmentGroup);

    // Dispose geometry and materials
    this.environmentGroup.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
