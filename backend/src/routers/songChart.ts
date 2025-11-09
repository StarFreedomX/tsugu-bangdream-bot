import express from 'express';
import { body } from 'express-validator';
import {fuzzySearch, FuzzySearchResult} from '@/fuzzySearch';
import {isInteger, listToBase64} from '@/routers/utils';
import { isServerList } from '@/types/Server';
import { drawCommunitySongChart, drawSongChart } from '@/view/songChart';
import { getServerByServerId, Server } from '@/types/Server';
import { middleware } from '@/routers/middleware';
import { Request, Response } from 'express';
import {drawSongDetail} from "@/view/songDetail";
import {Song} from "@/types/Song";
import {drawSongList, matchSongList} from "@/view/songList";

const router = express.Router();

router.post(
    '/',
    [
        // Express-validator checks for type validation
        body('displayedServerList').custom(isServerList),
        body('songId').optional().isInt(),
        body('text').optional().isString(),
        body('difficultyId').isInt().optional(),
        body('compress').optional().isBoolean(),
    ],
    middleware,
    async (req: Request, res: Response) => {


        const { displayedServerList, songId, text, difficultyId, compress } = req.body;

        try {
            const result = await commandSongChart(displayedServerList, songId, compress, difficultyId, text);
            res.send(listToBase64(result));
        } catch (e) {
            console.log(e);
            res.status(500).send({ status: 'failed', data: '内部错误' });
        }
    }
);

router.post(
    '/community',
    [
        // Express-validator checks for type validation
        body('songId').isInt(),
        body('compress').optional().isBoolean(),
    ],
    middleware,
    async (req: Request, res: Response) => {


        const { songId, compress} = req.body;

        try {
            const result = await drawCommunitySongChart(songId, compress);
            res.send(listToBase64(result));
        } catch (e) {
            console.log(e);
            res.status(500).send({ status: 'failed', data: '内部错误' });
        }
    }
);


export async function commandSongChart(displayedServerList: Server[], songId: number, compress: boolean, difficultyId = 3, input?: string): Promise<Array<Buffer | string>> {
    /*
    text = text.toLowerCase()
    var fuzzySearchResult = fuzzySearch(text)
    console.log(fuzzySearchResult)
    if (fuzzySearchResult.difficulty === undefined) {
        return ['错误: 不正确的难度关键词,可以使用以下关键词:easy,normal,hard,expert,special,EZ,NM,HD,EX,SP']
    }
    */
    if (!songId && input) {
        let fuzzySearchResult: FuzzySearchResult
        fuzzySearchResult = fuzzySearch(input)

        if (Object.keys(fuzzySearchResult).length > 0) {
            // 计算歌曲模糊搜索结果
            const tempSongList = matchSongList(fuzzySearchResult, displayedServerList)

            if (tempSongList.length == 0) {
                return ['没有搜索到符合条件的歌曲']
            } else if (tempSongList.length == 1) {
                songId = tempSongList.at(0).songId;
            } else {
                return await drawSongList(fuzzySearchResult, displayedServerList, compress)
            }
        } else if (Object.keys(fuzzySearchResult).length == 0) {
            return ['错误: 没有有效的关键词']
        }
    }

    return await drawSongChart(songId, difficultyId, displayedServerList, compress)
}

export { router as songChartRouter }
