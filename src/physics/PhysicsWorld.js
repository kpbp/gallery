import * as CANNON from "cannon-es";

/**
 * Physics World
 * Manages the cannon-es physics simulation and syncs bodies with Three.js meshes
 */
export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 10;

    // Default contact material
    const defaultMaterial = new CANNON.Material("default");
    this.world.defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0.6, restitution: 0.05 },
    );
    this.world.defaultMaterial = defaultMaterial;

    // Body-mesh pairs for synchronization
    this.bodyMeshPairs = [];

    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;
  }

  addBody(body, mesh) {
    this.world.addBody(body);
    this.bodyMeshPairs.push({ body, mesh });
  }

  removeBody(body) {
    this.world.removeBody(body);
    this.bodyMeshPairs = this.bodyMeshPairs.filter((pair) => pair.body !== body);
  }

  step(deltaTime) {
    this.world.step(this.fixedTimeStep, deltaTime, this.maxSubSteps);
    this.syncBodies();
  }

  syncBodies() {
    for (const { body, mesh } of this.bodyMeshPairs) {
      if (!mesh) continue;
      if (body.type === CANNON.Body.STATIC) continue;

      if (body.type === CANNON.Body.KINEMATIC) {
        // Kinematic: Three.js is in control, sync mesh -> body
        body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
        body.quaternion.set(
          mesh.quaternion.x,
          mesh.quaternion.y,
          mesh.quaternion.z,
          mesh.quaternion.w,
        );
      } else {
        // Dynamic: physics is in control, sync body -> mesh
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w,
        );
      }
    }
  }

  dispose() {
    for (const { body } of this.bodyMeshPairs) {
      this.world.removeBody(body);
    }
    this.bodyMeshPairs = [];
    this.world = null;
  }
}
