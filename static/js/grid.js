const drawGrid = (svg, dict, heightScale, tempScale) => {


// ============================================
// Изотермы
// ============================================

    svg.selectAll("temp")
        .data(d3.range(-100, 43, ((dict.highScale == 12000) ? 10 : (dict.highScale == 6000) ? 5 : 5)))
        .enter()
            .append("line")
            .attr("x1", d => tempScale(d) + (heightScale(dict.height_base)-heightScale(dict.height_top))/dict.tan)
            .attr("x2", d => tempScale(d))
            .attr("y1", 0)
            .attr("y2", dict.height)
            .attr("class", function(d) { if (d == 0) { return "tempzero"; } else { return "isoterm"}});


// ============================================
// Сухие адиабаты
// ============================================

    const heights = d3.range(dict.height_base, dict.height_top, 100);
    const temps = d3.range(-30, 100, 10)

    temps.forEach(function(temp) {
        let data = []
        heights.forEach(function(d, i) {
            if (i == 0) {
                data.push({height: d, temp: temp})
            } else {
                data.push({height: d, temp: data[i-1].temp - 0.981})
            }
        })

        const line3 = d3.line()
            .x(d => tempScale(d.temp) + (heightScale(dict.height_base)-heightScale(d.height))/dict.tan)
            .y(d => heightScale(d.height));

        svg.append("path")
            .datum(data)
            .attr("d", line3)
            .attr("class", "dry-adiabat");
        })

// ============================================
// ВЛАЖНАЯ АДИАБАТА
// ============================================

    function project(T, h) {
        return [
            tempScale(T) + (heightScale(dict.height_base) - heightScale(h)) / dict.tan,
            heightScale(h)
        ];
    }

    // === КОНСТАНТЫ ===
    const g = 9.81;
    const Rd = 287;
    const Rv = 461;
    const Cp = 1004;
    const L = 2.5e6;

    // === ДАВЛЕНИЕ (приближение) ===
    function heightToPressure(h) {
        return 1000 * Math.exp(-h / 8000);
    }

    // === ВСПОМОГАТЕЛЬНОЕ ===
    function es(T) {
        return 6.112 * Math.exp((17.67 * (T - 273.15)) / (T - 29.65));
    }

    function qs(p, T) {
        const e = es(T);
        return 0.622 * e / (p - e);
    }

    function moistLapseRate(p, T) {
        const q = qs(p, T);

        const num = g * (1 + (L * q) / (Rd * T));
        const den = Cp + (L * L * q) / (Rv * T * T);

        return num / den; // K/m
    }

    // === ПРОФИЛЬ ВЛАЖНОЙ АДИАБАТЫ ===
    function moistAdiabatProfile(T0, h0, hMax, step = 100) {
        let T = T0;
        let result = [];

        for (let h = h0; h <= hMax; h += step) {
            const p = heightToPressure(h);

            result.push({
            height: h,
            temp: T - 273.15
            });

            const gamma = moistLapseRate(p, T);
            T = T - gamma * step;
        }

        return result;
    }

    // === ОТРИСОВКА ===
    function drawMoistAdiabats() {
        const startTemps = d3.range(-20, 40, 5);

        startTemps.forEach(T0 => {
            const profile = moistAdiabatProfile(T0 + 273.15, dict.height_base, dict.height_top);

            const line = d3.line()
            .x(d => project(d.temp, d.height)[0])
            .y(d => project(d.temp, d.height)[1]);

            svg.append("path")
            .datum(profile)
            .attr("d", line)
            .attr("class", "moist-adiabat");
        });
    }

    // === ВЫЗОВ ===
    drawMoistAdiabats();

}

export { drawGrid }