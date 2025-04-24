// == Seedable PRNG via LCG ==
class LCG {
    constructor(seed = 1) {
        this.state = seed >>> 0;
    }
    random() {
        this.state = (this.state * 1664525 + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }
}

// == Snake Game on a Toroidal World (Class-Based, Configurable Tail-Cut) ==

class Snake {
    constructor(id, startX, startY, color, worldSize, rng, cutSelfOnCollision, cutOtherOnCollision) {
        this.id = id;
        this.worldSize = worldSize;
        this.color = color;
        this.body = [[startX, startY]];
        this.rng = rng;
        this.direction = Math.floor(this.rng.random() * 4);
        this.cutSelfOnCollision = cutSelfOnCollision;
        this.cutOtherOnCollision = cutOtherOnCollision;
        this.frozen = false;
        this.frozenTimeRemaing = 0;
    }

    changeDirection(dir) {
        if ((dir + 2) % 4 !== this.direction) {
            this.direction = dir;
        }
    }

    static wrapDelta(a, b, worldSize) {
        const raw = b - a;
        const alt = raw > 0 ? raw - worldSize : raw + worldSize;
        return Math.abs(raw) < Math.abs(alt) ? raw : alt;
    }

    distanceToNearestFood(x, y, food) {
        let best = Infinity;
        for (let [fx, fy] of food) {
            const dx = Math.abs(Snake.wrapDelta(x, fx, this.worldSize));
            const dy = Math.abs(Snake.wrapDelta(y, fy, this.worldSize));
            best = Math.min(best, dx + dy);
        }
        return best;
    }

    foodNearby(food, threshold = 100) {
        const [hx, hy] = this.body[0];
        return this.distanceToNearestFood(hx, hy, food) <= threshold * 2;
    }

    aiChangeDirection(food) {
        const [hx, hy] = this.body[0];
        const currDist = this.distanceToNearestFood(hx, hy, food);

        if (!this.foodNearby(food)) {
            return this.changeDirection(Math.floor(this.rng.random() * 4));
        }

        let best = { dir: this.direction, dist: currDist };
        for (let dir = 0; dir < 4; dir++) {
            if ((dir + 2) % 4 === this.direction) continue;
            let nx = hx, ny = hy;
            if (dir === 0) ny--;
            if (dir === 1) nx++;
            if (dir === 2) ny++;
            if (dir === 3) nx--;
            nx = (nx + this.worldSize) % this.worldSize;
            ny = (ny + this.worldSize) % this.worldSize;

            const dist = this.distanceToNearestFood(nx, ny, food);
            if (dist < best.dist) best = { dir, dist };
        }

        this.changeDirection(best.dir);
    }

    getSelfCollisionIndex(x, y) {
        return this.body.findIndex(([bx, by]) => bx === x && by === y);
    }

    move(allSnakes) {
        const [hx, hy] = this.body[0];
        let [nx, ny] = [hx, hy];

        // compute next head  
        if (this.frozen) {
            console.log(`Snake ${this.id} is frozen ${this.frozenTimeRemaing} `);
            this.frozenTimeRemaing--;
            if (this.frozenTimeRemaing <= 0) {
                this.frozen = false;
            } else {
                return;
            }
        }
        switch (this.direction) {
            case 0: ny--; break;
            case 1: nx++; break;
            case 2: ny++; break;
            case 3: nx--; break;
        }
        nx = (nx + this.worldSize) % this.worldSize;
        ny = (ny + this.worldSize) % this.worldSize;

        // 1) self-collision
        let skipPop = false;
        const idxSelf = this.getSelfCollisionIndex(nx, ny);
        if (this.cutSelfOnCollision && idxSelf !== -1) {
            console.log(`Snake ${this.id} cut itself`);
            this.body = this.body.slice(0, idxSelf + 1);
            skipPop = true;
        }

        // 2) collision with other snakes
        allSnakes.forEach(other => {
            if (other.id === this.id) return;
            const idxOther = other.body.findIndex(
                ([bx, by]) => bx === nx && by === ny
            );
            if (idxOther !== -1) {
                console.log(`Snake ${this.id} cut Snake ${other.id}`);
                other.frozen = true;
                other.frozenTimeRemaing = 10;
                other.body = other.body.slice(0, idxOther + 1);
            }
        });

        // 3) add new head
        this.body.unshift([nx, ny]);

        // 4) remove tail unless just self-sliced or self-cut disabled
        if (!skipPop) {
            this.body.pop();
        }
    }

    draw(ctx, gridSize) {
        ctx.fillStyle = this.color;
        this.body.forEach(([x, y]) =>
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize)
        );
    }
}

class Game {
    constructor({
        worldSize = 100,
        snakeCount = 3,
        foodCount = 2,
        seed = 12345,
        cutSelfOnCollision = true,
        cutOtherOnCollision = true,
        colorArray = [
            'rgba(255,0,0,0.5)',
            'rgba(0,255,0,0.5)',
            'rgba(0,0,255,0.5)'
        ]
    } = {}) {
        this.worldSize = worldSize;
        this.snakeCount = snakeCount;
        this.foodCount = foodCount;
        this.cutSelfOnCollision = cutSelfOnCollision;
        this.cutOtherOnCollision = cutOtherOnCollision;
        this.colorArray = colorArray;
        this.rng = new LCG(seed);

        const square = Math.min(window.innerWidth, window.innerHeight);
        this.gridSize = Math.floor(square / this.worldSize);
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvas.height = this.gridSize * this.worldSize;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.snakes = [];
        this.food = [];
    }

    spawnFood() {
        const x = Math.floor(this.rng.random() * this.worldSize);
        const y = Math.floor(this.rng.random() * this.worldSize);
        this.food.push([x, y]);
    }

    init() {
        for (let i = 0; i < this.foodCount; i++) this.spawnFood();
        for (let i = 0; i < this.snakeCount; i++) {
            const x = Math.floor(this.rng.random() * this.worldSize);
            const y = Math.floor(this.rng.random() * this.worldSize);
            const color = this.colorArray[i % this.colorArray.length];
            this.snakes.push(
                new Snake(
                    i, x, y, color, this.worldSize, this.rng,
                    this.cutSelfOnCollision, this.cutOtherOnCollision
                )
            );
        }
    }

    drawFood() {
        this.ctx.fillStyle = 'red';
        this.food.forEach(([x, y]) =>
            this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize)
        );
    }

    eatAndGrow() {
        this.snakes.forEach(snake => {
            const [hx, hy] = snake.body[0];
            for (let i = 0; i < this.food.length; i++) {
                if (hx === this.food[i][0] && hy === this.food[i][1]) {
                    snake.body.push([hx, hy]);
                    snake.frozen = true;
                    this.food.splice(i, 1);
                    this.spawnFood();
                    break;
                }
            }
        });
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.eatAndGrow();

        this.snakes.forEach(s => s.aiChangeDirection(this.food));
        this.snakes.forEach(s => s.move(this.snakes));
        this.snakes.forEach(s => s.draw(this.ctx, this.gridSize));

        this.drawFood();
        

        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.init();
        this.gameLoop();
    }
}

// Usage: toggle tail-cut behavior by setting the flags below
window.addEventListener('load', () => {
    const game = new Game({
        worldSize: 100,
        snakeCount: 10,
        foodCount: 100,
        seed: 20250424,
        cutSelfOnCollision: true,   // true to cut own tail on self-collision
        cutOtherOnCollision: false  // false to preserve other snakes' tails on collision
    });
    game.start();
});
