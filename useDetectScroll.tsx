import { useCallback, useEffect, useRef, useState } from 'react';

const debug = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
const log = debug ? window.console.log : (args: unknown[]) => {};

interface UseDetectScrollParams {
  enable?: boolean;
  // 节流
  throttleDuration?: number;
  // 滚动截止定时器延时（由于节流精度问题 须大于上述节流具体时间）
  scrollEndTimeout?: number;
  // 滚动容器
  scrollContainer: HTMLElement | null;
  /**
   * 由于主线程忙碌会导致 throttle 函数 （raf）时间运行时超过预设（throttleDuration）时间
   * （具体距离上一次触发 handleScroll 的时间可开启 debug 查看 trigger time）
   * 我们通过非实时更新（节流）的滚动位置与当前滚动位置比较即可减少 scrollEnd 的误判
   */
  optimizationScrollEndDetect?: boolean;
  /**
   * 滚动精度
   */
  precision?: number;
}

function throttle(fn: Function, time: number) {
  let isProcessing = false;
  let curCnt = 0;
  const totalCnt = Math.ceil(time / 16.6);
  return function (...args: unknown[]) {
    if (!isProcessing) {
      isProcessing = true;
      requestAnimationFrame(() => {
        curCnt++;
        if (curCnt === totalCnt) {
          fn(...args);
          curCnt = 0;
        }
        isProcessing = false;
      });
    }
  };
}

const useDetectScroll = ({
  throttleDuration = 50,
  scrollEndTimeout = 120,
  enable = true,
  scrollContainer,
  precision = 5,
  optimizationScrollEndDetect = false,
}: UseDetectScrollParams) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  // 节流函数内的滚动位置
  const tmpPrevScrollPosRef = useRef(0);
  const prevScrollPosRef = useRef(0);
  const prevScrollTime = useRef<number | null>(null);
  const timeIdRef = useRef<NodeJS.Timeout>();

  const triggerScrollEnd = useCallback(() => {
    setIsScrolling(false);
    log('scroll end');
  }, []);

  const detectScroll = useCallback(() => {
    if (timeIdRef.current) {
      clearTimeout(timeIdRef.current);
      log('clear');
    }
    timeIdRef.current = setTimeout(() => {
      if (optimizationScrollEndDetect) {
        const { scrollTop } = scrollContainer || {};
        if (
          scrollTop !== undefined &&
          Math.round(scrollTop - tmpPrevScrollPosRef.current) < precision
        ) {
          triggerScrollEnd();
        }
      } else {
        triggerScrollEnd();
      }
    }, scrollEndTimeout);
  }, [optimizationScrollEndDetect, precision, scrollContainer, scrollEndTimeout, triggerScrollEnd]);

  const _throttledHandleScroll = useCallback(
    throttle((now: number, scrollTop: number) => {
      if (!isScrolling) {
        log('scroll start');
      }
      log('trigger time: ', now - (prevScrollTime.current || 0));
      // 滚动位置在节流函数内，因此滚动位置并不能反映实际位置
      tmpPrevScrollPosRef.current = scrollTop;
      setIsScrolling(true);
      detectScroll();
    }, throttleDuration),
    [detectScroll, throttleDuration, isScrolling],
  );

  const throttledHandleScroll = useCallback(
    (e: MouseEvent) => {
      const now = +new Date();
      const { scrollTop } = e.target as HTMLDivElement;
      _throttledHandleScroll(now, scrollTop);
      // 实时性 速度检测在节流函数之外
      if (isScrolling && prevScrollTime.current) {
        const speed = (scrollTop - prevScrollPosRef.current) / (now - prevScrollTime.current);
        log('speed: ', speed);
        setScrollSpeed(speed);
      }
      prevScrollTime.current = now;
      prevScrollPosRef.current = scrollTop;
    },
    [_throttledHandleScroll, isScrolling],
  );

  const handleScroll = useCallback((e) => throttledHandleScroll(e), [throttledHandleScroll]);

  useEffect(() => {
    if (scrollContainer && enable) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (scrollContainer && enable) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [enable, handleScroll, scrollContainer]);

  return {
    isScrolling,
    scrollSpeed,
  };
};

export default useDetectScroll;
