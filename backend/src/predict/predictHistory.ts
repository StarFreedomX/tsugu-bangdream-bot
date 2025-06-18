import { Server } from "@/types/Server";
import * as path from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
const historyPath = path.join(__dirname, 'history')
function getPredictFileName(eventId: number, tier: number, server: Server, history: boolean) {
    let dirname = path.join(historyPath, Server[server], eventId.toString(), tier.toString())
    if (!existsSync(dirname)) mkdirSync(dirname, { recursive: true })
    return path.join(dirname, `${history ? 'all' : 'cur'}.json`)
}
export function getHistory(eventId: number, tier: number, server: Server, history: boolean) {
    try {
        const data = JSON.parse(readFileSync(getPredictFileName(eventId, tier, server, history), 'utf-8'))
        return data
    }
    catch(e) {
        const data = history ? {} : []
        // saveHistory(eventId, tier, server, history, data)
        return data
    }
}
export function saveHistory(eventId: number, tier: number, server: Server, history: boolean, data) {
    writeFileSync(getPredictFileName(eventId, tier, server, history), JSON.stringify(data, null, 4))
}