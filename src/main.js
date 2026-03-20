import { GalleryApp } from "./core/GalleryApp.js";
import { ErrorHandler } from "./ui/ErrorHandler.js";
import { LoadingManager } from "./ui/LoadingManager.js";

/**
 * Main application entry point
 * Initializes the gallery with error handling and loading states
 */
class Main {
  constructor() {
    this.app = null;
    this.loadingManager = new LoadingManager();
    this.errorHandler = new ErrorHandler();

    this.init();
  }

  async init() {
    try {
      // Check WebGL support
      if (!this.checkWebGLSupport()) {
        throw new Error("WebGL is not supported in this browser");
      }

      // Show loading screen
      this.loadingManager.show();

      // Initialize the gallery application
      this.app = new GalleryApp();

      // Set up progress tracking
      this.app.on("loadProgress", (progress) => {
        this.loadingManager.updateProgress(progress);
      });

      // Initialize the app
      await this.app.init();

      // Hide loading screen
      this.loadingManager.hide();

      // Set up window event listeners
      this.setupEventListeners();

      console.log("Gallery initialized successfully");
    } catch (error) {
      console.error("Failed to initialize gallery:", error);
      this.errorHandler.show(error.message);
      this.loadingManager.hide();
    }
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener("resize", () => {
      if (this.app) {
        this.app.handleResize();
      }
    });

    // Handle visibility change (pause/resume)
    document.addEventListener("visibilitychange", () => {
      if (this.app) {
        if (document.hidden) {
          this.app.pause();
        } else {
          this.app.resume();
        }
      }
    });

    // Handle fullscreen changes
    document.addEventListener("fullscreenchange", () => {
      if (this.app) {
        this.app.handleResize();
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener("keydown", (event) => {
      if (this.app) {
        this.app.handleKeyboard(event);
      }
    });

    // Handle error retry
    this.errorHandler.onRetry(() => {
      this.errorHandler.hide();
      this.init();
    });

    // Prevent context menu on canvas
    const canvas = document.getElementById("gallery-canvas");
    if (canvas) {
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }
}

// Initialize the application when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new Main());
} else {
  new Main();
}

// Handle unhandled errors
window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
