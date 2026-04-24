const cbarbs = (data, S) => {

  const w = document.getElementById("windbarbs").offsetWidth;
  const h = document.getElementById("windbarbs").offsetHeight;

  const uvToWind = (u, v) => {
    var angle = Math.atan2(u, v);
    var wdir = 180 + 180*angle/Math.PI ;
    var WSpeed = Math.sqrt(u**2 + v**2);
    return [WSpeed, wdir];
  }

  const initalWindTable = () => {
    let wind = uvToWind(data.wind_u[0], data.wind_v[0]);
    document.getElementById("as-altitude").innerText = `${data.pressure[0]} hPa / 0 km`

    if (wind[1]) document.getElementById("as-winddir").innerText = `${Math.round(wind[1], 0)} °`
    if (wind[0]) document.getElementById("as-windspeed").innerText = `${Math.round(wind[0], 0)} kt`
  }

  function wind_tooltip() {
    let y = d3.mouse(this)[1];
    let logP = (y/h)*(Math.log(1050)-Math.log(S.minP)) + Math.log(S.minP);
    let P = Math.round(Math.exp(logP), 0);
    if (P > data.pressure[0]) { P = data.pressure[0]; }

    let widx = closest(data.pressure, P);
    let wind;
    if (isNaN(Ascent.u_windKT[widx]) || (isNaN(Ascent.v_windKT[widx]))) {
      wind = uvToWind(Ascent.surfaceUKT, Ascent.surfaceVKT);
    } else {
      wind = uvToWind(Ascent.u_windKT[widx], Ascent.v_windKT[widx]);
    }
    let wSpeed = Math.round(wind[0], 0);
    let wDir = Math.round(wind[1]);

    let z = -10.0*Math.log(P/Ascent.surfacePresshPA);

    document.getElementById("as-altitude").innerText = `${Math.round(P,0)} hPa / ${z.toFixed(1)} km`
    document.getElementById("as-winddir").innerText = `${wDir} °`
    document.getElementById("as-windspeed").innerText = `${wSpeed} kt`

  }

  const svg = d3.select("#windbarbs")
    .append("svg")
    .attr('id', 'windsvg')
    .attr('width', w)
    .attr("height", h)
    .on("mousemove", wind_tooltip);

  const closest = (list, x) => {
    let miin;
    let chosen = 0;
    for (var i in list) {
      miin = Math.abs(list[chosen] - x);
      if (Math.abs(list[i] - x) < miin) {
        chosen = i;
      };
    };
    return parseInt(chosen, 10);
  }

  const drawBarb = (pidx) => {

    console.log(S, pidx, data.pressure[pidx]);
      // You can scale the windbarb size with "scale". Paths for each barb windspeed here.
    const scale = 0.1;
    let wind;
    let cloudPpx = h*(Math.log(data.pressure[pidx])-Math.log(S.minP))/(Math.log(S.maxP)-Math.log(S.minP));    // Get the pixel location as a log plot for each barb
    if (isNaN(data.wind_u[pidx]) || (isNaN(data.wind_v[pidx]))) {
      wind = uvToWind(data.wind_u[0], data.wind_v[0]);
    } else {
      wind = uvToWind(data.wind_u[pidx], data.wind_v[pidx]);
    }
    let WSpeed = wind[0];
    let wdir = wind[1] - 90;
    let barbie;

    // Allocate which barb goes at which pressure level
    if (WSpeed < 7.5) {
      barbie = "m 0,0 200,0 m -20,0 25,35";
    } else if ((WSpeed >= 7.5) && (WSpeed < 12.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70";
    } else if ((WSpeed >= 12.5) && (WSpeed < 17.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 25,35";
    } else if ((WSpeed >= 17.5) && (WSpeed < 22.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70";
    } else if ((WSpeed >= 22.5) && (WSpeed < 27.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 25,35";
    } else if ((WSpeed >= 27.5) && (WSpeed < 32.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70";
    } else if ((WSpeed >= 32.5) && (WSpeed < 37.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 25,35";
    } else if ((WSpeed >= 37.5) && (WSpeed < 42.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 -50,-70" ;
    } else if ((WSpeed >= 42.5) && (WSpeed < 47.5)) {
      barbie = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 -50,-70 m -35,0 m 0,0 25,35";
    } else if ((WSpeed >= 47.5) && (WSpeed < 55.0)) {
      barbie = "m 0,0 200,0 0,70 -50,-70";
    } else if ((WSpeed >= 55.0) && (WSpeed < 65.0)) {
      barbie = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70";
    } else if ((WSpeed >= 65.0) && (WSpeed < 75.0)) {
      barbie = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
    } else if ((WSpeed >= 75.0) && (WSpeed < 85.0)) {
      barbie = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
    } else if ((WSpeed >= 85.0) && (WSpeed < 95.0)) {
      barbie = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
    } else {
      barbie = "m 0,0 200,0 0,70 -50,-70 m -10,0 m 0,0 0,70 -50,-70";
    }

    const dur = 300;                      // This dur sets the speeds at which the barbs bounce
    svg.append("path")                 // around, an asthetic choice..
      .attr("stroke", "blue")
      .style("stroke-width", "15px")
      .attr("fill", "blue")
      .attr("d", barbie)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+wdir+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir+30)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir-30)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir+10)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir-10)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir+5)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir-5)+",0,0) scale("+scale+")  ")
      .transition()
      .duration(dur)
      .attr("transform", "translate("+(w/2)+","+cloudPpx+") rotate("+(wdir)+",0,0) scale("+scale+")  ");
  }

  drawBarb(closest(data.pressure, data.pressure[0]));
  initalWindTable();
  for (let p=200; p<=950; p+=50) { drawBarb(closest(data.pressure, p)); }
}

export {cbarbs};
