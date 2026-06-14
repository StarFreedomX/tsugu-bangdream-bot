import { Server } from "../types/Server";
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandMonthlyRankingTopTenMinuteSpeed(config: Config, mainServer: Server, time: number, date: Date, allPlayer: boolean): Promise<Array<Buffer | string>> {
    return await getReplyFromBackend(`${config.backendUrl}/monthlyRankingTopTenMinuteSpeed`, {
        mainServer,
        compress: config.compress,
        time,
        date: date?.getTime(),
        allPlayer,
    })
}
