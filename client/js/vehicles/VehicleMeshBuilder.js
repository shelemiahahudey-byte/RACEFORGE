/**
 * RACEFORGE 3D Vehicle Procedural Mesh Builder
 * Constructs high-fidelity motorsport machines with metallic clearcoat materials,
 * rotating wheels, glowing LED headlights/taillights, carbon diffusers, and spoilers.
 */

class VehicleMeshBuilder {
  static createVehicleMesh(specs = {}) {
    const THREE = window.THREE;
    if (!THREE) return null;

    const carGroup = new THREE.Group();
    carGroup.name = specs.name || 'Raceforge_GT';

    const colorHex = specs.colorHex ? parseInt(specs.colorHex.replace('#', '0x')) : 0xFF4500;

    // Body Paint Material (Clearcoat sports finish)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: specs.metalness !== undefined ? specs.metalness : 0.85,
      roughness: specs.roughness !== undefined ? specs.roughness : 0.2,
      envMapIntensity: 1.5,
    });

    // Carbon Fiber Material
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x181818,
      metalness: 0.3,
      roughness: 0.6,
    });

    // Glass Material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111625,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      reflectivity: 0.9,
    });

    // Chrome / Alloy Material
    const alloyMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Rubber Tire Material
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1c1c,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Emissive Light Materials
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.0,
      roughness: 0.1
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x550000,
      emissive: 0xff0022,
      emissiveIntensity: 2.0,
      roughness: 0.1
    });

    // 1. Main Chassis / Lower Body
    const chassisGeom = new THREE.BoxGeometry(1.9, 0.45, 4.4);
    const chassisMesh = new THREE.Mesh(chassisGeom, bodyMaterial);
    chassisMesh.position.y = 0.45;
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    carGroup.add(chassisMesh);

    // 2. Cabin / Roof (Cockpit)
    const cabinGeom = new THREE.BoxGeometry(1.5, 0.45, 2.1);
    const cabinMesh = new THREE.Mesh(cabinGeom, glassMaterial);
    cabinMesh.position.set(0, 0.85, -0.2);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Roof Cap
    const roofGeom = new THREE.BoxGeometry(1.4, 0.08, 1.8);
    const roofMesh = new THREE.Mesh(roofGeom, bodyMaterial);
    roofMesh.position.set(0, 1.1, -0.2);
    carGroup.add(roofMesh);

    // 3. Front Nose & Hood Scoop
    const hoodGeom = new THREE.BoxGeometry(1.8, 0.18, 1.4);
    const hoodMesh = new THREE.Mesh(hoodGeom, bodyMaterial);
    hoodMesh.position.set(0, 0.6, 1.4);
    hoodMesh.rotation.x = 0.08;
    carGroup.add(hoodMesh);

    // Front Carbon Splitter
    const splitterGeom = new THREE.BoxGeometry(2.0, 0.06, 0.5);
    const splitterMesh = new THREE.Mesh(splitterGeom, carbonMaterial);
    splitterMesh.position.set(0, 0.2, 2.2);
    carGroup.add(splitterMesh);

    // 4. Rear Spoiler Wing
    const wingGeom = new THREE.BoxGeometry(1.9, 0.06, 0.4);
    const wingMesh = new THREE.Mesh(wingGeom, carbonMaterial);
    wingMesh.position.set(0, 1.05, -2.05);

    // Wing Struts
    const strutLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.1), carbonMaterial);
    strutLeft.position.set(-0.6, 0.85, -2.05);
    const strutRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.1), carbonMaterial);
    strutRight.position.set(0.6, 0.85, -2.05);
    carGroup.add(wingMesh, strutLeft, strutRight);

    // 5. Headlights (Twin Angled LEDs)
    const hlGeom = new THREE.BoxGeometry(0.35, 0.1, 0.15);
    const hlLeft = new THREE.Mesh(hlGeom, headlightMat);
    hlLeft.position.set(-0.7, 0.52, 2.15);
    const hlRight = new THREE.Mesh(hlGeom, headlightMat);
    hlRight.position.set(0.7, 0.52, 2.15);
    carGroup.add(hlLeft, hlRight);

    // 6. Taillights (Rear Lightbar)
    const tlGeom = new THREE.BoxGeometry(1.7, 0.1, 0.1);
    const tlBar = new THREE.Mesh(tlGeom, taillightMat);
    tlBar.position.set(0, 0.55, -2.2);
    carGroup.add(tlBar);

    // 7. Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
    const exGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16);
    exGeom.rotateX(Math.PI / 2);
    const exLeft = new THREE.Mesh(exGeom, exhaustMat);
    exLeft.position.set(-0.4, 0.25, -2.2);
    const exRight = new THREE.Mesh(exGeom, exhaustMat);
    exRight.position.set(0.4, 0.25, -2.2);
    carGroup.add(exLeft, exRight);

    // 8. 4 Wheels & Tires with Disc Brakes
    const wheelPositions = [
      { id: 'fl', x: -0.96, y: 0.33, z: 1.35, isFront: true },
      { id: 'fr', x: 0.96, y: 0.33, z: 1.35, isFront: true },
      { id: 'rl', x: -0.96, y: 0.33, z: -1.35, isFront: false },
      { id: 'rr', x: 0.96, y: 0.33, z: -1.35, isFront: false }
    ];

    const wheelMeshes = {};

    wheelPositions.forEach(w => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(w.x, w.y, w.z);

      // Rubber Tire
      const tireGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 20);
      tireGeom.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeom, tireMaterial);
      tireMesh.castShadow = true;
      wheelHub.add(tireMesh);

      // Alloy Rim Center
      const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12);
      rimGeom.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeom, alloyMaterial);
      wheelHub.add(rimMesh);

      // Brake Rotor
      const discGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16);
      discGeom.rotateZ(Math.PI / 2);
      const discMesh = new THREE.Mesh(discGeom, alloyMaterial);
      wheelHub.add(discMesh);

      carGroup.add(wheelHub);
      wheelMeshes[w.id] = wheelHub;
    });

    // Reference parts for real-time animations
    carGroup.userData = {
      bodyMaterial,
      taillightMat,
      wheelMeshes,
      updateVisuals: (physics, isBraking) => {
        // Rotate wheels based on vehicle forward speed
        const wheelRotDelta = (physics.speedMs / 0.34) * 0.016;
        Object.values(wheelMeshes).forEach(w => {
          w.children.forEach(c => c.rotation.x += wheelRotDelta);
        });

        // Steer front wheels
        wheelMeshes.fl.rotation.y = physics.steerAngle;
        wheelMeshes.fr.rotation.y = physics.steerAngle;

        // Taillight brake glow
        taillightMat.emissiveIntensity = isBraking ? 5.0 : 1.5;
        taillightMat.color.setHex(isBraking ? 0xff0000 : 0x660000);

        // Body pitch & roll
        chassisMesh.rotation.x = physics.pitch;
        chassisMesh.rotation.z = physics.roll;
        cabinMesh.rotation.x = physics.pitch;
        cabinMesh.rotation.z = physics.roll;
        roofMesh.rotation.x = physics.pitch;
        roofMesh.rotation.z = physics.roll;
        wingMesh.rotation.x = physics.pitch;
        wingMesh.rotation.z = physics.roll;
      }
    };

    return carGroup;
  }
}

window.VehicleMeshBuilder = VehicleMeshBuilder;
