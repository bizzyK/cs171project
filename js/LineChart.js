class LineChart {

    constructor(_parentElement, _data, _macroEventHandler) {
        this.parentElement = _parentElement;
        this.data = _data;
        this.macroEventHandler = _macroEventHandler;

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 50, right: 25, bottom: 30, left: 50 };

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = 200 - vis.margin.top - vis.margin.bottom;
        // vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;


        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y)
            .tickFormat(d3.format(".0%"))
            .ticks(6);

        // Set domains by finding the min and max of both the X and Y
        let minMaxX = d3.extent(vis.data.map(function (d) { return d.date; }));
        vis.x.domain(minMaxX);

        let minMaxY = [d3.min(vis.data.map(function (d) { return d.gdp_yy_chg; })),
            d3.max(vis.data.map(function (d) { return d.gdp_yy_chg; }))];

        vis.y.domain(minMaxY);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // Graph title, written like this to span two lines
        vis.svg.append("text")
            .attr("class", "graph-title")
            .attr("x", -25)
            .attr("y", -30)
            .text("Year-over-year change ")
            .append("tspan")
            .attr("dx", -100)
            .attr("dy", 15)
            .text("in GDP(%)");

        const highlightedPeriods = [
            { start: new Date("1986-01-01"), end: new Date("1991-01-01"), label: "Oil Crisis" },
            { start: new Date("1999-01-01"), end: new Date("2001-01-01"), label: "Tech Bubble" },
            { start: new Date("2007-01-01"), end: new Date("2011-01-01"), label: "Global Financial Crisis" },
            { start: new Date("2020-01-01"), end: new Date("2022-01-01"), label: "COVID" },
        ];

        // Create area chart that highlights the crisis time periods, add it before the line chart
        vis.area = d3.area()
            .x(function(d) { return vis.x(d.date); })
            .y0(vis.height)
            .y1(0);

        // Create a group for the highlighted areas and labels
        vis.highlightedGroup = vis.svg.append("g")
            .attr("class", "highlighted-group");

        // Add new highlighted areas based on the specified time periods
        vis.highlightedGroup.selectAll(".highlighted-area")
            .data(highlightedPeriods)
            .enter().append("g")
            .attr("class", "highlighted-group-item")
            .each(function(d) {
                // Filter data to include only points within the current time period
                const areaData = vis.data.filter(point => point.date >= d.start && point.date <= d.end);

                // Append the highlighted area
                d3.select(this).append("path")
                    .attr("class", "highlighted-area")
                    .attr("fill", "orange")
                    .attr("opacity", 0.3)
                    .attr("d", vis.area(areaData));

                // Append the label above the highlighted area
                d3.select(this).append("text")
                    .attr("class", "highlighted-label")
                    // .attr("x", vis.x(areaData[0].date))
                    .attr("x", vis.x(areaData[Math.floor(areaData.length / 2)].date)) // Use the midpoint of the data
                    .attr("y", -10) // Adjust the position as needed
                    .text(d.label);
            });

        // Add the line
        vis.svg.append("path")
            .datum(vis.data)
            .attr("fill", "none")
            .attr("stroke", "var(--color-text)")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(d) { return vis.x(d.date) })
                .y(function(d) { return vis.y(d.gdp_yy_chg) })
            );

        vis.currentBrushRegion = null;
        vis.brush = d3.brushX()
            .extent([[0,0],[vis.width, vis.height]])
            .on("brush", function (event) {
                // User just selected a specific region
                vis.currentBrushRegion = event.selection;

                if (vis.currentBrushRegion) {
                    // Quantize the brush selection to quarters
                    vis.currentBrushRegion = vis.currentBrushRegion.map(vis.x.invert);
                    console.log(vis.currentBrushRegion);
                }

                // console.log(vis.currentBrushRegion);

                // 3. Trigger the event 'selectionChanged' of our event handler
                vis.macroEventHandler.trigger("selectionChanged", vis.currentBrushRegion);
            });

        vis.brushGroup = vis.svg.append("g")
            .attr("class", "brush")
            .call(vis.brush)

        // (Filter, aggregate, modify data)
        vis.wrangleData();
    }



    /*
     * Data wrangling
     */

    wrangleData() {
        let vis = this;

        this.displayData = this.data;

        // Update the visualization
        vis.updateVis();
    }



    /*
     * The drawing function - should use the D3 update sequence (enter, update, exit)
     * Function parameters only needed if different kinds of updates are needed
     */

    updateVis() {
        let vis = this;

        // Call brush component here
        // *** TO-DO ***
        // vis.brushGroup.call(vis.brush);
        // vis.brushGroup.call(vis.zoom);
        // vis.brushGroup.call(zoom)
        // 	.on("mousedown.zoom", null)
        // 	.on("touchstart.zoom", null);


        // Call the area function and update the path
        // D3 uses each data point and passes it to the area function.
        // The area function translates the data into positions on the path in the SVG.
        // vis.timePath
        //     .datum(vis.displayData)
        //     .attr("d", vis.area)
        //     .attr("clip-path", "url(#clip)");
        //
        //
        // Call axis functions with the new domain
        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);
    }

    // onSelectionChange(selectionStart, selectionEnd) {
    // let vis = this;

    // Change the selected time range
    // d3.select("#time-period-min").text(dateFormatter(selectionStart));
    // d3.select("#time-period-max").text(dateFormatter(selectionEnd));

    // // Not sure why the other way didn't work, but this way works for me!
    // document.querySelector(".time-period-min").innerText = dateFormatter(selectionStart);
    // document.querySelector(".time-period-max").innerText = dateFormatter(selectionEnd);

    // }
}


// TODO start at 1981 instead of 1980 because I don't have data there
// But I would still like the x axis to start at 1980