import { Chart, registerables } from 'chart.js';
// import { Chart as ChartJSNode } from 'chart.js/auto';
import { Canvas, FontLibrary, loadImage } from 'skia-canvas';
import 'chartjs-adapter-moment';
import { assetsRootPath } from '@/config';
import { assetErrorImageBuffer } from '@/image/utils';
import { disposeChartButKeepingCanvas } from './utils';

// 2. 注册 Chart.js 所有组件
Chart.register(...registerables);

// 3. 强制使用 `basic` platform，避免 DOM 相关错误
// ChartJSNode.defaults.platform = 'basic';

// 4. 配置字体（如果有的话）
FontLibrary.use("old", [`${assetsRootPath}/Fonts/old.ttf`]);

// 5. 定义参数接口
interface drawTimeLineChartOptions {
    start: Date;
    end: Date;
    setStartToZero?: boolean;
    setYStartToZero?: boolean;
    useSegmentDash?: boolean;
    hideSegmentGapMinutes?: number;
    excludeFirst24h?: boolean;
    data: {
        datasets: any[];
    };
}

// 6. 主函数：生成时间轴图表
export async function drawTimeLineChart(
    {start, end, setStartToZero = false, setYStartToZero = true, useSegmentDash = true, hideSegmentGapMinutes, excludeFirst24h, data}: drawTimeLineChartOptions,
    displayLabel = false
) {
    const width = 800;
    const height = 900;

    // 7. 创建 skia-canvas 实例
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // 8. 计算 y 轴范围
    let yMin: number;
    let yMax: number;

    if (excludeFirst24h) {
        // 歌榜前十线：排除前24h数据，取极差±10%作为视口
        const yRangeStart = start.getTime() + 24 * 60 * 60 * 1000;
        const allY: number[] = [];
        for (const ds of data.datasets) {
            for (const pt of ds.data) {
                if (pt.x.getTime() >= yRangeStart) {
                    allY.push(pt.y);
                }
            }
        }
        if (allY.length) {
            yMin = Math.min(...allY);
            yMax = Math.max(...allY);
            const range = yMax - yMin;
            const margin = Math.max(range * 0.1, 1000);
            yMin = Math.max(0, yMin - margin);
            yMax = yMax + margin;
        } else {
            yMin = 0;
            yMax = 1;
        }
    } else {
        yMax = Math.max(
            ...data.datasets.map((dataset: any) =>
                Math.max(...dataset.data.map((pt: any) => pt.y))
            )
        );
        yMin = setYStartToZero ? 0 : Math.max(
            ...data.datasets.map((dataset: any) =>
                Math.min(...dataset.data.map((pt: any) => pt.y))
            )
        );
    }

    //10. 虚线（仅活动/月榜等连续数据需要，歌榜稀疏数据跳过）
    if (useSegmentDash) {
        const borderDash = (ctx) => {
            const p0 = ctx.p0.parsed.x as number;
            const p1 = ctx.p1.parsed.x as number;
            const diffHours = (p1 - p0) / (1000 * 60 * 60);
            return diffHours > 2 ? [6, 4] : []; // 超过2h用虚线，否则实线
        }
        data.datasets.map((dataset: any) =>
            dataset.segment ? dataset.segment.borderDash = borderDash : dataset.segment = {
                borderDash,
            },
        )
    }

    //10.5. 歌榜间隔过大不连线（>hideSegmentGapMinutes 分钟则隐藏线段）
    if (hideSegmentGapMinutes && hideSegmentGapMinutes > 0) {
        for (const dataset of data.datasets) {
            dataset.segment = {
                ...(dataset.segment || {}),
                borderColor: (ctx: any) => {
                    const p0 = ctx.p0.parsed.x as number;
                    const p1 = ctx.p1.parsed.x as number;
                    const diffMinutes = (p1 - p0) / (1000 * 60);
                    return diffMinutes > hideSegmentGapMinutes ? 'transparent' : undefined;
                },
            };
        }
    }

    // 9. 配置 Chart.js 选项
    const options = {
        plugins: {
            legend: {
                labels: {
                    font: {
                        size: 20,
                    },
                },
                display: displayLabel,
            },
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                },
                min: start,
                max: end,
                display: !setStartToZero,
            },
            y: {
                min: excludeFirst24h
                    ? yMin
                    : (setYStartToZero || yMin < 1000) ? 0 : (yMin - 1000) * 0.9,
                max: excludeFirst24h
                    ? yMax
                    : (yMax + 1000) * 1.1,
            },
        },
    };

    // 10. Chart.js 配置
    const config = {
        type: 'line' as const,
        data,
        options: {
            ...options,
            responsive: false, // 重要：关闭 Chart.js 自适应模式
            animation: false,
        },
    };

  try {
    // 11. 生成 Chart.js 图表
    const chart = new Chart(ctx as any, config as any);
    disposeChartButKeepingCanvas(chart)
    // 12. 返回 skia-canvas 的 Image 对象
    return canvas
  } catch (e) {
    console.error(e);
    return loadImage(assetErrorImageBuffer);
  }
}
