import { GraphModel, loadGraphModel, Tensor, tensor } from "@tensorflow/tfjs-node"
import * as path from "path"
import { tierListOfServer } from "@/config"
import { Server } from "@/types/Server"
import { logger } from "@/logger";
let Model: {
    [tier: number]: GraphModel;
} = {};
export async function loadModel () {
    const server = Server.cn
    for (const tier of tierListOfServer[Server[server]]) {
        const modelPath = path.join(__dirname, 'model', `ycx_${tier}_${server}`, 'model.json')
        Model[tier] = await loadGraphModel(`file://${modelPath}`)
    }
    logger('model', 'loaded')
}
export function predict(inputs: Array<Array<any> >, tier: number) {
    const name = ["eventtype", "band", "timestamp", "time", "week", "hour", "isholiday", "average"]
    const type = ["int32", "int32", "float32", "float32", "int32", "int32", "float32", "float32"]
    const tensorMap = {}
    for (const i in inputs) {
        //@ts-ignore
        tensorMap[name[i]] = tensor(inputs[i], undefined, type[i])
    }
    const outputs = Model[tier].predict(tensorMap) as Tensor
    return outputs.arraySync()[0][0]
}