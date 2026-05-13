import { drawWind } from "./wind.js";
import { moistAdiabatProfile } from "./grid.js";

const loadData = (url) => {
    console.log('url3', url, url.pathname);

    let spot_id = 1;
    /*return new Promise(function(resolve, reject) {
        d3.json(url).
        then(function(data) {
            return resolve(data);
        });
    });*/

    return new Promise(function(resolve, reject) {
        fetch(`/api/` + spot_id).
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

const render = (data, i, svg, dict, tempScale, heightScale, stratificationLine, dewpointLine) => {
    let graphdata = []

    if (dict.highScale && dict.highScale < 12000) {
        //выбираем только те данные, которые меньше выбранной высоты highScale
        data[i].forEach(function(d) {
            if (d.height <= dict.highScale) {
                graphdata.push(d)
            }
        })
    } else {
        graphdata = data[i]
    }

    //рисуем ветер
    drawWind(graphdata, dict, heightScale);

    //рисуем диаграмму
    svg.selectAll(".stratificationLine").remove();
    svg.selectAll(".dewpointLine").remove();

    svg.append("path")
        .datum(graphdata)
        .attr("fill", "none")
        .attr("class", "stratificationLine")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", stratificationLine);

    svg.append("path")
        .datum(graphdata)
        .attr("fill", "none")
        .attr("class", "dewpointLine")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", dewpointLine);

    // ============================================
    // Кривая состояния
    // ============================================

    //удаляем предыдущие кривые
    svg.selectAll(".state_grey").remove();
    svg.selectAll(".state_blue").remove();


    let surface_temp = Math.round(data[i][0]['temp']) - dict.tempK
    let surface_dew = Math.round(data[i][0]['dewpoint']) - dict.tempK
    
    const t09 = surface_temp + 3
    const t02 = surface_dew

    //точка пересечения (верх треугольника)
    const cross_height = dict.height_base + 128 * (t09 - t02)
    const state_heights = d3.range(dict.height_base, cross_height, 100)

    //голубая кривая - градиент 0.9
    let data09 = []
    state_heights.forEach(function(d, i) {
        if (i == 0) {
            data09.push({height: d, temp: t09})
        } else {
            data09.push({height: d, temp: data09[i-1].temp - 0.981})
        }
    })

    //сохраняем последнюю точку
    let last = data09[data09.length - 1]

    data09.push({height: cross_height, temp: last.temp - (cross_height - last.height)/100})

    console.log(dict.height_base, cross_height);
    console.log(999, last.temp, last.height);

    const state_line = d3.line()
        .x(d => tempScale(d.temp) + (heightScale(dict.height_base)-heightScale(d.height))/dict.tan)
        .y(d => heightScale(d.height));

    svg.append("path")
        .datum(data09)
        .attr("d", state_line)
        .attr("class", "state_blue");

    //рисуем серую кривую - градиент 0.2
    let data02 = []
    state_heights.forEach(function(d, i) {
        if (i == 0) {
            data02.push({height: d, temp: t02})
        } else {
            data02.push({height: d, temp: data02[i-1].temp - 0.2})
        }
    })

    last = data02[data02.length - 1]

    data02.push({height: cross_height, temp: last.temp - (cross_height - last.height)*0.2/100})

    svg.append("path")
        .datum(data02)
        .attr("d", state_line)
        .attr("class", "state_grey");

    //решаем продолжать ли голубую кривую дальше, после верха треугольника
    let index = 0;
    while(data[i][index].height < last.height) {
        index++;
    }

    const min = data[i][index];
    const max = data[i][index+1];

    //формула считаем скорость измения температуры с высотой
    const grad = (max.temp - min.temp) / (max.height - min.height)
    //считаем предполагаемую температуру кривой стратификауии на высоте базы (верх треугольника) 
    //добавляем погрешность 1.5 градуса, чтобы когда кривая стратификации близко, все равно рисовать
    const estimated_temp = (min.temp - dict.tempK) + ((last.height - min.height) * grad) - 1.5

    //если наша температура больше или равна предполагаемой, рисуем по влажной адиабате
    if (estimated_temp < last.temp) {
        const moist_state_profile = moistAdiabatProfile(data09[data09.length - 1].temp + dict.tempK, cross_height, dict.height_top)

        svg.append("path")
            .datum(moist_state_profile)
            .attr("d", state_line)
            .attr("fill", "none")
            .attr("class", "state_blue");
    }
}

const drawGraphics = (full_data, svg, dict, tempScale, heightScale, stratificationLine, dewpointLine) => {

    if (!Object.keys(full_data).length) {
        alert("Пока нет данных! Возможно, погоду на этом споте давно никто не смотрел. Заходите через пару минут, и они появятся!")
    }

    let data = full_data['data']
    let dates = full_data['dates']

    console.log(dates)
    console.log(full_data)

    render(data, dates[0], svg, dict, tempScale, heightScale, stratificationLine, dewpointLine);

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
        //черные метки
        const trackMarkers = document.getElementById('trackMarkers');
	    const marker = document.createElement('div');
        marker.className = 'track-marker';
        marker.style.left = `${(index / (dates.length - 1)) * 100}%`;
        trackMarkers.appendChild(marker);

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
                render(data, dates[index], svg, dict, tempScale, heightScale, stratificationLine, dewpointLine);
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
        render(data, dates[index], svg, dict, tempScale, heightScale, stratificationLine, dewpointLine);
        
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

}

export { loadData, drawGraphics }