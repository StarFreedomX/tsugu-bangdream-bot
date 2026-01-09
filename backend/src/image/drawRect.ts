import { Canvas, FontLibrary } from 'skia-canvas';
import { assetsRootPath } from '@/config';
import { getTextWidth } from '@/image/utils';
import { drawTextWithImages, setFontStyle } from "@/image/text";
FontLibrary.use("old",[`${assetsRootPath}/Fonts/old.ttf`])

interface RoundedRect {
  width: number;
  height: number;
  radius?: number | [number, number, number, number];
  color?: string;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

// 画圆角矩形
export function drawRoundedRect({
    width,
    height,
    radius = 25,
    color = "#ffffff",
    opacity = 0.9,
    strokeColor = "#bbbbbb",
    strokeWidth = 0,
}: RoundedRect): Canvas {
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext("2d");

    // 计算安全半径
    let r: number[];
    if (typeof radius === "number") {
        r = [radius, radius, radius, radius];
    } else {
        r = [...radius]; // 拷贝一份
    }

    // 约束半径：不能超过宽的一半，也不能超过高的一半
    // 如果 radius 太大，会自动缩小为恰好形成半圆的程度
    const maxR = Math.min(width / 2, height / 2);
    r = r.map(val => (val > maxR ? maxR : val));
    // --------------------------

    ctx.beginPath();
    ctx.moveTo(r[0], 0);
    ctx.lineTo(width - r[1], 0);
    ctx.quadraticCurveTo(width, 0, width, r[1]);
    ctx.lineTo(width, height - r[2]);
    ctx.quadraticCurveTo(width, height, width - r[2], height);
    ctx.lineTo(r[3], height);
    ctx.quadraticCurveTo(0, height, 0, height - r[3]);
    ctx.lineTo(0, r[0]);
    ctx.quadraticCurveTo(0, 0, r[0], 0);
    ctx.closePath();

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fill();

    if (strokeWidth > 0) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        // 描边部分同样使用受约束的 r
        ctx.beginPath();
        ctx.moveTo(r[0], strokeWidth / 2);
        ctx.lineTo(width - r[1], strokeWidth / 2);
        ctx.quadraticCurveTo(width - strokeWidth / 2, strokeWidth / 2, width - strokeWidth / 2, r[1]);
        ctx.lineTo(width - strokeWidth / 2, height - r[2]);
        ctx.quadraticCurveTo(width - strokeWidth / 2, height - strokeWidth / 2, width - r[2], height - strokeWidth / 2);
        ctx.lineTo(r[3], height - strokeWidth / 2);
        ctx.quadraticCurveTo(strokeWidth / 2, height - strokeWidth / 2, strokeWidth / 2, height - r[3]);
        ctx.lineTo(strokeWidth / 2, r[0]);
        ctx.quadraticCurveTo(strokeWidth / 2, strokeWidth / 2, r[0], strokeWidth / 2);
        ctx.closePath();
        ctx.stroke();
    }

    return canvas;
}



type textAlign = "left" | "right" | "center" | "start" | "end";
interface RoundedRectWithText {
  width?: number,
  height?: number,
  radius?: number,
  color?: string,
  opacity?: number,
  strokeColor?: string,
  strokeWidth?: number
  font?: "old" | "default",
  text: string,
  textColor?: string,
  textSize: number,
  textAlign?: textAlign,
  autoWrap?: boolean,
  maxWidth?: number,
}

//画圆角矩形并填充文字
export function drawRoundedRectWithText({
    text,
    font = "old",
    textColor = "#ffffff",
    textSize,
    textAlign = "center",
    height: inputHeight, // 将解构出的 height 命名为 inputHeight
    width: inputWidth,   // 将解构出的 width 命名为 inputWidth
    radius: inputRadius, // 将解构出的 radius 命名为 inputRadius
    color = "#5b5b5b",
    opacity = 1,
    strokeColor = color,
    strokeWidth = 0,
    autoWrap = false,
    maxWidth = 800
}: RoundedRectWithText): Canvas {

    let textImage: Canvas;
    let finalWidth: number;
    let finalHeight: number;

    if (autoWrap) {
        // 1. 使用 drawTextWithImages 处理换行逻辑
        textImage = drawTextWithImages({
            content: [text],
            textSize,
            maxWidth: maxWidth - (textSize), // 留出左右边距
            lineHeight: textSize * 1.5,
            color: textColor,
            font
        });

        // 2. 动态计算画布尺寸
        // 如果用户传了 width，就用用户的；没传就用文字宽度+边距
        finalWidth = inputWidth ?? (textImage.width + textSize);
        finalHeight = inputHeight ?? (textImage.height + (textSize * 0.5));
    } else {
        // 原有逻辑：单行不换行
        const textWidth = getTextWidth(text, textSize, font);
        finalHeight = inputHeight ?? (textSize * 4 / 3);
        finalWidth = inputWidth ?? (textWidth + finalHeight);

        // 创建文字层
        textImage = new Canvas(textWidth, finalHeight);
        const tCtx = textImage.getContext('2d');
        setFontStyle(tCtx, textSize, font);
        tCtx.fillStyle = textColor;
        tCtx.textBaseline = "alphabetic";
        tCtx.fillText(text, 0, finalHeight / 2 + textSize / 3);
    }

    // 确定圆角半径
    const radius = inputRadius ?? (finalHeight / 2.5);

    // 绘制背景矩形
    const canvas = drawRoundedRect({
        width: finalWidth,
        height: finalHeight,
        radius,
        color,
        opacity,
        strokeColor,
        strokeWidth
    });

    const ctx = canvas.getContext('2d');

    // 将生成的文本图像对齐贴到背景上
    let drawX = 0;
    if (textAlign === "left" || textAlign === "start") {
        drawX = radius / 2;
    } else if (textAlign === "right" || textAlign === "end") {
        drawX = finalWidth - textImage.width - (radius / 2);
    } else {
        drawX = (finalWidth - textImage.width) / 2; // center
    }

    const drawY = (finalHeight - textImage.height) / 2;

    ctx.drawImage(textImage, drawX, drawY);

    return canvas;
}
