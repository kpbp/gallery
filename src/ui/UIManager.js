import { EventEmitter } from "../utils/EventEmitter.js";

/**
 * UI Manager
 * Handles all user interface interactions and displays
 */
export class UIManager extends EventEmitter {
  constructor() {
    super();

    // UI Elements
    this.photoInfo = document.getElementById("photo-info");
    this.photoTitle = document.getElementById("photo-title");
    this.photoDescription = document.getElementById("photo-description");
    this.photoDate = document.getElementById("photo-date");
    this.photoDimensions = document.getElementById("photo-dimensions");
    this.closePhotoBtn = document.getElementById("close-photo");

    // Control buttons
    this.resetViewBtn = document.getElementById("reset-view");
    this.shufflePhotosBtn = document.getElementById("shuffle-photos");
    this.fullscreenBtn = document.getElementById("fullscreen");
    this.dimLightsBtn = document.getElementById("dim-lights");

    this.currentPhoto = null;
  }

  init() {
    this.setupEventListeners();
    this.updateFullscreenIcon();
  }

  setupEventListeners() {
    // Photo info close button
    if (this.closePhotoBtn) {
      this.closePhotoBtn.addEventListener("click", () => {
        this.hidePhotoInfo();
        this.emit("closePhoto");
      });
    }

    // Control buttons
    if (this.resetViewBtn) {
      this.resetViewBtn.addEventListener("click", () => {
        this.emit("resetView");
      });
    }

    if (this.shufflePhotosBtn) {
      this.shufflePhotosBtn.addEventListener("click", () => {
        this.emit("shufflePhotos");
      });
    }

    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener("click", () => {
        this.emit("toggleFullscreen");
      });
    }

    if (this.dimLightsBtn) {
      this.dimLightsBtn.addEventListener("click", () => {
        console.log("Dim lights button clicked");
        this.emit("toggleDimLights");
      });
    }

    // Fullscreen change events
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenIcon();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
      if (event.code === "Escape" && this.currentPhoto) {
        this.hidePhotoInfo();
        this.emit("closePhoto");
      }
    });
  }

  showPhotoInfo(photo) {
    if (!this.photoInfo || !photo) return;

    this.currentPhoto = photo;

    // Update photo information
    if (this.photoTitle) {
      this.photoTitle.textContent = photo.metadata?.title || "Untitled";
    }

    if (this.photoDescription) {
      this.photoDescription.textContent = photo.metadata?.description || "";
    }

    if (this.photoDate) {
      this.photoDate.textContent = photo.metadata?.date || "";
    }

    if (this.photoDimensions && photo.metadata?.dimensions) {
      this.photoDimensions.textContent = `${photo.metadata.dimensions.width} × ${photo.metadata.dimensions.height}`;
    }

    // Show the panel
    this.photoInfo.classList.remove("hidden");
  }

  hidePhotoInfo() {
    if (this.photoInfo) {
      this.photoInfo.classList.add("hidden");
    }
    this.currentPhoto = null;
  }

  updateFullscreenIcon() {
    if (!this.fullscreenBtn) return;

    const isFullscreen = !!document.fullscreenElement;
    const icon = this.fullscreenBtn.querySelector("svg");

    if (icon) {
      if (isFullscreen) {
        // Exit fullscreen icon
        icon.innerHTML = `
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                `;
        this.fullscreenBtn.title = "Exit fullscreen";
      } else {
        // Enter fullscreen icon
        icon.innerHTML = `
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                `;
        this.fullscreenBtn.title = "Enter fullscreen";
      }
    }
  }

  showNotification(message, type = "info", duration = 3000) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: "fixed",
      top: "2rem",
      right: "2rem",
      background:
        type === "error" ? "rgba(239, 68, 68, 0.9)" : "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      padding: "1rem 1.5rem",
      borderRadius: "8px",
      backdropFilter: "blur(10px)",
      zIndex: "1000",
      transform: "translateX(100%)",
      transition: "transform 0.3s ease",
      maxWidth: "300px",
      wordWrap: "break-word",
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  setLoadingState(isLoading, message = "") {
    // Update UI to show loading state
    const controls = document.querySelectorAll(".control-btn");
    controls.forEach((btn) => {
      btn.disabled = isLoading;
      btn.style.opacity = isLoading ? "0.5" : "1";
    });

    if (isLoading && message) {
      this.showNotification(message, "info", 2000);
    }
  }

  updatePerformanceInfo(stats) {
    // Optional: Display performance information
    if (stats && window.location.search.includes("debug")) {
      console.log("Performance:", stats);
    }
  }
}
