import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";

/**
 * Post-Processing Pipeline
 * Manages EffectComposer and all visual enhancement passes
 */
export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.passes = {};
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.composer = new EffectComposer(this.renderer);

    // 1. Base render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.render = renderPass;

    // 2. SSAO — contact shadows and ambient occlusion
    const ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    ssaoPass.kernelRadius = 0.6;
    ssaoPass.minDistance = 0.001;
    ssaoPass.maxDistance = 0.35;
    ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.composer.addPass(ssaoPass);
    this.passes.ssao = ssaoPass;

    // 3. Bloom — subtle glow on bright areas (window, highlights)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.15, // strength — subtle
      0.4,  // radius
      0.85, // threshold — only bright areas bloom
    );
    this.composer.addPass(bloomPass);
    this.passes.bloom = bloomPass;

    // 4. Color correction — warm up midtones slightly
    const colorPass = new ShaderPass(ColorCorrectionShader);
    colorPass.uniforms.powRGB.value = new THREE.Vector3(1.02, 1.0, 0.98); // Slight warm shift
    colorPass.uniforms.mulRGB.value = new THREE.Vector3(1.05, 1.03, 1.0); // Subtle warm multiply
    this.composer.addPass(colorPass);
    this.passes.color = colorPass;

    // 7. SMAA anti-aliasing
    const smaaPass = new SMAAPass(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio());
    this.composer.addPass(smaaPass);
    this.passes.smaa = smaaPass;

    // 8. Output pass — tone mapping and encoding
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
    this.passes.output = outputPass;

    console.log("Post-processing pipeline initialized");
  }

  render() {
    this.composer.render();
  }

  resize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio();
    this.composer.setSize(width, height);

    if (this.passes.ssao) {
      this.passes.ssao.setSize(width, height);
    }
    if (this.passes.smaa) {
      this.passes.smaa.setSize(width * pixelRatio, height * pixelRatio);
    }
  }

  setBloomIntensity(strength) {
    if (this.passes.bloom) {
      this.passes.bloom.strength = strength;
    }
  }

  getBloomIntensity() {
    return this.passes.bloom ? this.passes.bloom.strength : 0;
  }

  dispose() {
    if (this.composer) {
      this.composer.passes.forEach((pass) => {
        if (pass.dispose) {
          pass.dispose();
        }
      });
    }
  }
}
