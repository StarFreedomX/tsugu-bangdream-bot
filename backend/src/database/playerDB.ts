import { MongoClient } from 'mongodb';
import { Server } from '@/types/Server';
import mainAPI from '@/types/_Main';
import { Event } from '@/types/Event';
import { Song } from '@/types/Song';
import { AreaItem, AreaItemType } from '@/types/AreaItem';
import { Card, Stat, addStat, emptyStat } from '@/types/Card';

export class playerDetail {
  playerId: number
  eventSongs: {
    [eventId: number]: Array<{
      songId: number
      difficulty: number
    }>
  }
  currentEvent: number
  cardList: {
    [cardId: number]: {
      illustTrainingStatus: boolean
      limitBreakRank: number
      skillLevel: number
    }
  }
  areaItem: {
    [areaItemId: number]: {
      level: number
    }
  }
  characterBouns: {
    [characterId: number]: {
      potential: Stat,
      characterTask: Stat
    }
  }
  constructor(playerId: number) {
    this.playerId = playerId
  }
  init(data? : playerDetail) {
    this.eventSongs = {}
    this.cardList = {}
    this.areaItem = {}
    this.characterBouns = {}
    const areaItemData = mainAPI['areaItems']
    for (const areaItemId in areaItemData) {
      this.areaItem[areaItemId] = { level: 0 }
    }
    const characterData = mainAPI['characters']
    for (const characterId in characterData) {
      this.characterBouns[characterId] = {
        potential: emptyStat(),
        characterTask: emptyStat()
      }
    }
    if (data) {
      this.eventSongs = data.eventSongs
      this.cardList = data.cardList
      this.areaItem = data.areaItem
      this.characterBouns = data.characterBouns
      this.currentEvent = data.currentEvent
    }
  }
  getCharacterCardCount() {
    const characterCardCount = {}
    for (const characterId in mainAPI['characters']) {
      characterCardCount[characterId] = 0
    }
    for (const cardId in this.cardList) {
      const card = new Card(parseInt(cardId))
      characterCardCount[card.characterId] += 1
    }
    return characterCardCount
  }
  checkComposeTeam(count: number) {
      var sum : number = 0
      const characterCardCount = this.getCharacterCardCount()
      for (const characterId in characterCardCount) {
          sum += Math.min(count, characterCardCount[characterId])
      }
      return sum >= 5 * count
  }
  // getInitTeam(count: number) {
  //   const list = Object.keys(this.cardList).map((cardId) => {
  //     const card = new Card(parseInt(cardId))
  //     return {
  //       cardId,
  //       characterId: card.characterId
  //     }
  //   })
  //   const used = new Set(), initTeam = Array.from({ length: count }, () => new Array<number> ()), characterCardCount = this.getCharacterCardCount()
  //   for (var i = 0; i < count; i += 1) {
  //     list.sort((a, b) => characterCardCount[b.characterId] - characterCardCount[a.characterId])
  //     console.log(list.map((a) => characterCardCount[a.characterId]))
  //     const characterSet = new Set()
  //     for (var j = 0; j < list.length; j += 1) {
  //       if (characterSet.size == 5) {
  //         break
  //       }
  //       if (used.has(j)) {
  //         continue
  //       }
  //       if (characterSet.has(list[j].characterId)) {
  //         continue
  //       }
  //       initTeam[i].push(parseInt(list[j].cardId))
  //       characterSet.add(list[j].characterId)
  //       used.add(j)
  //       characterCardCount[list[j].characterId] -= 1
  //     }
  //   }
  // }
  getAreaItemPercent() {
    const areaItemPercent = [{}, {}, {}]
    for (const areaItemId in this.areaItem) {
      const item = new AreaItem(parseInt(areaItemId))
      try {
        var type = item.getType()
      } catch{
        console.log(parseInt(areaItemId))
      }
      let id
      switch(type){
        case AreaItemType.band:
          id = item.targetBandIds.length == 1 ? item.targetBandIds[0] : 1000
          break
        case AreaItemType.attribute:
          id = item.targetAttributes.length == 1 ? item.targetAttributes[0]: "~all"
          break
        case AreaItemType.magazine:
          if (item.areaItemId == 80)
            id = 'performance'
          if (item.areaItemId == 81)
            id = 'technique'
          if (item.areaItemId == 82)
            id = 'visual'
      }
      if (!areaItemPercent[type][id]) {
        const emptyStat: Stat = {
          performance: 0,
          technique: 0,
          visual: 0
        }
        areaItemPercent[type][id] = {
          stat: emptyStat
        }
      }
      addStat(areaItemPercent[type][id].stat, item.getPercent(this.areaItem[areaItemId].level))
    }
    //海螺包和极上咖啡需要取最大值
    const minLevel = this.areaItem[59].level < this.areaItem[72].level ? 59 : 72
    subStat(areaItemPercent[AreaItemType.attribute]['~all'].stat, (new AreaItem(minLevel)).getPercent(this.areaItem[minLevel].level))
    return areaItemPercent
  }
}
export function subStat(stat: Stat, add: Stat): void {//综合力相减函数
    stat.performance -= add.performance
    stat.technique -= add.technique
    stat.visual -= add.visual
}

export class PlayerDB {
  private client: MongoClient;
  private db: any;


  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri);
    this.db = this.client.db(dbName);
    //尝试连接数据库，如果连接失败则抛出错误
    this.connect().catch((err) => {
      if (process.env.LOCAL_DB == 'true')
        console.log(`连接数据库失败 Error: ${err.message}`);
    });
  }

  private getCollection() {
    return this.db.collection('players');
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async init(playerId: number) {
    const key = playerId
    const data = new playerDetail(playerId)
    data.init()
    await this.getCollection().insertOne({ _id: key, ...data })
    return data;
  }
  async updCurrentEvent(playerId: number, server: Server, eventId: number) {
    var data: playerDetail = await this.getPlayer(playerId)
    data.currentEvent = eventId
    if (!data.eventSongs[eventId]) {
      const event = new Event(eventId)
      if (event.eventType == 'medley') {
        var defaultServer = server
        if (!event.startAt[defaultServer]) {
            defaultServer = Server.jp
        }
        await event.initFull()
        const list = data.eventSongs[eventId] = []
        for (var element of event.musics[defaultServer]) {
            const song = new Song(element.musicId)
            list.push({
                songId: song.songId,
                difficulty: song.getMaxMetaDiffId()
            })
        }
      }
    }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }
  async resetSong(playerId: number, server: Server, eventId: number) {
    var data: playerDetail = await this.getPlayer(playerId)
    delete data.eventSongs[eventId]
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return this.updCurrentEvent(playerId, server, eventId)
  }
  async updateSong(playerId: number, eventId: number, id: number, songId: number, difficulty: number) {
    var data: playerDetail = await this.getPlayer(playerId)
    if (id == 3) {
      for (var i = 0; i < 3; i += 1) {
        data.eventSongs[eventId][i] = { songId, difficulty }
      }
    }
    else
      data.eventSongs[eventId][id] = { songId, difficulty }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }
  async addCard(playerId: number, list) {
    var data: playerDetail = await this.getPlayer(playerId)
    for (const { id, illustTrainingStatus, limitBreakRank, skillLevel} of list) {
      data.cardList[id] = { illustTrainingStatus, limitBreakRank, skillLevel }
    }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }
  async delCard(playerId: number, list) {
    var data: playerDetail = await this.getPlayer(playerId)
    for (const id of list) {
      delete data.cardList[id]
    }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }

  async updateCharacterBouns(playerId: number, list) {
    var data: playerDetail = await this.getPlayer(playerId)
    for (const { characterId, potential, characterTask} of list) {
      data.characterBouns[characterId] = { potential, characterTask}
    }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }

  async updateAreaItem(playerId: number, list) {
    var data: playerDetail = await this.getPlayer(playerId)
    for (const { id, level} of list) {
      data.areaItem[id] = { level }
    }
    await this.getCollection().updateOne({ _id: playerId }, { $set: data })
    return data
  }

  async getPlayer(playerId: number): Promise<playerDetail | null> {
    var data: playerDetail
    const res = await this.getCollection().findOne({ _id: playerId })
    if (res == null) {
      data = await this.init(playerId)
    }
    else {
      data = new playerDetail(playerId)
      data.init(await this.getCollection().findOne({ _id: playerId }))
    }
    return data;
  }
}
