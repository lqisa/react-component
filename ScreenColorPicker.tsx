import * as React from 'react';
import classnames from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './style/canvas-color-picker.less';
import { debounce } from 'lodash';

export enum CanvasColorPickerPosition {
  topRight = 'top-right',
  topLeft = 'top-left',
  leftBottom = 'left-bottom',
  rightBottom = 'right-bottom',
}

export interface CanvasColorPickerProps {
  visible: boolean;
  // 待取色 canvas
  toMeasureCanvas: HTMLCanvasElement | null;
  // 放大镜宽高
  magnifierSquareLength?: number;
  // 放大倍率
  magnifierScaleRatio?: number;
  // 放大镜网格线颜色
  magnifierLineColor?: string;
  // 放大镜网格中间高亮方格颜色
  magnifierSquareLineColor?: string;
  handlePickColor?: (color: number[]) => void;
  // 退出取色 keyCode
  exitKeyCode?: string;
  // 显示实时色彩
  displayColorInfo?: boolean;
  debounceTime?: number;
  // 放大镜跟随光标移动
  magnifierFollowMouse?: boolean;
  // 取色后自动关闭
  closeAfterPickColor?: boolean;
  // 取色器可见变更回调
  handleVisibleChange?: (visible: boolean) => void;
  // 取色器在光标进入目标 canvas 区域内可见
  onlyVisibleAfterMouseEnter?: boolean;
  // 固定位置
  fixedPosition?: CanvasColorPickerPosition;
}

const prefixCls = 'dmc-canvas-color-picker';
const cursorCls = `${prefixCls}-cursor`;
const otherProps = {};

const CanvasColorPicker = (props: CanvasColorPickerProps) => {
  const {
    visible = false,
    toMeasureCanvas,
    magnifierSquareLength = 200,
    magnifierScaleRatio = 100,
    handlePickColor,
    magnifierLineColor = '#4A5472',
    magnifierSquareLineColor = '#fff',
    exitKeyCode = 'Escape',
    displayColorInfo = true,
    magnifierFollowMouse = false,
    debounceTime = 200,
    closeAfterPickColor = true,
    handleVisibleChange,
    onlyVisibleAfterMouseEnter: _onlyVisibleAfterMouseEnter,
    fixedPosition = CanvasColorPickerPosition.topRight,
  } = props;
  const onlyVisibleAfterMouseEnter = magnifierFollowMouse ? true : _onlyVisibleAfterMouseEnter;
  const [_visible, setVisible] = useState(visible);
  const magnifierRef = useRef<HTMLCanvasElement | null>(null);
  const [clientX, setClientX] = useState(0);
  const [clientY, setClientY] = useState(0);
  // 计算后的光标距离 canvas 元素左边界和上边界的像素值
  const offsetLeftRef = useRef<number>(0);
  const offsetTopRef = useRef<number>(0);
  const [curColor, setCurColor] = useState<string>('');
  const mouseAxisDataRef = useRef<string>('');
  const mouseEnterCanvasRef = useRef(false);
  const prevVisibleRef = useRef(_visible);

  const otherWrapProps = useMemo(() => {
    if (magnifierFollowMouse) {
      return {
        style: { transform: `translate(${clientX}px, ${clientY}px)` },
      };
    } else {
      return otherProps;
    }
  }, [clientX, clientY, magnifierFollowMouse]);

  const drawLine = useCallback(
    (
      ctx: CanvasRenderingContext2D | null,
      step: number,
      width = magnifierSquareLength,
      height = magnifierSquareLength,
    ) => {
      if (ctx) {
        // draw magnifier line
        ctx.beginPath();
        ctx.strokeStyle = magnifierLineColor;
        ctx.lineWidth = 1;
        const initRatio = magnifierScaleRatio % 2 === 0 ? 0.5 : 1;
        for (let x = initRatio * step; x <= magnifierSquareLength; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = initRatio * step; y <= magnifierSquareLength; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // draw center highlight square
        ctx.beginPath();
        ctx.strokeStyle = magnifierSquareLineColor;
        const unitSquareCnt = magnifierSquareLength / step;
        const centerSquareStartX = ((unitSquareCnt - 1) / 2) * step;
        const centerSquareStartY = ((unitSquareCnt - 1) / 2) * step;
        ctx.moveTo(centerSquareStartX, centerSquareStartY);
        ctx.lineTo(centerSquareStartX + step, centerSquareStartY);
        ctx.lineTo(centerSquareStartX + step, centerSquareStartY + step);
        ctx.lineTo(centerSquareStartX, centerSquareStartY + step);
        ctx.lineTo(centerSquareStartX, centerSquareStartY);
        ctx.stroke();
        ctx.closePath();
      }
    },
    [magnifierSquareLength, magnifierLineColor, magnifierScaleRatio, magnifierSquareLineColor],
  );

  const styleWidth = toMeasureCanvas?.style?.width;
  const styleHeight = toMeasureCanvas?.style?.height;

  const getColor = useCallback(() => {
    const canvasCtx = toMeasureCanvas?.getContext('2d');
    if (canvasCtx) {
      const colors = Array.from(
        canvasCtx.getImageData(offsetLeftRef.current, offsetTopRef.current, 1, 1)
          .data as Uint8ClampedArray,
      );
      setCurColor(`rgba(${colors[0]},${colors[1]},${colors[2]},${colors[3] / 255})`);
    }
  }, [toMeasureCanvas]);

  const debouncedGetColor = useCallback(debounce(getColor, debounceTime), [getColor]);

  // canvas 元素距离根元素左边界和上边界的像素值
  const toMeasureCanvasOffsetData = useMemo(() => {
    if (toMeasureCanvas) {
      // maptalks canvas 存在行内样式 width height 且 可能与 canvas 宽高不一致
      let widthRatio = 1;
      let heightRatio = 1;

      const { width, height } = toMeasureCanvas;
      if (width && styleWidth) {
        widthRatio = width / Number.parseInt(styleWidth.replace('px', ''), 10);
      }
      if (height && styleHeight) {
        heightRatio = height / Number.parseInt(styleHeight.replace('px', ''), 10);
      }

      let offsetLeft = toMeasureCanvas.offsetLeft;
      let offsetTop = toMeasureCanvas.offsetTop;
      let parentEl: HTMLElement | null = toMeasureCanvas.offsetParent as HTMLElement;
      while (parentEl) {
        offsetLeft += parentEl.offsetLeft;
        offsetTop += parentEl.offsetTop;
        parentEl = parentEl.offsetParent as HTMLElement | null;
      }
      return [offsetLeft, offsetTop, widthRatio, heightRatio];
    }
    return [0, 0, 1, 1];
    // map canvas 宽高变更 需要重新计算以上值
  }, [toMeasureCanvas, styleWidth, styleHeight]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (visible) {
        const [offsetLeft, offsetTop, widthRatio, heightRatio] = toMeasureCanvasOffsetData;
        const [_offsetLeft, _offsetTop] = [e.pageX - offsetLeft, e.pageY - offsetTop];

        offsetLeftRef.current = _offsetLeft * widthRatio;
        offsetTopRef.current = _offsetTop * heightRatio;
        if (magnifierFollowMouse) {
          setClientX(e.clientX);
          setClientY(e.clientY);
        }

        if (magnifierRef.current && toMeasureCanvas) {
          const magnifierCtx = magnifierRef.current.getContext('2d');
          const canvasCtx = toMeasureCanvas?.getContext('2d');
          if (canvasCtx && toMeasureCanvas && magnifierCtx) {
            magnifierCtx.drawImage(
              toMeasureCanvas,
              (_offsetLeft - magnifierSquareLength / 2 / Math.sqrt(magnifierScaleRatio)) *
                widthRatio,
              (_offsetTop - magnifierSquareLength / 2 / Math.sqrt(magnifierScaleRatio)) *
                heightRatio,
              (magnifierSquareLength / Math.sqrt(magnifierScaleRatio)) * widthRatio,
              (magnifierSquareLength / Math.sqrt(magnifierScaleRatio)) * heightRatio,
              0,
              0,
              magnifierSquareLength,
              magnifierSquareLength,
            );
            drawLine(magnifierCtx, Math.sqrt(magnifierScaleRatio));
            // console.log(
            //   (_offsetLeft - magnifierSquareLength / 2 / Math.sqrt(magnifierScaleRatio)) *
            //     widthRatio,
            //   (_offsetTop - magnifierSquareLength / 2 / Math.sqrt(magnifierScaleRatio)) *
            //     heightRatio,
            // );
            if (displayColorInfo) {
              if (magnifierFollowMouse) {
                debouncedGetColor();
              } else {
                getColor();
              }
            }
          }
        }
      }
    },
    [
      visible,
      toMeasureCanvasOffsetData,
      toMeasureCanvas,
      magnifierSquareLength,
      magnifierScaleRatio,
      drawLine,
      displayColorInfo,
      magnifierFollowMouse,
      debouncedGetColor,
      getColor,
    ],
  );

  const handleMouseEnter = useCallback(() => {
    mouseEnterCanvasRef.current = true;
    if (visible && toMeasureCanvas) {
      if (onlyVisibleAfterMouseEnter) {
        setVisible(true);
      }
      toMeasureCanvas.classList.add(cursorCls);
    }
  }, [visible, toMeasureCanvas, onlyVisibleAfterMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    mouseEnterCanvasRef.current = false;
    if (toMeasureCanvas) {
      if (onlyVisibleAfterMouseEnter) {
        setVisible(false);
      }
      toMeasureCanvas.classList.remove(cursorCls);
    }
  }, [onlyVisibleAfterMouseEnter, toMeasureCanvas]);

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (exitKeyCode && e.key === exitKeyCode) {
        setVisible(false);
      }
    },
    [exitKeyCode],
  );

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // 缓存点击坐标 防止拖拽地图时取色
    mouseAxisDataRef.current = `${e.pageX},${e.pageY}`;
  }, []);

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const curMouseAxisData = `${e.pageX},${e.pageY}`;
      if (toMeasureCanvas && mouseAxisDataRef.current === curMouseAxisData) {
        const ctx = toMeasureCanvas.getContext('2d');
        if (ctx) {
          const color = Array.from(
            ctx.getImageData(offsetLeftRef.current, offsetTopRef.current, 1, 1)
              .data as Uint8ClampedArray,
          );
          color[3] = color[3] / 255;
          handlePickColor?.(color);
          // const [r, g, b, a] = color;
          // console.log('rgba:', r, g, b, a);
          if (closeAfterPickColor) {
            setVisible(false);
          }
        }
      }
    },
    [closeAfterPickColor, handlePickColor, toMeasureCanvas],
  );

  useEffect(() => {
    if (toMeasureCanvas) {
      toMeasureCanvas.addEventListener('mouseenter', handleMouseEnter);
      toMeasureCanvas.addEventListener('mouseleave', handleMouseLeave);
      toMeasureCanvas.addEventListener('mousemove', handleMouseMove);
      toMeasureCanvas.addEventListener('mousedown', handleMouseDown);
      toMeasureCanvas.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      if (toMeasureCanvas) {
        toMeasureCanvas?.removeEventListener('mouseenter', handleMouseEnter);
        toMeasureCanvas?.removeEventListener('mouseleave', handleMouseLeave);
        toMeasureCanvas?.removeEventListener('mousemove', handleMouseMove);
        toMeasureCanvas?.removeEventListener('mousedown', handleMouseDown);
        toMeasureCanvas?.removeEventListener('mouseup', handleMouseUp);
        toMeasureCanvas.classList.remove(cursorCls);
      }
    };
  }, [
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    onlyVisibleAfterMouseEnter,
    toMeasureCanvas,
  ]);

  useEffect(() => {
    // 开启光标进入取色器可见后，外部状态不实时变更内部，而是在具体事件调用后赋值
    if (!onlyVisibleAfterMouseEnter) {
      setVisible(visible);
      const magnifierCtx = magnifierRef.current?.getContext('2d') || null;
      drawLine(magnifierCtx, Math.sqrt(magnifierScaleRatio));
    }
  }, [drawLine, magnifierScaleRatio, onlyVisibleAfterMouseEnter, visible]);

  useEffect(() => {
    if (prevVisibleRef.current !== _visible) {
      prevVisibleRef.current = _visible;
      // 开启光标进入取色器可见后，光标移出状态不反馈到外部
      if (!(!mouseEnterCanvasRef.current && onlyVisibleAfterMouseEnter && !_visible)) {
        handleVisibleChange?.(_visible);
      }
      if (!_visible) {
        toMeasureCanvas?.classList.remove(cursorCls);
      }
    }
  }, [handleVisibleChange, _visible, toMeasureCanvas, onlyVisibleAfterMouseEnter]);

  useEffect(() => {
    if (exitKeyCode) {
      document.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [exitKeyCode, handleKeyUp]);

  return (
    <div
      className={classnames(prefixCls, {
        [`${prefixCls}-visible`]: _visible && toMeasureCanvas,
        [`${prefixCls}-${fixedPosition}`]: fixedPosition && !magnifierFollowMouse,
      })}
      {...otherWrapProps}
    >
      <div className={`${prefixCls}-wrapper`}>
        <canvas
          ref={magnifierRef}
          width={magnifierSquareLength}
          height={magnifierSquareLength}
          className={`${prefixCls}-magnifier`}
        >
          Your browser do not support canvas
        </canvas>
        {displayColorInfo && curColor && (
          <div className={`${prefixCls}-color-hint`}>{curColor.toUpperCase()}</div>
        )}
      </div>
    </div>
  );
};

CanvasColorPicker.whyDidYouRender = true;
CanvasColorPicker.displayName = 'CanvasColorPicker';

export default CanvasColorPicker;
