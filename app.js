const worldSize = 50;
const canvas = document.createElement('canvas');
const squareSize = Math.min(window.innerWidth, window.innerHeight);
const gridSize = Math.floor(squareSize / worldSize);
canvas.width = gridSize*worldSize;
canvas.height = gridSize*worldSize;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const grid = [];
for (let i = 0; i < worldSize; i++) {
    grid[i] = [];
    for (let j = 0; j < worldSize; j++) {
        grid[i][j] = Math.floor(Math.random() * 2);
    }
}
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
drawGrid();
//create gameloop
function gameLoop() {
    const newGrid = JSON.parse(JSON.stringify(grid));
    for (let i = 0; i < worldSize; i++) {
        for (let j = 0; j < worldSize; j++) {
            const neighbors = countNeighbors(i, j);
            if (grid[i][j] === 1) {
                if (neighbors < 2 || neighbors > 3) {
                    newGrid[i][j] = 0;
                }
            } else {
                if (neighbors === 3) {
                    newGrid[i][j] = 1;
                }
            }
        }
    }
    grid.splice(0, grid.length, ...newGrid);
    drawGrid();
    requestAnimationFrame(gameLoop);
}
function countNeighbors(x, y) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const newX = (x + i + worldSize) % worldSize;
            const newY = (y + j + worldSize) % worldSize;
            count += grid[newX][newY];
        }
    }
    return count;
}   
gameLoop();
