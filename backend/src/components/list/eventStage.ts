import { stageTypeList, stageTypeTextStrokeColor, stageTypeName, Stage } from "@/types/EventStage";
import { Song, difficultyColorList, difficultyNameList } from "@/types/Song";
import { Canvas, Image, FontLibrary } from 'skia-canvas';
import { assetsRootPath } from '@/config'
import { changeTimefomant } from '@/components/list/time'
import { setFontStyle } from '@/image/text'
import { stackImageHorizontal } from "../utils";
import { loadImageFromPath } from '@/image/utils';

FontLibrary.use("old", [`${assetsRootPath}/Fonts/old.ttf`])

export let stageTypeTopImageList: { [type: string]: Image } = {}

async function loadStageTypeTopImage(type: string): Promise<Image> {//加载活动类型顶部图片
    if (stageTypeTopImageList[type]) {
        return stageTypeTopImageList[type];
    }
    else {
        stageTypeTopImageList[type] = await loadImageFromPath(assetsRootPath + `/EventStage/${type}.png`);
        return stageTypeTopImageList[type];
    }
}

export async function drawEventStageTypeTop(stage: Stage): Promise<Canvas> {//绘制活动类型顶部(时间+类型)
    let type = stage.type;
    const startAt = stage.startAt;
    const endAt = stage.endAt;

    if (stageTypeList.indexOf(type) == -1) {
        type = 'undefined';
    }
    const eventStageTypeTopImage = await loadStageTypeTopImage(type);

    const typeName = stageTypeName[type];
    const timeText = `${changeTimefomant(startAt)} - ${changeTimefomant(endAt)}`;

    const canvas = new Canvas(eventStageTypeTopImage.width, eventStageTypeTopImage.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(eventStageTypeTopImage, 0, 0);
    ctx.textBaseline = 'middle';
    setFontStyle(ctx, 25, 'old');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = stageTypeTextStrokeColor[type];
    ctx.strokeText(timeText, 20, canvas.height / 2 - 2);
    ctx.fillText(timeText, 20, canvas.height / 2 - 2);

    ctx.textAlign = 'right';
    ctx.strokeText(typeName, canvas.width - 50, canvas.height / 2 - 2);
    ctx.fillText(typeName, canvas.width - 50, canvas.height / 2 - 2);

    //如果是当前进行中活动，额外画标志
    if (new Date() >= new Date(startAt) && new Date() <= new Date(endAt)) {
        const presentEventMark = await loadStageTypeTopImage('presentEventMark')
        ctx.drawImage(presentEventMark, 0, 0);
    }

    return canvas;
}

async function drawSongInEventStageSongHorizontal(song: Song, meta: boolean): Promise<Canvas> {//绘制活动中的每个歌曲(包括难度)
    const canvas = new Canvas(800 / 8, 800 / 8 / 180 * 290);
    const ctx = canvas.getContext('2d');

    const jacketImageHeight = 800 / 8 - 6
    ctx.drawImage(await song.getSongJacketImage(), 3, 0, jacketImageHeight, jacketImageHeight);

    ctx.textAlign = 'start'
    ctx.textBaseline = 'middle'
    setFontStyle(ctx, 16, 'old')
    ctx.fillStyle = '#a7a7a7'
    ctx.fillText(`ID:${song.songId}`, 4, 108)

    //难度，高度为meta*10像素
    function drawDifficultyLineGraph(difficultyId: number, meta: number): Canvas {
        const canvas = new Canvas(jacketImageHeight / 10, jacketImageHeight);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = difficultyColorList[difficultyId];
        ctx.fillRect(0, jacketImageHeight - meta * 10, jacketImageHeight, meta * 10);
        return canvas;
    }
    const sosMeta = (new Song(306)).calcMeta(true, 3)
    if (meta) {
        let difficultyLineGraphList = []
        let maxMeta = 0, maxDiff
        for (let i in song.difficulty) {
            const difficultyId = parseInt(i);
            const meta = song.calcMeta(true, difficultyId)
            // difficultyLineGraphList.push(drawDifficultyLineGraph(difficultyId, meta));
            if (maxMeta < meta) {
                maxMeta = meta
                maxDiff = difficultyNameList[difficultyId]
            }
        }
        const percent = Math.round(maxMeta / sosMeta * 1000) / 10
        ctx.fillText(`难度:${maxDiff}`, 4, 128)
        ctx.fillText(`分数:${percent}%`, 4, 148)
        // const difficultyLineGraph = stackImageHorizontal(difficultyLineGraphList)
        // ctx.drawImage(difficultyLineGraph, 3, 0);
    }


    return canvas;
}

export async function drawEventStageSongHorizontal(stage: Stage, meta: boolean = false): Promise<Canvas> {//绘制活动中的歌曲列表(横向)
    const songIdList = stage.songIdList;

    const canvas = new Canvas(800 + (meta ? 100 : 0), 800 / 8 / 180 * 290 + 10);
    const ctx = canvas.getContext('2d');
    var sumMeta = 0
    for (let i = 0; i < songIdList.length; i++) {
        const song = new Song(songIdList[i]);
        ctx.drawImage(await drawSongInEventStageSongHorizontal(song, meta), 800 / 8 * i, 0);
        var maxMeta = 0
        for (let i in song.difficulty) {
            const difficultyId = parseInt(i);
            const meta = song.calcMeta(true, difficultyId)
            if (maxMeta < meta) {
                maxMeta = meta
            }
        }
        sumMeta += maxMeta
    }
    sumMeta /= songIdList.length
    const sosMeta = (new Song(306)).calcMeta(true, 3)
    const persent = Math.round(sumMeta / sosMeta * 1000) / 10
    ctx.textAlign = 'start'
    ctx.textBaseline = 'middle'
    setFontStyle(ctx, 20, 'old')
    ctx.fillStyle = '#a7a7a7'
    ctx.fillText('平均分数：', 800 + 4, 50)
    ctx.fillText(`${persent}%`, 800 + 4, 80)
    return canvas;
}