/**
 * RACEFORGE Intelligent AI Driver Engine
 * Simulates competitive AI opponents with distinct personalities:
 * Aggressive, Defensive, Balanced, Cautious, and Expert.
 */

class AIManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.opponents = [];
  }

  spawnOpponents(trackCurve, participants = []) {
    const THREE = window.THREE;
    // Clear old AI vehicles
    this.opponents.forEach(o => {
      if (o.mesh) this.sceneManager.scene.remove(o.mesh);
    });
    this.opponents = [];

    const aiList = participants.filter(p => p.isAi);
    const colors = ['#00F0FF', '#FFD700', '#FF2A4D', '#A020F0', '#00FF88', '#FFFFFF'];

    aiList.forEach((aiData, idx) => {
      const color = colors[idx % colors.length];
      const mesh = window.VehicleMeshBuilder.createVehicleMesh({
        name: aiData.driverName,
        colorHex: color,
        metalness: 0.8,
        roughness: 0.25
      });
      this.sceneManager.scene.add(mesh);

      // Starting progress along track (grid spacing)
      const gridOffset = -0.015 * (idx + 1);
      const personality = aiData.aiPersonality || 'BALANCED';

      // Base top speeds and braking behaviors per personality
      let aggressionFactor = 1.0;
      let targetSpeedKmh = 230 + Math.random() * 40;
      let lateralOffset = (idx % 2 === 0 ? 1 : -1) * (2.0 + Math.random() * 3.0);

      if (personality === 'AGGRESSIVE') {
        aggressionFactor = 1.25;
        targetSpeedKmh += 20;
      } else if (personality === 'CAUTIOUS') {
        aggressionFactor = 0.85;
        targetSpeedKmh -= 15;
      } else if (personality === 'EXPERT') {
        aggressionFactor = 1.15;
        targetSpeedKmh += 30;
      }

      const opponent = {
        id: `ai_${idx}`,
        driverName: aiData.driverName,
        personality,
        mesh,
        progress: (gridOffset + 1.0) % 1.0,
        speedKmh: 0,
        targetSpeedKmh,
        lateralOffset,
        aggressionFactor,
        currentLap: 0,
        lapStartTime: Date.now(),
        bestLapMs: null,
        totalTimeMs: 0,
        finished: false,
        heading: 0,
        position: { x: 0, y: 0.4, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
      };

      this.opponents.push(opponent);
    });
  }

  update(dt, trackCurve, playerPhysics, totalLaps = 3) {
    if (!trackCurve || this.opponents.length === 0) return;

    const THREE = window.THREE;

    this.opponents.forEach((ai) => {
      if (ai.finished) return;

      // 1. Progress along the track spline
      // Curve length approximation ~ 3500m
      const curveLength = 3500;
      const speedMs = (ai.speedKmh / 3.6);
      const progressDelta = (speedMs * dt) / curveLength;

      const prevProgress = ai.progress;
      ai.progress = (ai.progress + progressDelta) % 1.0;

      // Lap completion detection
      if (prevProgress > 0.85 && ai.progress < 0.15) {
        ai.currentLap++;
        const now = Date.now();
        const lapDuration = now - ai.lapStartTime;
        if (!ai.bestLapMs || lapDuration < ai.bestLapMs) {
          ai.bestLapMs = lapDuration;
        }
        ai.lapStartTime = now;

        if (ai.currentLap >= totalLaps) {
          ai.finished = true;
          ai.totalTimeMs = (ai.bestLapMs || 60000) * totalLaps;
        }
      }

      // 2. Sample track position and tangent
      const trackPoint = trackCurve.getPointAt(ai.progress);
      const tangent = trackCurve.getTangentAt(ai.progress).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Lateral positioning along road width
      const actualPos = trackPoint.clone().add(binormal.clone().multiplyScalar(ai.lateralOffset));
      ai.position.x = actualPos.x;
      ai.position.y = actualPos.y + 0.35;
      ai.position.z = actualPos.z;

      // 3. Accelerate towards target speed
      if (ai.speedKmh < ai.targetSpeedKmh) {
        ai.speedKmh += (18 * ai.aggressionFactor) * dt;
      }

      // 4. Update mesh transform
      ai.mesh.position.set(ai.position.x, ai.position.y, ai.position.z);
      const lookTarget = actualPos.clone().add(tangent.clone().multiplyScalar(10));
      ai.mesh.lookAt(lookTarget);

      // Rotate AI wheels
      if (ai.mesh.userData && ai.mesh.userData.wheelMeshes) {
        const rot = (speedMs / 0.34) * dt;
        Object.values(ai.mesh.userData.wheelMeshes).forEach(w => {
          w.children.forEach(c => c.rotation.x += rot);
        });
      }

      // 5. Collision with Player Vehicle
      if (playerPhysics) {
        const dx = playerPhysics.position.x - ai.position.x;
        const dz = playerPhysics.position.z - ai.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.3) {
          // Bumper to bumper or side impact
          const relativeSpeed = Math.abs(playerPhysics.speedKmh - ai.speedKmh);
          playerPhysics.applyCollision(relativeSpeed + 30);
          ai.speedKmh = Math.max(40, ai.speedKmh - 35);

          if (window.audioManager) {
            window.audioManager.playCollision(0.7);
          }
          if (window.cameraManager) {
            window.cameraManager.triggerShake(0.8);
          }
        }
      }
    });
  }

  getLeaderboardOrder(playerProgress, playerLap) {
    const all = [
      { name: 'Player', isPlayer: true, score: playerLap + playerProgress, progress: playerProgress, lap: playerLap }
    ];

    this.opponents.forEach(ai => {
      all.push({
        name: ai.driverName,
        isPlayer: false,
        score: ai.currentLap + ai.progress,
        progress: ai.progress,
        lap: ai.currentLap,
        speedKmh: Math.round(ai.speedKmh)
      });
    });

    all.sort((a, b) => b.score - a.score);
    return all;
  }
}

window.AIManager = AIManager;
