// world & canvas setup
const worldSize   = 100;
const snakeCount  = 10;
const foodCount   = 50;
const squareSize  = Math.min(window.innerWidth, window.innerHeight);
const gridSize    = Math.floor(squareSize / worldSize);
const colorArray  = ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF'];

const canvas = document.createElement('canvas');
canvas.width  = gridSize * worldSize;
canvas.height = gridSize * worldSize;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// helper: shortest delta on a torus
function wrapDelta(a, b) {
  const raw = b - a;
  const alt = raw > 0 ? raw - worldSize : raw + worldSize;
  return Math.abs(raw) < Math.abs(alt) ? raw : alt;
}

// spawn food
let food = [];
function spawnFood() {
  const x = Math.floor(Math.random() * worldSize);
  const y = Math.floor(Math.random() * worldSize);
  food.push([x, y]);
}
for (let i = 0; i < foodCount; i++) spawnFood();

// snakes
let snakes = [];
for (let i = 0; i < snakeCount; i++) {
  const x = Math.floor(Math.random() * worldSize);
  const y = Math.floor(Math.random() * worldSize);
  snakes.push({
    id: i,
    color: colorArray[i % colorArray.length],
    body: [[x, y]],
    direction: Math.floor(Math.random() * 4)
  });
}

// drawing
function drawSnake(snake) {
  ctx.fillStyle = snake.color;
  snake.body.forEach(([x, y]) =>
    ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize)
  );
}
function drawFood() {
  ctx.fillStyle = 'red';
  food.forEach(([x, y]) =>
    ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize)
  );
}

// collision check: is (x,y) occupied by any snake body?
function isOccupied(x, y) {
  return snakes.some(snake =>
    snake.body.some(([bx, by]) => bx === x && by === y)
  );
}

// movement & collision
function changeDirection(snake, dir) {
  if ((dir + 2) % 4 !== snake.direction) {
    snake.direction = dir;
  }
}

function moveSnake(snake) {
  const [hx, hy] = snake.body[0];
  let newHead;
  switch (snake.direction) {
    case 0: newHead = [hx, hy - 1]; break;
    case 1: newHead = [hx + 1, hy]; break;
    case 2: newHead = [hx, hy + 1]; break;
    case 3: newHead = [hx - 1, hy]; break;
  }
  newHead[0] = (newHead[0] + worldSize) % worldSize;
  newHead[1] = (newHead[1] + worldSize) % worldSize;
  snake.body.unshift(newHead);
  snake.body.pop();
}

// AI: wrap-aware food sensing
function foodNearby(snake) {
  const [hx, hy] = snake.body[0];
  return food.some(([fx, fy]) => {
    const dx = Math.abs(wrapDelta(hx, fx));
    const dy = Math.abs(wrapDelta(hy, fy));
    return dx <= 100 && dy <= 100;
  });
}

// compute wrapped-Manhattan distance to nearest food
function nearestFoodDistance(x, y) {
  let best = Infinity;
  for (let [fx, fy] of food) {
    const d = Math.abs(wrapDelta(x, fx)) + Math.abs(wrapDelta(y, fy));
    if (d < best) best = d;
  }
  return best;
}

// pick direction towards nearest food
function getFoodDirection(snake) {
  const [hx, hy] = snake.body[0];
  let best = { dist: Infinity, fx: 0, fy: 0 };
  food.forEach(([fx, fy]) => {
    const d = Math.abs(wrapDelta(hx, fx)) + Math.abs(wrapDelta(hy, fy));
    if (d < best.dist) best = { dist: d, fx, fy };
  });
  const dx = wrapDelta(hx, best.fx);
  const dy = wrapDelta(hy, best.fy);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
  else                                    return dy > 0 ? 2 : 0;
}

// AI: only turn if it reduces distance and doesn't collide
function aiChangeDirection(snake) {
  const [hx, hy] = snake.body[0];
  if (!foodNearby(snake)) {
    changeDirection(snake, Math.floor(Math.random() * 4));
    return;
  }
  const currDist = nearestFoodDistance(hx, hy);
  let options = [];

  // evaluate all non-reverse moves
  for (let dir = 0; dir < 4; dir++) {
    if ((dir + 2) % 4 === snake.direction) continue;
    let nx = hx, ny = hy;
    if (dir === 0) ny--;
    if (dir === 1) nx++;
    if (dir === 2) ny++;
    if (dir === 3) nx--;
    nx = (nx + worldSize) % worldSize;
    ny = (ny + worldSize) % worldSize;
    const dist = nearestFoodDistance(nx, ny);
    const collision = isOccupied(nx, ny);
    options.push({ dir, dist, collision });
  }

  // prefer non-colliding moves that reduce distance
  options = options.filter(o => !o.collision && o.dist < currDist);
  if (options.length > 0) {
    // pick the best among safe reducers
    options.sort((a,b) => a.dist - b.dist);
    changeDirection(snake, options[0].dir);
  }
  // else: no safe improving turn – keep current direction
}

// main loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  snakes.forEach(aiChangeDirection);
  snakes.forEach(moveSnake);
  snakes.forEach(drawSnake);
  drawFood();

  // eating & grow
  snakes.forEach(snake => {
    const [hx, hy] = snake.body[0];
    for (let i = 0; i < food.length; i++) {
      if (hx === food[i][0] && hy === food[i][1]) {
        snake.body.push([hx, hy]);
        food.splice(i, 1);
        spawnFood();
        break;
      }
    }
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
