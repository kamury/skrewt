import { drawWind } from "./wind.js";

const loadData = (url) => {
    /*return new Promise(function(resolve, reject) {
        d3.json(url).
        then(function(data) {
            return resolve(data);
        });
    });*/

    return new Promise(function(resolve, reject) {
        fetch(`/api/2`).
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
        .then(function(full_data) { 

        if (!Object.keys(full_data).length) {
            alert("Пока нет данных! Возможно, погоду на этом споте давно никто не смотрел. Заходите через пару минут, и они появятся!")
        }

        let data = full_data['data']
        let dates = full_data['dates']

        console.log(dates)
        console.log(full_data)

        //full_data.push(proceesGeoJson(geojson));
        //full_data.push(geojson);

        //console.log(33333, full_data);

        //render(data, 0, svg, dict, pressureScale, stratificationLine, dewpointLine);

        // Создаем метки на слайдере (каждую вторую)
    const slider = document.getElementById('timeSlider');
    const sliderLabels = document.getElementById('sliderLabels');
    const tooltip = document.getElementById('tooltip');
    const selectedDateSpan = document.getElementById('selectedDate');

    // Форматирование даты
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate()}.${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    // Размещаем метки
    dates.forEach((date, index) => {
        // Показываем каждую вторую метку для читаемости
        if (index % 2 === 0) {
            const label = document.createElement('div');
            label.className = 'slider-label';
            label.textContent = formatDate(date);
            label.style.left = `${(index / (dates.length - 1)) * 100}%`;
            label.title = date; // полная дата в подсказке
            
            // Клик по метке
            label.addEventListener('click', () => {
                const percent = (index / (dates.length - 1)) * 100;
                slider.value = percent;
                //updateSelectedDate(index);
                render(data, dates[index], svg, dict, pressureScale, stratificationLine, dewpointLine);
            });
            
            sliderLabels.appendChild(label);
        }

    });

    // Поиск ближайшего индекса по проценту
    function findClosestIndex(percent) {
        let closestIndex = 0;
        let minDiff = Infinity;
        
        dates.forEach((_, index) => {
            const labelPercent = (index / (dates.length - 1)) * 100;
            const diff = Math.abs(labelPercent - percent);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = index;
            }
        });
        
        return closestIndex;
    }

    // Обработка движения мыши для подсказки
    slider.addEventListener('mousemove', (e) => {
        const rect = slider.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPercent = Math.min(Math.max(percent, 0), 100);
        
        const index = findClosestIndex(clampedPercent);
        const date = dates[index];
        
        // Позиционируем подсказку
        tooltip.style.display = 'block';
        tooltip.textContent = formatDate(date);
        
        // Вычисляем позицию подсказки
        const labelPercent = (index / (dates.length - 1)) * 100;
        tooltip.style.left = `${labelPercent}%`;
        tooltip.style.bottom = '35px';
        tooltip.style.transform = 'translateX(-50%)';
    });

    slider.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });

    // При перемещении слайдера
    slider.addEventListener('input', (e) => {
        const percent = parseFloat(e.target.value);
        const index = findClosestIndex(percent);
        const date = dates[index];
        
        //updateSelectedDate(index);
        render(data, dates[index], svg, dict, pressureScale, stratificationLine, dewpointLine);
        
        // Подсвечиваем активную метку
        document.querySelectorAll('.slider-label').forEach((label, i) => {
            const labelIndex = i * 2; // так как показываем каждую вторую
            if (labelIndex === index) {
                label.style.background = '#667eea';
                label.style.color = 'white';
            } else {
                label.style.background = '';
                label.style.color = '#666';
            }
        });
    });


     /*   //крутилка
        d3.select("#timeRange")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", dates.length - 1)
            .attr("value", 0)
            .on("input", function(v) {
                console.log(v.target.value, dates[v.target.value])
                render(data, dates[v.target.value], svg, dict, pressureScale, stratificationLine, dewpointLine);
            });

            const sliderLabels = document.getElementById("slider-labels");

            dates.forEach((point, index) => {
                if (index % 2 === 0) { // Показываем каждую вторую точку для читаемости
                    const label = document.createElement("span");
                    label.textContent = `${point}`;
                    label.style.position = "relative";
                    label.style.left = `${(index / (dates.length - 1)) * 100}%`;
                    label.style.transform = "translateX(-50%)";
                    sliderLabels.appendChild(label);
                }
            });*/

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