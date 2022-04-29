"use strict";

import "core-js/stable";
import "regenerator-runtime/runtime";
import "../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import checkIDSelected from "./Selection Helpers/checkIDSelected";
import settingsObject from "./Classes/settingsObject"
import viewModelObject from "./Classes/viewModel"
import plotData from "./Classes/plotData";
import * as d3 from "d3";
import lineData from "./Classes/lineData"

type LineType = d3.Selection<d3.BaseType, plotData[], SVGElement, any>;
type MergedLineType = d3.Selection<SVGPathElement, plotData[], SVGElement, any>;

export class Visual implements IVisual {
    private host: IVisualHost;
    private svg: d3.Selection<SVGElement, any, any, any>;
    private listeningRect: d3.Selection<SVGElement, any, any, any>;
    private listeningRectSelection: d3.Selection<any, any, any, any>;
    private tooltipLineGroup: d3.Selection<SVGElement, any, any, any>;
    private tooltipLineSelection: d3.Selection<any, any, any, any>;
    private dotGroup: d3.Selection<SVGElement, any, any, any>;
    private dotSelection: d3.Selection<any, any, any, any>;
    private lineGroup: d3.Selection<SVGElement, any, any, any>;
    private lineSelection: any;
    private xAxisGroup: d3.Selection<SVGGElement, any, any, any>;
    private xAxisLabels: d3.Selection<SVGGElement, any, any, any>;
    private yAxisGroup: d3.Selection<SVGGElement, any, any, any>;
    private yAxisLabels: d3.Selection<SVGGElement, any, any, any>;
    private viewModel: viewModelObject;
    private height: number;
    private width: number;
    private xScale: d3.ScaleLinear<number, number, never>
    private yScale: d3.ScaleLinear<number, number, never>;
    private plottingMerged: { dotsMerged: d3.Selection<any, any, any, any>,
                              linesMerged: d3.Selection<any, any, any, any> };

    // Method for notifying PowerBI of changes in the visual to propagate to the
    //   rest of the report
    private selectionManager: ISelectionManager;

    // Settings for plot aesthetics
    private settings: settingsObject;

    constructor(options: VisualConstructorOptions) {
      // Add reference to host object, for accessing environment (e.g. colour)
      this.host = options.host;

                  // Get reference to element object for manipulation
                  //   (reference to html container for visual)
      this.svg = d3.select(options.element)
                  // Create new svg element inside container
                    .append("svg");

      this.listeningRect = this.svg.append("g")
                                    .classed("listen-group", true);
      this.tooltipLineGroup = this.svg.append("g")
                              .classed("tooltip-group", true);
      this.lineGroup = this.svg.append("g")
                              .classed("line-group", true);
      this.dotGroup = this.svg.append("g")
                              .classed("dot-group", true);

      // Add a grouping ('g') element to the canvas that will later become the x-axis
      this.xAxisGroup = this.svg.append("g")
                                .classed("x-axis", true);
      this.xAxisLabels = this.svg.append("text");

      // Add a grouping ('g') element to the canvas that will later become the y-axis
      this.yAxisGroup = this.svg.append("g")
                                .classed("y-axis", true);
      this.yAxisLabels = this.svg.append("text");

      // Request a new selectionManager tied to the visual
      this.selectionManager = this.host.createSelectionManager();
      this.settings = new settingsObject();

      this.plottingMerged = { dotsMerged: null, linesMerged: null };

      // Update dot highlighting on initialisation
      this.selectionManager.registerOnSelectCallback(() => {
      console.log("callback")
        this.updateHighlighting();
      })
    }

    public update(options: VisualUpdateOptions) {
      // Update settings object with user-specified values (if present)
      this.settings.updateSettings(options.dataViews[0].metadata.objects);

      // Insert the viewModel object containing the user-input data
      //   This function contains the construction of the spc
      //   control limits
      this.viewModel = new viewModelObject({ options: options,
                                            inputSettings: this.settings,
                                            host: this.host });

      // Get the width and height of plotting space
      this.width = options.viewport.width;
      this.height = options.viewport.height;

      // Dynamically scale chart to use all available space
      this.svg.attr("width", this.width)
              .attr("height", this.height);

      this.initTooltipTracking();

      this.drawXAxis();
      this.drawYAxis();

      this.drawLines();
      this.drawDots();

      this.addContextMenu();
    }

  drawYAxis(): void {
    let yAxisMin: number = this.viewModel.axisLimits.y.lower;
    let yAxisMax: number = this.viewModel.axisLimits.y.upper;
    let xAxisPadding: number = this.viewModel.axisLimits.x.padding;
    let yAxisPadding: number = this.viewModel.axisLimits.y.padding;
    let xAxisEndPadding: number = this.settings.axispad.x.end_padding.value;

    this.yScale = d3.scaleLinear()
                    .domain([yAxisMin, yAxisMax])
                    .range([this.height - xAxisPadding, xAxisEndPadding]);

    let yAxis: d3.Axis<d3.NumberValue>
      = d3.axisLeft(this.yScale)
          .tickFormat(
              d => {
                // If axis displayed on % scale, then disable axis values > 100%
                let prop_limits: boolean = this.viewModel.inputData.chart_type == "p" && this.viewModel.inputData.multiplier == 1;
                return prop_limits ? (d <= 1 ? (<number>d * 100).toFixed(2) + "%" : "" ) : <string><unknown>d;
              }
          );

    // Draw axes on plot
    this.yAxisGroup
        .call(yAxis)
        .attr("color", this.viewModel.displayPlot ? "#000000" : "#FFFFFF")
        .attr("transform", "translate(" +  yAxisPadding + ",0)");


    this.yAxisLabels
        .attr("x",yAxisPadding)
        .attr("y",this.height/2)
        .attr("transform","rotate(-90," + yAxisPadding/3 +"," + this.height/2 +")")
        .text(this.settings.axis.ylimit_label.value)
        .style("text-anchor", "end");
  }

  drawXAxis(): void {
    let xAxisMin: number = this.viewModel.axisLimits.x.lower;
    let xAxisMax: number = this.viewModel.axisLimits.x.upper;
    let xAxisPadding: number = this.viewModel.axisLimits.x.padding;
    let yAxisPadding: number = this.viewModel.axisLimits.y.padding;
    let yAxisEndPadding: number = this.settings.axispad.y.end_padding.value;
    this.xScale = d3.scaleLinear()
                    .domain([xAxisMin, xAxisMax])
                    .range([yAxisPadding, this.width - yAxisEndPadding]);

    let xLabels: { x: number; label: string; }[] = this.viewModel.plotPoints.map(d => d.tick_label);
    let xAxis: d3.Axis<d3.NumberValue> = d3.axisBottom(this.xScale)
        .tickFormat(
            d => {
              let label = <string>xLabels.filter(key => <number>d == key.x).map(key => key.label)[0]
              return label;
            }
        )

    this.xAxisGroup
        .call(xAxis)
        .attr("color", this.viewModel.displayPlot ? "#000000" : "#FFFFFF")
        // Plots the axis at the correct height
        .attr("transform", "translate(0, " + (this.height - xAxisPadding) + ")")
        .selectAll("text")
        // Rotate tick labels
        .attr("transform","rotate(-35)")
        // Right-align
        .style("text-anchor", "end")
        // Scale font
        .style("font-size","x-small");

    this.xAxisLabels.attr("x",this.width/2)
        .attr("y",this.height - xAxisPadding/10)
        .style("text-anchor", "middle")
        .text(this.settings.axis.xlimit_label.value);
  }

  updateHighlighting(): void {
    if (!this.plottingMerged.dotsMerged) {
        return;
    }
    if (!this.plottingMerged.linesMerged) {
        return;
    }
    let anyHighlights: boolean = this.viewModel.anyHighlights;
    let allSelectionIDs: ISelectionId[] = this.selectionManager.getSelectionIds() as ISelectionId[];


    let opacityFull: number = this.settings.scatter.opacity.value;
    let opacityReduced: number = this.settings.scatter.opacity_unselected.value;

    let defaultOpacity: number = (anyHighlights || (allSelectionIDs.length > 0))
                                    ? opacityReduced
                                    : opacityFull;
    this.plottingMerged.linesMerged.style("stroke-opacity", defaultOpacity);
    this.plottingMerged.dotsMerged.style("fill-opacity", defaultOpacity);

    if (anyHighlights || (allSelectionIDs.length > 0)) {
    this.dotSelection.style("fill-opacity", (dot: plotData) => {
      let currentPointSelected: boolean = allSelectionIDs.some((currentSelectionId: ISelectionId) => {
        return currentSelectionId.includes(dot.identity);
      });
      let currentPointHighlighted: boolean = dot.highlighted;
      return (currentPointSelected || currentPointHighlighted) ? opacityFull : opacityReduced;
    })
    }
  }

  drawDots(): void {
    let dot_size: number = this.settings.scatter.size.value;
    let dot_colour: string = this.settings.scatter.colour.value;
    let dot_opacity: number = this.settings.scatter.opacity.value;
    let dot_opacity_unsel: number = this.settings.scatter.opacity_unselected.value;

    // Bind input data to dotGroup reference
    this.dotSelection = this.dotGroup
                            // List all child elements of dotGroup that have CSS class '.dot'
                            .selectAll(".dot")
                            // Matches input array to a list, returns three result sets
                            //   - HTML element for which there are no matching datapoint (if so, creates new elements to be appended)
                            .data(this.viewModel.plotPoints);
    // Update the datapoints if data is refreshed
    this.plottingMerged.dotsMerged = this.dotSelection.enter()
                  .append("circle")
                  .merge(<any>this.dotSelection);

    this.plottingMerged.dotsMerged.classed("dot", true);

    this.plottingMerged.dotsMerged.filter(d => (d.value != null))
              .attr("cy", d => this.yScale(d.value))
              .attr("cx", d => this.xScale(d.x))
              .attr("r", dot_size)
            // Fill each dot with the colour in each DataPoint
              .style("fill", d => dot_colour);

    // Change opacity (highlighting) with selections in other plots
    // Specify actions to take when clicking on dots
    this.plottingMerged.dotsMerged
        .on("click", d => {
            // Pass identities of selected data back to PowerBI
            this.selectionManager
                // Propagate identities of selected data back to
                //   PowerBI based on all selected dots
                .select(d.identity, (<any>d3).event.ctrlKey)
                // Change opacity of non-selected dots
                .then(ids => {
                  let anySelected: boolean = ids.length > 0;
                  this.plottingMerged.dotsMerged.style(
                        "fill-opacity", d =>
                        anySelected ?
                        (ids.indexOf(d.identity) >= 0 ? dot_opacity : dot_opacity_unsel)
                        : dot_opacity
                    );
                  this.plottingMerged.linesMerged.style("stroke-opacity",
                    anySelected ? dot_opacity_unsel : dot_opacity);
                });
                (<any>d3).event.stopPropagation();
          })
        // Display tooltip content on mouseover
        .on("mouseover", d => {
            // Get screen coordinates of mouse pointer, tooltip will
            //   be displayed at these coordinates
            //    Needs the '<any>' prefix, otherwise PowerBI doesn't defer
            //      to d3 properly
            let x = (<any>d3).event.pageX;
            let y = (<any>d3).event.pageY;

            this.host.tooltipService.show({
                dataItems: d.tooltip,
                identities: [d.identity],
                coordinates: [x, y],
                isTouchEvent: false
            });
        })
        // Specify that tooltips should move with the mouse
        .on("mousemove", d => {
            // Get screen coordinates of mouse pointer, tooltip will
            //   be displayed at these coordinates
            //    Needs the '<any>' prefix, otherwise PowerBI doesn't defer
            //      to d3 properly
            let x = (<any>d3).event.pageX;
            let y = (<any>d3).event.pageY;

            // Use the 'move' service for more responsive display
            this.host.tooltipService.move({
                dataItems: d.tooltip,
                identities: [d.identity],
                coordinates: [x, y],
                isTouchEvent: false
            });
        })
        // Hide tooltip when mouse moves out of dot
        .on("mouseout", d => {
            this.host.tooltipService.hide({
                immediately: true,
                isTouchEvent: false
            })
        });

    this.updateHighlighting();
    this.dotSelection.exit().remove();
    this.plottingMerged.dotsMerged.exit().remove();

    this.svg.on('click', () => {
        this.selectionManager.clear();
        this.updateHighlighting();
    });
  }

  drawLines(): void {
    let l99_width: number = this.settings.lines.width_99.value;
    let l95_width: number = this.settings.lines.width_95.value;
    let main_width: number = this.settings.lines.width_main.value;
    let target_width: number = this.settings.lines.width_target.value;
    let l99_colour: string = this.settings.lines.colour_99.value;
    let l95_colour: string = this.settings.lines.colour_95.value;
    let main_colour: string = this.settings.lines.colour_main.value;
    let target_colour: string = this.settings.lines.colour_target.value;
    let opacity: number = this.settings.scatter.opacity.value;
    let opacity_unsel: number = this.settings.scatter.opacity_unselected.value;

    let GroupedLines = this.viewModel.groupedLines;
    let group_keys: string[] = GroupedLines.map(d => d.key)

    this.lineSelection = this.lineGroup
                              .selectAll(".line")
                              .data(this.viewModel.groupedLines);

    let line_color = d3.scaleOrdinal()
                        .domain(group_keys)
                        .range([l99_colour, l95_colour, l95_colour, l99_colour, target_colour, main_colour]);

    let line_width = d3.scaleOrdinal()
                        .domain(group_keys)
                        .range([l99_width, l95_width, l95_width, l99_width, target_width, main_width]);

    this.plottingMerged.linesMerged = this.lineSelection
                          .enter()
                          .append("path")
                          .merge(<any>this.lineSelection);

    this.plottingMerged.linesMerged.classed('line', true);
    this.plottingMerged.linesMerged.attr("d", d => {
                        return d3.line<lineData>()
                                  .x(d => this.xScale(d.x))
                                  .y(d => this.yScale(d.line_value))
                                  .defined(function(d) {return d.line_value !== null})
                                  (d.values)
                    });
    this.plottingMerged.linesMerged.attr("fill", "none")
                    .attr("stroke", d => <string>line_color(d.key))
                    .attr("stroke-width", d => <number>line_width(d.key))
                    .attr("stroke-opacity", this.viewModel.anyHighlights ? opacity_unsel : opacity);
    this.lineSelection.exit().remove();
    this.plottingMerged.linesMerged.exit().remove();
  }

  addContextMenu(): void {
    this.svg.on('contextmenu', () => {
        const eventTarget: EventTarget = (<any>d3).event.target;
        let dataPoint: plotData = <plotData>(d3.select(<d3.BaseType>eventTarget).datum());
        this.selectionManager.showContextMenu(dataPoint ? dataPoint.identity : {}, {
            x: (<any>d3).event.clientX,
            y: (<any>d3).event.clientY
        });
        (<any>d3).event.preventDefault();
    });
  }

  initTooltipTracking(): void {
    this.listeningRectSelection = this.listeningRect
                                      .selectAll(".obs-sel")
                                      .data(this.viewModel.plotPoints);
    this.tooltipLineSelection = this.tooltipLineGroup
                                    .selectAll(".ttip-line")
                                    .data(this.viewModel.plotPoints);
    let xAxisLine = this.tooltipLineSelection
                        .enter()
                        .append("rect")
                        .merge(<any>this.tooltipLineSelection);
    xAxisLine.classed("ttip-line", true);
    xAxisLine.attr("stroke-width", "1px")
            .attr("width", ".5px")
            .attr("height", this.height)
            .style("fill-opacity", 0);

    this.listeningRectSelection = this.listeningRectSelection.enter()
                                    .append("rect")
                                    .merge(<any>this.listeningRectSelection)
    this.listeningRectSelection.classed("obs-sel", true);

    this.listeningRectSelection.style("fill","transparent")
            .attr("width", this.width)
            .attr("height", this.height)
            .on("mousemove", d => {
                let xval: number = this.xScale.invert((<any>d3).event.pageX);

                let x_dist: number[] = this.viewModel.plotPoints.map(d => d.x).map(d => {
                    return Math.abs(d - xval)
                })
                let minInd: number = d3.scan(x_dist,(a,b) => a-b);

                let scaled_x: number = this.xScale(this.viewModel.plotPoints[minInd].x)
                let scaled_y: number = this.yScale(this.viewModel.plotPoints[minInd].value)

                this.host.tooltipService.show({
                    dataItems: this.viewModel.plotPoints[minInd].tooltip,
                    identities: [this.viewModel.plotPoints[minInd].identity],
                    coordinates: [scaled_x, scaled_y],
                    isTouchEvent: false
                });
                xAxisLine.style("fill-opacity", 1)
                        .attr("transform", "translate(" + scaled_x + ",0)");
            })
            .on("mouseleave", d => {
                this.host.tooltipService.hide({
                    immediately: true,
                    isTouchEvent: false
                });
                xAxisLine.style("fill-opacity", 0);
            });
    xAxisLine.exit().remove()
    this.listeningRectSelection.exit().remove()
  }

  // Function to render the properties specified in capabilities.json to the properties pane
  public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
    VisualObjectInstanceEnumeration {
      let propertyGroupName: string = options.objectName;
      // Object that holds the specified settings/options to be rendered
      let properties: VisualObjectInstance[] = [];
      properties.push({
        objectName: propertyGroupName,
        properties: this.settings.returnValues(propertyGroupName),
        selector: null
      });
      return properties;
  }
}
