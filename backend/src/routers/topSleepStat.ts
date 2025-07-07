import { drawCutoffDetail } from '@/view/cutoffDetail';
import { Server, getServerByServerId } from '@/types/Server';
import { getPresentEvent } from '@/types/Event';
import { listToBase64 } from '@/routers/utils';
import { isServer } from '@/types/Server';
import { body } from 'express-validator';
import express from 'express';
import {drawTopRateDetail, drawTopSleepStat} from '@/view/cutoffEventTop';
import { middleware } from '@/routers/middleware';
import { Request, Response } from 'express';

const router = express.Router();

router.post(
  '/',
  [
    body('mainServer').custom(isServer),
    body('playerId').optional().isInt(),
    body('tier').optional().isInt(),
    body('time').optional().isInt(),
    body('compress').optional().isBoolean(),
  ],
  middleware,
  async (req: Request, res: Response) => {

    const { mainServer, playerId, tier, time, compress } = req.body;

    try {
      const result = await commandTopSleepStat(getServerByServerId(mainServer), playerId, time, tier, compress);
      res.send(listToBase64(result));
    } catch (e) {
      console.log(e);
      res.status(500).send({ status: 'failed', data: '内部错误' });
    }
  }
);

export async function commandTopSleepStat(mainServer: Server, playerId: number, time: number, tier: number, compress: boolean): Promise<Array<Buffer | string>> {
  if (!playerId && !tier) {
    return ['请输入玩家id或排名']
  }
  const eventId = getPresentEvent(mainServer).eventId
  return await drawTopSleepStat(eventId, playerId, tier, mainServer,time, compress)
}

export { router as topSleepStatRouter }
