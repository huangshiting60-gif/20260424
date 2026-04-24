let cols;
let rows;
let gridOffsetX = 0;
let gridOffsetY = 0;
let cellSize = 60;
let uiOffset = 80;
let grid = [];
let targetColor;
let score = 0;
let timeRemaining = 60 * 30; // 初始時間 30 秒 (以 60 FPS 計算)
let particles = []; // 儲存煙火粒子的陣列
let combo = 0;
let comboTimer = 0;
let maxComboTime = 60 * 3; // 保持連擊的時間限制 (預設 3 秒)
let highScore = 0;
let gameState = 'START'; // 遊戲狀態：'START', 'PLAYING', 'GAMEOVER'
let isNewRecord = false;
let stars = []; // 儲存背景星塵的陣列
const numStars = 200; // 星塵的數量
let shootingStars = []; // 儲存流星的陣列
let lives = 3; // 玩家生命值
let isFeverMode = false;
let feverTimer = 0;
let feverDuration = 60 * 5; // 狂熱模式 5 秒
let shakeTime = 0; // 畫面震動計時器
let floatingTexts = []; // 浮動文字特效陣列
let flashTime = 0; // 白光閃爍特效計時器
let bgMusic; // 儲存背景音樂物件
let correctSound; // 答對音效
let wrongSound; // 答錯音效
let scanSound; // 雷達掃描音效
let lastHoverCol = -1; // 記錄上一次游標停留的格子 X
let lastHoverRow = -1; // 記錄上一次游標停留的格子 Y
let currentDifficulty = 'NORMAL'; // 當前選擇的難度: 'EASY', 'NORMAL', 'HARD'

function preload() {
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  updateGridSize();
  resetGame();
  gameState = 'START'; // 強制回到開始畫面

  // 改成在 setup 中進行非同步背景載入，找不到檔案也不會卡住畫面
  soundFormats('mp3', 'ogg');
  // 加入錯誤處理，如果找不到檔案會在開發者控制台顯示警告，但不影響遊戲運行
  bgMusic = loadSound('space-bgm.mp3', () => {}, () => console.warn('找不到 space-bgm.mp3')); 
  correctSound = loadSound('correct.mp3', () => {}, () => console.warn('找不到 correct.mp3'));
  wrongSound = loadSound('wrong.mp3', () => {}, () => console.warn('找不到 wrong.mp3'));
  scanSound = loadSound('scan.mp3', () => {}, () => console.warn('找不到 scan.mp3'));

  // 在 setup 階段初始化星塵 (移至這裡以確保能抓到正確的螢幕寬高)
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: random(width), y: random(height), 
      size: random(0.5, 3.5), // 更豐富的大小層次
      speed: random(0.1, 1.2), // 漂浮速度差異化
      blinkSpeed: random(0.01, 0.08), // 隨機的閃爍頻率
      blinkOffset: random(TWO_PI) // 隨機的閃爍時間點
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateGridSize();
  resetLevel();
}

function updateGridSize() {
  cols = floor(width / cellSize);
  rows = floor((height - uiOffset) / cellSize);
  gridOffsetX = (width - cols * cellSize) / 2;
  gridOffsetY = uiOffset + (height - uiOffset - rows * cellSize) / 2;
}

function resetGame() {
  score = 0;
  timeRemaining = 60 * 30;
  particles = []; // 重新開始時清空粒子
  floatingTexts = []; // 清空浮動文字
  combo = 0;
  comboTimer = 0;
  gameState = 'PLAYING';
  isNewRecord = false;
  lives = 3; // 重置生命值
  isFeverMode = false;
  feverTimer = 0;
  flashTime = 0;
  if (bgMusic && bgMusic.isLoaded()) {
    bgMusic.rate(1.0); // 重置音樂速度
  }
  applyDifficultySettings(); // 應用難度設定
  resetLevel(); // 重設關卡
}

function applyDifficultySettings() {
  // 統一所有難度的基礎時間為 30 秒
  timeRemaining = 60 * 30; 
}

function resetLevel() {
  grid = [];
  let targetCol = floor(random(cols));
  let targetRow = floor(random(rows));

  // 隨機產生一個鮮豔的目標顏色
  colorMode(HSB, 360, 100, 100);
  targetColor = color(random(360), random(60, 100), random(70, 100));
  colorMode(RGB, 255); // 切換回 RGB 方便計算色彩距離

  // 動態難度：調整難度曲線，讓干擾色不會與目標色太過相似
  let spread;
  let trickChance;

  switch (currentDifficulty) {
    case 'EASY':
      spread = max(70, 150 - score * 5); // 顏色差異更大，更明顯
      trickChance = min(0.3, 0.05 + score * 0.02); // 陷阱色機率更低
      break;
    case 'NORMAL':
      spread = max(50, 100 - score * 3); // 預設值
      trickChance = min(0.5, 0.1 + score * 0.03); // 預設值
      break;
    case 'HARD':
      spread = max(30, 80 - score * 2); // 顏色差異更小，更難辨識
      trickChance = min(0.7, 0.2 + score * 0.04); // 陷阱色機率更高
      break;
  }

  for (let i = 0; i < cols; i++) {
    grid[i] = [];
    for (let j = 0; j < rows; j++) {
      if (i === targetCol && j === targetRow) {
        grid[i][j] = {
          c: targetColor,
          isTarget: true,
          state: 'normal'
        };
      } else {
        let c;
        let d;
        // 產生干擾色，並確保它不會和目標色完全一模一樣
        do {
          if (random() < trickChance) {
            // 產生極為相似的混淆色
            c = color(
              constrain(red(targetColor) + random(-spread, spread), 0, 255),
              constrain(green(targetColor) + random(-spread, spread), 0, 255),
              constrain(blue(targetColor) + random(-spread, spread), 0, 255)
            );
          } else {
            // 完全隨機的顏色
            c = color(random(255), random(255), random(255));
          }
          // 計算在 RGB 空間的距離
          d = dist(red(c), green(c), blue(c), red(targetColor), green(targetColor), blue(targetColor));
        } while (d < 40); // 確保干擾色與答案保持一定的肉眼可辨識差異 (原本為 5，提升到 40)
        
        grid[i][j] = {
          c: c,
          isTarget: false,
          state: 'normal'
        };
      }
    }
  }
}

function draw() {
  push(); // 全局震動變換開始
  if (shakeTime > 0) {
    translate(random(-8, 8), random(-8, 8));
    shakeTime--;
  }

  if (isFeverMode) {
    // 狂熱模式：粉嫩色系的夢幻閃爍背景
    colorMode(HSB, 360, 100, 100);
    let partyHue = 330 + (frameCount * 5) % 40; // 鎖定在粉紅至蜜桃色系
    let partyBrightness = 40 + 10 * sin(frameCount * 0.8); // 柔和的亮度脈動
    background(partyHue, 60, partyBrightness);
    colorMode(RGB, 255); // 畫完背景後切回 RGB
  } else {
    background(50, 40, 45); // 柔和深邃的紫粉灰底色，襯托鮮豔目標色
  }
  drawStars(); // 在最底層繪製星塵

  if (gameState === 'START') {
    cursor(ARROW);
    drawStartScreen();
    pop(); // 全局震動變換結束
    drawCRT(); // 疊加 CRT 螢幕特效
    return;
  }

  if (gameState === 'GAMEOVER') {
    cursor(ARROW);
    drawGameOver();
    updateAndDrawParticles(); // 即使遊戲結束也要繼續更新並繪製煙火
    updateAndDrawFloatingTexts(); // 顯示殘留的浮動文字
    pop(); // 全局震動變換結束
    return;
  }

  if (timeRemaining <= 0 || lives <= 0) {
    gameState = 'GAMEOVER';
    if (score > highScore && score > 0) {
      highScore = score;
      isNewRecord = true;
      spawnExplosion(width / 2, height / 2, color(255, 215, 0), 5); // 觸發中央大煙火
    } else {
      isNewRecord = false;
    }
    cursor(ARROW);
    drawGameOver();
    updateAndDrawParticles();
    updateAndDrawFloatingTexts();
    pop(); // 全局震動變換結束
    return;
  }

  if (isFeverMode) {
    feverTimer--;
    if (feverTimer <= 0) {
      isFeverMode = false; // 時間到，解除狂熱模式
      flashTime = 30; // 觸發白光閃爍特效 (30 幀)
      if (bgMusic && bgMusic.isLoaded()) {
        bgMusic.rate(1.0); // 恢復正常音樂速度
      }
    }
  } else {
    timeRemaining--;
  }
  
  // 更新連擊倒數計時
  if (combo > 0) {
    comboTimer--;
    if (comboTimer <= 0) {
      combo = 0; // 超時，連擊中斷
    }
  }

  drawUI();

  push();
  translate(gridOffsetX, gridOffsetY);
  drawGrid();
  
  // 當滑鼠在網格區內時，隱藏游標並繪製專屬的雷達探測器
  let mC = floor((mouseX - gridOffsetX) / cellSize);
  let mR = floor((mouseY - gridOffsetY) / cellSize);

  if (mC >= 0 && mC < cols && mR >= 0 && mR < rows) {
    noCursor();
    drawRadarReaction();
  } else {
    cursor(ARROW);
  }
  pop();

  updateAndDrawParticles(); // 在所有 UI 與網格之上畫出粒子特效
  updateAndDrawFloatingTexts(); // 浮動文字特效

  pop(); // 全局震動變換結束

  // --- 新增：狂熱模式結束的白光閃爍特效 ---
  if (flashTime > 0) {
    push();
    noStroke();
    fill(255, 255, 255, map(flashTime, 0, 30, 0, 255)); // 隨時間淡出
    rect(0, 0, width, height);
    pop();
    flashTime--;
  }
}

function drawGrid() {
  if (isFeverMode) {
    // 狂熱模式下，網格線變成閃爍的粉色系
    colorMode(HSB, 360, 100, 100);
    stroke(330 + (frameCount * 15) % 40, 80, 100); 
    strokeWeight(2);
    colorMode(RGB, 255);
  } else {
    // 柔和的紫藕色網格線 (--dusty-mauve)
    stroke(157, 129, 137, 60); 
    strokeWeight(1);
  }
  
  for (let i = 0; i <= cols; i++) {
    line(i * cellSize, 0, i * cellSize, rows * cellSize);
  }
  for (let j = 0; j <= rows; j++) {
    line(0, j * cellSize, cols * cellSize, j * cellSize);
  }

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let cell = grid[i][j];
      let cx = i * cellSize + cellSize / 2;
      let cy = j * cellSize + cellSize / 2;

      if (cell.state === 'wrong') {
        fill(30);
        stroke(50);
        strokeWeight(1);
        circle(cx, cy, cellSize - 10);
        
        // 畫一個 X 表示點錯了
        stroke(80);
        strokeWeight(2);
        let offset = 10;
        line(cx - offset, cy - offset, cx + offset, cy + offset);
        line(cx + offset, cy - offset, cx - offset, cy + offset);
      } else {
        // 核心機制：計算滑鼠與格子的距離 (探測燈範圍)
        let d = dist(mouseX - gridOffsetX, mouseY - gridOffsetY, cx, cy);
        let lightRadius = cellSize * 4.5; // 加大探照燈範圍

        // 計算色彩相似度 (0 到 1)
        let cD = dist(
          red(cell.c), green(cell.c), blue(cell.c),
          red(targetColor), green(targetColor), blue(targetColor)
        );
        let similarity = max(0, 1 - (cD / 250));

        // 計算空間接近度，即使在燈光範圍外也保留 10% 的微弱亮度，讓玩家能隱約看見全局
        let prox = max(0.1, 1 - (d / lightRadius));
        prox = pow(prox, 1.5); // 讓光暈邊緣的亮度衰減更柔和自然

        // 「越接近顏色時...圓形變越大」：目標色會變成大圓，無關色是小圓
        let baseSize = cellSize * 0.2; // 基礎微小顆粒稍微加大
        let maxSize = cellSize * 0.85;  // 滿格大圓
        
        // 相似度越高，這個圓形能變成的最大極限尺寸就越大
        let targetSize = lerp(baseSize, maxSize, pow(similarity, 2));
        
        // 結合滑鼠靠近的比例，產生動態浮現/放大的效果
        let currentSize = targetSize * prox;

        noStroke();
        // 顏色亮度與透明度隨著滑鼠靠近而變亮
        fill(red(cell.c), green(cell.c), blue(cell.c), prox * 255);
        circle(cx, cy, currentSize);

        // 如果是極度接近的顏色，且在燈光範圍內，會再額外疊加一層發光光暈
        if (similarity > 0.8 && d < lightRadius) {
          if (cell.isTarget) {
            // 目標顏色專屬的超強烈脈衝光暈
            let pulse = 1 + 0.15 * sin(frameCount * 0.15); // 呼吸縮放效果
            
            // --- 修改：隨著滑鼠越靠近，目標答案周圍的圓形會變得越大 ---
            // prox (接近程度) 越高，放大倍數越大，最大可達 4.5 倍
            let distanceExpansion = lerp(1, 4.5, pow(prox, 2)); 
            
            // 內層強烈光暈
            fill(red(cell.c), green(cell.c), blue(cell.c), prox * 180);
            circle(cx, cy, currentSize * 1.6 * pulse * distanceExpansion * 0.6);
            
            // 外層超大擴散光暈 (會隨著靠近變得超級大)
            fill(red(cell.c), green(cell.c), blue(cell.c), prox * 40);
            circle(cx, cy, currentSize * 2.5 * pulse * distanceExpansion);
            
            // 擴散的雷達波紋光環
            noFill();
            stroke(244, 172, 183, prox * 150); // --cherry-blossom 櫻花粉
            strokeWeight(lerp(1, 4, prox));
            let ripple = (frameCount * 2) % (cellSize * 1.5);
            circle(cx, cy, currentSize * 2.5 * pulse * distanceExpansion + ripple);
            
            // 核心高光 (讓目標看起來像在發亮)
            noStroke();
            fill(255, prox * 150);
            circle(cx, cy, currentSize * 0.4);
          } else {
            // 普通干擾色的微弱光暈
            fill(red(cell.c), green(cell.c), blue(cell.c), prox * 60 * similarity);
            circle(cx, cy, currentSize * 1.3);
          }
        }
      }
    }
  }
}

function drawRadarReaction() {
  let mC = floor((mouseX - gridOffsetX) / cellSize);
  let mR = floor((mouseY - gridOffsetY) / cellSize);

  if (mC >= 0 && mC < cols && mR >= 0 && mR < rows) {
    let cell = grid[mC][mR];
    let cx = mC * cellSize + cellSize / 2;
    let cy = mR * cellSize + cellSize / 2;

    if (cell.state === 'wrong') {
      // 如果在錯誤格子上，顯示失效游標
      stroke(255, 100);
      strokeWeight(2);
      noFill();
      circle(cx, cy, 20);
      line(cx - 15, cy, cx + 15, cy);
      line(cx, cy - 15, cx, cy + 15);
      return;
    }

    // --- 先找出目標的實際座標 ---
    let targetCx = cx, targetCy = cy;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (grid[i][j].isTarget) {
          targetCx = i * cellSize + cellSize / 2;
          targetCy = j * cellSize + cellSize / 2;
        }
      }
    }
    
    // 計算滑鼠當前與目標的空間距離
    let distToTarget = dist(cx, cy, targetCx, targetCy);
    let maxDist = dist(0, 0, cols * cellSize, rows * cellSize); // 網格對角線最遠距離
    let spatialProximity = max(0, 1 - (distToTarget / maxDist));
    let spatialReaction = pow(spatialProximity, 3); // 取三次方讓接近時的放大效果更顯著

    // 核心邏輯：「越接近目標色彩，會有不同的顏色反應」
    let cD = dist(
      red(cell.c), green(cell.c), blue(cell.c),
      red(targetColor), green(targetColor), blue(targetColor)
    );

    // 將顏色距離映射為 0~1 的相似度 (250以上視為完全不相似)
    let similarity = max(0, 1 - (cD / 250)); 
    // 取三次方，讓「極度相似」的反應差距更劇烈
    let reaction = pow(similarity, 3); 

    // --- 新增：雷達掃描音效觸發 ---
    // 如果游標移動到新的格子上，就播放一次短促的掃描音效
    if (mC !== lastHoverCol || mR !== lastHoverRow) {
      if (scanSound && scanSound.isLoaded()) {
        // 音調與音量同時受到「空間距離」與「色彩相似度」的影響，給予更準確的回饋
        let combinedReaction = max(reaction, spatialReaction);
        scanSound.setVolume(lerp(0.05, 0.4, combinedReaction));
        scanSound.rate(lerp(1.0, 2.0, combinedReaction));
        scanSound.play();
      }
      lastHoverCol = mC;
      lastHoverRow = mR;
    }

    // 動態反應：脈衝速度、大小與顏色
    let pulseSpeed = lerp(0.05, 0.4, reaction);
    // 修改：讓雷達圓形大小改為由「與答案的空間距離」控制，離答案越近圓形越大！
    let pulseSize = lerp(cellSize * 0.5, cellSize * 2.5, spatialReaction);
    let currentRadius = pulseSize + pulseSize * 0.2 * sin(frameCount * pulseSpeed);

    // 用柔和的青灰 (--alabaster-grey) 過渡到 櫻花粉 (--cherry-blossom)
    let pulseColor = lerpColor(color(216, 226, 220, 180), color(244, 172, 183, 255), reaction);

    noFill();
    stroke(pulseColor);
    strokeWeight(lerp(2, 6, reaction));
    circle(cx, cy, currentRadius);

    // 探測括號動畫
    let bracketDist = lerp(cellSize / 2 - 2, cellSize / 2 + 6, reaction);
    let bracketLen = lerp(8, 15, reaction);
    
    strokeWeight(3);
    stroke(255, lerp(150, 255, reaction));
    
    // 繪製四角對準框
    line(cx - bracketDist, cy - bracketDist, cx - bracketDist + bracketLen, cy - bracketDist);
    line(cx - bracketDist, cy - bracketDist, cx - bracketDist, cy - bracketDist + bracketLen);
    line(cx + bracketDist, cy - bracketDist, cx + bracketDist - bracketLen, cy - bracketDist);
    line(cx + bracketDist, cy - bracketDist, cx + bracketDist, cy - bracketDist + bracketLen);
    line(cx - bracketDist, cy + bracketDist, cx - bracketDist + bracketLen, cy + bracketDist);
    line(cx - bracketDist, cy + bracketDist, cx - bracketDist, cy + bracketDist - bracketLen);
    line(cx + bracketDist, cy + bracketDist, cx + bracketDist - bracketLen, cy + bracketDist);
    line(cx + bracketDist, cy + bracketDist, cx + bracketDist, cy + bracketDist - bracketLen);
    
    // 中心準心點
    fill(pulseColor);
    noStroke();
    circle(cx, cy, lerp(4, 10, reaction));

    // --- 新增：雷達尋跡指南針 ---
    // 距離越遠，指引越明顯；如果已經很靠近了就隱藏，讓玩家自己做最後確認
    if (distToTarget > cellSize) {
      let angleToTarget = atan2(targetCy - cy, targetCx - cx);
      
      push();
      translate(cx, cy);
      rotate(angleToTarget);
      
      let arrowAlpha = map(distToTarget, cellSize, width / 2, 50, 200, true);
      fill(red(pulseColor), green(pulseColor), blue(pulseColor), arrowAlpha);
      noStroke();
      
      let arrowDist = currentRadius + 12; // 箭頭畫在雷達圈外圍
      triangle(arrowDist, -5, arrowDist, 5, arrowDist + 10, 0);
      pop();
    }
  }
}

function drawUI() {
  fill(157, 129, 137, 150); // --dusty-mauve 帶透明度
  noStroke();
  rect(0, 0, width, uiOffset);

  // 顯示分數
  fill(255);
  textSize(22);
  textAlign(LEFT, CENTER);
  text("分數: " + score, 20, 25);

  // 顯示最高分
  fill('#ffe5d9'); // --powder-petal
  textSize(16);
  text("最高: " + highScore, 120, 26);

  // 顯示連擊資訊與倒數條
  if (combo > 1) {
    push();
    // 動態脈衝縮放效果
    let pulse = 1 + 0.1 * sin(frameCount * 0.4);
    translate(20, 50);
    scale(pulse);
    fill('#f4acb7'); // --cherry-blossom
    textSize(16);
    text(combo + " 連擊!", 0, 0);
    pop();
    
    // 連擊倒數進度條
    fill(244, 172, 183, 80); // --cherry-blossom (透明)
    rect(20, 65, 80, 4, 2);
    fill('#f4acb7');
    rect(20, 65, 80 * (comboTimer / maxComboTime), 4, 2);
  }

  // 顯示時間
  textAlign(RIGHT, CENTER);
  if (isFeverMode) {
    let fSeconds = ceil(feverTimer / 60);
    fill('#f4acb7'); // --cherry-blossom
    text("狂熱時間: " + fSeconds + "s", width - 20, 25);
  } else {
    let seconds = ceil(timeRemaining / 60);
    if (seconds <= 5 && frameCount % 30 < 15) {
      fill('#f4acb7'); // 倒數警告改為櫻花粉
    } else {
      fill(255);
    }
    text("時間: " + seconds + "s", width - 20, 25);
  }

  // 顯示生命值
  fill('#f4acb7'); // --cherry-blossom
  textSize(16);
  let lifeStr = "❤".repeat(max(0, lives));
  text("生命: " + lifeStr, width - 20, 50);

  // 目標顏色提示區塊
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(16);
  text("請找出此目標色彩", width / 2, 20);

  fill(targetColor);
  stroke(255);
  strokeWeight(2);
  rect(width / 2 - 40, 35, 80, 30, 5);
}

function drawStartScreen() {
  background(157, 129, 137, 220); // --dusty-mauve 遮罩

  let cx = width / 2;
  let cy = height / 2;

  // --- 少女感淡淡背景網格 ---
  push();
  stroke(255, 202, 212, 30); // --pastel-pink 網格
  strokeWeight(1);
  for (let x = 0; x < width; x += 50) { line(x, 0, x, height); }
  for (let y = 0; y < height; y += 50) { line(0, y, width, y); }
  pop();

  // --- 背景小圖示與幾何裝飾 ---
  push();
  // 繪製背景漂浮的十字準星 (+)
  stroke('#d8e2dc'); // --alabaster-grey
  strokeWeight(2);
  for (let i = 0; i < 6; i++) {
    let px = cx + sin(frameCount * 0.005 + i) * (width * 0.4);
    let py = cy + cos(frameCount * 0.007 + i * 2) * (height * 0.3);
    line(px - 8, py, px + 8, py);
    line(px, py - 8, px, py + 8);
  }
  
  // 繪製背景漂浮的資料點 (o)
  noStroke();
  fill('#ffe5d9'); // --powder-petal
  for (let i = 0; i < 10; i++) {
    let px = cx + cos(frameCount * 0.008 + i) * (width * 0.45);
    let py = cy + sin(frameCount * 0.006 + i * 3) * (height * 0.35);
    circle(px, py, 4);
  }
  
  // 繪製科技感裝飾線條
  stroke('#ffcad4'); // --pastel-pink
  strokeWeight(1);
  line(cx - 200, cy - 150, cx - 100, cy - 150);
  circle(cx - 100, cy - 150, 4);
  line(cx + 150, cy + 120, cx + 250, cy + 120);
  circle(cx + 150, cy + 120, 4);
  pop();

  // --- 夢幻粉彩：極光漸層光暈 (Pastel Orb) ---
  push();
  translate(cx, cy - 80);
  let orbRadius = 150 + sin(frameCount * 0.02) * 15;
  
  // 使用 Canvas API 繪製平滑漸層
  let gradient = drawingContext.createRadialGradient(0, 0, 0, 0, 0, orbRadius);
  gradient.addColorStop(0, `rgba(255, 229, 217, 0.6)`);    // --powder-petal 中心
  gradient.addColorStop(0.5, `rgba(255, 202, 212, 0.3)`);  // --pastel-pink 過渡
  gradient.addColorStop(1, `rgba(157, 129, 137, 0)`);      // --dusty-mauve 融入背景
  
  drawingContext.fillStyle = gradient;
  noStroke();
  circle(0, 0, orbRadius * 2);
  
  // 加上點綴的細緻星芒
  stroke('#d8e2dc'); // --alabaster-grey 星芒
  strokeWeight(1);
  line(-orbRadius * 0.8, 0, orbRadius * 0.8, 0);
  line(0, -orbRadius * 0.8, 0, orbRadius * 0.8);

  // 動態軌道環
  noFill();
  stroke(244, 172, 183, 120); // --cherry-blossom 軌道
  drawingContext.setLineDash([5, 10]);
  rotate(frameCount * 0.005);
  ellipse(0, 0, orbRadius * 1.8, orbRadius * 0.6);
  rotate(-frameCount * 0.01);
  ellipse(0, 0, orbRadius * 1.5, orbRadius * 1.5);
  drawingContext.setLineDash([]);
  pop();

  // --- 標題 ---
  push();
  textAlign(CENTER, CENTER);
  textSize(70);
  textStyle(BOLD);
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = '#f4acb7'; // --cherry-blossom 輝光
  fill(255); 
  noStroke();
  text("尋 色 光 譜", cx, cy - 80); // 增加字距感
  pop();

  // --- 說明文字 ---
  textAlign(CENTER, CENTER);
  textSize(16);
  fill('#ffe5d9'); // --powder-petal
  noStroke();
  text("在無盡星海中，鎖定與目標完美共鳴的色彩", cx, cy - 10);

  // --- 難度選擇按鈕 (現代膠囊風格) ---
  let buttonWidth = 110;
  let buttonHeight = 45;
  let buttonSpacing = 20;
  let startY = cy + 40;

  let difficulties = ['EASY', 'NORMAL', 'HARD'];
  let difficultyLabels = ['簡單', '普通', '困難'];

  for (let i = 0; i < difficulties.length; i++) {
    let buttonX = cx - (buttonWidth * 1.5 + buttonSpacing) + i * (buttonWidth + buttonSpacing);
    let buttonY = startY;

    let isHover = isMouseOverButton(buttonX, buttonY, buttonWidth, buttonHeight);

    // 按鈕背景
    if (currentDifficulty === difficulties[i]) {
      fill(244, 172, 183, 200); // --cherry-blossom 帶透明
      stroke('#ffe5d9'); // --powder-petal 邊框
      strokeWeight(2);
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = '#f4acb7'; // 發光
    } else if (isHover) {
      fill(255, 202, 212, 180); // --pastel-pink 懸停狀態
      stroke('#ffe5d9');
      strokeWeight(1.5);
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = '#ffcad4';
    } else {
      fill(157, 129, 137, 150); // --dusty-mauve
      stroke('#d8e2dc'); // --alabaster-grey
      strokeWeight(1);
      drawingContext.shadowBlur = 0;
    }
    rect(buttonX, buttonY, buttonWidth, buttonHeight, 25); // 圓角膠囊

    // 按鈕文字
    fill(255);
    textSize(16);
    textAlign(CENTER, CENTER);
    noStroke();
    text(difficultyLabels[i], buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
  }
  drawingContext.shadowBlur = 0; // 重置 shadowBlur，避免影響後續繪製

  // --- 動態操作教學動畫 (簡化版，更俐落) ---
  push();
  translate(cx, cy + 125); 
  
  let cycle = frameCount % 200; 
  let textAlpha = map(sin(frameCount * 0.05), -1, 1, 150, 255);
  
  textAlign(CENTER, CENTER);
  textSize(16);
  
  if (cycle < 100) {
    fill(216, 226, 220, textAlpha); // --alabaster-grey
    noStroke();
    text("👆 按住拖曳 : 掃描光譜", 0, 0);
    
    let animX = map(sin(frameCount * 0.08), -1, 1, -30, 30);
    stroke(216, 226, 220, 150); 
    strokeWeight(1.5);
    noFill();
    circle(animX, 30, 20); 
    fill('#ffe5d9'); // --powder-petal
    noStroke();
    circle(animX, 30, 6);
  } else {
    fill(255, 202, 212, textAlpha); // --pastel-pink
    noStroke();
    text("✨ 鬆開手指 : 鎖定色彩", 0, 0);
    
    let animT = cycle - 100;
    let expand = map(animT, 0, 40, 20, 50, true);
    let fade = map(animT, 0, 50, 255, 0, true);
    
    stroke(244, 172, 183, fade); // --cherry-blossom
    strokeWeight(2);
    noFill();
    circle(0, 30, expand);
    
    fill(244, 172, 183, map(animT, 0, 20, 255, 0, true));
    noStroke();
    circle(0, 30, 8);
  }
  pop();

  // --- 全螢幕按鈕 ---
  drawFullscreenButton();
}

function isMouseOverButton(x, y, w, h) {
  return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

function drawGameOver() {
  background(157, 129, 137, 230); // --dusty-mauve 作為結束背景

  let cx = width / 2;
  let cy = height / 2;

  // --- 背景下沉的環境粉彩粒子 ---
  push();
  noStroke();
  for (let i = 0; i < 20; i++) {
    let px = (noise(i * 10) * width + sin(frameCount * 0.01 + i) * 50) % width;
    let py = (noise(i * 20) * height + frameCount * (0.5 + noise(i) * 1.5)) % height;
    let pSize = noise(i * 30) * 6 + 2;
    fill(255, 229, 217, 150 * noise(i)); // --powder-petal 粒子
    circle(px, py, pSize);
  }
  pop();

  // --- 新增：半透明磨砂玻璃卡片 (Glassmorphism Card) ---
  push();
  translate(cx, cy + 10);
  fill(216, 226, 220, 80); // --alabaster-grey 透明磨砂
  stroke(255, 202, 212, 200); // --pastel-pink 邊框
  strokeWeight(2);
  drawingContext.shadowBlur = 25;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.6)';
  rectMode(CENTER);
  rect(0, 0, 340, 160, 20); // 圓角卡片
  
  // 內層微弱高光
  noFill();
  stroke(255, 255, 255, 20);
  strokeWeight(1);
  rect(0, 0, 330, 150, 16);
  pop();

  // --- 標題 ---
  push();
  textAlign(CENTER, CENTER);
  textSize(50);
  textStyle(BOLD);
  fill(255);
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = '#f4acb7'; // --cherry-blossom 輝光
  noStroke();
  text("探 索 終 止", cx, cy - 120);
  pop();
  
  // --- 分數顯示 ---
  textSize(16);
  fill('#ffe5d9'); // --powder-petal
  text("最終共鳴指數", cx, cy - 30);
  
  textSize(48);
  fill('#f4acb7'); // --cherry-blossom
  text(score, cx, cy + 15);
  
  if (isNewRecord) {
    // 破紀錄特效文字
    push();
    let pulse = 1 + 0.05 * sin(frameCount * 0.15);
    translate(cx, cy + 60);
    scale(pulse);
    fill(244, 172, 183, 200); // --cherry-blossom 膠囊
    stroke('#ffe5d9'); // --powder-petal
    strokeWeight(1.5);
    rectMode(CENTER);
    rect(0, 0, 210, 34, 17); // 加寬並稍微加高膠囊外框，確保文字不會超出
    
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = '#f4acb7';
    fill('#FFFFFF'); // 白色字體
    textSize(14);
    noStroke();
    text("★ 突破歷史最高紀錄 ★", 0, 0);
    pop();

    // 隨機施放慶祝煙火
    if (frameCount % 15 === 0) {
      let cols = [color('#d8e2dc'), color('#ffe5d9'), color('#ffcad4'), color('#f4acb7'), color('#9d8189')];
      spawnExplosion(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.8), random(cols), 3);
    }
  } else {
    textSize(14);
    fill(216, 226, 220); // --alabaster-grey
    text("歷史最高共鳴 : " + highScore, cx, cy + 60);
  }
  
  push();
  let alpha = map(sin(frameCount * 0.08), -1, 1, 80, 255);
  translate(cx, cy + 150);
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(255, 202, 212, alpha); // --pastel-pink
  text("— 點擊 / 觸控畫面重新探索 —", 0, 0);
  pop();

  // --- 全螢幕按鈕 ---
  drawFullscreenButton();
}

function drawFullscreenButton() {
  let fsBtnW = 100;
  let fsBtnH = 30;
  let fsBtnX = width - fsBtnW - 20;
  let fsBtnY = 20;
  
  push();
  if (mouseX > fsBtnX && mouseX < fsBtnX + fsBtnW && mouseY > fsBtnY && mouseY < fsBtnY + fsBtnH) {
    fill(244, 172, 183, 150); // --cherry-blossom 懸停
  } else {
    fill(157, 129, 137, 100); // --dusty-mauve
  }
  noStroke();
  rect(fsBtnX, fsBtnY, fsBtnW, fsBtnH, 5);
  fill(255);
  textSize(14);
  textAlign(CENTER, CENTER);
  // 根據目前狀態顯示對應文字
  text(fullscreen() ? "退出全螢幕" : "進入全螢幕", fsBtnX + fsBtnW / 2, fsBtnY + fsBtnH / 2);
  pop();
}

function mouseReleased() {
  // 檢查是否點擊了全螢幕按鈕
  if (gameState === 'START' || gameState === 'GAMEOVER') {
    let fsBtnW = 100;
    let fsBtnH = 30;
    let fsBtnX = width - fsBtnW - 20;
    let fsBtnY = 20;
    if (mouseX > fsBtnX && mouseX < fsBtnX + fsBtnW && mouseY > fsBtnY && mouseY < fsBtnY + fsBtnH) {
      fullscreen(!fullscreen()); // 切換全螢幕狀態
      return;
    }
  }

  // 如果在開始畫面，處理難度選擇按鈕的點擊
  if (gameState === 'START') {
    let buttonWidth = 110;
    let buttonHeight = 45;
    let buttonSpacing = 20;
    let startY = height / 2 + 40;
    let cx = width / 2;

    let difficulties = ['EASY', 'NORMAL', 'HARD'];

    for (let i = 0; i < difficulties.length; i++) {
      let buttonX = cx - (buttonWidth * 1.5 + buttonSpacing) + i * (buttonWidth + buttonSpacing);
      let buttonY = startY;

      if (isMouseOverButton(buttonX, buttonY, buttonWidth, buttonHeight)) {
        currentDifficulty = difficulties[i];
        // 點擊難度按鈕後，直接開始遊戲！
        if (bgMusic && bgMusic.isLoaded() && !bgMusic.isPlaying()) {
          bgMusic.setVolume(0.5); // 設定音量 (0.0 ~ 1.0)
          bgMusic.loop(); // 無限循環播放
        }
        resetGame();
        return; 
      }
    }

    // 如果沒有點擊難度按鈕，但點擊了其他區域，則開始遊戲
    if (bgMusic && bgMusic.isLoaded() && !bgMusic.isPlaying()) {
      bgMusic.setVolume(0.5); // 設定音量 (0.0 ~ 1.0)
      bgMusic.loop(); // 無限循環播放
    }
    resetGame();
    return;
  } else if (gameState === 'GAMEOVER') {
    resetGame();
    return;
  }

  // 檢查是否點擊在格子上
  let mC = floor((mouseX - gridOffsetX) / cellSize);
  let mR = floor((mouseY - gridOffsetY) / cellSize);

  if (mC >= 0 && mC < cols && mR >= 0 && mR < rows) {
    let cell = grid[mC][mR];
    if (cell.state === 'wrong') return; // 已經點錯的格子不再判定

    if (cell.isTarget) {
      if (correctSound && correctSound.isLoaded()) correctSound.play();
      combo++;
      comboTimer = maxComboTime; // 刷新連擊時間
      
      let absoluteX = mC * cellSize + cellSize / 2 + gridOffsetX;
      let absoluteY = mR * cellSize + cellSize / 2 + gridOffsetY;

      // 每達到 5 Combo 就回復 1 點生命值 (最高限制回滿至 3 點)
      if (combo % 5 === 0) {
        if (lives < 3) {
          lives++;
          spawnFloatingText(absoluteX, absoluteY - 30, "+1 ❤", color('#f4acb7'));
        }
      }

      // 每達到 10 Combo 觸發狂熱模式 (時間暫停 5 秒)
      if (combo > 0 && combo % 10 === 0) {
        isFeverMode = true;
        feverTimer = feverDuration;
        spawnFloatingText(absoluteX, absoluteY - 60, "狂熱模式!", color('#f4acb7'));
        if (bgMusic && bgMusic.isLoaded()) {
          bgMusic.rate(1.5); // 狂熱模式音樂加速
        }
      }

      let pointsGained = combo; // 連擊越高，加分越多 (1, 2, 3...)
      score += pointsGained;
      timeRemaining += 60 * 3; // 答對獎勵 3 秒
      
      // 在點擊的位置觸發煙火特效 (轉換為絕對座標)
      spawnExplosion(absoluteX, absoluteY, cell.c, combo);
      spawnFloatingText(absoluteX, absoluteY, "+" + pointsGained, color('#ffe5d9'));
      
      resetLevel();
    } else {
      if (wrongSound && wrongSound.isLoaded()) wrongSound.play();
      cell.state = 'wrong';
      lives--; // 點錯直接扣除生命值
      combo = 0; // 答錯，連擊中斷
      if (isFeverMode) {
        flashTime = 30; // 若在狂熱模式中失誤中斷，也觸發閃爍結束
      }
      isFeverMode = false; // 狂熱模式中斷
      if (bgMusic && bgMusic.isLoaded()) {
        bgMusic.rate(1.0); // 恢復正常音樂速度
      }
      shakeTime = 15; // 觸發震動
      spawnFloatingText(mouseX, mouseY, "失誤!", color('#d8e2dc'));
    }
  }
}

// --- 新增：粒子特效系統 ---
function spawnExplosion(x, y, col, currentCombo = 1) {
  // 連擊越高，煙火數量越多 (最高限制在 5 倍以避免效能過載)
  let numParticles = 50 * min(currentCombo, 5);
  
  for (let i = 0; i < numParticles; i++) {
    let angle = random(TWO_PI);
    // 連擊越高，爆炸的物理速度/散佈範圍也稍微變大
    let speed = random(3, 12 + min(currentCombo, 5) * 1.5);
    particles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 255, // 粒子的不透明度與生命週期
      c: col,
      size: random(5, 15)
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    // 物理運算
    p.vy += 0.15; // 重力往下
    p.vx *= 0.95; // 空氣阻力
    p.vy *= 0.95;
    
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 6;  // 隨時間淡出
    p.size *= 0.96; // 隨時間縮小
    
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    noStroke();
    // 內層實體
    fill(red(p.c), green(p.c), blue(p.c), p.life);
    circle(p.x, p.y, p.size);
    
    // 外層發光光暈
    fill(red(p.c), green(p.c), blue(p.c), p.life * 0.4);
    circle(p.x, p.y, p.size * 2.5);
  }
}

// --- 新增：背景星塵動畫系統 ---
function drawStars() {
  noStroke();
  
  // 計算滑鼠相對於螢幕中心的偏移比例
  let mouseOffsetX = (mouseX - width / 2) * 0.02;
  let mouseOffsetY = (mouseY - height / 2) * 0.02;
  
  for (let i = 0; i < stars.length; i++) {
    let s = stars[i];
    
    // 利用 sin() 函數與各自的閃爍頻率，計算動態透明度
    let alpha = map(sin(frameCount * s.blinkSpeed + s.blinkOffset), -1, 1, 10, 200);
    fill(255, 229, 217, alpha); // 溫暖柔和的星塵色 (--powder-petal)
    
    // 套用視差偏移：星星越大（越近），移動幅度越明顯
    let px = s.x - mouseOffsetX * s.size;
    let py = s.y - mouseOffsetY * s.size;
    
    circle(px, py, s.size);
    
    // 讓星塵緩慢向上漂浮
    s.y -= s.speed;
    
    // 如果星塵飄出畫面邊界，則重新放到另一側 (加入一點緩衝區 50 避免突然消失)
    if (s.y < -50) {
      s.y = height + 50;
      s.x = random(width); // 隨機新位置
    }
    if (s.x < -50) s.x = width + 50;
    if (s.x > width + 50) s.x = -50;
  }

  // --- 新增：偶爾劃過的流星 ---
  // 控制流星出現的機率 (大約平均每 1-2 秒出現一顆)
  if (random(1) < 0.015) {
    shootingStars.push({
      x: random(width * 0.3, width + 200), // 從畫面中右側到右外側出現
      y: random(-100, height * 0.4),       // 偏上半部出現
      vx: random(-15, -30),                // 快速往左跑
      vy: random(5, 20),                   // 快速往下跑
      life: 255,                           // 初始亮度
      decay: random(4, 10),                // 淡出速度
      len: random(2, 6)                    // 流星尾巴的長度倍率
    });
  }

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    let ss = shootingStars[i];
    ss.x += ss.vx;
    ss.y += ss.vy;
    ss.life -= ss.decay;

    if (ss.life <= 0) {
      shootingStars.splice(i, 1);
      continue;
    }

    // 畫出流星本體與殘影尾巴
    stroke(255, 202, 212, ss.life); // 流星尾巴帶點淺粉色 (--pastel-pink)
    strokeWeight(random(1, 3)); // 微微閃爍的效果
    line(ss.x, ss.y, ss.x - ss.vx * ss.len, ss.y - ss.vy * ss.len);
  }
}

// --- 新增：浮動文字特效 ---
function spawnFloatingText(x, y, txt, col) {
  floatingTexts.push({
    x: x,
    y: y,
    txt: txt,
    c: col,
    life: 60,
    vy: -2
  });
}

function updateAndDrawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.x += random(-0.5, 0.5); // 輕微抖動
    ft.y += ft.vy;
    ft.vy *= 0.95; // 減速摩擦力
    ft.life--;

    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }

    let alpha = map(ft.life, 0, 60, 0, 255);
    fill(red(ft.c), green(ft.c), blue(ft.c), alpha);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text(ft.txt, ft.x, ft.y);
  }
}

// --- 防止手機端拖曳時畫面捲動 ---
function touchMoved() {
  return false; // 回傳 false 可以阻止瀏覽器預設的滑動與縮放行為
}

// --- 創意升級 3：CRT 復古螢幕掃描線特效 ---
function drawCRT() {
  push();
  // 極度淡化的橫向掃描線
  stroke(255, 202, 212, 10);
  strokeWeight(1);
  for (let i = 0; i < height; i += 4) {
    line(0, i, width, i);
  }
  
  // 螢幕刷新滾動帶
  noStroke();
  fill(255, 229, 217, 5);
  let scanY = (frameCount * 5) % height;
  rect(0, scanY, width, 100);
  
  // 邊緣暗角 (Vignette) 增加螢幕的曲面深度感
  let gradient = drawingContext.createRadialGradient(width / 2, height / 2, height * 0.4, width / 2, height / 2, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
  drawingContext.fillStyle = gradient;
  rect(0, 0, width, height);
  pop();
}
