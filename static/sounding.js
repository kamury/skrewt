import { drawWind } from "./wind.js";

const loadData = (url) => {
    /*return new Promise(function(resolve, reject) {
        d3.json(url).
        then(function(data) {
            return resolve(data);
        });
    });*/

    return new Promise(function(resolve, reject) {
        fetch(`/api/1`).
        then(function(data) {
            return resolve(data.json());
        });
    });

    /*return new Promise(function(resolve, reject) {
        d3.csv(url, {delimiter: ';'}).
        then(function(data) {
            return resolve(data);
        });
    });*/
}

const render = (data, i, svg, dict, pressureScale, stratificationLine, dewpointLine) => {
    //console.log(i, data); 

    /*let pressure = [];
    let winvU = [];
    let windV = [];
    for (let index in data[i]) {

        //console.log(data[i][index]); 

        pressure.push(data[i][index].pressure);
        winvU.push(data[i][index].wind_u);
        windV.push(data[i][index].wind_v);
    }

    let b_data = {
        pressure: pressure,
        wind_u: winvU,
        wind_v: windV
    }*/
   console.log(data, i, data[i]);

    drawWind(data[i], dict, pressureScale);


    svg.selectAll(".stratificationLine").remove();
    svg.selectAll(".dewpointLine").remove();

    svg.append("path")
        .datum(data[i])
        .attr("fill", "none")
        .attr("class", "stratificationLine")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", stratificationLine);

    svg.append("path")
        .datum(data[i])
        .attr("fill", "none")
        .attr("class", "dewpointLine")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", dewpointLine);
}

const proceesGeoJson = (geojson) => {
    let data = [];

    for (let i = 0; i < geojson.length; i++) {
        //console.log(i, Object.keys(geojson[0]));
        console.log(geojson[i].H);
        data[i] = {
            "gpheight": geojson[i].H,
            "temp": geojson[i].T,
            "dewpoint": geojson[i].D,
            "pressure": geojson[i].P,
            "wind_u": geojson[i].Dir,
            "wind_v": geojson[i].V
        }

    }

    //--

    /*for (let i in geojson.features) {

        //console.log(typeof value === 'number')
        //console.log(typeof geojson.features[i].properties.temp)
        
        //if (typeof geojson.features[i].properties.temp  === 'number' && geojson.features[i].properties.pressure > 700) {
        if (typeof geojson.features[i].properties.temp  === 'number') {
            data[i] = geojson.features[i].properties;
        } 
    }*/

    console.log(11111, data);    
    return data;
    
}

const drawGraphics = (svg, dict, pressureScale, stratificationLine, dewpointLine) => {

    loadData("static/data/Skew.csv")
        .then(function(geojson) { 

        let full_data = [];

        //full_data.push(proceesGeoJson(geojson));
        full_data.push(geojson);

        console.log(33333, geojson);

        render(full_data, 0, svg, dict, pressureScale, stratificationLine, dewpointLine);

        //крутилка
        d3.select("#timeRange")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 4)
            .attr("value", 0)
            .on("input", function(v) {
                console.log(v.target.value)
                render(full_data, v.target.value, svg, dict, pressureScale, stratificationLine, dewpointLine);
            });
        });

   /* 
    //loadData("static/data/ryz.geojson")
    loadData("static/data/Skew.csv")

    //d3.json()
        .then(function(geojson) { 

        let full_data = [];

        console.log(22222, geojson);

        //full_data.push(proceesGeoJson(geojson));
        full_data.push(geojson);

        loadData("static/data/ryz2.geojson").then(
            function(geojson) {
                full_data.push(proceesGeoJson(geojson));

                loadData("static/data/ryz3.geojson").then(
                    function(geojson) {
                        full_data.push(proceesGeoJson(geojson));

                        loadData("static/data/ryz4.geojson").then(
                        function(geojson) {
                            full_data.push(proceesGeoJson(geojson));

                            loadData("static/data/ryz5.geojson").then(
                                function(geojson) {
                                    full_data.push(proceesGeoJson(geojson));

                                    render(full_data, 0, svg, dict, pressureScale, stratificationLine, dewpointLine);

                                    //крутилка
                                    d3.select("#timeRange")
                                        .attr("type", "range")
                                        .attr("min", 0)
                                        .attr("max", 4)
                                        .attr("value", 0)
                                        .on("input", function(v) {
                                            console.log(v.target.value)
                                            render(full_data, v.target.value, svg, dict, pressureScale, stratificationLine, dewpointLine);
                                        });


                                
                            })
                    })
            })
            
        })
    })  */  
}

export { drawGraphics }