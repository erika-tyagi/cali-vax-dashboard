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
      yearFilter: '2017', 
      maxCoverage: 100, 
      minEnrollment: 0, 
      schoolType: ['PUBLIC', 'PRIVATE'], 
      marker: {'y': 999}
    }; 
    myMap(caBase, caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType);
    myHist(caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType, state.marker);

    coverageSlider(caSchools, function(d) {
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.maxCoverage = d * 100; // percentage formatting 
      myMap(caBase, caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType, state.marker); 
    });

    enrollmentSlider(caSchools, function(d) {
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.minEnrollment = d;   
      myMap(caBase, caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType, state.marker); 
    });

    privatePublicDropdown(caSchools, function(d) { 
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.schoolType = this.value;   
      myMap(caBase, caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType, state.marker); 
    }); 

    yearDropdown(caSchools, function(d) {
      d3.select("#map").selectAll("*").remove();
      d3.select("#hist").selectAll("*").remove();
      state.yearFilter = this.value;   
      myMap(caBase, caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType);
      myHist(caSchools, state.yearFilter, state.maxCoverage, state.minEnrollment, state.schoolType, state.marker); 
    }); 
  });
});  

// ---------- MAP ---------- //
function myMap(caBase, caSchools, yearFilter, maxCoverage, minEnrollment, schoolType) {

  // base map
  // https://stackoverflow.com/questions/19186428/refresh-leaflet-map-map-container-is-already-initialized
  const container = L.DomUtil.get('map');
  if (container != null) {
    container._leaflet_id = null;
  }
  
  console.log(container._leaflet_id)
  const map = L.map('map', {center: [37.3, -119.6], zoom: 6});
  console.log(container._leaflet_id)

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
  const svg = d3
    .select('#map')
    .select('svg');

  const g = svg
    .append('g')
    .attr('class', 'leaflet-zoom-hide');

  // process schools
  caSchools.features.forEach(function(d) {
    d.LatLng = new L.LatLng(d.properties.lat, d.properties.lon);
    d.year = d.properties.year; 
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
  const circles = g
    .selectAll('circle')
    .data(caSchools.features)
    .enter()
    .append('circle')
    .filter(function(d) {return d.year === yearFilter 
      & d.coverage < maxCoverage 
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
    myHist(caSchools, yearFilter, maxCoverage, minEnrollment, schoolType, {'y': d.coverage});
  });

  circles.on('mouseout', function(d) {
    d3.select(this)
      .attr('stroke-width', 0.1)
      .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1));
    info.update();
    d3.select('#hist').selectAll("*").remove();
    myHist(caSchools, yearFilter, maxCoverage, minEnrollment, schoolType, {'y': 999});
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

function myHist (caSchools, yearFilter, maxCoverage, minEnrollment, schoolType, marker) {

  // dimensions 
  const margin = {top: 20, right: 20, bottom: 55, left: 35};
      const width = 200 - margin.left - margin.right; 
      const height = 570 - margin.top - margin.bottom;  

  // svg layer 
  const svg = d3.select("#hist").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", 
          `translate(${  margin.left  },${  margin.top  })`);

  // y axis  
  const yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, height]);

  const yAxis = d3.axisLeft()
      .scale(yScale)
      .tickValues([0, 80, 95, 100])
      .tickFormat(function(d) {return `${Number(d)  }%`}); 

  // x axis 
  // https://stackoverflow.com/questions/15211488/formatting-numbers-with-commas-in-d3
  const xScale = d3.scaleLog()
    .domain([10000, 1])
    .range([width, 0]); 

  const format = d3.format(",")
  const xAxis = d3.axisBottom()
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
  const histogram = d3.histogram()
    .value(function(d) { return d.coverage; })
    .domain(yScale.domain())
    .thresholds(yScale.ticks(100));

  const bars = svg.selectAll(".bar")
    .data(histogram(caSchools.features
      .filter(function(d) { return d.year === yearFilter
        & d.coverage < maxCoverage 
        & d.enrollment > minEnrollment 
        & schoolType.indexOf(d.public_private) !== -1})))
    .enter()
    .append("rect")
    .filter(function(d) { return d.length > 0 })
    .attr("y", function(d) { return yScale(d.x0); })
    .attr("width", function(d) { return xScale(d.length); }) 
    .attr("height", height / 100 + 0.2)
    .attr("fill", function(d) { return getColor(d.x0); })

  // x axis 
  svg.append("g")
    .attr("class", "text")
    .attr("transform", `translate(0,${  height  })`)
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
  const margin = {top: 55, right: 40, bottom: 0, left: 15};
      const width = 200 - margin.left - margin.right; 
      const height = 90 - margin.top - margin.bottom;  

  // slider 
  const coverageSlider = sliderHorizontal()
    .min(0)
    .max(1)
    .width(width)
    .tickFormat(d3.format(".0%"))
    .ticks(5)
    .default(100)
    .on("onchange", update);

  // add on svg 
  const svg = d3
    .select("#sliders")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${  margin.left  },${  margin.top  })`)
    .call(coverageSlider)
    .append("text")
      .attr("dy", -15)
      .attr("dx", -10)
      .text("Schools with coverage below...")
}; 

function enrollmentSlider(caSchools, update) {

  // dimensions 
  const margin = {top: 55, right: 40, bottom: 0, left: 15};
      const width = 200 - margin.left - margin.right; 
      const height = 90 - margin.top - margin.bottom;  

  // slider 
  const coverageSlider = sliderHorizontal()
    .min(0)
    .max(500)
    .width(width)
    .ticks(5)
    .default(0)
    .on("onchange", update);

  // add on svg 
  const svg = d3
    .select("#sliders")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${  margin.left  },${  margin.top  })`)
    .call(coverageSlider)
    .append("text")
      .attr("dy", -15)
      .attr("dx", -10)
      .text("Schools with enrollment above...")
}; 

// ---------- DROPDOWNS ---------- //
function privatePublicDropdown(caSchools, onChange) {

  // convert dropdown keys to values 
  function getTypes (d) {
    return d === "All Schools" ? ["PUBLIC", "PRIVATE"] : 
       d === "Public Schools" ? ["PUBLIC"] :
       d === "Private Schools" ? ["PRIVATE"] : 
       ["PUBLIC", "PRIVATE"];} 

  // dropdown 
  d3.select("#type-dropdown")
    .selectAll("myOptions")
    .data(["All Schools", "Public Schools", "Private Schools"])
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => getTypes(d));

  d3.select("#type-dropdown").on("change", onChange); 
  }; 


function yearDropdown(caSchools, onChange) {

  // convert dropdown keys to values 
  function getTypes (d) {
    return d === "2016-2017 School Year" ? "2016" : 
       d === "2017-2018 School Year" ? "2017" :
       d === "2018-2019 School Year" ? "2018" : 
       "2018";} 

  // dropdown 
  d3.select("#year-dropdown")
    .selectAll("myOptions")
    .data(["2018-2019 School Year", "2017-2018 School Year", "2016-2017 School Year"])
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => getTypes(d));

  d3.select("#year-dropdown").on("change", onChange); 
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


