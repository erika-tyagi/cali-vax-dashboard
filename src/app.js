const domReady = require('domready');
import "./stylesheets/main.css";

import * as d3 from "d3";
import {select} from 'd3-selection';
import {csv, json} from 'd3-fetch';

import leafletSearch from 'leaflet-search'; 
import leafletEasybutton from 'leaflet-easybutton'; 

// DATA
domReady(() => {
  Promise.all([
    json('./data/california.geojson'),
    json('./data/ca-schools.geojson'),
  ]).then(d => {
    const [caBase, caSchools] = d;
    myMap(caBase, caSchools);
  });
});

// http://bl.ocks.org/d3noob/9267535
// https://stackoverflow.com/questions/40047326/overlaying-circles-on-leaflet-with-d3-results-in-not-positioned-properly
// http://bl.ocks.org/1Cr18Ni9/d72b6ba95285b80fe4c7498e784a8e0c
// http://bl.ocks.org/Andrew-Reid/11602fac1ea66c2a6d7f78067b2deddb
// https://leafletjs.com/examples/choropleth/
// https://bost.ocks.org/mike/leaflet/ 

// MAP
function myMap (caBase, caSchools) {

  // base map 
  var map = L.map('map', {center: [37, -119],  zoom: 6}); 
  map.addLayer(new L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'})); 
  map.addLayer(new L.geoJSON(caBase, {style: {"color": "#b3abaa", "weight": 1, "opacity": 0.1}})); 

  // search bar 
  var markersLayer = new L.LayerGroup();
  map.addLayer(markersLayer);

  // home button 
  // https://gis.stackexchange.com/questions/127286/home-button-leaflet-map
  L.easyButton('fa-home', function (btn, map){map.setView([37, -119], 6)}, 'Zoom To Home').addTo(map);

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
    d.id = d.SCHOOL_CODE
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
      this._div.innerHTML = '<h4>Kindergarten MMR Coverage</h4>' + (d ?
        d.name + "<br/>" +
        d.city + ", CA" + "<br/>" + "<br/>" + 
        "ENROLLMENT: " + d.enrollment + "<br/>" + 
        "COVERAGE: " + d.coverage + "%" + "<br/>" 
        : "Hover over a school to learn more");
  };

  info.addTo(map);

  // mouseover 
  var schoolMouseover = function (d) {
    info.update(d); 
  }; 

  var schoolMouseout = function (d) {
    info.update(d); 
  }; 

  var onColor = function (d) {
    svg.selectAll("circle").filter("." + this.getAttribute(d.id))
      .style("opacity", 0.9);
  }; 

  var offColor = function (d) {
    svg.selectAll("circle").filter("." + this.getAttribute(d.id))
      .style("opacity", 0.5);
  }; 

  var clicked = function (d) {
    map.setView(L.latLng(d.LatLng), 10, {animate: false});
  }; 

  // schools   
  function getColor (d) {
    return d > 97 ? '#1696d2' : 
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
    .style("opacity", 0.5) 
    .attr("r", d => Math.sqrt(parseInt(d.enrollment) * 0.1))
    .attr("active", false)
    .on("click", clicked); 

  circles.on("mouseover", function (d) {
    schoolMouseover(d); 
    onColor.call(this, d); 
  }); 

  circles.on("mouseout", function (d) {
    schoolMouseout(d); 
    offColor.call(this, d); 
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
  }; 
}
