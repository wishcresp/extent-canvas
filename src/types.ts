import {RefObject} from "react";

/**
 * The extent-canvas hook.
 * 
 * @param options The extent-canvas hook args.
 * @returns Functions for interacting with the canvas. 
 */
export type UseExtentCanvas = (args: ExtentCanvasArgs) => ExtentCanvasFunctions

/**
 * The arguments of the extent canvas hook.
 */
export interface ExtentCanvasArgs {
  /**
   * The canvas ref.
   */
  ref: RefObject<HTMLCanvasElement>;

  /**
   * The 2D context options.
   */
  options?: CanvasRenderingContext2DSettings

  /**
   * The initial position point of the canvas view.
   * 
   * @default origin {x: 0, y: 0}
   */
  initialPosition?: ExtentCanvasPoint;

  /**
   * The initial scale of the canvas.
   * 
   * @default initialScale 1
   */
  initialScale?: number;

  /**
   * The minimum scale of the canvas
   */
  minScale?: number;

  /**
   * The maximum scale of the canvas.
   */
  maxScale?: number;

  /**
   * The sensitivity of zooming.
   * 
   * @default zoomSensitivity 320
   */
  zoomSensitivity?: number;

  /**
   * Callback when the context is initialised.
   * 
   * @param context The canvas 2D context.
   */
  onContextInit?: (context: CanvasRenderingContext2D) => void;

  /**
   * Callback to prepare the canvas for a new draw. Is called before each draw,
   * after canvas transform reset and before scaling and translation.
   * 
   * @param context The canvas 2D context.
   */
  onBeforeDraw?: (context: CanvasRenderingContext2D) => void;

  /**
   * Callback to draw to the canvas.
   * 
   * @param context The canvas 2D context.
   */
  onDraw?: (context: CanvasRenderingContext2D) => void;

  /**
   * Callback when the canvas' view changes.
   * Alternative to {@link onViewBoxChange}.
   * 
   * @param view The current canvas view.
   * @param reason The reason for the view change.
   */
  onViewChange?: (view: ExtentCanvasView, reason: ExtentCanvasViewChangeReason) => void;

  /**
   * Callback when the canvas' view box changes.
   * Alternative to {@link onViewChange}.
   * 
   * @param view 
   * @param reason 
   */
  onViewBoxChange?: (viewBox: ExtentCanvasViewBox, reason: ExtentCanvasViewChangeReason) => void;
}

/**
 * Utility functions for interacting with the canvas.
 */
export interface ExtentCanvasFunctions {
  /**
   * Set the current view of the canvas.
   * Alternative to {@link setViewBox}.
   *
   * @param view The new view.
   */
  setView: (view: ExtentCanvasView) => void;

  /**
   * Set the current view box of the canvas.
   * Alternative to {@link setView}.
   * 
   * @param viewBox The new view box.
   */
  setViewBox: (viewBox: ExtentCanvasViewBox) => void;

  /**
   * Manually draw the canvas.
   */
  draw: () => void;
}

export interface ExtentCanvasSize {
  /**
   * The total width of the canvas.
   */
  width: number;

  /**
   * The total height of the canvas.
   */
  height: number;
}

export interface ExtentCanvasViewBox {
  /**
   * The top coordinate of the canvas extent.
   */
  top: number;

  /**
   * The bottom coordinate of the canvas extent.
   */
  bottom: number;

  /**
   * The left coordinate of the canvas extent.
   */
  left: number;

  /**
   * The right coordinate of the canvas extent.
   */
  right: number;
}

export interface ExtentCanvasPoint {
  /**
   * The x coordinate of a point on the canvas.
   */
  x: number;

  /**
   * The y coordinate of a point in the canvas.
   */
  y: number;
}

export interface ExtentCanvasView {
  /**
   * The offset coordinate of the current view of the canvas.
   */
  offset: ExtentCanvasPoint;

  /**
   * The current canvas scale. A value of 1 is unscaled.
   */
  scale: number;
}

/**
 * The reasons the view was changed.
 * 
 * move - The canvas was moved with the mouse/touch.
 * zoom - The canvas was zoomed in/out.
 * jump - The canvas view was set with {@link ExtentCanvasArgs.setView}.
 */
export type ExtentCanvasViewChangeReason = "move" | "zoom" | "set"

/**
 * A touch event.
 */
export interface ExtentCanvasTouch {
  clientX: number;
  clientY: number;
}