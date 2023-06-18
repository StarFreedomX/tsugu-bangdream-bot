import { createBlurredTrianglePattern } from "./BG/BG_triangle";
import { scatterImages } from "./BG/BG_starScatter";
import { drawTextOnCanvas } from "./BG/BG_text";
import { createCanvas, loadImage, Image, Canvas } from 'canvas';
import { assetsRootPath } from '../config'
import * as path from 'path';

interface BGOptions {
  image?: Image | Canvas | any;
  text?: string;
  width: number;
  height: number;
}

// 将图片等比例缩放并重复铺满整个画布,并且增加亮度
async function Spread(image: Image, width: number, height: number, brightness: number): Promise<Buffer> {
  const canvas: Canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 计算图片等比例缩放后的尺寸
  const imageAspectRatio = image.width / image.height;
  const canvasAspectRatio = width / height;
  let renderableHeight: number, renderableWidth: number;
  if (imageAspectRatio < canvasAspectRatio) {
    renderableHeight = height;
    renderableWidth = image.width / (image.height / height);
  } else if (imageAspectRatio > canvasAspectRatio) {
    renderableWidth = width;
    renderableHeight = image.height / (image.width / width);
  } else {
    renderableHeight = height;
    renderableWidth = width;
  }

  // 将图片等比例缩放并重复铺满整个画布
  let x = 0,
    y = 0;
  while (y < height) {
    x = 0;
    while (x < width) {
      ctx.drawImage(image, x, y, renderableWidth, renderableHeight);
      x += renderableWidth;
    }
    y += renderableHeight;
  }

  // 获取画布的像素数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 增加亮度值
  const factor = brightness / 255;
  for (let i = 0; i < data.length; i += 4) {
    data[i] += 255 * factor;
    data[i + 1] += 255 * factor;
    data[i + 2] += 255 * factor;
  }

  // 将修改后的像素数据放回画布
  ctx.putImageData(imageData, 0, 0);

  // 将画布输出为 buffer
  return canvas.toBuffer();
}

var star: Image[] = [];

var defaultBGTexture: Image;
async function loadImageOnce() {
  star.push(await loadImage(path.join(assetsRootPath, "/BG/star1.png")));
  star.push(await loadImage(path.join(assetsRootPath, "/BG/star2.png")));
  defaultBGTexture = await loadImage(path.join(assetsRootPath, "/BG/bg_object_big.png"));
}
loadImageOnce()

export async function CreateBGEazy({
  width, height
}) {
  const bgColor = '#fef3ef'
  const canvas: Canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  if (width < 2000) {
    var ratio = defaultBGTexture.width / width 
  }
  else {
    ratio = 1
  }
  //将图片等比例缩放并重复铺满整个画布
  let x = 0,
    y = 0;
  while (y < height) {
    x = 0 - (Math.random() * defaultBGTexture.width * ratio);
    while (x < width) {
      ctx.drawImage(defaultBGTexture, x, y, defaultBGTexture.width * ratio, defaultBGTexture.height * ratio);
      x += defaultBGTexture.width * ratio;
    }
    y += defaultBGTexture.height * ratio;
  }
  return (canvas)
}


export async function CreateBG({
  image,
  text,
  width,
  height,

}: BGOptions): Promise<Canvas> {
  //将图片铺满画面，并且增加20亮度
  const BG = await Spread(image, width, height, 20);
  const BGimage = await loadImage(BG);

  //给图片增加三角形纹理
  const canvas = await createBlurredTrianglePattern({
    image: BGimage,
    blurRadius: 10,
    triangleSize: 200,
    brightnessDifference: 0.04,
  });


  //添加随机星星
  for (let i = 0; i < star.length; i++) {
    await scatterImages({
      canvas,
      image: star[i],
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      density: 0.00001,
      angleRange: 72,
      sizeRange: [25, 75],
    })
  }

  //添加背景文字
  drawTextOnCanvas(canvas, {
    text: text ??= 'BanG Dream!',
    fontSize: 150,
    angle: 15,
    lineSpacing: 50,
    letterSpacing: 100,
    strokeWidth: 3,
    skewAngle: -12,
    opacity: 0.5,
    scaleX: 0.8,
  })
  return (canvas)
}