import { FontLibrary, Image, Canvas, CanvasRenderingContext2D } from 'skia-canvas';
import { assetsRootPath } from '@/config';
FontLibrary.use("old", [`${assetsRootPath}/Fonts/old.ttf`])
FontLibrary.use("FangZhengHeiTi", [`${assetsRootPath}/Fonts/FangZhengHeiTi_GBK.ttf`])


interface warpTextOptions {
    text: string,
    textSize?: number,
    maxWidth: number,
    lineHeight?: number,
    font?: "FangZhengHeiTi" | "old" | "default",
    color?: string,
    parseStyle?: boolean
}

export function drawText({
text,
textSize = 40,
maxWidth,
lineHeight = textSize * 4 / 3,
color = "#505050",
opacity = 1,
font = "old" as "old" | "default",
parseStyle = false,
autoWrap = false
}) {
    if (autoWrap && maxWidth) {
        return drawTextWithImages({
            content: [text], // 包装成数组
            textSize,
            maxWidth,
            lineHeight,
            color,
            font
        });
    }
    if (!parseStyle) {
      // 原样绘制
      return drawPlainText({ text, textSize, maxWidth, lineHeight, color, opacity, font });
    }
    text = ` ${text}`

    // 样式
    let currentStyle = {
      bold: false,
      italic: false,
      underline: false,
      subscript: false,
      superscript: false,
      strike: false,
      color,
      opacity
    };

    const segments = parseStyledText(text, currentStyle);

    const ctxTmp = new Canvas(1, 1).getContext("2d");
    let totalWidth = 0;
    let italicOffset = 0;
    let extraTop = 0;
    let extraBottom = 0;

    for (const seg of segments) {
        setFontStyleWithStyle(ctxTmp, seg.textSize || textSize, font, seg);
        const w = ctxTmp.measureText(seg.text).width;
        totalWidth += w;
        if (seg.italic) italicOffset = Math.max(italicOffset, (seg.textSize || textSize) * 0.2);
        if (seg.superscript) extraTop = Math.max(extraTop, (seg.textSize || textSize) * 0.5);
        if (seg.subscript) extraBottom = Math.max(extraBottom, (seg.textSize || textSize) * 0.5);
    }
    // 调整 Canvas 尺寸
    const canvas = new Canvas(
        totalWidth + italicOffset,
        lineHeight + extraTop + extraBottom
    );
    const ctx = canvas.getContext("2d");


    let x = 0;
    const yBase = lineHeight / 2 + textSize / 3;
    const underlineSegments = [];
    const strikeSegments = [];
    for (const seg of segments) {
        let segSize = textSize;
        let offsetY = 0;
        if (seg.subscript || seg.superscript) {
            segSize *= 0.6;
            if (seg.superscript) offsetY = -segSize * 0.6;
            if (seg.subscript) offsetY = segSize * 0.3;
        }
        setFontStyleWithStyle(ctx, segSize, font, seg);
        ctx.fillStyle = seg.color;
        ctx.globalAlpha = seg.opacity;

        const y = yBase + offsetY;

        const shear = seg.italic ? -0.2 : 0; // 右倾斜
        ctx.save();

        const w = ctx.measureText(seg.text).width;

        const italicExtra = Math.abs(shear) * segSize;

        // 应用倾斜变换
        ctx.setTransform(1, 0, shear, 1, x + italicExtra, 0);
        ctx.fillText(seg.text, 0, y);
        ctx.restore();

        // 记录需要画线的区段
        if (seg.underline) {
            underlineSegments.push({
                start: x,
                end: x + w + italicExtra,
                color: seg.color,
                opacity: seg.opacity,
                y: y + segSize * 0.15
            });
        }
        if (seg.strike) {
            strikeSegments.push({
                start: x,
                end: x + w + italicExtra,
                color: seg.color,
                opacity: seg.opacity,
                y: y - segSize * 0.3 // 中线稍微靠上
            });
        }
        ctx.globalAlpha = 1;

        // 前进 x：正常宽度 + 倾斜预留量
        x += w + italicExtra;

    }
    ctx.save();
    for (const u of underlineSegments) {
        drawLine(ctx, u.start, u.y, u.end, u.y, u.color, u.opacity);
    }
    for (const s of strikeSegments) {
        drawLine(ctx, s.start, s.y, s.end, s.y, s.color, s.opacity, 8);
    }
    ctx.restore();

    return canvas;
}

// 解析器
function parseStyledText(input, baseStyle) {
    const regex = /\[(b|i|u|sub|sup|c|s|\w{2})\](?:\[([0-9a-fA-F]{6})\])?/g;
    let result = [];
    let lastIndex = 0;
    let match;
    let style = { ...baseStyle };

    while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
            result.push({ ...style, text: input.slice(lastIndex, match.index) });
        }

        const tag = match[1].toLowerCase();
        const extra = match[2];

        switch (tag) {
            case "b": style.bold = true; break;
            case "i": style.italic = true; break;
            case "u": style.underline = true; break;
            case "s": style.strike = true; break;
            case "sub": style.subscript = true; style.superscript = false; break;
            case "sup": style.superscript = true; style.subscript = false; break;
            case "c": if (extra) style.color = "#" + extra; break;
            default:
              // 判断是否为两位十六进制透明度
                if (/^[0-9a-fA-F]{2}$/.test(tag)) {
                    style.opacity = parseInt(tag, 16) / 256;
                }
                break;
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < input.length) {
        result.push({ ...style, text: input.slice(lastIndex) });
    }

    return result;
}

// 画线函数
function drawLine(ctx, x1, y1, x2, y2, color, opacity = 1, width = 2) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

// 字体设置
function setFontStyleWithStyle(ctx, size, font, style) {
    let prefix = "";
    if (style.bold) prefix += "bold ";
    ctx.font = prefix + size + "px " + font + ",Microsoft Yahei";
}

// 纯文字绘制（无样式）
function drawPlainText({ text, textSize, maxWidth, lineHeight, color, opacity, font }) {
    const wrappedTextData = wrapText({ text, maxWidth, lineHeight, textSize });
    let canvas;
    if (wrappedTextData.numberOfLines === 0) {
        canvas = new Canvas(1, lineHeight);
    } else if (wrappedTextData.numberOfLines === 1) {
        const ctxTmp = new Canvas(1, 1).getContext("2d");
        setFontStyle(ctxTmp, textSize, font);
        const width = ctxTmp.measureText(wrappedTextData.wrappedText[0]).width;
        canvas = new Canvas(width, lineHeight);
    } else {
        canvas = new Canvas(maxWidth, lineHeight * wrappedTextData.numberOfLines);
    }

    const ctx = canvas.getContext("2d");
    setFontStyle(ctx, textSize, font);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "alphabetic";

    let y = lineHeight / 2 + textSize / 3;
    for (const line of wrappedTextData.wrappedText) {
        ctx.fillText(line, 0, y);
        y += lineHeight;
    }

    ctx.globalAlpha = 1;
    return canvas;
}


export function wrapText({
    text,
    textSize,
    maxWidth,
    lineHeight,
    font = "old"
}: warpTextOptions) {
    const canvas = new Canvas(1, 1);
    const ctx = canvas.getContext('2d');
    const temp = text.split('\n');
    ctx.textBaseline = 'alphabetic';
    setFontStyle(ctx, textSize, font);

    for (var i = 0; i < temp.length; i++) {
        let temptext = temp[i]
        let a = 0
        for (var n = 0; n < temptext.length; n++) {
            if (maxWidth > ctx.measureText(temptext.slice(0, temptext.length - n)).width) {
                a = n
                break
            }

        }
        if (a != 0) {
            temp.splice(i + 1, 0, temp[i].slice(temp[i].length - a, temp[i].length))
            temp[i] = temp[i].slice(0, temp[i].length - a)
        }
    }

    for (var i = 0; i < temp.length; i++) {
        if (temp[i] == "") {
            temp.splice(i, 1);
            //去除空值
            i--;
        }
    }
    return {
        numberOfLines: temp.length,
        wrappedText: temp,
    };
}

interface TextWithImagesOptions {
    textSize?: number;
    maxWidth: number;
    lineHeight?: number;
    content: (string | Canvas | Image)[];
    spacing?: number;
    color?: string;
    font?: "default" | "old"
}

// 画文字包含图片
export function drawTextWithImages({
    textSize = 40,
    maxWidth,
    lineHeight = textSize * 4 / 3,
    content,
    spacing = textSize / 3,
    color = '#505050',
    font = 'old'
}: TextWithImagesOptions) {
    var wrappedTextData = warpTextWithImages({ textSize, maxWidth, lineHeight, content, spacing });
    var wrappedText = wrappedTextData.wrappedText
    var canvas: Canvas
    if (wrappedTextData.numberOfLines == 0) {
        var canvas: Canvas = new Canvas(1, lineHeight);
    }
    //单行文字，宽度为第一行的宽度
    else if (wrappedTextData.numberOfLines == 1) {
        canvas = new Canvas(1, 1);
        const ctx = canvas.getContext('2d');
        setFontStyle(ctx, textSize, font);
        var Width = 0
        for (var n = 0; n < wrappedText[0].length; n++) {
            if (typeof wrappedText[0][n] === "string") {
                Width += ctx.measureText(wrappedText[0][n] as string).width
            } else {
                //等比例缩放图片，至高度与textSize相同
                let tempImage = wrappedText[0][n] as Canvas | Image
                let tempWidth = textSize * tempImage.width / tempImage.height//等比例缩放到高度与字体大小相同后，图片宽度
                Width += tempWidth
            }
            Width += spacing
        }
        canvas = new Canvas(Width - spacing, lineHeight);
    }
    //多行文字
    else {
        canvas = new Canvas(maxWidth, lineHeight * wrappedTextData.numberOfLines);

    }
    const ctx = canvas.getContext('2d');
    let y = lineHeight / 2 + textSize / 3
    ctx.textBaseline = 'alphabetic'
    setFontStyle(ctx, textSize, font);
    ctx.fillStyle = color;
    for (var i = 0; i < wrappedText.length; i++) {
        let tempX = 0
        for (var n = 0; n < wrappedText[i].length; n++) {
            if (typeof wrappedText[i][n] === "string") {
                ctx.fillText(wrappedText[i][n] as string, tempX, y);
                tempX += ctx.measureText(wrappedText[i][n] as string).width
            } else {
                //等比例缩放图片，至高度与textSize相同
                let tempImage = wrappedText[i][n] as Canvas | Image
                let tempWidth = textSize * tempImage.width / tempImage.height//等比例缩放到高度与字体大小相同后，图片宽度
                ctx.drawImage(tempImage, tempX, y - (textSize / 3) - (textSize / 2), tempWidth, textSize)
                tempX += tempWidth
            }
            if (tempX != 0) {
                tempX += spacing
            }
        }
        y += lineHeight;
    }
    return canvas;
}

// 画文字包含图片 的计算换行
function warpTextWithImages({
    textSize = 40,
    maxWidth,
    lineHeight = textSize * 4 / 3,
    content,
    spacing = textSize / 3,
    font = 'old'
}: TextWithImagesOptions) {
    const canvas = new Canvas(1, 1);
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    setFontStyle(ctx, textSize, font);
    const temp: Array<Array<string | Image | Canvas>> = [[]];
    let lineNumber = 0;
    let tempX = 0;

    function newLine() {
        lineNumber++;
        tempX = 0;
        temp.push([]);
    }

    for (let i = 0; i < content.length; i++) {
        if (content[i] == undefined || content[i] == null) {
            content[i] = "?"
        }
        if (typeof content[i] === "string") {
            let temptext = content[i] as string;
            while (temptext.length > 0) {
                const lineBreakIndex = temptext.indexOf("\n");
                if (lineBreakIndex !== -1) {
                    const substring = temptext.slice(0, lineBreakIndex);
                    temp[lineNumber].push(substring);
                    newLine();
                    temptext = temptext.slice(lineBreakIndex + 1);
                    continue;
                }

                const remainingWidth = maxWidth - tempX;
                const measuredWidth = ctx.measureText(temptext).width;
                if (remainingWidth >= measuredWidth) {
                    temp[lineNumber].push(temptext);
                    tempX += measuredWidth;
                    break;
                } else {
                    let splitIndex = 0;
                    for (let j = temptext.length - 1; j >= 0; j--) {
                        const substr = temptext.slice(0, j);
                        const substrWidth = ctx.measureText(substr).width;
                        if (substrWidth <= remainingWidth) {
                            splitIndex = j;
                            break;
                        }
                    }
                    const substring = temptext.slice(0, splitIndex);
                    temp[lineNumber].push(substring);
                    newLine();
                    temptext = temptext.slice(splitIndex);
                }
            }
        } else if (content[i] instanceof Canvas || content[i] instanceof Image) {
            let tempImage = content[i] as Image;
            let tempWidth = tempImage.width * (textSize / tempImage.height);
            if (tempX + tempWidth > maxWidth) {
                newLine();
            }
            temp[lineNumber].push(tempImage);
            tempX += tempWidth;
        }
        tempX += spacing;
    }

    if (temp[temp.length - 1].length === 0) {
        temp.pop();
    }

    return {
        numberOfLines: temp.length,
        wrappedText: temp,
    };
}

export var setFontStyle = function (ctx: CanvasRenderingContext2D, textSize: number, font: string) {//设置字体大小
    ctx.font = textSize + 'px ' + font + ",Microsoft Yahei"
}
