const domReady = require('domready');
import './stylesheets/main.css';

import * as d3 from 'd3';
import leafletEasybutton from 'leaflet-easybutton';

// ---------- DATA + RENDER ---------- //
domReady(() => {
  Promise.all([
    d3.json('./data/california.geojson'),
    d3.json('./data/ca-schools.geojson'),
    d3.csv('./data/ca-hist.csv'),
  ]).then(d => {
    const [caBase, caSchools, caHist] = d;
    // myMap(caBase, caSchools);
    myHist(caHist);
  });
});

// ---------- MAP ---------- //
function myMap(caBase, caSchools) {
  // base map
  var map = L.map('map', {center: [37.5, -119], zoom: 6});
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
  var svg = d3.select('#map').select('svg');

  var g = svg.append('g').attr('class', 'leaflet-zoom-hide');

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
  var info = L.control();

  info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  info.update = function(d) {
    this._div.innerHTML = d
      ? '<b>' +
        d.name +
        '</b>' +
        '<br/>' +
        d.city +
        ', CA' +
        '<br/>' +
        '<br/>' +
        'ENROLLMENT: ' +
        d.enrollment +
        '<br/>' +
        'MMR COVERAGE: ' +
        d.coverage +
        '%' +
        '<br/>'
      : 'Hover over a school for details.';
  };

  info.addTo(map);

  // legend
  // https://gis.stackexchange.com/questions/133630/adding-leaflet-legend
  var legend = L.control({position: 'bottomleft'});
  legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend'),
      labels = ['50 kindergarteners', '100 kindergarteners', '500 kindergarteners'];

    div.innerHTML = [
      '<div class="row" <span class="legend inner-row"><h4>SCHOOL<br/>ENROLLMENT</span></h4></div>' +
        '<div class="row" "><i class="circle1" ></i><span class="legend inner-row">' +
        labels[0] +
        '</span></div>' +
        '<div class="row" "><i class="circle2" ></i><span class="legend inner-row">' +
        labels[1] +
        '</span></div>' +
        '<div class="row" "><i class="circle3" ></i><span class="legend inner-row">' +
        labels[2] +
        '</span></div>',
    ];

    return div;
  };

  legend.addTo(map);

  // mouseover
  var schoolMouseover = function(d) {
    info.update(d);
  };

  var schoolMouseout = function(d) {
    info.update();
  };

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
      .attr('stroke-width', 0.5)
      .attr('r', 10);
    schoolMouseover(d);
  });

  circles.on('mouseout', function(d) {
    d3.select(this)
      .attr('stroke-width', 0.1)
      .attr('r', d => Math.sqrt(parseInt(d.enrollment) * 0.1));
    schoolMouseout(d);
  });

  var transform = d3.geoTransform({point: projectPoint});
  var path = d3.geoPath().projection(transform);

  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(x, y));
    this.stream.point(point, x, point.y);
  }

  // update with zoom
  map.on('moveend', update);
  update();

  function update() {
    d3.select('.leaflet-zoom-animated').attr('pointer-events', 'all');
    circles.attr('transform', function(d) {
      return (
        'translate(' + map.latLngToLayerPoint(d.LatLng).x + ',' + map.latLngToLayerPoint(d.LatLng).y + ')'
      );
    });
  }
}

// ---------- HISTOGRAM ---------- //

function myHist(caHist) {
  var width = 300,
    height = 540;

  // svg layer
  var svg = d3
    .select('#hist')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g');

  var x = d3
    .scaleLinear()
    .domain([0, 100])
    .range([0, width]);

  var y = d3
    .scaleLinear()
    .domain([0, 100])
    .range([height, 0]);

  svg
    .selectAll('.bar')
    .data(caHist)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', function(d) {
      return x(d.PERCENT);
    })
    // .attr("width", x.bandwidth())
    .attr('y', function(d) {
      return y(d.count);
    })
    .attr('width', width)
    .attr('height', function(d) {
      return height - y(d.count);
    });

  svg
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x));

  svg.append('g').call(d3.axisLeft(y));
}

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
