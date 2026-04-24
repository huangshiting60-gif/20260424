/**
 * p5_audio_visualizer
 * 這是一個結合 p5.js 與 p5.sound 的程式，載入音樂並循環播放，
 * 畫面上會有多個隨機生成的多邊形在視窗內移動反彈，
 * 且其大小會跟隨音樂的振幅（音量）即時縮放。
 */

// 全域變數
let shapes = [];
let bubbles = []; // 用來儲存氣泡物件的陣列
let song;
let amplitude;
// 外部定義的二維陣列，做為多邊形頂點的基礎座標
let points = [
  [-3, 5],
  [3, 7],
  [1, 5],
  [2, 4],
  [4, 3],
  [5, 2],
  [6, 2],
  [8, 4],
  [8, -1],
  [6, 0],
  [0, -3],
  [2, -6],
  [-2, -3],
  [-4, -2],
  [-5, -1],
  [-6, 1],
  [-6, 2]
];

function preload() {
  // 在程式開始前預載入外部音樂資源
  song = loadSound('midnight-quirk-255361.mp3');
}

function setup() {
  // 初始化畫布，建立符合視窗大小的畫布
  createCanvas(windowWidth, windowHeight);

  // 初始化 Amplitude 物件
  amplitude = new p5.Amplitude();

  // 播放音樂 (p5.js 的 preload 會確保 song 已載入)
  // 注意：部分瀏覽器可能會阻擋自動播放，需透過使用者互動 (如 mousePressed) 啟動
  song.loop();

  // 使用 for 迴圈產生 10 個形狀物件
  for (let i = 0; i < 10; i++) {
    // 產生一個隨機的大小倍率，統一應用於 x 和 y，保持形狀比例 (不變形)
    let r = random(5, 15); // 將魚的大小縮小 (原本是 10 到 30)
    let shapePoints = points.map(pt => {
      return [pt[0] * r, pt[1] * r];
    });

    let shape = {
      x: random(0, windowWidth),
      y: random(0, windowHeight),
      dx: random(-3, 3),
      dy: random(-3, 3),
      scale: random(1, 10), // 初始隨機縮放比例 (雖然 draw 中會被 sizeFactor 影響)
      color: color(random(100, 255), random(100, 255), random(100, 255)), // 產生較為明亮漂亮的顏色
      points: shapePoints
    };
    
    shapes.push(shape);
  }
}

function draw() {
  // 設定背景顏色
  background('#ffcdb2');
  
  // --- 氣泡效果開始 ---
  // 隨機產生新的氣泡 (由下而上)
  if (random() < 0.05) { // 約 5% 的機率產生氣泡
    bubbles.push({
      x: random(width),
      y: height + 10,
      size: random(5, 10),
      speed: random(1, 3)
    });
  }
  // 更新並繪製所有氣泡
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y -= b.speed; // 向上移動
    stroke(255, 150); // 設定線條為半透明白色
    noFill();         // 氣泡內部不填色
    ellipse(b.x, b.y, b.size); // 畫圓
    // 如果氣泡飄出視窗頂部，則將其移除 (破裂消失)
    if (b.y < -10) bubbles.splice(i, 1);
  }
  // --- 氣泡效果結束 ---

  // 設定邊框粗細
  strokeWeight(2);

  // 透過 amplitude.getLevel() 取得當前音量大小（數值介於 0 到 1）
  let level = amplitude.getLevel();

  // 使用 map() 函式將 level 從 (0, 1) 的範圍映射到 (0.5, 2) 的範圍
  let sizeFactor = map(level, 0, 1, 0.5, 2);

  // 使用 for...of 迴圈走訪 shapes 陣列中的每個 shape 進行更新與繪製
  for (let shape of shapes) {
    // 位置更新
    shape.x += shape.dx;
    shape.y += shape.dy;

    // 邊緣反彈檢查
    if (shape.x < 0 || shape.x > windowWidth) {
      shape.dx *= -1;
    }
    if (shape.y < 0 || shape.y > windowHeight) {
      shape.dy *= -1;
    }

    // 設定外觀
    fill(shape.color);
    stroke(shape.color);

    // 座標轉換與縮放
    push();
    translate(shape.x, shape.y);

    // 依照移動方向 (dx) 決定是否左右翻轉，並套用音量縮放
    if (shape.dx > 0) {
      scale(-sizeFactor, sizeFactor); // 往右移動，水平翻轉
    } else {
      scale(sizeFactor, sizeFactor); // 往左移動，維持原方向
    }

    // 繪製多邊形
    beginShape();
    for (let pt of shape.points) {
      vertex(pt[0], pt[1]);
    }
    endShape(CLOSE);

    // 狀態還原
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 輔助函式：點擊滑鼠可暫停或繼續播放 (解決瀏覽器自動播放限制)
function mousePressed() {
  // 只有當按下的是滑鼠左鍵時才切換播放狀態
  if (mouseButton === LEFT) {
    if (song.isPlaying()) {
      song.pause();
    } else {
      song.loop();
    }
  }
}
