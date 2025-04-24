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

// == Snake Game on a Toroidal World (Class-Based, Collision-Aware AI) ==

class Snake {
    constructor(id, startX, startY, color, worldSize, rng, cutSelf, cutOther) {
        this.id = id;
        this.worldSize = worldSize;
        this.color = color;
        this.body = [[startX, startY]];
        this.rng = rng;
        this.direction = Math.floor(rng.random() * 4);
        this.cutSelf = cutSelf;
        this.cutOther = cutOther;
        this.frozen = false;
        this.frozenTimeRemaining = frozenTimeRemainingGLOBAL;
    }

    // Prevent 180° turns
    changeDirection(dir) {
        if ((dir + 2) % 4 !== this.direction) {
            this.direction = dir;
        }
    }

    // Toroidal wrap‐aware delta
    static wrapDelta(a, b, worldSize) {
        const raw = b - a;
        const alt = raw > 0 ? raw - worldSize : raw + worldSize;
        return Math.abs(raw) < Math.abs(alt) ? raw : alt;
    }

    // Manhattan distance from (x,y) to nearest food pellet
    distanceToNearestFood(x, y, food) {
        let best = Infinity;
        for (const [fx, fy] of food) {
            const dx = Math.abs(Snake.wrapDelta(x, fx, this.worldSize));
            const dy = Math.abs(Snake.wrapDelta(y, fy, this.worldSize));
            best = Math.min(best, dx + dy);
        }
        return best;
    }

    // Is any food within sensing range?
    foodNearby(food, threshold = 100) {
        const [hx, hy] = this.body[0];
        return this.distanceToNearestFood(hx, hy, food) <= threshold * 2;
    }

    // Would (x,y) collide with this snake's body?
    collidesWithSelf(x, y) {
        return this.body.some(([bx, by]) => bx === x && by === y);
    }

    // Would (x,y) collide with any other snake's body?
    collidesWithOthers(x, y, allSnakes) {
        return allSnakes.some(other =>
            other.id !== this.id &&
            other.body.some(([bx, by]) => bx === x && by === y)
        );
    }

    // AI: look ahead, avoid collisions, and chase nearest food
    // inside class Snake:
    aiChangeDirection(food, allSnakes) {
        const [hx, hy] = this.body[0];
        const currDist = this.distanceToNearestFood(hx, hy, food);

        // collect all non-reverse, safe moves
        const safeMoves = [];
        for (let dir = 0; dir < 4; dir++) {
            if ((dir + 2) % 4 === this.direction) continue; // no U-turn

            let nx = hx, ny = hy;
            if (dir === 0) ny--;
            if (dir === 1) nx++;
            if (dir === 2) ny++;
            if (dir === 3) nx--;
            nx = (nx + this.worldSize) % this.worldSize;
            ny = (ny + this.worldSize) % this.worldSize;

            if (this.collidesWithSelf(nx, ny)) continue;
            if (this.collidesWithOthers(nx, ny, allSnakes)) continue;

            safeMoves.push({ dir, nx, ny });
        }

        if (safeMoves.length === 0) {
            // no safe moves—keep going straight (might collide)
            //console.warn(`Snake ${this.id} has no safe moves!`);
            return;
        }

        // among safe moves, find those that strictly improve distance
        const better = safeMoves.filter(m =>
            this.distanceToNearestFood(m.nx, m.ny, food) < currDist
        );

        let choice;
        if (better.length > 0) {
            // pick the best improvement
            choice = better.reduce((best, m) => {
                const d = this.distanceToNearestFood(m.nx, m.ny, food);
                return d < best.dist ? { dir: m.dir, dist: d } : best;
            }, { dir: better[0].dir, dist: this.distanceToNearestFood(better[0].nx, better[0].ny, food) });
            this.changeDirection(choice.dir);
        } else {
            // no improvement possible — pick random safe direction
            const pick = safeMoves[Math.floor(this.rng.random() * safeMoves.length)];
            this.changeDirection(pick.dir);
        }
    }


    // Find index in own body of (x,y), -1 if none
    getSelfCollisionIndex(x, y) {
        return this.body.findIndex(([bx, by]) => bx === x && by === y);
    }

    // Advance the snake one step, trimming tails on collision if enabled
    move(allSnakes, food) {
        if (this.frozen) {
            this.frozenTimeRemaining--;
            if (this.frozenTimeRemaining <= 0) this.frozen = false;
            return;
        }

        const [hx, hy] = this.body[0];
        let nx = hx, ny = hy;
        switch (this.direction) {
            case 0: ny--; break;
            case 1: nx++; break;
            case 2: ny++; break;
            case 3: nx--; break;
        }
        nx = (nx + this.worldSize) % this.worldSize;
        ny = (ny + this.worldSize) % this.worldSize;

        // check if landing on food
        const onFood = food.some(([fx, fy]) => fx === nx && fy === ny);
        let skipPop = false;



        // self-collision trimming
        if (this.cutSelf && !onFood) {
            const idx = this.getSelfCollisionIndex(nx, ny);
            if (idx !== -1) {
                this.body = this.body.slice(0, idx);
                //this.body = this.body.slice(0, idx + 1);
                skipPop = true;
                this.frozen = true;
                this.frozenTimeRemaining = frozenTimeRemainingGLOBAL;
                //console.warn(`Snake ${this.id} cut itself at (${nx},${ny})`);
                //play = false; // stop the game
            }
        }

        // other-collision trimming
        if (this.cutOther && !onFood) {
            allSnakes.forEach(other => {
                if (other.id === this.id) return;
                const idxO = other.body.findIndex(([bx, by]) => bx === nx && by === ny);
                if (idxO !== -1) {
                    other.body = other.body.slice(0, idxO + 1);
                    other.frozen = true;
                    other.frozenTimeRemaining = frozenTimeRemainingGLOBAL;
                    //console.warn(`Snake ${this.id} cut other snake at (${nx},${ny})`);
                }
            });
        }

        // add new head
        this.body.unshift([nx, ny]);
        // pop tail if not just trimmed
        if (!skipPop) this.body.pop();
    }

    // Draw on canvas
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
        snakeCount = 10,
        foodCount = 100,
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

    // spawn a single pellet
    spawnFood() {
        const x = Math.floor(this.rng.random() * this.worldSize);
        const y = Math.floor(this.rng.random() * this.worldSize);
        this.food.push([x, y]);
    }

    init() {
        // initial food
        for (let i = 0; i < this.foodCount; i++) this.spawnFood();
        // create snakes
        for (let i = 0; i < this.snakeCount; i++) {
            const x = Math.floor(this.rng.random() * this.worldSize);
            const y = Math.floor(this.rng.random() * this.worldSize);
            const color = this.colorArray[i % this.colorArray.length];
            this.snakes.push(new Snake(
                i, x, y, color, this.worldSize, this.rng,
                this.cutSelfOnCollision, this.cutOtherOnCollision
            ));
        }
    }

    drawFood() {
        // this.ctx.fillStyle = 'gray';
        // this.food.forEach(([x, y]) =>
        //     this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize)
        // );
    }

    eatAndGrow() {
        this.snakes.forEach(s => {
            const [hx, hy] = s.body[0];
            for (let i = 0; i < this.food.length; i++) {
                if (hx === this.food[i][0] && hy === this.food[i][1]) {
                    s.body.push([hx, hy]);
                    s.frozen = true;
                    s.frozenTimeRemaining = frozenTimeRemainingGLOBAL;
                    this.food.splice(i, 1);
                    this.spawnFood();
                    break;
                }
            }
        });
    }

    gameLoop() {


        // AI choose safe move before chasing food
        this.snakes.forEach(s => s.aiChangeDirection(this.food, this.snakes));
        this.snakes.forEach(s => s.move(this.snakes, this.food));
        if (!play) return;
        //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        //fade out ctx
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // fade out effect
        //this.ctx.globalAlpha = 0.1; // fade out effect
        //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // fade out effect

        // Move & draw
        this.snakes.forEach(s => s.draw(this.ctx, this.gridSize));

        this.drawFood();
        this.eatAndGrow();

        requestAnimationFrame(() => this.gameLoop());


    }

    start() {
        this.init();
        this.gameLoop();
    }
}

// Launch with options
window.addEventListener('load', () => {
    const game = new Game({
        worldSize: 150,
        snakeCount: 25,
        foodCount: 6000,
        seed: 2,
        cutSelfOnCollision: true,
        cutOtherOnCollision: true
    });
    game.start();
});

let play = true;
let frozenTimeRemainingGLOBAL = 0;
