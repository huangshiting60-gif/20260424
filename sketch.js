// 預先準備的 7 個作品資料 (包含名稱與網址)
// ⚠️ 注意：這裡的 url 路徑必須與你電腦上的「資料夾」和「檔案名稱」完全一致！
// 例如，'./week1/index.html' 代表在 sketch.js 旁邊，要有一個 week1 資料夾，裡面要有一個 index.html 檔案。
const works = [
  { name: 'Week 1', url: './week1/index.html' }, // -> 會去讀取 nnn/week1/index.html
  { name: 'Week 2', url: './week2/index.html' }, // -> 會去讀取 nnn/week2/index.html
  { name: 'Week 3', url: './week3/index.html' }, // -> 會去讀取 nnn/week3/index.html
  { name: 'Week 4', url: './week4/index.html' }, // -> etc.
  { name: 'Week 5', url: './week5/index.html' },
  { name: 'Week 6', url: './week6/index.html' },
  { name: 'Week 7', url: './week7/index.html' },
  { name: 'Week 8', url: './week8/index.html' }
];

let gashapons = [];

// --- 響應式佈局與縮放變數 ---
let machineX, machineY, machineScale;

// --- 背景裝飾變數 (改為遊樂園元素) ---
let bgElements = [];

// --- 背景顏色漸變變數 ---
let currentTopColor, currentBottomColor;
let targetTopColor, targetBottomColor;

// --- 手把動畫變數 ---
let handleAngle = 0;
let isHandleAnimating = false;
const HANDLE_ANIMATION_SPEED = 0.25; // 控制手把旋轉速度
let isFirstGachaDrawn = false; // 新增：記錄是否已經抽出第一顆扭蛋
let machineShakeTimer = 0; // 新增：控制扭蛋機震動的計時器
let explosionConfettis = []; // 新增：存放掉落時噴發的彩帶
let selectedGachaColor = null; // 新增：預先宣告抽中的扭蛋顏色，以防報錯

// --- 跑馬燈變數 ---
let marqueeX;
let marqueeText = "✨ 歡迎來到夢幻遊樂園 🎡 點擊旋鈕，抽出屬於你的奇幻世界！ ✨";

// --- 音樂與音效變數 ---
let bgm;

function preload() {
  // ⚠️ 將音效載入移至 setup()！
  // 因為 preload 只要有檔案找不到就會「無限期卡住」整個程式。
  // 即使我們寫了錯誤處理，有時 preload 還是會卡死。
  // 移出這裡可以確保「畫布絕對會第一時間顯示出來」。
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  
  // 美化：設定更柔和的顏色
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  // 初始化背景漸層顏色
  currentTopColor = color('#ffe5d9'); // powder-petal
  currentBottomColor = color('#d8e2dc'); // alabaster-grey-2
  targetTopColor = currentTopColor;
  targetBottomColor = currentBottomColor;
  
  // 🚀 將音效載入移至這裡 (非同步載入)
  // 畫面會立刻顯示，不會被音效檔案拖累。音效如果存在，載入完就會自然有聲音。
  bgm = loadSound('keyboard.mp3', () => {}, () => console.warn('無背景音樂'));

  // 網頁整合 (Iframe): 如果畫面中還沒有 #work-display，就幫忙動態生成並排版
  let iframe = select('#work-display');
  if (!iframe) {
    // 修正：直接取用 HTML 中已預留的隱藏容器
    let container = select('#canvas-container');
    
    // 防呆機制：如果使用者的 HTML 中沒有寫 <div id="canvas-container"></div>，就自動建立一個
    if (!container) {
      container = createDiv();
      container.id('canvas-container');
    }

    container.style('position', 'relative'); // 確保內部絕對定位生效
    
    // 將 Canvas 放入容器
    canvas.parent(container);
    
    // 創建 Iframe
    iframe = createElement('iframe');
    iframe.id('work-display');
    iframe.parent(container);
    iframe.style('border', 'none'); // 美化：移除 iframe 邊框
    
    // 初始化：將 iframe 藏在右側畫面外，並加入滑動動畫
    iframe.style('position', 'absolute');
    iframe.style('top', '0');
    iframe.style('right', '0');
    iframe.style('opacity', '0'); // 改用透明度隱藏，取消滑動效果
    iframe.style('visibility', 'hidden');
    iframe.style('transition', 'opacity 0.8s ease'); // 改為平滑淡入淡出
    iframe.style('background', '#fff'); // 避免白底透明
    iframe.style('box-shadow', '-5px 0 20px rgba(0,0,0,0.15)'); // 加入一點陰影增加層次感
  } // 結束 iframe 創建區塊

  setupLayout();
  resetGashapons();

  // 建立左側快速選單的按鈕
  let menu = select('#work-menu');
  if (menu) {
    works.forEach((w, i) => {
      let btn = createButton(w.name);
      btn.class('work-btn');
      btn.parent(menu);
      // 點擊選單按鈕時，強制轉出該週的作品
      btn.mousePressed(() => forceDrawGashapon(i));
    });

    // 新增：結束/返回按鈕
    let closeBtn = createButton('🔙 結束觀看');
    closeBtn.class('work-btn');
    closeBtn.parent(menu);
    closeBtn.style('margin-top', '20px'); // 增加與上方按鈕的間距
    closeBtn.style('background', '#d28c8c'); // 使用較深的粉色突顯這是控制按鈕
    closeBtn.style('color', '#fff');
    closeBtn.mousePressed(() => closeWorkDisplay());
  }

  // 新增：獨立的離開遊樂園按鈕 (將會在 draw 裡面跟隨扭蛋機位置)
  let exitBtn = createButton('🚪 離開遊樂園');
  exitBtn.id('exit-btn'); // 給予獨立 ID 以便 CSS 造型
  exitBtn.mousePressed(() => showOutroScreen());

  // 新增：獨立的音樂開關按鈕 (固定在畫面左下角)
  let musicBtn = createButton('🔇'); // 初始狀態為預設沒有音樂，改為單純 Icon
  musicBtn.id('music-btn');
  musicBtn.style('position', 'fixed');
  musicBtn.style('bottom', '20px');
  musicBtn.style('left', '20px');
  musicBtn.style('z-index', '1000'); // 確保按鈕在最上層
  musicBtn.style('width', '50px');   // 設定固定寬高
  musicBtn.style('height', '50px');
  musicBtn.style('padding', '0');
  musicBtn.style('font-size', '24px'); // 放大 Icon
  musicBtn.style('display', 'flex');   // 使用 Flexbox 讓 Icon 完美置中
  musicBtn.style('justify-content', 'center');
  musicBtn.style('align-items', 'center');
  musicBtn.style('background', '#8a6b5d'); // 關閉時的顏色 (深棕色)
  musicBtn.style('color', '#fff');
  musicBtn.style('border', 'none');
  musicBtn.style('border-radius', '50%'); // 改成正圓形
  musicBtn.style('cursor', 'pointer');
  musicBtn.style('box-shadow', '0 4px 10px rgba(0,0,0,0.15)');
  musicBtn.style('transition', 'all 0.3s ease');

  // 滑鼠懸停與點擊特效
  musicBtn.mouseOver(() => musicBtn.style('transform', 'scale(1.05) rotate(15deg)')); // 新增：懸停時放大並微轉 15 度
  musicBtn.mouseOut(() => musicBtn.style('transform', 'scale(1) rotate(0deg)'));     // 修改：移開時恢復不旋轉的狀態
  musicBtn.mousePressed(() => {
    if (bgm && bgm.isLoaded()) {
      if (bgm.isPlaying()) {
        bgm.pause();
        musicBtn.html('🔇');
        musicBtn.style('background', '#8a6b5d'); // 變成深棕色
      } else {
        userStartAudio(); // 解除瀏覽器靜音限制
        bgm.loop();
        musicBtn.html('🎶');
        musicBtn.style('background', '#b5838d'); // 恢復粉棕色
      }
    }
  });

  // 綁定「開啟旅程」按鈕，點擊後開始播放背景音樂
  let startBtn = select('#start-btn');
  if (startBtn) {
    startBtn.mousePressed(() => { // 當點擊「開啟旅程」按鈕時
      // 加入 userStartAudio() 喚醒瀏覽器的音效引擎，解除靜音限制
      userStartAudio().then(() => {
        // 確保音樂有載入成功才播放，避免報錯
        if (bgm && bgm.isLoaded() && !bgm.isPlaying()) {
          bgm.setVolume(0.15); // 設定音量
          bgm.loop(); // 循環播放音樂
          
          // 同步更新左下角的音樂按鈕狀態為開啟
          let mBtn = select('#music-btn');
          if (mBtn) {
            mBtn.html('🎶');
            mBtn.style('background', '#b5838d');
          }
        }
      });
    });
  } // 結束 startBtn 綁定區塊
}

// 負責計算所有響應式佈局的函式
function setupLayout() {
  // 畫布始終保持滿版
  resizeCanvas(windowWidth, windowHeight);

  // 調整 iframe 樣式
  let iframeEl = select('#work-display');
  if (iframeEl) {
    iframeEl.style('width', `60vw`).style('height', `${windowHeight}px`);
  }

  // 計算扭蛋機的中心位置與縮放比例
  // 新設計：如果還沒抽過扭蛋，機器在正中間 (50%) 且「全螢幕放大」；抽過後，退到左側 40% 且「縮小」
  let targetX = isFirstGachaDrawn ? windowWidth * 0.2 : windowWidth * 0.5; // 根據是否已抽過扭蛋來決定機器位置
  let targetScale = isFirstGachaDrawn ? 
    min((windowWidth * 0.35) / 400, (height * 0.75) / 550) : // 退到側邊時較小
    min((windowWidth * 0.8) / 400, (height * 0.9) / 550);    // 在中間時極大化

  machineX = targetX; // 當視窗重置大小時，直接讓機器到定位
  machineY = height / 1.8; // 將機器稍微往下放
  machineScale = targetScale; // 直接套用目標縮放比例

  marqueeX = width; // 初始化跑馬燈位置在畫面最右側

  // 初始化背景裝飾元素
  bgElements = [];
  let colors = ['#fec5bb', '#fcd5ce', '#fae1dd', '#e8e8e4', '#ece4db', '#ffd7ba', '#fec89a', '#a2d2ff'];
  for (let i = 0; i < 35; i++) {
    let c = color(random(colors));
    c.setAlpha(150); // 設定半透明
    bgElements.push({
      type: random(['balloon', 'star', 'cloud', 'confetti']),
      x: random(width),
      y: random(height),
      s: random(0.5, 1.5) * machineScale,
      speed: random(0.3, 1.2) * machineScale,
      color: c,
      angle: random(TWO_PI),
      rotSpeed: random(-0.02, 0.02)
    });
  }
}

// 重設/初始化所有扭蛋
function resetGashapons() {
  gashapons = []; // 清空陣列

  let colors = [
    color('#fec5bb'), // powder-blush
    color('#fcd5ce'), // almond-silk
    color('#fae1dd'), // soft-blush
    color('#e8e8e4'), // alabaster-grey
    color('#ece4db'), // linen
    color('#ffd7ba'), // peach-fuzz
    color('#fec89a'), // peach-glow
    color('#a2d2ff')  // sky-blue
  ];

  for (let i = 0; i < works.length; i++) {
    // 在扭蛋機的相對位置生成扭蛋，並轉換為全域座標
    let startX = machineX + random(-50, 50) * machineScale;
    let startY = machineY - 50 * machineScale + random(-20, 20) * machineScale;
    gashapons.push(new Gashapon(startX, startY, colors[i % colors.length], works[i]));
  }
}
// 當視窗大小改變時，重新佈局
function windowResized() {
  setupLayout();
  resetGashapons();
}

// 美化：繪製漸層背景
function drawGradientBackground() {
  // --- 新增：夢幻日夜交替邏輯 ---
  let time = cos(frameCount * 0.0015); // -1 到 1 的平滑循環，數值越小變換越慢 (目前約 70 秒一輪)
  let topC, bottomC;

  if (time > 0) {
    // 白天到黃昏 (time: 1 -> 0)
    let dayTop = color('#a2d2ff');       // 晴空藍
    let dayBottom = color('#fec5bb');    // 櫻花粉
    let sunsetTop = color('#b19cd9');    // 夢幻紫丁香 (替代原來的晚霞粉紅，讓過渡更柔和)
    let sunsetBottom = color('#ffb4a2'); // 晚霞蜜桃粉 (替代原來的暖黃，避免漸層變髒)
    topC = lerpColor(sunsetTop, dayTop, time);
    bottomC = lerpColor(sunsetBottom, dayBottom, time);
  } else {
    // 黃昏到黑夜 (time: 0 -> -1)
    let ratio = time + 1; // 將比例轉換為 0(黑夜) 到 1(黃昏)
    let nightTop = color('#121026');     // 神秘夜空深藍 (替代原來的純黑，保留奇幻感)
    let nightBottom = color('#4d4577');  // 星夜魔法紫 (替代原本的灰藍)
    let sunsetTop = color('#b19cd9');    // 同上，夢幻紫丁香
    let sunsetBottom = color('#ffb4a2'); // 同上，晚霞蜜桃粉
    topC = lerpColor(nightTop, sunsetTop, ratio);
    bottomC = lerpColor(nightBottom, sunsetBottom, ratio);
  }

  // 保留之前的魔法細節：如果有抽中扭蛋，將扭蛋的專屬顏色淡淡地混合進底部漸層
  if (selectedGachaColor) {
    bottomC = lerpColor(bottomC, selectedGachaColor, 0.35);
  }

  targetTopColor = topC;
  targetBottomColor = bottomC;

  // 緩動更新當前背景色，製造平滑的漸變動畫
  currentTopColor = lerpColor(currentTopColor, targetTopColor, 0.03);
  currentBottomColor = lerpColor(currentBottomColor, targetBottomColor, 0.03);
  
  // 效能優化：每 2 像素畫一條線來繪製漸層
  // 稍微畫超出畫面邊界，避免「地震」震動時露出網頁白底
  for (let i = -15; i < height + 15; i += 2) {
    let inter = map(i, 0, height, 0, 1);
    let c = lerpColor(currentTopColor, currentBottomColor, inter);
    stroke(c);
    strokeWeight(2);
    line(-15, i, width + 15, i);
  }

  // 加入遠景的摩天輪與馬戲團帳篷
  drawFerrisWheel(); // 繪製摩天輪
  drawCircusTent();

  // 新增：設定裁切區域 (Clipping Mask)，確保裝飾元素不會畫進跑馬燈橫幅的範圍
  push();
  drawingContext.beginPath();
  drawingContext.rect(-15, 40 * machineScale, width + 30, height + 30); // 稍微放寬裁切範圍，配合地震特效
  drawingContext.clip();

  // 繪製背景裝飾元素
  for (let i = 0; i < bgElements.length; i++) {
    let b = bgElements[i];
    
    push();
    translate(b.x, b.y);
    rotate(b.angle);
    scale(b.s);
    
    fill(b.color);
    noStroke();
    
    if (b.type === 'balloon') {
      // 氣球
      ellipse(0, 0, 30, 40);
      triangle(0, 20, -5, 25, 5, 25);
      stroke(255, 150);
      strokeWeight(1);
      noFill();
      line(0, 25, 0, 50);
      // 氣球高光
      noStroke();
      fill(255, 255, 255, 150);
      ellipse(-5, -8, 8, 12);
    } else if (b.type === 'star') {
      // 星星
      drawStar(0, 0, 10, 20, 5);
    } else if (b.type === 'cloud') {
      // 雲朵
      fill(255, 255, 255, 120); // 雲朵固定用白色半透明
      ellipse(0, 0, 60, 20);
      ellipse(-15, -10, 30, 30);
      ellipse(15, -5, 25, 25);
    } else if (b.type === 'confetti') {
      // 彩紙碎
      rectMode(CENTER);
      rect(0, 0, 15, 8, 3);
    }
    pop();
    
    b.y -= b.speed; // 裝飾元素向上漂浮
    if (b.type !== 'cloud' && b.type !== 'balloon') {
      b.angle += b.rotSpeed; // 旋轉
    } else {
      b.angle = sin(frameCount * 0.02 + i) * 0.1; // 微微搖擺
    }
    
    b.x += sin(frameCount * 0.02 + i) * 0.5; 
    
    // 修改：當完全飄進跑馬燈的範圍後，提早從畫面底部重新生成
    if (b.y < 40 * machineScale - 50 * b.s) {
      b.y = height + 50 * b.s;
      b.x = random(width);
    }
  } // 結束背景裝飾元素繪製迴圈
  
  pop(); // 移除裁切區域，以免影響後續要畫在頂層的扭蛋機本體
}

// 繪製星星的輔助函式
function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// 繪製背景摩天輪
function drawFerrisWheel() {
  push();
  // 將摩天輪放在畫面右側偏下
  let fwX = width * 0.85; // 摩天輪 X 座標
  let fwY = height * 0.7;
  let fwScale = machineScale * 1.5;
  
  translate(fwX, fwY);
  scale(fwScale);
  
  // 摩天輪支架
  stroke('#d8e2dc'); // 使用灰白色
  strokeWeight(8);
  line(0, 0, -100, 300);
  line(0, 0, 100, 300);
  
  // 輪軸旋轉
  let fwAngle = frameCount * 0.002;
  rotate(fwAngle);
  
  // 摩天輪的骨架
  stroke('#ece4db');
  strokeWeight(4);
  noFill();
  circle(0, 0, 360);
  circle(0, 0, 180);
  
  for (let i = 0; i < 12; i++) {
    push();
    let a = i * TWO_PI / 12;
    rotate(a);
    line(0, 0, 0, -180);
    
    // 車廂
    translate(0, -180);
    rotate(-fwAngle - a); // 讓車廂保持正向
    noStroke();
    // 給車廂不同的粉色
    let cabinColors = ['#fec5bb', '#fcd5ce', '#fae1dd', '#ffd7ba', '#fec89a', '#a2d2ff'];
    fill(cabinColors[i % cabinColors.length]);
    rectMode(CENTER);
    rect(0, 10, 35, 30, 5);
    fill('#ffffff'); // 車廂窗戶
    rect(0, 5, 25, 10, 2);
    fill(cabinColors[(i+1) % cabinColors.length]); // 頂蓋
    arc(0, -5, 35, 30, PI, TWO_PI);
    pop();
  }
  
  // 中心點
  fill('#fec89a');
  noStroke();
  circle(0, 0, 40);
  fill('#ffffff');
  circle(0, 0, 15);
  
  pop();
}

// 繪製背景馬戲團帳篷
function drawCircusTent() {
  push();
  // 放在畫面左側偏下
  let tentX = width * 0.15;
  let tentY = height * 0.75;
  let tentScale = machineScale * 1.5;
  
  translate(tentX, tentY);
  scale(tentScale);
  
  noStroke();
  
  // 帳篷底部主體
  fill('#f8edeb'); // 帳篷主體顏色
  beginShape();
  vertex(-100, 0);
  vertex(100, 0);
  vertex(90, -100);
  vertex(-90, -100);
  endShape(CLOSE);
  
  // 帳篷紅白條紋 (粉色系)
  fill('#fae1dd'); // soft-blush
  beginShape();
  vertex(-50, 0);
  vertex(-10, 0);
  vertex(-20, -100);
  vertex(-60, -100);
  endShape(CLOSE);
  
  beginShape();
  vertex(10, 0);
  vertex(50, 0);
  vertex(60, -100);
  vertex(20, -100);
  endShape(CLOSE);
  
  // 帳篷屋頂
  fill('#fec5bb'); // powder-blush
  triangle(-110, -100, 110, -100, 0, -200);
  
  // 屋頂旗幟
  stroke('#d28c8c');
  strokeWeight(2);
  line(0, -200, 0, -250);
  noStroke();
  fill('#ffd7ba');
  triangle(0, -250, 30, -235, 0, -220);

  // 帳篷門
  fill('#d28c8c');
  arc(0, 0, 40, 60, PI, TWO_PI);
  
  pop();
}

function draw() {
  // --- 全畫面地震特效 (當扭蛋機轉動時) ---
  if (isHandleAnimating) {
    translate(random(-2, 2) * machineScale, random(-3, 3) * machineScale);
  }

  drawGradientBackground();

  // 處理扭蛋機從中央滑動到左側的過渡動畫與縮放
  let targetMachineX = isFirstGachaDrawn ? windowWidth * 0.2 : windowWidth * 0.5;
  let targetMachineScale = isFirstGachaDrawn ? 
    min((windowWidth * 0.35) / 400, (height * 0.75) / 550) : 
    min((windowWidth * 0.8) / 400, (height * 0.9) / 550);

  let oldMachineX = machineX;
  let oldMachineScale = machineScale;

  machineX = lerp(machineX, targetMachineX, 0.08); // 平滑移動
  machineScale = lerp(machineScale, targetMachineScale, 0.08); // 平滑縮放

  let shiftX = machineX - oldMachineX;
  let scaleRatio = machineScale / oldMachineScale;

  if (abs(shiftX) > 0.01 || abs(scaleRatio - 1) > 0.001) {
    for (let g of gashapons) {
      // 讓現存扭蛋跟著機器一起完美移動與縮放
      let dx = g.x - oldMachineX;
      let dy = g.y - machineY;
      g.x = machineX + dx * scaleRatio;
      g.y = machineY + dy * scaleRatio;
      g.r = 15 * machineScale; // 同步縮放扭蛋大小
      g.vx *= scaleRatio;      // 同步縮放物理速度，避免亂彈
      g.vy *= scaleRatio;
      
      // 更新出口高度，避免已掉落的扭蛋在運鏡縮放時位置跑掉
      if (g.state === 'at_exit') {
        g.exitY = machineY + 110 * machineScale;
      }
    }
  }

  // 加入標題
  push();
  fill('#b5838d'); // 搭配主題的深粉棕色
  noStroke();
  textSize(24 * machineScale);
  textAlign(CENTER, CENTER);
  text("🎡 夢幻遊樂園扭蛋機 🎪", machineX, machineY - 230 * machineScale);
  pop();
  
  // --- 繪製扭蛋機本體 (使用相對座標與縮放) ---
  push();
  
  let drawX = machineX;
  let drawY = machineY;
  
  // 新增：震動特效邏輯
  if (isHandleAnimating) {
    drawX += random(-1, 1) * machineScale; // 轉動時產生細微的機身微震
    drawY += random(-1, 1) * machineScale;
  }
  if (machineShakeTimer > 0) {
    drawX += random(-4, 4) * machineScale; // 扭蛋落地時產生較大的震動
    drawY += random(-4, 4) * machineScale;
    machineShakeTimer--; // 遞減計時器
  }
  
  translate(drawX, drawY);
  scale(machineScale);

  // 美化：為本體加上陰影
  drawingContext.shadowBlur = 25 * machineScale;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.25)';
  drawingContext.shadowOffsetY = 5 * machineScale;

  // 畫下方的紅色底座 (使用相對 vertex)
  fill('#fec89a'); // peach-glow 主體
  stroke('#d28c8c');
  strokeWeight(2);
  beginShape();
  vertex(-80, 0);   // 原 (120, 250)
  vertex(80, 0);    // 原 (280, 250)
  vertex(110, 140); // 原 (310, 390)
  vertex(-110, 140);// 原 (90, 390)
  endShape(CLOSE);

  // 裝飾用：扭蛋出口
  fill('#ece4db'); // linen 內部
  stroke('#d28c8c');
  beginShape();
  vertex(-40, 90);  // 原 (160, 340)
  vertex(40, 90);   // 原 (240, 340)
  vertex(40, 130);  // 原 (240, 380)
  vertex(-40, 130); // 原 (160, 380)
  endShape(CLOSE);

  // 畫出「轉動手把」(圓形) - 加入旋轉動畫
  push(); // 儲存當前繪圖狀態，以便旋轉手把
  translate(0, 65); // 1. 將圓心移動到手把的相對位置 (原 315-250)

  // 如果正在播放動畫，就持續增加角度
  if (isHandleAnimating) {
    handleAngle += HANDLE_ANIMATION_SPEED;
    if (handleAngle >= TWO_PI) { // TWO_PI 代表 360 度
      handleAngle = 0; // 轉完一圈後歸零
      isHandleAnimating = false; // 停止動畫
    }
  }
  rotate(handleAngle); // 2. 根據角度旋轉

  fill('#ffd7ba'); // peach-fuzz 轉把
  stroke('#d28c8c');
  strokeWeight(2);
  circle(0, 0, 20 * 2); // 3. 在 (0,0) 畫出手把 (原半徑 20)
  fill('#d28c8c');
  noStroke(); // 畫手把上的細節時不描邊
  circle(-8, 0, 6); // 4. 畫出手把上的細節，它會跟著旋轉
  pop();

  // 新增：引導玩家點擊的動態文字與箭頭
  if (!isHandleAnimating) {
    push();
    // 讓文字在手把右側產生微微左右浮動的動畫
    let bounceX = 35 + sin(frameCount * 0.1) * 5;
    let alpha = 180 + 75 * sin(frameCount * 0.08); // 呼吸燈透明度特效
    
    fill(138, 107, 93, alpha); // 使用深棕色 (#8a6b5d) 加上透明度
    noStroke();
    textSize(16);
    textAlign(LEFT, CENTER);
    text("👈 點擊旋鈕", bounceX, 65); // 65 是對齊旋鈕的 Y 座標
    pop();
  }

  // 美化：清除陰影，避免影響玻璃
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetY = 0;

  // 畫上方的透明半圓形儲存槽（背景）
  fill(255, 255, 255, 80); // 玻璃透明感
  stroke(255, 255, 255, 150);
  strokeWeight(3);
  beginShape();
  for (let a = PI; a <= TWO_PI; a += 0.05) {
    // 使用相對座標與半徑 95
    let x = 0 + 95 * cos(a);
    let y = 0 + 95 * sin(a);
    vertex(x, y);
  }
  vertex(95, 0); // 原 (295, 250)
  vertex(-95, 0); // 原 (105, 250)
  endShape(CLOSE); // 結束半圓形繪製

  // 美化：在玻璃上加上高光
  noFill();
  stroke(255, 255, 255, 90);
  strokeWeight(15);
  arc(-35, -40, 100, 50, PI + 0.8, PI + 1.4);

  pop(); // --- 結束扭蛋機本體繪製 ---
  
  // 3. 更新並顯示所有扭蛋物件 (在全域座標中)
  for (let i = 0; i < gashapons.length; i++) {
    gashapons[i].update();
    gashapons[i].display();
  }

  // 4. 繪製並更新噴發的彩帶特效
  drawExplosionConfetti();

  // 5. 繪製頂部半透明跑馬燈
  drawMarquee();

  // 檢查歡迎畫面是否開啟，若開啟則暫停部分互動特效
  let introScreen = document.getElementById('intro-screen');
  let isIntroVisible = introScreen && !introScreen.classList.contains('hidden');
  let outroScreen = document.getElementById('outro-screen');
  let isOutroVisible = outroScreen && !outroScreen.classList.contains('hidden');

  // 控制離開按鈕的顯示與位置
  let exitBtn = select('#exit-btn');
  if (exitBtn) {
    if (isIntroVisible || isOutroVisible) {
      exitBtn.hide(); // 當有彈出視窗時隱藏按鈕
    } else {
      exitBtn.show();
      // 跟隨扭蛋機的位置與縮放，放置於底部正中央
      exitBtn.position(machineX - exitBtn.elt.offsetWidth / 2, machineY + 170 * machineScale);
    }
  }

  // 控制音樂開關按鈕的顯示 (在彈出視窗時隱藏)
  let mBtn = select('#music-btn');
  if (mBtn) {
    if (isIntroVisible || isOutroVisible) {
      mBtn.hide(); // 避免擋住歡迎/結尾畫面
    } else {
      mBtn.show();
    }
  }

  // 6. 互動優化：滑鼠懸停在扭蛋機旋鈕或提示文字範圍時，改變游標樣式
  let handleGlobalY = machineY + 65 * machineScale;
  let handleGlobalR = 80 * machineScale; // 判定範圍需與 mousePressed 一致
  if (!isIntroVisible && !isOutroVisible && dist(mouseX, mouseY, machineX, handleGlobalY) < handleGlobalR && !isHandleAnimating) {
    cursor('pointer'); // 顯示點擊手勢
  } else {
    cursor('default'); // 恢復預設游標
  }
}

function mousePressed() { // 當滑鼠點擊時觸發
  // 如果歡迎畫面或結尾畫面還沒完全隱藏，不要觸發畫布的點擊事件（防止點擊穿透）
  let introScreen = document.getElementById('intro-screen');
  let outroScreen = document.getElementById('outro-screen');
  if ((introScreen && !introScreen.classList.contains('hidden')) || 
      (outroScreen && !outroScreen.classList.contains('hidden'))) {
    return;
  }

  // 互動邏輯：當滑鼠點擊手把範圍時
  // 計算手把在全域座標中的位置與半徑
  let handleGlobalY = machineY + 65 * machineScale; // (315 - 250) 等於 65
  let handleGlobalR = 80 * machineScale; // 放寬點擊判定範圍，讓包含「點擊旋鈕」文字的區域也能點到
  let d = dist(mouseX, mouseY, machineX, handleGlobalY);

  // 加上 !isHandleAnimating 判斷，避免在動畫播放中重複觸發
  if (d < handleGlobalR && !isHandleAnimating) {
    isHandleAnimating = true; // 開始播放動畫

    // 如果已經抽過扭蛋，先將右側作品畫面滑出並清空，營造等待新作品的期待感
    if (isFirstGachaDrawn) {
      select('#work-display').style('opacity', '0');
      select('#work-display').style('visibility', 'hidden');
      select('#work-display').attribute('src', ''); 
    }

    // 將已經掉出來的扭蛋放回機器內，讓畫面保持乾淨，避免扭蛋重疊
    for (let i = 0; i < gashapons.length; i++) {
      if (gashapons[i].state === 'at_exit') {
        gashapons[i].reset();
      }
    }

    // 使用 for 迴圈遍歷 array，讓所有扭蛋產生震動位移
    for (let i = 0; i < gashapons.length; i++) {
      // 只搖晃還在機器內部的扭蛋
      if (gashapons[i].state === 'inside') {
        gashapons[i].shake();
      }
    }

    // 1. 找出所有在機器內的扭蛋
    const availableGashapons = gashapons.filter(g => g.state === 'inside');
    
    // 2. 如果還有可用的扭蛋，就隨機選一顆出來
    if (availableGashapons.length > 0) {
      const selectedGashapon = random(availableGashapons);
      
      // 3. 延遲 400 毫秒（等旋鈕轉完）再讓扭蛋掉落
      setTimeout(() => {
        selectedGashapon.startFalling();
      }, 400);
    } // 結束 availableGashapons 判斷
  } // 結束手把點擊判斷
}

// --- 點擊左側選單強制轉出特定扭蛋 ---
function forceDrawGashapon(index) {
  if (isHandleAnimating) return; // 如果正在轉動中就先忽略點擊

  isHandleAnimating = true; // 啟動把手旋轉動畫

  // 如果已經抽過扭蛋，先將右側作品畫面滑出並清空
  if (isFirstGachaDrawn) {
    select('#work-display').style('opacity', '0');
    select('#work-display').style('visibility', 'hidden');
    select('#work-display').attribute('src', ''); 
  }

  let targetGacha = gashapons[index];

  // 將所有已經掉出來的扭蛋放回機器內
  for (let i = 0; i < gashapons.length; i++) {
    if (gashapons[i].state === 'at_exit') {
      gashapons[i].reset();
    }
  }
  
  // 搖晃所有在機器內部的扭蛋
  for (let i = 0; i < gashapons.length; i++) {
    if (gashapons[i].state === 'inside') gashapons[i].shake();
  }

  setTimeout(() => {
    targetGacha.startFalling();
  }, 400);
}

// --- 更新選單按鈕的啟用狀態 (亮起/反白) ---
function updateMenuActive(index) {
  let btns = document.querySelectorAll('.work-btn');
  btns.forEach((btn, i) => {
    if(i === index) btn.classList.add('active');
    else btn.classList.remove('active'); // 移除其他按鈕的 active 狀態
  });
}

// --- 結束觀看邏輯 ---
function closeWorkDisplay() {
  if (isHandleAnimating) return; // 若正在轉動則不處理

  isFirstGachaDrawn = false; // 重置狀態，讓扭蛋機準備回到畫面中央

  // 1. 隱藏右側作品畫面與左側選單
  select('#work-display').style('opacity', '0');
  select('#work-display').style('visibility', 'hidden');
  select('#work-display').attribute('src', ''); // 清空網址，停止背景作品的音樂或影片
  document.getElementById('work-menu').style.left = '-200px';

  // 2. 移除左側按鈕的亮起狀態 (-1 代表沒有任何按鈕被選中)
  updateMenuActive(-1);

  // 3. 將已經掉出來的扭蛋放回機器內
  for (let i = 0; i < gashapons.length; i++) {
    if (gashapons[i].state === 'at_exit') {
      gashapons[i].reset();
    }
  }

  // 4. 清除選中的扭蛋顏色，讓背景恢復純粹的日夜交替
  selectedGachaColor = null;
}

// --- 顯示結尾畫面 ---
function showOutroScreen() {
  closeWorkDisplay(); // 先收起右側作品與左側選單，讓背景乾淨
  let outroScreen = select('#outro-screen');
  if (outroScreen) {
    outroScreen.removeClass('hidden'); // 移除隱藏 class，顯示結尾卡片
    // 觸發全域的結尾打字機動畫 (定義在 index.html)
    if (typeof window.startOutroTypeWriter === 'function') {
      window.startOutroTypeWriter();
    }

    // 新增：動態產生「回到起始頁面」的按鈕
    let restartBtn = select('#restart-btn');
    if (!restartBtn) {
      restartBtn = createButton('🔄 回到起始頁面');
      restartBtn.id('restart-btn');
      restartBtn.parent(outroScreen); // 確保按鈕被放在結尾畫面的容器中
      
      // 設定按鈕樣式，使其融入遊樂園風格
      restartBtn.style('display', 'block');
      restartBtn.style('margin', '30px auto 0'); // 在卡片內部置中並與上方保持距離
      restartBtn.style('padding', '12px 24px');
      restartBtn.style('font-size', '16px');
      restartBtn.style('background', '#b5838d'); // 主題的深粉棕色
      restartBtn.style('color', '#fff');
      restartBtn.style('border', 'none');
      restartBtn.style('border-radius', '20px');
      restartBtn.style('cursor', 'pointer');
      restartBtn.style('box-shadow', '0 4px 10px rgba(0,0,0,0.15)');
      restartBtn.style('transition', 'all 0.3s ease'); // 新增：平滑過渡效果
      
      // 新增：滑鼠懸停效果 (變色 + 發光 + 微放大)
      restartBtn.mouseOver(() => {
        restartBtn.style('background', '#d28c8c'); // 變成較明亮的粉紅色
        restartBtn.style('box-shadow', '0 0 15px rgba(210, 140, 140, 0.8)'); // 加上同色系的發光效果
        restartBtn.style('transform', 'scale(1.05)'); // 微微放大
      });

      // 新增：滑鼠移開時恢復原狀
      restartBtn.mouseOut(() => {
        restartBtn.style('background', '#b5838d'); // 恢復深粉棕色
        restartBtn.style('box-shadow', '0 4px 10px rgba(0,0,0,0.15)'); // 恢復原本的陰影
        restartBtn.style('transform', 'scale(1)'); // 恢復原本大小
      });
      
      // 點擊後重新載入網頁，確保音樂與所有動畫狀態完美重置
      restartBtn.mousePressed(() => {
        window.location.reload();
      });
    }
  }
}

// --- 噴發彩帶特效邏輯 ---
function triggerConfetti() {
  // 使用與背景裝飾相同的柔和遊樂園配色
  let colors = ['#fec5bb', '#fcd5ce', '#fae1dd', '#e8e8e4', '#ece4db', '#ffd7ba', '#fec89a', '#a2d2ff', '#d28c8c'];
  for (let i = 0; i < 60; i++) { // 一次噴發 60 片彩帶
    explosionConfettis.push({
      x: machineX + random(-30, 30) * machineScale,
      y: machineY - 100 * machineScale, // 從扭蛋機玻璃罩上方噴出
      vx: random(-12, 12) * machineScale, // 水平爆開的隨機速度
      vy: random(-15, -5) * machineScale, // 向上噴發的隨機速度
      c: color(random(colors)),
      size: random(8, 16) * machineScale,
      angle: random(TWO_PI),
      rotSpeed: random(-0.3, 0.3)
    });
  }
}

function drawExplosionConfetti() {
  // 倒序迴圈，這樣當彩帶掉出畫面被移除時，才不會影響陣列索引
  for (let i = explosionConfettis.length - 1; i >= 0; i--) {
    let p = explosionConfettis[i];
    p.vy += 0.5 * machineScale; // 套用重力加速度，讓彩帶往下掉
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.rotSpeed; // 旋轉彩帶

    push();
    translate(p.x, p.y);
    rotate(p.angle);
    noStroke();
    fill(p.c);
    rectMode(CENTER);
    rect(0, 0, p.size, p.size * 0.5, 3 * machineScale); // 畫出圓角長方形彩帶
    pop();

    // 如果彩帶掉出畫面，就從陣列中移除以節省效能
    if (p.y > height + 50 * machineScale) {
      explosionConfettis.splice(i, 1);
    }
  }
}

// --- 跑馬燈特效邏輯 ---
function drawMarquee() {
  push();
  // 1. 畫半透明背景橫幅
  fill(255, 255, 255, 120); // 白色，稍微透明
  noStroke();
  rectMode(CORNER);
  rect(-15, -15, width + 30, 40 * machineScale + 15); // 橫幅稍微加寬加高，避免地震時穿幫

  // 2. 畫文字
  fill('#8a6b5d'); // 搭配主題的深棕色
  textSize(18 * machineScale);
  textAlign(LEFT, CENTER);
  text(marqueeText, marqueeX, 20 * machineScale);

  // 3. 更新位置：由右向左移動
  marqueeX -= 2 * machineScale; 
  if (marqueeX < -textWidth(marqueeText)) {
    marqueeX = width; // 若文字完全移出畫面左側，則從右側重新進入
  }
  pop();
}

// 定義扭蛋 Gashapon Class
class Gashapon {
  constructor(x, y, col, work) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2) * machineScale; // 加入縮放比例，確保不同螢幕大小移動速度一致
    this.vy = random(-2, 2) * machineScale;
    this.color = col;
    this.url = work.url;
    this.name = work.name;
    this.r = 15 * machineScale; // 扭蛋半徑需要根據機器縮放
    this.state = 'inside'; // 扭蛋狀態: 'inside', 'falling', 'at_exit'
    this.exitY = 0; // 儲存出口的 Y 座標，用於彈跳
    this.angle = random(TWO_PI); // 記錄扭蛋旋轉的角度
  }

  update() {
    // 如果扭蛋正在掉落，執行獨立的掉落動畫邏輯
    if (this.state === 'falling') {
      // 讓扭蛋朝著出口中心點移動
      let targetX = machineX; // 扭蛋機的中心 X 座標
      this.x += (targetX - this.x) * 0.08;

      // 加速下墜
      this.vy += 1.2 * machineScale; // 加入縮放比例
      this.y += this.vy;
      this.angle += 0.2; // 掉落時持續旋轉

      // 掉落到出口位置時停止並改變狀態
      let stopY = machineY + 110 * machineScale;
      if (this.y >= stopY) {
        machineShakeTimer = 12; // 新增：觸發扭蛋機落地震動特效 (維持 12 幀)
        triggerConfetti(); // 🎈 新增：觸發噴發彩帶！

        // --- 新增：扭蛋確實掉出後，才顯示作品與更新介面 ---
        select('#work-display').style('opacity', '1'); // 取消滑動，改為直接淡入顯示
        select('#work-display').style('visibility', 'visible');
        if (!isFirstGachaDrawn) {
          isFirstGachaDrawn = true;
          document.getElementById('work-menu').style.left = '0px'; // 讓左側選單也跟著滑入
        }
        select('#work-display').attribute('src', this.url); // 更新 iframe 網址
        let selectedIndex = works.findIndex(w => w.name === this.name);
        updateMenuActive(selectedIndex); // 更新左側選單亮起狀態
        selectedGachaColor = this.color; // 變更背景顏色漸層

        this.y = stopY;
        this.exitY = stopY; // 記錄下停止時的 Y 座標
        this.state = 'at_exit';
      }
      return; // 跳過後續的一般物理運算
    }

    // 如果扭蛋停留在出口
    if (this.state === 'at_exit') {
      // --- 微微彈跳特效 ---
      let bounceSpeed = 0.1;
      let bounceHeight = 3 * machineScale;
      this.y = this.exitY + sin(frameCount * bounceSpeed) * bounceHeight;
      
      return; // 停留時不執行一般物理運算
    }

    // 簡單重力邏輯
    this.vy += 0.6 * machineScale; // 重力加速度加入縮放比例
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vx * 0.05; // 依照水平移動速度產生滾動旋轉效果

    // 碰撞底部邏輯 (平底 y = 250)
    let bottomY = machineY; // 機器底座的 Y 座標
    if (this.y + this.r > bottomY) {
      this.y = bottomY - this.r;
      this.vy *= -0.75; // 彈力係數
      this.vx *= 0.9;   // 地面摩擦力
    }

    // 限制在玻璃圓頂內
    let cx = machineX;
    let cy = machineY; // 機器中心 Y 座標
    let domeR = 95 * machineScale; // 圓頂的縮放後半徑

    let d = dist(this.x, this.y, cx, cy);
    if (d + this.r > domeR && this.y < bottomY) {
      // 如果超出半圓形，將其往內推並反轉速度
      let angle = atan2(this.y - cy, this.x - cx);
      this.x = cx + (domeR - this.r) * cos(angle);
      this.y = cy + (domeR - this.r) * sin(angle);
      this.vx *= -0.8;
      this.vy *= -0.8;
    }
  }

  display() {
    // --- 特效：如果在出口，就加入發光效果 ---
    if (this.state === 'at_exit') {
      // 複製一份顏色來設定透明度，避免影響原始顏色
      let glowColor = color(hue(this.color), saturation(this.color), brightness(this.color), 0.6 * 255); // 調整透明度
      // 使用 sin() 讓光暈產生呼吸感
      drawingContext.shadowBlur = 15 + sin(frameCount * 0.15) * 10;
      drawingContext.shadowColor = glowColor;
    }

    // --- 繪製立體質感的扭蛋本體 ---
    push();
    translate(this.x, this.y);
    rotate(this.angle); // 跟隨物理碰撞旋轉
    
    stroke('#d28c8c');
    strokeWeight(1);

    // 1. 畫下半部 (有顏色的塑膠殼)
    fill(this.color);
    arc(0, 0, this.r * 2, this.r * 2, 0, PI, CHORD);

    // 2. 畫上半部 (透明白色的塑膠殼)
    fill(255, 255, 255, 210);
    arc(0, 0, this.r * 2, this.r * 2, PI, TWO_PI, CHORD); // 上半部透明殼

    // 3. 畫中間的凸起環帶 (結合線)
    fill('#ece4db');
    rectMode(CENTER);
    rect(0, 0, this.r * 2, this.r * 0.15, this.r * 0.1);
    pop();

    // --- 清除特效，避免影響後續繪圖 ---
    drawingContext.shadowBlur = 0;

    // 如果在出口，就顯示作品名稱標籤 (它會跟著彈跳)
    if (this.state === 'at_exit') {
      this.drawNameTag();
    }

    // --- 繪製不跟隨旋轉的立體高光 (模擬上方固定光源的玻璃反光) ---
    push();
    translate(this.x - this.r * 0.3, this.y - this.r * 0.3); // 調整高光位置
    rotate(-PI / 4);
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, this.r * 0.6, this.r * 0.25);
    pop();
  }

  shake() {
    // 賦予向上的強烈速度與隨機水平速度，模擬扭蛋機轉動翻攪的效果
    this.vy = random(-8, -14) * machineScale; // 加上縮放比例，否則大螢幕會跳不起來
    this.vx = random(-6, 6) * machineScale;
  }

  startFalling() {
    this.state = 'falling';
    this.vx = 0;
    this.vy = 0;
  }

  reset() {
    this.state = 'inside';
    // 將扭蛋重設到玻璃罩上方，讓它重新自然落下
    this.x = machineX + random(-40, 40) * machineScale;
    this.y = machineY - (100 + random(20)) * machineScale;
    this.vx = random(-1, 1) * machineScale;
    this.vy = 0;
  }

  drawNameTag() { // 繪製扭蛋名稱標籤
    push();
    
    // --- 計算標籤位置與樣式 ---
    let tagX = this.x + this.r * 1.5;
    let tagY = this.y;
    let textSizeValue = 14 * machineScale;
    let padding = 8 * machineScale;

    // --- 繪製標籤背景 ---
    textSize(textSizeValue);
    let textW = textWidth(this.name);
    fill(255, 255, 255, 220); // 半透明白色背景
    stroke(180);
    strokeWeight(1); // 標籤邊框
    rect(tagX, tagY - (textSizeValue / 2 + padding), textW + padding * 2, textSizeValue + padding * 2, 5 * machineScale);

    // --- 繪製文字 ---
    fill('#8a6b5d');
    noStroke();
    textAlign(LEFT, CENTER);
    text(this.name, tagX + padding, tagY);
    pop();
  }
}
