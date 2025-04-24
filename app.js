const worldSize = 100;
const canvas = document.createElement('canvas');
const squareSize = Math.min(window.innerWidth, window.innerHeight);
const gridSize = Math.floor(squareSize / worldSize);
canvas.width = gridSize * worldSize;
canvas.height = gridSize * worldSize;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

//snakes
const snakeCount = 10;
let snakes = [];
for (let i = 0; i < snakeCount; i++) {
    let x = Math.floor(Math.random() * worldSize);
    let y = Math.floor(Math.random() * worldSize);
    snakes.push({
        x: x,
        y: y,
        direction: Math.floor(Math.random() * 4), // 0: up, 1: right, 2: down, 3: left
        body: [[x, y]],
    });
}
//draw snake
function drawSnake(snake) {
    ctx.fillStyle = 'green';
    for (let i = 0; i < snake.body.length; i++) {
        ctx.beginPath();
        ctx.fillRect(snake.body[i][0] * gridSize, snake.body[i][1] * gridSize, gridSize, gridSize);
        ctx.fill();
    }
}
//move snake
function moveSnake(snake) {
    let head = snake.body[0];
    let newHead;
    switch (snake.direction) {
        case 0: // up
            newHead = [head[0], head[1] - 1];
            break;
        case 1: // right
            newHead = [head[0] + 1, head[1]];
            break;
        case 2: // down
            newHead = [head[0], head[1] + 1];
            break;
        case 3: // left
            newHead = [head[0] - 1, head[1]];
            break;
    }
    //wrap around
    if (newHead[0] < 0) newHead[0] = worldSize - 1;
    if (newHead[0] >= worldSize) newHead[0] = 0;
    if (newHead[1] < 0) newHead[1] = worldSize - 1;
    if (newHead[1] >= worldSize) newHead[1] = 0;
    snake.body.unshift(newHead);
    snake.body.pop();
}
//draw snakes  
function drawSnakes() {
    for (let i = 0; i < snakes.length; i++) {
        drawSnake(snakes[i]);
    }
}
//move snakes
function moveSnakes() {
    for (let i = 0; i < snakes.length; i++) {
        moveSnake(snakes[i]);
    }
}


//food
const foodCount = 10;
let food = [];
for (let i = 0; i < foodCount; i++) {
    let x = Math.floor(Math.random() * worldSize);
    let y = Math.floor(Math.random() * worldSize);
    food.push([x, y]);
}
//draw food
function drawFood() {
    ctx.fillStyle = 'red';
    for (let i = 0; i < food.length; i++) {
        ctx.beginPath();
        ctx.fillRect(food[i][0] * gridSize, food[i][1] * gridSize, gridSize, gridSize);
        ctx.fill();
    }
}
//
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < worldSize; i++) {
        for (let j = 0; j < worldSize; j++) {
            ctx.fillStyle = grid[i][j] === 1 ? 'black' : 'white';
            ctx.beginPath();
            ctx.rect(i * gridSize, j * gridSize, gridSize, gridSize);
            ctx.fill();
        }
    }
}
//

//create gameloop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //drawGrid();
    moveSnakes();
    drawSnakes();
    drawFood();
    //check for collision with food
    for (let i = 0; i < snakes.length; i++) {
        let snake = snakes[i];
        let head = snake.body[0];
        for (let j = 0; j < food.length; j++) {
            if (head[0] === food[j][0] && head[1] === food[j][1]) {
                snake.body.push([head[0], head[1]]);
                food.splice(j, 1);
                let x = Math.floor(Math.random() * worldSize);
                let y = Math.floor(Math.random() * worldSize);
                food.push([x, y]);
            }
        }
    }   
    requestAnimationFrame(gameLoop);
}

gameLoop();
