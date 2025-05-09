import { Event } from '@/types/Event';
import { addStat, Stat, Card, mulStat, statSum } from '@/types/Card'
import { drawList, drawListByServerList, drawListMerge, drawListTextWithImages } from '@/components/list';
import { drawDottedLine } from '@/image/dottedLine'
import { drawDatablock } from '@/components/dataBlock'
import { Image, Canvas } from 'skia-canvas'
import { statConfig } from '@/components/list/stat'
import { Server } from '@/types/Server';
import { drawTitle } from '@/components/title'
import { outputFinalBuffer } from '@/image/output'
import { Song, getPresentSongList } from '@/types/Song'
import { drawSongInListMid } from '@/components/list/song';
import { resizeImage, stackImage } from '@/components/utils';
import { drawCardIcon } from '@/components/card'
import { playerDetail } from '@/database/playerDB';
import { drawText } from '@/image/text';
import { AreaItem, AreaItemType, AreaItemTypeList } from '@/types/AreaItem';
import { Band } from '@/types/Band';
import { Attribute } from '@/types/Attribute'
import { Skill } from '@/types/Skill';
import { bruteForce, teamInfo, cardInfo } from './bruteForce';
import { compositionResultDB } from '@/database/compositionResultDB';
const resultDB = new compositionResultDB(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/', 'tsugu-bangdream-bot')
export const limit = 31
export async function drawCalcResult(player: playerDetail, server: Server, useEasyBG: boolean, compress: boolean, save: boolean, description?: string) {
    const event = new Event(player.currentEvent)
    if (!event.isExist) {
        return ['错误: 活动不存在']
    }
    if (event.eventType != 'medley') {
        return ['错误：活动序号' + player.currentEvent + '类型不是组曲']
    }

    let defaultServer: Server = server
    if (!event.startAt[defaultServer]) {
        defaultServer = Server.jp
    }
    await event.initFull()
    var list: Array<Image | Canvas> = []
    const widthMax = 1200, line: Canvas = drawDottedLine({
        width: widthMax,
        height: 30,
        startX: 5,
        startY: 15,
        endX: widthMax - 5,
        endY: 15,
        radius: 2,
        gap: 10,
        color: "#a8a8a8"
    })

    const songList = player.eventSongs[player.currentEvent]
    const charts = await Promise.all(songList.map(async ({ songId, difficulty} ) => {
        const song = new Song(songId)
        await song.initFull()
        return await song.getChartData(difficulty)
    }))
    var notes = 0
    for (var i = 0; i < charts.length; i += 1) {
        charts[i].init(notes)
        notes += charts[i].count
    }
    if (!player.checkComposeTeam(charts.length)) {
        return ['当前卡牌过少，无法进行组队']
    }

    const cardList: Array<cardInfo> = Object.keys(player.cardList).map(key => new cardInfo(key))

    if (cardList.length > limit) {
        return [`当前卡牌数大于${limit}张，计算时间过长，无法进行组队`]
    }
    for (const info of cardList) {
        await info.initFull(event, player)
    }
    let calcResult
    try {
        calcResult = bruteForce(charts, cardList, player.getAreaItemPercent(), '')
    }
    catch(e) {
        return ['计算超时，尝试减少角色数量']
    }
    const data: calcResult = {songList, description, ...calcResult}
    print(data)
    const res: Array<Buffer | string> = await drawResult(data, event, useEasyBG, compress)
    if (save) {
        const result = await resultDB.addResult(player.currentEvent, data)
        res.push(`上传成功，当前活动有${result.compositionList.length}个方案`)
    }
    return res
}

export async function drawResult(data: calcResult, event: Event, useEasyBG: boolean, compress: boolean) {
    const all = [], width = 1020, line: Canvas = drawDottedLine({
        width: width,
        height: 30,
        startX: 5,
        startY: 15,
        endX: width - 5,
        endY: 15,
        radius: 2,
        gap: 10,
        color: "#a8a8a8"
    })
    all.push(drawTitle('计算', '结果'))
    //总分，总综合力以及道具
    {
        const list = []
        const totalScoreImage = drawList({
            key: '最高总分数',
            text: `${data.totalScore}`
        })
        const totalStatImage = drawList({
            key: '总综合力',
            text: `${data.totalStat}`
        })
        list.push(drawListMerge([totalScoreImage, totalStatImage], width))
        list.push(line)
        const bandId = data.item[AreaItemType.band], bandItemImage = drawListTextWithImages({
            key: '乐队道具',
            content: [bandId == '1000' ? drawText({
                text: '全部乐队',
                maxWidth: width
            }) : resizeImage({
                image: await (new Band(parseInt(bandId))).getLogo(),
                heightMax: 80
            })]
        })
        const attribute = data.item[AreaItemType.attribute], attributeItemImage = drawListTextWithImages({
            key: '颜色道具',
            content: [attribute == '~all' ? drawText({
                text: '全部颜色',
                maxWidth: width
            }) : resizeImage({
                image: await (new Attribute(attribute)).getIcon(),
                heightMax: 40
            })],
            lineSpacing: 40,
        })
        const stat = data.item[AreaItemType.magazine], magazineItemImage = drawList({
            key: '杂志道具',
            text: `${statConfig[stat].name}`,
            lineSpacing: 40
        })
        list.push(drawListMerge([bandItemImage, attributeItemImage, magazineItemImage], width))

        if (data.description) {
            list.push(drawList({
                key: '备注',
                text: data.description
            }))
        }

        all.push(drawDatablock({list}))
    }

    for (let i = 0; i < data.songList.length; i += 1) {
        const list = []
        const songImage = drawListTextWithImages({
            key: `第${i+1}首`,
            content: [await drawSongInListMid(new Song(data.songList[i].songId), data.songList[i].difficulty)]
        })
        const capitalImage = drawListTextWithImages({
            key: '队长',
            content: [await drawCardIcon({
                card: data.capital[i].card,
                trainingStatus: true,
                illustTrainingStatus: data.capital[i].illustTrainingStatus,
                limitBreakRank: data.capital[i].limitBreakRank,
                cardIdVisible: true,
                skillTypeVisible: true,
                cardTypeVisible: false,
                skillLevel: data.capital[i].skillLevel
            })]
        })
        const scoreImage = drawList({
            key: '分数',
            text: `${data.score[i]}`
        })
        const statImage = drawList({
            key: '综合力',
            text: `${data.stat[i]}`
        })
        list.push(drawListMerge([songImage, capitalImage, stackImage([scoreImage, new Canvas(1, 50), statImage])], width))
        const teamImage = drawListTextWithImages({
            key: `队伍组成以及技能顺序`,
            content: await Promise.all(data.team[i].map((info) => {
                return drawCardIcon({
                    card: info.card,
                    trainingStatus: true,
                    illustTrainingStatus: info.illustTrainingStatus,
                    limitBreakRank: info.limitBreakRank,
                    cardIdVisible: true,
                    skillTypeVisible: true,
                    cardTypeVisible: false,
                    skillLevel: info.skillLevel
                })
            })),
            maxWidth: width
        })
        list.push(teamImage)
        all.push(drawDatablock({list}))
    }
    var BGimage = useEasyBG ? undefined : (await event.getEventBGImage())

    var buffer = await outputFinalBuffer({
        imageList: all,
        useEasyBG: useEasyBG,
        BGimage,
        text: 'Event',
        compress: compress,
    })

    return [buffer];
}
export function print(res: calcResult) {
    console.log(res.totalScore, res.totalStat)
    console.log(res.score, res.stat)
    for (var i = 0; i < res.team.length; i += 1) {
        console.log(res.team[i].map((info) => info.card.cardId), res.capital[i].card.cardId)
        console.log(res.team[i].map(info => statSum(info.stat)), res.team[i].map(info => statSum(info.stat)).reduce((pre, cur) => pre + cur, 0))
    }
    console.log(res.item[0], res.item[1], res.item[2])
    
}

export interface calcResult {
    songList?: Array<{
        songId: number,
        difficulty: number
    }>,
    description?: string,
    totalScore: number,
    totalStat: number,
    score: Array<number>,
    stat: Array<number>,
    team: Array<Array<cardInfo>>,
    capital: Array<cardInfo>,
    item: Object
}