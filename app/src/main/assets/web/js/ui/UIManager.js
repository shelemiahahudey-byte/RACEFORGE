/**
 * RACEFORGE UI/UX Manager
 * Manages menus, garage customization, upgrades, career progression, leaderboards,
 * live telemetry HUD, minimap rendering, and mobile touch controls.
 */

class UIManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.currentScreen = 'loading';
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.bindEvents();
    this.bindControls();
  }

  bindEvents() {
    // Menu buttons
    document.querySelectorAll('[data-screen]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-screen');
        this.showScreen(target);
        if (window.audioManager) window.audioManager.playUiClick();
      });
    });

    // Close modal buttons
    document.querySelectorAll('.rf-modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showScreen('main-menu');
        if (window.audioManager) window.audioManager.playUiClick();
      });
    });

    // Quick Race Launch Button
    const startQuickRaceBtn = document.getElementById('btn-start-quick-race');
    if (startQuickRaceBtn) {
      startQuickRaceBtn.addEventListener('click', () => {
        const trackId = document.getElementById('select-track').value;
        const weather = document.getElementById('select-weather').value;
        const laps = document.getElementById('select-laps').value;
        this.gameEngine.startSingleplayerRace({
          trackId: Number(trackId),
          weather,
          laps: Number(laps)
        });
      });
    }

    // Camera Switch button
    const camBtn = document.getElementById('touch-camera-switch');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        if (this.gameEngine.cameraManager) {
          const mode = this.gameEngine.cameraManager.toggleCamera();
          camBtn.innerText = mode.substring(0, 3);
        }
      });
    }

    // Results Continue Button
    const btnContinue = document.getElementById('btn-results-continue');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        this.showScreen('main-menu');
      });
    }
  }

  bindControls() {
    // Mobile Touch Controls
    const setupTouch = (elemId, onPress, onRelease) => {
      const el = document.getElementById(elemId);
      if (!el) return;

      const handlePress = (e) => {
        e.preventDefault();
        onPress();
      };
      const handleRelease = (e) => {
        e.preventDefault();
        onRelease();
      };

      el.addEventListener('touchstart', handlePress, { passive: false });
      el.addEventListener('touchend', handleRelease, { passive: false });
      el.addEventListener('mousedown', handlePress);
      el.addEventListener('mouseup', handleRelease);
      el.addEventListener('mouseleave', onRelease);
    };

    setupTouch('touch-steer-left',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.targetSteer = 0.55; },
      () => { if (this.gameEngine.physics && this.gameEngine.physics.targetSteer > 0) this.gameEngine.physics.targetSteer = 0; }
    );

    setupTouch('touch-steer-right',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.targetSteer = -0.55; },
      () => { if (this.gameEngine.physics && this.gameEngine.physics.targetSteer < 0) this.gameEngine.physics.targetSteer = 0; }
    );

    setupTouch('touch-accelerate',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.throttle = 1.0; },
      () => { if (this.gameEngine.physics) this.gameEngine.physics.throttle = 0; }
    );

    setupTouch('touch-brake',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.brake = 1.0; },
      () => { if (this.gameEngine.physics) this.gameEngine.physics.brake = 0; }
    );

    setupTouch('touch-handbrake',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.handbrake = true; },
      () => { if (this.gameEngine.physics) this.gameEngine.physics.handbrake = false; }
    );

    setupTouch('touch-boost',
      () => { if (this.gameEngine.physics) this.gameEngine.physics.boostActive = true; },
      () => { if (this.gameEngine.physics) this.gameEngine.physics.boostActive = false; }
    );

    // Keyboard controls
    const keys = {};
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (window.audioManager) window.audioManager.unlock();

      if (e.code === 'KeyC' && this.gameEngine.cameraManager) {
        this.gameEngine.cameraManager.toggleCamera();
      }
      if (e.code === 'Escape' && this.gameEngine.gameState === 'RACING') {
        this.showScreen('main-menu');
        this.gameEngine.gameState = 'MENU';
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    this.keys = keys;
  }

  updateKeyboardInputs() {
    const p = this.gameEngine.physics;
    if (!p) return;

    let steer = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer += 0.55;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) steer -= 0.55;
    if (steer !== 0) p.targetSteer = steer;
    else if (!document.getElementById('touch-steer-left')?.matches(':active') &&
             !document.getElementById('touch-steer-right')?.matches(':active')) {
      p.targetSteer = 0;
    }

    if (this.keys['ArrowUp'] || this.keys['KeyW']) p.throttle = 1.0;
    else if (!document.getElementById('touch-accelerate')?.matches(':active')) p.throttle = 0;

    if (this.keys['ArrowDown'] || this.keys['KeyS']) p.brake = 1.0;
    else if (!document.getElementById('touch-brake')?.matches(':active')) p.brake = 0;

    p.handbrake = !!this.keys['Space'] || !!document.getElementById('touch-handbrake')?.matches(':active');
    p.boostActive = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || !!document.getElementById('touch-boost')?.matches(':active');
  }

  showScreen(screenId) {
    this.currentScreen = screenId;
    document.querySelectorAll('.ui-layer').forEach(layer => {
      if (layer.id === screenId) {
        layer.classList.remove('hidden');
      } else if (layer.id !== 'racing-hud' && layer.id !== 'screen-vignette') {
        layer.classList.add('hidden');
      }
    });

    const hud = document.getElementById('racing-hud');
    const mobileControls = document.getElementById('mobile-controls');

    if (screenId === 'racing') {
      hud.classList.remove('hidden');
      mobileControls.style.display = 'block';
      if (this.gameEngine.cameraManager) {
        this.gameEngine.cameraManager.setMode('CHASE');
      }
    } else {
      hud.classList.add('hidden');
      mobileControls.style.display = 'none';
      if (this.gameEngine.cameraManager) {
        this.gameEngine.cameraManager.setMode('ORBIT');
      }
    }

    // Screen specific triggers
    if (screenId === 'garage-modal') this.loadGarageData();
    if (screenId === 'leaderboard-modal') this.loadLeaderboardData();
    if (screenId === 'career-modal') this.loadCareerData();
    if (screenId === 'multiplayer-modal') this.loadMultiplayerData();
  }

  updateHud(physics, raceState, aiOrder) {
    if (!physics || this.currentScreen !== 'racing') return;

    // Speedometer & RPM
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) speedEl.innerText = Math.round(physics.speedKmh);

    const gearEl = document.getElementById('hud-gear');
    if (gearEl) gearEl.innerText = physics.gear === -1 ? 'R' : (physics.gear === 0 ? 'N' : physics.gear);

    const rpmFill = document.getElementById('hud-rpm-fill');
    if (rpmFill) {
      const pct = Math.min(100, Math.round((physics.rpm / physics.redlineRpm) * 100));
      rpmFill.style.width = `${pct}%`;
    }

    // Position & Laps
    const posEl = document.getElementById('hud-pos-val');
    if (posEl && aiOrder && aiOrder.length > 0) {
      const playerRank = aiOrder.findIndex(o => o.isPlayer) + 1;
      posEl.innerText = playerRank;
    }

    const lapEl = document.getElementById('hud-lap-val');
    if (lapEl) lapEl.innerText = `${raceState.currentLap} / ${raceState.totalLaps}`;

    // Lap Timer
    const timerEl = document.getElementById('hud-timer-val');
    if (timerEl && raceState.lapStartTime) {
      const elapsed = Date.now() - raceState.lapStartTime;
      timerEl.innerText = this.formatTime(elapsed);
    }

    // Tires telemetry
    const flEl = document.getElementById('tire-fl');
    const frEl = document.getElementById('tire-fr');
    const rlEl = document.getElementById('tire-rl');
    const rrEl = document.getElementById('tire-rr');

    const updateTireBadge = (el, t) => {
      if (!el) return;
      el.innerText = `${Math.round(t.wearPct)}%`;
      el.className = 'tire-badge';
      if (t.wearPct < 30) el.classList.add('critical');
      else if (t.wearPct < 60) el.classList.add('worn');
    };

    updateTireBadge(flEl, physics.tires.fl);
    updateTireBadge(frEl, physics.tires.fr);
    updateTireBadge(rlEl, physics.tires.rl);
    updateTireBadge(rrEl, physics.tires.rr);

    // Fuel & Damage
    const fuelFill = document.getElementById('hud-fuel-fill');
    if (fuelFill) {
      const fuelPct = Math.round((physics.fuelRemainingLiters / physics.fuelCapacityLiters) * 100);
      fuelFill.style.width = `${fuelPct}%`;
    }

    const damageFill = document.getElementById('hud-damage-fill');
    if (damageFill) {
      damageFill.style.width = `${Math.round(physics.damagePct)}%`;
    }

    // Drift notification
    const driftEl = document.getElementById('drift-notification');
    if (driftEl) {
      if (physics.isDrifting && physics.currentDriftPoints > 50) {
        driftEl.classList.add('active');
        driftEl.innerText = `+${physics.currentDriftPoints.toLocaleString()} DRIFT! x${physics.driftMultiplier}`;
      } else {
        driftEl.classList.remove('active');
      }
    }

    // Minimap
    this.renderMinimap(physics, raceState.trackConfig, aiOrder);
  }

  renderMinimap(playerPhysics, trackConfig, aiOrder) {
    if (!this.minimapCtx || !trackConfig) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Track bounds normalization
    const scale = 0.08;
    const cx = w / 2;
    const cy = h / 2;

    // Draw track spline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    trackConfig.waypoints.forEach((p, idx) => {
      const px = cx + p.x * scale;
      const py = cy + p.z * scale;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw AI Opponent dots
    if (aiOrder) {
      ctx.fillStyle = '#00F0FF';
      aiOrder.filter(o => !o.isPlayer).forEach(ai => {
        if (ai.position) {
          const ax = cx + ai.position.x * scale;
          const ay = cy + ai.position.z * scale;
          ctx.beginPath();
          ctx.arc(ax, ay, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Player marker
    const px = cx + playerPhysics.position.x * scale;
    const py = cy + playerPhysics.position.z * scale;
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  showCountdown(number) {
    const el = document.getElementById('race-countdown-overlay');
    if (!el) return;

    if (number === 'GO') {
      el.innerText = 'GO!';
      el.style.color = '#00FF88';
      el.classList.add('show');
      if (window.audioManager) window.audioManager.playCountdownBeep(true);
      setTimeout(() => el.classList.remove('show'), 1200);
    } else {
      el.innerText = number;
      el.style.color = '#FFFFFF';
      el.classList.add('show');
      if (window.audioManager) window.audioManager.playCountdownBeep(false);
      setTimeout(() => el.classList.remove('show'), 800);
    }
  }

  showResults(results) {
    this.showScreen('results-modal');
    const posTitle = document.getElementById('results-pos-text');
    if (posTitle) {
      posTitle.innerText = `P${results.position}`;
      posTitle.className = `results-position-title ${results.position === 1 ? 'p1' : ''}`;
    }

    document.getElementById('res-total-time').innerText = this.formatTime(results.totalTimeMs);
    document.getElementById('res-best-lap').innerText = this.formatTime(results.bestLapMs);
    document.getElementById('res-credits').innerText = `+$${(results.rewards?.credits || 4500).toLocaleString()}`;
    document.getElementById('res-xp').innerText = `+${(results.rewards?.xp || 1200).toLocaleString()} XP`;

    // Update topbar profile credits
    const creditEl = document.getElementById('topbar-credits');
    if (creditEl && results.updatedCredits) {
      creditEl.innerText = `$${results.updatedCredits.toLocaleString()}`;
    }
  }

  async loadGarageData() {
    const grid = document.getElementById('garage-cars-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/garage/my-vehicles');
      const data = await res.json();
      if (data.success) {
        grid.innerHTML = data.playerVehicles.map(v => `
          <div class="selection-card ${v.is_active ? 'selected' : ''}" onclick="window.uiManager.selectCar(${v.id})">
            <h3 style="font-family: var(--font-racing); color: white; margin-bottom: 6px;">${v.baseVehicle.name}</h3>
            <p style="color: var(--rf-accent-cyan); font-weight: 700; margin-bottom: 12px;">Class: ${v.baseVehicle.class}</p>
            <div class="stat-row">
              <div class="stat-label-row"><span>HORSEPOWER</span><span class="stat-val">${v.effectiveStats.horsepower} HP</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${Math.min(100, v.effectiveStats.horsepower / 7)}%"></div></div>
            </div>
            <div class="stat-row">
              <div class="stat-label-row"><span>TOP SPEED</span><span class="stat-val">${v.effectiveStats.topSpeed} KM/H</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${Math.min(100, v.effectiveStats.topSpeed / 4)}%"></div></div>
            </div>
            <div class="stat-row">
              <div class="stat-label-row"><span>CONDITION</span><span class="stat-val">${Math.round(v.condition_pct)}%</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${v.condition_pct}%; background: ${v.condition_pct < 50 ? '#FF2A4D' : '#00FF88'}"></div></div>
            </div>
            <div style="margin-top: 14px; display: flex; gap: 8px;">
              <button class="rf-btn" style="font-size: 0.85rem; padding: 6px 12px;" onclick="window.uiManager.repairCar(${v.id})">REPAIR ($${Math.round((100 - v.condition_pct) * 45)})</button>
              <button class="rf-btn secondary" style="font-size: 0.85rem; padding: 6px 12px;">TUNE SETUP</button>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error('Failed to load garage vehicles:', e);
    }
  }

  async selectCar(playerVehicleId) {
    try {
      await fetch('/api/garage/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerVehicleId })
      });
      this.loadGarageData();
    } catch (e) {
      console.error(e);
    }
  }

  async repairCar(playerVehicleId) {
    try {
      const res = await fetch(`/api/garage/repair/${playerVehicleId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        this.loadGarageData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async loadLeaderboardData() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    try {
      const res = await fetch('/api/leaderboards');
      const data = await res.json();
      if (data.success) {
        listEl.innerHTML = data.leaderboard.map(entry => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px 18px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${entry.rank <= 3 ? '#FFD700' : 'rgba(255,255,255,0.1)'}">
            <div style="display: flex; gap: 16px; align-items: center;">
              <span style="font-family: var(--font-racing); font-size: 1.4rem; font-weight: 700; width: 30px;">#${entry.rank}</span>
              <div>
                <div style="font-weight: 700; color: white;">${entry.driverName}</div>
                <div style="font-size: 0.85rem; color: var(--rf-text-muted);">${entry.trackName} • ${entry.vehicleName}</div>
              </div>
            </div>
            <div style="font-family: var(--font-hud); font-size: 1.4rem; font-weight: 700; color: var(--rf-accent-cyan);">
              ${entry.bestLapFormatted}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async loadCareerData() {
    const careerGrid = document.getElementById('career-events-grid');
    if (!careerGrid) return;

    const careerSeries = [
      { name: 'Rookie Cup', rank: 'Rookie', track: 'Harbor Run', laps: 2, prize: 3500, status: 'UNLOCKED' },
      { name: 'Urban Night Sprint', rank: 'Amateur', track: 'Accra Circuit', laps: 3, prize: 7000, status: 'UNLOCKED' },
      { name: 'Canyon Endurance', rank: 'Pro', track: 'Desert Apex', laps: 4, prize: 15000, status: 'LOCKED' },
      { name: 'Touge King Championship', rank: 'Elite', track: 'Mountain Pass', laps: 4, prize: 28000, status: 'LOCKED' },
      { name: 'Cyberpunk Hyper Trophy', rank: 'Master', track: 'Neon Grand Prix', laps: 5, prize: 60000, status: 'LOCKED' },
    ];

    careerGrid.innerHTML = careerSeries.map((s, idx) => `
      <div class="selection-card ${s.status === 'LOCKED' ? 'locked' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="rank-tag">${s.rank}</span>
          <span style="color: var(--rf-accent-gold); font-weight: 700;">$${s.prize.toLocaleString()}</span>
        </div>
        <h3 style="font-family: var(--font-racing); color: white; margin-bottom: 6px;">${s.name}</h3>
        <p style="color: var(--rf-text-muted); font-size: 0.9rem; margin-bottom: 14px;">Circuit: ${s.track} • ${s.laps} Laps</p>
        <button class="rf-btn" style="width: 100%; font-size: 0.95rem; padding: 10px;" ${s.status === 'LOCKED' ? 'disabled' : ''} onclick="window.gameEngine.startSingleplayerRace({ trackId: ${idx + 1}, laps: ${s.laps} })">
          ${s.status === 'LOCKED' ? 'LOCKED' : 'ENTER EVENT'}
        </button>
      </div>
    `).join('');
  }

  async loadMultiplayerData() {
    if (this.gameEngine.multiplayerClient) {
      this.gameEngine.multiplayerClient.fetchRooms((rooms) => {
        this.renderMultiplayerRooms(rooms);
      });
    }
  }

  renderMultiplayerRooms(rooms) {
    const list = document.getElementById('mp-rooms-list');
    if (!list) return;

    if (!rooms || rooms.length === 0) {
      list.innerHTML = '<div style="color: var(--rf-text-muted); padding: 20px; text-align: center;">No active race rooms found. Be the first to host a Grand Prix!</div>';
      return;
    }

    list.innerHTML = rooms.map(r => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 14px 20px; border-radius: 8px; margin-bottom: 10px;">
        <div>
          <h4 style="color: white; font-family: var(--font-racing);">${r.name}</h4>
          <span style="color: var(--rf-text-muted); font-size: 0.85rem;">Host: ${r.hostName} • Track #${r.trackId} • Grid: ${r.playerCount}/8</span>
        </div>
        <button class="rf-btn" style="padding: 8px 16px; font-size: 0.9rem;" onclick="window.gameEngine.multiplayerClient.joinRoom('${r.id}', 'Driver', 1)">JOIN</button>
      </div>
    `).join('');
  }

  renderRoomLobby(room) {
    this.showScreen('mp-lobby-screen');
    const title = document.getElementById('mp-room-title');
    if (title) title.innerText = room.name;

    const playersGrid = document.getElementById('mp-lobby-players');
    if (playersGrid) {
      playersGrid.innerHTML = room.players.map(p => `
        <div class="selection-card ${p.isReady ? 'selected' : ''}">
          <h4 style="color: white; font-family: var(--font-racing);">${p.driverName}</h4>
          <p style="color: ${p.isReady ? '#00FF88' : '#FFD700'}; font-weight: 700;">${p.isReady ? 'READY' : 'PREPARING...'}</p>
        </div>
      `).join('');
    }
  }

  formatTime(ms) {
    if (!ms || ms < 0) return '00:00.000';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.floor(ms % 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }
}

window.UIManager = UIManager;
