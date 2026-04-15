const drawWind = (data, dict, heightScale) => {
    // === НАСТРОЙКИ ===
    const windPanelOffset = 80;
    const arrowLength = 18;
    const levelStep = 1;

    // === ФУНКЦИИ ===
    function windSpeed(u, v) {
    return Math.sqrt(u * u + v * v);
    }

    function windDirection(u, v) {
    let dir = Math.atan2(-u, -v) * 180 / Math.PI;
    if (dir < 0) dir += 360;
    return dir;
    }

    function degToCompass(deg) {
    if (deg >= 348.75 || deg < 11.25) return "с";
    if (deg < 33.75) return "ссв";
    if (deg < 56.25) return "св";
    if (deg < 78.75) return "всв";
    if (deg < 101.25) return "в";
    if (deg < 123.75) return "вюв";
    if (deg < 146.25) return "юв";
    if (deg < 168.75) return "ююв";
    if (deg < 191.25) return "ю";
    if (deg < 213.75) return "ююз";
    if (deg < 236.25) return "юз";
    if (deg < 258.75) return "зюз";
    if (deg < 281.25) return "з";
    if (deg < 303.75) return "зсз";
    if (deg < 326.25) return "сз";
    return "ссз";
    }

    d3.select("#wind-container").selectAll("*").remove();

    const svg = d3.select("#wind-container")
        .append('svg')
        .attr("width", 400)
        .attr("height", dict.height + 80);

    svg.selectAll("*").remove();

    // === ЦВЕТОВАЯ ШКАЛА ===
    const maxWind = d3.max(data, d => windSpeed(d.wind_u, d.wind_v));

    const windColor = d3.scaleSequential()
    .domain([0, maxWind])
    .interpolator(d3.interpolateTurbo); // можно заменить на interpolateViridis

    // === SVG ГРУППА ===
    const windGroup = svg.append("g")
        .attr("class", "wind-panel");

    let width = 300
    let height = dict.height
    const panelX = width + windPanelOffset;

    // линия панели
    windGroup.append("line")
    .attr("x1", panelX)
    .attr("x2", panelX)
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#aaa")
    .attr("stroke-dasharray", "3,3");

    // === СТРЕЛКИ ===
    data
    .filter((d, i) => i % levelStep === 0)
    .filter(d => d.wind_u !== null)
    .forEach(d => {
        const y = heightScale(d.height);

        const speed = windSpeed(d.wind_u, d.wind_v);
        const dir = windDirection(d.wind_u, d.wind_v);
        const compass = degToCompass(dir);

        const color = windColor(speed);

        const angle = (dir - 180) * Math.PI / 180;

        const x1 = panelX;
        const y1 = y;

        const x2 = x1 + arrowLength * Math.sin(angle);
        const y2 = y1 + arrowLength * Math.cos(angle);

        // линия
        windGroup.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-linecap", "round");

        // наконечник
        const headSize = 5;

        windGroup.append("line")
        .attr("x1", x2)
        .attr("y1", y2)
        .attr("x2", x2 - headSize * Math.sin(angle - Math.PI / 6))
        .attr("y2", y2 - headSize * Math.cos(angle - Math.PI / 6))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

        windGroup.append("line")
        .attr("x1", x2)
        .attr("y1", y2)
        .attr("x2", x2 - headSize * Math.sin(angle + Math.PI / 6))
        .attr("y2", y2 - headSize * Math.cos(angle + Math.PI / 6))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

        // точка
        windGroup.append("circle")
        .attr("cx", x1)
        .attr("cy", y1)
        .attr("r", 2)
        .attr("fill", color);

        // подпись
        windGroup.append("text")
        .attr("x", panelX + 28)
        .attr("y", y1 + 3)
        .text(`${speed.toFixed(1)} м/с ${compass}`)
        .attr("font-size", "10px")
        .attr("fill", color);
    });

    // === ЛЕГЕНДА ===
    const legendHeight = 150;
    const legendY = 20;

    const legendScale = d3.scaleLinear()
    .domain([0, maxWind])
    .range([legendHeight, 0]);

    const legend = svg.append("g")
    .attr("transform", `translate(${panelX + 120}, ${legendY})`);

    // градиент
    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
    .attr("id", "wind-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

    d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", windColor(t * maxWind));
    });

    // прямоугольник легенды
    legend.append("rect")
    .attr("width", 10)
    .attr("height", legendHeight)
    .style("fill", "url(#wind-gradient)");

    // ось легенды
    legend.append("g")
    .attr("transform", "translate(10,0)")
    .call(d3.axisRight(legendScale).ticks(5))
    .append("text")
    .attr("fill", "#000")
    .attr("x", 0)
    .attr("y", -5)
    .text("м/с");
}

const drawWind2 = (data, dict, heightScale) => {
    
    const uvToWind = (u, v) => {
        var angle = Math.atan2(u, v);
        var wdir = 180 + 180*angle/Math.PI ;
        var WSpeed = Math.sqrt(u**2 + v**2);
        return [WSpeed, wdir];
    }

    let wind = [];

    d3.selectAll("#wind-container svg").remove();

    const svg = d3.select("#wind-container")
        .append("svg")
        .attr("width", 200)
        .attr("height", dict.height + 80);

    let next_height = 0;

    for (let i in data) {
        if (data[i].gpheight < next_height) {
            continue;
        }

        next_height = data[i].gpheight + 1000;

        wind = uvToWind(data[i].wind_u, data[i].wind_v);

        const padding = 50;
        
        // Переводим градусы в радианы
        const radians = (wind[1] * Math.PI) / 180;

        // Координаты начала стрелки
        const x0 = 50; // центр по оси X
        const y0 = 50; // центр по оси Y

        // Рассчитываем координаты конца стрелки
        const length = 8;//wind[0] * 3; // Умножаем на 10 для масштабирования
        const x1 = x0 + length * Math.sin(radians);
        const y1 = y0 - length * Math.cos(radians); // y уменьшается по мере увеличения

        // Добавляем линию
        svg.append("line")
            .attr("x1", x0)
            .attr("y1", y0)
            .attr("x2", x1)
            .attr("y2", y1)
            .attr("class", "arrow")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");

        // Добавляем наконечник стрелки
        svg.append("polygon")
            .attr("points", `
                ${x1},${y1} 
                ${x1 - 5 * Math.sin(radians + Math.PI / 6)},${y1 + 5 * Math.cos(radians + Math.PI / 6)} 
                ${x1 - 5 * Math.sin(radians - Math.PI / 6)},${y1 + 5 * Math.cos(radians - Math.PI / 6)}
            `)
            .attr("class", "arrow")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");
/*


        const windArrowLenght = Math.log10(wind[0]/2) + Math.e;// \ln\left(\frac{x}{2}+0.08\right)+e
        const rotate_direction_rad = (90 - wind[1]) * 180 / Math.PI;

        console.log(wind, wind[1] + 180);
        
        svg.append("line")
            .attr("x1", 10)
            .attr("x2", 20/Math.cos(45))
            .attr("y1", 10)
            .attr("y2", 20/Math.sin(45))
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");
            //.attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(-45)+",0,0)");
*/


      /* svg.append("line")
            .attr("x1", padding)
            .attr("x2", -(windArrowLenght * data[i].wind_u / wind[0]) + padding)
            .attr("y1", 0)
            .attr("y2", windArrowLenght * data[i].wind_v / wind[0])
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");
            //.attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(-45)+",0,0)");

        /*svg.append("line")
            .attr("x1", windArrowLenght)
            .attr("x2", windArrowLenght-5)
            .attr("y1", 0)
            .attr("y2", -5)
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");
            //.attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(rotate_direction)+",0,0)");
        
        svg.append("line")
            .attr("x1", windArrowLenght)
            .attr("x2", windArrowLenght-5)
            .attr("y1", 0)
            .attr("y2", 5)
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ")");
            //.attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(rotate_direction)+",0,0)");

console.log(wind[1])

        /*svg.append("line")
            .attr("x1", 20)
            .attr("x2", 15 + 20)
            .attr("y1", 10)
            .attr("y2", 10)
            .attr("class", "mixing-ratio");
            //.attr("transform", "translate(0, " + pressureScale(data[i].pressure) + ") rotate("+(wind[1])+",0,0)");

        svg.append("line")
            .attr("x1", 20 + 10)
            .attr("x2", 15 + 20)
            .attr("y1", 5)
            .attr("y2", 10)
            .attr("class", "mixing-ratio");*/

        let wind_speed = Math.round(wind[0])


        // Добавляем метку со скоростью
        svg.append("text")
            .attr("class", "speed-label")
            .attr("x", 40)
            .attr("y", 30)
            .text(wind_speed + ' m/s')
            .attr("transform", "translate(0, " + pressureScale(data[i].pressure) + ")");

    }
}

export {drawWind};