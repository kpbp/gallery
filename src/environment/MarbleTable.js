import * as THREE from "three";
import { textureLoader } from "../utils/TextureLoader.js";

/**
 * Marble Table
 * Creates a realistic marble table with proper materials and physics bounds
 */
export class MarbleTable {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = "MarbleTable";

    // Table dimensions (in meters)
    this.dimensions = {
      width: 3,
      depth: 2,
      height: 0.1,
      legHeight: 0.8,
    };

    // Materials
    this.materials = {};

    // Table bounds for photo placement
    this.tableBounds = null;
  }

  async init() {
    await this.createMaterials();
    this.createTableTop();
    this.createTableLegs();
    this.createContactShadow();
    this.calculateTableBounds();

    console.log("Marble table created");
  }

  async createMaterials() {
    // Marble material with realistic PBR properties
    this.materials.marble = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.5,
      ior: 1.5,
      transmission: 0.0,
    });

    // Load textures with fallbacks to procedural generation
    await this.loadMarbleTextures();
  }

  async loadMarbleTextures() {
    try {
      // Define texture paths
      const texturePaths = {
        diffuse: "./assets/textures/marble_diffuse.jpg",
        normal: "./assets/textures/marble_normal.jpg",
        roughness: "./assets/textures/marble_roughness.jpg",
      };

      // Define fallback generators
      const fallbackGenerators = {
        diffuse: () => this.createProceduralMarbleTexture(),
        normal: () => this.createProceduralNormalMap(),
        roughness: () => this.createProceduralRoughnessMap(),
      };

      // Load textures
      const textures = await textureLoader.loadPBRTextures(
        texturePaths,
        fallbackGenerators,
        {
          repeat: [1.5, 1],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      // Apply textures to material
      this.materials.marble.map = textures.diffuse;
      this.materials.marble.normalMap = textures.normal;
      this.materials.marble.normalScale = new THREE.Vector2(0.3, 0.3);
      this.materials.marble.roughnessMap = textures.roughness;
    } catch (error) {
      console.warn(
        "Failed to load marble textures, using procedural fallback:",
        error,
      );
      // Fallback to the original procedural method
      this.addMarblePattern();
    }
  }

  createProceduralMarbleTexture() {
    // This is the enhanced procedural marble texture we created earlier
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    // Create marble base with subtle gradient
    const gradient = context.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, "#f8f8f8");
    gradient.addColorStop(0.3, "#f5f5f5");
    gradient.addColorStop(0.7, "#f2f2f2");
    gradient.addColorStop(1, "#eeeeee");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 1024);

    // Add realistic marble veining with multiple layers
    const veinColors = [
      "rgba(180, 180, 180, 0.4)",
      "rgba(160, 160, 160, 0.3)",
      "rgba(200, 200, 200, 0.2)",
      "rgba(140, 140, 140, 0.5)",
    ];

    // Create main veining structure
    for (let layer = 0; layer < veinColors.length; layer++) {
      context.strokeStyle = veinColors[layer];
      context.lineWidth = 3 - layer * 0.5;
      context.lineCap = "round";

      // Create flowing vein patterns
      for (let i = 0; i < 15 - layer * 3; i++) {
        context.beginPath();

        // Start from random edge
        const startSide = Math.floor(Math.random() * 4);
        let startX, startY;

        switch (startSide) {
          case 0:
            startX = Math.random() * 1024;
            startY = 0;
            break;
          case 1:
            startX = 1024;
            startY = Math.random() * 1024;
            break;
          case 2:
            startX = Math.random() * 1024;
            startY = 1024;
            break;
          case 3:
            startX = 0;
            startY = Math.random() * 1024;
            break;
        }

        context.moveTo(startX, startY);

        // Create flowing, organic vein path
        let currentX = startX;
        let currentY = startY;
        const segments = 8 + Math.random() * 12;

        for (let j = 0; j < segments; j++) {
          const angle = (Math.random() - 0.5) * Math.PI * 0.5;
          const distance = 80 + Math.random() * 120;

          const nextX = currentX + Math.cos(angle) * distance;
          const nextY = currentY + Math.sin(angle) * distance;

          // Add some randomness to control points for organic curves
          const cp1X = currentX + (Math.random() - 0.5) * 60;
          const cp1Y = currentY + (Math.random() - 0.5) * 60;
          const cp2X = nextX + (Math.random() - 0.5) * 60;
          const cp2Y = nextY + (Math.random() - 0.5) * 60;

          context.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, nextX, nextY);

          currentX = nextX;
          currentY = nextY;
        }

        context.stroke();
      }
    }

    // Add subtle speckled texture
    const imageData = context.getImageData(0, 0, 1024, 1024);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.1) {
        const speckle = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + speckle));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + speckle));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + speckle));
      }
    }

    context.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralNormalMap() {
    // Create a normal map for surface detail
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    // Create height map for normal calculation
    context.fillStyle = "#8080ff"; // Neutral normal (0.5, 0.5, 1.0)
    context.fillRect(0, 0, 512, 512);

    // Add subtle surface variations
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 5 + Math.random() * 15;

      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "#9090ff");
      gradient.addColorStop(1, "#7070ff");

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralRoughnessMap() {
    // Create a roughness map
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    // Base roughness
    context.fillStyle = "#404040"; // Medium roughness
    context.fillRect(0, 0, 512, 512);

    // Add variation
    const imageData = context.getImageData(0, 0, 512, 512);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const variation = (Math.random() - 0.5) * 60;
      const value = Math.max(0, Math.min(255, 64 + variation));
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    context.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  addMarblePattern() {
    // Create a realistic marble pattern
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    // Create marble base with subtle gradient
    const gradient = context.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, "#f8f8f8");
    gradient.addColorStop(0.3, "#f5f5f5");
    gradient.addColorStop(0.7, "#f2f2f2");
    gradient.addColorStop(1, "#eeeeee");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 1024);

    // Add realistic marble veining with multiple layers
    const veinColors = [
      "rgba(180, 180, 180, 0.4)",
      "rgba(160, 160, 160, 0.3)",
      "rgba(200, 200, 200, 0.2)",
      "rgba(140, 140, 140, 0.5)",
    ];

    // Create main veining structure
    for (let layer = 0; layer < veinColors.length; layer++) {
      context.strokeStyle = veinColors[layer];
      context.lineWidth = 3 - layer * 0.5;
      context.lineCap = "round";

      // Create flowing vein patterns
      for (let i = 0; i < 15 - layer * 3; i++) {
        context.beginPath();

        // Start from random edge
        const startSide = Math.floor(Math.random() * 4);
        let startX, startY;

        switch (startSide) {
          case 0:
            startX = Math.random() * 1024;
            startY = 0;
            break;
          case 1:
            startX = 1024;
            startY = Math.random() * 1024;
            break;
          case 2:
            startX = Math.random() * 1024;
            startY = 1024;
            break;
          case 3:
            startX = 0;
            startY = Math.random() * 1024;
            break;
        }

        context.moveTo(startX, startY);

        // Create flowing, organic vein path
        let currentX = startX;
        let currentY = startY;
        const segments = 8 + Math.random() * 12;

        for (let j = 0; j < segments; j++) {
          const angle = (Math.random() - 0.5) * Math.PI * 0.5;
          const distance = 80 + Math.random() * 120;

          const nextX = currentX + Math.cos(angle) * distance;
          const nextY = currentY + Math.sin(angle) * distance;

          // Add some randomness to control points for organic curves
          const cp1X = currentX + (Math.random() - 0.5) * 60;
          const cp1Y = currentY + (Math.random() - 0.5) * 60;
          const cp2X = nextX + (Math.random() - 0.5) * 60;
          const cp2Y = nextY + (Math.random() - 0.5) * 60;

          context.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, nextX, nextY);

          currentX = nextX;
          currentY = nextY;
        }

        context.stroke();
      }
    }

    // Add subtle speckled texture
    const imageData = context.getImageData(0, 0, 1024, 1024);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.1) {
        const speckle = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + speckle));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + speckle));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + speckle));
      }
    }

    context.putImageData(imageData, 0, 0);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;

    this.materials.marble.map = texture;

    // Create normal map for surface detail
    this.createMarbleNormalMap();
  }

  createMarbleNormalMap() {
    // Create a normal map for surface detail
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    // Create height map for normal calculation
    context.fillStyle = "#8080ff"; // Neutral normal (0.5, 0.5, 1.0)
    context.fillRect(0, 0, 512, 512);

    // Add subtle surface variations
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 5 + Math.random() * 15;

      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "#9090ff");
      gradient.addColorStop(1, "#7070ff");

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(1.5, 1);

    this.materials.marble.normalMap = normalTexture;
    this.materials.marble.normalScale = new THREE.Vector2(0.3, 0.3);
  }

  createTableTop() {
    const { width, depth, height } = this.dimensions;
    const radius = 0.03; // Edge rounding radius
    const segments = 6; // Smoothness of rounded corners

    // Create a rounded rectangle shape for extrusion
    const shape = new THREE.Shape();
    const hw = width / 2 - radius;
    const hd = depth / 2 - radius;

    shape.moveTo(-hw, -depth / 2);
    shape.lineTo(hw, -depth / 2);
    shape.quadraticCurveTo(width / 2, -depth / 2, width / 2, -hd);
    shape.lineTo(width / 2, hd);
    shape.quadraticCurveTo(width / 2, depth / 2, hw, depth / 2);
    shape.lineTo(-hw, depth / 2);
    shape.quadraticCurveTo(-width / 2, depth / 2, -width / 2, hd);
    shape.lineTo(-width / 2, -hd);
    shape.quadraticCurveTo(-width / 2, -depth / 2, -hw, -depth / 2);

    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: radius,
      bevelSize: radius,
      bevelOffset: 0,
      bevelSegments: segments,
    };

    const tableGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // ExtrudeGeometry extrudes along Z; rotate so thickness is along Y
    tableGeometry.rotateX(-Math.PI / 2);

    // Compute the actual geometry bounds so we can position precisely
    tableGeometry.computeBoundingBox();
    const geoTop = tableGeometry.boundingBox.max.y;
    const geoBottom = tableGeometry.boundingBox.min.y;

    const tableTop = new THREE.Mesh(tableGeometry, this.materials.marble);
    // Position so the bottom of the tabletop sits on top of the legs
    tableTop.position.set(0, this.dimensions.legHeight - geoBottom, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableTop.name = "TableTop";

    // Store the actual surface Y for bounds calculation
    this.tableTopSurfaceY = this.dimensions.legHeight - geoBottom + geoTop;

    this.group.add(tableTop);
  }

  createTableLegs() {
    const { width, depth, legHeight } = this.dimensions;
    const slabThickness = 0.08;
    const slabInset = width * 0.25; // Inset from left/right edges
    const radius = 0.02;
    const segments = 4;

    // Rounded slab shape running along the table depth (shorter axis)
    const shape = new THREE.Shape();
    const hd = depth / 2 - radius - 0.1; // Slightly narrower than tabletop depth
    const hh = legHeight / 2 - radius;

    shape.moveTo(-hd, -legHeight / 2);
    shape.lineTo(hd, -legHeight / 2);
    shape.quadraticCurveTo(hd + radius, -legHeight / 2, hd + radius, -hh);
    shape.lineTo(hd + radius, hh);
    shape.quadraticCurveTo(hd + radius, legHeight / 2, hd, legHeight / 2);
    shape.lineTo(-hd, legHeight / 2);
    shape.quadraticCurveTo(-hd - radius, legHeight / 2, -hd - radius, hh);
    shape.lineTo(-hd - radius, -hh);
    shape.quadraticCurveTo(-hd - radius, -legHeight / 2, -hd, -legHeight / 2);

    const extrudeSettings = {
      depth: slabThickness,
      bevelEnabled: true,
      bevelThickness: radius,
      bevelSize: radius,
      bevelSegments: segments,
    };

    const legGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate so the slab stands upright with thickness along X
    legGeometry.rotateY(Math.PI / 2);

    // Left slab leg
    const leftLeg = new THREE.Mesh(legGeometry, this.materials.marble);
    leftLeg.position.set(-width / 2 + slabInset, legHeight / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.name = "TableLegLeft";
    this.group.add(leftLeg);

    // Right slab leg
    const rightLeg = new THREE.Mesh(legGeometry, this.materials.marble);
    rightLeg.position.set(width / 2 - slabInset, legHeight / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.name = "TableLegRight";
    this.group.add(rightLeg);
  }

  createContactShadow() {
    const { width, depth } = this.dimensions;

    // Create a soft radial gradient texture for the contact shadow
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.35)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.2)");
    gradient.addColorStop(0.8, "rgba(0, 0, 0, 0.05)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(canvas);

    const shadowGeo = new THREE.PlaneGeometry(width * 1.3, depth * 1.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });

    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005; // Just above floor to avoid z-fighting
    shadowPlane.name = "ContactShadow";

    this.group.add(shadowPlane);
  }

  calculateTableBounds() {
    const { width, depth } = this.dimensions;
    const tableY = this.tableTopSurfaceY;

    // Slightly smaller bounds than actual table to keep photos on surface
    const margin = 0.1;

    this.tableBounds = {
      minX: -width / 2 + margin,
      maxX: width / 2 - margin,
      minZ: -depth / 2 + margin,
      maxZ: depth / 2 - margin,
      y: tableY + 0.001, // Slightly above table surface
    };
  }

  getTableBounds() {
    return this.tableBounds;
  }

  getTableSurface() {
    // Return the table surface plane for photo placement calculations
    return {
      center: new THREE.Vector3(0, this.tableBounds.y, 0),
      normal: new THREE.Vector3(0, 1, 0),
      bounds: this.tableBounds,
    };
  }

  // Get random position on table surface
  getRandomTablePosition() {
    const bounds = this.tableBounds;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(bounds.minX, bounds.maxX, Math.random()),
      bounds.y,
      THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, Math.random()),
    );
  }

  // Check if position is within table bounds
  isPositionOnTable(position) {
    const bounds = this.tableBounds;
    return (
      position.x >= bounds.minX &&
      position.x <= bounds.maxX &&
      position.z >= bounds.minZ &&
      position.z <= bounds.maxZ
    );
  }

  // Clamp position to table bounds
  clampToTable(position) {
    const bounds = this.tableBounds;
    return new THREE.Vector3(
      THREE.MathUtils.clamp(position.x, bounds.minX, bounds.maxX),
      bounds.y,
      THREE.MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ),
    );
  }

  // Add subtle animation (optional)
  update(deltaTime) {
    // Could add subtle floating or breathing animation
    // For now, keep static for realism
  }

  dispose() {
    // Dispose of materials
    Object.values(this.materials).forEach((material) => {
      material.dispose();
      if (material.map) {
        material.map.dispose();
      }
    });

    // Dispose of geometries
    this.group.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
  }
}
