import { drawWind } from "./wind.js";
import { moistAdiabatProfile } from "./grid.js";

const loadData = (url) => {
    const match = url.pathname.match(/\d+/);
    const spot_id = match ? parseInt(match[0], 10) : 1;

    console.log('url3', url, url.pathname, spot_id);

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

    const request_date = new Date(i);
    const formattedDate = request_date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit'
    }).replace(/\//g, '.');

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
    drawWind(svg, graphdata, dict, heightScale);

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

    drawParcelPath(svg, data, i, dict, tempScale, heightScale);
}

const drawParcelPath = (svg, data, i, dict, tempScale, heightScale, step = 3) => {
    // ============================================
    // Кривая состояния
    // ============================================

    //удаляем предыдущие кривые
    svg.selectAll(".state_grey").remove();
    svg.selectAll(".state_blue").remove();


    let surface_temp = Math.round(data[i][0]['temp']) - dict.tempK
    let surface_dew = Math.round(data[i][0]['dewpoint']) - dict.tempK
    
    const t09 = surface_temp + step
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
    let max = data[i][index+1];

    //очкень странный костыль. Иногда одна и та же строка повторяется 2 раза, тогда просто берем следующую
    if (max.height == min.height) {
        max = data[i][index+2];
    }

    //формула считаем скорость измения температуры с высотой
    const grad = (max.temp - min.temp) / (max.height - min.height)
    //считаем предполагаемую температуру кривой стратификауии на высоте базы (верх треугольника) 
    //добавляем погрешность 1.5 градуса, чтобы когда кривая стратификации близко, все равно рисовать
    const estimated_temp = (min.temp - dict.tempK) + ((last.height - min.height) * grad) - 1.5

    console.log('grad', grad,'min', min, 'max', max);

    console.log('estimated', estimated_temp, 'last', last.temp);

    //если наша температура больше или равна предполагаемой, рисуем по влажной адиабате
    if (estimated_temp < last.temp) {
        const moist_state_profile = moistAdiabatProfile(data09[data09.length - 1].temp + dict.tempK, cross_height, dict.height_top)

        svg.append("path")
            .datum(moist_state_profile)
            .attr("d", state_line)
            .attr("fill", "none")
            .attr("class", "state_blue");
    }

    d3.select("#parcelStep").text(step);
    //document.getElementById("parcelStep").textContent = step;

    //для стрелочек кривой состояния
    const parcelDown = document.getElementById('parcelDown');
    const parcelUp = document.getElementById('parcelUp');

    parcelDown.addEventListener('click', (e) => {
        drawParcelPath(svg, data, i, dict, tempScale, heightScale, step-1);
    });

    parcelUp.addEventListener('click', (e) => {
        drawParcelPath(svg, data, i, dict, tempScale, heightScale, step+1);
    });
}

const drawGraphics = (full_data, svg, dict, tempScale, heightScale, stratificationLine, dewpointLine) => {
    let data = full_data['data']
    let dates = full_data['dates']

    console.log(data[dates[0]][0]);

    const request_date = new Date(data[dates[0]][0]['request_date']);
    const formattedDate = request_date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '.');

    d3.select("#request_date").text(formattedDate);

    d3.select("#request_time").text(data[dates[0]][0]['request_time']);

    //высота точки приходит вместе с прогнозом, показываем блок только когда она есть
    if (full_data['elevation'] != null) {
        d3.select("#elevation").text(Math.round(full_data['elevation']));
        document.getElementById('elevation_block').style.display = '';
    }

    console.log(123, formattedDate)

    // Группируем даты по суткам (ключ YYYY-MM-DD), чтобы отдельно выбирать день,
    // а слайдером листать только время внутри выбранных суток
    const dayMap = new Map();
    dates.forEach((date) => {
        const dayKey = date.slice(0, 10);
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
        dayMap.get(dayKey).push(date);
    });
    const dayKeys = Array.from(dayMap.keys());

    const slider = document.getElementById('timeSlider');
    const sliderLabels = document.getElementById('sliderLabels');
    const trackMarkers = document.getElementById('trackMarkers');
    const tooltip = document.getElementById('tooltip');
    const dayTabs = document.getElementById('dayTabs');

    function formatDayLabel(dayKey) {
        const d = new Date(`${dayKey}T00:00:00`);
        const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
        const dayMonth = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
        return `${weekday}, ${dayMonth}`;
    }

    function formatTime(dateStr) {
        const d = new Date(dateStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function percentForIndex(index, total) {
        return total > 1 ? (index / (total - 1)) * 100 : 0;
    }

    let currentDayIndex = 0;
    let dayDates = [];

    function highlightLabel(index) {
        sliderLabels.querySelectorAll('.slider-label').forEach((label) => {
            label.classList.toggle('active', parseInt(label.dataset.index, 10) === index);
        });
    }

    function selectTime(index) {
        slider.value = percentForIndex(index, dayDates.length);
        render(data, dayDates[index], svg, dict, tempScale, heightScale, stratificationLine, dewpointLine);
        highlightLabel(index);
    }

    // Поиск ближайшего индекса внутри выбранного дня по проценту слайдера
    function findClosestIndex(percent) {
        let closestIndex = 0;
        let minDiff = Infinity;

        dayDates.forEach((_, index) => {
            const labelPercent = percentForIndex(index, dayDates.length);
            const diff = Math.abs(labelPercent - percent);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    function buildSlider() {
        dayDates = dayMap.get(dayKeys[currentDayIndex]);

        sliderLabels.innerHTML = '';
        trackMarkers.innerHTML = '';

        const singlePoint = dayDates.length <= 1;
        slider.disabled = singlePoint;

        dayDates.forEach((date, index) => {
            const percent = percentForIndex(index, dayDates.length);

            const marker = document.createElement('div');
            marker.className = 'track-marker';
            marker.style.left = `${percent}%`;
            trackMarkers.appendChild(marker);

            const label = document.createElement('div');
            label.className = 'slider-label';
            label.textContent = formatTime(date);
            label.style.left = `${percent}%`;
            label.title = date;
            label.dataset.index = index;

            label.addEventListener('click', () => selectTime(index));

            sliderLabels.appendChild(label);
        });

        selectTime(0);
    }

    function buildDayTabs() {
        dayTabs.innerHTML = '';

        dayKeys.forEach((dayKey, index) => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'day-tab' + (index === currentDayIndex ? ' active' : '');
            tab.textContent = formatDayLabel(dayKey);

            tab.addEventListener('click', () => {
                if (currentDayIndex === index) return;
                currentDayIndex = index;
                dayTabs.querySelectorAll('.day-tab').forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                buildSlider();
            });

            dayTabs.appendChild(tab);
        });
    }

    buildDayTabs();
    buildSlider();

    // Обработка движения мыши для подсказки
    slider.addEventListener('mousemove', (e) => {
        const rect = slider.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPercent = Math.min(Math.max(percent, 0), 100);

        const index = findClosestIndex(clampedPercent);
        const date = dayDates[index];

        // Позиционируем подсказку
        tooltip.style.display = 'block';
        tooltip.textContent = formatTime(date);

        const labelPercent = percentForIndex(index, dayDates.length);
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
        selectTime(index);
    });
}

export { loadData, drawGraphics }