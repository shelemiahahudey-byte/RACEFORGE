const db = require('../config/db');

class LeaderboardController {
  static async getLeaderboard(req, res, next) {
    try {
      const { trackId, filter = 'global', vehicleClass } = req.query;

      let list = [...db.inMemoryDb.leaderboards];

      if (trackId) {
        list = list.filter(l => l.track_id === Number(trackId));
      }

      // Filter by vehicle class if provided
      if (vehicleClass) {
        const matchingVehicleIds = db.inMemoryDb.vehicles
          .filter(v => v.class.toLowerCase() === vehicleClass.toLowerCase())
          .map(v => v.id);
        list = list.filter(l => matchingVehicleIds.includes(l.vehicle_id));
      }

      // Sort ascending by best lap time
      list.sort((a, b) => a.best_lap_ms - b.best_lap_ms);

      // Attach track name and vehicle name
      const enriched = list.map((entry, idx) => {
        const track = db.inMemoryDb.tracks.find(t => t.id === entry.track_id);
        const vehicle = db.inMemoryDb.vehicles.find(v => v.id === entry.vehicle_id);
        return {
          rank: idx + 1,
          driverName: entry.driver_name || 'Driver',
          trackName: track ? track.name : 'Circuit',
          vehicleName: vehicle ? vehicle.name : 'GT Machine',
          bestLapMs: entry.best_lap_ms,
          bestLapFormatted: formatLapTime(entry.best_lap_ms),
          rating: entry.rating || 1200,
          weather: entry.weather || 'CLEAR',
          submittedAt: entry.submitted_at
        };
      });

      res.json({ success: true, count: enriched.length, leaderboard: enriched });
    } catch (error) {
      next(error);
    }
  }
}

function formatLapTime(ms) {
  if (!ms) return '--:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

module.exports = LeaderboardController;
