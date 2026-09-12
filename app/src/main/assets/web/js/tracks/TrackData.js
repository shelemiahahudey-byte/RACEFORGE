/**
 * RACEFORGE Track Geometries and Spline Waypoint Profiles
 * Real 3D racing circuits with elevation, camber/banking, curbs, checkpoints, and sectors.
 */

const TRACK_CATALOG = [
  {
    id: 1,
    name: 'Harbor Run',
    difficulty: 'Beginner',
    environment: 'Coastal Harbor',
    roadWidth: 16,
    lengthMeters: 3200,
    skyColor: 0x3a7bd5,
    ambientColor: 0x6888aa,
    groundColor: 0x1f2e3d,
    curbColorA: 0xffffff,
    curbColorB: 0x0088ff,
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 250, y: 0, z: -20 },
      { x: 450, y: 2, z: 60 },
      { x: 600, y: 5, z: 250 },
      { x: 550, y: 8, z: 480 },
      { x: 380, y: 12, z: 620 },
      { x: 100, y: 10, z: 680 },
      { x: -180, y: 6, z: 590 },
      { x: -350, y: 3, z: 420 },
      { x: -450, y: 0, z: 200 },
      { x: -380, y: 0, z: -50 },
      { x: -180, y: 0, z: -120 }
    ]
  },
  {
    id: 2,
    name: 'Accra Circuit',
    difficulty: 'Intermediate',
    environment: 'Urban Metropolis',
    roadWidth: 15,
    lengthMeters: 4550,
    skyColor: 0x1a2436,
    ambientColor: 0x3d4a63,
    groundColor: 0x111622,
    curbColorA: 0xffffff,
    curbColorB: 0xff4500,
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 350, y: 0, z: 0 },
      { x: 500, y: 2, z: 120 },
      { x: 540, y: 6, z: 320 },
      { x: 360, y: 10, z: 500 },
      { x: 450, y: 15, z: 750 },
      { x: 300, y: 18, z: 920 },
      { x: 50, y: 14, z: 880 },
      { x: -120, y: 8, z: 650 },
      { x: -300, y: 5, z: 550 },
      { x: -480, y: 2, z: 300 },
      { x: -350, y: 0, z: 80 }
    ]
  },
  {
    id: 3,
    name: 'Desert Apex',
    difficulty: 'Advanced',
    environment: 'Canyon Dunes',
    roadWidth: 18,
    lengthMeters: 5200,
    skyColor: 0xdf9856,
    ambientColor: 0x8f5933,
    groundColor: 0x6e4726,
    curbColorA: 0xffffff,
    curbColorB: 0xcc2200,
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 420, y: 5, z: -80 },
      { x: 720, y: 18, z: 120 },
      { x: 850, y: 35, z: 420 },
      { x: 680, y: 38, z: 750 },
      { x: 420, y: 25, z: 980 },
      { x: 100, y: 15, z: 1100 },
      { x: -280, y: 10, z: 920 },
      { x: -550, y: 8, z: 650 },
      { x: -700, y: 4, z: 350 },
      { x: -500, y: 0, z: 50 },
      { x: -250, y: 0, z: -40 }
    ]
  },
  {
    id: 4,
    name: 'Mountain Pass',
    difficulty: 'Expert',
    environment: 'Alpine Slopes',
    roadWidth: 13,
    lengthMeters: 6100,
    skyColor: 0x4a627a,
    ambientColor: 0x2e4054,
    groundColor: 0x18242f,
    curbColorA: 0xffffff,
    curbColorB: 0x228833,
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 280, y: 25, z: 100 },
      { x: 150, y: 55, z: 300 }, // Hairpin 1
      { x: 380, y: 85, z: 450 },
      { x: 220, y: 115, z: 680 }, // Hairpin 2
      { x: 450, y: 145, z: 850 }, // Crest
      { x: 280, y: 120, z: 1050 },
      { x: -50, y: 85, z: 950 },
      { x: -250, y: 60, z: 720 },
      { x: -450, y: 30, z: 450 },
      { x: -350, y: 10, z: 180 },
      { x: -150, y: 0, z: 50 }
    ]
  },
  {
    id: 5,
    name: 'Neon Grand Prix',
    difficulty: 'Master',
    environment: 'Cyberpunk Night City',
    roadWidth: 16,
    lengthMeters: 4800,
    skyColor: 0x070913,
    ambientColor: 0x1f1035,
    groundColor: 0x05070d,
    curbColorA: 0x00f0ff,
    curbColorB: 0xff007f,
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 380, y: 0, z: 0 },
      { x: 620, y: 4, z: 180 },
      { x: 550, y: 12, z: 420 },
      { x: 350, y: 16, z: 600 },
      { x: 420, y: 24, z: 850 },
      { x: 200, y: 20, z: 1020 },
      { x: -80, y: 12, z: 920 },
      { x: -300, y: 8, z: 700 },
      { x: -520, y: 4, z: 450 },
      { x: -420, y: 0, z: 200 },
      { x: -220, y: 0, z: 40 }
    ]
  }
];

window.TRACK_CATALOG = TRACK_CATALOG;
