
import { drawGrid } from "./grid.js";
import { loadData, drawGraphics } from "./sounding.js";

//из урла получаем масштаб
const currentUrl = window.location.href;
const url = new URL(currentUrl);
const highScale = url.searchParams.get('scale')

// Настройки графика
const width = 800;
const height = 600;
const margin = { top: 30, right: 30, bottom: 50, left: 50 };

const tempK = 273.15;
const tan = width / height;

//получаем все данные
loadData(url).then(function(data) {
    console.log(12345, data)

    if (!Object.keys(data).length) {
        alert("Пока нет данных! Возможно, погоду на этом споте давно никто не смотрел. Заходите через 5-7 минут, и они появятся!");
        return;
    }

    //получаем из данных температуру и точку росы на поверхности (первое значение в массиве)
    let surface_temp = Math.round(data['data'][data['dates'][0]][0]['temp']) - tempK
    let surface_dew = Math.round(data['data'][data['dates'][0]][0]['dewpoint']) - tempK

    let height_top = 15000;
    let height_base = data['data'][data['dates'][0]][0]['height'];
    let temp_base, temp_top;

    if (highScale == 3500) {
        height_top = 3500
        temp_base = surface_temp-10;//15;
        temp_top = surface_temp+15;//40;
    } else if (highScale == 6000) {
        height_top = 6000
        temp_base = surface_temp-25;
        temp_top = surface_temp+15;
        //temp_base = 0;
        //temp_top = 40;
    } else {
        temp_base = surface_temp -65
        temp_top = surface_temp + 15
        //let temp_base = -40;
        //let temp_top = 60;
    }

    const dict = {
        "highScale": highScale,
        "width": width,
        "height": height,
        "height_top": height_top,
        "height_base": height_base,
        "temp_base": temp_base,
        "temp_top": temp_top,
        "tan": tan,
        "tempK": tempK,
        "surface_temp": surface_temp,
        "surface_dew": surface_dew
    };

    const svg = d3.select("#skewt-container")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        //.attr("width", width)
        //.attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Log scale for height (OY)
    const heightScale = d3.scaleLinear()  //d3.scaleLog()
        .domain([height_base, height_top])  // От 1050 гПа до 100 гПа
        .range([height, 0]);

    // Temp scale (OX)
    const tempScale = d3.scaleLinear()
        .domain([temp_base, temp_top])    // От -40°C до +40°C
        .range([0, width]);

    // Height axis (logariphmic)
    svg.append("g")
        .call(d3.axisLeft(heightScale).tickFormat(d => `${d} м`))
        //pressure lines
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width)
            .attr('class', 'pressureLines'))
        .call(g => g.select(".domain").remove());

    // Правая ось — только подписи, без линий
    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(heightScale).tickFormat(d => `${d} м`))
        .call(g => g.selectAll(".tick line").remove())  // удаляем линии
        .call(g => g.select(".domain").remove());       // удаляем ось-рамку

    // Temp axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(tempScale).tickFormat(d => `${d}°C`));

    drawGrid(svg, dict, heightScale, tempScale)

    // Declare the line generator
    const stratificationLine = d3.line()
    .x(d => {
        //console.log(d.temp - 273.15, tempScale(d.temp - 273.15));
        //return (tempScale(d.temp - tempK));
        return (tempScale(d.temp - tempK) + (heightScale(height_base)-heightScale(d.height))/tan);
    })
    .y(d => {
        //console.log(d.pressure, pressureScale(d.pressure));
        return heightScale(d.height);
        //return skewPoint(d)[1]//pressureScale(d.pressure);
    });

    const dewpointLine = d3.line()
    .x(d => {
        return (tempScale(d.dewpoint - tempK) + (heightScale(height_base)-heightScale(d.height))/tan);
    })
    .y(d => {
        return heightScale(d.height);
    });

    console.log(123);
    drawGraphics(data, svg, dict, tempScale, heightScale, stratificationLine, dewpointLine);

})