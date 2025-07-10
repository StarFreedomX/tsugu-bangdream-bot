import { Server } from "../types/Server";
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandTopSleepStat(config: Config, eventId: number, playerId: string, tier: number, time: number, mainServer: Server): Promise<Array<Buffer | string>> {
  return await getReplyFromBackend(`${config.backendUrl}/topSleepStat`, {
    mainServer,
    eventId,
    playerId,
    tier,
    time,
    compress: config.compress,
  })
}
