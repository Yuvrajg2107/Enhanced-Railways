// react plugin for creating vector maps
import { VectorMap } from "@react-jvectormap/core";
import { inMill } from "@react-jvectormap/india";

// Define the component props
interface MaharashtraMapProps {
  mapColor?: string;
}

const CountryMap: React.FC<MaharashtraMapProps> = ({ mapColor }) => {
  return (
    <VectorMap
      map={inMill}
      backgroundColor="transparent"
      focusOn={{
        latLng: [19.0760, 72.8777], // Center on Mumbai
        scale: 5,
        animate: true,
      } as any} // Type assertion to bypass TypeScript error
      selectedRegions={["IN-MH"]} // Highlight Maharashtra
      markerStyle={{
        initial: {
          fill: "#465FFF",
          r: 4, // Custom radius for markers
        } as any, // Type assertion to bypass strict CSS property checks
      }}
      markersSelectable={true}
      markers={[
        {
          latLng: [19.0760, 72.8777],
          name: "Mumbai",
          style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
        },
        {
          latLng: [18.5204, 73.8567],
          name: "Pune",
          style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
        },
        {
          latLng: [21.1458, 79.0882],
          name: "Nagpur",
          style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
        },
        {
          latLng: [20.0111, 73.7907],
          name: "Nashik",
          style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
        },
        {
          latLng: [19.8762, 75.3433],
          name: "Aurangabad",
          style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
        },
      ]}
      zoomOnScroll={true}
      zoomMax={12}
      zoomMin={3}
      zoomAnimate={true}
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: mapColor || "#D0D5DD",
          fillOpacity: 1,
          fontFamily: "Outfit",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: "pointer",
          fill: "#465fff",
          stroke: "none",
        },
        selected: {
          fill: "#465FFF",
        },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: {
          fill: "#35373e",
          fontWeight: 500,
          fontSize: "13px",
          stroke: "none",
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
};

export default CountryMap;