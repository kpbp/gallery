import * as THREE from "three";
import * as CANNON from "cannon-es";
import { EventEmitter } from "../utils/EventEmitter.js";

/**
 * Photo Mesh
 * Creates and manages individual photo objects in the 3D scene
 */
export class PhotoMesh extends EventEmitter {
  constructor(photoData, index) {
    super();

    this.photoData = photoData;
    this.index = index;
    this.mesh = null;

    // State
    this.isSelected = false;
    this.isDragging = false;
    this.isAnimating = false;

    // Position and animation
    this.originalPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.originalRotation = new THREE.Euler();
    this.targetRotation = new THREE.Euler();

    // Store the table position separately (never changes once set)
    this.tablePosition = new THREE.Vector3();

    // Animation properties
    this.animationSpeed = 2.0;
    this.liftHeight = 0.5;
    this.hoverHeight = 0.02;

    // Camera reference for positioning (will be set by PhotoManager)
    this.camera = null;

    // Store original scale
    this.originalScale = new THREE.Vector3(1, 1, 1);

    // LOD properties
    this.lodLevel = "high";
    this.visibilityDistance = 20;

    this.createMesh();
  }

  createMesh() {
    const { texture, aspectRatio } = this.photoData;

    // Calculate photo dimensions
    const baseSize = 0.3;
    const photoWidth = Math.min(0.4, baseSize * Math.max(1, aspectRatio));
    const photoHeight = photoWidth / aspectRatio;

    // Create geometry with slight thickness for realism
    const geometry = new THREE.BoxGeometry(photoWidth, photoHeight, 0.01);

    // Create realistic photo material with subtle reflections
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.05, // Slightly more glossy for photo paper
      metalness: 0.0,
      clearcoat: 0.3, // Reduced clearcoat for more subtle reflection
      clearcoatRoughness: 0.05, // Smoother clearcoat
      reflectivity: 0.1, // Subtle reflectivity
      transparent: false,
      envMapIntensity: 0.2, // Subtle environment reflections
    });

    // Create back material (white backing)
    const backMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      roughness: 0.9,
    });

    // Use different materials for front and back
    const materials = [
      backMaterial, // Right
      backMaterial, // Left
      backMaterial, // Top
      backMaterial, // Bottom
      material, // Front (photo)
      backMaterial, // Back
    ];

    this.mesh = new THREE.Mesh(geometry, materials);

    // Set initial properties
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = {
      photoMesh: this,
      type: "photo",
      id: this.photoData.id,
    };

    // Set initial rotation (lay flat on table, face-up, bottom edge toward camera)
    this.mesh.rotation.x = -Math.PI / 2; // Lay flat on table
    this.mesh.rotation.y = 0; // No Y rotation - keep natural orientation
    this.mesh.rotation.z = Math.PI; // Rotate 180 degrees to correct orientation
    this.originalRotation.copy(this.mesh.rotation);

    // Add subtle random rotation for natural look
    const randomRotation = (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.z = Math.PI + randomRotation; // Add random to the base 180-degree rotation
    this.originalRotation.z = Math.PI + randomRotation;
  }

  createPhysicsBody() {
    const { width, height } = this.mesh.geometry.parameters;
    // Thicker collision shape than visual (0.01m) for stable resting contacts
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, height / 2, 0.005),
    );

    this.physicsBody = new CANNON.Body({
      mass: 0.01,
      shape,
      linearDamping: 0.5,
      angularDamping: 0.7,
      sleepSpeedLimit: 0.5,
      sleepTimeLimit: 0.1,
    });

    // Copy initial position and quaternion from mesh
    this.physicsBody.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
    );
    this.physicsBody.quaternion.set(
      this.mesh.quaternion.x,
      this.mesh.quaternion.y,
      this.mesh.quaternion.z,
      this.mesh.quaternion.w,
    );

    return this.physicsBody;
  }

  // Set camera reference for enhanced photo viewing
  setCamera(camera) {
    this.camera = camera;
  }

  setPosition(position) {
    this.mesh.position.copy(position);
    this.originalPosition.copy(position);
    this.targetPosition.copy(position);
    // Store the table position - this should never change
    this.tablePosition.copy(position);
  }

  animateToPosition(targetPosition, duration = 1000, updateOriginal = false) {
    this.targetPosition.copy(targetPosition);
    this.isAnimating = true;

    const startPosition = this.mesh.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 3);

      this.mesh.position.lerpVectors(startPosition, targetPosition, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        // Only update original position if explicitly requested (for dragging)
        if (updateOriginal) {
          this.originalPosition.copy(targetPosition);
          this.tablePosition.copy(targetPosition);
        }
      }
    };

    animate();
  }

  select() {
    if (this.isSelected) return;

    this.isSelected = true;

    // Make kinematic so physics doesn't interfere with animation
    if (this.physicsBody) {
      this.physicsBody.type = CANNON.Body.KINEMATIC;
      this.physicsBody.velocity.setZero();
      this.physicsBody.angularVelocity.setZero();
    }

    this.liftAndRotate();
    // Don't emit 'selected' here to avoid double selection
  }

  deselect() {
    if (!this.isSelected) return;

    this.isSelected = false;
    this.returnToTable();

    // After animation completes, restore dynamic physics
    if (this.physicsBody) {
      setTimeout(() => {
        if (!this.isSelected && this.physicsBody) {
          this.physicsBody.position.set(
            this.mesh.position.x,
            this.mesh.position.y,
            this.mesh.position.z,
          );
          this.physicsBody.quaternion.set(
            this.mesh.quaternion.x,
            this.mesh.quaternion.y,
            this.mesh.quaternion.z,
            this.mesh.quaternion.w,
          );
          this.physicsBody.type = CANNON.Body.DYNAMIC;
          this.physicsBody.velocity.setZero();
          this.physicsBody.angularVelocity.setZero();
          this.physicsBody.wakeUp();
        }
      }, 1100);
    }
    // Don't emit 'deselected' here to avoid conflicts
  }

  liftAndRotate() {
    if (!this.camera) {
      // Fallback to old behavior if no camera reference
      const liftPosition = this.originalPosition.clone();
      liftPosition.y += this.liftHeight;
      this.animateToPosition(liftPosition, 800);
      this.animateRotation(new THREE.Euler(0, 0, 0), 800);
      this.animateScale(new THREE.Vector3(1.2, 1.2, 1.2), 800);
      return;
    }

    // Calculate position in front of camera
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Position photo at a comfortable viewing distance
    const viewingDistance = 2.0;
    const targetPosition = this.camera.position.clone();
    targetPosition.add(cameraDirection.multiplyScalar(viewingDistance));

    // Calculate scale to partially fill the view
    const { aspectRatio } = this.photoData;
    const camera = this.camera;

    // Calculate how much of the screen the photo should fill (e.g., 60% of height)
    const fillRatio = 0.6;
    const fov = camera.fov * (Math.PI / 180); // Convert to radians
    const viewHeight = 2 * Math.tan(fov / 2) * viewingDistance;
    const targetHeight = viewHeight * fillRatio;

    // Calculate scale based on original photo dimensions
    const originalHeight = this.mesh.geometry.parameters.height;
    const scaleY = targetHeight / originalHeight;
    const scaleX = scaleY; // Keep proportional
    const targetScale = new THREE.Vector3(scaleX, scaleY, 1);

    // Build rotation so the photo faces the camera with bottom edge toward the floor.
    // The photo's local -Z points "out" of its face, local Y is "up" on the image.
    // We want local Y = world up, and local -Z pointing toward the camera.
    const forward = new THREE.Vector3()
      .subVectors(this.camera.position, targetPosition)
      .normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
    // Re-derive up to handle cases where camera is directly above/below
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

    right.negate();
    up.negate();
    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
    const targetRotation = new THREE.Euler().setFromRotationMatrix(rotMatrix);

    // Animate to viewing position
    this.animateToPosition(targetPosition, 1000);
    this.animateRotation(targetRotation, 1000);
    this.animateScale(targetScale, 1000);
  }

  returnToTable() {
    // Return to table position, rotation, and scale
    this.animateToPosition(this.tablePosition, 1000);
    this.animateRotation(this.originalRotation, 1000);
    this.animateScale(this.originalScale, 1000);
  }

  animateRotation(targetRotation, duration = 1000) {
    const startRotation = this.mesh.rotation.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      this.mesh.rotation.x = THREE.MathUtils.lerp(
        startRotation.x,
        targetRotation.x,
        eased,
      );
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        startRotation.y,
        targetRotation.y,
        eased,
      );
      this.mesh.rotation.z = THREE.MathUtils.lerp(
        startRotation.z,
        targetRotation.z,
        eased,
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  animateScale(targetScale, duration = 1000) {
    const startScale = this.mesh.scale.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      this.mesh.scale.lerpVectors(startScale, targetScale, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Hover effect when mouse is near
  setHoverState(isHovering) {
    if (this.isSelected || this.isDragging) return;

    const targetY =
      this.originalPosition.y + (isHovering ? this.hoverHeight : 0);
    const targetPosition = this.originalPosition.clone();
    targetPosition.y = targetY;

    this.animateToPosition(targetPosition, 200);
  }

  // Drag functionality
  startDrag() {
    this.isDragging = true;
    this.mesh.material.forEach((mat) => {
      if (mat.opacity !== undefined) {
        mat.transparent = true;
        mat.opacity = 0.8;
      }
    });
  }

  endDrag() {
    this.isDragging = false;
    this.mesh.material.forEach((mat) => {
      if (mat.opacity !== undefined) {
        mat.transparent = false;
        mat.opacity = 1.0;
      }
    });

    // Update positions from current mesh state
    this.originalPosition.copy(this.mesh.position);
    this.tablePosition.copy(this.mesh.position);
    this.originalRotation.set(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z);
  }

  // LOD (Level of Detail) management
  setLODLevel(level) {
    this.lodLevel = level;

    // Adjust material quality based on LOD
    const materials = Array.isArray(this.mesh.material)
      ? this.mesh.material
      : [this.mesh.material];

    materials.forEach((material) => {
      if (material.map) {
        switch (level) {
          case "low":
            material.map.minFilter = THREE.NearestFilter;
            material.map.magFilter = THREE.NearestFilter;
            break;
          case "medium":
            material.map.minFilter = THREE.LinearFilter;
            material.map.magFilter = THREE.LinearFilter;
            break;
          case "high":
          default:
            material.map.minFilter = THREE.LinearMipmapLinearFilter;
            material.map.magFilter = THREE.LinearFilter;
            break;
        }
        material.map.needsUpdate = true;
      }
    });
  }

  setVisibilityDistance(distance) {
    this.visibilityDistance = distance;
  }

  // Update method called each frame
  update(deltaTime) {
    // Only do floating animation if selected and not in camera view mode
    if (this.isSelected && !this.isAnimating && this.camera) {
      // Check if we're in the original table position (not in camera view)
      const distanceFromOriginal = this.mesh.position.distanceTo(
        this.tablePosition,
      );
      if (distanceFromOriginal < 0.1) {
        const time = Date.now() * 0.001;
        const floatOffset = Math.sin(time * 2) * 0.005;
        this.mesh.position.y =
          this.tablePosition.y + this.liftHeight + floatOffset;
      }
    }

    // Sync physics body position when selected (kinematic mode)
    if (this.isSelected && this.physicsBody) {
      this.physicsBody.position.set(
        this.mesh.position.x,
        this.mesh.position.y,
        this.mesh.position.z,
      );
      this.physicsBody.quaternion.set(
        this.mesh.quaternion.x,
        this.mesh.quaternion.y,
        this.mesh.quaternion.z,
        this.mesh.quaternion.w,
      );
    }
  }

  // Get bounding box for collision detection
  getBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    return box;
  }

  // Check if point is within photo bounds
  containsPoint(point) {
    const box = this.getBoundingBox();
    return box.containsPoint(point);
  }

  dispose() {
    // Dispose geometry
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }

    // Dispose materials
    const materials = Array.isArray(this.mesh.material)
      ? this.mesh.material
      : [this.mesh.material];
    materials.forEach((material) => {
      material.dispose();
      if (material.map) {
        material.map.dispose();
      }
    });

    // Remove event listeners
    this.removeAllListeners();
  }
}
