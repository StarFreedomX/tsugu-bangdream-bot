import { Image, Canvas } from 'skia-canvas';
import { drawTitle } from '@/components/title';
import { serverNameFullList } from '@/config';
import { Server } from '@/types/Server';
import { drawDatablock } from '@/components/dataBlock';
import { outputFinalBuffer } from '@/image/output';
import { drawPlayerRankingInList } from '@/components/list/playerRanking';
import { drawMonthlyRankingCutoffTopChart } from '@/components/chart/monthlyRankingCutoffChart';
import { resizeImage } from '@/components/utils';
import { MonthlyRankingCutoffTop } from '@/types/MonthlyRankingCutoff';
import { drawMonthlyRankingDatablock } from '@/components/dataBlock/monthlyRanking';

export async function drawMonthlyRankingCutoffEventTop(monthlyRankingId: number, mainServer: Server, compress: boolean): Promise<Array<Buffer | string>> {
    const monthlyRankingCutoffTop = new MonthlyRankingCutoffTop(monthlyRankingId, mainServer);
    await monthlyRankingCutoffTop.initFull();
    if (!monthlyRankingCutoffTop.isExist) {
        return [`错误: ${ serverNameFullList[mainServer] } 月榜不存在或数据不足`];
    }

    const all: Array<Canvas | Image> = [];
    all.push(drawTitle('档线', `${ serverNameFullList[mainServer] } 月榜10档线`));
    all.push(await drawMonthlyRankingDatablock(monthlyRankingCutoffTop.monthlyRanking, [mainServer]));

    const list: Array<Image | Canvas> = [];
    const userInRankings = monthlyRankingCutoffTop.getLatestRanking();
    for (let i = 0; i < userInRankings.length; i++) {
        const color = i % 2 == 0 ? 'white' : '#f1f1f1';
        const user = monthlyRankingCutoffTop.getUserByUid(userInRankings[i].uid);
        const playerRankingImage = await drawPlayerRankingInList(user, color, mainServer);
        if (playerRankingImage != undefined) {
            list.push(resizeImage({ image: playerRankingImage, widthMax: 800 }));
        }
    }

    list.push(new Canvas(800, 50));
    list.push(await drawMonthlyRankingCutoffTopChart(monthlyRankingCutoffTop, false));

    all.push(drawDatablock({ list }));
    const buffer = await outputFinalBuffer({ imageList: all, useEasyBG: true, compress });
    return [buffer];
}


