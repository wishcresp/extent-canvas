import {ExtentCanvasPoint, ExtentCanvasSize, ExtentCanvasTouch, ExtentCanvasView, ExtentCanvasViewBox} from "./types";

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
