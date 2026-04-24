function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB);
  noStroke();
}

function draw() {
  background(0);
  translate(width / 2, height / 2);

  for (let i = 0; i < 600; i++) {
    let ang = i / 10 + frameCount / 50;
    let r = i;

    fill(i % 360, 80, 80);
    rect(cos(ang) * r, sin(ang) * r, 20, 20);
  }
}
