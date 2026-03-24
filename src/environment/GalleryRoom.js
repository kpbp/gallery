import * as THREE from "three";
import * as CANNON from "cannon-es";
import { textureLoader } from "../utils/TextureLoader.js";

/**
 * Gallery Room
 * Creates the museum-like gallery space with walls, floor, and ceiling
 */
export class GalleryRoom {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = "GalleryRoom";

    // Room dimensions (in meters)
    this.dimensions = {
      width: 12,
      depth: 8,
      height: 6,
    };

    // Materials
    this.materials = {};
  }

  async init() {
    await this.createMaterials();
    this.createWalls();
    this.createFloor();
    this.createCeiling();

    console.log("Gallery room created");
  }

  async createMaterials() {
    // Wall material - white plaster
    this.materials.wall = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Floor material - wood parquet
    this.materials.floor = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
      envMapIntensity: 0.1,
    });

    // Ceiling material - hidden/dark
    this.materials.ceiling = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      roughness: 1.0,
    });

    // Load textures with fallbacks to procedural generation
    await this.loadRoomTextures();
  }

  async loadRoomTextures() {
    try {
      // Load wall textures
      const wallTexture = await textureLoader.loadTexture(
        "./assets/textures/wall_diffuse.jpg",
        () => this.createProceduralWallTexture(),
        {
          repeat: [2, 2],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      const wallNormal = await textureLoader.loadTexture(
        "./assets/textures/wall_normal.jpg",
        () => this.createProceduralWallNormal(),
        {
          repeat: [2, 2],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      // Load floor textures
      const floorTexture = await textureLoader.loadTexture(
        "./assets/textures/wood_diffuse.jpg",
        () => this.createProceduralFloorTexture(),
        {
          repeat: [6, 4],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      const floorNormal = await textureLoader.loadTexture(
        "./assets/textures/wood_normal.png",
        () => this.createProceduralFloorNormal(),
        {
          repeat: [6, 4],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      const floorRoughness = await textureLoader.loadTexture(
        "./assets/textures/wood_roughness.jpg",
        () => this.createProceduralFloorRoughness(),
        {
          repeat: [6, 4],
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
      );

      // Apply textures to materials
      this.materials.wall.map = wallTexture;
      this.materials.wall.normalMap = wallNormal;
      this.materials.wall.normalScale = new THREE.Vector2(0.35, 0.35);

      this.materials.floor.map = floorTexture;
      this.materials.floor.normalMap = floorNormal;
      this.materials.floor.normalScale = new THREE.Vector2(0.2, 0.2);
      this.materials.floor.roughnessMap = floorRoughness;
    } catch (error) {
      console.warn(
        "Failed to load room textures, using procedural fallback:",
        error,
      );
      // Fallback to the original procedural methods
      this.addWallTexture();
      this.addFloorTexture();
    }
  }

  createProceduralWallTexture() {
    // Seamlessly tileable plaster wall texture
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    // Base color - warm white plaster
    context.fillStyle = "#f5f2ed";
    context.fillRect(0, 0, size, size);

    // Layer 1: broad patchy variation — drawn at all 9 tile offsets for seamless wrap
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const rx = 30 + Math.random() * 80;
      const ry = rx * (0.5 + Math.random() * 0.5);
      const rot = Math.random() * Math.PI;
      const brightness = Math.floor(235 + (Math.random() - 0.5) * 20);
      context.globalAlpha = 0.15;
      context.fillStyle = `rgb(${brightness}, ${brightness - 2}, ${brightness - 5})`;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          context.beginPath();
          context.ellipse(cx + ox * size, cy + oy * size, rx, ry, rot, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    // Layer 2: fine grain noise
    context.globalAlpha = 1.0;
    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 14;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    context.putImageData(imageData, 0, 0);

    // Layer 3: trowel marks — wrapped so strokes crossing edges appear on the other side
    context.globalAlpha = 0.06;
    context.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const x0 = Math.random() * size;
      const y0 = Math.random() * size;
      const len = 40 + Math.random() * 100;
      const angle = (Math.random() - 0.5) * 0.6;
      const cpx = x0 + len * 0.5 + (Math.random() - 0.5) * 20;
      const cpy = y0 + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
      const ex = x0 + len;
      const ey = y0 + Math.sin(angle) * len;
      const bright = Math.random() > 0.5 ? "#ffffff" : "#e8e4de";
      context.strokeStyle = bright;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          context.beginPath();
          context.moveTo(x0 + ox * size, y0 + oy * size);
          context.quadraticCurveTo(cpx + ox * size, cpy + oy * size, ex + ox * size, ey + oy * size);
          context.stroke();
        }
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralWallNormal() {
    // Seamlessly tileable plaster normal map
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    // Base normal (flat)
    context.fillStyle = "#8080ff";
    context.fillRect(0, 0, size, size);

    // Broad undulations — wrapped
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const rx = 20 + Math.random() * 60;
      const ry = rx * (0.4 + Math.random() * 0.6);
      const rot = Math.random() * Math.PI;
      const rShift = Math.floor(128 + (Math.random() - 0.5) * 30);
      const gShift = Math.floor(128 + (Math.random() - 0.5) * 30);
      context.globalAlpha = 0.2;
      context.fillStyle = `rgb(${rShift}, ${gShift}, 255)`;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          context.beginPath();
          context.ellipse(cx + ox * size, cy + oy * size, rx, ry, rot, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    // Fine grain bumps
    context.globalAlpha = 1.0;
    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() - 0.5) * 20));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (Math.random() - 0.5) * 20));
    }
    context.putImageData(imageData, 0, 0);

    // Trowel ridges — wrapped
    context.globalAlpha = 0.12;
    context.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      const x0 = Math.random() * size;
      const y0 = Math.random() * size;
      const len = 50 + Math.random() * 120;
      const cpx = x0 + len * 0.5 + (Math.random() - 0.5) * 20;
      const cpy = y0 + (Math.random() - 0.5) * 30;
      const ex = x0 + len;
      const ey = y0 + (Math.random() - 0.5) * 40;
      const r = Math.floor(128 + (Math.random() - 0.5) * 50);
      const g = Math.floor(128 + (Math.random() - 0.5) * 50);
      context.strokeStyle = `rgb(${r}, ${g}, 255)`;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          context.beginPath();
          context.moveTo(x0 + ox * size, y0 + oy * size);
          context.quadraticCurveTo(cpx + ox * size, cpy + oy * size, ex + ox * size, ey + oy * size);
          context.stroke();
        }
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralFloorTexture() {
    // Herringbone wood parquet floor texture
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    // Base warm wood tone
    context.fillStyle = "#8B6914";
    context.fillRect(0, 0, size, size);

    // Plank dimensions for herringbone pattern
    const plankW = 128;
    const plankH = 32;
    const gap = 1;

    // Wood colors — variation between planks
    const woodColors = [
      "#7a5c12", "#8B6914", "#9a7520", "#6e5010",
      "#a07828", "#85640f", "#976e1a", "#7f5e16",
    ];

    // Draw herringbone planks
    for (let row = -2; row < Math.ceil(size / plankH) + 2; row++) {
      for (let col = -2; col < Math.ceil(size / plankW) + 2; col++) {
        const isEven = (row + col) % 2 === 0;
        const baseColor = woodColors[Math.abs((row * 7 + col * 13) % woodColors.length)];

        let x, y, w, h;
        if (isEven) {
          x = col * plankW / 2 + row * plankW / 2;
          y = row * plankH;
          w = plankW - gap;
          h = plankH - gap;
        } else {
          x = col * plankW / 2 + row * plankW / 2 + plankW / 2;
          y = row * plankH;
          w = plankW - gap;
          h = plankH - gap;
        }

        // Wrap for seamless tiling
        const wrappedX = ((x % size) + size) % size;
        const wrappedY = ((y % size) + size) % size;

        context.fillStyle = baseColor;
        context.fillRect(wrappedX, wrappedY, w, h);

        // Wood grain lines along the plank
        context.globalAlpha = 0.15;
        context.strokeStyle = "#5a4008";
        context.lineWidth = 0.5;
        for (let g = 0; g < h; g += 3 + Math.random() * 4) {
          context.beginPath();
          context.moveTo(wrappedX, wrappedY + g);
          context.lineTo(wrappedX + w, wrappedY + g + (Math.random() - 0.5) * 2);
          context.stroke();
        }
        context.globalAlpha = 1.0;
      }
    }

    // Fine noise for wood grain texture
    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.3));
    }
    context.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralFloorNormal() {
    // Normal map for wood plank edges and grain
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    // Base flat normal
    context.fillStyle = "#8080ff";
    context.fillRect(0, 0, size, size);

    // Plank edge bumps — horizontal gaps between planks
    const plankH = 16; // scaled to 512
    context.strokeStyle = "#6060ff";
    context.lineWidth = 2;
    for (let y = plankH; y < size; y += plankH) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }

    // Subtle wood grain bumps
    context.globalAlpha = 0.08;
    context.lineWidth = 1;
    for (let i = 0; i < 300; i++) {
      const x0 = Math.random() * size;
      const y0 = Math.random() * size;
      const len = 30 + Math.random() * 80;
      const r = Math.floor(128 + (Math.random() - 0.5) * 40);
      const g = Math.floor(128 + (Math.random() - 0.5) * 40);
      context.strokeStyle = `rgb(${r}, ${g}, 255)`;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x0 + len, y0 + (Math.random() - 0.5) * 4);
      context.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralFloorRoughness() {
    // Roughness map for polished wood — mostly smooth with grain variation
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    // Base roughness — moderately smooth polished wood
    context.fillStyle = "#404040";
    context.fillRect(0, 0, size, size);

    // Plank gaps are rougher
    const plankH = 16;
    context.strokeStyle = "#808080";
    context.lineWidth = 2;
    for (let y = plankH; y < size; y += plankH) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }

    // Grain-aligned roughness variation
    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const variation = (Math.random() - 0.5) * 30;
      const value = Math.max(0, Math.min(255, data[i] + variation));
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
    context.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  addWallTexture() {
    // Fallback plaster wall texture
    const wallTexture = this.createProceduralWallTexture();
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);

    this.materials.wall.map = wallTexture;
  }

  addFloorTexture() {
    // Fallback wood parquet floor texture
    const floorTexture = this.createProceduralFloorTexture();
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(6, 4);

    this.materials.floor.map = floorTexture;

    // Create normal map for floor detail
    this.createFloorNormalMap();
  }

  createFloorNormalMap() {
    const normalTexture = this.createProceduralFloorNormal();
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(6, 4);

    this.materials.floor.normalMap = normalTexture;
    this.materials.floor.normalScale = new THREE.Vector2(0.2, 0.2);
  }

  createWalls() {
    const { width, depth, height } = this.dimensions;

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, this.materials.wall);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.name = "BackWall";
    this.group.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, this.materials.wall);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.name = "LeftWall";
    this.group.add(leftWall);

    // Right wall with window cutout
    const windowWidth = 3;
    const windowHeight = 2;
    const windowBottomY = 1.2;
    const windowCenterZ = 0;

    const rightWallShape = new THREE.Shape();
    rightWallShape.moveTo(-depth / 2, 0);
    rightWallShape.lineTo(depth / 2, 0);
    rightWallShape.lineTo(depth / 2, height);
    rightWallShape.lineTo(-depth / 2, height);
    rightWallShape.lineTo(-depth / 2, 0);

    const windowHole = new THREE.Path();
    windowHole.moveTo(windowCenterZ - windowWidth / 2, windowBottomY);
    windowHole.lineTo(windowCenterZ + windowWidth / 2, windowBottomY);
    windowHole.lineTo(windowCenterZ + windowWidth / 2, windowBottomY + windowHeight);
    windowHole.lineTo(windowCenterZ - windowWidth / 2, windowBottomY + windowHeight);
    windowHole.lineTo(windowCenterZ - windowWidth / 2, windowBottomY);
    rightWallShape.holes.push(windowHole);

    const rightWallGeometry = new THREE.ShapeGeometry(rightWallShape);

    // Normalize UVs to 0–1 so the texture matches the other walls
    const uvAttr = rightWallGeometry.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, (uvAttr.getX(i) + depth / 2) / depth);
      uvAttr.setY(i, uvAttr.getY(i) / height);
    }
    uvAttr.needsUpdate = true;

    const rightWall = new THREE.Mesh(rightWallGeometry, this.materials.wall);
    rightWall.position.set(width / 2, 0, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.name = "RightWall";
    this.group.add(rightWall);

    // Store window info for external use (e.g., lighting)
    this.windowInfo = {
      wallSide: "right",
      position: new THREE.Vector3(width / 2, windowBottomY + windowHeight / 2, windowCenterZ),
      width: windowWidth,
      height: windowHeight,
    };

    // Bright sky plane just outside the window
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0xfdfbd3,
      side: THREE.FrontSide,
    });
    const skyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      skyMaterial,
    );
    skyPlane.position.set(width / 2 + 0.15, windowBottomY + windowHeight / 2, windowCenterZ);
    skyPlane.rotation.y = -Math.PI / 2;
    skyPlane.name = "WindowSky";
    this.group.add(skyPlane);

    // Cottage-style window with panels
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.0,
    });
    const frameX = width / 2;
    const frameDepth = 0.14;
    const outerThickness = 0.08;
    const mullionThickness = 0.04;
    const sillOverhang = 0.06;

    // Cottage grid: 3 columns x 2 rows of panes
    const cols = 3;
    const rows = 2;
    const paneWidth = (windowWidth - outerThickness * 2 - mullionThickness * (cols - 1)) / cols;
    const paneHeight = (windowHeight - outerThickness * 2 - mullionThickness * (rows - 1)) / rows;

    // Outer frame — top
    const topGeo = new THREE.BoxGeometry(frameDepth, outerThickness, windowWidth + outerThickness * 2);
    const topFrame = new THREE.Mesh(topGeo, frameMaterial);
    topFrame.position.set(frameX, windowBottomY + windowHeight + outerThickness / 2, windowCenterZ);
    topFrame.castShadow = true;
    this.group.add(topFrame);

    // Outer frame — bottom (window sill, thicker and protruding)
    const sillHeight = outerThickness * 1.5;
    const sillDepth = frameDepth + sillOverhang * 2;
    const sillGeo = new THREE.BoxGeometry(sillDepth, sillHeight, windowWidth + outerThickness * 2 + sillOverhang * 2);
    const sill = new THREE.Mesh(sillGeo, frameMaterial);
    sill.position.set(frameX - sillOverhang / 2, windowBottomY - sillHeight / 2, windowCenterZ);
    sill.castShadow = true;
    this.group.add(sill);

    // Outer frame — left
    const sideGeo = new THREE.BoxGeometry(frameDepth, windowHeight + outerThickness * 2, outerThickness);
    const leftFrame = new THREE.Mesh(sideGeo, frameMaterial);
    leftFrame.position.set(frameX, windowBottomY + windowHeight / 2, windowCenterZ - windowWidth / 2 - outerThickness / 2);
    leftFrame.castShadow = true;
    this.group.add(leftFrame);

    // Outer frame — right
    const rightFrame = new THREE.Mesh(sideGeo, frameMaterial);
    rightFrame.position.set(frameX, windowBottomY + windowHeight / 2, windowCenterZ + windowWidth / 2 + outerThickness / 2);
    rightFrame.castShadow = true;
    this.group.add(rightFrame);

    // Horizontal mullions
    for (let r = 1; r < rows; r++) {
      const y = windowBottomY + outerThickness + r * (paneHeight + mullionThickness) - mullionThickness / 2;
      const hMullionGeo = new THREE.BoxGeometry(frameDepth * 0.6, mullionThickness, windowWidth);
      const hMullion = new THREE.Mesh(hMullionGeo, frameMaterial);
      hMullion.position.set(frameX, y, windowCenterZ);
      hMullion.castShadow = true;
      this.group.add(hMullion);
    }

    // Vertical mullions
    for (let c = 1; c < cols; c++) {
      const z = windowCenterZ - windowWidth / 2 + outerThickness + c * (paneWidth + mullionThickness) - mullionThickness / 2;
      const vMullionGeo = new THREE.BoxGeometry(frameDepth * 0.6, windowHeight, mullionThickness);
      const vMullion = new THREE.Mesh(vMullionGeo, frameMaterial);
      vMullion.position.set(frameX, windowBottomY + windowHeight / 2, z);
      vMullion.castShadow = true;
      this.group.add(vMullion);
    }

    // Glass panes with slight transparency and reflection
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xddeeff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.02,
      side: THREE.DoubleSide,
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pz = windowCenterZ - windowWidth / 2 + outerThickness + c * (paneWidth + mullionThickness) + paneWidth / 2;
        const py = windowBottomY + outerThickness + r * (paneHeight + mullionThickness) + paneHeight / 2;
        const glassGeo = new THREE.PlaneGeometry(paneHeight, paneWidth);
        const glass = new THREE.Mesh(glassGeo, glassMaterial);
        glass.position.set(frameX + 0.01, py, pz);
        glass.rotation.y = -Math.PI / 2;
        this.group.add(glass);
      }
    }

    // Front wall (full)
    const frontWallGeometry = new THREE.PlaneGeometry(width, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, this.materials.wall);
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.name = "FrontWall";
    this.group.add(frontWall);
  }

  createFloor() {
    const { width, depth } = this.dimensions;

    const floorGeometry = new THREE.PlaneGeometry(width, depth);

    // Rotate UVs 90° so wood planks run horizontally relative to the default camera
    const uv = floorGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, v, u);
    }
    uv.needsUpdate = true;

    const floor = new THREE.Mesh(floorGeometry, this.materials.floor);

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = "Floor";

    this.group.add(floor);
  }

  createCeiling() {
    const { width, depth, height } = this.dimensions;

    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeometry, this.materials.ceiling);

    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.name = "Ceiling";

    this.group.add(ceiling);
  }

  // Add subtle ambient details
  addDetails() {
    // Add baseboards
    this.createBaseboards();
  }

  createBaseboards() {
    const baseboardHeight = 0.1;
    const baseboardDepth = 0.05;
    const { width, depth } = this.dimensions;

    const baseboardMaterial = new THREE.MeshLambertMaterial({
      color: 0xd0d0d0,
    });

    // Back baseboard
    const backBaseboardGeometry = new THREE.BoxGeometry(
      width,
      baseboardHeight,
      baseboardDepth,
    );
    const backBaseboard = new THREE.Mesh(
      backBaseboardGeometry,
      baseboardMaterial,
    );
    backBaseboard.position.set(
      0,
      baseboardHeight / 2,
      -depth / 2 + baseboardDepth / 2,
    );
    this.group.add(backBaseboard);

    // Left baseboard
    const leftBaseboardGeometry = new THREE.BoxGeometry(
      baseboardDepth,
      baseboardHeight,
      depth,
    );
    const leftBaseboard = new THREE.Mesh(
      leftBaseboardGeometry,
      baseboardMaterial,
    );
    leftBaseboard.position.set(
      -width / 2 + baseboardDepth / 2,
      baseboardHeight / 2,
      0,
    );
    this.group.add(leftBaseboard);

    // Right baseboard
    const rightBaseboardGeometry = new THREE.BoxGeometry(
      baseboardDepth,
      baseboardHeight,
      depth,
    );
    const rightBaseboard = new THREE.Mesh(
      rightBaseboardGeometry,
      baseboardMaterial,
    );
    rightBaseboard.position.set(
      width / 2 - baseboardDepth / 2,
      baseboardHeight / 2,
      0,
    );
    this.group.add(rightBaseboard);
  }

  setWindowSkyColor(hexColor) {
    const skyMesh = this.group.getObjectByName("WindowSky");
    if (skyMesh) {
      skyMesh.material.color.setHex(hexColor);
    }
  }

  getWindowSkyColor() {
    const skyMesh = this.group.getObjectByName("WindowSky");
    if (skyMesh) {
      return skyMesh.material.color.getHex();
    }
    return 0xffffff;
  }

  getWindowInfo() {
    return this.windowInfo || null;
  }

  getRoomBounds() {
    return {
      minX: -this.dimensions.width / 2,
      maxX: this.dimensions.width / 2,
      minZ: -this.dimensions.depth / 2,
      maxZ: this.dimensions.depth / 2,
      minY: 0,
      maxY: this.dimensions.height,
    };
  }

  createPhysicsBodies() {
    const { width, depth } = this.dimensions;
    const bodies = [];

    // Floor plane — CANNON.Plane default normal is +Z, rotate to face +Y
    const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2,
    );
    bodies.push(floorBody);

    // Back wall at z = -depth/2, default +Z normal is correct (faces into room)
    const backWall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    backWall.position.set(0, 0, -depth / 2);
    bodies.push(backWall);

    // Front wall at z = depth/2, facing -Z
    const frontWall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    frontWall.position.set(0, 0, depth / 2);
    frontWall.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      Math.PI,
    );
    bodies.push(frontWall);

    // Left wall at x = -width/2, facing +X
    const leftWall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    leftWall.position.set(-width / 2, 0, 0);
    leftWall.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      Math.PI / 2,
    );
    bodies.push(leftWall);

    // Right wall at x = width/2, facing -X
    const rightWall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    rightWall.position.set(width / 2, 0, 0);
    rightWall.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      -Math.PI / 2,
    );
    bodies.push(rightWall);

    this.physicsBodies = bodies;
    return bodies;
  }

  dispose() {
    // Dispose of materials
    Object.values(this.materials).forEach((material) => {
      material.dispose();
    });

    // Dispose of geometries
    this.group.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
  }
}
