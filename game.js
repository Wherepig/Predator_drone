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






// Renderer for fog
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);

scene.fog = new THREE.FogExp2(0x111111, 0.002);
renderer.setClearColor(scene.fog.color);


//stars
const loader = new THREE.TextureLoader();
loader.load('starry_no_ai.png', (texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Tile it 4x in both directions (adjust to taste)

  const geometry = new THREE.SphereGeometry(5000, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: false // <-- THIS is the key
  });

  skyDome = new THREE.Mesh(geometry, material);
  skyDome.frustumCulled = false;
  scene.add(skyDome);
});






document.body.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, -50).normalize();
scene.add(light);
scene.add(new THREE.AmbientLight(0x444444));

// Ground (city surface)
const groundGeo = new THREE.PlaneGeometry(10000, 10000);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2; // Make it horizontal
scene.add(ground);


// Create random buildings
for (let i = 0; i < 100; i++) {
  const w = Math.random() * 5 + 5;


  const h = Math.random() * 5 + 1;
  const d = Math.random() * 5 + 5;
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const boxMat = new THREE.MeshLambertMaterial({color: 0x888888});
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 400,
    h / 2,
    (Math.random() - 0.5) * 400
  );
  scene.add(box);
}


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

  //blue flame nozel
  const nozel = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0x72ECFF })
  );
  droneGroup.add(nozel);
  nozel.position.set(0,0,2);
  nozel.rotation.y = Math.PI / 4;

  // Left wing
  const leftWing = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.5, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  leftWing.position.set(-5, 0, -1);
  leftWing.rotation.y = Math.PI / 5; // slight backward sweep
  droneGroup.add(leftWing);

  // Right wing
  const rightWing = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.5, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  rightWing.position.set(5, 0, -1);
  rightWing.rotation.y = -Math.PI / 5;
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
    scene.add(box);
    buildings.push(box);
  }

  generatedChunks.set(key, buildings);
}



// Drone movement state
const droneSpeed = 0.5;
const turnSpeed = 0.02;
const strafeSpeed = 0.2;
const maxRoll = Math.PI / 8; // limit tilt angle (~22.5°)
const rollSpeed = 0.02;      // how fast to roll in/out



function update() {
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
    } else {
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
  const maxPitch = 1.0; // vertical camera pivot range (radians)

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
} else {
  camera.lookAt(drone.position);
}

} else {
  camera.lookAt(drone.position);
}
;
  } else {
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
  requestAnimationFrame(animate);
}
animate();
