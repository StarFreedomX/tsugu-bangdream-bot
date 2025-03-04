import express from 'express';
import { body } from 'express-validator';
import { Server, getServerByServerId } from '@/types/Server';
import { getPresentEvent } from '@/types/Event';
import { listToBase64 } from '@/routers/utils';
import { isServer } from '@/types/Server';
import { drawEventStage } from '@/view/eventStage';
import { middleware } from '@/routers/middleware';
import { Request, Response } from 'express';

const router = express.Router();

router.post(
    '/',
    [
        body('mainServer').custom(isServer),
        body('eventId').optional().isInt(),
        body('index').optional().isInt(),
        body('date').optional().isInt(),
        body('meta').optional().isBoolean(),
        body('compress').optional().isBoolean(),
    ],
    middleware,
    async (req: Request, res: Response) => {

        const { mainServer, eventId, index, date, meta, compress } = req.body;
        try {
            const result = await commandEventStage(getServerByServerId(mainServer), compress, meta, eventId, index, date);
            res.send(listToBase64(result));
        } catch (e) {
            console.log(e);
            res.status(500).send({ status: 'failed', data: '内部错误' });
        }
    }
);

export async function commandEventStage(mainServer: Server, compress: boolean, meta: boolean = false, eventId?: number, index?: number, date?: number): Promise<Array<Buffer | string>> {
    if (!eventId && !date) {
        date = Date.now()
    }
    if (!eventId) {
        eventId = getPresentEvent(mainServer, date).eventId
    }
    if (!date && !index) {
        index = 1
    }

    return await drawEventStage(eventId, index, date ? new Date(date) : undefined, mainServer, meta, compress);
}

export { router as eventStageRouter }