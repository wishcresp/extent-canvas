import {useCallback, useEffect, useRef, useState} from "react";
import {add, calculateCanvasView, calculateViewBox, diff, getCursorOffset, getTouchCoordinates, getTouchDistance, scale} from "./math";
import {ExtentCanvasFunctions, ExtentCanvasPoint, ExtentCanvasView, UseExtentCanvas} from "./types";

/**
 * Give a canvas an extent that can be panned and zoomed.
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

  /**
   * Callback to draw the canvas.
   */
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

  /**
   * Callback to set the canvas view.
   */
  const setView: ExtentCanvasFunctions["setView"] = useCallback((view) => {
    if (context === null) {
      return;
    }

    viewRef.current = view;
    onViewChange?.(viewRef.current, "set");
    onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "set");
    draw();
  }, [context, onViewChange, onViewBoxChange, draw]);

  /**
   * Callback to set the canvas view box.
   */
  const setViewBox: ExtentCanvasFunctions["setViewBox"] = useCallback((viewBox) => {
    if (context === null) {
      return;
    }

    viewRef.current = calculateCanvasView(context.canvas, viewBox)
    onViewChange?.(viewRef.current, "set");
    onViewBoxChange?.(calculateViewBox(context.canvas, viewRef.current), "set");
    draw();
  }, [context, onViewChange, onViewBoxChange, draw]);

  /**
   * Attach draw context listeners.
   */
  useEffect(() => {
    if (context === null) {
      return;
    }

    let isDragging: boolean = false;
    let prevPinchDistance: number = 0;

    /**
     * Handle mouse down on the canvas.
     */
    const handleMouseDown = ({clientX, clientY}: MouseEvent) => {
      isDragging = true;
      posRef.current = getCursorOffset(clientX, clientY, context);
    }

    /**
     * Handle panning on mouse move on the canvas.
     */
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

    /**
     * Handle mouse up on the canvas.
     */
    const handleMouseUp = (): void => {
      isDragging = false;
    }

    /**
     * Handle zooming with scroll wheel events.
     */
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

    /**
     * Handle getting the starting position of a touch event.
     * 
     * @param touches The touch list. 
     */
    const handleTouchStart = ({touches}: TouchEvent) => {
      const {x, y, t1, t2} = getTouchCoordinates(touches);

      posRef.current = getCursorOffset(x, y, context);
      prevPosRef.current = posRef.current;

      if (touches.length > 1) {
        prevPinchDistance = getTouchDistance(t1, t2);
      }
    }
    
    /**
     * Handles touch move and Pinch-to-Zoom.
     * 
     * @param touches The touch list. 
     */
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

  /**
   * Get the canvas 2d context.
   */
  useEffect(() => {
    if (ref.current === null) {
      return;
    }

    setContext(ref.current.getContext("2d", options));
  }, [ref, options]);

  /**
   * Init the context and draw.
   */
   useEffect(() => {
    if (context === null) {
      return;
    }

    onContextInit?.(context);
    draw();
  }, [context, onContextInit, draw])

  return {setView, setViewBox, draw};
}
