import * as THREE from "three";

/**
 * Photo Loader
 * Handles loading photos from the assets folder and creating textures
 */
export class PhotoLoader {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.loadedPhotos = [];
    this.supportedFormats = ["jpg", "jpeg", "png", "webp"];
  }

  async loadPhotos() {
    try {
      // Try to load from manifest first
      const photos = await this.loadFromManifest();
      if (photos.length > 0) {
        return photos;
      }

      // Fallback to predefined photo list
      return await this.loadPredefinedPhotos();
    } catch (error) {
      console.error("Failed to load photos:", error);
      return [];
    }
  }

  async loadFromManifest() {
    try {
      const base = import.meta.env.BASE_URL || "./";
      const response = await fetch(`${base}assets/photo-manifest.json`);
      if (!response.ok) {
        throw new Error("Manifest not found");
      }

      const manifest = await response.json();
      const loadPromises = manifest.photos.map((photoInfo) =>
        this.loadSinglePhoto(photoInfo),
      );

      const results = await Promise.allSettled(loadPromises);
      return results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
    } catch (error) {
      console.warn("Could not load from manifest:", error.message);
      return [];
    }
  }

  async loadPredefinedPhotos() {
    // Predefined list of photos to try loading
    const photoPaths = [
      "./assets/photos/photo1.jpg",
      "./assets/photos/photo2.jpg",
      "./assets/photos/photo3.jpg",
      "./assets/photos/photo4.jpg",
      "./assets/photos/photo5.jpg",
      "./assets/photos/photo6.jpg",
      "./assets/photos/photo7.jpg",
      "./assets/photos/photo8.jpg",
      "./assets/photos/photo9.jpg",
      "./assets/photos/photo10.jpg",
    ];

    const loadPromises = photoPaths.map((path, index) => {
      const photoInfo = {
        id: `photo_${index + 1}`,
        path: path,
        metadata: {
          title: `Photo ${index + 1}`,
          description: `Professional photograph ${index + 1}`,
          date: new Date().toISOString().split("T")[0],
        },
      };
      return this.loadSinglePhoto(photoInfo);
    });

    const results = await Promise.allSettled(loadPromises);
    return results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  }

  async loadSinglePhoto(photoInfo) {
    return new Promise((resolve, reject) => {
      const base = import.meta.env.BASE_URL || "./";
      const path = photoInfo.path.replace(/^\.\//, base);
      this.textureLoader.load(
        path,
        (texture) => {
          // Configure texture
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.encoding = THREE.sRGBEncoding;
          texture.flipY = false;

          // Calculate aspect ratio
          const aspectRatio = texture.image.width / texture.image.height;

          // Create photo data object
          const photoData = {
            id: photoInfo.id,
            texture: texture,
            aspectRatio: aspectRatio,
            metadata: {
              title: photoInfo.metadata?.title || "Untitled",
              description: photoInfo.metadata?.description || "",
              date: photoInfo.metadata?.date || "",
              dimensions: {
                width: texture.image.width,
                height: texture.image.height,
              },
              fileSize: this.estimateFileSize(texture.image),
              path: photoInfo.path,
            },
          };

          resolve(photoData);
        },
        (progress) => {
          // Loading progress (optional)
          console.log(
            `Loading ${photoInfo.path}: ${(progress.loaded / progress.total) * 100}%`,
          );
        },
        (error) => {
          console.warn(`Failed to load photo: ${photoInfo.path}`, error);
          reject(error);
        },
      );
    });
  }

  estimateFileSize(image) {
    // Rough estimate of file size based on dimensions
    const pixels = image.width * image.height;
    const bytesPerPixel = 3; // Assuming RGB
    return Math.round((pixels * bytesPerPixel) / 1024); // KB
  }

  // Create optimized texture for different LOD levels
  createLODTexture(originalTexture, scale = 0.5) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const newWidth = Math.max(
      64,
      Math.floor(originalTexture.image.width * scale),
    );
    const newHeight = Math.max(
      64,
      Math.floor(originalTexture.image.height * scale),
    );

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.drawImage(originalTexture.image, 0, 0, newWidth, newHeight);

    const lodTexture = new THREE.CanvasTexture(canvas);
    lodTexture.wrapS = THREE.ClampToEdgeWrapping;
    lodTexture.wrapT = THREE.ClampToEdgeWrapping;
    lodTexture.minFilter = THREE.LinearFilter;
    lodTexture.magFilter = THREE.LinearFilter;
    lodTexture.encoding = THREE.sRGBEncoding;

    return lodTexture;
  }

  // Preload photos for better performance
  async preloadPhotos(photoPaths) {
    const preloadPromises = photoPaths.map((path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(path);
        img.onerror = () => resolve(null);
        img.src = path;
      });
    });

    const results = await Promise.all(preloadPromises);
    return results.filter((path) => path !== null);
  }

  // Validate image format
  isValidImageFormat(filename) {
    const extension = filename.split(".").pop().toLowerCase();
    return this.supportedFormats.includes(extension);
  }

  // Get photo metadata from EXIF (if available)
  async extractMetadata(file) {
    // This would require an EXIF library
    // For now, return basic metadata
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: "",
      date: new Date().toISOString().split("T")[0],
      camera: "Unknown",
      settings: {},
    };
  }

  dispose() {
    // Clean up loaded textures
    this.loadedPhotos.forEach((photo) => {
      if (photo.texture) {
        photo.texture.dispose();
      }
    });
    this.loadedPhotos = [];
  }
}
