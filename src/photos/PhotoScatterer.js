import * as THREE from "three";

/**
 * Photo Scatterer
 * Implements Poisson disk sampling for natural photo placement on the table
 */
export class PhotoScatterer {
  constructor() {
    this.tableBounds = null;
    this.minDistance = 0.15; // Minimum distance between photos
    this.maxAttempts = 30; // Maximum attempts to place each photo
    this.gridSize = 0.05; // Grid cell size for optimization
  }

  setTableBounds(bounds) {
    this.tableBounds = bounds;
  }

  generatePositions(count) {
    if (!this.tableBounds) {
      console.warn("Table bounds not set for photo scattering");
      return this.generateFallbackPositions(count);
    }

    // Use Poisson disk sampling for natural distribution
    const positions = this.poissonDiskSampling(count);

    // Add slight rotation and height variation
    return positions.map((pos) => this.addVariation(pos));
  }

  poissonDiskSampling(count) {
    const { minX, maxX, minZ, maxZ, y } = this.tableBounds;
    const width = maxX - minX;
    const height = maxZ - minZ;

    // Create grid for fast neighbor lookup
    const cellSize = this.minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);

    const positions = [];
    const activeList = [];

    // Helper function to get grid index
    const getGridIndex = (x, z) => {
      const gridX = Math.floor((x - minX) / cellSize);
      const gridZ = Math.floor((z - minZ) / cellSize);
      return gridZ * gridWidth + gridX;
    };

    // Helper function to check if position is valid
    const isValidPosition = (x, z) => {
      if (x < minX || x > maxX || z < minZ || z > maxZ) {
        return false;
      }

      const gridX = Math.floor((x - minX) / cellSize);
      const gridZ = Math.floor((z - minZ) / cellSize);

      // Check surrounding grid cells
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const checkX = gridX + i;
          const checkZ = gridZ + j;

          if (
            checkX >= 0 &&
            checkX < gridWidth &&
            checkZ >= 0 &&
            checkZ < gridHeight
          ) {
            const index = checkZ * gridWidth + checkX;
            const neighbor = grid[index];

            if (neighbor) {
              const dx = x - neighbor.x;
              const dz = z - neighbor.z;
              const distance = Math.sqrt(dx * dx + dz * dz);

              if (distance < this.minDistance) {
                return false;
              }
            }
          }
        }
      }

      return true;
    };

    // Start with a random point in the center area
    const centerX = (minX + maxX) / 2 + (Math.random() - 0.5) * width * 0.3;
    const centerZ = (minZ + maxZ) / 2 + (Math.random() - 0.5) * height * 0.3;

    if (isValidPosition(centerX, centerZ)) {
      const firstPoint = new THREE.Vector3(centerX, y, centerZ);
      positions.push(firstPoint);
      activeList.push(firstPoint);
      grid[getGridIndex(centerX, centerZ)] = firstPoint;
    }

    // Generate remaining points
    while (activeList.length > 0 && positions.length < count) {
      const randomIndex = Math.floor(Math.random() * activeList.length);
      const point = activeList[randomIndex];
      let found = false;

      for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
        // Generate random point around current point
        const angle = Math.random() * Math.PI * 2;
        const radius = this.minDistance + Math.random() * this.minDistance;

        const newX = point.x + Math.cos(angle) * radius;
        const newZ = point.z + Math.sin(angle) * radius;

        if (isValidPosition(newX, newZ)) {
          const newPoint = new THREE.Vector3(newX, y, newZ);
          positions.push(newPoint);
          activeList.push(newPoint);
          grid[getGridIndex(newX, newZ)] = newPoint;
          found = true;
          break;
        }
      }

      if (!found) {
        activeList.splice(randomIndex, 1);
      }
    }

    // If we don't have enough positions, fill with grid-based positions
    if (positions.length < count) {
      const remaining = this.generateGridPositions(
        count - positions.length,
        positions,
      );
      positions.push(...remaining);
    }

    return positions.slice(0, count);
  }

  generateGridPositions(count, existingPositions) {
    const { minX, maxX, minZ, maxZ, y } = this.tableBounds;
    const positions = [];
    const attempts = count * 10; // Limit attempts

    for (let i = 0; i < attempts && positions.length < count; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);

      // Check distance from existing positions
      let validPosition = true;
      for (const existing of [...existingPositions, ...positions]) {
        const dx = x - existing.x;
        const dz = z - existing.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < this.minDistance) {
          validPosition = false;
          break;
        }
      }

      if (validPosition) {
        positions.push(new THREE.Vector3(x, y, z));
      }
    }

    return positions;
  }

  generateFallbackPositions(count) {
    // Simple circular arrangement as fallback
    const positions = [];
    const radius = 0.8;
    const centerY = 0.85;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius * (0.3 + Math.random() * 0.7); // Vary radius
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      positions.push(new THREE.Vector3(x, centerY, z));
    }

    return positions;
  }

  addVariation(position) {
    // Add slight random rotation and height variation for natural look
    const variation = {
      position: position.clone(),
      rotation: (Math.random() - 0.5) * 0.4, // ±0.2 radians
      heightOffset: (Math.random() - 0.5) * 0.002, // Very slight height variation
    };

    variation.position.y += variation.heightOffset;

    return variation;
  }

  // Shuffle existing positions while maintaining minimum distance
  shufflePositions(existingPositions) {
    if (!this.tableBounds) {
      return existingPositions;
    }

    const count = existingPositions.length;
    const newPositions = this.generatePositions(count);

    // If we couldn't generate enough new positions, keep some old ones
    while (newPositions.length < count) {
      const randomOld =
        existingPositions[Math.floor(Math.random() * existingPositions.length)];
      newPositions.push(this.addVariation(randomOld.position || randomOld));
    }

    return newPositions.slice(0, count);
  }

  // Check if two positions are too close
  isValidDistance(pos1, pos2, minDist = null) {
    const distance = pos1.distanceTo(pos2);
    return distance >= (minDist || this.minDistance);
  }

  // Get optimal spacing for given number of photos
  calculateOptimalSpacing(photoCount) {
    if (!this.tableBounds) return this.minDistance;

    const { minX, maxX, minZ, maxZ } = this.tableBounds;
    const area = (maxX - minX) * (maxZ - minZ);
    const areaPerPhoto = area / photoCount;

    // Calculate spacing based on area per photo
    const optimalSpacing = Math.sqrt(areaPerPhoto) * 0.8;
    return Math.max(0.1, Math.min(0.3, optimalSpacing));
  }

  // Organize photos in a more structured layout (optional)
  generateStructuredLayout(count, layoutType = "grid") {
    if (!this.tableBounds) {
      return this.generateFallbackPositions(count);
    }

    switch (layoutType) {
      case "grid":
        return this.generateGridLayout(count);
      case "spiral":
        return this.generateSpiralLayout(count);
      case "cluster":
        return this.generateClusterLayout(count);
      default:
        return this.generatePositions(count);
    }
  }

  generateGridLayout(count) {
    const { minX, maxX, minZ, maxZ, y } = this.tableBounds;
    const positions = [];

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const spacingX = (maxX - minX) / (cols + 1);
    const spacingZ = (maxZ - minZ) / (rows + 1);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = minX + spacingX * (col + 1);
      const z = minZ + spacingZ * (row + 1);

      positions.push(this.addVariation(new THREE.Vector3(x, y, z)));
    }

    return positions;
  }

  generateSpiralLayout(count) {
    const { y } = this.tableBounds;
    const positions = [];
    const centerX = (this.tableBounds.minX + this.tableBounds.maxX) / 2;
    const centerZ = (this.tableBounds.minZ + this.tableBounds.maxZ) / 2;

    for (let i = 0; i < count; i++) {
      const angle = i * 0.5; // Spiral angle
      const radius = 0.1 + (i / count) * 0.6; // Increasing radius

      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;

      if (
        x >= this.tableBounds.minX &&
        x <= this.tableBounds.maxX &&
        z >= this.tableBounds.minZ &&
        z <= this.tableBounds.maxZ
      ) {
        positions.push(this.addVariation(new THREE.Vector3(x, y, z)));
      }
    }

    return positions;
  }

  generateClusterLayout(count) {
    const positions = [];
    const clusterCount = Math.min(3, Math.ceil(count / 4));
    const photosPerCluster = Math.ceil(count / clusterCount);

    for (let cluster = 0; cluster < clusterCount; cluster++) {
      const clusterCenter = this.getRandomTablePosition();
      const clusterPositions = this.generateCluster(
        Math.min(photosPerCluster, count - positions.length),
        clusterCenter,
      );
      positions.push(...clusterPositions);
    }

    return positions.slice(0, count);
  }

  generateCluster(count, center) {
    const positions = [];
    const maxRadius = 0.3;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let validPosition = false;

      while (!validPosition && attempts < 20) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;

        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;

        if (
          x >= this.tableBounds.minX &&
          x <= this.tableBounds.maxX &&
          z >= this.tableBounds.minZ &&
          z <= this.tableBounds.maxZ
        ) {
          const newPos = new THREE.Vector3(x, center.y, z);

          // Check distance from other positions in this cluster
          validPosition = true;
          for (const existing of positions) {
            if (
              newPos.distanceTo(existing.position || existing) <
              this.minDistance
            ) {
              validPosition = false;
              break;
            }
          }

          if (validPosition) {
            positions.push(this.addVariation(newPos));
          }
        }

        attempts++;
      }
    }

    return positions;
  }

  getRandomTablePosition() {
    const { minX, maxX, minZ, maxZ, y } = this.tableBounds;
    return new THREE.Vector3(
      minX + Math.random() * (maxX - minX),
      y,
      minZ + Math.random() * (maxZ - minZ),
    );
  }
}
