const db = require('../config/db');

class GarageController {
  static async getCatalog(req, res, next) {
    try {
      const [vehicles] = await db.query('SELECT * FROM `vehicles` ORDER BY unlock_level ASC, price ASC');
      res.json({ success: true, vehicles });
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerVehicles(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const [vehicles] = await db.query('SELECT * FROM `vehicles`');
      
      // In-memory or database fetch
      let owned = db.inMemoryDb.player_vehicles.filter(pv => pv.user_id === userId);
      if (owned.length === 0) {
        // Ensure default starter car if none exists
        owned = [{
          id: 1,
          user_id: userId,
          vehicle_id: 1,
          color_hex: '#FF4500',
          condition_pct: 100.0,
          mileage_km: 0.0,
          is_active: 1
        }];
        db.inMemoryDb.player_vehicles.push(owned[0]);
      }

      const enriched = owned.map(pv => {
        const base = vehicles.find(v => v.id === pv.vehicle_id) || vehicles[0];
        const installedUpgrades = db.inMemoryDb.player_vehicle_upgrades
          .filter(pvu => pvu.player_vehicle_id === pv.id)
          .map(pvu => db.inMemoryDb.vehicle_upgrades.find(u => u.id === pvu.upgrade_id))
          .filter(Boolean);

        // Calculate modified stats
        let hp = base.horsepower;
        let torque = base.torque;
        let mass = base.mass;
        let grip = base.grip;
        let topSpeed = base.top_speed;
        let braking = base.braking;
        let handling = base.handling;

        installedUpgrades.forEach(u => {
          hp += u.hp_delta || 0;
          torque += u.torque_delta || 0;
          mass += Number(u.mass_delta || 0);
          grip += Number(u.grip_delta || 0);
          topSpeed += Number(u.top_speed_delta || 0);
          braking += Number(u.braking_delta || 0);
          handling += Number(u.handling_delta || 0);
        });

        // Performance Rating (PR) index formula:
        const pr = Math.round((hp * 0.4) + (topSpeed * 0.3) + (grip * 150) + (handling * 100) - (mass * 0.05));

        const setup = db.inMemoryDb.vehicle_setups.find(s => s.player_vehicle_id === pv.id) || {
          tire_compound: 'Medium',
          tire_pressure_psi: 28.0,
          downforce_front: 0.5,
          downforce_rear: 0.5,
          gear_ratio_final: 3.42,
          brake_bias_front_pct: 55,
          suspension_stiffness: 0.60
        };

        return {
          ...pv,
          baseVehicle: base,
          installedUpgrades,
          effectiveStats: {
            horsepower: hp,
            torque,
            mass,
            grip: Number(grip.toFixed(2)),
            topSpeed: Number(topSpeed.toFixed(1)),
            braking: Number(braking.toFixed(1)),
            handling: Number(handling.toFixed(2)),
            performanceRating: pr
          },
          setup
        };
      });

      res.json({ success: true, playerVehicles: enriched });
    } catch (error) {
      next(error);
    }
  }

  static async buyVehicle(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { vehicleId } = req.body;

      const [vehicles] = await db.query('SELECT * FROM `vehicles` WHERE id = ? LIMIT 1', [vehicleId]);
      const vehicle = vehicles && vehicles[0];
      if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found in catalog.' });
      }

      // Check user profile credits & level
      let profile = db.inMemoryDb.profiles.find(p => p.user_id === userId) || { credits: 50000, level: 5 };

      if (profile.level < vehicle.unlock_level) {
        return res.status(403).json({ success: false, error: `Driver level ${vehicle.unlock_level} required to acquire this machine.` });
      }

      if (profile.credits < vehicle.price) {
        return res.status(400).json({ success: false, error: `Insufficient credits. Required: ${vehicle.price.toLocaleString()}, Available: ${profile.credits.toLocaleString()}` });
      }

      // Debit credits
      profile.credits -= vehicle.price;

      // Add to player_vehicles
      const newPv = {
        id: db.inMemoryDb.player_vehicles.length + 1,
        user_id: userId,
        vehicle_id: vehicle.id,
        color_hex: '#00F0FF',
        condition_pct: 100.0,
        mileage_km: 0.0,
        is_active: 0
      };
      db.inMemoryDb.player_vehicles.push(newPv);

      res.json({
        success: true,
        message: `${vehicle.name} added to your paddock garage!`,
        remainingCredits: profile.credits,
        playerVehicle: newPv
      });
    } catch (error) {
      next(error);
    }
  }

  static async buyUpgrade(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { playerVehicleId, upgradeId } = req.body;

      const upgrade = db.inMemoryDb.vehicle_upgrades.find(u => u.id === Number(upgradeId));
      if (!upgrade) {
        return res.status(404).json({ success: false, error: 'Upgrade not found.' });
      }

      const pv = db.inMemoryDb.player_vehicles.find(v => v.id === Number(playerVehicleId) && v.user_id === userId);
      if (!pv) {
        return res.status(404).json({ success: false, error: 'Target player vehicle not found in your garage.' });
      }

      // Check if already installed
      const alreadyInstalled = db.inMemoryDb.player_vehicle_upgrades.some(
        pvu => pvu.player_vehicle_id === pv.id && pvu.upgrade_id === upgrade.id
      );
      if (alreadyInstalled) {
        return res.status(400).json({ success: false, error: 'This upgrade tier is already installed on this machine.' });
      }

      const profile = db.inMemoryDb.profiles.find(p => p.user_id === userId) || { credits: 50000 };
      if (profile.credits < upgrade.price) {
        return res.status(400).json({ success: false, error: 'Insufficient credits for this upgrade.' });
      }

      profile.credits -= upgrade.price;
      db.inMemoryDb.player_vehicle_upgrades.push({
        id: db.inMemoryDb.player_vehicle_upgrades.length + 1,
        player_vehicle_id: pv.id,
        upgrade_id: upgrade.id,
        installed_at: new Date()
      });

      res.json({
        success: true,
        message: `Successfully installed ${upgrade.name}!`,
        remainingCredits: profile.credits
      });
    } catch (error) {
      next(error);
    }
  }

  static async repairVehicle(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { playerVehicleId } = req.params;

      const pv = db.inMemoryDb.player_vehicles.find(v => v.id === Number(playerVehicleId) && v.user_id === userId);
      if (!pv) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
      }

      const damageTaken = 100 - (pv.condition_pct || 100);
      if (damageTaken <= 0) {
        return res.json({ success: true, message: 'Vehicle is already in pristine condition.' });
      }

      const repairCost = Math.round(damageTaken * 45); // 45 credits per percent
      const profile = db.inMemoryDb.profiles.find(p => p.user_id === userId) || { credits: 20000 };

      if (profile.credits < repairCost) {
        return res.status(400).json({ success: false, error: `Insufficient credits for full repair ($${repairCost} required).` });
      }

      profile.credits -= repairCost;
      pv.condition_pct = 100.0;

      res.json({
        success: true,
        message: 'Vehicle completely repaired to 100% factory specifications.',
        cost: repairCost,
        remainingCredits: profile.credits,
        condition: 100.0
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveSetup(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { playerVehicleId, tireCompound, downforceFront, downforceRear, gearRatioFinal, brakeBiasFront, suspensionStiffness } = req.body;

      const pv = db.inMemoryDb.player_vehicles.find(v => v.id === Number(playerVehicleId) && v.user_id === userId);
      if (!pv) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
      }

      let setup = db.inMemoryDb.vehicle_setups.find(s => s.player_vehicle_id === pv.id);
      if (!setup) {
        setup = { player_vehicle_id: pv.id };
        db.inMemoryDb.vehicle_setups.push(setup);
      }

      setup.tire_compound = tireCompound || 'Medium';
      setup.downforce_front = Number(downforceFront ?? 0.5);
      setup.downforce_rear = Number(downforceRear ?? 0.5);
      setup.gear_ratio_final = Number(gearRatioFinal ?? 3.42);
      setup.brake_bias_front_pct = Number(brakeBiasFront ?? 55);
      setup.suspension_stiffness = Number(suspensionStiffness ?? 0.60);

      res.json({ success: true, message: 'Custom track setup applied successfully.', setup });
    } catch (error) {
      next(error);
    }
  }

  static async setActiveVehicle(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { playerVehicleId } = req.body;

      db.inMemoryDb.player_vehicles.forEach(v => {
        if (v.user_id === userId) {
          v.is_active = v.id === Number(playerVehicleId) ? 1 : 0;
        }
      });

      res.json({ success: true, message: 'Active machine selected for track duty.' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GarageController;
