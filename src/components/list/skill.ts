import { Skill } from '../../types/Skill'
import { Server, getServerByPriority } from '../../types/Server'
import { drawTipsInList, drawListByServerList } from '../list'
import { stackImage } from '../utils'
import { Canvas } from 'canvas'
import { Card } from '../../types/Card'
import { globalDefaultServer } from '../../config'

interface SkillInListOptions {
    key?: string;
    card: Card;
    content: Skill;
}
export async function drawSkillInList({
    key,
    card,
    content
}: SkillInListOptions, defaultServerList: Server[] = globalDefaultServer): Promise<Canvas> {
    var listImage = await drawListByServerList(card.skillName, key, defaultServerList)
    var server = getServerByPriority(content.description, defaultServerList)
    var tipsImage = drawTipsInList({
        text: content.getSkillDescription()[server]
    })
    return stackImage([listImage, tipsImage])
}
