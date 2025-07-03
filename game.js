const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// World state
const world = { x: 0, y: 0 }; // Camera top-left in world space
const speed = 5; // Drone speed
const crosshair = { x: canvas.width / 2, y: canvas.height / 2 };

// Dummy enemies
const enemies = [];
for (let i = 0; i < 10; i++) {
  enemies.push({
    x: Math.random() * 3000 - 1500,
    y: Math.random() * 3000 - 1500,
    alive: true,
  });
}

// Input state
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  crosshair.x = canvas.width / 2;
  crosshair.y = canvas.height / 2;
});

// Mouse click for missile strike
canvas.addEventListener("click", () => {
  const lockedEnemy = getLockedEnemy();
  if (lockedEnemy) {
    lockedEnemy.alive = false;
    // Missile strike animation placeholder
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
});

function update() {
  // Drone (camera) movement
  if (keys["w"]) world.y -= speed;
  if (keys["s"]) world.y += speed;
  if (keys["a"]) world.x -= speed;
  if (keys["d"]) world.x += speed;

  // Move enemies (patrol simulation)
  enemies.forEach(enemy => {
    if (enemy.alive) enemy.x += Math.sin(Date.now() * 0.001 + enemy.y) * 0.5;
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw "urban terrain" as gray blocks (background grid)
  for (let i = -5000; i < 5000; i += 200) {
    for (let j = -5000; j < 5000; j += 200) {
      const screenX = i - world.x + canvas.width / 2;
      const screenY = j - world.y + canvas.height / 2;
      ctx.fillStyle = "#444";
      ctx.fillRect(screenX, screenY, 180, 180);
    }
  }

  // Draw enemies
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const screenX = enemy.x - world.x + canvas.width / 2;
    const screenY = enemy.y - world.y + canvas.height / 2;
    ctx.fillStyle = getLockedEnemy() === enemy ? "red" : "white";
    ctx.fillRect(screenX - 10, screenY - 10, 20, 20);
  });

  // Draw crosshair
  ctx.strokeStyle = "lime";
  ctx.beginPath();
  ctx.moveTo(crosshair.x - 15, crosshair.y);
  ctx.lineTo(crosshair.x + 15, crosshair.y);
  ctx.moveTo(crosshair.x, crosshair.y - 15);
  ctx.lineTo(crosshair.x, crosshair.y + 15);
  ctx.stroke();
}

function getLockedEnemy() {
  // Lock enemies within a small radius of crosshair center
  const lockRadius = 40;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - world.x - 0 + canvas.width / 2;
    const dy = enemy.y - world.y - 0 + canvas.height / 2;
    if (Math.abs(dx - canvas.width/2) < lockRadius &&
        Math.abs(dy - canvas.height/2) < lockRadius) {
      return enemy;
    }
  }
  return null;
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
