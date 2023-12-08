class CanadaMap {

    constructor(_parentElement, _geoData, _colors) {
        this.parentElement = _parentElement;
        this.geoData = _geoData;
        this.retailColor = _colors.retailColor;
        this.officeColor = _colors.officeColor;
        this.industrialColor = _colors.industrialColor;
        this.multifamilyColor = _colors.multifamilyColor;
        this.vColor = _colors.vColor;
        this.eColor = _colors.eColor;
        this.cColor = _colors.cColor;
        this.tColor = _colors.tColor;
        this.oColor = _colors.oColor;
        this.mColor = _colors.mColor;
        this.selectedRegionElement = null;
        this.selectedSectorElement = null;


        this.initVis();
    }


    initVis() {
        let vis = this;
        vis.margin = { top: 10, right: 10, bottom: 10, left: 10 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 600 - vis.margin.top - vis.margin.bottom;
        vis.projection = d3.geoMercator().center([-97, 49]).scale(300).translate([vis.width / 2, vis.height / 2]);
        vis.path = d3.geoPath().projection(vis.projection);

        // console.log("colors: ",vis.colors);

        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        vis.svg.selectAll(".country")
            .data(topojson.feature(vis.geoData, vis.geoData.objects.canada).features)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", vis.path)
            .attr("fill", "gray")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        vis.highlightRegions();
        vis.initSectorIcons();
    }

    highlightRegions() {
        let vis = this;

        // Coordinates for key regions - these would be longitude and latitude
        const regions = {
            "Vancouver": { coords: [-123.1207, 49.2827], color: vis.vColor },
            "Edmonton": { coords: [-113.4938, 53.5461], color: vis.eColor },
            "Calgary": { coords: [-114.0719, 51.0447], color: vis.cColor },
            "Toronto": { coords: [-79.3832, 43.6532], color: vis.tColor },
            "Ottawa": { coords: [-75.6972, 45.4215], color: vis.oColor },
            "Montreal": { coords: [-73.5673, 45.5017], color: vis.mColor }
        };


        vis.svg.selectAll(".region")
            .data(Object.entries(regions))
            .enter().append("circle")
            .attr("class", "region")
            .attr("cx", d => vis.projection(d[1].coords)[0])
            .attr("cy", d => vis.projection(d[1].coords)[1])
            .attr("r", 10)
            .attr("fill", d => d[1].color)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke", "var(--color-text)")
                    .attr("stroke-width", 3);
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("stroke", "none");
            })
            .on("click", function(event, d) {
                // Reset the previously selected region, if any
                if (vis.selectedRegionElement) {
                    vis.selectedRegionElement
                        .attr("stroke", "none")
                        .attr("stroke-width", 0);
                }

                // Update the selected region element
                vis.selectedRegionElement = d3.select(this);
                vis.selectedRegionElement
                    .attr("stroke", "var(--color-text)")  // or a specific color if you prefer
                    .attr("stroke-width", 3);

                // Update content based on the selected region
                vis.updateCardContentRegion(d[0]);
                vis.updateHeaderText(`${d[0]}`, d[1].color);
            })
            .append("title")
            .text(d => d[0]);
    }

    updateCardContentRegion(region) {
        let vis = this;
        vis.regionInfo = {
            'Vancouver': "Known for its vibrant real estate market, Vancouver is a hub for residential and commercial properties, characterized by high property values and a diverse market. Key features include a strong housing market, diverse demographics, and thriving commercial districts. Vancouver is also a major port city contributing significantly to Canada's economy.",
            'Edmonton': "Edmonton's real estate market is influenced by its status as a governmental and cultural center, offering a stable environment for both commercial and residential sectors. Key features include governmental buildings, cultural institutions, and an affordable housing market. Edmonton has strong public sector influence, with growing service and technology sectors.",
            'Calgary': "Calgary's real estate market is dynamic, influenced by the energy sector. It features a mix of modern commercial properties and residential areas. Key features include proximity to natural resources, modern downtown area, and suburban expansion. Calgary is known for its robust energy sector, complemented by growing financial and technology industries, positioning it as a key player in both traditional and emerging economic sectors.",
            'Toronto': "As Canada's financial capital, Toronto's real estate market is robust, with a high demand for both commercial and residential spaces. Key Features include a diverse economy, high-density urban center, and a luxury housing market. Toronto, as a financial services hub with a diverse cultural scene, stands out as a major international city, significantly contributing to the global economy with its robust financial sector, rich cultural diversity, and international stature.",
            'Ottawa': "Being the capital city, Ottawa has a stable real estate market with a significant presence of governmental and diplomatic properties. Key features include governmental offices, historical sites, mixed urban and suburban areas. Its economic significance lies in public sector employment, a burgeoning tech industry, and a vibrant tourism sector, all contributing to a mixed urban and suburban landscape enriched with governmental offices and historical sites.",
            'Montreal': "Montreal's real estate market uniquely fuses historical architecture with contemporary development, reflecting its rich cultural and artistic vibrancy. This blend of old and new is accentuated by its deep French heritage and a lively arts scene. Economically, Montreal stands out as a cultural hub, bolstered by robust industrial and service sectors, and its status as a significant port city."
        };
        d3.select("#content .card-body").html(vis.regionInfo[region]);
    }
    updateCardContent(sector) {
        let vis = this;
        vis.sectorInfo = {
            'retail': "The retail sector, encompassing shopping centers, malls, and high-street shops, faces evolving trends like the shift towards e-commerce, the criticality of location, and the rise of mixed-use developments. Key challenges include adapting to online shopping trends, sustaining foot traffic, and managing market competition.",
            'office': "Encompassing skyscrapers and small business offices, the office sector is seeing a rise in demand for flexible workspaces and green buildings, with amenities gaining importance. Key challenges include adapting to remote work, managing vacancy rates, and upgrading older buildings.",
            'industrial': "This sector, covering manufacturing, logistics, warehouses, and distribution centers, is experiencing an e-commerce driven demand surge for warehouses and smart factories. Challenges include maintaining location accessibility, technological advancements, and adhering to environmental regulations.",
            'multifamily': "The multifamily sector, including rental apartments and condominiums, is witnessing urbanization-driven demand and the development of luxury units with community amenities. Major challenges are providing affordable housing, effective property management, and navigating market fluctuations."
        };
        d3.select("#content .card-body").html(vis.sectorInfo[sector]);
    }

    updateHeaderText(text, color) {
        let vis = this;
        const header = document.querySelector('#sectors h1');
        header.textContent = text;
        header.style.color = color; // Set the header color
    }

    getSectorColor(sector) {
        let vis = this;
        switch(sector) {
            case 'retail': return vis.retailColor;
            case 'office': return vis.officeColor;
            case 'industrial': return vis.industrialColor;
            case 'multifamily': return vis.multifamilyColor;
            default: return 'black'; // Default color if no match is found
        }
    }


    initSectorIcons() {
        let vis = this;
        const sectors = {
            'retail': "img/retail.svg",
            'office': "img/office.svg",
            'industrial': "img/industrial.svg",
            'multifamily': "img/multifamily.svg"
        };


        Object.entries(sectors).forEach(([sector, iconPath]) => {
            fetch(iconPath)
                .then(response => response.text())
                .then(svgData => {
                    document.getElementById(sector).innerHTML = svgData;
                })
                .then(() => {
                    document.getElementById(sector).addEventListener("click", function() {
                        if (vis.selectedRegionElement) {
                            vis.selectedRegionElement.classed("region-clicked", false);
                            vis.selectedRegionElement = null;
                        }
                        if (vis.selectedSectorElement) {
                            vis.selectedSectorElement.classList.remove(`${vis.selectedSectorElement.id}-clicked`);
                        }
                        vis.selectedSectorElement = this;
                        vis.selectedSectorElement.classList.add(`${sector}-clicked`);
                        vis.updateCardContent(sector);
                        let sectorColor = vis.getSectorColor(sector);
                        vis.updateHeaderText(`${sector.charAt(0).toUpperCase() + sector.slice(1)} Sector`, sectorColor);
                    });
                });
        });
    }
}