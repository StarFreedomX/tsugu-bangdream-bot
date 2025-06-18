@echo off
setlocal enabledelayedexpansion

set "array=20 30 40 50 100 200 300 400 500 1000 2000 3000 4000 5000 10000 20000 30000 50000 70000 100000"

for %%a in (%array%) do (
    tensorflowjs_converter --input_format keras --output_format=tfjs_graph_model .\src\predict\model\ycx_%%a_3.h5 .\src\predict\model\ycx_%%a_3
)