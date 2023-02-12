import {FC, useEffect, useRef} from "react";
import {useExtentCanvas} from "./hook";
import {ExtentCanvasProps} from "./types";

export type {ExtentCanvasProps} from "./types";

export const ExtentCanvas: FC<ExtentCanvasProps> = ({
  view,
  viewBox,
  options,
  initialPosition,
  initialScale,
  maxScale,
  minScale,
  zoomSensitivity,
  onContextInit,
  onBeforeDraw,
  onDraw,
  onViewChange,
  onViewBoxChange,
  ...canvasProps
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  const {setView, setViewBox} = useExtentCanvas({
    ref,
    options,
    initialPosition,
    initialScale,
    maxScale,
    minScale,
    zoomSensitivity,
    onContextInit,
    onBeforeDraw,
    onDraw,
    onViewChange,
    onViewBoxChange,
  });

  useEffect(() => {
    if (view === undefined) {
      return;
    }
    setView(view);
  }, [setView, view]);

  useEffect(() => {
    if (viewBox === undefined) {
      return;
    }
    setViewBox(viewBox);
  }, [setViewBox, viewBox])

  return (
    <canvas ref={ref} {...canvasProps}/>
  )
};
