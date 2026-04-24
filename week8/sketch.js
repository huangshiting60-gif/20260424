let capture;
let pg;
let camPg; // 新增一個獨立的畫布來處理攝影機影像，解決瀏覽器濾鏡失效問題
let bubbles = []; // 建立一個陣列來儲存泡泡物件
let bgElements = []; // 建立一個陣列來儲存背景幾何小圖案
let currentFilter = 'none'; // 儲存目前的濾鏡狀態

function setup() {
  // 第一步驟：產生一個全螢幕的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 取得攝影機影像
  capture = createCapture(VIDEO);
  
  // 隱藏預設產生的 HTML 影片元素，因為我們只想把影像繪製在 Canvas 畫布上
  capture.hide();
  
  // 將影像的繪製模式設定為 CENTER，這樣座標就會從影像的正中心點計算，方便置中
  imageMode(CENTER);
  
  // 產生一個與視訊畫面顯示大小相同的 graphics 物件
  pg = createGraphics(width * 0.6, height * 0.6);
  camPg = createGraphics(width * 0.6, height * 0.6); // 建立攝影機專用的暫存畫布
  
  // 減少泡泡的數量，避免畫面太雜亂 (從 80 改為 25)
  for (let i = 0; i < 25; i++) {
    bubbles.push({
      x: random(width * 0.6), // 初始位置限制在視訊畫面的寬度內
      y: random(height * 0.6), // 初始位置限制在視訊畫面的高度內
      size: random(10, 40),
      speed: random(1, 3),
      offset: random(TWO_PI) // 給予每個泡泡不同的搖擺起點
    });
  }

  // 產生 50 個散佈在背景的小圖案 (星星與小圓點)
  for (let i = 0; i < 50; i++) {
    bgElements.push({
      x: random(windowWidth),
      y: random(windowHeight),
      size: random(8, 20),
      type: random(['star', 'dot']), // 隨機決定是星星還是圓點
      color: random(['#FFD1DC', '#FFB6C1', '#E6E6FA', '#FFFACD', '#E0FFFF']), // 柔和的馬卡龍色
      rot: random(TWO_PI), // 初始旋轉角度
      speed: random(-0.02, 0.02) // 旋轉速度
    });
  }

  // 建立按鈕美化的 CSS 樣式（半透明圓角玻璃質感）
  let style = document.createElement('style');
  style.innerHTML = `
    .custom-btn {
      background: rgba(255, 255, 255, 0.5);
      border: 2px solid #fff;
      border-radius: 25px;
      padding: 8px 16px;
      font-size: 15px;
      font-weight: bold;
      color: #555;
      cursor: pointer;
      backdrop-filter: blur(4px); /* 毛玻璃效果 */
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 100; /* 確保按鈕在最上層，不會被畫布或其他圖層擋住導致無法點擊 */
    }
    .custom-btn:hover {
      background: rgba(255, 255, 255, 0.9);
      color: #ff85a2; /* 滑鼠移過去文字會變馬卡龍粉 */
      transform: translateY(-3px); /* 向上浮起效果 */
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }
  `;
  document.head.appendChild(style);

  // 建立濾鏡選擇與擷取畫面按鈕，套用 custom-btn 樣式並調整間距
  let btnNormal = createButton('正常');
  btnNormal.position(20, 20);
  btnNormal.class('custom-btn');
  btnNormal.mousePressed(() => currentFilter = 'none');

  let btnGray = createButton('灰階');
  btnGray.position(110, 20);
  btnGray.class('custom-btn');
  btnGray.mousePressed(() => currentFilter = 'grayscale(1)'); // 改用 1 代替 100%，提升不同瀏覽器的相容性

  let btnInvert = createButton('負片');
  btnInvert.position(200, 20);
  btnInvert.class('custom-btn');
  btnInvert.mousePressed(() => currentFilter = 'invert(1)');

  let btnSepia = createButton('復古');
  btnSepia.position(290, 20);
  btnSepia.class('custom-btn');
  btnSepia.mousePressed(() => currentFilter = 'sepia(1)');

  let btnMosaic = createButton('馬賽克');
  btnMosaic.position(380, 20);
  btnMosaic.class('custom-btn');
  btnMosaic.mousePressed(() => currentFilter = 'mosaic');

  let btnCapture = createButton('📸 擷取畫面');
  btnCapture.position(470, 20); // 為了挪出空間，將擷取按鈕往右移
  btnCapture.class('custom-btn');
  btnCapture.mousePressed(() => saveCanvas('my_snapshot', 'png'));
}

function draw() {
  // 改用溫柔的單色背景（薰衣草淡粉）取代漸層，讓整體風格更清爽乾淨
  background('#FFF0F5');
  
  // 繪製背景的幾何小圖案
  push();
  noStroke();
  for (let el of bgElements) {
    fill(el.color);
    if (el.type === 'dot') {
      circle(el.x, el.y, el.size);
    } else if (el.type === 'star') {
      push();
      translate(el.x, el.y);
      rotate(el.rot);
      el.rot += el.speed; // 讓星星產生緩慢旋轉的動畫
      drawStar(0, 0, el.size / 2.5, el.size, 5); // 呼叫自訂的畫星星函式
      pop();
    }
  }
  pop();

  // 計算影像的顯示大小為整個畫布寬高比例的 60%
  let imgWidth = width * 0.6;
  let imgHeight = height * 0.6;
  
  // --- 新增：將攝影機影像先畫到 camPg 並處理好左右翻轉 ---
  // 完美解決某些瀏覽器無法對原生 Video 元素同時套用翻轉與 CSS 濾鏡的問題
  camPg.push();
  camPg.translate(camPg.width, 0);
  camPg.scale(-1, 1);
  camPg.image(capture, 0, 0, camPg.width, camPg.height);
  camPg.pop();

  // 將擷取的攝影機影像繪製在畫布的正中間，並修正左右顛倒的問題
  push();
  translate(width / 2, height / 2); // 將畫布原點移動到中心
  
  // 【修正】先單獨畫一個透明的底塊來產生陰影，避免和影像濾鏡一起計算時發生衝突
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 8;
  drawingContext.shadowBlur = 25;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.15)';
  noStroke();
  fill(255); // 畫一個白底，等下會被影片完全蓋住
  rectMode(CENTER);
  rect(0, 0, imgWidth, imgHeight);
  
  // 【重要】關閉陰影！避免它吃掉後面的 video filter 濾鏡效果
  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0)'; // 更換為標準全透明寫法，相容性更高
  
  if (currentFilter === 'mosaic') {
    // 根據指示：以 20x20 為單位分隔畫面，產生黑白馬賽克效果
    camPg.loadPixels(); // 改由暫存的 camPg 載入已經翻轉好的像素資料
    if (camPg.pixels.length > 0) {
      let span = 20; // 寬高 20*20 為一個單位
      
      push();
      translate(-imgWidth / 2, -imgHeight / 2); // 移至畫面的左上角開始繪製
      noStroke();
      rectMode(CORNER);
      for (let y = 0; y < camPg.height; y += span) {
        for (let x = 0; x < camPg.width; x += span) {
          let index = (x + y * camPg.width) * 4; // 取得像素陣列中 RGBA 的索引
          let r = camPg.pixels[index];
          let g = camPg.pixels[index + 1];
          let b = camPg.pixels[index + 2];
          let gray = (r + g + b) / 3; // 取平均值轉換為灰階數字
          
          fill(gray); // 將該數字當作單位顏色
          rect(x, y, span, span); // 由於 camPg 尺寸已符合畫布，不再需要計算比例，直接繪製
        }
      }
      pop();
    }
  } else {
    drawingContext.filter = currentFilter; // 套用選擇的 CSS 濾鏡
    image(camPg, 0, 0); // 繪製已經處理好翻轉的 camPg 畫布
    drawingContext.filter = 'none'; // 恢復濾鏡設定，以免影響後面的背景與泡泡
  }
  pop();
  
  // 在 pg 上面繪製內容（範例：黃色粗邊框與置中文字）
  pg.clear(); // 每一幀清空背景保持透明，避免殘影
  
  // 繪製並更新泡泡效果（將泡泡限制在 pg，也就是視訊畫面範圍內）
  pg.push();
  pg.stroke(255, 150); // 泡泡的邊框（白色，半透明）
  pg.strokeWeight(2);
  pg.fill(255, 50); // 泡泡內部填色（更透明的白色）
  for (let b of bubbles) {
    pg.circle(b.x, b.y, b.size);
    b.y -= b.speed; // 泡泡往上升
    b.x += sin(frameCount * 0.02 + b.offset) * 1.5; // 利用 sin 函數產生左右輕微搖擺
    
    // 如果飄出 pg 上方，讓泡泡從 pg 底部重新出現
    if (b.y < -b.size) {
      b.y = pg.height + b.size;
      b.x = random(pg.width); // 出現的位置也限制在 pg 的寬度內
    }
  }
  pg.pop();

  // 美化邊框：改為乾淨的純白色粗邊框，並移除中間的測試文字以保持畫面整潔
  pg.stroke(255); 
  pg.strokeWeight(16);
  pg.noFill();
  pg.rect(0, 0, pg.width, pg.height);
  
  // 將 pg 繪製在視訊畫面的上方（放在 pop() 之後確保文字與圖形不會跟著左右顛倒）
  image(pg, width / 2, height / 2, imgWidth, imgHeight);
}

// 額外加入這個函式：當瀏覽器視窗大小改變時，畫布也會自動調整以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 確保瀏覽器改變尺寸時，pg 的大小也能同步更新為畫布的 60%
  pg.resizeCanvas(windowWidth * 0.6, windowHeight * 0.6);
  camPg.resizeCanvas(windowWidth * 0.6, windowHeight * 0.6);
}

// 繪製星星的輔助函式 (x, y, 內圓半徑, 外圓半徑, 星角數量)
function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}
