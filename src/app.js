/* global L */
const domReady = require('domready');
import './stylesheets/main.css';

import * as d3 from 'd3';
/* eslint-disable no-unsued-vars */
import leafletEasybutton from 'leaflet-easybutton';
/* eslint-enable no-unsued-vars */

// ---------- DATA + RENDER ---------- //
domReady(() => {
  Promise.all([
    d3.json('./data/california.geojson'),
    d3.json('./data/ca-schools.geojson'),
    d3.csv('./data/ca-hist.csv'),
  ]).then(d => {
    const [caBase, caSchools, caHist] = d;
    myMap(caBase, caSchools);
    myHist(caHist, {'y': 45});
  });
});

// ---------- MAP ---------- //
function myMap(caBase, caSchools, caHist) {
  // base map
  const map = L.map('map', {center: [37.5, -119], zoom: 6});
  map.addLayer(
    new L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }),
  );
  map.addLayer(new L.geoJSON(caBase, {style: {color: '#696969', weight: 1}}));

  // home button
  // https://gis.stackexchange.com/questions/127286/home-button-leaflet-map
  L.easyButton(
    'fa-home',
    function(btn, map) {
      map.setView([37.5, -119], 6);
    },
    'Zoom To Home',
  ).addTo(map);

  // svg layer
  var svg = d3
    .select('#map')
    .select('svg');
  var g = svg
    .append('g')
    .attr('class', 'leaflet-zoom-hide');

  // schools
  caSchools.features.forEach(function(d) {
    d.LatLng = new L.LatLng(d.properties.lat, d.properties.lon);
    d.name = d.properties.SCHOOL_NAME;
    d.city = d.properties.CITY;
    d.enrollment = d.properties.ENROLLMENT;
    d.coverage = d.properties.PERCENT;
    d.id = d.properties.SCHOOL_CODE;
  });

  // info tooltip
  // https://leafletjs.com/examples/choropleth/
  const info = L.control();

  info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  info.update = function(d) {
    this._div.innerHTML = d
      ? `<b>${d.name}</b>` +
        `<br/>${d.city}, CA` +
        `<br/>` +
        `<br/>` +
        `ENROLLMENT: ${d.enrollment}<br/>` +
        `MMR COVERAGE: ${d.coverage}%` +
        `<br/>`
      : 'Hover over a school for details.';
  };

  info.addTo(map);

  // legend
  // https://gis.stackexchange.com/questions/133630/adding-leaflet-legend
  const legend = L.control({position: 'bottomleft'});
  legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    const labels = ['50 kindergarteners', '100 kindergarteners', '500 kindergarteners'];

    div.innerHTML = [
      `${'<div class="row" <span class="legend inner-row"><h4>SCHOOL<br/>ENROLLMENT</span></h4></div>' +
        '<div class="row" "><i class="circle1" ></i><span class="legend inner-row">'}${
        labels[0]
      }</span></div>` +
        `<div class="row" "><i class="circle2" ></i><span class="legend inner-row">${labels[1]}</span></div>` +
        `<div class="row" "><i class="circle3" ></i><span class="legend inner-row">${labels[2]}</span></div>`,
    ];

    return div;
  };

  legend.addTo(map);

  // schools
  function getColor(d) {
    return d > 95 ? '#1696d2' : d > 90 ? '#55b748' : d > 80 ? '#e88e2d' : '#6e1614';
  }

  var circles = g
    .selectAll('circle')
    .data(caSchools.features)
    .enter()
    .append('circle')
    .attr('name', d => d.name)
    .attr('city', d => d.city)
    .attr('fill', d => getColor(d.coverage))
    .attr('stroke-width', 0.1)
    .attr('stroke', 'black')
    .attr('opacity', 0.9)
    .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1))
    .attr('active', false);

  circles.on('mouseover', function(d) {
    d3.select(this)
      .attr('stroke-width', 3)
      .attr('stroke', 'black')
      .attr('r', 10);
    info.update(d);
    d3.select('#hist').selectAll("*").remove();
    myHist(caHist, {'y': d.coverage});
  });

  circles.on('mouseout', function(d) {
    d3.select(this)
      .attr('stroke-width', 0.1)
      .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1));
    info.update();
  });

  const transform = d3.geoTransform({point: projectPoint});
  const path = d3.geoPath().projection(transform);

  function projectPoint(x, y) {
    const point = map.latLngToLayerPoint(new L.LatLng(x, y));
    this.stream.point(point, x, point.y);
  }

  // update with zoom
  map.on('moveend', update);
  update();

  function update() {
    d3.select('.leaflet-zoom-animated').attr('pointer-events', 'all');
    circles.attr('transform', function(d) {
      return `translate(${map.latLngToLayerPoint(d.LatLng).x},${map.latLngToLayerPoint(d.LatLng).y})`;
    });
  }; 
}; 

// ---------- HISTOGRAM ---------- //

function myHist (caHist, marker) {
  var margin = {top: 10, right: 20, bottom: 20, left: 35},
      width = 200 - margin.left - margin.right, 
      height = 550 - margin.top - margin.bottom;  

  var svg = d3.select("#hist").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

  var yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, height]);

  var xScale = d3.scaleLog()
    .domain([10000, 1])
    .range([width, 0]); 

  // https://stackoverflow.com/questions/15211488/formatting-numbers-with-commas-in-d3
  var yAxis = d3.axisLeft()
    .scale(yScale)
    .tickValues([0, 80, 95, 100])
    .tickFormat(function(d) {return d * 1 + "%"}); 

  var format = d3.format(",")
  var xAxis = d3.axisBottom()
    .scale(xScale)
    .tickValues([1, 10, 100, 1000, 10000])
    .tickFormat(function (d) {return format(d)}); 

  function getColor (d) {
    return d >= 95 ? "#1696d2" : 
       d >= 90 ? "#55b748" :
       d >= 80 ? "#e88e2d" : 
       "#6e1614";
     }

  // var bars = svg.selectAll(".bar")
  //   .data(caHist)
  //   .enter()
  //   .append("rect")
  //   .attr("y", function(d) { return yScale(d.PERCENT); })
  //   .attr("width", function(d) {return xScale(d.count);})
  //   .attr("height", height / 100 + 0.2)
  //   .attr("fill", d => getColor(d.PERCENT)); 

  svg.append("g")
    .attr("class", "text")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "text")
    .call(yAxis); 

  // update marker 
  svg.append("g")
    .append("rect")
    .attr("y", function(d) { return yScale(marker.y); })
    .attr("width", function(d) {return xScale(10000);})
    .attr("height", 3)
    .attr("fill", "black"); 
};


// ---------- OTHER SOURCES ---------- //
// MAP
// http://bl.ocks.org/d3noob/9267535
// https://stackoverflow.com/questions/40047326/overlaying-circles-on-leaflet-with-d3-results-in-not-positioned-properly
// http://bl.ocks.org/1Cr18Ni9/d72b6ba95285b80fe4c7498e784a8e0c
// http://bl.ocks.org/Andrew-Reid/11602fac1ea66c2a6d7f78067b2deddb
// https://leafletjs.com/examples/choropleth/
// https://bost.ocks.org/mike/leaflet/
// https://alenastern.github.io/interactive_aid_map/

// HISTOGRAM 
// // https://bl.ocks.org/caravinden/eb0e5a2b38c8815919290fa838c6b63b
