class stackedChart {
    constructor(_parentElement, _vacancyData, _rentGrowthData, _colors) {
        this.parentElement = _parentElement;
        this.vacancyData = _vacancyData;
        this.rentGrowthData = _rentGrowthData;
        this.vColor = _colors.vColor;
        this.eColor = _colors.eColor;
        this.cColor = _colors.cColor;
        this.tColor = _colors.tColor;
        this.oColor = _colors.oColor;
        this.mColor = _colors.mColor;
        this.textColor = _colors.textColor;
        this.backgroundColor = _colors.backgroundColor
        this.rentGrowthColor = _colors.rentGrowthColor;
        this.vacancyColor = _colors.vacancyColor;
        this.combinedData = []; // Initialize combinedData
        //this.selectedRegion = "Toronto"; // Initialize selectedMarket
        this.selectedSector = 'vacancy';
        this.keys = ["Vancouver", "Edmonton", "Calgary", "Toronto", "Ottawa", "Montreal"];
        this.colors = {
            "Vancouver": _colors.vColor,
            "Edmonton": _colors.eColor,
            "Calgary": _colors.cColor,
            "Toronto": _colors.tColor,
            "Ottawa": _colors.oColor,
            "Montreal": _colors.mColor
        };
        this.activeRegions = new Set(this.keys);
        this.initVis();
    }

    loadData() {
        let vis = this;
        // Process the raw data
        vis.processedVacancyData = vis.processIndustrialData(vis.vacancyData);
        vis.processedRentGrowthData = vis.processIndustrialData(vis.rentGrowthData);

        // console.log("Processed Vacancy Data:", vis.processedVacancyData);
        // console.log("Processed Rent Growth Data:", vis.processedRentGrowthData);

        // Combine the processed data
        vis.combinedData = vis.combineData(vis.processedVacancyData, vis.processedRentGrowthData);

        // console.log("Combined data", vis.combinedData);

        // Replace null values with zeros in the combined data
        vis.filteredData = vis.combinedData.map(d => {
            return {
                date: d.date,
                Toronto: vis.selectedSector === 'vacancy' ? d.Toronto_vacancy || 0 : d.Toronto_rentGrowth || 0,
                Montreal: vis.selectedSector === 'vacancy' ? d.Montreal_vacancy || 0 : d.Montreal_rentGrowth || 0,
                Ottawa: vis.selectedSector === 'vacancy' ? d.Ottawa_vacancy || 0 : d.Ottawa_rentGrowth || 0,
                Vancouver: vis.selectedSector === 'vacancy' ? d.Vancouver_vacancy || 0 : d.Vancouver_rentGrowth || 0,
                Calgary: vis.selectedSector === 'vacancy' ? d.Calgary_vacancy || 0 : d.Calgary_rentGrowth || 0,
                Edmonton: vis.selectedSector === 'vacancy' ? d.Edmonton_vacancy || 0 : d.Edmonton_rentGrowth || 0
            };
        });
        return vis.filteredData;
    }

    initVis() {
        let vis = this;

        vis.width = 600;
        vis.height = 400;
        vis.margin = {top: 40, right: 40, bottom: 20, left: 60};

        vis.loadData();
        vis.bisectDate = d3.bisector(function(d) { return d.date; }).left;


        vis.series = d3.stack()
            .keys(vis.keys)
            .value((d, key) => d[key])  // Adjust the value accessor
            (vis.filteredData); // combined dataset


        vis.x = d3.scaleTime()
            .domain(d3.extent(vis.filteredData, d => d.date))
            .range([vis.margin.left, vis.width - vis.margin.right]);

        vis.y = d3.scaleLinear()
            .domain([0, d3.max(vis.series, d => d3.max(d, d => d[1]))])
            .rangeRound([vis.height - vis.margin.bottom, vis.margin.top]);

        vis.color = d3.scaleOrdinal()
            .domain(vis.series.map(d => d.key))
            .range(Object.values(vis.colors));

        vis.area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.y(d[0]))
            .y1(d => vis.y(d[1]));

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("viewBox", [0, 0, vis.width, vis.height])
            .attr("style", "max-width: 100%; height: auto;");

        // Add the y-axis
        vis.svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${vis.margin.left},0)`)
            .call(d3.axisLeft(vis.y).tickSizeOuter(0).tickFormat(d3.format(".0%")))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").clone()
                .attr("x2", vis.width - vis.margin.left - vis.margin.right)
                .attr("stroke-opacity", 0.1))
            .call(g => g.append("text")
                .attr("x", -vis.margin.left)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start"));


        // Adding a y-axis label
        vis.yAxisLabel = vis.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", 0 - (vis.height / 2))
            .attr("dy", "1em") // Adjust this as needed
            .attr("fill", vis.textColor)
            .style('font-size', '.75rem')
            .style("text-anchor", "middle")
            .text(vis.selectedSector === 'vacancy' ? 'Vacancy Rate' : 'Rent Growth Rate');


        // Append the horizontal axis atop the area.
        vis.svg.append("g")
            .attr("transform", `translate(0,${vis.height - vis.margin.bottom})`)
            .call(d3.axisBottom(vis.x).tickFormat(d => vis.formatQuarter(d)));

        // Create a legend group and position it at the top
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0, 10)`); // Adjust this as needed

        // Calculate the spacing for the legend items
        let legendSpacing = vis.width / (vis.keys.length + 1);

        // Create legend items
        vis.legendItems = vis.legend.selectAll(".legend-item")
            .data(vis.keys)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${(i + 1) * legendSpacing}, 0)`)
            .on("click", function (event, key) {
                // Toggle region visibility
                if (vis.activeRegions.has(key)) {
                    vis.activeRegions.delete(key);
                } else {
                    vis.activeRegions.add(key);
                }
                vis.wrangleData();
                vis.updateLegend();
            });

        // Add rectangles to legend items
        vis.legend.selectAll(".legend-item")
            .append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("y", 8)
            .attr("x", -30)
            .attr("fill", d => vis.activeRegions.has(d) ? vis.colors[d] : vis.backgroundColor)
            .attr("stroke", d => vis.colors[d]);


        // Add text to legend items
        vis.legend.selectAll(".legend-item")
            .append("text")
            .attr("x", -10)
            .attr("y", 20)
            .attr("fill", "currentColor")
            .text(d => d);


        vis.updateLegend = function () {
            // Update the fill of each rectangle based on the activeRegions set
            vis.legendItems.select("rect")
                .attr("fill", d => vis.activeRegions.has(d) ? vis.colors[d] : vis.backgroundColor);
        }

        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        vis.initSectorIcons();
        vis.wrangleData();


    }


    wrangleData() {
        let vis = this;


        // Filter the data based on the active regions
        vis.filteredData = vis.combinedData.map(d => {
            let result = {date: d.date};
            vis.keys.forEach(key => {
                if (vis.activeRegions.has(key)) {
                    result[key] = d[key + '_' + vis.selectedSector] || 0;
                } else {
                    result[key] = 0;
                }
            });
            return result;
        });

        vis.updateVis();
    }

    processIndustrialData(data) {
        let vis = this;
        vis.processedData = [];

        if (!Array.isArray(data)) {
            console.error("Data is not an array:", data);
            return [];
        }

        data.forEach(row => {
            //console.log("Data item:", row); // Corrected to use 'row'

            let date = vis.parseQuarterlyDate(row['Date']);

            // console.log(`Parsed date for ${row['Date']}:`, date); // Add this line for debugging

            vis.processedData.push({
                date: date,
                Toronto: +row['Toronto'] || 0,
                Montreal: +row['Montreal'] || 0,
                Ottawa: +row['Ottawa'] || 0,
                Vancouver: +row['Vancouver'] || 0,
                Calgary: +row['Calgary'] || 0,
                Edmonton: +row['Edmonton'] || 0
            });
        });
        //console.log("Processed data:", vis.processedData);
        return vis.processedData;
    }

    parseQuarterlyDate(dateString) {
        if (!dateString) {
            console.error("Invalid date string:", dateString);
            return null;
        }
        const parts = dateString.split(' '); // Split by space
        const year = parts[1]; // The year is the second part
        let month;

        // Determine the month based on the quarter
        switch (parts[0]) {
            case 'Q1':
                month = '01';
                break;
            case 'Q2':
                month = '04';
                break;
            case 'Q3':
                month = '07';
                break;
            case 'Q4':
                month = '10';
                break;
            default:
                console.error("Invalid quarter:", parts[0]);
                return null; // Return null for invalid quarter
        }

        return new Date(`${year}-${month}-01`); // Construct a date object
    }

    formatQuarter(d) {
        let quarter = Math.floor(d.getMonth() / 3) + 1;
        return `Q${quarter} ${d.getFullYear()}`;
    }

    combineData() {
        let vis = this;
        let combinedData = [];

        vis.processedVacancyData.forEach(vacancyRecord => {
            if (vacancyRecord.date) {
                let rentGrowthRecord = vis.processedRentGrowthData.find(rentRecord => rentRecord.date && rentRecord.date.getTime() === vacancyRecord.date.getTime());

                if (rentGrowthRecord) {
                    combinedData.push({
                        date: vacancyRecord.date,
                        Toronto_vacancy: vacancyRecord.Toronto,
                        Montreal_vacancy: vacancyRecord.Montreal,
                        Ottawa_vacancy: vacancyRecord.Ottawa,
                        Vancouver_vacancy: vacancyRecord.Vancouver,
                        Calgary_vacancy: vacancyRecord.Calgary,
                        Edmonton_vacancy: vacancyRecord.Edmonton,
                        Toronto_rentGrowth: rentGrowthRecord.Toronto,
                        Montreal_rentGrowth: rentGrowthRecord.Montreal,
                        Ottawa_rentGrowth: rentGrowthRecord.Ottawa,
                        Vancouver_rentGrowth: rentGrowthRecord.Vancouver,
                        Calgary_rentGrowth: rentGrowthRecord.Calgary,
                        Edmonton_rentGrowth: rentGrowthRecord.Edmonton
                    });
                } else {
                    console.log(`No matching rent growth record found for date: ${vacancyRecord.date}`);
                }
            } else {
                console.log('Missing date in vacancy record:', vacancyRecord);
            }
        });

        //console.log("Combined Data after processing:", combinedData);
        return combinedData;
    }

    updateVis() {
        let vis = this;

        // Re-calculate the stack data
        vis.series = d3.stack()
            .keys(vis.keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone)
            (vis.filteredData);

        // Update the y-scale domain based on the new data
        vis.y.domain([0, d3.max(vis.series, series => d3.max(series, d => d[1]))]);

        // Bind the data to the paths
        var paths = vis.svg.selectAll(".area")
            .data(vis.series, d => d.key);

        // Enter new paths for any new data
        paths.enter().append("path")
            .attr("class", "area")
            .attr("d", vis.area)
            .attr("fill", d => vis.color(d.key));

        // Update existing paths with new data
        paths.transition()
            .duration(500)
            .attr("d", vis.area)
            .attr("fill", d => vis.color(d.key));

        // Remove old paths
        paths.exit()
            .transition()
            .duration(500)
            .style("opacity", 0) // Fade out the path before removing it
            .remove();


        let yAxisFormat;
        if (vis.selectedSector === 'rentGrowth') {
            yAxisFormat = d3.format("$.2f"); // Format as currency
        } else if (vis.selectedSector === 'vacancy') {
            yAxisFormat = d3.format(".0%"); // Format as percentage
        }


        // Redraw the y-axis with a transition
        vis.svg.select(".y-axis")
            .transition()
            .duration(500)
            .call(d3.axisLeft(vis.y).tickFormat(yAxisFormat));

        // Update the y-axis label text
        vis.yAxisLabel
            .attr("fill", "currentColor")
            .text(vis.selectedSector === 'vacancy' ? 'Availability Rate %' : 'Rent Growth Rate (net rent / psf)');

        // Tooltip interaction
        vis.svg.selectAll(".area")
            .on("mouseover", function(event, d) {
                // Use D3's invert method on the x-scale to find the closest date to the mouse position
                const x0 = vis.x.invert(d3.pointer(event, this)[0]);
                const i = vis.bisectDate(vis.filteredData, x0, 1); // bisectDate is a D3 utility to find the index of the closest date in the array
                const dataPoint = vis.filteredData[i];

                // Extract information for the tooltip
                const region = d.key;
                const date = dataPoint.date;
                const value = dataPoint[region];

                const formattedDate = vis.formatQuarter(date); // Use your formatQuarter function
                let displayValue;
                if (vis.selectedSector === 'rentGrowth') {
                    // Format as currency
                    displayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                } else if (vis.selectedSector === 'vacancy') {
                    // Format as percentage
                    displayValue = (value * 100).toFixed(2) + '%';
                }

                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                vis.tooltip.html(
                    `<h6><strong>Date:</strong> ${formattedDate}<br>` +
                    `<strong>Region:</strong> ${region}<br>` +
                    `<strong>Value:</strong> ${displayValue}</h6>`
                )
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY) + "px");
            })
            .on("mouseout", function() {
                vis.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    initSectorIcons() {
        let vis = this;
        const sectors = {
            'vacancy': "img/vacancy.svg",
            'rentGrowth': "img/rentGrowth.svg"
        };
        // Select the h3 element
        const header = document.querySelector('#industrial-rent-growth h4');

        Object.entries(sectors).forEach(([sector, iconPath]) => {
            fetch(iconPath)
                .then(response => response.text())
                .then(svgData => {
                    // Set the innerHTML with the fetched SVG data
                    let container = document.getElementById(sector);
                    container.innerHTML = svgData;

                    // Tooltip code starts here
                    container.addEventListener("mouseover", function(event) {
                        vis.tooltip.style("opacity", 1)
                            .html(sector === 'rentGrowth' ? "<h6>Rent Growth</h6>" : "<h6>Availability</h6>") // Tooltip text
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY + 10) + "px");
                    });

                    container.addEventListener("mouseout", function() {
                        vis.tooltip.style("opacity", 0);
                    });
                    // Tooltip code ends here

                    // Existing click event listener
                    container.addEventListener("click", function() {
                        vis.selectedSector = sector;
                        header.textContent = sector === 'rentGrowth' ? 'Rent Growth in Industrial Sector' :
                            `${sector.charAt(0).toUpperCase() + sector.slice(1)} in Industrial Sector`;

                        // Remove 'clicked' class from both elements
                        document.getElementById('vacancy').classList.remove('vacancy-clicked');
                        document.getElementById('rentGrowth').classList.remove('rentGrowth-clicked');

                        // Add 'clicked' class to the clicked element
                        if (sector === 'vacancy') {
                            document.getElementById('vacancy').classList.add('vacancy-clicked');
                        } else if (sector === 'rentGrowth') {
                            document.getElementById('rentGrowth').classList.add('rentGrowth-clicked');
                        }

                        vis.wrangleData();
                    });

                });
        });
    }


}