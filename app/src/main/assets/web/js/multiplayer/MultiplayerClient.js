/**
 * RACEFORGE Real-Time Multiplayer Client Engine
 * Handles Socket.IO connection, room lobbies, synchronized race countdowns,
 * and high-frequency vehicle telemetry interpolation.
 */

class MultiplayerClient {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.socket = null;
    this.connected = false;
    this.currentRoom = null;
    this.remoteRacers = new Map(); // socketId -> { mesh, targetPos, currentPos, targetRotY, currentRotY, speedKmh }
  }

  init() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not available in this environment. Running offline mode.');
      return;
    }

    try {
      this.socket = io({
        reconnectionAttempts: 5,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('🌐 [MULTIPLAYER] Connected to Raceforge Real-Time Network:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log('🔌 [MULTIPLAYER] Disconnected from network.');
      });

      this.socket.on('lobby:roomsUpdated', (roomList) => {
        if (window.uiManager) {
          window.uiManager.renderMultiplayerRooms(roomList);
        }
      });

      this.socket.on('room:playerJoined', ({ room, newPlayer }) => {
        this.currentRoom = room;
        if (window.uiManager) {
          window.uiManager.renderRoomLobby(room);
        }
      });

      this.socket.on('room:playerStatusChanged', ({ socketId, isReady }) => {
        if (this.currentRoom && this.currentRoom.players) {
          const p = this.currentRoom.players.find(x => x.socketId === socketId);
          if (p) p.isReady = isReady;
          if (window.uiManager) {
            window.uiManager.renderRoomLobby(this.currentRoom);
          }
        }
      });

      this.socket.on('race:countdownStart', (data) => {
        console.log('🚦 [COUNTDOWN] Multiplayer race starting in 3 seconds!');
        if (this.gameEngine) {
          this.gameEngine.startMultiplayerRace(this.currentRoom);
        }
      });

      this.socket.on('remote:telemetry', (data) => {
        this.handleRemoteTelemetry(data);
      });

      this.socket.on('room:playerLeft', ({ socketId }) => {
        this.removeRemoteRacer(socketId);
      });

    } catch (e) {
      console.error('Failed to connect to multiplayer server:', e);
    }
  }

  fetchRooms(callback) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('lobby:getRooms', callback);
  }

  createRoom(roomName, trackId, weather, laps, driverName, vehicleId, callback) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('room:create', {
      roomName,
      trackId,
      weather,
      laps,
      driverName,
      vehicleId
    }, (res) => {
      if (res.success) {
        this.currentRoom = res.room;
      }
      if (callback) callback(res);
    });
  }

  joinRoom(roomId, driverName, vehicleId, callback) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('room:join', {
      roomId,
      driverName,
      vehicleId
    }, (res) => {
      if (res.success) {
        this.currentRoom = res.room;
      }
      if (callback) callback(res);
    });
  }

  toggleReady(isReady) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('room:toggleReady', { isReady });
  }

  startRace() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('room:startRace');
  }

  sendTelemetry(vehiclePhysics) {
    if (!this.socket || !this.connected || !this.currentRoom) return;

    this.socket.emit('player:telemetry', {
      x: vehiclePhysics.position.x,
      y: vehiclePhysics.position.y,
      z: vehiclePhysics.position.z,
      heading: vehiclePhysics.heading,
      speedKmh: vehiclePhysics.speedKmh,
      steerAngle: vehiclePhysics.steerAngle,
      pitch: vehiclePhysics.pitch,
      roll: vehiclePhysics.roll,
      isBraking: vehiclePhysics.brake > 0.1
    });
  }

  handleRemoteTelemetry(data) {
    let racer = this.remoteRacers.get(data.socketId);
    if (!racer && this.gameEngine && this.gameEngine.sceneManager) {
      // Spawn new remote vehicle mesh
      const mesh = window.VehicleMeshBuilder.createVehicleMesh({
        name: 'Remote_Player',
        colorHex: '#00F0FF',
        metalness: 0.85,
        roughness: 0.2
      });
      this.gameEngine.sceneManager.scene.add(mesh);
      racer = {
        mesh,
        targetPos: { x: data.x, y: data.y, z: data.z },
        currentPos: { x: data.x, y: data.y, z: data.z },
        targetRotY: data.heading,
        currentRotY: data.heading,
        speedKmh: data.speedKmh
      };
      this.remoteRacers.set(data.socketId, racer);
    }

    if (racer) {
      racer.targetPos = { x: data.x, y: data.y, z: data.z };
      racer.targetRotY = data.heading;
      racer.speedKmh = data.speedKmh;
      racer.isBraking = data.isBraking;
    }
  }

  updateRemoteRacers(dt) {
    const lerpRate = 12.0 * dt;
    this.remoteRacers.forEach((racer) => {
      racer.currentPos.x += (racer.targetPos.x - racer.currentPos.x) * lerpRate;
      racer.currentPos.y += (racer.targetPos.y - racer.currentPos.y) * lerpRate;
      racer.currentPos.z += (racer.targetPos.z - racer.currentPos.z) * lerpRate;

      racer.mesh.position.set(racer.currentPos.x, racer.currentPos.y, racer.currentPos.z);
      racer.mesh.rotation.y = racer.targetRotY;
    });
  }

  removeRemoteRacer(socketId) {
    const racer = this.remoteRacers.get(socketId);
    if (racer && this.gameEngine && this.gameEngine.sceneManager) {
      this.gameEngine.sceneManager.scene.remove(racer.mesh);
      this.remoteRacers.delete(socketId);
    }
  }
}

window.MultiplayerClient = MultiplayerClient;
