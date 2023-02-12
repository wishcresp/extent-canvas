import {FC, useCallback, useEffect, useRef, useState} from "react";
import {add, calculateCanvasView, calculateViewBox, diff, getCursorOffset, getTouchCoordinates, getTouchDistance, scale} from "./math";
import {ExtentCanvasFunctions, ExtentCanvasPoint, ExtentCanvasProps, ExtentCanvasView, UseExtentCanvas} from "./types";

export type {
  ExtentCanvasArgs,
  ExtentCanvasFunctions,
  ExtentCanvasPoint,
  ExtentCanvasProps,
  ExtentCanvasSize,
  ExtentCanvasTouch,
  ExtentCanvasView,
  ExtentCanvasViewBox,
  ExtentCanvasViewChangeReason,
  UseExtentCanvas
} from "./types";

export const useExtentCanvas: UseExtentCanvas = ({
  ref,
  options,
  onContextInit,
  onBeforeDraw,
  onDraw,
  onViewChange,
  onViewBoxChange,
  initialPosition = {x: 0, y: 0},
  initialScale = 1,
  zoomSensitivity = 320,
  minScale,
  maxScale, 
}) => {
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const posRef = useRef<ExtentCanvasPoint>(initialPosition);
  const prevPosRef = useRef<ExtentCanvasPoint>(initialPosition);
  const viewRef = useRef<ExtentCanvasView>({offset: initialPosition, scale: initialScale});

  const draw: ExtentCanvasFunctions["draw"] = useCallback(() => {
    if (context === null) {
      return;
    }

    const {width, height} = context.canvas;
    if (width === 0 || height === 0) {
      return;
    }

    context.resetTransform();

    onBeforeDraw?.(context);

    const {offset: {x, y}, scale} = viewRef.current;
    context.scale(scale, scale);
    context.translate(x, y);

    context.clearRect(
      -x - width,
      -y - height,
      width / viewRef.current.scale,
      height / viewRef.current.scale,
    );

    onDraw?.(context);
  }, [context, onBeforeDraw, onDraw]);

  const setView: ExtentCanvasFunctions["setView"] = useCallback((view) => {
    if (context === null) {
      return;
    }

    viewRef.current = view;
    onViewChange?.(viewRef.current, "set");
    onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "set");
    draw();
  }, [context, onViewChange, onViewBoxChange, draw]);

  const setViewBox: ExtentCanvasFunctions["setViewBox"] = useCallback((viewBox) => {
    if (context === null) {
      return;
    }

    viewRef.current = calculateCanvasView(context.canvas, viewBox)
    onViewChange?.(viewRef.current, "set");
    onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "set");
    draw();
  }, [context, onViewChange, onViewBoxChange, draw]);

  useEffect(() => {
    if (context === null) {
      return;
    }

    let isDragging: boolean = false;
    let prevPinchDistance: number = 0;

    const handleMouseDown = ({clientX, clientY}: MouseEvent) => {
      isDragging = true;
      posRef.current = getCursorOffset(clientX, clientY, context);
    }

    const handleMouseMove = ({clientX, clientY}: MouseEvent) => {
      if (!isDragging) {
        return;
      }

      prevPosRef.current = posRef.current;
      posRef.current = getCursorOffset(clientX, clientY, context);

      const newDiff: ExtentCanvasPoint = scale(diff(posRef.current, prevPosRef.current), viewRef.current.scale);
      viewRef.current.offset = add(viewRef.current.offset, newDiff);

      onViewChange?.(viewRef.current, "move");
      onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "move");
      draw();
    }

    const handleMouseUp = (): void => {
      isDragging = false;
    }

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();

      prevPosRef.current = posRef.current;
      posRef.current = getCursorOffset(event.clientX, event.clientY, context);

      const absDelta: number = 1 - (Math.abs(event.deltaY) / zoomSensitivity);
      const isPositive: boolean = event.deltaY > 0;
      const unclamedScale: number = isPositive ? viewRef.current.scale * absDelta : viewRef.current.scale / absDelta;

      const clampedScale: number = Math.max(Math.min(unclamedScale, maxScale ?? unclamedScale), minScale ?? unclamedScale);

      const newOffset = diff(
        viewRef.current.offset,
        diff(scale(posRef.current, viewRef.current.scale), scale(posRef.current, clampedScale))
      );

      viewRef.current.offset = newOffset;
      viewRef.current.scale = clampedScale;

      onViewChange?.(viewRef.current, "zoom");
      onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "zoom");
      draw();
    };

    const handleTouchStart = ({touches}: TouchEvent) => {
      const {x, y, t1, t2} = getTouchCoordinates(touches);

      posRef.current = getCursorOffset(x, y, context);
      prevPosRef.current = posRef.current;

      if (touches.length > 1) {
        prevPinchDistance = getTouchDistance(t1, t2);
      }
    }
    
    const handleTouchMove = ({touches}: TouchEvent) => {
      const {x, y, t1, t2} = getTouchCoordinates(touches);

      posRef.current = getCursorOffset(x, y, context);
      prevPosRef.current = posRef.current;

      const newDiff: ExtentCanvasPoint = scale(diff(posRef.current, prevPosRef.current), viewRef.current.scale);
      viewRef.current.offset = add(viewRef.current.offset, newDiff);

      let pinchRatio = 1;
      if (touches.length > 1) {
        const pinchDistance: number = getTouchDistance(t1, t2);
        pinchRatio = pinchDistance / prevPinchDistance;
        prevPinchDistance = pinchDistance;
      }
      
      const pinchedScale: number = viewRef.current.scale * pinchRatio;
      const newScale: number = Math.max(
        Math.min(viewRef.current.scale * pinchRatio, maxScale ?? pinchedScale),
        minScale ?? pinchedScale,
      );

      const newOffset: ExtentCanvasPoint = diff(
        viewRef.current.offset,
        diff(scale(posRef.current, viewRef.current.scale), scale(posRef.current, newScale))
      );

      viewRef.current.offset = newOffset;
      viewRef.current.scale = newScale;

      onViewChange?.(viewRef.current, "zoom");
      onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "zoom");
      draw();
    };

    context.canvas.addEventListener("mousedown", handleMouseDown);
    context.canvas.addEventListener("mousemove", handleMouseMove);
    context.canvas.addEventListener("mouseup", handleMouseUp);
    context.canvas.addEventListener("mouseleave", handleMouseUp);
    context.canvas.addEventListener("wheel", handleWheel);
    context.canvas.addEventListener("touchstart", handleTouchStart);
    context.canvas.addEventListener("touchmove", handleTouchMove);
    context.canvas.addEventListener("touchend", handleTouchStart);

    return () => {
      context.canvas.removeEventListener("mousedown", handleMouseDown);
      context.canvas.removeEventListener("mousemove", handleMouseMove);
      context.canvas.removeEventListener("mouseup", handleMouseUp)
      context.canvas.removeEventListener("mouseleave", handleMouseUp);
      context.canvas.removeEventListener("wheel", handleWheel);
      context.canvas.removeEventListener("touchstart", handleTouchStart);
      context.canvas.removeEventListener("touchmove", handleTouchMove);
      context.canvas.removeEventListener("touchend", handleTouchStart);
    }
  }, [context, onViewChange, onViewBoxChange, draw]);

  useEffect(() => {
    if (ref.current === null) {
      return;
    }

    setContext(ref.current.getContext("2d", options));
  }, [ref, options]);

   useEffect(() => {
    if (context === null) {
      return;
    }

    onContextInit?.(context);
    draw();
  }, [context, onContextInit, draw])

  return {setView, setViewBox, draw};
}

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

