
import { Server, getServerByServerId } from '@/types/Server';
import { getPresentEvent } from '@/types/Event';
import { listToBase64 } from '@/routers/utils';
import { isServer } from '@/types/Server';
import { body } from 'express-validator';
import express from 'express';
import { drawTopTenMinuteSpeed } from '@/view/cutoffEventTop';
import { middleware } from '@/routers/middleware';
import { Request, Response } from 'express';
import { getPresentMonthlyRanking } from "@/types/MonthlyRanking";
import { drawMonthlyRankingTopTenMinuteSpeed } from "@/view/monthlyRankingCutoffEventTop";

const router = express.Router();

router.post(
  '/',
  [
    body('mainServer').custom(isServer),
    body('compress').optional().isBoolean(),
    body('allPlayer').optional().isBoolean(),
    body('time').optional().isInt(),
    body('date').optional().isInt(),
  ],
  middleware,
  async (req: Request, res: Response) => {

    const { mainServer, compress, time, date, allPlayer } = req.body;

    try {
      const result = await commandMonthlyRankingTopTenMinuteSpeed(getServerByServerId(mainServer), compress, date ? new Date(date) : undefined, time, allPlayer);
      res.send(listToBase64(result));
    } catch (e) {
      console.log(e);
      res.status(500).send({ status: 'failed', data: '内部错误' });
    }
  }
);

export async function commandMonthlyRankingTopTenMinuteSpeed(mainServer: Server, compress: boolean, date: Date, time?: number, allPlayer?: boolean): Promise<Array<Buffer | string>> {
  const targetTime = new Date(date);
  const monthlyRankingId = getPresentMonthlyRanking(mainServer, +targetTime).monthlyRankingId
  return await drawMonthlyRankingTopTenMinuteSpeed(monthlyRankingId, mainServer, compress, date, time, allPlayer);
}

export { router as monthlyRankingTopTenMinuteSpeedRouter };
