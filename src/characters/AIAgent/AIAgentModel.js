import * as THREE from "three";

/**
 * Standalone voxel "AI Agent" character — floating robot, no legs.
 * Fully independent of HumanDeveloper — add `agent.group` to any scene.
 *
 * Hierarchy:
 *   aiAgentGroup
 *     └── body
 *           ├── facepanel → leftEye, rightEye, mouth
 *           ├── antenna (+ tip)
 *           ├── leftModule, rightModule
 *           └── bottomThruster
 */
export class AIAgentModel {
  /** @param {Partial<typeof AIAgentModel.DEFAULT_PARAMS>} [params] */
  constructor(params = {}) {
    this.params = { ...AIAgentModel.DEFAULT_PARAMS, ...params };

    this.aiAgentGroup = new THREE.Group();
    this.aiAgentGroup.name = "aiAgentGroup";
    this.group = this.aiAgentGroup;

    this._buildMaterials();
    this._buildBody();

    this._hoverBaseY = this.body.position.y;
  }

  static DEFAULT_PARAMS = {
    bodyWidth: 0.7,
    bodyHeight: 0.9,
    bodyDepth: 0.45,
    /** Body center height — thruster sits just above Y=0 */
    floatHeight: 0.85,
  };

  _buildMaterials() {
    const lambert = (hex) =>
      new THREE.MeshLambertMaterial({ color: new THREE.Color(hex) });
    const glow = (hex, intensity = 1.2) =>
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(hex),
        emissive: new THREE.Color(hex),
        emissiveIntensity: intensity,
      });

    // Claude / Anthropic coral-orange palette
    this.materials = {
      chassis: lambert("#D97757"),
      chassisLight: lambert("#E68A68"),
      metal: lambert("#B85C3E"),
      accent: glow("#FFB08A", 0.9),
      eyeGlow: glow("#FFF4EC", 1.6),
      thruster: glow("#FF8C5A", 1.4),
    };
  }

  _box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _buildBody() {
    const p = this.params;

    this.body = new THREE.Group();
    this.body.name = "body";
    this.body.position.set(0, p.floatHeight, 0);

    const chassis = this._box(p.bodyWidth, p.bodyHeight, p.bodyDepth, this.materials.chassis);
    chassis.name = "bodyMesh";
    this.body.add(chassis);

    // Face panel with glowing eyes + mouth line
    this.facepanel = new THREE.Group();
    this.facepanel.name = "facepanel";
    this.facepanel.position.set(0, 0.18, p.bodyDepth * 0.5 + 0.01);

    this.leftEye = this._box(0.12, 0.12, 0.03, this.materials.eyeGlow);
    this.leftEye.name = "leftEye";
    this.leftEye.position.set(-0.14, 0.06, 0);
    this.facepanel.add(this.leftEye);

    this.rightEye = this._box(0.12, 0.12, 0.03, this.materials.eyeGlow);
    this.rightEye.name = "rightEye";
    this.rightEye.position.set(0.14, 0.06, 0);
    this.facepanel.add(this.rightEye);

    this.mouth = this._box(0.28, 0.035, 0.025, this.materials.eyeGlow);
    this.mouth.name = "mouth";
    this.mouth.position.set(0, -0.1, 0);
    this.facepanel.add(this.mouth);

    this.body.add(this.facepanel);

    // Antenna
    this.antenna = new THREE.Group();
    this.antenna.name = "antenna";
    this.antenna.position.set(0, p.bodyHeight * 0.5, 0);
    const rod = this._box(0.05, 0.32, 0.05, this.materials.metal);
    rod.name = "antennaRod";
    rod.position.y = 0.16;
    this.antenna.add(rod);
    const tip = this._box(0.1, 0.1, 0.1, this.materials.accent);
    tip.name = "antennaTip";
    tip.position.y = 0.36;
    this.antenna.add(tip);
    this.body.add(this.antenna);

    // Side modules
    this.leftModule = this._buildModule("left");
    this.rightModule = this._buildModule("right");
    this.body.add(this.leftModule, this.rightModule);

    // Bottom thruster
    this.bottomThruster = new THREE.Group();
    this.bottomThruster.name = "bottomThruster";
    this.bottomThruster.position.set(0, -p.bodyHeight * 0.5 - 0.08, 0);
    const thrusterBody = this._box(0.32, 0.16, 0.28, this.materials.metal);
    thrusterBody.name = "thrusterBody";
    this.bottomThruster.add(thrusterBody);
    const flame = this._box(0.2, 0.08, 0.18, this.materials.thruster);
    flame.name = "thrusterFlame";
    flame.position.y = -0.12;
    this.bottomThruster.add(flame);
    this.body.add(this.bottomThruster);

    this.aiAgentGroup.add(this.body);
  }

  _buildModule(side) {
    const sign = side === "left" ? -1 : 1;
    const module = new THREE.Group();
    module.name = `${side}Module`;
    module.position.set(sign * 0.44, 0, 0);

    const box = this._box(0.18, 0.4, 0.3, this.materials.chassisLight);
    box.name = `${side}ModuleMesh`;
    module.add(box);

    const accent = this._box(0.05, 0.14, 0.14, this.materials.accent);
    accent.name = `${side}ModuleAccent`;
    accent.position.set(sign * 0.1, 0.05, 0);
    module.add(accent);

    return module;
  }

  // ── Animation helpers (agent-specific) ─────────────────────────────────

  /** Gentle float bob — call each frame with elapsed seconds. */
  idleHover(timeSeconds, amount = 0.06, speed = 2) {
    this.body.position.y = this._hoverBaseY + Math.sin(timeSeconds * speed) * amount;
  }

  setPosition(x, y, z) {
    this.aiAgentGroup.position.set(x, y, z);
  }

  setRotation(yRadians) {
    this.aiAgentGroup.rotation.y = yRadians;
  }

  dispose() {
    this.aiAgentGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
}

export default AIAgentModel;
