import { Canvas } from 'skia-canvas'
import { Song } from "@/types/Song"
import { drawText } from "@/image/text"
import { difficultyColorList } from "@/types/Song"

export function drawDifficulityList(song: Song, imageHeight: number = 60, spacing: number = 10): Canvas {
    var difficultyCount = Object.keys(song.difficulty).length
    var canvas = new Canvas(imageHeight * difficultyCount + (difficultyCount - 1) * spacing, imageHeight)
    var ctx = canvas.getContext("2d")
    for (var d in song.difficulty) {
        let i = parseInt(d)
        ctx.drawImage(drawDifficulity(i, song.difficulty[i].playLevel, imageHeight), i * (imageHeight + spacing), 0)
    }
    return canvas
}

export function drawDifficulityListWithDiff(song: Song, difficulty: number, imageHeight: number = 60, spacing: number = 10): Canvas {
    var difficultyCount = Object.keys(song.difficulty).length
    var canvas = new Canvas(imageHeight * difficultyCount + (difficultyCount - 1) * spacing, imageHeight)
    var ctx = canvas.getContext("2d")
    for (var d in song.difficulty) {
        let i = parseInt(d)
        ctx.drawImage(drawDifficulity(i, song.difficulty[i].playLevel, imageHeight, i == difficulty), i * (imageHeight + spacing), 0)
    }
    return canvas
}

export function drawDifficulity(difficultyType: number, playLevel: number, imageHeight: number, choose: boolean = true) {
    var tempcanv = new Canvas(imageHeight, imageHeight)
    var ctx = tempcanv.getContext("2d")
    if (difficultyColorList[difficultyType] != undefined) {
        ctx.fillStyle = ctx.strokeStyle = difficultyColorList[difficultyType]
    }
    else {
        ctx.fillStyle = ctx.strokeStyle = "#f1f1f1"
    }
    if (choose) {
        ctx.arc(imageHeight / 2, imageHeight / 2, imageHeight / 2, 0, 2 * Math.PI)
        ctx.fill()
    }
    else {
        ctx.lineWidth = 5
        ctx.arc(imageHeight / 2, imageHeight / 2, imageHeight / 2 - ctx.lineWidth / 2, 0, 2 * Math.PI)
        ctx.stroke()
    }
    var levelText = drawText({
        textSize: imageHeight / 3 * 2,
        text: playLevel.toString(),
        maxWidth: imageHeight * 3
    })
    ctx.drawImage(levelText, imageHeight / 2 - levelText.width / 2, imageHeight / 2 - levelText.height / 2)
    return (tempcanv)
}