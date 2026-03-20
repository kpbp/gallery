import * as THREE from "three";

/**
 * Texture Loader Utility
 * Handles loading texture files with fallbacks to procedural generation
 */
export class TextureLoader {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.loadedTextures = new Map();
  }

  /**
   * Load a texture with fallback to procedural generation
   * @param {string} path - Path to texture file
   * @param {Function} fallbackGenerator - Function to generate procedural texture
   * @param {Object} options - Texture options (wrapS, wrapT, repeat, etc.)
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(path, fallbackGenerator = null, options = {}) {
    // Check if already loaded
    if (this.loadedTextures.has(path)) {
      return this.loadedTextures.get(path);
    }

    try {
      // Try to load actual texture file
      const texture = await this.loadTextureFile(path);
      this.applyTextureOptions(texture, options);
      this.loadedTextures.set(path, texture);
      console.log(`Loaded texture: ${path}`);
      return texture;
    } catch (error) {
      console.warn(
        `Failed to load texture ${path}, using fallback:`,
        error.message,
      );

      // Use fallback generator if provided
      if (fallbackGenerator) {
        const fallbackTexture = fallbackGenerator();
        this.applyTextureOptions(fallbackTexture, options);
        this.loadedTextures.set(path, fallbackTexture);
        return fallbackTexture;
      }

      // Return a basic white texture as last resort
      const basicTexture = this.createBasicTexture();
      this.applyTextureOptions(basicTexture, options);
      this.loadedTextures.set(path, basicTexture);
      return basicTexture;
    }
  }

  /**
   * Load texture file using Three.js loader
   * @param {string} path
   * @returns {Promise<THREE.Texture>}
   */
  loadTextureFile(path) {
    const base = import.meta.env.BASE_URL || "./";
    const resolvedPath = path.replace(/^\.\//, base);
    return new Promise((resolve, reject) => {
      this.loader.load(
        resolvedPath,
        (texture) => resolve(texture),
        (progress) => {
          // Optional: handle loading progress
        },
        (error) => reject(error),
      );
    });
  }

  /**
   * Apply common texture options
   * @param {THREE.Texture} texture
   * @param {Object} options
   */
  applyTextureOptions(texture, options = {}) {
    // Default options
    const defaults = {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: [1, 1],
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      encoding: THREE.sRGBEncoding,
      flipY: false,
    };

    const settings = { ...defaults, ...options };

    texture.wrapS = settings.wrapS;
    texture.wrapT = settings.wrapT;
    texture.repeat.set(settings.repeat[0], settings.repeat[1]);
    texture.minFilter = settings.minFilter;
    texture.magFilter = settings.magFilter;
    texture.encoding = settings.encoding;
    texture.flipY = settings.flipY;
    texture.needsUpdate = true;
  }

  /**
   * Create a basic white texture as fallback
   * @returns {THREE.Texture}
   */
  createBasicTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 256);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Load multiple textures for PBR materials
   * @param {Object} texturePaths - Object with diffuse, normal, roughness paths
   * @param {Object} fallbackGenerators - Fallback functions for each texture type
   * @param {Object} options - Texture options
   * @returns {Promise<Object>} Object with loaded textures
   */
  async loadPBRTextures(texturePaths, fallbackGenerators = {}, options = {}) {
    const results = {};

    const loadPromises = Object.entries(texturePaths).map(
      async ([key, path]) => {
        const fallback = fallbackGenerators[key] || null;
        const texture = await this.loadTexture(path, fallback, options);
        results[key] = texture;
      },
    );

    await Promise.all(loadPromises);
    return results;
  }

  /**
   * Dispose of all loaded textures
   */
  dispose() {
    this.loadedTextures.forEach((texture) => {
      texture.dispose();
    });
    this.loadedTextures.clear();
  }
}

// Singleton instance
export const textureLoader = new TextureLoader();
