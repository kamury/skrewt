const drawGrid = (svg, dict, heightScale, tempScale) => {

    //isoterms
    svg.selectAll("temp")
        .data(d3.range(-100, 43, ((dict.highScale == 12000) ? 10 : (dict.highScale == 6000) ? 5 : 3)))
        .enter()
            .append("line")
            .attr("x1", d => tempScale(d)-0.5 + (heightScale(dict.height_base)-heightScale(dict.height_top))/dict.tan)
            .attr("x2", d => tempScale(d)-0.5)
            .attr("y1", 0)
            .attr("y2", dict.height)
            .attr("class", function(d) { if (d == 0) { return "tempzero"; } else { return "isoterm"}});


/*
    //вариант изотерм от gpt, x = x + skrew * y, y = y.
    const skew = -0.5;

    function project(T, h) {
        return [
            tempScale(T) + skew * heightScale(h),
            heightScale(h)
        ];
    }

    function drawIsotherm(T) {
        const heights = d3.range(dict.height_base, dict.height_top, 100);
        
        const line = d3.line()
            .x(h => project(T, h)[0])
            .y(h => project(T, h)[1]);

        svg.append("path")
            .datum(heights)
            .attr("d", line)
            .attr("class", T === 0 ? "tempzero" : "isoterm");
        }

    const temps = d3.range(
            -100,
            90,
            (dict.highScale == 12000) ? 10 : (dict.highScale == 6000) ? 5 : 3
    );
          
    temps.forEach(T => drawIsotherm(T));
*/
/*
    //dry adiabates
    var dryline = d3.line()
        .x(function(d,i) { 
            //??
            return tempScale( ( dict.tempK + d ) / Math.pow( (1000/pressure[i]), 0.286) - dict.tempK) + 
                (pressureScale(dict.pressure_base)-pressureScale(pressure[i]))/dict.tan;})
        .y(function(d,i) { return pressureScale(pressure[i])} );

    // create array to plot dry adiabats
    var pressure = d3.range(dict.pressure_top, dict.pressure_base + 1, 10);
    var dryad = d3.range(-30,240, ((dict.highScale == 12000) ? 15 : (dict.highScale == 6000) ? 5 : 3));
    var dryData = [];
    for (var i=0; i<dryad.length; i++) { 
        var z = [];
        for (var j=0; j<pressure.length; j++) { 
            z.push(dryad[i]); 
        }
        dryData.push(z);
    }

    // Draw dry adiabats
    svg.selectAll(".dryline")
        .data(dryData)
    .enter().append("path")
        .attr("class", "dry-adiabat")
        .attr("d", dryline);*/

    //moist adiabat
    const Cp = 1.03e3;
    const Rd = 287.0;
    const Dp = -1.5;

    const setPressureLevel = (startpressure, endpressure) => {
        const ratio = (100/1050)*(startpressure/endpressure)
        //const T0 = Ascent.temperatureK[0] - 273.15
        //const T0 = 288.55 - 273.15
        const T0 = 280 - 273.15
        let pressure = startpressure;
        let P = [startpressure];
        while (pressure > endpressure) {
            pressure = pressure+Dp;
            P.push(pressure);
        }
        return {'P': P, 'minT': T0-ratio*55, 'maxT': T0+ratio*25, 'minP': P[P.length-1], 'maxP': P[0]}
    }

    let limits = setPressureLevel(1050, 150); 
    let P = limits.P
    const minT = limits.minT
    const maxT = limits.maxT
    const minP = limits.minP
    const maxP = limits.maxP

    const S = {
        "Cp": Cp,
        "Dp": Dp,
        "Rd": Rd,
        'svg': svg,
        'P' : P,
        "minT": minT,
        "maxT": maxT,
        "minP": minP,
        "maxP": maxP,
        "w": dict.width,
        "h": dict.height,
    }

    const wetAdiabatGradient = (pressure, temp, S) => {
        const K = 0.286;
        const L = 2.5e6;
        const MA = 300.0;
        const RV = 461.0;

        temp += 273.15;
        let lsbc = (L / RV) * ((1.0 / dict.tempK) - (1.0 / temp));
        let rw = 6.11 * Math.exp(lsbc) * (0.622 / pressure);
        let lrwbt = (L * rw) / (S.Rd * temp);
        let nume = ((S.Rd * temp) / (S.Cp * pressure)) * (1.0 + lrwbt);
        let deno = 1.0 + (lrwbt * ((0.622 * L) / (S.Cp * temp)));
        let gradi = nume / deno;

        return S.Dp * gradi;
    }

    const drawMoistAdiabat = (temp, S) => {
    let Px=[];
    S.P.forEach(p => {
        let dt = wetAdiabatGradient(p, temp, S)
        temp+=dt;
        let Tpx = S.w*(temp - S.minT)/(S.maxT-S.minT);
        let Ppx = S.h*(Math.log(p)-Math.log(S.minP))/(Math.log(S.maxP)-Math.log(S.minP));
        Px.push([Tpx, Ppx]);
    });

    // skew the isotherms
    Px.forEach((px) => {
        px[0] = px[0] + S.h - px[1];
    });

    //console.log(Px);

    let lineGenerator = d3.line();
    let daPathString = lineGenerator(Px);

    S.svg.append("path")
        .attr('d', daPathString)
        .attr('class', 'moist-adiabat')
        //.style("fill", 'none')
        //.style("stroke-width", 1*S.strokeFactor)
        //.style("stroke", 'green');
    };

    d3.range(-25, 40, 2.5).forEach(m => { drawMoistAdiabat(m, S); });
    // [-27.0, -17.0, -7, 2.6, 12.15, 21.8, 31.6, 40].forEach(m => { drawMoistAdiabat(m, S); });



}

export { drawGrid }