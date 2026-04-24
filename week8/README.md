---
tags: 程式設計,第十三章,學生版,互動藝術程式創作入門,Creative Coding
---
# 章節 13_2 - 學生版_即時影像擷取與像素操作

## 使用影像
* P5.createCapture()
    * 使用方式
```javascript=
capture = createCapture(VIDEO)
capture.size(320,240);//設定顯示畫面大小
image(capture,mouseX, mouseY)
```


---
### 實際的程式碼

```javascript=




```

---

### 先儲存 capture 抓到的影像，再去處理儲存起來的影像
#### 產生一個方塊的點

```javascript=



```





---

### 修正攝影機左右相反的問題
```javascript=



```



---
### span依照滑鼠x軸移動變化其方塊大小

```javascript=


```
* 可以把rect(x,y,span)改為圓圈ellipse(x,y,span)

---

### 取得亮度：(pixel[0] + pixel[1] + pixel[2])/3 //RGB 的平均值
```javascript=



```


---
### 不一樣的畫面(方塊的大小跟顏色有相關)
![](https://i.imgur.com/35jTfmE.gif)

```javascript=



```
---
### 按下不同按鈕產生不一樣的畫面

```javascript=



```


---
### 按下1或是2，3都會產生不同的效果

```javascript=



```
---

可以把
rect(0,0,span);
更改為
rect(0,0,span*0.9); //讓方塊與方塊間有更大黑色縫隙

---
### 顏色與pixel[0]有相關
```javascript=


```

---
### 顏色會變化方塊大小
![](https://i.imgur.com/6VvOhiH.gif)

```javascript=




```

---


### 文字雲的創作
#### 取的當前像素的亮度 bk = (pixel[0] + pixel[1] + pixel[2])/3



---
![](https://i.imgur.com/I3DqiNK.gif)
```javascript=
		if(mode=="3")
		{
			fill(pixel)
			textSize(span)
			text("天",x,y)
		}
```

---

### 取得當前亮度對應到的文字（假設共有 10 個字可選擇）：
var txt = "一二三四五田雷電龕龘"
    

---

```javascript=
const density = 'Ñ@#W$9876543210?!abc;:+=-,._ ';
let txt = "一二三四五田雷電龕龘"
let bkId = int(map(bk, 0, 255, 9, 0))
text(txt[bkId])
```



---
### 最後完整程式碼
```javascript=


```

---



#### 加入材質，產生noise效果
```javascript=
push()
		blendMode(MULTIPLY)
		image(noiseTexture,0,0,width,height)
pop()
```

---



---
## 影片操作進階－追蹤顏色

引用 Tracking.js 的方式，以下則一即可：
在新的 tab 中使用 trackingjs 的程式碼 ，刪掉註解的部分以避免執行錯誤。
參考這個 sketch，在一個新個 tab 裡面新增下列程式碼即可：



---
#### 產生一個新的tab2
![](https://i.imgur.com/0EGnCRS.png)



---

```javascript=

var s = document.createElement("script");
s.type = "text/javascript";
s.src = "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js";
document.head.appendChild(s);
```


---

### 綁定 capture 的影片
```javascript=
capture = createCapture(VIDEO)
capture.position(0,0)
capture.id("myVideo")
colors = new tracking.ColorTracker(['yellow','magenta','cyan']) //追蹤特定顏色
tracking.track("#myVideo",colors) // 綁定影片
```


---

### tracking 的 colorTracker 可以抓取特定的顏色，並回傳一個有這些色塊位置與大小的陣列。

```json=

[
    {
        color: "yellow"
        height: 473
        width: 543
        x: 96
        y: 0
    },
    {
        color: "yellow"
        height: 472
        width: 541
        x: 98
        y: 0
    }...
]
```
### 綁定資料更新的事件
```javascript=
colors.on('track',updateData) // 綁定事件，畫面更新的時候執行 updateData

function updateData(event){
    data = event.data
}
```
### 把資料繪製到螢幕上
```javascript=
fill('yellow')
if (data){
	for(var i=0;i<data.length;i++){
		fill(data[i].color)
		rect(
            data[i].x,data[i].y,
            data[i].width,data[i].height
            )
	}
}
```


---
