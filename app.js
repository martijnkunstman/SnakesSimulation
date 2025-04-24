// world & canvas setup
const worldSize = 100;
const snakeCount = 10;
const foodCount = 50;



const squareSize = Math.min(window.innerWidth, window.innerHeight);
const gridSize = Math.floor(squareSize / worldSize);
const collorArray = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];


const canvas = document.createElement('canvas');
canvas.width = gridSize * worldSize;
canvas.height = gridSize * worldSize;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// helper: shortest delta on a torus
function wrapDelta(a, b) {
    const raw = b - a;
    const alt = raw > 0
        ? raw - worldSize
        : raw + worldSize;
    return Math.abs(raw) < Math.abs(alt) ? raw : alt;
}

// snakes
let snakes = [];
for (let i = 0; i < snakeCount; i++) {
    const x = Math.floor(Math.random() * worldSize);
    const y = Math.floor(Math.random() * worldSize);
    snakes.push({
        id: i,
        color: collorArray[i % collorArray.length],
        body: [[x, y]],
        direction: Math.floor(Math.random() * 4),
    });
}

// food
let food = [];
function spawnFood() {
    const x = Math.floor(Math.random() * worldSize);
    const y = Math.floor(Math.random() * worldSize);
    food.push([x, y]);
}
for (let i = 0; i < foodCount; i++) spawnFood();

// drawing
function drawSnake(snake) {
    ctx.fillStyle = snake.color;
    snake.body.forEach(([x, y]) => {
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    });
}
function drawFood() {
    ctx.fillStyle = 'red';
    food.forEach(([x, y]) => {
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    });
}

// movement & collision
function changeDirection(snake, dir) {
    // 0=up,1=right,2=down,3=left; forbid direct back
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
    // wrap around
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

function getFoodDirection(snake) {
    const [hx, hy] = snake.body[0];
    let best = { dist: Infinity, fx: 0, fy: 0 };
    food.forEach(([fx, fy]) => {
        const dx = Math.abs(wrapDelta(hx, fx));
        const dy = Math.abs(wrapDelta(hy, fy));
        const d = dx + dy;
        if (d < best.dist) best = { dist: d, fx, fy };
    });
    if (best.dist === Infinity) {
        return Math.floor(Math.random() * 4);
    }
    const deltaX = wrapDelta(hx, best.fx);
    const deltaY = wrapDelta(hy, best.fy);
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 1 : 3; // right or left
    } else {
        return deltaY > 0 ? 2 : 0; // down or up
    }
}

function nearestFoodDistance(x, y) {
    let best = Infinity;
    for (let [fx, fy] of food) {
        const dx = Math.abs(wrapDelta(x, fx));
        const dy = Math.abs(wrapDelta(y, fy));
        best = Math.min(best, dx + dy);
    }
    return best;
}

function aiChangeDirection(snake) {
    const [hx, hy] = snake.body[0];

    // if no food in sensing range, random wander
    if (!foodNearby(snake)) {
        changeDirection(snake, Math.floor(Math.random() * 4));
        return;
    }

    // current distance
    const currDist = nearestFoodDistance(hx, hy);

    // consider all non‐reverse moves
    const options = [];
    for (let dir = 0; dir < 4; dir++) {
        if ((dir + 2) % 4 === snake.direction) continue;  // skip backwards
        // compute next head pos
        let nx = hx, ny = hy;
        if (dir === 0) ny--;
        if (dir === 1) nx++;
        if (dir === 2) ny++;
        if (dir === 3) nx--;
        // wrap
        nx = (nx + worldSize) % worldSize;
        ny = (ny + worldSize) % worldSize;
        const dist = nearestFoodDistance(nx, ny);
        options.push({ dir, dist });
    }

    // find best option
    options.sort((a, b) => a.dist - b.dist);
    const best = options[0];

    // only turn if it strictly improves distance
    if (best.dist < currDist) {
        changeDirection(snake, best.dir);
    }
}

// main loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // AI turn
    snakes.forEach(aiChangeDirection);

    // move & draw
    snakes.forEach(moveSnake);
    snakes.forEach(drawSnake);
    drawFood();

    // check eating
    snakes.forEach(snake => {
        const [hx, hy] = snake.body[0];
        for (let i = 0; i < food.length; i++) {
            if (hx === food[i][0] && hy === food[i][1]) {
                // grow
                snake.body.push([hx, hy]);
                food.splice(i, 1);
                spawnFood();
                break;
            }
        }
    });

    requestAnimationFrame(gameLoop);
}

// start
gameLoop();
