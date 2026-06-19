import { Grainient } from "../ui/Grainient";

export function WarmGrainientBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdf6_0%,#fff8ee_50%,#fffcf7_100%)]" />
      <Grainient
        className="absolute inset-0 opacity-[0.92]"
        color1="#fff0be"
        color2="#ffb357"
        color3="#f08d3c"
        timeSpeed={0.18}
        colorBalance={-0.08}
        warpStrength={0.9}
        warpFrequency={4.8}
        warpSpeed={1.25}
        warpAmplitude={56}
        blendAngle={-14}
        blendSoftness={0.18}
        rotationAmount={220}
        noiseScale={1.4}
        grainAmount={0.055}
        grainScale={1.7}
        grainAnimated
        contrast={1.08}
        gamma={1}
        saturation={1.05}
        centerX={0.02}
        centerY={-0.03}
        zoom={0.82}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,244,190,0.5),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,195,122,0.22),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0)_34%,rgba(255,250,238,0.3)_100%)]" />
    </>
  );
}
