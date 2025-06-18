import numpy as np
from tensorflow.keras.layers import Input, BatchNormalization, Embedding, LSTM, Dense, Flatten, concatenate, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import SGD
from tensorflow.keras.constraints import MaxNorm
from data import getAllData, tierListOfServer
from predict import loss
from os import path


eventType_input = Input(shape=(1, ), dtype='int32', name='eventType')
band_input = Input(shape=(1, ), dtype='int32', name='band')
timestamp_input = Input(shape=(1,), dtype='float32', name='timestamp')
time_input = Input(shape=(2,), dtype='float32', name='time')
week_input = Input(shape=(1, ), dtype='int32', name='week')
hour_input = Input(shape=(1, ), dtype='int32', name='hour')
isHoliday_input = Input(shape=(1, ), dtype='float32', name='isHoliday')
average_input = Input(shape = (1, ), dtype='float32', name='average')

eventType_input_1 = Flatten()(Embedding(8, 4)(eventType_input))
band_input_1 = Flatten()(Embedding(10, 4)(band_input))
timestamp_input_1 = BatchNormalization()(timestamp_input)
time_input_1 = BatchNormalization()(time_input)
week_input_1 = Flatten()(Embedding(7, 4)(week_input))
hour_input_1 = Flatten()(Embedding(24, 4)(hour_input))
average_input_1 = BatchNormalization()(average_input)

x = concatenate([
                eventType_input_1, 
                band_input_1, 
                timestamp_input_1, 
                time_input_1, 
                week_input_1, 
                hour_input_1, 
                isHoliday_input, 
                average_input_1
                ])

x = Dense(64, activation='relu', kernel_constraint=MaxNorm(3))(x)
x = Dropout(0.3)(x)
x = Dense(64, activation='relu', kernel_constraint=MaxNorm(3))(x)
x = Dropout(0.3)(x)
x = Dense(64, activation='relu', kernel_constraint=MaxNorm(3))(x)
x = Dropout(0.3)(x)
main_output = Dense(1, activation='sigmoid', name='main_output')(x)
server = 3
for tier in tierListOfServer[server]:
    # if tier != 1000:
    #     continue
    model = Model(inputs = [
                            eventType_input, 
                            band_input, 
                            timestamp_input, 
                            time_input, 
                            week_input, 
                            hour_input, 
                            isHoliday_input, 
                            average_input
                            ], outputs = [main_output])

    model.compile(optimizer=SGD(lr=0.2, momentum=0.95), loss=loss)

    inputs, outputs, weight = getAllData(tier)
    inputTensors = [np.array(input) for input in inputs]
    outputTensors = [np.array(output) for output in outputs]
    weightArr = np.array(weight)
    for i in outputTensors:
        print(i.shape)

    model.fit(inputTensors, 
            outputTensors, 
            sample_weight=weightArr,
            epochs=500, 
            batch_size=32
            )

    model.save(path.join(path.join(path.dirname(path.abspath(__file__)), 'model'), f'ycx_{tier}_{server}.h5'))