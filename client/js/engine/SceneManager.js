/**
 * RACEFORGE 3D World & Scene Graphics Engine
 * Builds procedural circuits, ribbon roadways, guardrails, grandstands,
 * dynamic weather systems (rain streaks, fog), lighting, and particle effects.
 */

class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.THREE = window.THREE;

    this.scene = new this.THREE.Scene();
    this.camera = new this.THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 3500);

    // Renderer
    this.renderer = new this.THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Lighting
    this.ambientLight = new this.THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new this.THREE.DirectionalLight(0xfff8e7, 1.2);
    this.sunLight.position.set(200, 350, 200);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1000;
    const shadowDist = 180;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(this.sunLight);

    // Weather / Particles
    this.rainParticles = null;
    this.smokeParticles = [];
    this.isRaining = false;

    // Track Geometry
    this.trackCurve = null;
    this.trackMeshes = [];

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loadTrack(trackConfig, weather = 'CLEAR') {
    const THREE = this.THREE;

    // Clear previous track meshes
    this.trackMeshes.forEach(m => this.scene.remove(m));
    this.trackMeshes = [];

    // Environment Colors
    this.scene.background = new THREE.Color(trackConfig.skyColor || 0x1a2436);
    this.scene.fog = new THREE.FogExp2(trackConfig.skyColor || 0x1a2436, 0.0012);
    this.ambientLight.color.setHex(trackConfig.ambientColor || 0x4a5568);

    // 1. Build Smooth 3D Spline from Waypoints
    const points = trackConfig.waypoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    // 2. Generate Road Ribbon Geometry
    const segments = 240;
    const roadWidth = trackConfig.roadWidth || 16;
    const roadGeom = new THREE.BufferGeometry();

    const vertices = [];
    const uvs = [];
    const indices = [];

    const curvePoints = this.trackCurve.getSpacedPoints(segments);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.8,
      metalness: 0.15,
    });

    const curbMatA = new THREE.MeshStandardMaterial({ color: trackConfig.curbColorA || 0xffffff, roughness: 0.5 });
    const curbMatB = new THREE.MeshStandardMaterial({ color: trackConfig.curbColorB || 0xff0000, roughness: 0.5 });

    for (let i = 0; i <= segments; i++) {
      const p = curvePoints[i % segments];
      const nextP = curvePoints[(i + 1) % segments];
      const tangent = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const left = p.clone().add(binormal.clone().multiplyScalar(-roadWidth / 2));
      const right = p.clone().add(binormal.clone().multiplyScalar(roadWidth / 2));

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      const vUv = i / segments * 40;
      uvs.push(0, vUv);
      uvs.push(1, vUv);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
    this.trackMeshes.push(roadMesh);

    // 3. Ground Terrain Plane
    const groundGeom = new THREE.PlaneGeometry(3500, 3500, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: trackConfig.groundColor || 0x111622,
      roughness: 0.95,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    this.trackMeshes.push(groundMesh);

    // 4. Start / Finish Line Gantry
    this.buildGantry(curvePoints[0], curvePoints[1], roadWidth);

    // 5. Surrounding Environment Props (Skyscrapers, Palms, Barrier Blocks)
    this.buildProps(curvePoints, trackConfig);

    // 6. Weather Setup
    this.setupWeather(weather);
  }

  buildGantry(p0, p1, width) {
    const THREE = this.THREE;
    const tangent = new THREE.Vector3().subVectors(p1, p0).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(p0);

    const pillarGeom = new THREE.BoxGeometry(0.8, 8, 0.8);
    const beamGeom = new THREE.BoxGeometry(width + 4, 1.2, 1.2);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333a42, metalness: 0.8, roughness: 0.2 });

    const pLeft = new THREE.Mesh(pillarGeom, metalMat);
    pLeft.position.copy(binormal.clone().multiplyScalar(-width / 2 - 1)).setY(4);

    const pRight = new THREE.Mesh(pillarGeom, metalMat);
    pRight.position.copy(binormal.clone().multiplyScalar(width / 2 + 1)).setY(4);

    const beam = new THREE.Mesh(beamGeom, metalMat);
    beam.position.setY(7.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), binormal);

    // Raceforge Digital Display Sign
    const signMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.8, 0.2), signMat);
    sign.position.setY(7.5);
    sign.quaternion.copy(beam.quaternion);

    gantryGroup.add(pLeft, pRight, beam, sign);
    this.scene.add(gantryGroup);
    this.trackMeshes.push(gantryGroup);
  }

  buildProps(curvePoints, trackConfig) {
    const THREE = this.THREE;
    const propGroup = new THREE.Group();

    const isCity = trackConfig.environment.includes('Urban') || trackConfig.environment.includes('Cyberpunk');
    const isCanyon = trackConfig.environment.includes('Canyon');
    const isMountain = trackConfig.environment.includes('Alpine');

    for (let i = 0; i < curvePoints.length; i += 3) {
      const p = curvePoints[i];
      const nextP = curvePoints[(i + 1) % curvePoints.length];
      const tangent = new THREE.Vector3().subVectors(nextP, p).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const offsetDist = (trackConfig.roadWidth / 2) + 25 + Math.random() * 40;
      const side = Math.random() > 0.5 ? 1 : -1;
      const propPos = p.clone().add(binormal.clone().multiplyScalar(offsetDist * side));

      if (isCity) {
        // Skyscraper block
        const bHeight = 40 + Math.random() * 120;
        const bWidth = 20 + Math.random() * 30;
        const bGeom = new THREE.BoxGeometry(bWidth, bHeight, bWidth);
        const bColor = trackConfig.environment.includes('Cyberpunk') ?
          (Math.random() > 0.5 ? 0x0a1128 : 0x1c0f2a) : 0x2b3542;
        const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.3, metalness: 0.8 });
        const bMesh = new THREE.Mesh(bGeom, bMat);
        bMesh.position.set(propPos.x, bHeight / 2, propPos.z);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        propGroup.add(bMesh);
      } else if (isCanyon || isMountain) {
        // Mountain rock spire
        const mHeight = 50 + Math.random() * 140;
        const mGeom = new THREE.ConeGeometry(30 + Math.random() * 40, mHeight, 6);
        const mMat = new THREE.MeshStandardMaterial({
          color: isCanyon ? 0xa0522d : 0x3d4b59,
          roughness: 0.9
        });
        const mMesh = new THREE.Mesh(mGeom, mMat);
        mMesh.position.set(propPos.x, mHeight / 2, propPos.z);
        propGroup.add(mMesh);
      } else {
        // Coastal palm tree / marina light tower
        const tHeight = 16 + Math.random() * 8;
        const tGeom = new THREE.CylinderGeometry(0.5, 0.8, tHeight, 8);
        const tMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41, roughness: 0.9 });
        const trunk = new THREE.Mesh(tGeom, tMat);
        trunk.position.set(propPos.x, tHeight / 2, propPos.z);

        const leafGeom = new THREE.SphereGeometry(4.5, 8, 8);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f592d, roughness: 0.8 });
        const crown = new THREE.Mesh(leafGeom, leafMat);
        crown.position.set(propPos.x, tHeight, propPos.z);

        propGroup.add(trunk, crown);
      }
    }

    this.scene.add(propGroup);
    this.trackMeshes.push(propGroup);
  }

  setupWeather(weather) {
    const THREE = this.THREE;

    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles = null;
    }

    this.isRaining = weather.includes('RAIN') || weather.includes('STORM');

    if (this.isRaining) {
      const rainCount = 2500;
      const rainGeom = new THREE.BufferGeometry();
      const rainPositions = [];

      for (let i = 0; i < rainCount; i++) {
        rainPositions.push(
          (Math.random() - 0.5) * 200,
          Math.random() * 60,
          (Math.random() - 0.5) * 200
        );
      }

      rainGeom.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));

      const rainMat = new THREE.PointsMaterial({
        color: 0x99ccff,
        size: 0.35,
        transparent: true,
        opacity: 0.7
      });

      this.rainParticles = new THREE.Points(rainGeom, rainMat);
      this.scene.add(this.rainParticles);
      this.scene.fog.density = 0.0035;
    } else if (weather === 'FOG') {
      this.scene.fog.density = 0.008;
    }
  }

  updateWeather(focusPos) {
    if (this.isRaining && this.rainParticles && focusPos) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 2.5; // Rain fall speed
        if (positions[i] < 0) {
          positions[i] = 60;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
      this.rainParticles.position.set(focusPos.x, 0, focusPos.z);
    }
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.SceneManager = SceneManager;
