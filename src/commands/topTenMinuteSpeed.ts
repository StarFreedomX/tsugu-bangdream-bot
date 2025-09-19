import { Server } from "../types/Server";
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandTopTenMinuteSpeed(config: Config, mainServer: Server): Promise<Array<Buffer | string>> {
  return await getReplyFromBackend(`${config.backendUrl}/topTenMinuteSpeed`, {
    mainServer,
    compress: config.compress,
  })
}
