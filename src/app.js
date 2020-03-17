const domReady = require('domready');
import './stylesheets/main.css';

import * as d3 from 'd3';
import leafletEasybutton from 'leaflet-easybutton';
import {sliderHorizontal} from "d3-simple-slider";

// ---------- DATA + RENDER ---------- //
domReady(() => {
  Promise.all([
    d3.json('./data/california.geojson'),
    d3.json('./data/ca-schools.geojson'),
  ]).then(d => {
    const [caBase, caSchools] = d;
    const state = {
      maxCoverage: 100, 
      minEnrollment: 0, 
      schoolType: ['PUBLIC', 'PRIVATE']
    }; 
    myMap(caBase, caSchools, state.maxCoverage, state.minEnrollment, state.schoolType);
    myHist(caSchools, 
      {'y': 999}, 
      state.maxCoverage, 
      state.minEnrollment, 
      state.schoolType);

    coverageSlider(caSchools, function(d) {
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.maxCoverage = d * 100; // percentage formatting 
      myMap(caBase, caSchools, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, {'y': 999}, state.maxCoverage, state.minEnrollment, state.schoolType)
    });

    enrollmentSlider(caSchools, function(d) {
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.minEnrollment = d;   
      myMap(caBase, caSchools, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, {'y': 999}, state.maxCoverage, state.minEnrollment, state.schoolType)
    });

    privatePublicDropdown(caSchools, function(d){ 
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.schoolType = this.value;   
      myMap(caBase, caSchools, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, {'y': 999}, state.maxCoverage, state.minEnrollment, state.schoolType)
    }); 
  });
}); 

// ---------- MAP ---------- //
function myMap(caBase, caSchools, maxCoverage, minEnrollment, schoolType) {

  // base map
  // https://stackoverflow.com/questions/19186428/refresh-leaflet-map-map-container-is-already-initialized
  var container = L.DomUtil.get('map');
      if (container != null) {
        container._leaflet_id = null;
      }

  const map = L.map('map', {center: [37.3, -119.6], zoom: 6});
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
      map.setView([37.3, -119.6], 6);
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

  // process schools
  caSchools.features.forEach(function(d) {
    d.LatLng = new L.LatLng(d.properties.lat, d.properties.lon);
    d.name = d.properties.SCHOOL_NAME;
    d.public_private = d.properties.PUBLIC_PRIVATE; 
    d.city = d.properties.CITY;
    d.enrollment = d.properties.ENROLLMENT;
    d.coverage = d.properties.PERCENT;
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

  // school circles 
  function getColor(d) {
    return d > 95 ? '#1696d2' : d > 90 ? '#55b748' : d > 80 ? '#ffab00' : '#b01515';
  }

  // https://stackoverflow.com/questions/46894352/filtering-an-array-of-objects-based-on-another-array-in-javascript
  var circles = g
    .selectAll('circle')
    .data(caSchools.features)
    .enter()
    .append('circle')
    .filter(function(d) {return d.coverage < maxCoverage 
      & d.enrollment > minEnrollment
      & schoolType.indexOf(d.public_private) !== -1})
    .attr('name', d => d.name)
    .attr('city', d => d.city)
    .attr('fill', d => getColor(d.coverage))
    .attr('stroke-width', 0.1)
    .attr('stroke', 'black')
    .attr('opacity', 0.9)
    .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1))
    .attr('active', false);

  // mouseover control 
  circles.on('mouseover', function(d) {
    d3.select(this)
      .attr('stroke-width', 3)
      .attr('stroke', 'black')
      .attr('r', 10);
    info.update(d);
    d3.select('#hist').selectAll("*").remove();
    myHist(caSchools, 
      {'y': d.coverage}, 
      maxCoverage, 
      minEnrollment, 
      schoolType);
  });

  circles.on('mouseout', function(d) {
    d3.select(this)
      .attr('stroke-width', 0.1)
      .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1));
    info.update();
    d3.select('#hist').selectAll("*").remove();
    myHist(caSchools, 
      {'y': 999}, 
      maxCoverage, 
      minEnrollment, 
      schoolType);
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

function myHist (caSchools, marker, maxCoverage, minEnrollment, schoolType) {

  // dimensions 
  var margin = {top: 20, right: 20, bottom: 55, left: 35},
      width = 200 - margin.left - margin.right, 
      height = 570 - margin.top - margin.bottom;  

  // svg layer 
  var svg = d3.select("#hist").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

  // y axis  
  var yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, height]);

  var yAxis = d3.axisLeft()
      .scale(yScale)
      .tickValues([0, 80, 95, 100])
      .tickFormat(function(d) {return d * 1 + "%"}); 

  // x axis 
  // https://stackoverflow.com/questions/15211488/formatting-numbers-with-commas-in-d3
  var xScale = d3.scaleLog()
    .domain([10000, 1])
    .range([width, 0]); 

  var format = d3.format(",")
  var xAxis = d3.axisBottom()
    .scale(xScale)
    .tickValues([1, 10, 100, 1000, 10000])
    .tickFormat(function (d) {return format(d)}); 

  function getColor (d) {
    return d >= 95 ? "#1696d2" : 
       d >= 90 ? "#55b748" :
       d >= 80 ? "#ffab00" : 
       "#b01515";
     }

  // histogram bars 
  var histogram = d3.histogram()
    .value(function(d) { return d.coverage; })
    .domain(yScale.domain())
    .thresholds(yScale.ticks(100));

  var bars = svg.selectAll(".bar")
    .data(histogram(caSchools.features
      .filter(function(d) { return d.coverage < maxCoverage 
        & d.enrollment > minEnrollment 
        & schoolType.indexOf(d.public_private) !== -1})))
    .enter()
    .append("rect")
    .filter(function(d) { return d.length > 0 })
    .attr("y", function(d) { return yScale(d.x0); })
    .attr("width", function(d) { return xScale(d.length); }) 
    .attr("height", height / 100 + 0.2)
    .attr("fill", function(d) { return getColor(d.x0); }); 

  // x axis 
  svg.append("g")
    .attr("class", "text")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  // y axis 
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

  svg.append("text")
    .attr("dy", height + margin.top + 14)
    .attr("dx", 0)
    .text("Number of schools by")

  svg.append("text")
    .attr("dy", height + margin.top + 28)
    .attr("dx", 0)
    .text("kindergarten MMR coverage")
};

// ---------- SLIDERS ---------- //
function coverageSlider(caSchools, update) {

  // dimensions
  var margin = {top: 55, right: 40, bottom: 0, left: 15},
      width = 200 - margin.left - margin.right, 
      height = 90 - margin.top - margin.bottom;  

  // slider 
  var coverageSlider = sliderHorizontal()
    .min(0)
    .max(1)
    .width(width)
    .tickFormat(d3.format(".0%"))
    .ticks(5)
    .default(100)
    .on("onchange", update);

  // add on svg 
  var svg = d3
    .select("#sliders")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(coverageSlider)
    .append("text")
      .attr("dy", -15)
      .attr("dx", -10)
      .text("Schools with coverage below...")
}; 

function enrollmentSlider(caSchools, update) {

  // dimensions 
  var margin = {top: 55, right: 40, bottom: 0, left: 15},
      width = 200 - margin.left - margin.right, 
      height = 90 - margin.top - margin.bottom;  

  // slider 
  var coverageSlider = sliderHorizontal()
    .min(0)
    .max(500)
    .width(width)
    .ticks(5)
    .default(0)
    .on("onchange", update);

  // add on svg 
  var svg = d3
    .select("#sliders")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(coverageSlider)
    .append("text")
      .attr("dy", -15)
      .attr("dx", -10)
      .text("Schools with enrollment above...")
}; 

// ---------- DROPDOWNS ---------- //
function privatePublicDropdown(caSchools, onChange) {

  function getTypes (d) {
    return d === "All schools" ? ["PUBLIC", "PRIVATE"] : 
       d === "Public schools" ? ["PUBLIC"] :
       d === "Private schools" ? ["PRIVATE"] : 
       ["PUBLIC", "PRIVATE"];} 

  d3.select("#dropdown")
    .selectAll("myOptions")
    .data(["All schools", "Public schools", "Private schools"])
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => getTypes(d));

  d3.select("#dropdown").on("change", onChange); 
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
// https://bl.ocks.org/caravinden/eb0e5a2b38c8815919290fa838c6b63b

// SLIDERS AND DROPDOWNS 
// https://bl.ocks.org/officeofjane/f132634f67b114815ba686484f9f7a77
// https://www.d3-graph-gallery.com/graph/line_select.html
// thanks alliecollins! 


