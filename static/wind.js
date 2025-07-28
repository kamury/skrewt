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

        const windArrowLenght = 7;

       svg.append("line")
            .attr("x1", 20)
            .attr("x2", (wind[0]*3) + windArrowLenght)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(wind[1]+180)+",0,0)");

        svg.append("line")
            .attr("x1", (wind[0]*3) + windArrowLenght - 5)
            .attr("x2", (wind[0]*3) + windArrowLenght)
            .attr("y1", 5)
            .attr("y2", 0)
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(wind[1]+180)+",0,0)");
        
        svg.append("line")
            .attr("x1", (wind[0]*3) + windArrowLenght)
            .attr("x2", (wind[0]*3) + windArrowLenght +5)
            .attr("y1", -5)
            .attr("y2", 0)
            .attr("class", "mixing-ratio")
            .attr("transform", "translate(0, " + (pressureScale(data[i].pressure) + 30) + ") rotate("+(wind[1]+180)+",0,0)");

console.log(wind[1])

        /*svg.append("line")
            .attr("x1", 20)
            .attr("x2", 15 + 20)
            .attr("y1", 10)
            .attr("y2", 10)
            .attr("class", "mixing-ratio");*/
            //.attr("transform", "translate(0, " + pressureScale(data[i].pressure) + ") rotate("+(wind[1])+",0,0)");


        // Добавляем метку со скоростью
        svg.append("text")
            .attr("class", "speed-label")
            .attr("x", 40)
            .attr("y", 30)
            .text(wind[0] + ' m/s')
            .attr("transform", "translate(0, " + pressureScale(data[i].pressure) + ")");

    }
}

export {drawWind};