import express from 'express';
import { body } from 'express-validator';
import { drawCharacterList } from '@/view/characterList';
import { drawCharacterDetail } from '@/view/characterDetail';
import { isInteger } from '@/routers/utils';
import { fuzzySearch, FuzzySearchResult, isFuzzySearchResult } from '@/fuzzySearch';
import { getServerByServerId, Server } from '@/types/Server';
import { listToBase64 } from '@/routers/utils';
import { isServerList } from '@/types/Server';
import { middleware } from '@/routers/middleware';
import { Request, Response } from 'express';

const router = express.Router();

router.post('/',
    [
        body('displayedServerList').custom(isServerList),
        body('fuzzySearchResult').optional().custom(isFuzzySearchResult),
        body('text').optional().isString(),
        body('compress').optional().isBoolean(),
    ],
    middleware,
    async (req: Request, res: Response) => {

        const { displayedServerList, fuzzySearchResult, text, compress } = req.body;

        // 检查 text 和 fuzzySearchResult 是否同时存在
        if (text && fuzzySearchResult) {
            res.status(422).json({ status: 'failed', data: 'text 与 fuzzySearchResult 不能同时存在' });
            return;
        }
        // 检查 text 和 fuzzySearchResult 是否同时不存在
        if (!text && !fuzzySearchResult) {
            res.status(422).json({ status: 'failed', data: '不能同时不存在 text 与 fuzzySearchResult' });
            return;
        }

        try {
            const result = await commandCharacter(displayedServerList, text || fuzzySearchResult, compress);
            res.send(listToBase64(result));
        } catch (e) {
            console.log(e);
            res.status(500).json({ status: 'failed', data: '内部错误' });
        }
    }
);

export async function commandCharacter(displayedServerList: Server[], input: string | FuzzySearchResult, compress: boolean): Promise<Array<Buffer | string>> {

    let fuzzySearchResult: FuzzySearchResult
    // 根据 input 的类型执行不同的逻辑
    if (typeof input === 'string') {
        if (isInteger(input)) {
            return await drawCharacterDetail(parseInt(input), displayedServerList, compress)
        }
        fuzzySearchResult = fuzzySearch(input)
    } else {
        // 使用 fuzzySearch 逻辑
        fuzzySearchResult = input
    }

    if (Object.keys(fuzzySearchResult).length == 0) {
        return ['错误: 没有有效的关键词']
    }

    return await drawCharacterList(fuzzySearchResult, displayedServerList, compress)

}

export { router as searchCharacterRouter }
