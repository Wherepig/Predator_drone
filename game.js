// Setup scene
const scene = new THREE.Scene();

// Setup camera with a perspective view
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 30, -50);
camera.lookAt(0, 0, 0);


//testing
const testBox = new THREE.Mesh(
  new THREE.BoxGeometry(10, 10, 10),
  new THREE.MeshLambertMaterial({ color: 0xff0000 })
);
testBox.position.set(0, 0, 0);
scene.add(testBox);






// Renderer
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, -50).normalize();
scene.add(light);
scene.add(new THREE.AmbientLight(0x444444));

// Ground (city surface)
const groundGeo = new THREE.PlaneGeometry(500, 500, 1, 1);
const groundMat = new THREE.MeshLambertMaterial({color: 0x444444});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// Create random buildings
for (let i = 0; i < 100; i++) {
  const w = Math.random() * 5 + 5;
  const h = Math.random() * 20 + 10;
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

// Create the predator drone (simple box placeholder)
const droneGeo = new THREE.BoxGeometry(4, 1, 6);
const droneMat = new THREE.MeshLambertMaterial({color: 0xffffff});
const drone = new THREE.Mesh(droneGeo, droneMat);
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

// Drone movement state
const droneSpeed = 1;
function update() {
  if (keys["w"]) drone.position.z += droneSpeed;
  if (keys["s"]) drone.position.z -= droneSpeed;
  if (keys["a"]) drone.position.x += droneSpeed;
  if (keys["d"]) drone.position.x -= droneSpeed;

  // Update camera to follow drone from behind
  camera.position.set(
    drone.position.x,
    drone.position.y + 30,
    drone.position.z - 50
  );
  camera.lookAt(drone.position);
}

// Render loop
function animate() {
  update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
