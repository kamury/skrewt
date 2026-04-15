
const currentUrl = window.location.href;
const url = new URL(currentUrl);
const highScale = url.searchParams.get('scale')

//let pressure_top = 100;
//let pressure_base = 1050;
let height_top = 15000;
let height_base = 0;
let temp_base = -40;
let temp_top = 60;

//выбираем настройки в зависимости от разрешения графика 
if (highScale) {
    d3.select("#s" + highScale)
    .attr("class", "highScaleSel");
    } else {
    d3.select("#s12000")
        .attr("class", "highScaleSel");
}

if (highScale == 3500) {
    //pressure_top = 700;
    height_top = 3500
    temp_base = 15;
    temp_top = 40;
} else if (highScale == 6000) {
    //pressure_top = 450;
    height_top = 6000
    temp_base = 0;
    temp_top = 40;
}

import { drawGrid } from "./grid.js";

import { drawGraphics } from "./sounding.js";

// Настройки графика
const width = 800;
const height = 600;
const margin = { top: 30, right: 30, bottom: 50, left: 50 };

const tempK = 273.15;
const tan = width / height;

const dict = {
    "highScale": highScale,
    "width": width,
    "height": height,
    "height_top": height_top,
    "height_base": height_base,
    "temp_base": temp_base,
    "temp_top": temp_top,
    "tan": tan,
    "tempK": tempK
};

const svg = d3.select("#skewt-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Log scale for pressure (OY)
const heightScale = d3.scaleLinear()  //d3.scaleLog()
    .domain([height_base, height_top])  // От 1050 гПа до 100 гПа
    .range([height, 0]);

// Temp scale (OX)
const tempScale = d3.scaleLinear()
    .domain([temp_base, temp_top])    // От -40°C до +40°C
    .range([0, width]);

// Pressure axis (logariphmic)
svg.append("g")
    .call(d3.axisLeft(heightScale).tickFormat(d => `${d} м`))
    //pressure lines
    .call(g => g.selectAll(".tick line").clone()
          .attr("x2", width)
          .attr('class', 'pressureLines'))
    .call(g => g.select(".domain").remove());

// Temp axis
svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(tempScale).tickFormat(d => `${d}°C`));


/*console.log(temp_base, temp_top, tempScale(temp_base), tempScale(temp_top));
console.log(pressure_top, pressure_base, pressureScale(pressure_top), pressureScale(pressure_base));

var tan = (tempScale(temp_base) - tempScale(temp_top))/(pressureScale(pressure_top) - pressureScale(pressure_base));

console.log(tan);*/

drawGrid(svg, dict, heightScale, tempScale)


// Declare the line generator.
  /*const line = d3.line()
    .x(d => {
        console.log('pressure:', d.pressure);
        return xScale(d.pressure);
    })
    .y(d => {
        console.log('temp:', d.temp);
        return yScale(d.temp);
    });*/

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
        //return tempScale(d.dewpoint - 273.15);
        return (tempScale(d.dewpoint - tempK) + (heightScale(height_base)-heightScale(d.height))/tan);
    })
    .y(d => {
        return heightScale(d.height);
    });

console.log(123);
drawGraphics(svg, dict, heightScale, stratificationLine, dewpointLine);