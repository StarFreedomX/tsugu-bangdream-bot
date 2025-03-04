import { Chart } from "@/types/Song"
import { Card, Stat, statSum, mulStat, addStat } from "@/types/Card"
import { AreaItemType } from "@/types/AreaItem"
import { Character } from "@/types/Character"
import { Item } from "@/types/Item"
import { print } from "./calcResult"

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

function random(x: number) {
    return Math.floor(Math.random() * x)
}
function randomPick(list) {
    return list[random(list.length)]
}

export function simulateAnneal(charts: Array<Chart>, list: Array<cardInfo>, areaItem, type: string) {

    function getResult(teamList: Array<Array<number>>) {
        const teamDetail: Array<Array<cardInfo>> = []
        const result = {
            totalScore: 0,
            totalStat: 0,
            score: [],
            stat: [],
            team: [],
            capital: [],
            item: {}
        }

        //确定最高得分技能顺序
        const res = []
        for (var i = 0; i < teamList.length - 1; i += 1) {
            teamDetail.push(teamList[i].map(j => list[j]))
            const cur = charts[i].getMaxMetaOrder(teamDetail[i])
            res.push(cur)
            result.capital.push(cur.capital)
            result.team.push(cur.team)
        }
        
        //计算基础综合力以及活动加成
        for (var i = 0; i < teamDetail.length; i += 1) {
            var tmpStat:Stat = {
                performance: 0,
                technique: 0,
                visual: 0
            }
            for (const { stat, eventAddStat } of teamDetail[i]) {
                addStat(tmpStat, stat)
                addStat(tmpStat, eventAddStat)
            }
            const curSum = statSum(tmpStat)
            // console.log(curSum)
            result.stat.push(curSum)
        }

        //选道具
        {
            const sumList = [0, 0, 0]
            for (const i in areaItem) {
                var metaMax = 0, idmax, statListMax
                for (const id in areaItem[i]) {
                    var meta = 0, statList = []
                    for (var j = 0; j < teamDetail.length; j += 1) {
                        var tmpStat: Stat = {
                            performance: 0,
                            technique: 0,
                            visual: 0
                        }
                        for (const { card, stat } of teamDetail[j]) {
                            switch (parseInt(i)) {
                                case AreaItemType.band:
                                    if (id == '1000' || id == card.bandId.toString()) {
                                        addStat(tmpStat, mulStat(stat, areaItem[i][id].stat))
                                    }
                                    break
                                case AreaItemType.attribute:
                                    if (id == '~all' || id == card.attribute) {
                                        addStat(tmpStat, mulStat(stat, areaItem[i][id].stat))
                                    }
                                    break
                                case AreaItemType.magazine:
                                    addStat(tmpStat, mulStat(stat, areaItem[i][id].stat))
                            }
                        }
                        statList.push(tmpStat)
                        meta += statSum(tmpStat) * res[j].meta
                    }
                    if (meta > metaMax) {
                        metaMax = meta
                        idmax = id
                        statListMax = statList
                    }
                }
                result.item[i] = idmax
                for (var j = 0; j < teamDetail.length; j += 1) {
                    sumList[j] += statSum(statListMax[j])
                }
            }
            for (var i = 0; i < teamDetail.length; i += 1) {
                // sumList[i] =  Math.floor(sumList[i])
                result.stat[i] += sumList[i]
                result.totalStat += result.stat[i]
                result.stat[i] = Math.floor(result.stat[i])
            }
            result.totalStat = Math.floor(result.totalStat)
        }

        //使用准确综合力计算得分
        for (var i = 0; i < teamList.length - 1; i += 1) {
            const cur = charts[i].getScore([...result.team[i], result.capital[i]], result.stat[i])
            result.score.push(cur)
            result.totalScore += cur
        }

        return result
    }
    function checkCharacter(teamList: Array<Array<number>>) {
        for (var i = 0; i < teamList.length - 1; i += 1) {
            const characterSet = new Set()
            for (const j of teamList[i]) {
                if (characterSet.has(list[j].card.characterId))
                    return true
                characterSet.add(list[j].card.characterId)
            }
        }
        return false
    }
    function nextTeam(teamList: Array<Array<number>>) {
        const pool = []
        for (var i = 0; i < teamList.length; i += 1)
            for (var j = i + 1; j < teamList.length; j += 1)
                if (teamList[i].length > 0 && teamList[j].length > 0)
                    pool.push({ i, j })
        const tmpteamList = []
        while (true) {
            const { i, j } = randomPick(pool)
            const p1 = random(teamList[i].length), p2 = random(teamList[j].length)
            var tmp = teamList[i][p1]
            teamList[i][p1] = teamList[j][p2]
            teamList[j][p2] = tmp

            if (!checkCharacter(teamList)) {
                for (var k = 0; k < teamList.length; k += 1) {
                    tmpteamList.push([...teamList[k]])
                }

                tmp = teamList[i][p1]
                teamList[i][p1] = teamList[j][p2]
                teamList[j][p2] = tmp
                break
            }

            tmp = teamList[i][p1]
            teamList[i][p1] = teamList[j][p2]
            teamList[j][p2] = tmp
        }
        return tmpteamList
    }

    var teamList = Array.from({ length: charts.length }, () => new Array<number> ())
    list.sort((a, b) => {
        return statSum(b.stat) - statSum(a.stat)
    })
    const usedSet = new Set()
    for (var i = 0; i < charts.length; i += 1) {
        const characterSet = new Set()
        for (var j = 0; j < list.length; j += 1) {
            if (characterSet.size == 5)
                break
            if (usedSet.has(j))
                continue
            if (characterSet.has(list[j].card.characterId))
                continue
            usedSet.add(j)
            teamList[i].push(j)
            characterSet.add(list[j].card.characterId)
        }
        if (characterSet.size < 5) {
            return { fail: true }
        }
    }
    const rem = []
    for (var i = 0; i < list.length; i += 1) {
        if (usedSet.has(i))
            continue
        rem.push(i)
    }
    teamList.reverse()
    teamList.push(rem)
    var data = getResult(teamList), la = data
    var t = 1e6, cnt = 0
    while (t > 1) {
        cnt += 1
        const nextTeamList = nextTeam(teamList)
        const cur = getResult(nextTeamList), delta = cur.totalScore - la.totalScore
        if (cur.totalScore > data.totalScore) {
            data = cur
            console.log(cnt)
            //@ts-ignore
            print(data)
        }
        if (delta > 0) {
            teamList = nextTeamList
        }
        else if (Math.exp(-delta / t) > Math.random()) {
            teamList = nextTeamList
        }
        la = cur
        t *= 0.99995
    }
    return { fail: false, ...data }
}