class VectomMapVis {
    constructor(_parentElement, _populationDataPath, _geoDataPath, _colors) {
        this.parentElement = _parentElement;
        this.dataUrl = _populationDataPath;
        this.topoJsonUrl = _geoDataPath;
        this.colors = _colors;
        this.vColor = _colors.vColor;
        this.eColor = _colors.eColor;
        this.cColor = _colors.cColor;
        this.tColor = _colors.tColor;
        this.oColor = _colors.oColor;
        this.mColor = _colors.mColor;
        this.provincePopulations = {};
        this.map = null;
        this.brush = null;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Define city coordinates
        vis.cities = [{"name": "Vancouver", "coords": [49.2827, -123.1207]}, {
            "name": "Edmonton",
            "coords": [53.5461, -113.4938]
        }, {"name": "Calgary", "coords": [51.0447, -114.0719]}, {
            "name": "Toronto",
            "coords": [43.6532, -79.3832]
        }, {"name": "Ottawa", "coords": [45.4215, -75.6972]}, {"name": "Montreal", "coords": [45.5017, -73.5673]}];

        vis.x = null;

        // console.log("colors: ",vis.colors);

        // Initialize the map and set its view
        vis.map = L.map(vis.parentElement, {
            zoomDelta: 0.1,  // Smaller value for finer zoom control
            wheelPxPerZoomLevel: 1200  // Higher value for more scroll required per zoom level
        }).setView([53.1304, -97.1384], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '© OpenStreetMap contributors'
        }).addTo(vis.map);


        // Load and process data
        d3.csv(vis.dataUrl).then(function (data) {
            // Debugging: Log loaded data
            //console.log("Loaded data:", data);

            vis.processData(data);
            // Debugging: Log province populations
            //console.log("Province populations:", vis.provincePopulations);

            const legendElement = document.getElementById('population-legend');

            if (!legendElement) {
                // If it doesn't exist, create and add the legend
                vis.addColorScaleKey();
            }
            vis.initializeMap();
            vis.resetToCurrentPopulation();

            vis.populateTimeline(Object.keys(vis.provincePopulations[Object.keys(vis.provincePopulations)[0]]));
        });
        // Add event listener to the reset button
        document.getElementById('resetButton').addEventListener('click', function () {
            vis.resetToCurrentPopulation();
        });


    }

    processData(data) {
        let vis = this;


        data.forEach(function (row) {
            let provinceName = row["Geography"];
            if (provinceName === "Canada") {
                // Handle the total population of Canada
                vis.totalPopulationCanada = vis.totalPopulationCanada || {};
                Object.keys(row).forEach(key => {
                    if (key.startsWith("Q") && key !== "Geography") {
                        vis.totalPopulationCanada[key] = parseInt(row[key].replace(/,/g, ''));
                    }
                });
            } else {
                vis.provincePopulations[provinceName] = vis.provincePopulations[provinceName] || {};

                Object.keys(row).forEach(key => {
                    if (key.startsWith("Q") && key !== "Geography") {
                        // Convert population string to a number, removing commas
                        let population = parseInt(row[key].replace(/,/g, ''));
                        vis.provincePopulations[provinceName][key] = population;
                    }
                });
            }
        });

    }


    initializeMap() {
        let vis = this;

        // Define the onEachFeature function
        function onEachFeature(feature, layer) {
            // Define the content of the tooltip
            let tooltipContent = `Province: ${feature.properties.name}`;

            // Bind the tooltip to the layer
            layer.bindTooltip(tooltipContent, {
                // Options for the tooltip
                permanent: false, // The tooltip will only show on hover
                direction: 'auto', // Automatic placement
                className: 'leaflet-tooltip-custom' // A custom CSS class for styling
            });

            layer.on('click', function () {
                // Get the current population for the clicked province
                let provinceName = feature.properties.name;
                let currentPopulation = vis.getCurrentPopulation(provinceName);
                // Update the text content of the element with id 'population-info'
                document.getElementById('population-info').textContent = `Province: ${provinceName}, Population: ${currentPopulation.toLocaleString('en-US')}`;
            });
        }

        // Fetch the topoJson data and create the map
        fetch(vis.topoJsonUrl)
            .then(response => response.json())
            .then(topoJsonData => {
                var geoJsonData = topojson.feature(topoJsonData, topoJsonData.objects.canada);

                // Create the GeoJSON layer and add it to the map
                L.geoJson(geoJsonData, {
                    style: function (feature) {
                        let provinceName = feature.properties.name;
                        let population = vis.getCurrentPopulation(provinceName);
                        return {
                            fillColor: vis.getProvinceColor(population),
                            weight: 2,
                            opacity: 1,
                            color: 'white',
                            fillOpacity: 0.7
                        };
                    }, onEachFeature: onEachFeature // Use the defined onEachFeature function
                }).addTo(vis.map);
            })
            .catch(error => console.error("Error loading data:", error));

        // Add markers for cities
        vis.cities.forEach(function (city) {
            L.marker(city.coords).bindPopup(city.name).addTo(vis.map);
        });
        let totalPopulation = vis.getCurrentPopulation(); // Get total population for Canada
        // Update the population display with total population

        document.getElementById('population-info').textContent = `Total Population of Canada: ${totalPopulation.toLocaleString('en-US')}`;
    }


    populateTimeline(quarters) {
        let vis = this;

        var margin = {top: 10, right: 30, bottom: 50, left: 30}, width = 860 - margin.left - margin.right,
            height = 100 - margin.top - margin.bottom;

        var svg = d3.select("#timeline1").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + 50)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        // Define the x scale for the timeline
        vis.x = d3.scalePoint()
            .domain(quarters)
            .range([0, width]);

        var xAxis = d3.axisBottom(vis.x).tickFormat(function (d, i) {
            return i % 4 === 0 ? d : ""; // Only display every 4th label
        });


        var gX = svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Rotate the text labels
        gX.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-55)"); // Adjust the angle as needed

        vis.brush = d3.brushX()
            .extent([[0, 0], [width, height - 2]]) // Adjusted height for brush
            .on("end", function (event) {
                vis.brushed(event);
            });

        svg.append("g")
            .attr("class", "brush")
            .call(vis.brush);
    }

    brushed(event) {
        let vis = this;
        if (!event.selection) return; // If no selection, do nothing

        function invertPointScale(scale, value, rangePadding) {
            // Assuming rangePadding is the padding you have on both sides of the range
            const domain = scale.domain();
            const range = scale.range();
            const eachBand = (range[range.length - 1] - rangePadding * 2) / (domain.length - 1);

            const index = Math.max(0, Math.min(domain.length - 1, Math.floor((value - rangePadding) / eachBand)));

            return domain[index];
        }

        const rangePadding = 0; // Adjust based on scale's range settings

        // Convert pixel coordinates to data using the custom invert function
        const quarters = event.selection.map(pixelValue => invertPointScale(vis.x, pixelValue, rangePadding));

        // Update the map based on the selected range
        vis.updateMapColorsForRange(quarters[0], quarters[1]);

        // Calculate and display the growth rate for all of Canada
        let startPopulationCanada = vis.getPopulationForQuarter("Canada", quarters[0]);
        let endPopulationCanada = vis.getPopulationForQuarter("Canada", quarters[1]);
        if (startPopulationCanada && endPopulationCanada) {
            let growthRateCanada = ((endPopulationCanada - startPopulationCanada) / startPopulationCanada) * 100;
            document.getElementById('population-info').textContent = `Canada Growth Rate: ${growthRateCanada.toFixed(2)}% from ${quarters[0]} to ${quarters[1]}`;
        }
    }


    updateMapColorsForRange(startQuarter, endQuarter) {
        let vis = this;

        vis.map.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties.name) {
                let provinceName = layer.feature.properties.name;
                let startPopulation = vis.getPopulationForQuarter(provinceName, startQuarter);
                let endPopulation = vis.getPopulationForQuarter(provinceName, endQuarter);

                if (startPopulation && endPopulation) {
                    let growthRate = ((endPopulation - startPopulation) / startPopulation) * 100;
                    let color = vis.getProvinceColor(endPopulation); // Use endPopulation for coloring
                    layer.setStyle({ fillColor: color });

                    // Update click event to display population and growth rate
                    layer.off('click'); // Remove previous click event
                    layer.on('click', function () {
                        document.getElementById('population-info').textContent = `Province: ${provinceName}, ${endQuarter} Population: ${endPopulation.toLocaleString('en-US')}, Growth Rate: ${growthRate.toFixed(2)}% since ${startQuarter}`;
                    });
                } else {
                    console.warn("No population data for " + provinceName + " in quarter " + endQuarter);
                }
            }
        });
    }



    getPopulationForQuarter(provinceName, quarter) {
        let vis = this;

        // Check if the provinceName is 'Canada' and return the population from totalPopulationCanada
        if (provinceName === "Canada") {
            return vis.totalPopulationCanada[quarter] || null;
        } else {
            let population = vis.provincePopulations[provinceName] ? vis.provincePopulations[provinceName][quarter] : null;
            return population;

        }


    }


    getCurrentPopulation(provinceName) {
        let vis = this;

        if (!provinceName || provinceName === "Canada") {
            console.log("Getting total population for Canada");
            let quarters = Object.keys(vis.totalPopulationCanada);
            let latestQuarter = quarters[quarters.length - 1];
            return vis.totalPopulationCanada[latestQuarter];
        }

        // Check if the province has data
        if (!vis.provincePopulations[provinceName] || vis.provincePopulations[provinceName].length === 0) {
            console.warn("No data or empty data for province:", provinceName);
            return "Data not available"; // Return a default message
        }

        let quarters = Object.keys(vis.provincePopulations[provinceName]);
        //console.log("Quarters for", provinceName, ":", quarters);

        // Assuming the quarters are sorted, the latest quarter would be the last one in the array
        let latestQuarter = quarters[quarters.length - 1];

        //console.log("Latest quarter for", provinceName, ":", latestQuarter);
        // console.log("Population for", latestQuarter, ":", vis.provincePopulations[provinceName][latestQuarter]);

        return vis.provincePopulations[provinceName][latestQuarter];
    }

    resetToCurrentPopulation() {
        let vis = this;
        vis.map.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties.name) {
                let provinceName = layer.feature.properties.name;
                let currentPopulation = vis.getCurrentPopulation(provinceName);
                let color = vis.getProvinceColor(currentPopulation);
                layer.setStyle({ fillColor: color });
            }
        });

        // Clear the brush selection
        if (vis.brush) {
            d3.select('.brush').call(vis.brush.move, null);
        }

        // Explicitly remove the brush's visual elements
        d3.select('.brush').selectAll('.selection, .handle').style('display', 'none');

        // Reset the population info text
        let totalPopulation = vis.getCurrentPopulation("Canada");
        document.getElementById('population-info').textContent = `Total Population of Canada: ${totalPopulation.toLocaleString('en-US')}`;

        // Recenter the map to the initial view
        vis.map.setView([53.1304, -97.1384], 4); // Replace with your initial latitude, longitude, and zoom level
    }





    getProvinceColor(populationChange) {
        let vis = this;
        let colorScale = d3.scaleThreshold()
            .domain([1000000, 2000000, 3000000, 4000000, 5000000])
            .range([vis.vColor, vis.eColor, vis.cColor, vis.tColor, vis.oColor, vis.mColor]);

        return colorScale(populationChange);
    }

    addColorScaleKey() {
        let vis = this;

        // Define the color scale
        let colorScale = d3.scaleThreshold()
            .domain([1000000, 2000000, 3000000, 4000000, 5000000])
            .range([vis.vColor, vis.eColor, vis.cColor, vis.tColor, vis.oColor, vis.mColor]);

        // Define the labels for the legend
        let labels = ['< 1M', '1M - 2M', '2M - 3M', '3M - 4M', '4M - 5M', '> 5M'];

        // Select the DOM element where the legend should be added
        const legendContainer = d3.select("#population-legend").style('text-align', 'center');

        // Create a list to hold legend items
        const legendList = legendContainer.append('ul')
            .attr('class', 'list-inline');

        // Loop through the labels and create legend items
        labels.forEach((label, i) => {
            let color = colorScale.range()[i];

            // Create a list item for each legend item
            let listItem = legendList.append('li')
                .attr('class', 'key')
                .style('display', 'inline-block')
                .style('align-items', 'center')
                .style('margin-right', '10px');

            // Create a color box using a div element
            listItem.append('div')
                .style('display', 'inline-block')
                .style('width', '20px')
                .style('height', '20px')
                .style('margin-right', '5px')
                .style('background-color', color);

            // Add the label text
            listItem.append('span')
                .text(label);
        });
    }

}