const drawWind = (data, dict, pressureScale) => {
    
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