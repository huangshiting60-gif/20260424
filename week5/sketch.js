let seaweeds = [];
let bubbles = [];
let fishes = []; // 新增小魚陣列

// 畫面使用的全新調色盤
const palette = ['#D9ED92', '#B5E48C', '#99D98C', '#76C893', '#52B69A', '#34A0A4', '#168AAD', '#1A759F', '#1E6091', '#184E77'];

// 設定前後兩層水草的顏色
const colorBottomBack = '#184E77'; // 後層底部：最深的藍色
const colorTopBack = '#52B69A';    // 後層頂部：偏暗的藍綠色
const colorBottomFront = '#1A759F';// 前層底部：較亮的深藍色
const colorTopFront = '#D9ED92';   // 前層頂部：最亮的淺黃綠色

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style('pointer-events', 'none'); // 讓滑鼠點擊與滾輪穿透畫布
  cnv.style('z-index', '1'); // 確保動畫圖層在最前方
  
  // 產生 iframe 並設定在背景
  let iframe = createElement('iframe');
  iframe.attribute('src', 'https://www.et.tku.edu.tw/');
  iframe.position(0, 0);
  iframe.style('width', '100vw');
  iframe.style('height', '100vh');
  iframe.style('z-index', '-1'); // 確保 iframe 在畫面最底層
  iframe.style('border', 'none');

  // 1. 產生後層水草 (深色、較高、稍粗、搖晃較慢)
  for (let i = 0; i < 70; i++) {
    seaweeds.push({
      x: map(i, 0, 70, 0, width) + random(-20, 20),
      h: random(height * 0.3, height * 0.6), // 後層稍高一點
      colBottom: colorBottomBack, 
      colTop: colorTopBack,       
      thickness: random(12, 25), // 後層稍微粗一點
      freq: random(0.003, 0.01), // 搖晃頻率較慢
      noiseOffset: random(1000) // 獨立的雜訊起點
    });
  }

  // 2. 產生前層水草 (淺色、較矮、纖細、搖晃較快)
  for (let i = 0; i < 80; i++) {
    seaweeds.push({
      x: map(i, 0, 80, 0, width) + random(-20, 20),
      h: random(height * 0.15, height * 0.45), // 前層稍矮
      colBottom: colorBottomFront, 
      colTop: colorTopFront,       
      thickness: random(8, 18), // 前層較細緻
      freq: random(0.005, 0.02), // 搖晃頻率較快
      noiseOffset: random(2000) // 給予不同的雜訊起點
    });
  }

  // 3. 產生後層小魚 (顏色較暗、體型較小、速度較慢，游在水草後方)
  let numFishesBack = floor(random(8, 16));
  for (let i = 0; i < numFishesBack; i++) {
    fishes.push({
      x: random(width),
      y: random(height * 0.2, height * 0.8),
      size: random(6, 12), // 體積較小
      speed: random(0.5, 1.2) * (random() > 0.5 ? 1 : -1), // 游速較慢
      col: random(['#7a644f', '#8f6261', '#9c7b99', '#5c7496', '#9e8961', '#997e7e']), // 將原本的顏色調暗
      layer: 'back'
    });
  }

  // 4. 產生前層小魚 (顏色明亮、體型較大、速度較快，游在水草前方)
  let numFishesFront = floor(random(8, 16));
  for (let i = 0; i < numFishesFront; i++) {
    fishes.push({
      x: random(width),
      y: random(height * 0.2, height * 0.8),
      size: random(12, 20), // 體積較大
      speed: random(1.5, 2.8) * (random() > 0.5 ? 1 : -1), // 游速較快
      col: random(['#c7a381', '#e29c9a', '#f7c4f4', '#91b6ec', '#f3d295', '#f3c9c9']), // 明亮的顏色
      layer: 'front'
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  clear(); // 清除畫布，讓透明度能夠正確發揮作用
  background(24, 78, 119, 255 * 0.2); // #184E77 (RGB: 24, 78, 119) 配上 0.2 的透明度
  blendMode(BLEND);

  // ===== 繪製後層小魚 (被水草遮擋) =====
  updateAndDrawFishes('back');

  // ===== 繪製水草 =====
  noFill();
  strokeCap(ROUND); // 讓線條頭尾呈現圓弧感
  for (let i = 0; i < seaweeds.length; i++) {
    let sw = seaweeds[i];
    
    // 設定漸層顏色與透明度
    let cBottom = color(sw.colBottom);
    cBottom.setAlpha(220); // 底部不透明度再調高一點，讓細水草根部更扎實
    let cTop = color(sw.colTop);
    cTop.setAlpha(120);    // 稍微提高頂端透明度，避免細線條融入背景看不見
    
    strokeWeight(sw.thickness);
    stroke(255); // 必須先給予任意 stroke 觸發 p5 內部的線條繪製狀態
    
    // 呼叫 Canvas API 建立 Y 軸方向的線性漸層
    let gradient = drawingContext.createLinearGradient(0, height, 0, height - sw.h);
    gradient.addColorStop(0, cBottom.toString());
    gradient.addColorStop(1, cTop.toString());
    drawingContext.strokeStyle = gradient; // 將漸層套用到繪圖環境中

    beginShape();
    let segments = 25; // 提高分段數，讓變細的水草曲線更加圓滑優雅
    for (let j = 0; j <= segments; j++) {
      let y = map(j, 0, segments, height, height - sw.h);
      // 結合 noise 產生波浪，縮小搖晃幅度 (-100 到 100) 讓姿態更自然
      let wave = map(noise(sw.noiseOffset, frameCount * sw.freq, j * 0.1), 0, 1, -100, 100);
      let xOffset = wave * (j / segments); // 讓底部固定不偏移
      let x = sw.x + xOffset;
      
      curveVertex(x, y);
      // curveVertex 需要重複第一個與最後一個節點來確保曲線順利封閉
      if (j === 0 || j === segments) {
        curveVertex(x, y);
      }
    }
    endShape();
  }

  // ===== 繪製前層小魚 (擋在水草前面) =====
  updateAndDrawFishes('front');

  // ===== 水泡生成與邏輯 =====
  // 每 15 個 frame 生成一顆水泡
  if (frameCount % 15 === 0) {
    bubbles.push({
      x: random(width),
      y: height + 20,
      size: random(15, 30),
      speed: random(1, 3),
      popHeight: random(height * 0.1, height * 0.5), // 水泡破裂的高度
      popped: false,
      popTimer: 15 // 控制破裂動畫的時間
    });
  }

  // 更新與繪製水泡（從陣列尾端開始讀取，方便在陣列中刪除元素）
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    
    if (!b.popped) {
      b.y -= b.speed;
      b.x += map(noise(frameCount * 0.01, i * 10), 0, 1, -1, 1); // 讓水泡微微左右飄動
      
      noStroke();
      // 主要水泡 (透明度 0.5)
      fill(255, 128); 
      circle(b.x, b.y, b.size);
      
      // 水泡左上角亮點 (透明度 0.8)
      fill(255, 204); 
      circle(b.x - b.size * 0.2, b.y - b.size * 0.2, b.size * 0.3);
      
      // 檢查是否抵達破掉的高度
      if (b.y < b.popHeight) {
        b.popped = true;
      }
    } else {
      // 破裂特效
      noFill();
      stroke(255, map(b.popTimer, 0, 15, 0, 255)); // 漸漸透明
      strokeWeight(2);
      // 破掉時產生一個擴大的光環
      circle(b.x, b.y, b.size + (15 - b.popTimer) * 1.5);
      
      // 破掉時產生幾條向外擴散的小水花
      for (let a = 0; a < TWO_PI; a += PI / 4) {
        let r1 = b.size / 2 + 5;
        let r2 = r1 + (15 - b.popTimer);
        line(b.x + cos(a)*r1, b.y + sin(a)*r1, b.x + cos(a)*r2, b.y + sin(a)*r2);
      }
      
      b.popTimer--;
      // 特效結束後從陣列中移除
      if (b.popTimer <= 0) {
        bubbles.splice(i, 1);
      }
    }
  }
}

// 將小魚的更新與繪製獨立成一個函式，方便分層呼叫
function updateAndDrawFishes(targetLayer) {
  for (let i = 0; i < fishes.length; i++) {
    let f = fishes[i];
    if (f.layer !== targetLayer) continue; // 只繪製指定圖層的小魚
    
    f.x += f.speed;
    
    // 讓小魚游出邊界後，從另一邊無縫接軌重新出現
    if (f.speed > 0 && f.x > width + 50) f.x = -50;
    if (f.speed < 0 && f.x < -50) f.x = width + 50;

    push();
    // 利用 sin() 加上一點上下浮動的游動感
    translate(f.x, f.y + sin(frameCount * 0.05 + i) * 15);
    if (f.speed < 0) scale(-1, 1); // 如果向左游，翻轉畫布讓魚身轉向
    
    noStroke();
    fill(f.col);
    // 魚的身體
    ellipse(0, 0, f.size * 2.5, f.size * 1.5);
    // 魚的尾巴
    triangle(-f.size * 1.2, 0, -f.size * 2.2, -f.size, -f.size * 2.2, f.size);
    
    // 魚的眼睛
    fill(255);
    ellipse(f.size * 0.6, -f.size * 0.2, f.size * 0.4);
    fill(0);
    ellipse(f.size * 0.7, -f.size * 0.2, f.size * 0.2);
    pop();
  }
}
