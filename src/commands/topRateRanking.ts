import { Server } from "../types/Server";
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandTopRateRanking(config: Config, mainServer: Server, time: number, compareTier?: number, compareUid? :number): Promise<Array<Buffer | string>> {
  return await getReplyFromBackend(`${config.backendUrl}/topRateRanking`, {
    mainServer,
    time,
    compareTier,
    compareUid,
    compress: config.compress,
  })
}
