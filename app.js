// == CPU Simulation Logic ==

class LCG {
    constructor(seed = 1) {
      this.state = seed >>> 0;
    }
    random() {
      this.state = (this.state * 1664525 + 1013904223) >>> 0;
      return this.state / 0x100000000;
    }
  }
  
  class Snake {
    constructor(id, x, y, color, worldSize, rng) {
      this.id        = id;
      this.worldSize = worldSize;
      this.color     = color;
      this.body      = [[x, y]];
      this.rng       = rng;
      this.direction = Math.floor(rng.random() * 4);
      this.frozen    = false;
      this.frozenTime = 0;
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
      for (const [fx, fy] of food) {
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
  
    collidesWithSelf(x, y) {
      return this.body.some(([bx, by]) => bx === x && by === y);
    }
  
    collidesWithOthers(x, y, allSnakes) {
      return allSnakes.some(s =>
        s.id !== this.id &&
        s.body.some(([bx, by]) => bx === x && by === y)
      );
    }
  
    aiChangeDirection(food, allSnakes) {
      const [hx, hy] = this.body[0];
      const currDist = this.distanceToNearestFood(hx, hy, food);
  
      // collect safe, non-reverse moves
      const safe = [];
      for (let dir = 0; dir < 4; dir++) {
        if ((dir + 2) % 4 === this.direction) continue;
        let nx = hx + (dir===1) - (dir===3),
            ny = hy + (dir===2) - (dir===0);
        nx = (nx + this.worldSize) % this.worldSize;
        ny = (ny + this.worldSize) % this.worldSize;
        if (this.collidesWithSelf(nx, ny)) continue;
        if (this.collidesWithOthers(nx, ny, allSnakes)) continue;
        safe.push({ dir, nx, ny });
      }
      if (!safe.length) return; // no safe move
  
      if (!this.foodNearby(food)) {
        // random safe
        const p = safe[Math.floor(this.rng.random() * safe.length)];
        this.changeDirection(p.dir);
        return;
      }
  
      // pick safe move that best reduces distance
      let best = { dir: this.direction, dist: currDist };
      for (const m of safe) {
        const d = this.distanceToNearestFood(m.nx, m.ny, food);
        if (d < best.dist) best = { dir: m.dir, dist: d };
      }
      if (best.dist < currDist) this.changeDirection(best.dir);
      else {
        const p = safe[Math.floor(this.rng.random() * safe.length)];
        this.changeDirection(p.dir);
      }
    }
  
    move(allSnakes, food) {
      if (this.frozen) {
        if (--this.frozenTime <= 0) this.frozen = false;
        return;
      }
  
      const [hx, hy] = this.body[0];
      let nx = hx + (this.direction===1) - (this.direction===3),
          ny = hy + (this.direction===2) - (this.direction===0);
      nx = (nx + this.worldSize) % this.worldSize;
      ny = (ny + this.worldSize) % this.worldSize;
  
      // grow on food
      const onFood = food.some(([fx, fy], i) => {
        if (fx===nx && fy===ny) {
          this.body.push([nx, ny]);
          food.splice(i,1);
          return true;
        }
        return false;
      });
  
      this.body.unshift([nx, ny]);
      if (!onFood) this.body.pop();
    }
  }
  
  class Game {
    constructor(opts={}) {
      this.worldSize = opts.worldSize||150;
      this.snakeCount= opts.snakeCount||25;
      this.foodCount = opts.foodCount||4000;
      this.rng       = new LCG(opts.seed||2);
      this.snakes    = [];
      this.food      = [];
    }
  
    spawnFood() {
      this.food.push([
        Math.floor(this.rng.random()*this.worldSize),
        Math.floor(this.rng.random()*this.worldSize)
      ]);
    }
  
    init() {
      for (let i=0;i<this.foodCount;i++) this.spawnFood();
      for (let i=0;i<this.snakeCount;i++) {
        this.snakes.push(new Snake(
          i,
          Math.floor(this.rng.random()*this.worldSize),
          Math.floor(this.rng.random()*this.worldSize),
          [(i%3===0),(i%3===1),(i%3===2)], // q: color triple, not used
          this.worldSize,
          this.rng
        ));
      }
    }
  
    step() {
      // update directions
      this.snakes.forEach(s=>s.aiChangeDirection(this.food,this.snakes));
      // move & eat
      this.snakes.forEach(s=>s.move(this.snakes,this.food));
    }
  }
  
  // == WebGL Rendering Logic ==
  
  const worldSize = 150;
  const gridSize  = Math.floor(Math.min(innerWidth,innerHeight)/worldSize);
  const canvas    = document.createElement('canvas');
  canvas.width    = worldSize*gridSize;
  canvas.height   = worldSize*gridSize;
  document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl2');
  
  // Create shaders
  const vsSource = `#version 300 es
  in vec4 a_position;
  void main(){ gl_Position=a_position; }`;
  const fsSource = `#version 300 es
  precision highp float;
  uniform sampler2D u_state;
  uniform vec2 u_resolution;
  uniform vec2 u_world;
  out vec4 outColor;
  void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // compute cell center UV
    vec2 cell = 1.0/u_world;
    vec2 coord = (floor(gl_FragCoord.xy/cell)+0.5)*cell;
    vec4 s = texture(u_state, coord);
    if(s.r>0.5)      outColor = vec4(1,1,1,1);
    else if(s.g>0.5) outColor = vec4(1,0,0,1);
    else              outColor = vec4(0,0,0,1);
  }`;
  function createShader(g,type,src){
    const s=g.createShader(type);
    g.shaderSource(s,src);
    g.compileShader(s);
    if(!g.getShaderParameter(s,g.COMPILE_STATUS)){
      console.error(g.getShaderInfoLog(s));return null;
    }
    return s;
  }
  const vs=createShader(gl,gl.VERTEX_SHADER,vsSource);
  const fs=createShader(gl,gl.FRAGMENT_SHADER,fsSource);
  const prog=gl.createProgram();
  gl.attachShader(prog,vs);
  gl.attachShader(prog,fs);
  gl.linkProgram(prog);
  
  // Quad
  const quad=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
   -1,-1, 1,-1, -1,1,
   -1, 1, 1,-1,  1,1
  ]),gl.STATIC_DRAW);
  
  // State texture
  const stateTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,stateTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,0,gl.RGBA,worldSize,worldSize,
    0,gl.RGBA,gl.UNSIGNED_BYTE,null
  );
  
  // Get locations
  const posLoc = gl.getAttribLocation(prog,'a_position');
  const resLoc = gl.getUniformLocation(prog,'u_resolution');
  const wrdLoc = gl.getUniformLocation(prog,'u_world');
  const stLoc  = gl.getUniformLocation(prog,'u_state');
  
  // Game instance
  const game = new Game({worldSize, snakeCount:25, foodCount:4000, seed:2});
  game.init();
  
  // CPU→GPU state upload helper
  const stateBuf = new Uint8Array(worldSize*worldSize*4);
  function uploadState(){
    stateBuf.fill(0);
    // snakes
    for (const s of game.snakes){
      for (const [x,y] of s.body){
        const i = (y*worldSize + x)*4;
        stateBuf[i] = 255;
      }
    }
    // food
    for (const [x,y] of game.food){
      const i = (y*worldSize + x)*4 + 1;
      stateBuf[i] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D,stateTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,0,0,0,worldSize,worldSize,
      gl.RGBA,gl.UNSIGNED_BYTE,stateBuf
    );
  }
  
  // Render loop
  function render(){
    game.step();
    uploadState();
  
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
  
    // quad
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
  
    // uniforms
    gl.uniform2f(resLoc,canvas.width,canvas.height);
    gl.uniform2f(wrdLoc,worldSize,worldSize);
    gl.uniform1i(stLoc,0);
  
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,stateTex);
  
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(render);
  }
  render();
  