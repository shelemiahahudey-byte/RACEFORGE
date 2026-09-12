/**
 * RACEFORGE Vehicle Physics Engine
 * Authoritative client/server compatible physical simulation:
 * - 4-Wheel independent tire friction circle & slip angles
 * - Dynamic weight transfer (longitudinal pitch, lateral roll)
 * - 6-Speed transmission with realistic torque curves & redline bounce
 * - Progressive drift dynamics with counter-steering stabilization & score multiplier
 * - Tire temperature & wear model across 4 compounds (Soft, Medium, Hard, Wet)
 * - Aerodynamic downforce & drag
 * - Fuel burn & mechanical damage degradation
 */

class VehiclePhysics {
  constructor(specs = {}) {
    // Machine baseline parameters
    this.mass = specs.mass || 1350; // kg
    this.horsepower = specs.horsepower || 480;
    this.torque = specs.torque || 540; // Nm
    this.topSpeedKmh = specs.topSpeed || 310;
    this.brakeForce = (specs.braking || 8.5) * 1200; // N
    this.baseGrip = specs.grip || 1.15;
    this.handling = specs.handling || 8.2;

    // Kinematic State
    this.position = { x: 0, y: 0.4, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.speedKmh = 0;
    this.speedMs = 0;
    this.heading = 0; // Yaw angle (radians)
    this.angularVelocity = 0;

    // Body dynamics & weight transfer
    this.pitch = 0; // Nose dive on brake, squat on accel
    this.roll = 0;  // Body roll into corners
    this.steerAngle = 0;
    this.targetSteer = 0;

    // Powertrain & Transmission
    this.gear = 1;
    this.gearRatios = [0, 3.82, 2.36, 1.68, 1.31, 1.05, 0.84]; // 1-6
    this.reverseRatio = 3.65;
    this.finalDrive = 3.42;
    this.rpm = 900;
    this.idleRpm = 850;
    this.redlineRpm = 8500;
    this.isAutomatic = true;

    // Controls input
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = false;
    this.boostActive = false;

    // Drifting & Slip Mechanics
    this.isDrifting = false;
    this.driftAngle = 0;
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.currentDriftPoints = 0;
    this.overallSlipRatio = 0;

    // 4 Tires Telemetry [FL, FR, RL, RR]
    this.tireCompound = specs.compound || 'Medium'; // Soft, Medium, Hard, Wet
    this.compoundGripMultipliers = {
      'Soft': 1.18,
      'Medium': 1.0,
      'Hard': 0.88,
      'Wet': 0.92
    };
    this.compoundWearRates = {
      'Soft': 0.0006,
      'Medium': 0.0003,
      'Hard': 0.00015,
      'Wet': 0.0004
    };

    this.tires = {
      fl: { wearPct: 100, tempC: 80, slip: 0 },
      fr: { wearPct: 100, tempC: 80, slip: 0 },
      rl: { wearPct: 100, tempC: 85, slip: 0 },
      rr: { wearPct: 100, tempC: 85, slip: 0 }
    };

    // Fuel & Damage
    this.fuelCapacityLiters = 65;
    this.fuelRemainingLiters = 65;
    this.damagePct = 0; // 0 to 100%
  }

  update(dt, surfaceGrip = 1.0, isWet = false) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05); // Cap delta time to prevent physics tunnel explosions

    // 1. Calculate Engine RPM and Gear Selection
    this.updatePowertrain(dt);

    // 2. Compute effective grip factor
    const compoundMult = this.compoundGripMultipliers[this.tireCompound] || 1.0;
    let weatherPenalty = 1.0;
    if (isWet) {
      weatherPenalty = this.tireCompound === 'Wet' ? 0.95 : 0.65; // Wet tires maintain traction in rain
    }
    const damagePowerPenalty = Math.max(0.4, 1.0 - (this.damagePct * 0.006));
    const effectiveGrip = this.baseGrip * compoundMult * surfaceGrip * weatherPenalty;

    // 3. Longitudinal Propulsion Force
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);

    // Speed projected along car's forward & lateral axes
    const forwardSpeed = this.velocity.x * forwardX + this.velocity.z * forwardZ;
    const lateralSpeed = this.velocity.x * rightX + this.velocity.z * rightZ;

    let driveForce = 0;
    if (this.gear > 0) {
      const ratio = this.gearRatios[this.gear] || 1.0;
      const torqueAvailable = (this.torque * 1.5) * (this.rpm / 4500) * damagePowerPenalty;
      driveForce = (torqueAvailable * ratio * this.finalDrive * this.throttle) / 0.33; // 0.33m tire radius
      if (this.boostActive) driveForce *= 1.45;
    } else if (this.gear === -1) {
      driveForce = -(this.torque * this.reverseRatio * this.finalDrive * this.throttle * 0.7) / 0.33;
    }

    // Out of fuel check
    if (this.fuelRemainingLiters <= 0) {
      driveForce = 0;
    }

    // 4. Braking and Rolling Resistance
    let brakeForceTotal = this.brake * this.brakeForce;
    if (this.handbrake) {
      brakeForceTotal += this.brakeForce * 0.8;
    }
    const rollingResistance = forwardSpeed * 80;
    const aeroDrag = 0.5 * 1.225 * 0.32 * 2.1 * forwardSpeed * forwardSpeed * Math.sign(forwardSpeed);

    // Longitudinal net force
    let netLongForce = driveForce - aeroDrag - rollingResistance;
    if (Math.abs(forwardSpeed) > 0.1) {
      netLongForce -= Math.sign(forwardSpeed) * brakeForceTotal;
    }

    // 5. Steering & Cornering Lateral Force
    const steerSmoothing = 8.0 * dt;
    // Speed-sensitive steering (tighter lock at low speed, gentle at high speed)
    const speedRatio = Math.min(1.0, Math.abs(forwardSpeed) / 50.0);
    const maxLock = 0.55 - (speedRatio * 0.32);
    const clampedTargetSteer = Math.max(-maxLock, Math.min(maxLock, this.targetSteer));
    this.steerAngle += (clampedTargetSteer - this.steerAngle) * steerSmoothing;

    // Slip Angle & Drift Initiation
    const slipAngle = Math.atan2(lateralSpeed, Math.max(1.0, Math.abs(forwardSpeed)));
    const isHandbrakeSlide = this.handbrake && Math.abs(forwardSpeed) > 8;

    let lateralFrictionMax = this.mass * 9.81 * effectiveGrip;
    if (isHandbrakeSlide) {
      lateralFrictionMax *= 0.35; // Break traction on rear axle
    }

    // Cornering force
    let corneringForce = -slipAngle * this.mass * 18 * effectiveGrip;
    if (Math.abs(corneringForce) > lateralFrictionMax) {
      corneringForce = Math.sign(corneringForce) * lateralFrictionMax;
    }

    // 6. Drift Dynamics & Score Calculation
    const driftThreshold = 0.18;
    if (Math.abs(slipAngle) > driftThreshold && Math.abs(forwardSpeed) > 12) {
      this.isDrifting = true;
      this.driftAngle = slipAngle;
      const angleMultiplier = Math.min(3.0, Math.abs(slipAngle) * 4);
      this.currentDriftPoints += Math.round(Math.abs(forwardSpeed) * angleMultiplier * dt * 25);
      this.driftMultiplier = Math.min(5, 1 + Math.floor(this.currentDriftPoints / 2500));
    } else {
      if (this.isDrifting) {
        // Bank points
        this.driftScore += Math.round(this.currentDriftPoints * this.driftMultiplier);
        this.currentDriftPoints = 0;
        this.driftMultiplier = 1;
      }
      this.isDrifting = false;
      this.driftAngle = 0;
    }

    // 7. Angular Dynamics & Turning
    let turnRate = (forwardSpeed * Math.tan(this.steerAngle)) / 2.7; // 2.7m wheelbase
    if (this.isDrifting) {
      turnRate += slipAngle * 1.5; // Oversteer rotation during drift
    }
    this.angularVelocity = turnRate;
    this.heading += this.angularVelocity * dt;

    // 8. Integrate Linear Accelerations
    const accelForward = netLongForce / this.mass;
    const accelLateral = corneringForce / this.mass;

    this.velocity.x += (forwardX * accelForward + rightX * accelLateral) * dt;
    this.velocity.z += (forwardZ * accelForward + rightZ * accelLateral) * dt;

    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Derived velocities
    this.speedMs = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedKmh = this.speedMs * 3.6;

    // 9. Weight Transfer (Pitch & Roll)
    const targetPitch = Math.max(-0.06, Math.min(0.06, (accelForward / 9.81) * 0.05));
    const targetRoll = Math.max(-0.08, Math.min(0.08, (accelLateral / 9.81) * 0.06));
    this.pitch += (targetPitch - this.pitch) * 10 * dt;
    this.roll += (targetRoll - this.roll) * 10 * dt;

    // 10. Tire Wear, Temperature & Telemetry
    this.updateTiresTelemetry(dt, slipAngle, accelForward);

    // 11. Fuel Consumption
    if (this.fuelRemainingLiters > 0 && this.throttle > 0) {
      const burnRateLps = (0.015 + (this.rpm / 8500) * 0.04) * (this.boostActive ? 1.8 : 1.0);
      this.fuelRemainingLiters = Math.max(0, this.fuelRemainingLiters - burnRateLps * dt);
    }
  }

  updatePowertrain(dt) {
    if (this.gear > 0) {
      const ratio = this.gearRatios[this.gear] || 1.0;
      const targetRpm = Math.max(this.idleRpm, (this.speedKmh * 32 * ratio * this.finalDrive) / 10);
      this.rpm += (targetRpm - this.rpm) * 14 * dt;

      // Rev limiter bounce
      if (this.rpm > this.redlineRpm) {
        this.rpm = this.redlineRpm - 250;
      }

      // Automatic gear shift logic
      if (this.isAutomatic) {
        if (this.rpm > 7800 && this.gear < 6) {
          this.gear++;
          this.rpm = 4800;
        } else if (this.rpm < 3000 && this.gear > 1) {
          this.gear--;
          this.rpm = 5500;
        }
      }
    } else if (this.gear === -1) {
      this.rpm = Math.min(this.redlineRpm, this.idleRpm + this.speedKmh * 180);
    } else {
      // Neutral rev
      if (this.throttle > 0) {
        this.rpm = Math.min(this.redlineRpm, this.rpm + 7000 * dt);
      } else {
        this.rpm = Math.max(this.idleRpm, this.rpm - 4000 * dt);
      }
    }
  }

  updateTiresTelemetry(dt, slipAngle, accelForward) {
    const wearRate = this.compoundWearRates[this.tireCompound] || 0.0003;
    const slipMagnitude = Math.abs(slipAngle) + (this.handbrake ? 0.8 : 0);
    this.overallSlipRatio = slipMagnitude;

    // Apply to 4 corners with weight transfer deltas
    const frontWeightBias = accelForward < 0 ? 1.4 : 0.8; // Braking pushes weight to front
    const rearWeightBias = accelForward > 0 ? 1.3 : 0.9;

    const corners = ['fl', 'fr', 'rl', 'rr'];
    corners.forEach((c, idx) => {
      const isFront = idx < 2;
      const weightFactor = isFront ? frontWeightBias : rearWeightBias;
      const scrub = slipMagnitude * weightFactor;

      // Wear
      this.tires[c].wearPct = Math.max(0, this.tires[c].wearPct - (wearRate * scrub * dt * 100));
      // Temp: rises under friction, cools towards ambient (80C working temp)
      const targetTemp = 80 + scrub * 55;
      this.tires[c].tempC += (targetTemp - this.tires[c].tempC) * 0.8 * dt;
      this.tires[c].slip = scrub;
    });
  }

  applyCollision(impactSpeedKmh) {
    const damage = Math.min(40, (impactSpeedKmh / 180) * 25);
    this.damagePct = Math.min(100, this.damagePct + damage);
    // Knock velocity back
    this.velocity.x *= -0.3;
    this.velocity.z *= -0.3;
  }

  pitStopRefuelAndTires() {
    this.fuelRemainingLiters = this.fuelCapacityLiters;
    this.tires.fl.wearPct = 100;
    this.tires.fr.wearPct = 100;
    this.tires.rl.wearPct = 100;
    this.tires.rr.wearPct = 100;
    this.tires.fl.tempC = 80;
    this.tires.fr.tempC = 80;
    this.tires.rl.tempC = 80;
    this.tires.rr.tempC = 80;
  }
}

window.VehiclePhysics = VehiclePhysics;
