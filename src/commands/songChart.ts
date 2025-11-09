import { Server } from "../types/Server"
import { getReplyFromBackend } from "../api/getReplyFromBackend"
import { Config } from '../config';

export async function commandSongChart(config: Config, displayedServerList: Server[], songId: number, difficultyId?: number, searchText?: string): Promise<Array<Buffer | string>> {
    return await getReplyFromBackend(`${config.backendUrl}/songChart`, {
        displayedServerList,
        songId,
        compress: config.compress,
        difficultyId,
        text: searchText
    })
}

export async function commandCommunitySongChart(config: Config, songId: number): Promise<Array<Buffer | string>> {
    return await getReplyFromBackend(`${config.backendUrl}/songChart/community`, {
        songId,
        compress: config.compress
    })
}
