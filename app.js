// world & canvas setup
const worldSize = 100;
const snakeCount = 200;
const foodCount = 2000;
const squareSize = Math.min(window.innerWidth, window.innerHeight);
const gridSize = Math.floor(squareSize / worldSize);
const colorArray = ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)'];

const canvas = document.createElement('canvas');
canvas.width = gridSize * worldSize;
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
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize)
    );
}
function drawFood() {
    ctx.fillStyle = 'red';
    food.forEach(([x, y]) =>
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize)
    );
}

// collision check: is (x,y) occupied by any snake except itself?
function isOccupiedByOther(snakeToExclude, x, y) {
    return snakes.some(snake =>
        snake.id !== snakeToExclude.id &&
        snake.body.some(([bx, by]) => bx === x && by === y)
    );
}

// check if (x,y) hits the snake's own body (ignoring its tail, which moves)
function willCollideWithSelf(snake, x, y) {
    // tail (last segment) will vacate simultaneously, so ignore it
    const bodyExceptTail = snake.body.slice(0, -1);
    return bodyExceptTail.some(([bx, by]) => bx === x && by === y);
}

// movement & collision
function changeDirection(snake, dir) {
    if ((dir + 2) % 4 !== snake.direction) {
        snake.direction = dir;
    }
}

// movement & collision (with self-collision tail cut)
// Updated moveSnake: cuts tails on head‐to‐body collisions (self & others)
function moveSnake(snake) {
    const [hx, hy] = snake.body[0];
    // compute next head
    let newHead;
    switch (snake.direction) {
        case 0: newHead = [hx, hy - 1]; break;
        case 1: newHead = [hx + 1, hy]; break;
        case 2: newHead = [hx, hy + 1]; break;
        case 3: newHead = [hx - 1, hy]; break;
    }
    // wrap on torus
    newHead[0] = (newHead[0] + worldSize) % worldSize;
    newHead[1] = (newHead[1] + worldSize) % worldSize;

    // 1) Self-collision?
    const idxSelf = snake.body.findIndex(([bx, by]) =>
        bx === newHead[0] && by === newHead[1]
    );
    let skipPop = false;
    if (idxSelf > 0) {
        // keep from head through the collision point
        snake.body = snake.body.slice(0, idxSelf + 1);
        skipPop = true;
    }

    // 2) Collision with others
    snakes.forEach(other => {
        if (other.id === snake.id) return;
        const idx = other.body.findIndex(([bx, by]) =>
            bx === newHead[0] && by === newHead[1]
        );
        if (idx > 0) {
            other.body = other.body.slice(0, idx + 1);
        }
    });

    // 3) Add the new head
    snake.body.unshift(newHead);

    // 4) Only pop if we didn’t just do a self-collision slice
    if (!skipPop) {
        snake.body.pop();
    }
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

// compute wrapped‐Manhattan distance to nearest food
function nearestFoodDistance(x, y) {
    let best = Infinity;
    for (let [fx, fy] of food) {
        const d = Math.abs(wrapDelta(x, fx)) + Math.abs(wrapDelta(y, fy));
        if (d < best) best = d;
    }
    return best;
}

// AI: only turn if it reduces distance and avoids all collisions
function aiChangeDirection(snake) {
    const [hx, hy] = snake.body[0];

    // if no nearby food, random wiggle
    if (!foodNearby(snake)) {
        changeDirection(snake, Math.floor(Math.random() * 4));
        return;
    }

    const currDist = nearestFoodDistance(hx, hy);
    // start assuming we stay straight
    let best = { dir: snake.direction, dist: currDist };

    // examine all non-reverse directions
    for (let dir = 0; dir < 4; dir++) {
        if ((dir + 2) % 4 === snake.direction) continue;
        let [nx, ny] = [hx, hy];
        if (dir === 0) ny--;
        if (dir === 1) nx++;
        if (dir === 2) ny++;
        if (dir === 3) nx--;
        nx = (nx + worldSize) % worldSize;
        ny = (ny + worldSize) % worldSize;

        const dist = nearestFoodDistance(nx, ny);
        if (dist < best.dist) {
            best = { dir, dist };
        }
    }

    changeDirection(snake, best.dir);
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
