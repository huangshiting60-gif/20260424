/**
 * Project Title: Irregular Curve Wire Loop Game (電流急急棒)
 *
 * 遊戲說明：
 * 1. 點擊左側綠色 "START" 按鈕開始。
 * 2. 移動綠色圓點，保持在軌道內。
 * 3. 碰到邊界（黑色區域）會發出電流聲並失敗。
 * 4. 到達右側紅色圓圈即獲勝。
 */

let points = []; // 軌道點陣列
let gameState = 'WAITING'; // 遊戲狀態: WAITING, PLAYING, LEVEL_FAILED, GAME_OVER, LEVEL_CLEARED, GAME_COMPLETE
let collisionBuffer; // 用於碰撞偵測的緩衝區 (p5.Graphics 物件)
let particles = []; // 粒子效果陣列 (玩家光點的拖尾)
let litPathParticles = []; // 新增：用於路徑記憶軌跡的粒子陣列
let lives; // 當前生命值
const MAX_LIVES = 3; // 每關最大生命值
let isMouseAttached = false; // 判斷玩家是否已接住起點球
let wandSize = 15; // 玩家光點的當前大小
let wandColor = []; // 玩家光點的當前顏色
let currentObstacles = []; // 當前關卡的障礙物陣列
let nearCollision = false; // 判斷是否接近碰撞區
let startBtn = { x: 20, y: 0, w: 100, h: 40 };
let currentLevel = 0; // 當前關卡索引
let levels = [
  { // Level 1 (Easy)
    trackWidth: 45, // 軌道寬度
    numPoints: 8,
    yRange: 0.25, // height * 0.25
    difficulty: "簡單",
    obstacles: [] // 第一關沒有障礙物
  },
  { // Level 2 (Medium)
    trackWidth: 35,
    numPoints: 10, // 保持點數不變
    yRange: 0.33, // height * 0.33
    difficulty: "中等",
    obstacles: [
      { type: 'circle', size: 40, speed: 0.03, trackSegmentIndex: 2, movementRange: 40, offsetDirection: 1 }, // 沿軌道法線移動
      { type: 'circle', size: 35, speed: 0.04, trackSegmentIndex: 7, movementRange: 30, offsetDirection: -1 }
    ]
  },
  { // Level 3 (Hard)
    trackWidth: 30,
    numPoints: 12,
    yRange: 0.4, // height * 0.4
    difficulty: "困難",
    obstacles: [
      { type: 'circle', size: 40, speed: 0.04, trackSegmentIndex: 3, movementRange: 50, offsetDirection: -1 },
      { type: 'circle', size: 45, speed: 0.02, trackSegmentIndex: 6, movementRange: 60, offsetDirection: 1 },
      { type: 'circle', size: 38, speed: 0.05, trackSegmentIndex: 9, movementRange: 45, offsetDirection: 1 }
    ]
  },
  { // Level 4 (Very Hard)
    trackWidth: 25,
    numPoints: 15,
    yRange: 0.45, // height * 0.45
    difficulty: "非常困難",
    obstacles: [
      { type: 'circle', size: 40, speed: 0.05, trackSegmentIndex: 2, movementRange: 60, offsetDirection: 1 },
      { type: 'circle', size: 45, speed: 0.03, trackSegmentIndex: 5, movementRange: 70, offsetDirection: -1 },
      { type: 'circle', size: 50, speed: 0.04, trackSegmentIndex: 8, movementRange: 50, offsetDirection: 1 },
      { type: 'circle', size: 42, speed: 0.06, trackSegmentIndex: 11, movementRange: 55, offsetDirection: -1 },
      { type: 'circle', size: 48, speed: 0.035, trackSegmentIndex: 13, movementRange: 65, offsetDirection: 1 }
    ]
  }
];
let osc; // 聲音振盪器

// 全局顏色調色板，用於統一風格 (使用提供的顏色)
const LUX_DARK_BG = [157, 129, 137]; // Dusty Mauve
const LUX_MID_BG = [244, 172, 183]; // Cherry Blossom
const LUX_LIGHT_BG = [255, 202, 212]; // Pastel Pink
const LUX_GOLD = [255, 229, 217]; // Powder Petal (作為高光/主要互動色)
const LUX_SILVER = [216, 226, 220]; // Alabaster Grey (作為中性色/文字)
const LUX_PURPLE_GLOW = [255, 202, 212]; // Pastel Pink (作為光暈/強調色)
const LUX_TRACK_CORE = [255, 229, 217]; // Powder Petal (軌道核心)
const LUX_TRACK_EDGE = [157, 129, 137]; // Dusty Mauve (軌道邊緣)
const LUX_TRACK_OUTER = [100, 80, 90]; // 更深的 Dusty Mauve (軌道外層)
const LUX_ACCENT_RED = [244, 172, 183]; // Cherry Blossom (失敗/目標)
const LUX_ACCENT_GREEN = [216, 226, 220]; // Alabaster Grey (成功)

// 全局變數，用於儲存背景元素的隨機配置
let bgSeed; // 每次背景生成時的隨機種子
let moonConfig = {}; // 月亮的配置 {x, y, size}
let cloudConfigs = []; // 雲朵的配置陣列 [{x, y, baseSize}, ...]
let hillBezierOffsets = []; // 山丘貝茲曲線控制點的偏移量
let fwConfig = {}; // 摩天輪的配置 {x, y, size}
let balloonConfigs = []; // 氣球的配置陣列 [{x, y}, ...]
let startOrbConfigs = []; // 起始畫面浮動圓形的配置陣列 [{x, y, size}, ...]

// Global variable to store the calculated normal for each obstacle
// This will be calculated once per track generation
let obstacleNormals = [];

// 輔助函數：繪製愛心
function drawHeart(x, y, size, scaleFactor = 1) { // 增加 scaleFactor 參數
  push();
  translate(x, y);
  scale(scaleFactor); // 應用縮放因子
  
  noStroke();
  beginShape();
  vertex(0, size * 0.4); // 愛心底部尖點的起始 Y 座標
  // 右半邊貝茲曲線
  bezierVertex(size * 0.5, -size * 0.2, size * 0.8, size * 0.2, 0, size);
  // 左半邊貝茲曲線
  bezierVertex(-size * 0.8, size * 0.2, -size * 0.5, -size * 0.2, 0, size * 0.4);
  endShape(CLOSE);
  pop();
}

// 輔助函數：繪製鬼的圖示
function drawGhost(x, y, size) {
  push();
  
  // 計算眼睛看向滑鼠的偏移量
  // 鬼魂的中心點在 (x, y)
  // 眼睛的原始位置是相對於鬼魂中心的 (-size * 0.2, size * 0.2) 和 (size * 0.2, size * 0.2)
  let eyeOffsetX = 0;
  let eyeOffsetY = 0;
  if (mouseX && mouseY) { // 確保滑鼠有值
    let angle = atan2(mouseY - (y + size * 0.2), mouseX - x); // 計算從鬼魂眼睛中心到滑鼠的角度
    let eyeMovementRange = size * 0.08; // 眼睛移動的範圍
    eyeOffsetX = cos(angle) * eyeMovementRange;
    eyeOffsetY = sin(angle) * eyeMovementRange;
  }

  // 添加脈衝式發光效果
  let glowStrength = map(sin(frameCount * 0.1), -1, 1, 10, 25); // 光暈強度在 10 到 25 之間變化
  drawingContext.shadowBlur = glowStrength;
  drawingContext.shadowColor = color(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2], 150); // Cherry Blossom 顏色，半透明

  // 繪製鬼魂本身
  translate(x, y);
  noStroke();
  fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2], 220); // 鬼的顏色，使用 Alabaster Grey

  // 身體部分 (圓頂和矩形)
  arc(0, 0, size, size, PI, TWO_PI); // 圓頂
  rect(-size / 2, 0, size, size * 0.7); // 矩形身體

  // 底部波浪
  beginShape();
  vertex(-size / 2, size * 0.7);
  bezierVertex(-size * 0.3, size * 0.9, -size * 0.1, size * 0.6, 0, size * 0.8);
  bezierVertex(size * 0.1, size * 0.6, size * 0.3, size * 0.9, size / 2, size * 0.7);
  endShape(CLOSE);

  // 眼睛
  fill(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]); // 眼睛顏色，使用 Dusty Mauve
  circle(-size * 0.2 + eyeOffsetX, size * 0.2 + eyeOffsetY, size * 0.2); // 左眼
  circle(size * 0.2 + eyeOffsetX, size * 0.2 + eyeOffsetY, size * 0.2); // 右眼

  // 嘴巴 (簡單的開合動畫)
  fill(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]); // 嘴巴顏色
  let mouthOpenness = map(sin(frameCount * 0.15), -1, 1, 0.05, 0.2); // 嘴巴開合程度在 0.05 到 0.2 之間變化
  let mouthWidth = size * 0.4;
  let mouthHeight = size * mouthOpenness;
  arc(0, size * 0.5, mouthWidth, mouthHeight, 0, PI); // 繪製弧形嘴巴

  drawingContext.shadowBlur = 0; // 重置陰影，避免影響其他繪圖
  pop();
}

function drawStartScreenBackground() {
  randomSeed(bgSeed); // 使用全局種子，確保每次背景生成時的隨機性一致

  // 簡潔的漸層背景
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    // 增加隨機偏移，讓每次漸層顏色略有不同
    let c1 = color(LUX_DARK_BG[0] + random(-10, 10), LUX_DARK_BG[1] + random(-10, 10), LUX_DARK_BG[2] + random(-10, 10));
    let c2 = color(LUX_MID_BG[0] + random(-10, 10), LUX_MID_BG[1] + random(-10, 10), LUX_MID_BG[2] + random(-10, 10));
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, y, width, y);
  }

  // 抽象的浮動圓形 (使用預先生成的配置)
  noStroke();
  for (let i = 0; i < startOrbConfigs.length; i++) {
    let orb = startOrbConfigs[i];
    // 在基礎位置上增加基於 frameCount 的動畫
    let x = orb.x + sin(frameCount * 0.01 + i * 0.5) * 50;
    let y = orb.y + cos(frameCount * 0.015 + i * 0.7) * 40;
    let size = orb.size + sin(frameCount * 0.02 + i * 0.3) * 30;
    let alpha = map(sin(frameCount * 0.03 + i * 0.2), -1, 1, 30, 100); // 透明度閃爍
    fill(LUX_PURPLE_GLOW[0], LUX_PURPLE_GLOW[1], LUX_PURPLE_GLOW[2], alpha); // 粉色光暈，半透明
    circle(x, y, size);
  }

  // 閃爍的星塵 (每次繪製時隨機生成位置)
  for (let i = 0; i < 100; i++) {
    let x = random(width);
    let y = random(height);
    let alpha = map(sin(frameCount * 0.05 + i * 0.1), -1, 1, 30, 150); // 亮度閃爍
    let size = random(1, 2.5); // 稍微小一點
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2], alpha); // 銀色，閃爍
    circle(x, y, size);
  }
}

function resetBackgroundRandomness() {
  bgSeed = random(100000); // 生成一個新的種子，用於每次背景實例
  randomSeed(bgSeed); // 使用此種子來確保背景元素配置的一致性

  // 月亮配置
  moonConfig = {
    x: width * random(0.08, 0.12),
    y: height * random(0.08, 0.12),
    size: random(70, 90)
  };

  // 雲朵配置
  cloudConfigs = [];
  for (let i = 0; i < 5; i++) {
    cloudConfigs.push({
      x: width * random(0.1, 0.9),
      y: height * random(0.1, 0.4),
      baseSize: random(50, 100)
    });
  }

  // 山丘貝茲曲線偏移量
  hillBezierOffsets = [];
  for (let i = 0; i < 9; i++) { // 3 個山丘 * 3 個控制點
    hillBezierOffsets.push(random(-0.05, 0.05));
  }

  // 摩天輪配置
  fwConfig = {
    x: width * random(0.8, 0.9),
    y: height * random(0.6, 0.7),
    size: random(160, 200)
  };

  // 氣球配置
  balloonConfigs = [];
  for (let i = 0; i < 4; i++) {
    balloonConfigs.push({
      x: width * random(0.1, 0.5),
      y: height * random(0.3, 0.6)
    });
  }

  // 起始畫面浮動圓形配置
  startOrbConfigs = [];
  for (let i = 0; i < 5; i++) {
    startOrbConfigs.push({
      x: width * random(0.1, 0.9),
      y: height * random(0.1, 0.9),
      size: random(80, 130)
    });
  }

  // 重置 randomSeed 為預設值 (基於時間)，以確保其他隨機操作（如粒子效果）每幀都是隨機的
  randomSeed(millis());
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 建立碰撞偵測層
  collisionBuffer = createGraphics(windowWidth, windowHeight);

  // 初始化電流音效
  osc = new p5.Oscillator('sawtooth');
  osc.amp(0);
  osc.start();

  resetBackgroundRandomness(); // 初始化背景隨機性
  generateTrack();
  lives = MAX_LIVES; // 初始化生命值
  // noCursor(); // 移除此行，讓系統游標預設可見
}

function draw() {
  // 根據遊戲狀態繪製不同的背景
  if (gameState === 'WAITING') {
    drawStartScreenBackground(); // 遊戲等待時顯示獨立的起始畫面背景
  } else {
    drawSceneBackground(); // 遊戲進行時顯示遊樂園背景
  }

  drawTrack();
  drawUI();
  updateAndDrawParticles();
  handleGameLogic();
  updateAndDrawObstacles(); // 新增：更新並繪製障礙物

  // 根據遊戲狀態控制系統游標和自訂游標的顯示
  if (gameState === 'PLAYING' || gameState === 'LEVEL_FAILED') { // 遊戲進行中或關卡失敗時隱藏系統游標
    noCursor(); // 遊戲進行中隱藏系統游標
    drawWand(); // 繪製自訂游標
  } else {
    cursor(ARROW); // 其他狀態顯示系統游標 (例如等待開始、失敗、成功)
  }
}

function drawSceneBackground() {
  randomSeed(bgSeed); // 使用全局種子，確保每次背景生成時的隨機性一致
  // 1. 天空漸層 (改為深邃的夜晚或黃昏)
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    // 增加隨機偏移，讓每次漸層顏色略有不同
    let c1 = color(LUX_DARK_BG[0] + random(-5, 5), LUX_DARK_BG[1] + random(-5, 5), LUX_DARK_BG[2] + random(-5, 5));
    let c2 = color(LUX_MID_BG[0] + random(-5, 5), LUX_MID_BG[1] + random(-5, 5), LUX_MID_BG[2] + random(-5, 5));
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, y, width, y);
  }

  // 2. 可愛太陽 (改為優雅的月亮)
  push();
  translate(moonConfig.x + sin(frameCount * 0.005) * 10, moonConfig.y + cos(frameCount * 0.007) * 10); // Subtle animation
  fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]); // 銀色月亮
  noStroke();
  circle(0, 0, moonConfig.size + sin(frameCount * 0.02) * 5); // Subtle size pulse

  // 月亮光暈 (柔和的光芒)
  for (let i = 0; i < 8; i++) {
    let alpha = map(i, 0, 7, 0, 80);
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2], alpha);
    circle(0, 0, 80 + i * 5);
  }

  // 月亮表面紋理 (簡化)
  fill(LUX_SILVER[0] * 0.8, LUX_SILVER[1] * 0.8, LUX_SILVER[2] * 0.8, 150);
  ellipse(-15, -10, 20, 15);
  ellipse(10, 5, 15, 10);
  ellipse(-5, 15, 10, 8);
  pop();

  // 3. 蓬鬆雲朵 (改為更稀薄、深色的雲)
  noStroke();
  fill(LUX_LIGHT_BG[0], LUX_LIGHT_BG[1], LUX_LIGHT_BG[2], 100); // 淺粉色，半透明

  function drawFluffyCloud(x, y, baseSize) {
    ellipse(x, y, baseSize * 1.2, baseSize * 0.8);
    ellipse(x + baseSize * 0.3, y - baseSize * 0.2, baseSize * 0.9, baseSize * 0.7);
    ellipse(x - baseSize * 0.3, y - baseSize * 0.2, baseSize * 0.9, baseSize * 0.7);
    ellipse(x + baseSize * 0.5, y + baseSize * 0.1, baseSize * 0.7, baseSize * 0.5);
    ellipse(x - baseSize * 0.5, y + baseSize * 0.1, baseSize * 0.7, baseSize * 0.5);
  }

  for (let i = 0; i < cloudConfigs.length; i++) {
    let cloud = cloudConfigs[i];
    drawFluffyCloud(cloud.x + sin(frameCount * 0.008 + i) * 5, cloud.y + cos(frameCount * 0.006 + i) * 5, cloud.baseSize); // Subtle float animation
  }
  // 4. 分層山丘 (改為深邃的抽象山脈剪影)
  noStroke();
  // 最遠處山丘 (最深色)
  fill(LUX_DARK_BG[0] * 0.8, LUX_DARK_BG[1] * 0.8, LUX_DARK_BG[2] * 0.8); // 更深的 Dusty Mauve
  beginShape();
  vertex(0, height * 0.8);
  bezierVertex(width * 0.2, height * 0.7, width * 0.4, height * 0.85, width * 0.6, height * 0.75);
  bezierVertex(width * 0.8, height * 0.68, width * 0.9, height * 0.8, width, height * 0.78);
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);

  // 中間山丘 (中等深色)
  fill(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]); // Dusty Mauve
  beginShape();
  vertex(0, height * 0.85);
  bezierVertex(width * 0.15, height * 0.78, width * 0.35, height * 0.9, width * 0.55, height * 0.82);
  bezierVertex(width * 0.75, height * 0.75, width * 0.95, height * 0.88, width, height * 0.85);
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);

  // 最前景山丘 (淺一點的深色)
  fill(LUX_MID_BG[0], LUX_MID_BG[1], LUX_MID_BG[2]); // Cherry Blossom
  beginShape();
  vertex(0, height * 0.9);
  bezierVertex(width * 0.1, height * 0.85, width * 0.3, height * 0.95, width * 0.5, height * 0.88);
  bezierVertex(width * 0.7, height * 0.82, width * 0.9, height * 0.92, width, height * 0.9);
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);


  // 5. 精緻摩天輪 (改為金屬質感，帶有發光效果)
  let fwX = fwConfig.x;
  let fwY = fwConfig.y;
  let fwSize = fwConfig.size; // 直徑

  push();
  translate(fwX, fwY);

  // 基座結構
  fill(LUX_SILVER[0] * 0.5, LUX_SILVER[1] * 0.5, LUX_SILVER[2] * 0.5); // 深銀灰色
  stroke(LUX_SILVER[0] * 0.3, LUX_SILVER[1] * 0.3, LUX_SILVER[2] * 0.3);
  strokeWeight(2);
  rect(-25, fwSize / 2 - 10, 50, 70); // 主要垂直支撐
  triangle(-50, fwSize / 2 - 10, 50, fwSize / 2 - 10, 0, -fwSize / 2 + 30); // A字型支撐

  // 輪子本身
  stroke(LUX_PURPLE_GLOW[0], LUX_PURPLE_GLOW[1], LUX_PURPLE_GLOW[2]); // 粉色邊框
  strokeWeight(6);
  fill(LUX_LIGHT_BG[0], LUX_LIGHT_BG[1], LUX_LIGHT_BG[2], 150); // 淺粉色，半透明
  circle(0, 0, fwSize);

  // 中央輪軸 (金色)
  fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]);
  noStroke();
  circle(0, 0, fwSize * 0.2);

  // 輪輻 (銀色)
  stroke(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]);
  strokeWeight(3);
  for (let i = 0; i < 12; i++) {
    let angle = TWO_PI / 12 * i;
    line(0, 0, cos(angle) * fwSize / 2, sin(angle) * fwSize / 2);
  }

  // 座艙 (深藍色，帶有金色窗戶)
  let cabinSize = 30;
  for (let i = 0; i < 6; i++) {
    let angle = TWO_PI / 6 * i + frameCount * 0.005; // 讓摩天輪緩慢轉動
    let cabinX = cos(angle) * (fwSize / 2 - cabinSize / 2 - 5);
    let cabinY = sin(angle) * (fwSize / 2 - cabinSize / 2 - 5);

    push();
    translate(cabinX, cabinY);
    rotate(angle); // 讓座艙稍微跟隨輪子轉動 (保持水平)
    fill(LUX_MID_BG[0], LUX_MID_BG[1], LUX_MID_BG[2]); // Cherry Blossom 座艙
    stroke(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]);
    strokeWeight(1);
    rect(-cabinSize / 2, -cabinSize / 2, cabinSize, cabinSize, 8); // 圓角矩形
    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 150); // 金色窗戶
    rect(-cabinSize / 4, -cabinSize / 4, cabinSize / 2, cabinSize / 2, 3);
    pop();
  }
  pop(); // 結束摩天輪的變換


  // 6. 飄浮氣球 (使用提供的顏色，帶有光澤)
  let balloonColors = [
    color(LUX_MID_BG[0], LUX_MID_BG[1], LUX_MID_BG[2], 220), // Cherry Blossom
    color(LUX_LIGHT_BG[0], LUX_LIGHT_BG[1], LUX_LIGHT_BG[2], 220), // Pastel Pink
    color(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2], 220), // Alabaster Grey
    color(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 220)  // Powder Petal
  ];
  for (let i = 0; i < balloonConfigs.length; i++) {
    let balloon = balloonConfigs[i];
    let bX = balloon.x + sin(frameCount * 0.03 + i * 0.6) * 20; // Subtle float animation
    let bY = balloon.y + cos(frameCount * 0.02 + i * 0.8) * 25; // Subtle float animation
    push();
    translate(bX, bY);
    fill(balloonColors[i]);
    noStroke();
    ellipse(0, 0, 35, 50); // 氣球主體

    // 高光
    fill(255, 255, 255, 150); // 更亮的高光
    ellipse(-8, -15, 12, 20);

    // 繩結
    fill(red(balloonColors[i]) * 0.7, green(balloonColors[i]) * 0.7, blue(balloonColors[i]) * 0.7);
    triangle(-5, 25, 5, 25, 0, 30);

    // 繩子
    stroke(LUX_SILVER[0] * 0.7, LUX_SILVER[1] * 0.7, LUX_SILVER[2] * 0.7);
    strokeWeight(1);
    line(0, 30, 0, 60);
    pop();
  }

  // 失敗時的紅色半透明覆蓋
  if (gameState === 'FAILED' && frameCount % 10 < 5) {
    fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2], 80); // Cherry Blossom 半透明覆蓋 (用於 GAME_OVER)
    rect(0, 0, width, height);
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 5; // 粒子逐漸變淡
    
    noStroke();
    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], p.alpha); // 粒子改為金色
    circle(p.x, p.y, p.size);
    
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

// 新增：更新路徑記憶效果的函數
function updateLitPathEffect() {
  if (gameState === 'PLAYING' && isMouseAttached && !nearCollision) {
    // Add a new "lit" particle at current mouse position
    litPathParticles.push({
      x: mouseX,
      y: mouseY,
      alpha: 255,
      size: random(levels[currentLevel].trackWidth * 0.4, levels[currentLevel].trackWidth * 0.6) // Size relative to track width
    });
  }

  // Update alpha and remove faded particles
  for (let i = litPathParticles.length - 1; i >= 0; i--) {
    litPathParticles[i].alpha -= 8; // Adjust fade speed
    if (litPathParticles[i].alpha <= 0) {
      litPathParticles.splice(i, 1);
    }
  }
}

function generateTrack() {
  points = [];
  
  // 根據當前關卡設定軌道參數
  let levelConfig = levels[currentLevel];
  let numPoints = levelConfig.numPoints;

  let startX = startBtn.x + startBtn.w + 20;
  let endX = width - 60;
  let stepX = (endX - startX) / numPoints;

  let startY = height / 2;
  points.push(createVector(startX, startY));

  for (let i = 1; i < numPoints; i++) {
    let x = startX + i * stepX;
    let y = height / 2 + random(-height * levelConfig.yRange, height * levelConfig.yRange);
    points.push(createVector(x, y));
  }

  points.push(createVector(endX, height / 2));

  if (points.length > 0) {
    // 確保 startBtn 的 Y 座標與軌道起點對齊
    startBtn.y = points[0].y - startBtn.h / 2;
  }

  if (collisionBuffer) {
    collisionBuffer.background(0);
    collisionBuffer.noStroke();
    collisionBuffer.fill(255);
    // 建立按鈕到軌道的安全橋樑
    collisionBuffer.rect(startBtn.x - 10, startBtn.y - 10, startBtn.w + 50, startBtn.h + 20); // 確保按鈕區域安全

    collisionBuffer.noFill();
    
    // 1. 繪製最外層的安全區 (白色)
    collisionBuffer.stroke(255); // 白色代表最安全區域
    collisionBuffer.strokeWeight(levelConfig.trackWidth); // 使用關卡定義的軌道寬度
    collisionBuffer.strokeCap(ROUND);
    collisionBuffer.strokeJoin(ROUND);
    collisionBuffer.beginShape();
    if (points.length > 0) {
      collisionBuffer.curveVertex(points[0].x, points[0].y);
      for (let p of points) {
        collisionBuffer.curveVertex(p.x, p.y);
      }
      collisionBuffer.curveVertex(points[points.length - 1].x, points[points.length - 1].y);
    }
    collisionBuffer.endShape();

    // 2. 繪製內層的接近碰撞區 (灰色)
    // 這個區域比安全區窄，當滑鼠進入這個區域時，會觸發 nearCollision 狀態
    collisionBuffer.stroke(150); // 灰色代表接近碰撞區
    collisionBuffer.strokeWeight(levelConfig.trackWidth - 10); // 比安全區窄 10 像素
    collisionBuffer.strokeCap(ROUND);
    collisionBuffer.strokeJoin(ROUND);
    collisionBuffer.beginShape(); // 重新繪製曲線
    if (points.length > 0) {
      collisionBuffer.curveVertex(points[0].x, points[0].y);
      for (let p of points) {
        collisionBuffer.curveVertex(p.x, p.y);
      }
      collisionBuffer.curveVertex(points[points.length - 1].x, points[points.length - 1].y);
    }
    collisionBuffer.endShape();

    // 3. 繪製終點安全區 (確保紅色圓圈範圍內不會觸電)
    collisionBuffer.fill(255);
    let endP = points[points.length - 1];
    collisionBuffer.circle(endP.x, endP.y, 40);
  }

  // 初始化障礙物
  // 初始化障礙物
  currentObstacles = []; // 清除之前的障礙物
  obstacleNormals = []; // 清除之前的法線
  if (levelConfig.obstacles) {
    for (let obsConfig of levelConfig.obstacles) {
      // 找到障礙物在軌道上的基礎點
      let basePointIndex = obsConfig.trackSegmentIndex;
      if (basePointIndex < 0) basePointIndex = 0;
      if (basePointIndex >= points.length) basePointIndex = points.length - 1;

      let baseTrackPoint = points[basePointIndex];
      let initialX = baseTrackPoint.x;
      let initialY = baseTrackPoint.y;

      // 計算障礙物所在點的切線和法線
      let pPrev, pNext;

      if (basePointIndex === 0) {
        pPrev = points[0]; // 對於第一個點，使用自身作為前一個點
        pNext = points[1];
      } else if (basePointIndex === points.length - 1) {
        pPrev = points[points.length - 2];
        pNext = points[points.length - 1]; // 對於最後一個點，使用自身作為下一個點
      } else {
        pPrev = points[basePointIndex - 1];
        pNext = points[basePointIndex + 1];
      }

      let tangentX = pNext.x - pPrev.x;
      let tangentY = pNext.y - pPrev.y;

      let normalX = -tangentY; // 法線向量 (逆時針旋轉90度)
      let normalY = tangentX;

      let normalLength = sqrt(normalX * normalX + normalY * normalY);
      if (normalLength > 0) {
        normalX /= normalLength; // 單位化法線向量
        normalY /= normalLength;
      } else {
        normalX = 0; // 如果切線為零向量，則預設為垂直法線
        normalY = 1;
      }
      obstacleNormals.push(createVector(normalX, normalY));

      currentObstacles.push({
        type: obsConfig.type,
        size: obsConfig.size,
        speed: obsConfig.speed,
        movementRange: obsConfig.movementRange, // 障礙物移動的範圍
        offsetDirection: obsConfig.offsetDirection || 1, // 沿法線方向的偏移方向 (1 或 -1)
        initialX: initialX, // 障礙物在軌道上的基礎 X 座標
        initialY: initialY, // 障礙物在軌道上的基礎 Y 座標
        currentX: initialX, // 障礙物當前 X 座標 (會動態更新)
        currentY: initialY, // 障礙物當前 Y 座標 (會動態更新)
        phase: random(TWO_PI) // 隨機相位，讓障礙物不會同步移動
      });
    }
  }

  // 重置 randomSeed 為預設值 (基於時間)，以確保其他隨機操作（如粒子效果）每幀都是隨機的
  randomSeed(millis());
}

function updateAndDrawObstacles() {
  if (gameState !== 'PLAYING') return; // 只在遊戲進行中更新和繪製障礙物

  for (let i = 0; i < currentObstacles.length; i++) {
    let obs = currentObstacles[i];
    let normalVec = obstacleNormals[i]; // 獲取預先計算的法線向量

    // 計算當前位置基於移動模式
    let oscillation = sin(frameCount * obs.speed + obs.phase) * obs.movementRange;

    // 沿著法線方向應用擺動
    obs.currentX = obs.initialX + normalVec.x * oscillation * obs.offsetDirection;
    obs.currentY = obs.initialY + normalVec.y * oscillation * obs.offsetDirection;

    // 繪製障礙物
    fill(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]); // 障礙物顏色
    stroke(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]); // 金色邊框
    strokeWeight(2);

    // 繪製鬼的圖示
    drawGhost(obs.currentX, obs.currentY, obs.size);
    
    // 為了碰撞偵測的簡化，我們仍然使用圓形邊界
    // 如果需要更精確的碰撞，需要為鬼的形狀定義更複雜的碰撞區域
  }
}

function drawTrack() {
  noFill();

  // 繪製路徑記憶軌跡 (Lit Path Memory)
  // 這些粒子會隨著玩家的路徑亮起，並漸漸消散
  for (let i = litPathParticles.length - 1; i >= 0; i--) {
    let p = litPathParticles[i];
    noStroke();
    // 使用 LUX_GOLD 顏色，並根據 alpha 值實現消散效果
    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], p.alpha);
    circle(p.x, p.y, p.size);
  }

  // 確保在繪製軌道之前重置 fill 顏色，避免影響軌道線條
  noFill();
  
  // 1. 最外層大範圍光暈 (深紫)
  stroke(LUX_TRACK_OUTER[0], LUX_TRACK_OUTER[1], LUX_TRACK_OUTER[2], 50);
  strokeWeight(levels[currentLevel].trackWidth + 15);
  drawCurve();

  // 2. 軌道霓虹邊緣 (淺紫)
  stroke(LUX_TRACK_EDGE[0], LUX_TRACK_EDGE[1], LUX_TRACK_EDGE[2], 180);
  strokeWeight(levels[currentLevel].trackWidth + 2);
  drawCurve();

  // 3. 軌道深色主體 (極深藍/黑)
  stroke(LUX_DARK_BG[0] * 0.5, LUX_DARK_BG[1] * 0.5, LUX_DARK_BG[2] * 0.5); // 深化 Dusty Mauve
  strokeWeight(levels[currentLevel].trackWidth);
  drawCurve();

  // 4. 核心電流線 (Powder Petal，帶有抖動感)
  stroke(LUX_TRACK_CORE[0], LUX_TRACK_CORE[1], LUX_TRACK_CORE[2], 200);
  strokeWeight(4);
  if (gameState === 'PLAYING' && frameCount % 3 === 0) {
    strokeWeight(random(2, 6));
  }
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
  // 顯示生命值 (左上角，用紅色愛心表示)
  if (gameState === 'PLAYING' || gameState === 'LEVEL_FAILED' || gameState === 'LEVEL_CLEARED') {
    let heartSize = 25;
    let heartSpacing = 5;
    let startX = 20;
    let startY = 20;
    
    fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2]); // Cherry Blossom 用於愛心
    
    // 計算跳動的縮放因子，在 0.95 到 1.05 之間變化
    let pulseScale = map(sin(frameCount * 0.1), -1, 1, 0.95, 1.05);

    for (let i = 0; i < lives; i++) {
      drawHeart(startX + i * (heartSize + heartSpacing) + heartSize / 2, startY + heartSize / 2, heartSize, pulseScale);
    }

    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]); // Alabaster Grey 用於文字
    textSize(16);
    textAlign(LEFT, TOP);
    text(`x ${lives}`, startX + MAX_LIVES * (heartSize + heartSpacing) + 5, startY + heartSize / 4); // 愛心旁的文字
  }

  // 顯示當前關卡數 (右上角)
  if (gameState !== 'WAITING') { // 等待畫面不顯示關卡進度，由難度選擇取代
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]); // Alabaster Grey
    textSize(16);
    textAlign(RIGHT, TOP);
    text(`關卡：${currentLevel + 1} / ${levels.length}`, width - 20, 20);
  }

  if (gameState === 'WAITING') {
    // 1. 遊戲標題

    // 閃爍效果：根據 frameCount 改變顏色
    let titleColorBrightness = map(sin(frameCount * 0.1), -1, 1, 180, 255); // 在 180 到 255 之間變化
    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], titleColorBrightness); // Powder Petal，亮度變化

    textSize(64);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("電流急急棒挑戰", width / 2, height / 2 - 150);

    // 2. 遊戲說明
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]); // Alabaster Grey
    textSize(22); // 稍微大一點
    textStyle(NORMAL);
    text("引導光點穿梭路徑！", width / 2, height / 2 - 80); // 調整 Y 軸位置
    text("小心別碰到邊緣，否則會觸電！", width / 2, height / 2 - 45); // 增加行距

    // 3. 難度選擇按鈕
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonSpacing = 18; // 增加按鈕間距
    // 計算所有按鈕的總高度，以便將它們置於介紹文字下方
    let totalButtonsHeight = levels.length * buttonHeight + (levels.length - 1) * buttonSpacing;
    // 設定第一個按鈕的起始 Y 軸位置，與介紹文字保持足夠的間距，並將按鈕組置中
    let buttonsTopY = height / 2 - 45 + 50; // 距離最後一行介紹文字 50 像素的間距
    
    for (let i = 0; i < levels.length; i++) {
      let btnX = width / 2 - buttonWidth / 2;
      let btnY = buttonsTopY + i * (buttonHeight + buttonSpacing);

      let isHovered = mouseX > btnX && mouseX < btnX + buttonWidth &&
                      mouseY > btnY && mouseY < btnY + buttonHeight;

      fill(isHovered ? LUX_LIGHT_BG[0] : LUX_MID_BG[0],
           isHovered ? LUX_LIGHT_BG[1] : LUX_MID_BG[1],
           isHovered ? LUX_LIGHT_BG[2] : LUX_MID_BG[2], 220); // 根據是否懸停改變顏色
      stroke(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 200);
      strokeWeight(3); // 增加邊框粗細
      rect(btnX, btnY, buttonWidth, buttonHeight, 15);

      fill(LUX_DARK_BG[0], LUX_DARK_BG[1], LUX_DARK_BG[2]); // Dusty Mauve 文字，確保對比度
      textSize(24);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text(`關卡 ${i + 1} - ${levels[i].difficulty}`, btnX + buttonWidth / 2, btnY + buttonHeight / 2);
    }

  } else if (gameState === 'PLAYING' || gameState === 'LEVEL_FAILED' || gameState === 'LEVEL_CLEARED') {
    // 遊戲進行中、關卡失敗或關卡通過時，顯示終點
    // 繪製終點區域 (紅色圓圈)
    textAlign(CENTER, CENTER);
    let endP = points[points.length - 1];
    let pulse = 40 + sin(frameCount * 0.1) * 10;
    fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2], 150); // Cherry Blossom，半透明
    noStroke();
    circle(endP.x, endP.y, pulse + 10); // 外圈發光
    fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2]); // Cherry Blossom
    circle(endP.x, endP.y, 40);
    
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]); // Alabaster Grey
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(12); // 終點文字大小
    text("GOAL", endP.x, endP.y);
    textStyle(NORMAL);
  }

  // 遊戲結束/關卡通過/遊戲完成的覆蓋畫面
  if (gameState === 'LEVEL_FAILED' || gameState === 'GAME_OVER' || gameState === 'LEVEL_CLEARED' || gameState === 'GAME_COMPLETE') {
    fill(0, 0, 0, 180); // 更深的半透明黑色覆蓋
    rect(0, 0, width, height);

    push(); // 隔離文字樣式更改
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    if (gameState === 'LEVEL_FAILED') {
      drawingContext.shadowBlur = 20; // 發光模糊半徑
      drawingContext.shadowColor = color(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2], 150); // 紅色發光
      textSize(60); // 更大的文字
      fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2]); // Cherry Blossom
      text("觸電！生命 -1", width / 2, height / 2 - 80); // 調整 Y 軸位置
      
      drawingContext.shadowBlur = 0; // 重置陰影，避免影響次要文字
      fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]);
      textSize(32); // 更大的次要文字
      text(`剩餘生命：${lives}`, width / 2, height / 2 - 20); // 調整 Y 軸位置
      textSize(28); // 更大的提示文字
      text("點擊任意處重新挑戰", width / 2, height / 2 + 50); // 調整 Y 軸位置
    } else if (gameState === 'GAME_OVER') {
      drawingContext.shadowBlur = 25; // 更強的發光
      drawingContext.shadowColor = color(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2], 180); // 更強的紅色發光
      textSize(72); // 遊戲結束文字更大
      fill(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2]); // Cherry Blossom
      text("遊戲結束！", width / 2, height / 2 - 50); // 調整 Y 軸位置
      
      drawingContext.shadowBlur = 0; // 重置陰影
      fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]);
      textSize(28); // 更大的提示文字
      text("點擊任意處返回選單", width / 2, height / 2 + 30); // 調整 Y 軸位置
    } else if (gameState === 'LEVEL_CLEARED') {
      drawingContext.shadowBlur = 20; // 發光模糊半徑
      drawingContext.shadowColor = color(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 150); // 金色發光
      textSize(60); // 更大的文字
      fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]); // Powder Petal
      text("關卡通過！", width / 2, height / 2 - 50); // 調整 Y 軸位置
      
      drawingContext.shadowBlur = 0; // 重置陰影
      fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]);
      textSize(28); // 更大的提示文字
      text("點擊任意處進入下一關", width / 2, height / 2 + 30); // 調整 Y 軸位置
    } else if (gameState === 'GAME_COMPLETE') {
      drawingContext.shadowBlur = 25; // 更強的發光
      drawingContext.shadowColor = color(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 180); // 更強的金色發光
      textSize(72); // 遊戲完成文字更大
      fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]); // Powder Petal
      text("恭喜！遊戲完成！", width / 2, height / 2 - 50); // 調整 Y 軸位置
      
      drawingContext.shadowBlur = 0; // 重置陰影
      fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2]);
      textSize(28); // 更大的提示文字
      text("點擊任意處返回選單", width / 2, height / 2 + 30); // 調整 Y 軸位置
    }
    pop(); // 恢復之前的樣式
  }
}

function drawWand() {
  // 自訂游標永遠跟隨滑鼠位置
  let wandX = mouseX;
  let wandY = mouseY;

  // 根據 nearCollision 狀態調整光點顏色和大小 (更新全局變數)
  wandColor = color(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]);
  wandSize = 15;
  if (nearCollision) {
    // 接近碰撞時，顏色變為紅色並脈衝
    wandColor = lerpColor(wandColor, color(LUX_ACCENT_RED[0], LUX_ACCENT_RED[1], LUX_ACCENT_RED[2]), 0.5 + sin(frameCount * 0.2) * 0.5);
    wandSize = 15 + sin(frameCount * 0.2) * 5; // 大小脈衝
  }

  if (!isMouseAttached) {
    // 繪製起點目標球，讓玩家知道要將滑鼠移到哪裡 (改為金色)
    let startPointX = points[0].x;
    let startPointY = points[0].y;

    // 起點目標球的呼吸燈效果
    let pulse = 10 + sin(frameCount * 0.1) * 5;
    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2], 100); // Powder Petal 光暈
    noStroke();
    circle(startPointX, startPointY, 30 + pulse);

    fill(LUX_GOLD[0], LUX_GOLD[1], LUX_GOLD[2]); // 實心金色球
    circle(startPointX, startPointY, 20);

    // 檢查滑鼠是否已碰到起點目標球
    if (dist(mouseX, mouseY, startPointX, startPointY) < 20) { // 稍微增加感應範圍
      isMouseAttached = true;
    }
    
    // 提示文字
    fill(LUX_SILVER[0], LUX_SILVER[1], LUX_SILVER[2], 150 + sin(frameCount * 0.1) * 100); // Alabaster Grey 文字
    noStroke();
    textAlign(CENTER, CENTER); // 確保文字置中
    text("將滑鼠移到此處開始！", startPointX, startPointY - 35);
  }

  // 繪製玩家的自訂游標 (光棒) (改為金色)
  // 外部能量光暈
    fill(red(wandColor), green(wandColor), blue(wandColor), 50); // 使用動態顏色
    circle(wandX, wandY, 25);

  // 當滑鼠移動時留下粒子 (只有在 attached 狀態下才產生粒子)
  if (isMouseAttached && (mouseX !== pmouseX || mouseY !== pmouseY)) {
    particles.push({
      x: wandX, y: wandY,
      vx: random(-0.8, 0.8), vy: random(-0.8, 0.8),
      // 粒子顏色與光點顏色一致
      color: color(red(wandColor), green(wandColor), blue(wandColor)),
      alpha: 150, size: random(2, 6)
    });
  }
  
  // 核心游標點
  fill(wandColor); // 使用動態顏色
  noStroke();
  circle(wandX, wandY, wandSize); // 使用動態大小
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 5; // 粒子逐漸變淡
    
    noStroke();
    fill(p.color[0], p.color[1], p.color[2], p.alpha); // 使用粒子的顏色
    circle(p.x, p.y, p.size);
    
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function handleGameLogic() {
  if (gameState === 'PLAYING' && isMouseAttached) {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      if (collisionBuffer) {
        let c = collisionBuffer.get(mouseX, mouseY);
        if (c[0] < 100) { // 如果是深色 (0-99)，判定為碰撞
          failGame();
          nearCollision = false; // 碰撞後重置
        } else if (c[0] > 100 && c[0] < 200) { // 如果是中等灰色 (100-199)，判定為接近碰撞
          nearCollision = true;
        } else { // 如果是白色 (200-255)，判定為安全
          nearCollision = false;
        }
      }
    } else {
      failGame();
      nearCollision = false; // 碰撞後重置
    }

    // 檢查障礙物碰撞
    for (let obs of currentObstacles) {
      if (obs.type === 'circle') {
        // 障礙物半徑 + 光點半徑
        if (dist(mouseX, mouseY, obs.currentX, obs.currentY) < obs.size / 2 + wandSize / 2) {
          failGame();
          nearCollision = false;
          return; // 發生碰撞後立即退出，避免多次觸發
        }
      }
      // 如果有其他形狀的障礙物，可以在這裡添加對應的碰撞邏輯
    }

    // 檢查是否到達終點圓圈 (距離小於半徑)
    if (points.length > 0) {
      let endP = points[points.length - 1];
      if (dist(mouseX, mouseY, endP.x, endP.y) < 20) {
        if (currentLevel < levels.length - 1) { // 如果不是最後一關
          gameState = 'LEVEL_CLEARED'; // 關卡通過
          currentLevel++; // 準備進入下一關
          // generateTrack() 會在 mousePressed 中被呼叫
        } else { // 所有關卡都已完成
          gameState = 'GAME_COMPLETE'; // 遊戲完成
          currentLevel = 0; // 重置關卡索引
          // generateTrack() 會在 mousePressed 中被呼叫
        }
        osc.amp(0, 0.1);
      }
    }
  }
}

function failGame() {
  if (gameState === 'LEVEL_FAILED' || gameState === 'GAME_OVER') return; // 避免重複觸發

  lives--; // 生命值減少

  if (lives <= 0) {
    gameState = 'GAME_OVER'; // 生命值歸零，遊戲結束
  } else {
    gameState = 'LEVEL_FAILED'; // 關卡失敗，但還有生命
  }

  osc.freq(50);
  osc.amp(0.5, 0.01);
  setTimeout(() => {
    osc.amp(0, 0.5);
  }, 200);
  isMouseAttached = false; // 失敗後解除滑鼠附著
}

function mousePressed() {
  userStartAudio();

  if (gameState === 'WAITING') {
    // 檢查是否點擊了難度選擇按鈕
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonSpacing = 15;
    let totalButtonHeight = levels.length * (buttonHeight + buttonSpacing) - buttonSpacing;
    let startY = height / 2 + 50 - totalButtonHeight / 2;

    for (let i = 0; i < levels.length; i++) {
      let btnX = width / 2 - buttonWidth / 2;
      let btnY = startY + i * (buttonHeight + buttonSpacing);
      if (mouseX > btnX && mouseX < btnX + buttonWidth &&
          mouseY > btnY && mouseY < btnY + buttonHeight) {
        currentLevel = i; // 設定選擇的關卡
        lives = MAX_LIVES; // 重置生命值
        gameState = 'PLAYING';
        isMouseAttached = false; // 重置接球狀態
        generateTrack(); // 生成選定關卡的軌道
        return; // 處理完畢，退出函數
      }
    }
  } else if (gameState === 'LEVEL_FAILED') {
    gameState = 'PLAYING'; // 重新挑戰當前關卡
    isMouseAttached = false;
    generateTrack(); // 重新生成當前關卡的軌道
  } else if (gameState === 'GAME_OVER' || gameState === 'GAME_COMPLETE') {
    gameState = 'WAITING'; // 返回起始畫面
    osc.amp(0);
    particles = []; // 重置時清除粒子
    resetBackgroundRandomness(); // 返回選單時重置背景隨機性
    generateTrack(); // 生成第一關的軌道 (為選單準備)
  } else if (gameState === 'LEVEL_CLEARED') {
    gameState = 'PLAYING'; // 進入下一關
    lives = MAX_LIVES; // 重置生命值
    isMouseAttached = false;
    generateTrack(); // 生成下一關的軌道 (currentLevel 已在 handleGameLogic 中遞增)
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (collisionBuffer) {
    collisionBuffer.resize(windowWidth, windowHeight);
  }
  resetBackgroundRandomness(); // 視窗大小改變時重置背景隨機性
  generateTrack();
}
