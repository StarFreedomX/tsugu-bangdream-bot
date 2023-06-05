import { callAPIAndCacheResponse } from '../api/getApi';
import mainAPI from './_Main';
import { Bestdoriurl } from '../config';
import { Server } from './Server';
import { Event } from './Event';
import { predict } from '../api/cutoff.cjs'

export const tierListOfServer = {
    'jp': [100, 500, 1000, 2000, 5000, 10000],
    'tw': [100, 500],
    'en': [50, 100, 300, 500, 1000, 2000, 2500],
    'kr': [100],
    'cn': [50, 100, 300, 500, 1000, 2000]
}

export class Cutoff {
    eventId: number;
    server: Server;
    tier: number;
    isExist = false;
    cutoffs: { time: number, ep: number }[];
    eventType: string;
    latestCutoff: { time: number, ep: number };
    rate: number | null;
    predictEP: number;
    startAt: number;
    endAt: number;
    constructor(eventId: number, server: Server, tier: number) {
        const event = new Event(eventId)
        //如果活动不存在，直接返回
        if (!event.isExist) {
            this.isExist = false;
            return
        }
        this.eventType = event.eventType
        this.eventId = eventId
        this.server = server
        //如果该档线不在该服的档线列表中，直接返回
        if (!tierListOfServer[Server[server]].includes(tier)) {
            this.isExist = false;
            return
        }
        this.tier = tier
        this.isExist = true;
        this.startAt = event.startAt[server]
        this.endAt = event.endAt[server]
    }
    async initFull() {
        const cutoffData = await callAPIAndCacheResponse(`${Bestdoriurl}/api/tracker/data?server=${<number>this.server}&event=${this.eventId}&tier=${this.tier}`)
        if (cutoffData == undefined) {
            this.isExist = false;
            return
        }
        else if (cutoffData['result'] == false) {
            this.isExist = false;
            return
        }
        this.isExist = true;
        this.cutoffs = cutoffData['cutoffs'] as { time: number, ep: number }[]
        if (this.cutoffs.length == 0) {
            this.latestCutoff = { time: 0, ep: 0 }
            return
        }
        else {
            this.latestCutoff = this.cutoffs[this.cutoffs.length - 1]
        }
        //rate
        let rateDataList = mainAPI['rates'] as [{ server: number, type: string, tier: number, rate: number }]
        let rateData = rateDataList.find((element) => {
            return element.server == this.server && element.type == this.eventType && element.tier == this.tier
        }
        )
        if (rateData == undefined) {
            this.rate = null
        }
        else {
            this.rate = rateData.rate
        }
    }
    predict(): number {
        if (this.isExist == false) {
            return
        }
        const event = new Event(this.eventId)
        let start_ts = Math.floor(event.startAt[this.server] / 1000)
        let end_ts = Math.floor(event.endAt[this.server] / 1000)
        let cutoff_ts: { time: number, ep: number }[] = []
        for (let i = 0; i < this.cutoffs.length; i++) {
            const element = this.cutoffs[i];
            cutoff_ts.push({ time: Math.floor(element.time / 1000), ep: element.ep })
        }
        try {
            var result = predict(cutoff_ts, start_ts, end_ts, this.rate)
        } catch {
            this.predictEP = 0
            return this.predictEP
        }
        this.predictEP = Math.floor(result.ep)
        return this.predictEP
    }
    getChartData(setStartToZero = false): { x: Date, y: number }[] {
        //setStartToZero:是否将开始时间设置为0
        if (this.isExist == false) {
            return
        }
        let chartData: { x: Date, y: number }[] = []
        if (setStartToZero) {
            chartData.push({ x: new Date(0), y: 0 })
        }
        else {
            chartData.push({ x: new Date(this.startAt), y: 0 })

        }
        for (let i = 0; i < this.cutoffs.length; i++) {
            const element = this.cutoffs[i];
            if (setStartToZero) {
                chartData.push({ x: new Date(element.time - this.startAt), y: element.ep - this.cutoffs[0].ep })
            }
            else {
                chartData.push({ x: new Date(element.time), y: element.ep })

            }
        }
        return chartData
    }
}