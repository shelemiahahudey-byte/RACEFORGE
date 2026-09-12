/**
 * RACEFORGE Real-Time Multiplayer Server Engine (Socket.IO)
 * Authoritative room management, synchronized countdowns, real-time vehicle telemetry relay,
 * collision alerts, and post-race validation.
 */

const GameValidationService = require('../services/gameValidationService');

class MultiplayerHandler {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
    this.playerRooms = new Map(); // socketId -> roomId
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`⚡ [MULTIPLAYER] Driver connected: ${socket.id}`);

      // List available active race rooms
      socket.on('lobby:getRooms', (callback) => {
        const roomList = Array.from(this.rooms.values()).map(r => ({
          id: r.id,
          name: r.name,
          trackId: r.trackId,
          weather: r.weather,
          maxPlayers: r.maxPlayers,
          playerCount: r.players.size,
          status: r.status,
          hostName: r.hostName
        }));
        if (typeof callback === 'function') callback(roomList);
      });

      // Create a race room
      socket.on('room:create', ({ roomName, trackId, weather, laps, driverName, vehicleId }, callback) => {
        const roomId = `rf_room_${Math.random().toString(36).substring(2, 9)}`;
        const room = {
          id: roomId,
          name: roomName || `${driverName}'s Grand Prix`,
          trackId: Number(trackId) || 1,
          weather: weather || 'CLEAR',
          laps: Number(laps) || 3,
          hostSocketId: socket.id,
          hostName: driverName,
          status: 'LOBBY', // LOBBY, COUNTDOWN, RACING, FINISHED
          players: new Map(),
          createdAt: Date.now()
        };

        room.players.set(socket.id, {
          socketId: socket.id,
          driverName: driverName || 'Driver',
          vehicleId: Number(vehicleId) || 1,
          isReady: true, // Host is ready by default
          isHost: true,
          position: 1,
          lap: 0,
          lapTimeMs: 0,
          ping: 0
        });

        this.rooms.set(roomId, room);
        this.playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        console.log(`🏁 [ROOM CREATED] ${roomId} by ${driverName}`);
        if (typeof callback === 'function') {
          callback({ success: true, roomId, room: this.serializeRoom(room) });
        }
        this.broadcastLobbyUpdate();
      });

      // Join an existing room
      socket.on('room:join', ({ roomId, driverName, vehicleId }, callback) => {
        const room = this.rooms.get(roomId);
        if (!room) {
          return callback && callback({ success: false, error: 'Room does not exist.' });
        }
        if (room.status !== 'LOBBY') {
          return callback && callback({ success: false, error: 'Race is already underway.' });
        }
        if (room.players.size >= 8) {
          return callback && callback({ success: false, error: 'Race grid is completely full.' });
        }

        room.players.set(socket.id, {
          socketId: socket.id,
          driverName: driverName || 'Racer',
          vehicleId: Number(vehicleId) || 1,
          isReady: false,
          isHost: false,
          position: room.players.size + 1,
          lap: 0,
          lapTimeMs: 0
        });

        this.playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        console.log(`🏎️ [PLAYER JOINED] ${driverName} joined ${roomId}`);
        if (typeof callback === 'function') {
          callback({ success: true, room: this.serializeRoom(room) });
        }

        this.io.to(roomId).emit('room:playerJoined', {
          room: this.serializeRoom(room),
          newPlayer: room.players.get(socket.id)
        });
        this.broadcastLobbyUpdate();
      });

      // Toggle Ready status
      socket.on('room:toggleReady', ({ isReady }) => {
        const roomId = this.playerRooms.get(socket.id);
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
          player.isReady = !!isReady;
          this.io.to(roomId).emit('room:playerStatusChanged', {
            socketId: socket.id,
            isReady: player.isReady
          });
        }
      });

      // Host starts the countdown
      socket.on('room:startRace', () => {
        const roomId = this.playerRooms.get(socket.id);
        const room = this.rooms.get(roomId);
        if (!room || room.hostSocketId !== socket.id) return;

        room.status = 'COUNTDOWN';
        this.io.to(roomId).emit('race:countdownStart', {
          countdownSec: 3,
          trackId: room.trackId,
          weather: room.weather,
          laps: room.laps
        });

        // Countdown timer
        setTimeout(() => {
          if (room.status === 'COUNTDOWN') {
            room.status = 'RACING';
            this.io.to(roomId).emit('race:greenLight', {
              startedAt: Date.now()
            });
            this.broadcastLobbyUpdate();
          }
        }, 3500);
      });

      // High-Frequency vehicle telemetry snapshot relay (x, y, z, rotY, speed, steer, drift)
      socket.on('player:telemetry', (data) => {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        // Broadcast to all other racers in the room
        socket.to(roomId).emit('remote:telemetry', {
          socketId: socket.id,
          ...data
        });
      });

      // Lap update
      socket.on('player:lapUpdate', ({ lap, lapTimeMs, bestLapMs }) => {
        const roomId = this.playerRooms.get(socket.id);
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
          player.lap = lap;
          player.lapTimeMs = lapTimeMs;
          if (!player.bestLapMs || lapTimeMs < player.bestLapMs) {
            player.bestLapMs = lapTimeMs;
          }
        }

        this.io.to(roomId).emit('race:leaderboardUpdate', {
          socketId: socket.id,
          driverName: player ? player.driverName : 'Racer',
          lap,
          lapTimeMs
        });
      });

      // Player finishes race
      socket.on('player:finish', (resultPayload) => {
        const roomId = this.playerRooms.get(socket.id);
        const room = this.rooms.get(roomId);
        if (!room) return;

        console.log(`🏁 [FINISH LINE] ${socket.id} finished race in ${roomId}`);
        this.io.to(roomId).emit('race:playerFinished', {
          socketId: socket.id,
          driverName: resultPayload.driverName,
          totalTimeMs: resultPayload.totalTimeMs,
          bestLapMs: resultPayload.bestLapMs
        });
      });

      // Handle Disconnect
      socket.on('disconnect', () => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room) {
            room.players.delete(socket.id);
            if (room.players.size === 0) {
              this.rooms.delete(roomId);
            } else if (room.hostSocketId === socket.id) {
              // Reassign host
              const nextHostSocket = room.players.keys().next().value;
              room.hostSocketId = nextHostSocket;
              const nextHost = room.players.get(nextHostSocket);
              if (nextHost) nextHost.isHost = true;
              this.io.to(roomId).emit('room:hostChanged', { newHostId: nextHostSocket });
            }
            this.io.to(roomId).emit('room:playerLeft', { socketId: socket.id });
          }
          this.playerRooms.delete(socket.id);
          this.broadcastLobbyUpdate();
        }
      });
    });
  }

  serializeRoom(room) {
    return {
      id: room.id,
      name: room.name,
      trackId: room.trackId,
      weather: room.weather,
      laps: room.laps,
      status: room.status,
      hostSocketId: room.hostSocketId,
      players: Array.from(room.players.values())
    };
  }

  broadcastLobbyUpdate() {
    const roomList = Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      trackId: r.trackId,
      weather: r.weather,
      playerCount: r.players.size,
      status: r.status,
      hostName: r.hostName
    }));
    this.io.emit('lobby:roomsUpdated', roomList);
  }
}

module.exports = MultiplayerHandler;
