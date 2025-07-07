import { Server } from "../types/Server";
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandTopSleepStat(config: Config, playerId: string, tier: number, time: number, mainServer: Server): Promise<Array<Buffer | string>> {
  return await getReplyFromBackend(`${config.backendUrl}/topSleepStat`, {
    mainServer,
    playerId,
    tier,
    time,
    compress: config.compress,
  })
}
