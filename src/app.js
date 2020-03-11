const domReady = require('domready');
import "./stylesheets/main.css";

import * as d3 from "d3";
import {select} from 'd3-selection';
import {csv, json} from 'd3-fetch';
import leafletSearch from 'leaflet-search'; 
import leafletEasybutton from 'leaflet-easybutton'; 


// ---------- DATA + RENDER ---------- //
domReady(() => {
  Promise.all([
    json('./data/california.geojson'),
    json('./data/ca-schools.geojson'),
    json('./data/ca-schools_small.geojson'), 
  ]).then(d => {
    const [caBase, caSchools, caSchoolsSmall] = d;
    myMap(caBase, caSchools);
    // myStrip(caSchoolsSmall); 
  });
});

// ---------- STRIP PLOT ---------- //
// function myStrip(caSchools) {

//   // dimensions 
//   var margin = {top: 0, right: 70, bottom: 0, left: 10}; 
//   var width = 300 - margin.left - margin.right, 
//       height = 600 - margin.top - margin.bottom;  

//   // svg layer 
//   var svg = d3.select('#strip').append('svg')
//     .attr('width', width + margin.left + margin.right)
//     .attr('height', height + margin.top + margin.bottom)
//     .append('g'); 

//   // scales 
//   var yScale = d3.scaleLinear()
//     .domain([95, 90, 80, 0])
//     .range([550, 381, 164, 0]); 

//   var xScale = d3.scaleLinear()
//     .domain([0, 1])
//     .range([height, 0]); 

//   var yAxis = d3.axisRight()
//     .scale(yScale)
//     .tickValues([95, 90, 80, 0])
//     .tickFormat(function(d) {return d * 1 + "%"}); 

//   // bars  
//   function getColor (d) {
//     return d > 95 ? '#1696d2' : 
//            d > 90 ? '#55b748' :
//            d > 80 ? '#e88e2d' : 
//            '#6e1614';
//   }; 

//   svg.selectAll('rect')
//     .data(caSchools.features)
//     .enter()
//     .append('rect')
//     .attr('x', xScale(1))
//     .attr('y', d => yScale(d.properties.PERCENT_jitter))
//     .attr('width', 80)
//     .attr('height', 0.5)
//     .attr('fill', d => getColor(d.properties.PERCENT_jitter))
//     .on('mouseover', d => mouseOverControl(d))
//     .on('mouseout', d => mouseOutControl(d)); 

//   svg.append('g')
//     .attr('class', 'text')
//     .attr('transform', 'translate(0' + 85 + ',' + '4)')
//     .call(yAxis);
// }; 

// function mouseOverControl(d) {
//   info.update(d)
// }; 
// function mouseOutControl() {}; 

// ---------- MAP ---------- //
function myMap (caBase, caSchools) {

  // base map 
  var map = L.map('map', 
    {center: [37.5, -119],  zoom: 6}); 
  map.addLayer(new L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
    {attribution: '© OpenStreetMap'})); 
  map.addLayer(new L.geoJSON(caBase, 
    {style: {"color": "#696969", "weight": 1}})); 

  // search bar 
  // https://github.com/stefanocudini/leaflet-search/blob/master/examples/outside.html
  var markersLayer = new L.LayerGroup();
  map.addLayer(markersLayer);
  map.addControl(new L.Control.Search(
    {container: 'findbox', 
    layer: markersLayer, 
    collapsed: false, 
    textPlaceholder: 'Search for an elementary school here...'})); 

  // home button 
  // https://gis.stackexchange.com/questions/127286/home-button-leaflet-map
  L.easyButton('fa-home', function (btn, map){map.setView([37.5, -119], 6)}, 'Zoom To Home').addTo(map);

  // svg layer 
  var svg = d3.select("#map").select("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  // schools  
  caSchools.features.forEach(function (d) {
    d.LatLng = new L.LatLng(d.properties.lat, d.properties.lon)
    d.name = d.properties.SCHOOL_NAME
    d.city = d.properties.CITY
    d.enrollment = d.properties.ENROLLMENT
    d.coverage = d.properties.PERCENT
    d.id = d.properties.SCHOOL_CODE
  });

  // info tooltip
  // https://leafletjs.com/examples/choropleth/
  var info = L.control();

  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); 
    this.update();
    return this._div;
  };

  info.update = function (d) {
    this._div.innerHTML = '<h4>KINDERGARTEN MMR COVERAGE</h4>' + (d ?
      d.name + "<br/>" +
      d.city + ", CA" + "<br/>" + "<br/>" + 
      "ENROLLMENT: " + d.enrollment + "<br/>" + 
      "COVERAGE: " + d.coverage + "%" + "<br/>" 
      : "Hover over a school for details.");
  };

  info.addTo(map);

  // legend 
  // https://gis.stackexchange.com/questions/133630/adding-leaflet-legend
  var legend = L.control({position: 'bottomleft'});
  legend.onAdd = function (map) {

  var div = L.DomUtil.create('div', 'info legend'),
  labels = ['50 kindergarteners', '100 kindergarteners', '500 kindergarteners'];

  div.innerHTML = 
  ['<div class="row" <span class="legend inner-row"><h4>SCHOOL<br/>ENROLLMENT</span></h4></div>' +
  '<div class="row" "><i class="circle1" ></i><span class="legend inner-row">' + labels[0] + '</span></div>' +
  '<div class="row" "><i class="circle2" ></i><span class="legend inner-row">' + labels[1] + '</span></div>' +
  '<div class="row" "><i class="circle3" ></i><span class="legend inner-row">' + labels[2] + '</span></div>']

   return div;
  };
  
  legend.addTo(map);

  // mouseover 
  var schoolMouseover = function (d) {
    info.update(d); 
  }; 

  var schoolMouseout = function (d) {
    info.update(); 
  }; 

  var schoolClicked = function (d) {
    map.setView(L.latLng(d.LatLng), 10);
  }; 

  // schools   
  function getColor (d) {
    return d > 95 ? '#1696d2' : 
           d > 90 ? '#55b748' :
           d > 80 ? '#e88e2d' : 
           '#6e1614';
  }

  var circles = g.selectAll("circle")
    .data(caSchools.features)
    .enter()
    .append("circle")
    .attr("name", d => d.name)
    .attr("city", d => d.city)
    .attr("fill", d => getColor(d.coverage))
    .attr("stroke-width", 0.1)
    .attr("stroke", "black")
    .attr("opacity", 0.9) 
    .attr("r", d => Math.sqrt(parseInt(d.enrollment) * 0.1))
    .attr("active", false); 

  circles.on("click", function(d) {
    schoolClicked(d); 
  }) 

  circles.on("mouseover", function (d) {
    d3.select(this)
    .attr("stroke-width", 0.5)
    .attr("r", 10)
    schoolMouseover(d); 
  }); 

  circles.on("mouseout", function (d) {
    d3.select(this)
    .attr("stroke-width", 0.1)
    .attr("r", d => Math.sqrt(parseInt(d.enrollment) * 0.1))
    schoolMouseout(d) 
  }); 

  var transform = d3.geoTransform({point: projectPoint}); 
  var path = d3.geoPath().projection(transform); 

  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(x, y)); 
    this.stream.point(point,x, point.y)
  }

  // update with zoom 
  map.on("moveend", update); 
  update();

  function update() {
    select('.leaflet-zoom-animated').attr('pointer-events', 'all');
    circles.attr("transform", function(d) { 
      return "translate("+ 
        map.latLngToLayerPoint(d.LatLng).x +","+ 
        map.latLngToLayerPoint(d.LatLng).y +")";
      }); 

  // ---------- STRIP PLOT ---------- //

  // dimensions 
  var margin = {top: 0, right: 70, bottom: 0, left: 10}; 
  var width = 300 - margin.left - margin.right, 
      height = 600 - margin.top - margin.bottom;  

  // svg layer 
  var svg = d3.select('#strip').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g'); 

  // scales 
  var yScale = d3.scaleLinear()
    .domain([95, 90, 80, 0])
    .range([550, 381, 164, 0]); 

  var xScale = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]); 

  var yAxis = d3.axisRight()
    .scale(yScale)
    .tickValues([95, 90, 80, 0])
    .tickFormat(function(d) {return d * 1 + "%"}); 

  // bars  
  function getColor (d) {
    return d > 95 ? '#1696d2' : 
           d > 90 ? '#55b748' :
           d > 80 ? '#e88e2d' : 
           '#6e1614';
  }; 

  var strips = svg.selectAll('rect')
    .data(caSchools.features)
    .enter()
    .append('rect')
    .attr('x', xScale(1))
    .attr('y', d => yScale(d.properties.PERCENT_jitter))
    .attr('width', 80)
    .attr('height', 0.5)
    .attr('fill', d => getColor(d.properties.PERCENT_jitter))
    .on('mouseover', d => schoolMouseover(d))
    .on('mouseout', d => schoolMouseout())
    // .on('click', d => schoolClicked(d)); 

  strips.on('click', function (d) {
    d3.select(this)
    .attr('width', 100)
    .attr('height', 2)
    schoolClicked(d)
  })

  strips.on('mouseover', function (d) {
    d3.select(this)
    .attr('width', 100)
    .attr('height', 2)
    schoolMouseover(d)
  });

  strips.on('mouseout', function (d) {
    d3.select(this)
    .attr('width', 80)
    .attr('height', 0.5)
  })

  svg.append('g')
    .attr('class', 'text')
    .attr('transform', 'translate(0' + 85 + ',' + '4)')
    .call(yAxis);
}; 
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

// STRIP PLOT 
// https://bl.ocks.org/phocks/878340b26d0aa69658854c17cdf2e046
// http://www.maartenlambrechts.com/2015/11/30/interactive-strip-plots-for-visualizing-demographics.html
// https://murray-cecile.github.io/map-unemployment/ 




