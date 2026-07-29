import { Image, Canvas } from 'skia-canvas';
import { drawTitle } from '@/components/title';
import { serverNameFullList, statusName } from '@/config';
import { Server } from '@/types/Server';
import { drawDatablock } from '@/components/dataBlock';
import { drawList, line, drawListMerge } from '@/components/list';
import { changeTimePeriodFormat } from '@/components/list/time';
import { outputFinalBuffer } from '@/image/output';
import { MusicRankingCutoff } from '@/types/MusicRankingCutoff';
import { Song } from '@/types/Song';
import { drawEventDatablock } from '@/components/dataBlock/event';
import { drawSongInList } from '@/components/list/song';
import { drawTimeLineChart } from '@/components/chart_Timeline';
import { getPresetColor } from '@/types/Color';

export async function drawMusicRankingCutoffDetail(
    eventId: number,
    tier: number,
    mainServer: Server,
    compress: boolean,
    musicId: number
): Promise<Array<Buffer | string>> {
    if (!tier) return ['请输入排名'];

    const cutoff = new MusicRankingCutoff(eventId, mainServer, tier, musicId);
    if (cutoff.isExist == false) {
        return [`错误: ${serverNameFullList[mainServer]} 歌榜或档线不存在`];
    }
    await cutoff.initFull();
    if (!cutoff.latestCutoff) return [`错误: ${serverNameFullList[mainServer]} 歌榜或档线暂不存在`];

    const all: Array<Canvas | Image> = [];
    all.push(drawTitle('预测线', `${serverNameFullList[mainServer]} 歌榜 T${tier}档线`));
    all.push(await drawEventDatablock(cutoff.event, [mainServer]));
    all.push(drawDatablock({ list: [await drawSongInList(new Song(musicId))] }));

    const list: Array<Image | Canvas> = [];
    const time = Date.now();

    if (cutoff.status == 'in_progress') {
        cutoff.predict();
        const predictText = cutoff.predictEP == null || cutoff.predictEP == 0 ? '?' : cutoff.predictEP.toString();
        // 当前时速：取最近点及30分钟前最近的数据点，排除距当前<10min的点
        const cutoffs = cutoff.cutoffs
        let speed30min = 0
        if (cutoffs && cutoffs.length >= 2) {
            const lastPoint = cutoffs[cutoffs.length - 1]
            const targetTime = lastPoint.time - 30 * 60 * 1000
            const minGap = 10 * 60 * 1000
            let prevPoint: { time: number; ep: number } | null = null
            let minDiff = Infinity

            for (let i = 0; i < cutoffs.length - 1; i++) {
                if (lastPoint.time - cutoffs[i].time < minGap) continue
                const diff = Math.abs(cutoffs[i].time - targetTime)
                if (diff < minDiff) {
                    minDiff = diff
                    prevPoint = cutoffs[i]
                }
            }

            if (prevPoint) {
                const dt = (lastPoint.time - prevPoint.time) / 3600000
                if (dt > 0) {
                    speed30min = Math.round((lastPoint.ep - prevPoint.ep) / dt)
                }
            }
            else {
                const timeSpan = (cutoff.latestCutoff.time - cutoff.startAt) / 3600000
                if (timeSpan > 0) {
                    speed30min = Math.round(cutoff.latestCutoff.ep / timeSpan)
                }
            }
        }
        else if (cutoffs && cutoffs.length === 1) {
            const timeSpan = (cutoff.latestCutoff.time - cutoff.startAt) / 3600000
            if (timeSpan > 0) {
                speed30min = Math.round(cutoff.latestCutoff.ep / timeSpan)
            }
        }

        list.push(drawListMerge([
            drawList({ key: '预测线', text: predictText }),
            drawList({ key: '当前时速', text: `${speed30min} pt/h` })
        ]));
        list.push(line);

        const tempImageList = [];
        tempImageList.push(drawList({ key: '最新分数线', text: cutoff.latestCutoff.ep.toString() }));
        tempImageList.push(drawList({
            key: '更新时间',
            text: `${changeTimePeriodFormat(Date.now() - cutoff.latestCutoff.time)}前`
        }));
        list.push(drawListMerge(tempImageList));
        list.push(line);

        list.push(drawList({ key: '活动剩余时间', text: `${changeTimePeriodFormat(cutoff.endAt - time)}` }));
        list.push(line);
    } else if (cutoff.status == 'ended') {
        list.push(drawList({ key: '状态', text: statusName[cutoff.status] }));
        list.push(line);
        list.push(drawList({ key: '最终分数线', text: cutoff.latestCutoff.ep.toString() }));
        list.push(line);
    } else {
        list.push(drawList({ key: '状态', text: statusName[cutoff.status] }));
        list.push(line);
        list.push(drawList({ key: '当前分数线', text: cutoff.latestCutoff.ep.toString() }));
        list.push(line);
    }

    list.pop();
    list.push(new Canvas(800, 50));
    list.push(await drawMusicRankingCutoffChart([cutoff]));

    all.push(drawDatablock({ list }));
    const buffer = await outputFinalBuffer({ imageList: all, useEasyBG: true, compress });
    return [buffer];
}

async function drawMusicRankingCutoffChart(cutoffList: MusicRankingCutoff[]) {
    if (cutoffList.length == 0) {
        return new Canvas(1, 1);
    }

    const datasets = [];
    const onlyOne = cutoffList.length == 1;

    for (let i = 0; i < cutoffList.length; i++) {
        const tempColor = getPresetColor(i);
        const cutoff = cutoffList[i];
        datasets.push({
            label: `T${cutoff.tier}`,
            data: cutoff.getChartData(),
            borderWidth: 5,
            borderColor: [tempColor.getRGBA(1)],
            backgroundColor: [tempColor.getRGBA(0.2)],
            pointBackgroundColor: tempColor.getRGBA(1),
            pointBorderColor: tempColor.getRGBA(1),
            fill: onlyOne,
            stepped: true,
        });
    }

    const data = { datasets };
    return await drawTimeLineChart({
        data,
        start: new Date(cutoffList[0].startAt),
        end: new Date(cutoffList[0].endAt),
        setYStartToZero: false,
    });
}
