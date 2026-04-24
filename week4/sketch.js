let input;
let slider;
let sizeValueSpan;
let btn;
let etBtn;
let tkuBtn;
let colorSel;
let colorPicker;
let waveBtn;
let rainbowBtn;
let resetBtn;
let emojiSel;
let iframeDiv;
let ifrm;
let closeBtn;
let isBouncing = false;
let isWaving = false;
let isRainbow = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let colors = ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 建立頂部控制面板背景
  let controlPanel = createDiv('');
  controlPanel.position(0, 0);
  controlPanel.size(windowWidth, 90);
  controlPanel.style('background', 'rgba(255, 255, 255, 0.7)');
  controlPanel.style('backdrop-filter', 'blur(10px)');
  controlPanel.style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)');
  controlPanel.style('z-index', '1');

  // 1. 文字輸入框 (寬度增加到 200px，高度 50px，文字大小30px)
  input = createInput('淡江');
  input.position(20, 20);
  input.size(200, 50); 
  input.style('font-size', '24px');
  input.style('border', '2px solid #ddd');
  input.style('border-radius', '10px');
  input.style('padding', '0 15px');
  input.style('outline', 'none');
  input.style('z-index', '2');

  // 1.5 表情符號選擇區 (移動到輸入框旁邊，位置: 230)
  emojiSel = createSelect();
  emojiSel.position(230, 30);
  emojiSel.option('✨ 加入表情', '');
  emojiSel.option('😀'); emojiSel.option('🤣'); emojiSel.option('😍');
  emojiSel.option('✨'); emojiSel.option('🚀'); emojiSel.option('🌈');
  emojiSel.option('🎨'); emojiSel.option('🔥'); emojiSel.option('💖');
  emojiSel.option('🐱'); emojiSel.option('🐶'); emojiSel.option('🍎');
  emojiSel.style('padding', '8px');
  emojiSel.style('border-radius', '10px');
  emojiSel.style('z-index', '2');
  
  emojiSel.changed(() => {
    let emoji = emojiSel.value();
    if (emoji !== '') {
      input.value(input.value() + emoji); // 將表情符號加入輸入框
      emojiSel.value(''); // 選擇後回到提示選項
    }
  });

  // 2. 文字大小滑桿 (範圍15到80，預設30)
  let sliderLabel = createSpan('字體大小');
  sliderLabel.position(350, 15); // 向右移動以騰出空間
  sliderLabel.style('z-index', '2');
  sliderLabel.style('font-size', '12px');
  sliderLabel.style('font-weight', 'bold');
  sliderLabel.style('color', '#555');

  slider = createSlider(15, 80, 30);
  slider.position(350, 40); 
  slider.style('width', '100px');
  slider.style('z-index', '2');

  // 文字大小數值顯示 (例如: 30px)
  sizeValueSpan = createSpan(slider.value() + 'px');
  sizeValueSpan.position(405, 15); 
  sizeValueSpan.style('z-index', '2');
  sizeValueSpan.style('font-size', '14px');
  sizeValueSpan.style('color', '#555');
  
  // 當滑桿變動時，即時更新數值文字
  slider.input(() => {
    sizeValueSpan.html(slider.value() + 'px');
  });

  // 3. 跳動開關按鈕
  btn = createButton('跳動開關');
  btn.position(480, 30);
  styleButton(btn, '#6c757d');
  btn.mousePressed(() => {
    isBouncing = !isBouncing;
    btn.style('background-color', isBouncing ? '#28a745' : '#6c757d');
  });

  // 4.7 波浪效果按鈕 (移至動態特效組)
  waveBtn = createButton('波浪效果');
  waveBtn.position(590, 30);
  styleButton(waveBtn, '#6c757d');
  waveBtn.mousePressed(() => {
    isWaving = !isWaving;
    waveBtn.style('background-color', isWaving ? '#17a2b8' : '#6c757d');
  });

  // 4.8 彩虹效果按鈕 (移至動態特效組)
  rainbowBtn = createButton('彩虹效果');
  rainbowBtn.position(700, 30);
  styleButton(rainbowBtn, '#6c757d');
  rainbowBtn.mousePressed(() => {
    isRainbow = !isRainbow;
    rainbowBtn.style('background-color', isRainbow ? '#e83e8c' : '#6c757d');
  });

  // 4. 建立網站連結按鈕 (建立導覽組)
  etBtn = createButton('教育科技系');
  etBtn.position(830, 30);
  styleButton(etBtn, '#3a86ff');
  etBtn.mousePressed(() => {
    ifrm.attribute('src', 'https://www.et.tku.edu.tw');
    iframeDiv.show();
  });

  tkuBtn = createButton('淡江大學');
  tkuBtn.position(950, 30);
  styleButton(tkuBtn, '#fb5607');
  tkuBtn.mousePressed(() => {
    ifrm.attribute('src', 'https://www.tku.edu.tw');
    iframeDiv.show();
  });

  // 色彩控制組
  colorSel = createSelect();
  colorSel.position(1080, 30);
  colorSel.option('預設彩色', 'default');
  colorSel.option('海洋藍', 'ocean');
  colorSel.option('森林綠', 'forest');
  colorSel.option('糖果粉', 'candy');
  colorSel.option('夕陽紅', 'sunset');
  colorSel.option('電光紫', 'cyber');
  colorSel.option('復古風', 'vintage');
  colorSel.option('莫蘭迪', 'morandi');
  colorSel.style('padding', '8px 12px');
  colorSel.style('border-radius', '10px');
  colorSel.style('border', '1px solid #ccc');
  colorSel.style('z-index', '2');
  
  colorSel.changed(() => {
    let val = colorSel.value();
    if (val === 'default') colors = ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'];
    else if (val === 'ocean') colors = ['#012a4a', '#013a63', '#01497c', '#014f86', '#2a6f97'];
    else if (val === 'forest') colors = ['#132a13', '#31572c', '#4f772d', '#90a955', '#ecf39e'];
    else if (val === 'candy') colors = ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9'];
    else if (val === 'sunset') colors = ['#d00000', '#ff3101', '#ff7001', '#ffba08', '#3f37c9'];
    else if (val === 'cyber') colors = ['#b5179e', '#7209b7', '#560bad', '#480ca8', '#3a0ca3'];
    else if (val === 'vintage') colors = ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'];
    else if (val === 'morandi') colors = ['#9a8c98', '#c9ada7', '#f2e9e4', '#4a4e69', '#22223b'];
  });

  // 4.6 建立自訂顏色選擇器 (在顏色選單右邊約 130px)
  colorPicker = createColorPicker('#3a86ff'); 
  colorPicker.position(1220, 35);
  colorPicker.style('height', '30px');
  colorPicker.input(() => {
    colors = [colorPicker.value()]; // 當選取顏色時，將全域色票改為單一選定顏色
  });

  // 4.9 重置按鈕
  resetBtn = createButton('全部重置');
  resetBtn.position(1310, 30); 
  styleButton(resetBtn, '#dc3545');
  resetBtn.mousePressed(() => {
    isBouncing = false;
    isWaving = false;
    isRainbow = false;
    input.value('淡江');
    slider.value(30);
    sizeValueSpan.html('30px'); // 重置時也要更新數值顯示
    emojiSel.value('');
    colors = ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'];
    btn.style('background-color', '#6c757d');
    waveBtn.style('background-color', '#6c757d');
    rainbowBtn.style('background-color', '#6c757d');
  });

  // 5. 建立 iframeDiv (視窗四周各 200px 內距)
  iframeDiv = createDiv();
  iframeDiv.position(200, 200);
  iframeDiv.size(windowWidth - 400, windowHeight - 400);
  iframeDiv.style('opacity', '0.95'); // 設定 95% 透明度
  iframeDiv.style('background-color', 'white');
  iframeDiv.style('position', 'fixed'); // 確保內部絕對定位有效
  iframeDiv.style('cursor', 'move');    // 提示使用者此區塊可拖拽
  iframeDiv.style('z-index', '100');    // 確保整個視窗在最上層
  iframeDiv.style('box-shadow', '0 4px 15px rgba(0,0,0,0.3)'); // 增加陰影提升辨識度
  iframeDiv.hide(); // 預設隱藏 iframe

  // 設定拖拽啟動邏輯
  iframeDiv.mousePressed((e) => {
    isDragging = true;
    // 計算滑鼠點擊位置與視窗左上角的偏移量
    dragOffsetX = iframeDiv.elt.offsetLeft - mouseX;
    dragOffsetY = iframeDiv.elt.offsetTop - mouseY;
    ifrm.style('pointer-events', 'none'); // 拖拽時禁用 iframe 事件攔截
  });
  
  // 將 iframe 放入 iframeDiv 中
  ifrm = createElement('iframe');
  ifrm.parent(iframeDiv);
  ifrm.style('width', '100%');
  ifrm.style('height', '100%');
  ifrm.style('border', 'none'); 

  // 6. 建立關閉按鈕 (放在 iframe 之後建立，確保在最上層)
  closeBtn = createButton('✕');
  closeBtn.parent(iframeDiv);
  closeBtn.style('position', 'absolute');
  closeBtn.style('top', '15px');
  closeBtn.style('right', '15px');
  closeBtn.style('width', '35px');
  closeBtn.style('height', '35px');
  closeBtn.style('background-color', '#ff4d4d'); // 使用亮紅色確保看得到
  closeBtn.style('color', '#fff');
  closeBtn.style('border-radius', '50%');
  closeBtn.style('border', '2px solid white');
  closeBtn.style('cursor', 'pointer');
  closeBtn.style('z-index', '1000'); // 極高層級，防止被 iframe 內容遮擋
  closeBtn.mousePressed(() => iframeDiv.hide());
}

// 輔助函式：統一按鈕樣式
function styleButton(btn, bgColor) {
  btn.style('padding', '8px 16px');
  btn.style('background-color', bgColor);
  btn.style('color', 'white');
  btn.style('border', 'none');
  btn.style('border-radius', '10px');
  btn.style('font-weight', 'bold');
  btn.style('cursor', 'pointer');
  btn.style('transition', 'all 0.2s');
  btn.style('z-index', '2');
  btn.mouseOver(() => btn.style('transform', 'scale(1.05)'));
  btn.mouseOut(() => btn.style('transform', 'scale(1)'));
}

function mouseReleased() {
  isDragging = false;
  if (ifrm) ifrm.style('pointer-events', 'auto'); // 放開滑鼠後恢復 iframe 的互動功能
}

function draw() {
  background(245);
  
  let txt = input.value();
  if (txt === '') return;
  
  textSize(slider.value());
  textAlign(LEFT, TOP);

  // 如果正在拖拽，更新 iframeDiv 的位置
  if (isDragging) {
    let newX = mouseX + dragOffsetX;
    let newY = mouseY + dragOffsetY;

    // 限制位置不超出視窗邊界 (考慮到元件本身的寬高)
    newX = constrain(newX, 0, windowWidth - iframeDiv.elt.offsetWidth);
    newY = constrain(newY, 0, windowHeight - iframeDiv.elt.offsetHeight);

    iframeDiv.position(newX, newY);
  }
  
  let txtWidth = textWidth(txt);
  if (txtWidth === 0) return; // 避免文字寬度0造成的無限迴圈
  
  // 從座標 y=100 開始，排與排間隔 50px
  for (let y = 100; y < windowHeight; y += 50) {
    let colorIndex = 0; // 每排從頭開始循環顏色
    
    for (let x = 0; x < windowWidth; x += txtWidth) {
      let dx = 0;
      let dy = 0;
      let waveY = 0;
      let angle = 0;
      let s = 1;
      
      // 如果開啟跳動，隨著時間(millis)與位置(x,y)透過 noise() 產生平滑且不規律的位移
      if (isBouncing) {
        let timeOffset = millis() * 0.002;
        dx = map(noise(x * 0.01, y * 0.01, timeOffset), 0, 1, -20, 20);
        dy = map(noise(x * 0.01 + 100, y * 0.01 + 100, timeOffset), 0, 1, -20, 20);
        
        // 新增旋轉效果：產生 -45 度到 45 度之間的隨機旋轉
        angle = map(noise(x * 0.01, y * 0.01, timeOffset + 500), 0, 1, -QUARTER_PI, QUARTER_PI);
        
        // 新增縮放效果：產生 0.5 倍到 1.5 倍之間的隨機縮放
        s = map(noise(x * 0.01, y * 0.01, timeOffset + 1000), 0, 1, 0.5, 1.5);
      }
      
      // 如果開啟波浪效果：計算正弦波位移
      if (isWaving) {
        waveY = sin(frameCount * 0.1 + x * 0.05 + y * 0.05) * 20;
      }
      
      push();
      // 將座標原點移到文字的中心點（考慮到跳動位移與波浪位移）
      translate(x + dx + txtWidth / 2, y + dy + waveY + slider.value() / 2);
      rotate(angle);
      scale(s);
      
      // 如果開啟彩虹效果：使用 HSB 模式產生動態顏色
      if (isRainbow) {
        colorMode(HSB, 360, 100, 100);
        let h = (frameCount * 2 + x * 0.1 + y * 0.1) % 360;
        fill(h, 80, 100);
      } else {
        fill(colors[colorIndex % colors.length]);
      }
      
      textAlign(CENTER, CENTER); // 使用中心對齊，旋轉縮放才會對稱
      text(txt, 0, 0);
      pop();
      
      // 恢復色彩模式為 RGB 以免影響其他繪製
      if (isRainbow) colorMode(RGB, 255);
      
      colorIndex++;
    }
  }
}
