const drawGrid = (svg, dict, heightScale, tempScale) => {

    // === КОНСТАНТЫ ===
    const kappa = 0.286;
    const p0 = 1000;

    // === ВСПОМОГАТЕЛЬНОЕ ===

    // грубая модель давления (замени на свою, если есть реальные данные)
    function heightToPressure(h) {
        return 1000 * Math.exp(-h / 8000);
    }

    // проекция (как у тебя)
    function project(T, h) {
        return [
            tempScale(T) + (heightScale(dict.height_base) - heightScale(h)) / dict.tan,
            heightScale(h)
        ];
    }

    // диапазон высот
    const heights = d3.range(dict.height_top, dict.height_base, 100);

    // === 1. ИЗОТЕРМЫ ===

    function drawIsotherms() {
    const temps = d3.range(-80, 50, 10);

    temps.forEach(T => {
        const line = d3.line()
            .x(h => project(T, h)[0])
            .y(h => project(T, h)[1]);

            svg.append("path")
            .datum(heights)
            .attr("d", line)
            .attr("stroke", T === 0 ? "#000" : "#ccc")
            .attr("stroke-width", T === 0 ? 1.5 : 0.8)
            .attr("fill", "none");
        });
    }

    // === 2. СУХИЕ АДИАБАТЫ ===

    function dryAdiabatTemp(theta, p) {
        return theta * Math.pow(p / p0, kappa) - 273.15; // в °C
    }

    function drawDryAdiabats() {
        const thetas = d3.range(250, 450, 10);

        thetas.forEach(theta => {
            const line = d3.line()
                .x(h => {
                    const p = heightToPressure(h);
                    const T = dryAdiabatTemp(theta, p);
                    return project(T, h)[0];
                })
                .y(h => project(0, h)[1]);

            svg.append("path")
                .datum(heights)
                .attr("d", line)
                .attr("stroke", "#d4a373")
                .attr("stroke-width", 0.8)
                .attr("fill", "none")
                .attr("opacity", 0.7);
        });
    }

    // === 3. ВЛАЖНЫЕ АДИАБАТЫ (приближённо) ===

    // простая аппроксимация (не идеальная, но выглядит правильно)
    function moistAdiabatTemp(T0, p0, p) {
    let T = T0;
    let dp = (p - p0) / 20;

    for (let i = 0; i < 20; i++) {
        const L = 2.5e6;
        const Cp = 1004;
        const R = 287;

        const gamma = (L * 0.622) / (R * T * T);
        const lapse = (1 + gamma) / (Cp + gamma * L);

        T += lapse * dp * 100; // приближение
    }

    return T - 273.15;
    }

    function drawMoistAdiabats() {
    const startTemps = d3.range(-20, 40, 5);

    startTemps.forEach(T0 => {
        const line = d3.line()
        .x(h => {
            const p = heightToPressure(h);
            const T = moistAdiabatTemp(T0 + 273.15, 1000, p);
            return project(T, h)[0];
        })
        .y(h => project(0, h)[1]);

        svg.append("path")
        .datum(heights)
        .attr("d", line)
        .attr("stroke", "#6c9bcf")
        .attr("stroke-width", 0.8)
        .attr("fill", "none")
        .attr("opacity", 0.7);
    });
    }

    // === ВЫЗОВ ===

    drawIsotherms();
    drawDryAdiabats();
    drawMoistAdiabats();
}

export { drawGrid }
