import * as d3 from "d3";
import powerbi from "powerbi-visuals-api";
import viewModelObject from "./viewModel";
import plotData from "./plotData";
import between from "../Functions/between";
import ISelectionId = powerbi.visuals.ISelectionId;
type SelectionBase = d3.Selection<SVGGElement, unknown, null, undefined>;

class svgDotsClass {
  dotsGroup: SelectionBase;

  draw(viewModel: viewModelObject): void {
    this.dotsGroup.selectAll(".dotsgroup").remove()
    if (!(viewModel.plotPoints)) {
      return;
    }

    this.dotsGroup
        .append('g')
        .classed("dotsgroup", true)
        .selectAll(".dotsgroup")
        .data(viewModel.plotPoints)
        .enter()
        .append("circle")
        .filter((d: plotData) => d.value !== null)
        .attr("cy", (d: plotData) => viewModel.plotProperties.yScale(d.value))
        .attr("cx", (d: plotData) => viewModel.plotProperties.xScale(d.x))
        .attr("r", (d: plotData) => d.aesthetics.size)
        .style("fill", (d: plotData) => {
          if (viewModel.plotProperties.displayPlot) {
            return between(d.value, viewModel.plotProperties.yAxis.lower, viewModel.plotProperties.yAxis.upper) ? d.aesthetics.colour : "#FFFFFF";
          } else {
            return "#FFFFFF";
          }
        });
  }

  highlight(anyHighlights: boolean, allSelectionIDs: ISelectionId[],
            opacityFull: number, opacityReduced: number): void {
    console.log("dots here")
    console.log(this.dotsGroup)
    const defaultOpacity: number = (anyHighlights || (allSelectionIDs.length > 0))
                                      ? opacityReduced
                                      : opacityFull;
    this.dotsGroup.style("fill-opacity", defaultOpacity);
    if (anyHighlights || (allSelectionIDs.length > 0)) {
      this.dotsGroup.each((d, i, node) => {
        console.log("d:", d)
        console.log("d1:", i)
        console.log("d2:", node)
      })
      this.dotsGroup.style("fill-opacity", (dot: plotData, i, nodes) => {
        console.log("dot:", dot)
        console.log("dot1:", i)
        console.log("dot2:", nodes[i])
        const currentPointSelected: boolean = allSelectionIDs.some((currentSelectionId: ISelectionId) => {
          return currentSelectionId.includes(dot.identity);
        });
        const currentPointHighlighted: boolean = dot.highlighted;
        return (currentPointSelected || currentPointHighlighted) ? dot.aesthetics.opacity : dot.aesthetics.opacity_unselected;
      })
    }
  }

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    this.dotsGroup = svg.append("g");
  }
}
export default svgDotsClass
