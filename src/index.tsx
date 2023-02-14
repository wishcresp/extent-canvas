import type {FC} from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import type {
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

export type {
  ExtentCanvasFunctions,
  ExtentCanvasPoint,
  ExtentCanvasProps,
  ExtentCanvasSize,
  ExtentCanvasTouch,
  ExtentCanvasView,
  ExtentCanvasViewBox,
  UseExtentCanvas,
  ExtentCanvasArgs,
  ExtentCanvasViewChangeReason
};

/**
 * Make a canvas an extent-canvas allowing it to be panned and zoomed.
 */
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
      width + (width / viewRef.current.scale),
      height + (height / viewRef.current.scale),
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

/**
 * A simple extent-canvas component.
 * 
 * Either {@link view} or {@link viewBox} can be used for controlled view state and should
 * be used with the appropriate {@link onViewChange} or {@link onViewBoxChange} callback.
 */
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

/**
 * Add two points.
 * 
 * @param p1 Point 1.
 * @param p2 Point 2.
 * @returns The sum of two points.
 */
export const add = (p1: ExtentCanvasPoint, p2: ExtentCanvasPoint): ExtentCanvasPoint => ({x: p1.x + p2.x, y: p1.y + p2.y});

/**
 * Get the difference between two points.
 * 
 * @param p1 Point 1.
 * @param p2 Point 2.
 * @returns The difference between the points.
 */
export const diff = (p1: ExtentCanvasPoint, p2: ExtentCanvasPoint): ExtentCanvasPoint => ({x: p1.x - p2.x, y: p1.y - p2.y});

/**
 * Scale a point.
 * 
 * @param p The point.
 * @param scale The amount to scale.
 * @returns The scaled point.
 */
export const scale = (p: ExtentCanvasPoint, scale: number): ExtentCanvasPoint => ({x: p.x / scale, y: p.y / scale});

/**
 * Get the mouse cursor offset relative to the canvas origin (top left).
 * 
 * @returns The offset point.
 */
export const getCursorOffset = (clientX: number, clientY: number, context: CanvasRenderingContext2D): ExtentCanvasPoint => {
  const {left, top}: DOMRect = context.canvas.getBoundingClientRect();
  return diff({x: clientX, y: clientY}, {x: left, y: top});
}

/**
 * Calculate the view box from the canvas size and canvas view.
 * 
 * @param size The size of the canvas.
 * @param view The canvas view.
 * @returns The view box.
 */
export const calculateViewBox = ({width, height}: ExtentCanvasSize, {offset: {x, y}, scale}: ExtentCanvasView): ExtentCanvasViewBox => ({
  top: Math.round(-y),
  bottom: Math.round(-y + (height / scale)),
  left: Math.round(-x),
  right: Math.round(-x + (width / scale)),
});

/**
 * Calculate the canvas view from the canvas size and bounding box.
 * 
 * @param size The size of the canvas.
 * @param box The view box.
 * @returns The canvas view.
 */
export const calculateCanvasView = ({width, height}: ExtentCanvasSize, {top, bottom, left, right}: ExtentCanvasViewBox): ExtentCanvasView => {
  const boxWidth: number = right - left;
  const boxHeight: number = bottom - top;
  
  const scale: number = Math.min(width / boxWidth, height / boxHeight);
  let x: number = -(left + (boxWidth / 2) - (width / (2 * scale)));
  let y: number = -(top + (boxHeight / 2) - (height / (2 * scale)));

  return {scale, offset: {x, y}};
}

/**
 * Calculate the real position on a canvas.
 * 
 * @param offset The canvas offset.
 * @param scale The canvas scale.
 * @param x The canvas x position.
 * @param y The canvas y position.
 */
export const calculateCanvasPosition = ({offset, scale}: ExtentCanvasView, x: number, y: number): ExtentCanvasPoint => ({
  x: Math.round((offset.x * -1) + (x / scale)),
  y: Math.round((offset.y * -1) + (y / scale)),
});

/**
 * Get the distance between two touches.
 * 
 * @param t1 The first touch.
 * @param t2 The second touch.
 * @returns The distance.
 */
export const getTouchDistance = (t1: ExtentCanvasTouch, t2: ExtentCanvasTouch): number => {
  return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2))
}

/**
 * Get the coordinates of a touch.
 * 
 * @param touches The touch list.
 * @returns The touch coordinates and the touches.
 */
export const getTouchCoordinates = (touches: TouchList): {x: number, y: number, t1: ExtentCanvasTouch, t2: ExtentCanvasTouch} => {
  const [t1 = {clientX: 0, clientY: 0}, t2 = {clientX: 0, clientY: 0}] = touches;
  const touchCount: 2 | 1 = touches.length === 2 ? 2 : 1;
  const x: number = (t1.clientX + t2.clientX) / touchCount;
  const y: number = (t1.clientY + t2.clientY) / touchCount;
  return {x, y, t1, t2};
}
