const lcjs = require('@lightningchart/lcjs')
const {
    AxisScrollStrategies,
    emptyFill,
    lightningChart,
    isImageFill,
    SolidFill,
    SolidLine,
    PalettedFill,
    LUT,
    ColorHEX,
    ColorRGBA,
    DashedLine,
    emptyLine,
    transparentFill,
    PointShape,
    AxisTickStrategies,
    DataSetXY,
    Themes,
} = lcjs

const exampleContainer = document.getElementById('chart') || document.body
if (exampleContainer === document.body) {
    exampleContainer.style.width = '100vw'
    exampleContainer.style.height = '100vh'
    exampleContainer.style.margin = '0px'
}
// Application places canvas directly below example container, rather than library automatically placing it to bottom of document body. This is required for correct draw order in Interactive Examples DOM tree.
const canvas = document.createElement('canvas')
exampleContainer.append(canvas)
const lc = lightningChart({
    sharedContextOptions: {
        canvas,
        // NOTE: Greatly improves performance on Mozilla firefox
        useIndividualCanvas: false,
    },
})

fetch(new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'examples/assets/0514/racing-data.json')
    .then((r) => r.json())
    .then((data) => {
        let iData = 0
        const listeners = []

        while (data[iData].lap_number < 1) {
            iData++
        }
        iData -= 500

        const update = () => {
            for (let i = 0; i < 10; i += 1) {
                const sample = data[iData]
                sample.time = performance.now()
                listeners.forEach((clbk) => clbk(sample, iData))
                iData++
                if (iData >= data.length) break
            }
            if (iData < data.length) {
                requestAnimationFrame(update)
            }
        }
        setTimeout(update, 500)
        const onData = (clbk) => {
            listeners.push(clbk)
        }

        const dataSet = new DataSetXY({
            schema: {
                time: { pattern: 'progressive' },
            },
            autoDetectPatterns: false,
        }).setMaxSampleCount({ mode: 'auto', max: 1_000_000 })
        onData((sample) => {
            dataSet.appendSample(sample)
        })

        // #region Tire temperatures
        const containerTireTemperatures = document.createElement('div')
        exampleContainer.append(containerTireTemperatures)
        const chartTireTemperatures = lc
            .ChartXY({
                container: containerTireTemperatures,
                defaultAxisX: { type: 'linear-highPrecision' },
                legend: { visible: false },
                theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
            })
            .setTitle('')
        containerTireTemperatures.style.position = 'absolute'
        containerTireTemperatures.style.left = '0px'
        containerTireTemperatures.style.top = '0px'
        containerTireTemperatures.style.width = '50%'
        containerTireTemperatures.style.height = '30%'
        const isDarkTheme = chartTireTemperatures.getTheme().isDark
        if (isImageFill(chartTireTemperatures.engine.getBackgroundFillStyle())) {
            chartTireTemperatures.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        chartTireTemperatures.axisX
            .setTickStrategy(AxisTickStrategies.Time)
            .setScrollStrategy(AxisScrollStrategies.scrolling)
            .setDefaultInterval((state) => ({
                end: state.dataMax ?? 0,
                start: (state.dataMax ?? 0) - 30_000,
                stopAxisAfter: false,
            }))
        chartTireTemperatures.axisY
            .setTitle('Tire temperature')
            .setAnimationScroll(false)
            .setUnits('F')
            .setInterval({ start: 180, end: 250 })
        const temperatureStroke = new SolidLine({
            thickness: 2,
            fillStyle: new PalettedFill({
                lookUpProperty: 'y',
                lut: new LUT({
                    interpolate: true,
                    steps: [
                        { value: 176, color: ColorHEX('#ffffff') },
                        { value: 212, color: ColorHEX('#ffa500') },
                        { value: 240, color: ColorHEX('#ff0000') },
                    ],
                }),
            }),
        })
        chartTireTemperatures.axisY
            .addConstantLine()
            .setValue(240)
            .setPointerEvents(false)
            .setStrokeStyle(
                new DashedLine({
                    thickness: 1,
                    fillStyle: new SolidFill({ color: ColorHEX('#ff0000') }),
                }),
            )
        const tireTemperaturesSeriesList = [
            'tire_temp_front_left',
            'tire_temp_front_right',
            'tire_temp_rear_left',
            'tire_temp_rear_right',
        ].map((key, i) => {
            const series = chartTireTemperatures
                .addLineSeries()
                .setName(key)
                .setStrokeStyle(temperatureStroke)
                .setDataSet(dataSet, { x: 'time', y: key })
        })
        const fuelAxis = chartTireTemperatures
            .addAxisY({ opposite: true })
            .setTitle('Fuel')
            .setLength({ pixels: 50 })
            .setTickStrategy(AxisTickStrategies.Numeric, (strategy) =>
                strategy.setTickStyle((ticks) => ticks.setGridStrokeStyle(emptyLine)),
            )
            .setInterval({ start: 0, end: 1 })
        const fuelSeries = chartTireTemperatures
            .addAreaSeries({
                axisY: fuelAxis,
                automaticColorIndex: 0,
            })
            .setDataSet(dataSet, { x: 'time', y: 'fuel' })

        // #endregion

        // #region Gauges
        const containerSpeedGauge = document.createElement('div')
        exampleContainer.append(containerSpeedGauge)
        const speedGauge = lc
            .Gauge({
                container: containerSpeedGauge,
                // theme: Themes.darkGold
            })
            .setTitle('')
            .setUnitLabel('kph')
            .setPadding(0)
            .setBarThickness(20)
            .setTickFont((font) => font.setSize(14))
            .setValueLabelFont((font) => font.setSize(20))
            .setUnitLabelFont((font) => font.setSize(20))
            .setNeedleLength(30)
            .setNeedleThickness(5)
            .setValueIndicators([
                { start: 0, end: 80, color: ColorHEX('#ffffff') },
                { start: 80, end: 160, color: ColorHEX('#ffa500') },
                { start: 160, end: 240, color: ColorHEX('#ff0000') },
            ])
            .setValueIndicatorThickness(3)
            .setTickFormatter((value) => (value > 0 && value < 240 ? '' : value.toFixed(0)))
            .setInterval(0, 240)
        containerSpeedGauge.style.position = 'absolute'
        containerSpeedGauge.style.left = '0px'
        containerSpeedGauge.style.top = '30%'
        containerSpeedGauge.style.width = '25%'
        containerSpeedGauge.style.height = '30%'
        if (isImageFill(speedGauge.engine.getBackgroundFillStyle())) {
            speedGauge.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        const containerRPMGauge = document.createElement('div')
        exampleContainer.append(containerRPMGauge)
        const rpmGauge = lc
            .Gauge({
                container: containerRPMGauge,
                // theme: Themes.darkGold
            })
            .setTitle('')
            .setUnitLabel('rpm')
            .setPadding(0)
            .setBarThickness(20)
            .setTickFont((font) => font.setSize(14))
            .setValueLabelFont((font) => font.setSize(20))
            .setUnitLabelFont((font) => font.setSize(20))
            .setNeedleLength(30)
            .setNeedleThickness(5)
            .setInterval(0, 8000)
            .setValueIndicators([
                { start: 0, end: 2000, color: ColorHEX('#ffffff') },
                { start: 2000, end: 4000, color: ColorHEX('#FFFF00') },
                { start: 4000, end: 6000, color: ColorHEX('#ffa500') },
                { start: 6000, end: 8000, color: ColorHEX('#ff0000') },
            ])
            .setValueIndicatorThickness(3)
            .setTickFormatter((value) => (value > 0 && value < 8000 ? '' : value.toFixed(0)))
        containerRPMGauge.style.width = '25%'
        containerRPMGauge.style.height = '30%'
        containerRPMGauge.style.position = 'absolute'
        containerRPMGauge.style.left = '25%'
        containerRPMGauge.style.top = '30%'
        onData((sample) => {
            speedGauge.setValue((sample.speed ?? 0) * 3.6)
            rpmGauge.setValue(sample.current_engine_rpm ?? 0)
        })
        if (isImageFill(rpmGauge.engine.getBackgroundFillStyle())) {
            rpmGauge.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }

        // #endregion

        //#region Time series

        const containerTimeSeries = document.createElement('div')
        exampleContainer.append(containerTimeSeries)
        const chartTimeSeries = lc
            .ChartXY({
                container: containerTimeSeries,
                defaultAxisX: { type: 'linear-highPrecision' },
                legend: { visible: false },
                // theme: Themes.darkGold
            })
            .setTitle('')
        containerTimeSeries.style.position = 'absolute'
        containerTimeSeries.style.left = '0px'
        containerTimeSeries.style.top = '60%'
        containerTimeSeries.style.width = '50%'
        containerTimeSeries.style.height = '40%'
        chartTimeSeries.axisX
            .setTickStrategy(AxisTickStrategies.Time)
            .setScrollStrategy(AxisScrollStrategies.scrolling)
            .setDefaultInterval((state) => ({
                end: state.dataMax ?? 0,
                start: (state.dataMax ?? 0) - 5_000,
                stopAxisAfter: false,
            }))
        if (isImageFill(chartTimeSeries.engine.getBackgroundFillStyle())) {
            chartTimeSeries.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        chartTimeSeries.axisY.dispose()
        const timeSeriesList = ['torque', 'brake', 'steer'].map((key, i) => {
            const axisY = chartTimeSeries
                .addAxisY({ iStack: -i })
                .setTitle(key)
                .setAnimationScroll(false)
                .setScrollStrategy(AxisScrollStrategies.fitting)
            const series = chartTimeSeries.addLineSeries({ axisY }).setDataSet(dataSet, { x: 'time', y: key })
        })

        // #endregion

        // #region Scatter graph

        const containerScatter = document.createElement('div')
        exampleContainer.append(containerScatter)
        const chartScatter = lc
            .ChartXY({
                container: containerScatter,
                legend: { visible: false },
                theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
            })
            .setTitle('')
        containerScatter.style.width = '50%'
        containerScatter.style.height = '30%'
        containerScatter.style.top = '0px'
        containerScatter.style.right = '0px'
        containerScatter.style.position = 'absolute'
        if (isImageFill(chartScatter.engine.getBackgroundFillStyle())) {
            chartScatter.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        chartScatter.axisX.setTitle('Acc X').setDefaultInterval({ start: 40, end: -40 }).setScrollStrategy(AxisScrollStrategies.expansion)
        chartScatter.axisY.setTitle('Acc Z').setDefaultInterval({ start: -20, end: 20 }).setScrollStrategy(AxisScrollStrategies.expansion)
        chartScatter.forEachAxis((axis) => axis.setAnimationScroll(false))
        chartScatter.setSeriesBackgroundFillStyle(new SolidFill({ color: ColorHEX(isDarkTheme ? '#000000' : '#ffffff') }))
        const seriesScatter = chartScatter
            .addPointSeries()
            .setPointSize(10)
            .setPointStrokeStyle(emptyLine)
            .setPointShape(PointShape.Circle)
            .setEffect(false)
            .setDataSet(dataSet, { x: 'acceleration_x', y: 'acceleration_z', lookupValue: 'time' })
        setInterval(() => {
            seriesScatter.setPointFillStyle(
                new PalettedFill({
                    lookUpProperty: 'value',
                    lut: new LUT({
                        interpolate: true,
                        steps: [
                            { value: performance.now(), color: ColorHEX(isDarkTheme ? '#ffffff' : '#000000') },
                            { value: performance.now() - 1000, color: ColorHEX('#ff0000') },
                            {
                                value: performance.now() - 10_000,
                                color: ColorHEX('#ff000000'),
                            },
                        ],
                    }),
                }),
            )
        }, 100)

        // #endregion

        // #region Heatmap
        const containerHeatmap = document.createElement('div')
        exampleContainer.append(containerHeatmap)
        const chartHeatmap = lc
            .ChartXY({
                container: containerHeatmap,
                legend: { visible: false },
                // theme: Themes.darkGold,
            })
            .setTitle('')
            .setTitlePosition('series-left-top')
            .setCursorMode(undefined)
        containerHeatmap.style.width = '50%'
        containerHeatmap.style.height = '30%'
        containerHeatmap.style.top = '30%'
        containerHeatmap.style.right = '0px'
        containerHeatmap.style.position = 'absolute'
        if (isImageFill(chartHeatmap.engine.getBackgroundFillStyle())) {
            chartHeatmap.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        chartHeatmap.forEachAxis((axis) => axis.setTickStrategy(AxisTickStrategies.Empty).setStrokeStyle(emptyLine))
        const trackBounds = {
            x: { min: -950, max: 1000 },
            y: { min: -200, max: 750 },
        }
        const heatmapColumns = 30
        const heatmapRows = 12
        const seriesHeatmap = chartHeatmap
            .addHeatmapGridSeries({
                columns: heatmapColumns,
                rows: heatmapRows,
                dataOrder: 'columns',
            })
            .setStart({ x: trackBounds.x.min, y: trackBounds.y.min })
            .setEnd({ x: trackBounds.x.max, y: trackBounds.y.max })
            .setWireframeStyle(emptyLine)
            .setFillStyle(
                new PalettedFill({
                    lut: new LUT({
                        interpolate: true,
                        steps: [
                            { value: -5, color: ColorHEX('#00ff00') },
                            { value: 0, color: ColorHEX(isDarkTheme ? '#000000' : '#ffffff') },
                            { value: 5, color: ColorHEX('#ff0000') },
                        ],
                    }),
                }),
            )
        const seriesHeatmapTrack = chartHeatmap
            .addLineSeries({ automaticColorIndex: 0 })
            .setDataSet(dataSet, { x: 'position_x', y: 'position_z' })
        const seriesHeatmapLatest = chartHeatmap.addPointSeries({ automaticColorIndex: 0 }).setPointSize(15).setPointShape(PointShape.Star)
        let prev
        onData((sample, iSample) => {
            if (typeof sample.lap_number === 'number') chartHeatmap.setTitle(`Lap ${sample.lap_number + 1}`)
            seriesHeatmapLatest.setSamples({
                xValues: [sample.position_x],
                yValues: [sample.position_z],
            })
            const iX = Math.round(
                ((heatmapColumns - 1) * (sample.position_x - trackBounds.x.min)) / (trackBounds.x.max - trackBounds.x.min),
            )
            const iY = Math.round(((heatmapRows - 1) * (sample.position_z - trackBounds.y.min)) / (trackBounds.y.max - trackBounds.y.min))
            if ((!prev || iX !== prev.iX || iY !== prev.iY) && sample.lap_number > 0) {
                let closestPerLap = new Array(10).fill(undefined)
                for (let i = 0; i < iSample; i++) {
                    const s2 = data[i]
                    if (s2.lap_number >= sample.lap_number) break
                    const delta =
                        (s2.position_x - sample.position_x) ** 2 +
                        (s2.position_z - sample.position_z) ** 2 +
                        (s2.current_lap_time - sample.current_lap_time) ** 2 // NOTE: current lap time purpose is for positions where lap has duplicate x/z positions (crossings/bridges)
                    const curClosest = closestPerLap[s2.lap_number]
                    if (!curClosest || curClosest.delta > delta) closestPerLap[s2.lap_number] = { delta, sample: s2 }
                }
                closestPerLap = closestPerLap
                    .filter((i) => i !== undefined)
                    .sort((a, b) => a.sample.current_lap_time - b.sample.current_lap_time)
                const fastestPrevious = closestPerLap[0]?.sample
                if (fastestPrevious) {
                    const timeDelta = sample.current_lap_time - fastestPrevious.current_lap_time
                    seriesHeatmap.invalidateIntensityValues({
                        iColumn: iX,
                        iRow: iY,
                        values: [[timeDelta]],
                    })
                }
            }
            prev = { iX, iY }
        })

        // #endregion

        //#region Table
        const containerTable = document.createElement('div')
        exampleContainer.append(containerTable)
        const table = lc
            .DataGrid({
                container: containerTable,
                // theme: Themes.darkGold
            })
            .setTitle('')
        containerTable.style.width = '50%'
        containerTable.style.height = '40%'
        containerTable.style.top = '60%'
        containerTable.style.right = '0px'
        containerTable.style.position = 'absolute'
        if (isImageFill(table.engine.getBackgroundFillStyle())) {
            table.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
        }
        table.setRowContent(0, ['Lap', 'Lap time', 'Race time', 'Race position', 'Fuel'])
        let prevSample
        const dataReversed = data.slice().reverse()
        let bestTime = 999999999999
        onData((sample) => {
            table.setRowContent(1, [
                sample.lap_number + 1,
                sample.current_lap_time?.toFixed(2) ?? '',
                sample.current_race_time?.toFixed(2) ?? '',
                sample.race_position,
                sample.fuel?.toFixed(3) ?? '',
            ])
            if (sample.best_lap_time !== 0) bestTime = Math.min(bestTime, sample.best_lap_time)
            if (prevSample && sample.lap_number > prevSample.lap_number) {
                let i = 1
                let already = false
                do {
                    const lap = sample.lap_number - i
                    if (lap < 0) break
                    const lastSample = dataReversed.find((s) => s.lap_number === lap)
                    table.setRowContent(1 + i, [
                        lastSample.lap_number + 1,
                        lastSample.current_lap_time?.toFixed(2) ?? '',
                        lastSample.current_race_time?.toFixed(2) ?? '',
                        lastSample.race_position,
                        lastSample.fuel?.toFixed(3) ?? '',
                    ])
                    table.setRowBackgroundFillStyle(
                        1 + i,
                        lastSample.current_lap_time <= bestTime && !already
                            ? new SolidFill({ color: ColorHEX('#00ff00aa') })
                            : table.getTheme().dataGridCellBackgroundFillStyle,
                    )
                    already = already || lastSample.current_lap_time <= bestTime
                    i++
                } while (true)
            }
            prevSample = sample
        })
        // #endregion
    })
