import { Chart } from "@/types/Song"
import { Card, Stat, statSum, mulStat, addStat } from "@/types/Card"
import { AreaItemType } from "@/types/AreaItem"
import { Character } from "@/types/Character"
import { Item } from "@/types/Item"
import { calcResult, print } from "./calcResult"
import { max } from "moment"

export interface cardInfo{
    card: Card,
    illustTrainingStatus: boolean,
    limitBreakRank: number,
    skillLevel: number,
    stat: Stat,
    eventAddStat: Stat,
    duration: number,
    scoreUpMaxValue: number,
    rateup: boolean
}
export class teamInfo{
    set: number
    stat: number
    team: Array<cardInfo>
    score: Array<number>
    order: Array<Array<cardInfo>>
    capital: Array<cardInfo>
    constructor() {
        this.stat = 0
        this.score = []
        this.order = []
        this.capital = []
    }
    calcStat(areaItem, bandId, attribute, magazine) {
        const tmpStat: Stat = {
            performance: 0,
            technique: 0,
            visual: 0
        }
        for (const { card, stat, eventAddStat } of this.team) {
            if (bandId == '1000' || bandId == card.bandId.toString()) {
                addStat(tmpStat, mulStat(stat, areaItem[AreaItemType.band][bandId].stat))
            }
            if (attribute == '~all' || attribute == card.attribute) {
                addStat(tmpStat, mulStat(stat, areaItem[AreaItemType.attribute][attribute].stat))
            }
            addStat(tmpStat, mulStat(stat, areaItem[AreaItemType.magazine][magazine].stat))
            addStat(tmpStat, stat)
            addStat(tmpStat, eventAddStat)
        }
        this.stat = statSum(tmpStat)
    }
}

export function bruteForce(charts: Array<Chart>, list: Array<cardInfo>, areaItem, type: string) {

    function checkCharacter(list: Array<cardInfo>) {
        const characterSet = new Set()
        for (const info of list) {
            if (characterSet.has(info.card.characterId))
                return false
            characterSet.add(info.card.characterId)
        }
        return true
    }

    function initTeamList(depth: number = 0, Set: number = 0, team: Array<cardInfo> = []) {
        if (depth == 5) {
            if (checkCharacter(team)) {
                const info = new teamInfo()
                info.team = team
                info.set = Set
                for (var i = 0; i < charts.length; i += 1) {
                    const res = charts[i].getMaxMetaOrder(team)
                    info.order.push(res.team)
                    info.capital.push(res.capital)
                }
                teamList.push(info)
            }
            return
        }
        for (var i = 0; i < list.length; i += 1) {
            if (Set >> i & 1) {
                break
            }
            initTeamList(depth + 1, Set | 1 << i, [list[i], ...team])
        }
    }
    var data: calcResult = {
        totalScore: 0,
        totalStat: 0,
        score: [],
        stat: [],
        item: {},
        capital: [],
        team : []
    }

    const teamList = []
    initTeamList()
    console.log(teamList.length)

    for (var bandId in areaItem[AreaItemType.band]) {
        for (var attribute in areaItem[AreaItemType.attribute]) {
            for (var magazine in areaItem[AreaItemType.magazine]) {
                const maxScore = Array.from({ length: charts.length }, () => 0)
                for (const info of teamList) {
                    info.calcStat(areaItem, bandId, attribute, magazine)
                    info.score = charts.map((chart, i) => {
                        const score = chart.getScore([...info.order[i], info.capital[i]], Math.floor(info.stat))
                        if (maxScore[i] < score)
                            maxScore[i] = score
                        return score
                    })
                }
                maxScore.push(0)
                for (var i = charts.length - 1; i >= 0; i -= 1) {
                    maxScore[i] += maxScore[i + 1]
                }
                teamList.sort((a, b) => {
                    return b.score.at(-1) - a.score.at(-1)
                })
                var cnt = 0
                function dfs(depth: number = 0, Set: number = 0, sumScore: number = 0, list: Array<teamInfo> = []) {
                    if (depth == charts.length) {
                        // console.log(sumScore)
                        if (sumScore > data.totalScore) {
                            const result = {
                                totalScore: sumScore,
                                totalStat: 0,
                                score: [],
                                stat: [],
                                team: [],
                                capital: [],
                                item: {}
                            }
                            for (var i = 0; i < charts.length; i += 1) {
                                const info: teamInfo = list[i]
                                result.totalStat += info.stat
                                result.score.push(info.score[i])
                                result.stat.push(Math.floor(info.stat))
                                result.team.push(info.order[i])
                                result.capital.push(info.capital[i])
                            }
                            result.totalStat = Math.floor(result.totalStat)
                            result.item[AreaItemType.band] = bandId
                            result.item[AreaItemType.attribute] = attribute
                            result.item[AreaItemType.magazine] = magazine
                            data = result
                        }
                        return
                    }
                    for (const info of teamList) {
                        if (Set & info.set) {
                            continue
                        }
                        if (sumScore + info.score[depth] + maxScore[depth + 1] > data.totalScore) {
                            list.push(info)
                            dfs(depth + 1, Set | info.set, sumScore + info.score[depth], list)
                            list.pop()
                        }
                        if (depth == charts.length - 1) {
                            break
                        }
                    }
                }
                dfs()
            }
        }
    }

    return data
}