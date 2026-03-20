import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "../interaction/InteractionManager.js";
import { PhotoManager } from "../photos/PhotoManager.js";
import { PostProcessing } from "./PostProcessing.js";
import { SceneManager } from "../scene/SceneManager.js";
import { UIManager } from "../ui/UIManager.js";
import { EventEmitter } from "../utils/EventEmitter.js";

/**
 * Main Gallery Application Class
 * Orchestrates all components of the 3D photo gallery
 */
export class GalleryApp extends EventEmitter {
  constructor() {
    super();

    // Core components
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;

    // Managers
    this.sceneManager = null;
    this.photoManager = null;
    this.interactionManager = null;
    this.uiManager = null;

    // State
    this.isInitialized = false;
    this.isPaused = false;
    this.animationId = null;

    // Performance monitoring
    this.stats = {
      frameCount: 0,
      lastTime: 0,
      fps: 0,
    };

    this.clock = new THREE.Clock();
  }

  async init() {
    try {
      // Initialize core Three.js components
      this.initRenderer();
      this.initScene();
      this.initCamera();
      this.initControls();

      // Initialize managers
      this.sceneManager = new SceneManager(this.scene);
      this.photoManager = new PhotoManager(this.scene);
      this.interactionManager = new InteractionManager(
        this.camera,
        this.scene,
        this.canvas,
        this.controls,
      );
      this.uiManager = new UIManager();

      // Set up event listeners between components
      this.setupEventListeners();

      // Initialize scene environment
      await this.sceneManager.init();

      this.emit("loadProgress", 30);

      // Set table bounds for photo manager
      const tableBounds = this.sceneManager.getTableBounds();
      if (tableBounds) {
        this.photoManager.setTableBounds(tableBounds);
        this.interactionManager.setTableBounds(tableBounds);
      }

      // Set camera reference for enhanced photo viewing
      this.photoManager.setCamera(this.camera);

      // Connect InteractionManager with PhotoManager
      this.interactionManager.setPhotoManager(this.photoManager);

      // Load and initialize photos
      await this.photoManager.init();
      this.emit("loadProgress", 70);

      // Initialize interactions
      this.interactionManager.init();
      this.emit("loadProgress", 90);

      // Initialize UI
      this.uiManager.init();
      this.emit("loadProgress", 100);

      // Initialize post-processing pipeline
      this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
      this.postProcessing.init();

      // Start render loop
      this.startRenderLoop();

      this.isInitialized = true;
      console.log("Gallery app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize gallery app:", error);
      throw error;
    }
  }

  initRenderer() {
    this.canvas = document.getElementById("gallery-canvas");
    if (!this.canvas) {
      throw new Error("Canvas element not found");
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // SMAA post-processing replaces built-in AA
      alpha: false,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    // Set tone mapping for realistic lighting
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Enable physically correct lighting
    this.renderer.physicallyCorrectLights = true;

    // Set output encoding
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Exponential fog for natural depth falloff
    this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);

    // Environment map — custom scene with only a window light panel
    // This ensures reflections on PBR materials only show the window, not generic white panels
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x222222);

    // Warm light panel matching the window position on the right wall (x=6, y=2.2, z=0, 3×2)
    const windowPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 2),
      new THREE.MeshBasicMaterial({ color: 0xfdfbd3, side: THREE.DoubleSide }),
    );
    windowPanel.position.set(6, 2.2, 0);
    windowPanel.rotation.y = -Math.PI / 2;
    envScene.add(windowPanel);

    this.scene.environment = pmremGenerator.fromScene(envScene).texture;
    envScene.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    pmremGenerator.dispose();
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      100, // Far plane
    );

    // Position camera for optimal gallery viewing
    this.camera.position.set(0, 3, 5);
    this.camera.lookAt(0, 0.8, 0); // Focus on table surface
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);

    // Configure controls for gallery viewing
    this.controls.target.set(0, 0.8, 0); // Focus on table
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Limit camera movement
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.minPolarAngle = Math.PI / 6; // 30 degrees from top
    this.controls.maxPolarAngle = Math.PI / 2.2; // Almost horizontal

    // Smooth controls
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;

    // Auto-rotate when idle (optional)
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
  }

  setupEventListeners() {
    // Photo selection events
    this.interactionManager.on("photoSelected", (photo) => {
      this.uiManager.showPhotoInfo(photo);
      this.controls.enabled = false; // Disable camera controls
    });

    this.interactionManager.on("photoDeselected", () => {
      this.uiManager.hidePhotoInfo();
      this.controls.enabled = true; // Re-enable camera controls
    });

    // Photo drag events
    this.interactionManager.on("photoDragStart", () => {
      this.controls.enabled = false;
    });

    this.interactionManager.on("photoDragEnd", () => {
      this.controls.enabled = true;
    });

    // UI control events
    this.uiManager.on("resetView", () => {
      this.resetCameraView();
    });

    this.uiManager.on("shufflePhotos", () => {
      this.photoManager.shufflePhotos();
    });

    this.uiManager.on("toggleFullscreen", () => {
      this.toggleFullscreen();
    });

    this.uiManager.on("toggleDimLights", () => {
      this.sceneManager.toggleDimLights(this.postProcessing);
    });
  }

  startRenderLoop() {
    const animate = () => {
      if (!this.isPaused) {
        this.animationId = requestAnimationFrame(animate);
        this.render();
      }
    };
    animate();
  }

  render() {
    const deltaTime = this.clock.getDelta();

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Update managers
    if (this.photoManager) {
      this.photoManager.update(deltaTime);
    }

    if (this.interactionManager) {
      this.interactionManager.update(deltaTime);
    }

    // Update scene (lighting animations, etc.)
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime);
    }

    // Render through post-processing pipeline
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Update performance stats
    this.updateStats();
  }

  updateStats() {
    this.stats.frameCount++;
    const currentTime = performance.now();

    if (currentTime >= this.stats.lastTime + 1000) {
      this.stats.fps = Math.round(
        (this.stats.frameCount * 1000) / (currentTime - this.stats.lastTime),
      );
      this.stats.frameCount = 0;
      this.stats.lastTime = currentTime;

      // Emit performance data
      this.emit("performanceUpdate", {
        fps: this.stats.fps,
        memory: this.getMemoryUsage(),
      });
    }
  }

  getMemoryUsage() {
    if (this.renderer && this.renderer.info) {
      return {
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
        programs: this.renderer.info.programs?.length || 0,
      };
    }
    return null;
  }

  handleResize() {
    if (!this.isInitialized) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Update post-processing
    if (this.postProcessing) {
      this.postProcessing.resize(width, height);
    }
  }

  handleKeyboard(event) {
    if (!this.isInitialized) return;

    switch (event.code) {
      case "KeyR":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.resetCameraView();
        }
        break;
      case "KeyS":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.photoManager.shufflePhotos();
        }
        break;
      case "Escape":
        this.photoManager.deselectPhoto();
        break;
      case "F11":
        event.preventDefault();
        this.toggleFullscreen();
        break;
    }
  }

  resetCameraView() {
    if (!this.controls) return;

    // Animate camera back to default position
    const targetPosition = new THREE.Vector3(0, 3, 5);
    const targetLookAt = new THREE.Vector3(0, 0.8, 0);

    this.animateCameraTo(targetPosition, targetLookAt);
  }

  animateCameraTo(position, target, duration = 1000) {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, position, eased);
      this.controls.target.lerpVectors(startTarget, target, eased);

      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Failed to exit fullscreen:", err);
      });
    }
  }

  pause() {
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startRenderLoop();
    }
  }

  dispose() {
    // Clean up resources
    this.pause();

    if (this.sceneManager) {
      this.sceneManager.dispose();
    }

    if (this.photoManager) {
      this.photoManager.dispose();
    }

    if (this.interactionManager) {
      this.interactionManager.dispose();
    }

    if (this.postProcessing) {
      this.postProcessing.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    this.isInitialized = false;
  }
}
