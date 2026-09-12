/**
 * RACEFORGE Dynamic Motorsport Camera Engine
 * Multiple driving perspectives: Chase, Hood, Cockpit, and Cinematic Orbit.
 * Features speed-sensitive FOV stretch, spring-damper follow, and impact camera shake.
 */

class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'CHASE'; // CHASE, HOOD, COCKPIT, ORBIT
    this.modes = ['CHASE', 'HOOD', 'COCKPIT'];

    // Target positions & smoothing
    this.currentPos = { x: 0, y: 5, z: -10 };
    this.currentLookAt = { x: 0, y: 1, z: 0 };

    // Shake intensity
    this.shakeIntensity = 0;

    // Orbit angle for menu showcase
    this.orbitAngle = 0;
  }

  toggleCamera() {
    const currentIndex = this.modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % this.modes.length;
    this.mode = this.modes[nextIndex];
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
  }

  triggerShake(amount = 0.5) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + amount);
  }

  update(dt, vehiclePhysics, vehicleMesh) {
    if (!this.camera) return;

    // Decay camera shake
    if (this.shakeIntensity > 0.01) {
      this.shakeIntensity *= Math.pow(0.05, dt);
    } else {
      this.shakeIntensity = 0;
    }

    const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;

    if (this.mode === 'ORBIT') {
      // Rotate around the vehicle in menu or garage
      this.orbitAngle += 0.35 * dt;
      const radius = 6.8;
      const height = 2.4;
      const focus = vehiclePhysics ? vehiclePhysics.position : { x: 0, y: 0.8, z: 0 };

      this.camera.position.set(
        focus.x + Math.sin(this.orbitAngle) * radius,
        focus.y + height,
        focus.z + Math.cos(this.orbitAngle) * radius
      );
      this.camera.lookAt(focus.x, focus.y + 0.6, focus.z);
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
      return;
    }

    if (!vehiclePhysics) return;

    const vPos = vehiclePhysics.position;
    const heading = vehiclePhysics.heading;
    const speedKmh = vehiclePhysics.speedKmh;

    // Forward and Right vectors
    const fX = Math.sin(heading);
    const fZ = Math.cos(heading);

    if (this.mode === 'CHASE') {
      // Chase Cam: trailing behind and above
      const followDistance = 6.2 + (speedKmh / 200) * 1.5;
      const followHeight = 2.3 - (vehiclePhysics.pitch * 2.0);

      const targetCamX = vPos.x - fX * followDistance + shakeX;
      const targetCamY = vPos.y + followHeight + shakeY;
      const targetCamZ = vPos.z - fZ * followDistance;

      // Smooth interpolation
      const smoothFactor = 9.0 * dt;
      this.currentPos.x += (targetCamX - this.currentPos.x) * smoothFactor;
      this.currentPos.y += (targetCamY - this.currentPos.y) * smoothFactor;
      this.currentPos.z += (targetCamZ - this.currentPos.z) * smoothFactor;

      const targetLookX = vPos.x + fX * 5.0;
      const targetLookY = vPos.y + 1.2;
      const targetLookZ = vPos.z + fZ * 5.0;

      this.currentLookAt.x += (targetLookX - this.currentLookAt.x) * 12.0 * dt;
      this.currentLookAt.y += (targetLookY - this.currentLookAt.y) * 12.0 * dt;
      this.currentLookAt.z += (targetLookZ - this.currentLookAt.z) * 12.0 * dt;

      this.camera.position.set(this.currentPos.x, this.currentPos.y, this.currentPos.z);
      this.camera.lookAt(this.currentLookAt.x, this.currentLookAt.y, this.currentLookAt.z);

      // Speed FOV stretch: 60deg at stop -> 78deg at 300 km/h
      const targetFov = 60 + Math.min(22, (speedKmh / 280) * 22);
      this.camera.fov += (targetFov - this.camera.fov) * 5.0 * dt;
      this.camera.updateProjectionMatrix();

    } else if (this.mode === 'HOOD') {
      // Hood Cam: positioned on the front nose
      const hoodCamX = vPos.x + fX * 1.2 + shakeX * 0.5;
      const hoodCamY = vPos.y + 0.85 + shakeY * 0.5;
      const hoodCamZ = vPos.z + fZ * 1.2;

      this.camera.position.set(hoodCamX, hoodCamY, hoodCamZ);
      this.camera.lookAt(vPos.x + fX * 30.0, vPos.y + 0.8, vPos.z + fZ * 30.0);

      this.camera.fov = 75 + Math.min(20, (speedKmh / 280) * 20);
      this.camera.updateProjectionMatrix();

    } else if (this.mode === 'COCKPIT') {
      // Interior Driver Cockpit View
      const cockpitCamX = vPos.x - fX * 0.2 + shakeX * 0.3;
      const cockpitCamY = vPos.y + 1.05 + shakeY * 0.3;
      const cockpitCamZ = vPos.z - fZ * 0.2;

      this.camera.position.set(cockpitCamX, cockpitCamY, cockpitCamZ);
      this.camera.lookAt(vPos.x + fX * 25.0, vPos.y + 1.0, vPos.z + fZ * 25.0);

      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    }
  }
}

window.CameraManager = CameraManager;
