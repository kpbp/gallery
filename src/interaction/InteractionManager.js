import * as THREE from "three";
import { EventEmitter } from "../utils/EventEmitter.js";

/**
 * Interaction Manager
 * Handles all user interactions including drag-and-drop, photo selection, and hover effects
 */
export class InteractionManager extends EventEmitter {
  constructor(camera, scene, canvas, controls) {
    super();

    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;
    this.controls = controls;

    // Raycasting for object picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.lastMouse = new THREE.Vector2();

    // Interaction state
    this.isDragging = false;
    this.draggedPhoto = null;
    this.hoveredPhoto = null;

    // Reference to PhotoManager for selection handling
    this.photoManager = null;

    // Drag plane for photo movement
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();

    // Touch support
    this.isTouch = false;
    this.touchStartTime = 0;
    this.touchMoved = false;

    // Performance optimization
    this.lastRaycastTime = 0;
    this.raycastThrottle = 16; // ~60fps

    this.setupEventListeners();
  }

  init() {
    console.log("Interaction manager initialized");
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("click", this.onClick.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this));
    this.canvas.addEventListener("touchmove", this.onTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.onTouchEnd.bind(this));

    // Prevent context menu
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Keyboard events
    document.addEventListener("keydown", this.onKeyDown.bind(this));

    // Window events
    window.addEventListener("blur", this.onWindowBlur.bind(this));
  }

  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getIntersectedPhotos() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all photo meshes from the scene
    const photoMeshes = [];
    this.scene.traverse((child) => {
      if (child.userData && child.userData.type === "photo") {
        photoMeshes.push(child);
      }
    });

    return this.raycaster.intersectObjects(photoMeshes);
  }

  onMouseDown(event) {
    if (event.button !== 0) return; // Only left mouse button

    this.updateMousePosition(event);
    this.lastMouse.copy(this.mouse);

    const intersects = this.getIntersectedPhotos();

    if (intersects.length > 0) {
      const photoMesh = intersects[0].object.userData.photoMesh;

      if (photoMesh && !photoMesh.isSelected) {
        this.startDragging(photoMesh, intersects[0].point);
        event.preventDefault();
      }
    }
  }

  onMouseMove(event) {
    this.updateMousePosition(event);

    // Throttle raycasting for performance
    const now = Date.now();
    if (now - this.lastRaycastTime < this.raycastThrottle) {
      if (this.isDragging) {
        this.updateDrag();
      }
      return;
    }
    this.lastRaycastTime = now;

    if (this.isDragging) {
      this.updateDrag();
    } else {
      this.updateHover();
    }
  }

  onMouseUp(event) {
    if (this.isDragging) {
      this.endDragging();
    }
  }

  onClick(event) {
    // Handle photo selection on click (not drag)
    if (this.mouse.distanceTo(this.lastMouse) < 0.01) {
      // Small threshold for click vs drag
      this.updateMousePosition(event);
      const intersects = this.getIntersectedPhotos();

      if (intersects.length > 0) {
        const photoMesh = intersects[0].object.userData.photoMesh;
        if (photoMesh) {
          this.selectPhoto(photoMesh);
        }
      } else {
        this.deselectPhoto();
      }
    }
  }

  // Touch event handlers
  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.isTouch = true;
      this.touchStartTime = Date.now();
      this.touchMoved = false;

      const touch = event.touches[0];
      this.updateTouchPosition(touch);
      this.lastMouse.copy(this.mouse);

      const intersects = this.getIntersectedPhotos();

      if (intersects.length > 0) {
        const photoMesh = intersects[0].object.userData.photoMesh;

        if (photoMesh && !photoMesh.isSelected) {
          this.startDragging(photoMesh, intersects[0].point);
          event.preventDefault();
        }
      }
    }
  }

  onTouchMove(event) {
    if (event.touches.length === 1 && this.isTouch) {
      this.touchMoved = true;
      const touch = event.touches[0];
      this.updateTouchPosition(touch);

      if (this.isDragging) {
        this.updateDrag();
        event.preventDefault();
      }
    }
  }

  onTouchEnd(event) {
    if (this.isTouch) {
      const touchDuration = Date.now() - this.touchStartTime;

      if (this.isDragging) {
        this.endDragging();
      } else if (!this.touchMoved && touchDuration < 500) {
        // Handle tap as click
        const intersects = this.getIntersectedPhotos();

        if (intersects.length > 0) {
          const photoMesh = intersects[0].object.userData.photoMesh;
          if (photoMesh) {
            this.selectPhoto(photoMesh);
          }
        } else {
          this.deselectPhoto();
        }
      }

      this.isTouch = false;
    }
  }

  startDragging(photoMesh, intersectionPoint) {
    this.isDragging = true;
    this.draggedPhoto = photoMesh;

    // Calculate offset from photo center to click point
    this.dragOffset.copy(intersectionPoint).sub(photoMesh.mesh.position);

    // Set drag plane at table height
    this.dragPlane.constant = -photoMesh.mesh.position.y;

    // Start drag on photo mesh
    photoMesh.startDrag();

    // Disable camera controls
    if (this.controls) {
      this.controls.enabled = false;
    }

    this.emit("photoDragStart", photoMesh);
  }

  updateDrag() {
    if (!this.isDragging || !this.draggedPhoto) return;

    // Project mouse ray onto drag plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectionPoint = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
      // Apply offset and update position
      const newPosition = intersectionPoint.sub(this.dragOffset);

      // Constrain to table bounds if available
      if (this.draggedPhoto.tableBounds) {
        const bounds = this.draggedPhoto.tableBounds;
        newPosition.x = THREE.MathUtils.clamp(
          newPosition.x,
          bounds.minX,
          bounds.maxX,
        );
        newPosition.z = THREE.MathUtils.clamp(
          newPosition.z,
          bounds.minZ,
          bounds.maxZ,
        );
        newPosition.y = bounds.y;
      }

      this.draggedPhoto.mesh.position.copy(newPosition);
    }
  }

  endDragging() {
    if (this.isDragging && this.draggedPhoto) {
      // End drag on photo mesh
      this.draggedPhoto.endDrag();

      // Re-enable camera controls
      if (this.controls) {
        this.controls.enabled = true;
      }

      this.emit("photoDragEnd", this.draggedPhoto);

      this.draggedPhoto = null;
      this.isDragging = false;
    }
  }

  updateHover() {
    const intersects = this.getIntersectedPhotos();

    if (intersects.length > 0) {
      const photoMesh = intersects[0].object.userData.photoMesh;

      if (photoMesh !== this.hoveredPhoto) {
        // Clear previous hover
        if (this.hoveredPhoto) {
          this.hoveredPhoto.setHoverState(false);
        }

        // Set new hover
        this.hoveredPhoto = photoMesh;
        if (this.hoveredPhoto && !this.hoveredPhoto.isSelected) {
          this.hoveredPhoto.setHoverState(true);
          this.canvas.style.cursor = "pointer";
        }
      }
    } else {
      // Clear hover
      if (this.hoveredPhoto) {
        this.hoveredPhoto.setHoverState(false);
        this.hoveredPhoto = null;
        this.canvas.style.cursor = "grab";
      }
    }
  }

  selectPhoto(photoMesh) {
    // Delegate to PhotoManager if available
    if (this.photoManager) {
      this.photoManager.selectPhoto(photoMesh);
    }
  }

  deselectPhoto() {
    // Delegate to PhotoManager if available
    if (this.photoManager) {
      this.photoManager.deselectPhoto();
    }
  }

  // Set PhotoManager reference
  setPhotoManager(photoManager) {
    this.photoManager = photoManager;
  }

  onKeyDown(event) {
    switch (event.code) {
      case "Escape":
        this.deselectPhoto();
        break;
      case "Delete":
      case "Backspace":
        if (this.selectedPhoto) {
          this.emit("photoDelete", this.selectedPhoto);
        }
        break;
    }
  }

  onWindowBlur() {
    // Clean up any ongoing interactions when window loses focus
    if (this.isDragging) {
      this.endDragging();
    }

    if (this.hoveredPhoto) {
      this.hoveredPhoto.setHoverState(false);
      this.hoveredPhoto = null;
    }
  }

  // Set table bounds for drag constraints
  setTableBounds(bounds) {
    this.tableBounds = bounds;

    // Update drag plane
    if (bounds) {
      this.dragPlane.constant = -bounds.y;
    }
  }

  // Update method called each frame
  update(deltaTime) {
    // Update any time-based interactions here
    // For example, smooth hover transitions or gesture recognition
  }

  // Performance optimization methods
  setRaycastThrottle(ms) {
    this.raycastThrottle = ms;
  }

  // Enable/disable interactions
  setEnabled(enabled) {
    this.canvas.style.pointerEvents = enabled ? "auto" : "none";
  }

  dispose() {
    // Remove event listeners
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("click", this.onClick);

    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);

    document.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("blur", this.onWindowBlur);

    // Clean up state
    this.isDragging = false;
    this.draggedPhoto = null;
    this.hoveredPhoto = null;
    this.selectedPhoto = null;

    // Remove all event listeners
    this.removeAllListeners();
  }
}
