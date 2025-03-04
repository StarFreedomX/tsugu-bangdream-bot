import { Event } from '@/types/Event';
import { addStat, Stat, Card, mulStat } from '@/types/Card'
import { drawList, drawListByServerList, drawListMerge, drawListTextWithImages } from '@/components/list';
import { drawDottedLine } from '@/image/dottedLine'
import { drawDatablock } from '@/components/dataBlock'
import { drawGachaDatablock } from '@/components/dataBlock/gacha'
import { Image, Canvas } from 'skia-canvas'
import { drawBannerImageCanvas } from '@/components/dataBlock/utils'
import { drawTimeInList } from '@/components/list/time';
import { drawAttributeInList } from '@/components/list/attribute'
import { drawCharacterInList } from '@/components/list/character'
import { statConfig } from '@/components/list/stat'
import { drawCardListInList } from '@/components/list/cardIconList'
import { getPresentGachaList, Gacha } from '@/types/Gacha'
import { Server } from '@/types/Server';
import { drawTitle } from '@/components/title'
import { outputFinalBuffer } from '@/image/output'
import { drawDegreeListOfEvent } from '@/components/list/degreeList';
import { Song, getPresentSongList } from '@/types/Song'
import { drawSongListDataBlock } from '@/components/dataBlock/songList';
import { globalDefaultServer, serverNameFullList } from '@/config';
import { drawSongInList, drawSongListInList, drawSongInListBig, drawSongInListMid } from '@/components/list/song';
import { resizeImage, stackImage } from '@/components/utils';
import { drawCardIcon } from '@/components/card'
import { playerDetail } from '@/database/playerDB';
import { drawText } from '@/image/text';
import { AreaItem, AreaItemType, AreaItemTypeList } from '@/types/AreaItem';
import { Band } from '@/types/Band';
import { Attribute } from '@/types/Attribute'
import { Skill } from '@/types/Skill';
import { simulateAnneal } from './simulateAnneal';
import { bruteForce } from './bruteForce';
import mainAPI from '@/types/_Main'
export async function drawCalcResult(player: playerDetail, server: Server, useEasyBG: boolean, compress: boolean) {
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
        console.log(notes)
    }
    if (!player.checkComposeTeam(charts.length)) {
        return ['当前卡牌过少，无法进行组队']
    }

    const cardList = Object.keys(player.cardList).map(key => {
        return {
            card: new Card(parseInt(key)),
            stat: undefined,
            eventAddStat: undefined,
            duration: undefined,
            scoreUpMaxValue: undefined,
            rateup: undefined,
            illustTrainingStatus: player.cardList[key].illustTrainingStatus,
            limitBreakRank: player.cardList[key].limitBreakRank,
            skillLevel: player.cardList[key].skillLevel
        }
    })
    if (cardList.length > 31) {
        return ['当前卡牌数大于31张，计算时间过长，无法进行组队']
    }
    for (const info of cardList) {
        info.stat = await info.card.calcStat()
        const add = info.card.rarity * info.limitBreakRank * 50
        addStat(info.stat, {
            performance: add,
            technique: add,
            visual: add
        })
        {
            const tmpStat = mulStat(info.stat, player.characterBouns[info.card.characterId].potential)
            addStat(info.stat, {
                performance: Math.floor(tmpStat.performance),
                technique: Math.floor(tmpStat.technique),
                visual: Math.floor(tmpStat.visual)
            })
        }
        
        {
            const tmpStat = mulStat(info.stat, player.characterBouns[info.card.characterId].characterTask)
            addStat(info.stat, {
                performance: Math.floor(tmpStat.performance),
                technique: Math.floor(tmpStat.technique),
                visual: Math.floor(tmpStat.visual)
            })
        }

        {
            const tmpStat: Stat = {
                performance: 0,
                technique: 0,
                visual: 0
            }
            var flag: number = 0
            for (const { attribute, percent } of event.attributes) {
                if (attribute == info.card.attribute) {
                    flag |= 1
                    addStat(tmpStat, {
                        performance: percent,
                        technique: percent,
                        visual: percent
                    })
                }
            }
            
            for (const { characterId, percent } of event.characters) {
                if (characterId == info.card.characterId) {
                    flag |= 2
                    addStat(tmpStat, {
                        performance: percent,
                        technique: percent,
                        visual: percent
                    })
                }
            }
            
            for (const { situationId, percent } of event.members) {
                if (situationId == info.card.cardId) {
                    addStat(tmpStat, {
                        performance: percent,
                        technique: percent,
                        visual: percent
                    })
                }
            }

            if (flag == 3) {
                if (event.eventCharacterParameterBonus)
                    //@ts-ignore
                    addStat(tmpStat, event.eventCharacterParameterBonus)
                const percent = event.eventAttributeAndCharacterBonus.parameterPercent
                addStat(tmpStat, {
                    performance: percent,
                    technique: percent,
                    visual: percent
                })
            }

            {
                const percent = event.limitBreaks[info.card.rarity][info.limitBreakRank]
                addStat(tmpStat, {
                    performance: percent,
                    technique: percent,
                    visual: percent
                })
            }

            tmpStat.performance /= 100
            tmpStat.technique /= 100
            tmpStat.visual /= 100
            info.eventAddStat = mulStat(info.stat, tmpStat)
        }

        const skill: Skill = info.card.getSkill()
        info.duration = skill.duration[info.skillLevel - 1]
        info.scoreUpMaxValue = info.card.scoreUpMaxValue / 100
        info.rateup = skill.skillId == 61
    }

    const data = {songList, ...bruteForce(charts, cardList, player.getAreaItemPercent(), '')}
    // print(data)
    return await drawResult(data, event, useEasyBG, compress)
}

export async function drawResult(data, event: Event, useEasyBG: boolean, compress: boolean) {
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
    }
}

export interface calcResult {
    totalScore: number,
    totalStat: number,
    score: Array<number>,
    stat: Array<number>,
    team: Array<Array<any>>,
    capital: Array<any>,
    item: Object
}