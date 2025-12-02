
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';

interface MindMapGraphProps {
  data: MindMapNode;
  onNodeClick: (nodeName: string) => void;
}

const MindMapGraph: React.FC<MindMapGraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [searchQuery, setSearchQuery] = useState('');
  
  // To store the d3 zoom object to allow external control
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: Math.max(600, wrapperRef.current.clientHeight),
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Color Scale based on depth
    const color = d3.scaleOrdinal(d3.schemeSet3);

    // Create Hierarchy
    const root = d3.hierarchy(data);
    
    // Tree Layout
    const treeLayout = d3.tree<MindMapNode>().size([innerHeight, innerWidth]);
    treeLayout(root);

    // Zoom behavior
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    gRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);
    
    // Center the initial view
    svg.transition().duration(750).call(
      zoom.transform, 
      d3.zoomIdentity.translate(margin.left + 50, margin.top).scale(0.8)
    );

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<MindMapNode>, d3.HierarchyPointNode<MindMapNode>>()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
          onNodeClick(d.data.name);
      })
      .on("mouseover", function() {
          d3.select(this).select("circle").attr("stroke", "#4f46e5").attr("stroke-width", 3);
          d3.select(this).select("text").style("font-weight", "bold");
      })
      .on("mouseout", function() {
          d3.select(this).select("circle").attr("stroke", d => d3.select(this).classed("highlighted") ? "#ef4444" : "#94a3b8").attr("stroke-width", 2);
          d3.select(this).select("text").style("font-weight", "normal");
      });

    // Node Circles
    node.append("circle")
      .attr("r", d => d.depth === 0 ? 10 : 6)
      .attr("fill", d => color(d.depth.toString()) as string)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2);

    // Node Labels
    node.append("text")
      .attr("dy", 4)
      .attr("x", d => d.children ? -12 : 12)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "Inter, sans-serif")
      .style("fill", "#1e293b")
      .style("text-shadow", "0 2px 4px rgba(255,255,255,0.9)");

  }, [data, dimensions, onNodeClick]);

  // Handle Search and Highlighting
  useEffect(() => {
    if (!gRef.current) return;

    const g = gRef.current;
    const lowerQuery = searchQuery.toLowerCase();
    
    // Reset all
    g.selectAll(".node circle")
        .attr("fill", (d: any) => d3.scaleOrdinal(d3.schemeSet3)(d.depth.toString()) as string)
        .attr("stroke", "#94a3b8")
        .attr("r", (d: any) => d.depth === 0 ? 10 : 6);

    g.selectAll(".node text")
        .style("fill", "#1e293b")
        .style("font-weight", "normal");

    g.selectAll(".link")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-opacity", 1);

    if (!searchQuery) return;

    // Dim non-matches
    g.selectAll(".node").style("opacity", 0.3);
    g.selectAll(".link").style("opacity", 0.3);

    // Highlight Matches
    g.selectAll(".node").filter((d: any) => d.data.name.toLowerCase().includes(lowerQuery))
        .style("opacity", 1)
        .each(function(d: any) {
            // Highlight node
            d3.select(this).select("circle")
                .attr("fill", "#ef4444")
                .attr("stroke", "#b91c1c")
                .attr("r", 10);
            
            d3.select(this).select("text")
                .style("fill", "#b91c1c")
                .style("font-weight", "bold");
            
            // Walk up parents to highlight path
            let current = d;
            while(current.parent) {
                 // Find link to parent
                 g.selectAll(".link").filter((l: any) => l.target === current)
                    .attr("stroke", "#ef4444")
                    .attr("stroke-width", 2)
                    .style("opacity", 1);

                 // Highlight parent node
                 g.selectAll(".node").filter((n: any) => n === current.parent)
                    .style("opacity", 1);
                 
                 current = current.parent;
            }
        });

  }, [searchQuery]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, factor);
  };

  return (
    <div className="relative w-full h-full min-h-[600px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col">
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Search */}
          <div className="relative group">
              <input 
                type="text" 
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-48 focus:w-64 transition-all bg-white/90 backdrop-blur border border-slate-300 rounded-full text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
          </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button onClick={() => handleZoom(1.2)} className="bg-white p-2 rounded-lg shadow border border-slate-200 hover:bg-slate-50 text-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
             </svg>
          </button>
          <button onClick={() => handleZoom(0.8)} className="bg-white p-2 rounded-lg shadow border border-slate-200 hover:bg-slate-50 text-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
             </svg>
          </button>
      </div>
      
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-md text-xs text-slate-500 border border-slate-200 pointer-events-none">
        Scroll to zoom • Drag to pan • Click node to read
      </div>

      <div ref={wrapperRef} className="flex-1 w-full h-full">
         <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="cursor-grab active:cursor-grabbing w-full h-full" />
      </div>
    </div>
  );
};

export default MindMapGraph;
