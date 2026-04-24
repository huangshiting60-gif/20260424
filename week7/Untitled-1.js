/**
 * Project Title: Irregular Curve Wire Loop Game
 * Specification (JSON):
 * {
 *   "project_title": "Irregular Curve Wire Loop Game",
 *   "technical_stack": {
 *     "framework": "p5.js",
 *     "rendering_mode": "2D",
 *     "core_commands": ["beginShape()", "curveVertex()", "endShape()"]
 *   },
 *   "game_mechanics": {
 *     "track_generation": {
 *       "type": "Irregular Path",
 *       "rendering": "Use curveVertex for smooth, organic irregular lines",
 *       "visuals": "Stroke weight should be clear; the space between lines is the 'safe zone'"
 *     },
 *     "game_states": ["WAITING", "PLAYING", "FAILED", "SUCCESS"],
 *     "interaction": {
 *       "start_trigger": "A visual button at the far left (Start Zone)",
 *       "input_method": "Mouse coordinates (mouseX, mouseY)",
 *       "collision_detection": "Check if mouse position is outside the safe gap",
 *       "restart_logic": "On collision, state sets to FAILED and resets to the starting point"
 *     }
 *   }
 * }
 */

let points = [];
let gameState = 'WAITING'; // WAITING, PLAYING, FAILED, SUCCESS
let collisionBuffer;
let startBtn = { x: 20, y: 0, w: 100, h: 40 };
let trackWidth = 50;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Create an off-screen graphics buffer for collision detection
  // This buffer will contain the "safe zone" drawn in white on black
  collisionBuffer = createGraphics(windowWidth, windowHeight);
  generateTrack();
}

function draw() {
  background(30);

  // Draw the visual track
  drawTrack();

  // Draw UI elements (Start button, Finish line, Status text)
  drawUI();

  // Handle game logic (Collision, Win condition)
  handleGameLogic();
}

function generateTrack() {
  points = [];
  let numPoints = 8;
  // Calculate spacing to span the width, leaving room for start/end
  let startX = startBtn.x + startBtn.w + 40;
  let endX = width - 60;
  let stepX = (endX - startX) / numPoints;
  
  // Start point (aligned with button)
  let startY = height / 2;
  points.push(createVector(startX, startY));

  // Intermediate points with random Y variation
  for (let i = 1; i < numPoints; i++) {
    let x = startX + i * stepX;
    // Keep y within reasonable bounds
    let y = height / 2 + random(-height / 3, height / 3);
    points.push(createVector(x, y));
  }

  // End point
  points.push(createVector(endX, height / 2));

  // Update Start Button Y to match track start roughly
  startBtn.y = points[0].y - startBtn.h / 2;

  // --- Draw to Collision Buffer ---
  collisionBuffer.background(0); // Black background (unsafe)
  collisionBuffer.noFill();
  collisionBuffer.stroke(255); // White track (safe)
  collisionBuffer.strokeWeight(trackWidth);
  collisionBuffer.strokeCap(ROUND);
  collisionBuffer.strokeJoin(ROUND);
  
  collisionBuffer.beginShape();
  if (points.length > 0) {
    // Duplicate first control point for curveVertex
    collisionBuffer.curveVertex(points[0].x, points[0].y);
    for (let p of points) {
      collisionBuffer.curveVertex(p.x, p.y);
    }
    // Duplicate last control point for curveVertex
    collisionBuffer.curveVertex(points[points.length - 1].x, points[points.length - 1].y);
  }
  collisionBuffer.endShape();
}

function drawTrack() {
  // Draw the safe zone border (outer glow/wire)
  noFill();
  stroke(50, 100, 200);
  strokeWeight(trackWidth + 4);
  drawCurve();

  // Draw the track background
  stroke(20, 20, 40); 
  strokeWeight(trackWidth);
  drawCurve();

  // Draw the "wire" (center line)
  stroke(0, 255, 255, 150); // Glowing cyan
  strokeWeight(4);
  drawCurve();
}

function drawCurve() {
  beginShape();
  if (points.length > 0) {
    curveVertex(points[0].x, points[0].y);
    for (let p of points) {
      curveVertex(p.x, p.y);
    }
    curveVertex(points[points.length - 1].x, points[points.length - 1].y);
  }
  endShape();
}

function drawUI() {
  // Start Button
  if (gameState === 'WAITING') {
    fill(0, 200, 0);
    stroke(255);
    strokeWeight(2);
    rect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 10);
    
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text("START", startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
    
    // Instruction
    fill(200);
    textSize(14);
    text("Click Start to Begin", startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h + 20);
  }

  // Finish Zone
  noStroke();
  fill(0, 255, 0, 50);
  rect(width - 50, 0, 50, height);
  fill(255);
  textAlign(CENTER, CENTER);
  push();
  translate(width - 25, height / 2);
  rotate(HALF_PI);
  text("FINISH", 0, 0);
  pop();
  
  // Status Text Overlay
  if (gameState === 'FAILED' || gameState === 'SUCCESS') {
    // Dim background
    fill(0, 150);
    rect(0, 0, width, height);
    
    textAlign(CENTER, CENTER);
    textSize(48);
    if (gameState === 'FAILED') {
      fill(255, 50, 50);
      text("GAME OVER", width / 2, height / 2 - 20);
    } else if (gameState === 'SUCCESS') {
      fill(50, 255, 50);
      text("YOU WIN!", width / 2, height / 2 - 20);
    }
    
    fill(255);
    textSize(20);
    text("Click anywhere to restart", width / 2, height / 2 + 40);
  }
}

function handleGameLogic() {
  if (gameState === 'PLAYING') {
    // Draw player cursor
    fill(255, 255, 0);
    noStroke();
    circle(mouseX, mouseY, 15);

    // Check collision
    // Get pixel from buffer at mouse position
    // collisionBuffer is black (0) for unsafe, white (255) for safe
    let c = collisionBuffer.get(mouseX, mouseY);
    
    // If red channel < 128, it's black (unsafe)
    // Also check if mouse is within canvas bounds
    if (c[0] < 128 || mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
      gameState = 'FAILED';
    }

    // Check win condition (reached right side)
    if (mouseX >= width - 50) {
      gameState = 'SUCCESS';
    }
  }
}

function mousePressed() {
  if (gameState === 'WAITING') {
    // Check start button click
    if (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w &&
        mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h) {
      gameState = 'PLAYING';
    }
  } else if (gameState === 'FAILED' || gameState === 'SUCCESS') {
    gameState = 'WAITING';
    generateTrack(); // Generate a new track for replayability
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  collisionBuffer.resizeCanvas(windowWidth, windowHeight);
  generateTrack();
}
