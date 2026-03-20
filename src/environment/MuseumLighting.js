import * as THREE from "three";

/**
 * Museum Lighting
 * Creates professional gallery lighting with soft shadows and realistic illumination
 */
export class MuseumLighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.lightHelpers = [];
    this.showHelpers = false; // Set to true for debugging
    this.isDimmed = false; // Track dim lighting state
    this.galleryRoom = null; // Reference to gallery room for window sky color
    this.transition = null; // Active lighting transition animation
  }

  init() {
    this.setupWindowSunlight();
    this.setupAmbientLight();

    console.log("Museum lighting initialized");
  }

  // Set gallery room reference for window sky color changes
  setGalleryRoom(galleryRoom) {
    this.galleryRoom = galleryRoom;
  }

  setupWindowSunlight() {
    // Main sunlight — directional light entering from the right wall window
    // Sunlight is warm and strong, angled downward as if from an elevated sun
    const sunlight = new THREE.DirectionalLight(0xfdfbd3, 2.5); // midday sunlight ~5500K
    // Position outside the right wall, elevated, angling into the room
    sunlight.position.set(12, 6, 0);
    sunlight.target.position.set(-2, 0, 0); // aim toward left side of room / floor

    // High-quality shadows for crisp sunlight shafts
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.width = 2048;
    sunlight.shadow.mapSize.height = 2048;
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far = 25;
    sunlight.shadow.camera.left = -8;
    sunlight.shadow.camera.right = 8;
    sunlight.shadow.camera.top = 8;
    sunlight.shadow.camera.bottom = -4;
    sunlight.shadow.radius = 5; // Soft penumbra for VSM shadows
    sunlight.shadow.blurSamples = 25;
    sunlight.shadow.bias = -0.0001;

    sunlight.name = "WindowSunlight";
    this.scene.add(sunlight);
    this.scene.add(sunlight.target);
    this.lights.push(sunlight);

    if (this.showHelpers) {
      const helper = new THREE.DirectionalLightHelper(sunlight, 1);
      this.scene.add(helper);
      this.lightHelpers.push(helper);
    }
  }

  setupAmbientLight() {
    // Hemisphere light for soft ambient wall fill — transitions smoothly per-frame
    this.ambientLight = new THREE.HemisphereLight(
      0xeeeedd, // Sky color — neutral warm white
      0x444444, // Ground color — subtle dark bounce
      0.6, // Low intensity — just enough to fill unlit walls
    );
    this.ambientLight.name = "AmbientHemi";
    this.scene.add(this.ambientLight);
  }

  // Animate subtle light movement and handle transitions
  update(deltaTime) {
    // Handle active lighting transition
    if (this.transition) {
      const elapsed = Date.now() - this.transition.startTime;
      const rawProgress = Math.min(elapsed / this.transition.duration, 1);
      const t = 1 - Math.pow(1 - rawProgress, 3); // cubic ease-out

      // Lerp each light's intensity and color
      for (const entry of this.transition.lights) {
        entry.light.intensity = THREE.MathUtils.lerp(
          entry.startIntensity,
          entry.targetIntensity,
          t,
        );
        entry.light.color.lerpColors(entry.startColor, entry.targetColor, t);
      }

      // Lerp sunlight position (lower sun for sunset)
      if (this.transition.sunlight) {
        const sun = this.transition.sunlight;
        sun.light.position.y = THREE.MathUtils.lerp(sun.startY, sun.targetY, t);
      }

      // Lerp window sky color
      if (this.galleryRoom && this.transition.skyStartColor) {
        const skyColor = new THREE.Color();
        skyColor.lerpColors(
          this.transition.skyStartColor,
          this.transition.skyTargetColor,
          t,
        );
        this.galleryRoom.setWindowSkyColor(skyColor.getHex());
      }

      // Lerp bloom intensity
      if (this.transition.postProcessing) {
        const bloom = THREE.MathUtils.lerp(
          this.transition.bloomStart,
          this.transition.bloomTarget,
          t,
        );
        this.transition.postProcessing.setBloomIntensity(bloom);
      }

      // Lerp ambient hemisphere light color and intensity
      if (this.ambientLight && this.transition.ambientSkyStart) {
        this.ambientLight.color.lerpColors(
          this.transition.ambientSkyStart,
          this.transition.ambientSkyTarget,
          t,
        );
        this.ambientLight.groundColor.lerpColors(
          this.transition.ambientGroundStart,
          this.transition.ambientGroundTarget,
          t,
        );
        this.ambientLight.intensity = THREE.MathUtils.lerp(
          this.transition.ambientIntensityStart,
          this.transition.ambientIntensityTarget,
          t,
        );
      }

      // Transition complete
      if (rawProgress >= 1) {
        this.transition = null;
      }
      return;
    }
  }

  // Adjust lighting intensity
  setIntensity(multiplier = 1.0) {
    this.lights.forEach((light) => {
      if (light.originalIntensity === undefined) {
        light.originalIntensity = light.intensity;
      }
      light.intensity = light.originalIntensity * multiplier;
    });
  }

  // Toggle dim lighting with animated transition
  setDimLighting(isDim = null, postProcessing = null) {
    // If no parameter provided, toggle current state
    if (isDim === null) {
      isDim = !this.isDimmed;
    }

    console.log(
      `MuseumLighting: Animating to ${isDim ? "sunset" : "daylight"} (was ${this.isDimmed})`,
    );
    this.isDimmed = isDim;

    const duration = 5000; // 5 seconds

    // Target intensities and colors for each light
    const dimTargets = {
      WindowSunlight: { intensity: 0.7, color: 0xddaa44 },
    };

    // Store original values on first call
    this.lights.forEach((light) => {
      if (light.originalIntensity === undefined) {
        light.originalIntensity = light.intensity;
      }
      if (light.originalColor === undefined) {
        light.originalColor = light.color.getHex();
      }
    });

    // Build per-light transition entries, capturing current state as start
    const lightEntries = this.lights.map((light) => {
      const target = dimTargets[light.name];
      let targetIntensity, targetColor;

      if (isDim && target) {
        targetIntensity = light.originalIntensity * target.intensity;
        targetColor = new THREE.Color(target.color);
      } else if (isDim) {
        targetIntensity = light.originalIntensity * 0.2;
        targetColor = light.color.clone();
      } else {
        targetIntensity = light.originalIntensity;
        targetColor = new THREE.Color(light.originalColor);
      }

      return {
        light,
        startIntensity: light.intensity,
        targetIntensity,
        startColor: light.color.clone(),
        targetColor,
      };
    });

    // Sunlight position animation
    const sunlight = this.lights.find((l) => l.name === "WindowSunlight");
    const sunTransition = sunlight
      ? {
          light: sunlight,
          startY: sunlight.position.y,
          targetY: isDim ? 2 : 6, // Low sun for sunset, high for day
        }
      : null;

    // Window sky color
    const skyStartColor = this.galleryRoom
      ? new THREE.Color(this.galleryRoom.getWindowSkyColor())
      : null;
    const skyTargetColor = this.galleryRoom
      ? new THREE.Color(isDim ? 0xddaa44 : 0xfdfbd3)
      : null;

    // Bloom intensity — boost during sunset for atmospheric glow
    const bloomStart = postProcessing
      ? postProcessing.getBloomIntensity()
      : 0.15;
    const bloomTarget = isDim ? 0.4 : 0.15;

    // Ambient hemisphere light colors and intensity
    const ambientSkyStart = this.ambientLight.color.clone();
    const ambientSkyTarget = new THREE.Color(isDim ? 0xbb9955 : 0xeeeedd);
    const ambientGroundStart = this.ambientLight.groundColor.clone();
    const ambientGroundTarget = new THREE.Color(isDim ? 0x221100 : 0x444444);
    const ambientIntensityStart = this.ambientLight.intensity;
    const ambientIntensityTarget = isDim ? 0.3 : 0.6;

    // Set up the transition (replaces any in-progress transition seamlessly)
    this.transition = {
      startTime: Date.now(),
      duration,
      lights: lightEntries,
      sunlight: sunTransition,
      skyStartColor,
      skyTargetColor,
      postProcessing,
      bloomStart,
      bloomTarget,
      ambientSkyStart,
      ambientSkyTarget,
      ambientGroundStart,
      ambientGroundTarget,
      ambientIntensityStart,
      ambientIntensityTarget,
    };
  }

  // Toggle shadow quality for performance
  setShadowQuality(quality = "high") {
    const shadowMapSizes = {
      low: 512,
      medium: 1024,
      high: 2048,
      ultra: 4096,
    };

    const mapSize = shadowMapSizes[quality] || shadowMapSizes.high;

    this.lights.forEach((light) => {
      if (light.castShadow && light.shadow) {
        light.shadow.mapSize.width = mapSize;
        light.shadow.mapSize.height = mapSize;
        light.shadow.needsUpdate = true;
      }
    });
  }

  // Enable/disable shadows for performance
  setShadowsEnabled(enabled = true) {
    this.lights.forEach((light) => {
      if (light.castShadow !== undefined) {
        light.castShadow = enabled;
      }
    });
  }

  // Get lighting information for debugging
  getLightingInfo() {
    return {
      lightCount: this.lights.length,
      shadowCasters: this.lights.filter((light) => light.castShadow).length,
      totalIntensity: this.lights.reduce(
        (sum, light) => sum + (light.intensity || 0),
        0,
      ),
    };
  }

  dispose() {
    // Remove lights from scene
    this.lights.forEach((light) => {
      this.scene.remove(light);
      if (light.target) {
        this.scene.remove(light.target);
      }
    });

    // Remove helpers
    this.lightHelpers.forEach((helper) => {
      this.scene.remove(helper);
      if (helper.dispose) {
        helper.dispose();
      }
    });

    this.lights = [];
    this.lightHelpers = [];
  }
}
