//kill counter
let kill_count = 0;

//Throttle
let currentThrottle = 0.5;
const maxThrottle = 1.5;       // Max speed multiplier
const throttleStep = 0.01;     // How fast it ramps up/down


//enemy building
let targetBuilding = null;
let hasPickedTarget = false;
let targetMarker = null;


let targetEnemies = [];
let enemiesFound = false;
let inspectionProgress = 0; // optional timer-based approach



const CHUNK_SIZE = 200;
const VIEW_DISTANCE = 3; // chunks to load in each direction
const generatedChunks = new Map(); // key: 'x_z', value: [building meshes]

//roll speed
let roll = 0;  // declare at the top of your file

//stars
let skyDome; // Make this global if needed

//Bird's view:
const normalFOV = 75;
const zoomedFOV = 25;
let targetFOV = normalFOV;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let zoomLookTarget = null; // Target point in 3D
let driftTimer = 0;
let zoomMode = false;





// Setup scene
const scene = new THREE.Scene();

// Setup camera with a perspective view
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 30, -50);
camera.lookAt(0, 0, 0);


//testing
/*
const testBox = new THREE.Mesh(
  new THREE.BoxGeometry(10, 10, 10),
  new THREE.MeshLambertMaterial({ color: 0xff0000 })
);
testBox.position.set(0, 0, 0);
scene.add(testBox);*/

//=====================crosshair to see camera direction
// Create crosshair
const crosshair = document.createElement('div');
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.width = '25px';
crosshair.style.height = '25px';
crosshair.style.marginLeft = '-5px';
crosshair.style.marginTop = '-5px';
crosshair.style.border = '2px solid red';
crosshair.style.borderRadius = '50%';
crosshair.style.pointerEvents = 'none';
crosshair.style.zIndex = '999';
crosshair.style.display = 'none'; // Start hidden

document.body.appendChild(crosshair);

//Hover enemies feature:
let hoveredEnemies = new Set();
let scannedEnemies = new Set();







// Renderer for fog
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);

// ✅ Enable shadows ONCE
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.fog = new THREE.FogExp2(0x111111, 0.002);
renderer.setClearColor(scene.fog.color);



//stars
function generateStarTexture(size = 1024, starCount = 500) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000'; // black background
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 1.5;
    const alpha = Math.random() * 0.5 + 0.5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // tile if needed
  return texture;
}





const starTexture = generateStarTexture();

const geometry = new THREE.SphereGeometry(5000, 64, 64);
const material = new THREE.MeshBasicMaterial({
  map: starTexture,
  side: THREE.BackSide,
  fog: false
});

skyDome = new THREE.Mesh(geometry, material);
scene.add(skyDome);







document.body.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, -50).normalize();

light.shadow.mapSize.width = 2048; // Higher res = sharper shadows
light.shadow.mapSize.height = 2048;
light.shadow.camera.left = -1000;
light.shadow.camera.right = 1000;
light.shadow.camera.top = 1000;
light.shadow.camera.bottom = -1000;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 2000;
light.castShadow = true;

scene.add(light);
scene.add(new THREE.AmbientLight(0x444444));

// Ground (city surface)

const groundGeo = new THREE.PlaneGeometry(10000, 10000);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2; // Make it horizontal
ground.receiveShadow = true;

scene.add(ground);


// Create random buildings
/*
for (let i = 0; i < 100; i++) {
  const w = Math.random() * 5 + 5;


  const h = Math.random() * 5 + 1;
  const d = Math.random() * 5 + 5;
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const boxMat = new THREE.MeshLambertMaterial({color: 0x888888});
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.castShadow = true;
  box.receiveShadow = false;
  box.position.set(
    (Math.random() - 0.5) * 400,
    h / 2,
    (Math.random() - 0.5) * 400
  );
  scene.add(box);
}*/


function createFlyingWingDrone() {
  const droneGroup = new THREE.Group(); // to combine parts

  // Central body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.15, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  droneGroup.add(body);
  body.position.set(0,0,-1);
  body.rotation.y = Math.PI / 4;
  body.castShadow = true;

  //blue flame nozel
  const nozel = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0x72ECFF })
  );
  droneGroup.add(nozel);
  nozel.position.set(0,0,2);
  nozel.rotation.y = Math.PI / 4;
  nozel.castShadow = true;

  // Left wing
  const leftWing = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.5, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  leftWing.position.set(-5, 0, -1);
  leftWing.rotation.y = Math.PI / 5; // slight backward sweep
  leftWing.castShadow = true;
  droneGroup.add(leftWing);

  // Right wing
  const rightWing = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.5, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  rightWing.position.set(5, 0, -1);
  rightWing.rotation.y = -Math.PI / 5;
  rightWing.castShadow = true;
  droneGroup.add(rightWing);

  // Rear stabilizer left (optional)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  tail.position.set(0.8, 1, 3);
  tail.rotation.y = -Math.PI / -5;
  tail.rotation.x = -Math.PI / -3;
  tail.rotation.z = -Math.PI / 9;
  tail.castShadow = true;
  droneGroup.add(tail);

  // Rear stabilizer right (optional)
  const tail_r = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  tail_r.position.set(-0.80, 1, 3);
  tail_r.rotation.y = -Math.PI / 5;
  tail_r.rotation.x = -Math.PI / -3;
  tail_r.rotation.z = -Math.PI / -9;
  tail_r.castShadow = true;
  droneGroup.add(tail_r);

  // Set initial position in the air
  droneGroup.position.set(0, 50, 0);
  droneGroup.castShadow = true;

  return droneGroup;
}



const drone = createFlyingWingDrone();

scene.add(drone);


// Input handling
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});




function generateChunk(chunkX, chunkZ) {
  const key = `${chunkX}_${chunkZ}`;
  if (generatedChunks.has(key)) return;

  const buildings = [];
  for (let i = 0; i < 10; i++) {
    const bx = chunkX * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
    const bz = chunkZ * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
    const bw = Math.random() * 10 + 5;
    const bd = Math.random() * 10 + 5;
    const bh = Math.random() * 15 + 10;

    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const box = new THREE.Mesh(geo, mat);

    box.position.set(bx, bh / 2, bz);
    box.castShadow = true;
    box.receiveShadow = false;

    scene.add(box);
    buildings.push(box);


    const isNearDrone = Math.abs(chunkX) <= 2 && Math.abs(chunkZ) <= 2;

    if (!hasPickedTarget && isNearDrone) {
      targetBuilding = box;
      hasPickedTarget = true;

      //============================================transparency
      box.material.transparent = true;
      box.material.opacity = 1.0; // fully visible by default

      box.material.color.set(0xff2222); // red tint
      box.userData.isTarget = true;

      // Enemies
      for (let j = 0; j < 3; j++) {
        const enemy = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        const ex = (Math.random() - 0.5) * bw * 0.8;
        const ey = Math.random() * bh;
        const ez = (Math.random() - 0.5) * bd * 0.8;

        enemy.position.set(bx + ex, ey, bz + ez);
        enemy.userData.isEnemy = true;
        scene.add(enemy);
        targetEnemies.push(enemy);
      }

      // ✅ Only create marker for the target
      const ringGeo = new THREE.RingGeometry(2, 3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2; // flat on top
      ring.position.set(bx, bh + 50, bz); // above the building
      ring.renderOrder = 1;

      scene.add(ring);
      targetMarker = ring;
    }


  }



  generatedChunks.set(key, buildings);
  
}

//pick a new building after scanning a new one
function pickNewTargetBuilding() {
  hasPickedTarget = false;
  targetBuilding = null;
  targetEnemies = [];
  scannedEnemies.clear();
  enemiesFound = false;
  targetMarker && scene.remove(targetMarker);
  targetMarker = null;

  // Search through visible chunks and find a new random building
  const allBuildings = [];

  for (const buildings of generatedChunks.values()) {
    allBuildings.push(...buildings);
  }

  const candidates = allBuildings.filter(b => !b.userData.isTarget); // skip old target
  if (candidates.length === 0) return;

  const newTarget = candidates[Math.floor(Math.random() * candidates.length)];
 

  
  //targetBuildingarget.material.transparent = true;  // enable transparency
  //targetBuildingarget.material.opacity = 1.0;       // fully visible initially  

  
  
  newTarget.userData.isTarget = true;
  newTarget.material.color.set(0xff2222); // red
  targetBuilding = newTarget;
  hasPickedTarget = true;
  targetBuilding.material = targetBuilding.material.clone();
  targetBuilding.material.transparent = true;
  targetBuilding.material.opacity = 1.0;
  targetBuilding.material.depthWrite = false;
  targetBuilding.renderOrder = 999;
 




  // Spawn new enemies
  const { x: bx, y: by, z: bz } = newTarget.position;
  const { width: bw, height: bh, depth: bd } = newTarget.geometry.parameters;

  for (let j = 0; j < 3; j++) {
    const enemy = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    const ex = (Math.random() - 0.5) * bw * 0.8;
    const ey = Math.random() * bh;
    const ez = (Math.random() - 0.5) * bd * 0.8;
    enemy.position.set(bx + ex, ey, bz + ez);
    enemy.userData.isEnemy = true;
    scene.add(enemy);
    targetEnemies.push(enemy);
  }

  // Add new marker
  const ringGeo = new THREE.RingGeometry(2, 3, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(bx, by + bh / 2 + 2, bz);
  ring.renderOrder = 1;
  scene.add(ring);
  targetMarker = ring;
}





// Drone movement state
const droneSpeed = 1.5;
const turnSpeed = 0.02;
const strafeSpeed = 0.2;
const maxRoll = Math.PI / 8; // limit tilt angle (~22.5°)
const rollSpeed = 0.02;      // how fast to roll in/out



function update() {
  //show kills
  //const marks = document.getElementById("kills");
  //marks.style.left = `${kill_count}px`;



  // Inside your update() function:
  light.position.copy(drone.position).add(new THREE.Vector3(300, 500, -300));
  light.target.position.copy(drone.position);
  light.target.updateMatrixWorld(); // Important for shadows to re-align


  drone.visible = !zoomMode;
  // Constant forward motion
  if (!zoomMode) {
    // Forward movement
    drone.translateZ(-droneSpeed);

    // Turning
    if (keys["a"]) {
      drone.rotation.y += turnSpeed;
      roll = THREE.MathUtils.lerp(roll, maxRoll, 0.1);
    } else if (keys["d"]) {
      drone.rotation.y -= turnSpeed;
      roll = THREE.MathUtils.lerp(roll, -maxRoll, 0.1);
    } 
    else {
      roll = THREE.MathUtils.lerp(roll, 0, 0.1);
    }

    drone.rotation.z = roll;
  }

  // Optional: Strafe left/right with Q/E
  //if (keys["q"]) drone.translateX(-strafeSpeed); // left
  //if (keys["e"]) drone.translateX(strafeSpeed);  // right

  // Optional: Altitude with W/S (climb/dive)
  //if (keys["w"]) drone.position.y += strafeSpeed;
  //if (keys["s"]) drone.position.y -= strafeSpeed;

  //infinite ground
  ground.position.x = drone.position.x;
  ground.position.z = drone.position.z;



  const cx = Math.floor(drone.position.x / CHUNK_SIZE);
  const cz = Math.floor(drone.position.z / CHUNK_SIZE);

  // Generate nearby chunks (3x3 area)
  for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
    for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
      generateChunk(cx + dx, cz + dz);
    }
  }


  // Keep camera following from behind and above
  const cameraOffset = new THREE.Vector3(0, 20, 50); // behind drone
  cameraOffset.applyEuler(drone.rotation); // rotate offset to match drone heading
  camera.position.copy(drone.position).add(cameraOffset);
  camera.lookAt(drone.position);


  for (const [key, buildings] of generatedChunks.entries()) {
  const [x, z] = key.split('_').map(Number);
  const distX = Math.abs(x - cx);
  const distZ = Math.abs(z - cz);
  if (distX > VIEW_DISTANCE + 1 || distZ > VIEW_DISTANCE + 1) {
    // Remove buildings from scene
    buildings.forEach(b => scene.remove(b));
    generatedChunks.delete(key);
  }
  }

  if (skyDome && drone) {
  skyDome.position.copy(drone.position); // Always centered on the drone
  }


  // Smooth zoom transition
  camera.fov += (targetFOV - camera.fov) * 0.1; // 0.1 is interpolation speed
  camera.updateProjectionMatrix();
  if (zoomLookTarget) {
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);

    const desiredDir = zoomLookTarget.clone().sub(camera.position).normalize();
    currentLook.lerp(desiredDir, 0.1); // Smoothly blend toward target

    const newLookAt = camera.position.clone().add(currentLook);
      if (zoomLookTarget) {
          // Smooth look at target
          const currentLook = new THREE.Vector3();
          camera.getWorldDirection(currentLook);

          const desiredDir = zoomLookTarget.clone().sub(camera.position).normalize();
          currentLook.lerp(desiredDir, 0.1);

          // Optional drift while zoomed
          driftTimer += 0.01; // Speed of drift

          const driftX = Math.sin(driftTimer) * 0.5;
          const driftY = Math.sin(driftTimer * 0.7) * 0.3;

          currentLook.x += driftX * 0.001;
          currentLook.y += driftY * 0.001;

          // Only while zoomed in and focusing
          if (zoomLookTarget) {
            // Smooth look direction
            const currentLook = new THREE.Vector3();
            camera.getWorldDirection(currentLook);

            const desiredDir = zoomLookTarget.clone().sub(camera.position).normalize();
            currentLook.lerp(desiredDir, 0.1);

            // Mouse-based pivot adjustment
            const maxYaw = 2.0;   // horizontal camera pivot range (radians)
            const maxPitch = 1.5; // vertical camera pivot range (radians)

            const yawOffset = mouse.x * maxYaw;
            const pitchOffset = mouse.y * maxPitch;

            // Create rotation matrix from yaw and pitch
            const pivotEuler = new THREE.Euler(pitchOffset, yawOffset, 0, 'YXZ');
            currentLook.applyEuler(pivotEuler);

            // Optional drift
            driftTimer += 0.01;
            const driftX = Math.sin(driftTimer) * 0.5;
            const driftY = Math.sin(driftTimer * 0.7) * 0.3;
            currentLook.x += driftX * 0.001;
            currentLook.y += driftY * 0.001;

            const newLookAt = camera.position.clone().add(currentLook);
            camera.lookAt(newLookAt);
          } 


          else {
              camera.lookAt(drone.position);
            }
        };

  }
  
  if (targetBuilding && !enemiesFound) {
    const targetPos = targetBuilding.position.clone();
    const distance = camera.position.distanceTo(targetPos);
    

    const dirToTarget = targetPos.clone().sub(camera.position).normalize();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const angle = dirToTarget.angleTo(camDir);

    const closeEnough = distance < 100;
    const lookingAt = angle < 0.3;

    if (closeEnough && lookingAt) {
      //inspectionProgress += 0.02; // build up progress while looking
      //if (inspectionProgress >= 1.0) {
        enemiesFound = true;
        targetBuilding.material.color.set(0x22ff22); // green tint
        targetEnemies.forEach(e => scene.remove(e));
        targetEnemies = [];
        if (targetMarker) {
            
            scene.remove(targetMarker);
            targetMarker = null;
          }

      }
    //} else {
    //  inspectionProgress = Math.max(inspectionProgress - 0.01, 0); // decay if not looking
    //}
  }

  if (targetMarker && targetBuilding) {
      const time = performance.now() * 0.002;
      if (targetMarker && targetBuilding) {
        const time = performance.now() * 0.002;

        const bbox = new THREE.Box3().setFromObject(targetBuilding);
        const height = bbox.max.y - bbox.min.y;

        targetMarker.position.set(
          targetBuilding.position.x,
          bbox.max.y + 2 + Math.sin(time) * 0.5,
          targetBuilding.position.z
        );

        targetMarker.rotation.z = time * 0.5;
      }

    targetMarker.rotation.z = time * 0.5;
  }

  if (targetBuilding) {
      // Get direction the drone is facing 
      // 
      /**/
      const droneDirection = new THREE.Vector3(0, 0, -1); // default forward
      droneDirection.applyQuaternion(drone.quaternion);   // transform to world space

      // Direction to target
      const toTarget = targetBuilding.position.clone().sub(drone.position);
      toTarget.y = 0; // flatten to horizontal plane
      droneDirection.y = 0;
      toTarget.normalize();
      droneDirection.normalize();

      // Compute signed angle (between -PI and PI)
      let angle = Math.atan2(
        droneDirection.x * toTarget.z - droneDirection.z * toTarget.x,
        droneDirection.x * toTarget.x + droneDirection.z * toTarget.z
      );

      // Clamp to compass bounds
      const maxAngle = Math.PI / 2;
      let offsetRatio = angle / maxAngle;
      offsetRatio = Math.max(-1, Math.min(1, offsetRatio));

      // Move UI marker
      const compassWidth = 300;
      const maxOffset = compassWidth / 2;
      const pixelOffset = offsetRatio * maxOffset;

      const marker = document.getElementById("target-indicator");
      marker.style.left = `${150 + pixelOffset}px`;



    if (zoomMode && targetEnemies.length > 0 && !enemiesFound) {
      // Fade building to transparent
      targetBuilding.material.opacity = THREE.MathUtils.lerp(targetBuilding.material.opacity, 0.2, 0.1);
      //newTarget.material.opacity = THREE.MathUtils.lerp(targetBuilding.material.opacity, 0.2, 0.1);

      // 👇 Angle-based enemy detection
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      targetEnemies.forEach(enemy => {
        if (!scannedEnemies.has(enemy)) {
          const toEnemy = enemy.position.clone().sub(camera.position);
          const distance = toEnemy.length(); // how far away the enemy is
          const maxScanDistance = 200; //scan range 
          const directionToEnemy = toEnemy.normalize();

          const angle = cameraDirection.angleTo(directionToEnemy);

          // Dynamic cone angle: tighter at distance, wider up close
          const maxAngle = THREE.MathUtils.clamp(0.3 - distance * 0.002, 0.005, 0.3); 
          // e.g. 0.3 radians (~17°) at point blank, 0.02 (~1.1°) when far

          if (angle < 0.02 && distance < maxScanDistance) {
            scannedEnemies.add(enemy);
            enemy.material.color.set(0x00ff00);
          }
        }
      });

      // 👇 Check if all are scanned
      if (scannedEnemies.size === targetEnemies.length) {
        enemiesFound = true;
        targetBuilding.material.color.set(0x22ff22); // turn building green
        targetEnemies.forEach(e => scene.remove(e));
        targetEnemies = [];
        scannedEnemies.clear();
        kill_count = kill_count + 1;
        
        const display = document.getElementById("killCountDisplay");
        if (display) {
          display.textContent = `Recon Targets: ${kill_count}`;
        }



          // 🔁 Pick a new target after a short delay
          setTimeout(() => {
            pickNewTargetBuilding();
          }, 1000); // 1 second delay
      }
    } else {
      // Fade building back in
      targetBuilding.material.opacity = THREE.MathUtils.lerp(targetBuilding.material.opacity, 1.0, 0.1);
    }
  }


  //For the crosshair visiblity
  if (crosshair) {
  crosshair.style.display = zoomMode ? 'block' : 'none';
  }




  else {
    camera.lookAt(drone.position); // default tracking
  }


}

//birds view commands
window.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    targetFOV = zoomedFOV;
    zoomMode = true; // <<< Add this line here

    // Raycast from camera through mouse to world
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      zoomLookTarget = intersects[0].point;
    } else {
      zoomLookTarget = null;
    }
  }
});


window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    zoomMode = false;
    targetFOV = normalFOV;
    zoomLookTarget = null;
  }
});


window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});


// Prevent right-click context menu
window.addEventListener('contextmenu', e => e.preventDefault());





// Render loop
function animate() {
  update();
  renderer.render(scene, camera);
  //renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer edges (optional)

  requestAnimationFrame(animate);
}
animate();
