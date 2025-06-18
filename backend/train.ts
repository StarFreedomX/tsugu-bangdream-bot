// import { getAllData } from './src/predict/dataProcess'
// import { tensor, layers, model, train, losses} from '@tensorflow/tfjs-node'
// (async () => {
//     await new Promise(resolve => setTimeout(resolve, 10 * 1000))
//     const {inputs, outputs} = await getAllData()
//     const inputsTensor = inputs.map(list => tensor(list))
//     const outputsTensor = outputs.map(list => tensor(list))
//     // for (const i of inputsTensor) {
//     //     console.log(i.shape)
//     // }
//     const eventType_input = layers.input({ shape: [1] })
//     const character_input = layers.input({ shape: [10] })
//     const band_input = layers.input({ shape: [1] })
//     const tier_input = layers.input({ shape: [1] })
//     const timestamp_input = layers.input({ shape: [2] })
//     const week_input = layers.input({ shape: [1] })
//     const hour_input = layers.input({ shape: [1] })
//     const isHoliday_input = layers.input({ shape: [1]})
//     const sequence_input = layers.input({ shape: [48, 1] })

//     const eventType_input_1 = layers.flatten().apply(layers.embedding({ inputDim: 8, outputDim: 4}).apply(eventType_input))
//     const character_input_1 = layers.lstm({ units: 32 }).apply(layers.embedding({ inputDim: 50, outputDim: 8}).apply(character_input))
//     const band_input_1 = layers.flatten().apply(layers.embedding({ inputDim: 10, outputDim: 4}).apply(band_input))
//     const tier_input_1 = layers.batchNormalization().apply(tier_input)
//     const timestamp_input_1 = layers.batchNormalization().apply(timestamp_input)
//     const week_input_1 = layers.flatten().apply(layers.embedding({ inputDim: 7, outputDim: 4}).apply(week_input))
//     const hour_input_1 = layers.flatten().apply(layers.embedding({ inputDim: 24, outputDim: 4}).apply(hour_input))
//     const sequence_input_1 = layers.lstm({ units: 32 }).apply(layers.batchNormalization().apply(sequence_input))
//     //@ts-ignore
//     let x = layers.concatenate().apply([eventType_input_1, character_input_1, band_input_1, tier_input_1, timestamp_input_1, week_input_1, hour_input_1, isHoliday_input, sequence_input_1])
//     x = layers.dense({ units: 64, activation: 'relu'}).apply(x)
//     x = layers.dense({ units: 64, activation: 'relu'}).apply(x)
//     x = layers.dense({ units: 64, activation: 'relu'}).apply(x)
//     const main_output = layers.dense({ units: 1, activation: 'sigmoid'}).apply(x)
//     //@ts-ignore
//     const Model = model({ inputs: [eventType_input, character_input, band_input, tier_input, timestamp_input, week_input, hour_input, isHoliday_input, sequence_input], outputs: [main_output]})
//     Model.compile({optimizer: train.adamax(), loss: losses.meanSquaredError})
//     await Model.fit(inputsTensor, outputsTensor, { epochs: 2, batchSize: 32 })
//     await Model.save('file://.\\src\\predict\\ycx_model_1')
// })()