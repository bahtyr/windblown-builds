"use client";

import {type MutableRefObject, useCallback, useEffect, useRef, useState} from "react";

export type TooltipCoordinateSpace = {
  leftOffset: number;
  topOffset: number;
};

type TooltipPlacementInput = {
  coordinateSpace: TooltipCoordinateSpace;
  gap: number;
  minTop: number;
  tooltipRect: DOMRect;
  triggerRect: DOMRect;
  viewportPadding: number;
};

type TooltipPlacement = {
  left: number;
  top: number;
};

type HoverTooltipState = {
  left: number;
  top: number;
};

type HoverTooltipOptions<T extends HTMLElement, U extends HTMLElement> = {
  triggerRef: MutableRefObject<T | null>;
  tooltipRef: MutableRefObject<U | null>;
};

/**
 * Collect scrollable ancestors that can move a tooltip trigger without moving the viewport.
 *
 * @param {HTMLElement | null} element - Trigger or tooltip element inside the layout.
 * @returns {(HTMLElement | Window)[]} Scroll event targets that should refresh tooltip placement.
 */
export function getTooltipScrollParents(element: HTMLElement | null): Array<HTMLElement | Window> {
  if (typeof window === "undefined") return [];

  const parents: Array<HTMLElement | Window> = [window];
  let current = element?.parentElement ?? null;

  while (current) {
    const {overflowY, overflow} = window.getComputedStyle(current);
    if (/(auto|scroll|overlay)/.test(`${overflowY} ${overflow}`)) {
      parents.push(current);
    }
    current = current.parentElement;
  }

  return parents;
}

/**
 * Compute the top viewport boundary that tooltips should avoid.
 *
 * @param {number} gap - Spacing between the tooltip and the blocking surface.
 * @param {number} viewportPadding - Minimum viewport inset.
 * @returns {number} Safe top coordinate in viewport space.
 */
export function getTooltipSafeTop(gap: number, viewportPadding: number): number {
  const blockers = [
    document.querySelector<HTMLElement>(".header"),
    document.querySelector<HTMLElement>(".filters-body"),
    document.querySelector<HTMLElement>(".decks-page-top"),
    document.querySelector<HTMLElement>(".deck-builder-surface"),
  ].filter((element): element is HTMLElement => Boolean(element));

  const blockerBottom = blockers.reduce((maxBottom, element) => {
    const rect = element.getBoundingClientRect();
    if (element.classList.contains("deck-builder-surface")) {
      return Math.max(maxBottom, rect.top);
    }
    return Math.max(maxBottom, rect.bottom);
  }, 0);

  return Math.max(viewportPadding, blockerBottom + gap);
}

/**
 * Resolve local tooltip offsets for surfaces that create their own fixed-position containing block.
 *
 * @param {HTMLElement | null} tooltipElement - Tooltip element being positioned.
 * @returns {TooltipCoordinateSpace} Coordinate offsets for the tooltip's containing block.
 */
export function getTooltipCoordinateSpace(tooltipElement: HTMLElement | null): TooltipCoordinateSpace {
  const deckBuilderSurface = tooltipElement?.closest<HTMLElement>(".deck-builder-surface");
  if (!deckBuilderSurface) {
    return {leftOffset: 0, topOffset: 0};
  }

  const rect = deckBuilderSurface.getBoundingClientRect();
  return {
    leftOffset: rect.left - deckBuilderSurface.scrollLeft,
    topOffset: rect.top - deckBuilderSurface.scrollTop,
  };
}

/**
 * Compute the tooltip placement relative to a trigger using shared overlap and edge rules.
 *
 * @param {TooltipPlacementInput} input - Trigger and tooltip geometry plus placement bounds.
 * @returns {TooltipPlacement} Tooltip position in the tooltip's containing coordinate space.
 */
export function getTooltipPlacement(input: TooltipPlacementInput): TooltipPlacement {
  const {
    coordinateSpace,
    gap,
    minTop,
    tooltipRect,
    triggerRect,
    viewportPadding,
  } = input;
  const rightAlignedLeft = triggerRect.right + gap;
  const leftAlignedLeft = triggerRect.left - tooltipRect.width - gap;
  const canPlaceRight = rightAlignedLeft + tooltipRect.width <= window.innerWidth - viewportPadding;
  const canPlaceLeft = leftAlignedLeft >= viewportPadding;
  const hasSidePlacement = canPlaceRight || canPlaceLeft;
  const aboveTop = triggerRect.top - tooltipRect.height - gap;
  const belowTop = triggerRect.bottom + gap;
  const maxTop = Math.max(minTop, window.innerHeight - tooltipRect.height - viewportPadding);
  const moreRoomOnRight =
    (window.innerWidth - viewportPadding) - triggerRect.left >= triggerRect.right - viewportPadding;

  let left = 0;
  let top = 0;

  if (hasSidePlacement) {
    left = canPlaceRight ? rightAlignedLeft : leftAlignedLeft;
    top = clamp(triggerRect.top, minTop, maxTop);
  } else {
    const primaryTop = aboveTop >= minTop ? aboveTop : belowTop;
    const secondaryTop = primaryTop === aboveTop ? belowTop : aboveTop;
    const primaryFits =
      primaryTop === aboveTop
        ? aboveTop >= minTop
        : belowTop + tooltipRect.height <= window.innerHeight - viewportPadding;
    const secondaryFits = secondaryTop === belowTop ? belowTop <= maxTop : aboveTop >= minTop;

    left = getHoverAnchorLeft(
      triggerRect,
      tooltipRect.width,
      viewportPadding,
      primaryFits ? moreRoomOnRight : !moreRoomOnRight,
    );
    top = primaryFits || !secondaryFits ? primaryTop : secondaryTop;

    left = Math.floor(left);
    top = Math.floor(clamp(top, minTop, maxTop));

    if (rectsIntersect(left, top, tooltipRect.width, tooltipRect.height, triggerRect)) {
      top = Math.floor(clamp(secondaryTop, minTop, maxTop));
    }
  }

  return {
    left: Math.floor(left - coordinateSpace.leftOffset),
    top: Math.floor(clamp(top, minTop, maxTop) - coordinateSpace.topOffset),
  };
}

/**
 * Shares tooltip open/close lifecycle and placement refresh for hover-driven surfaces.
 *
 * @param {HoverTooltipOptions<T, U>} options - Trigger and tooltip refs used for placement.
 * @returns {{
 *   isOpen: boolean;
 *   position: HoverTooltipState | null;
 *   openTooltip: (element?: T | null) => void;
 *   closeTooltip: () => void;
 *   updateTooltipPosition: () => void;
 * }} Tooltip state and lifecycle helpers.
 */
export function useHoverTooltip<T extends HTMLElement, U extends HTMLElement>({
  triggerRef,
  tooltipRef,
}: HoverTooltipOptions<T, U>) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<HoverTooltipState | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateTooltipPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const triggerElement = triggerRef.current;
    const tooltipElement = tooltipRef.current;
    if (!triggerElement || !tooltipElement) return;

    const viewportPadding = 12;
    const gap = 8;
    const minTop = getTooltipSafeTop(gap, viewportPadding);
    const triggerRect = triggerElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const coordinateSpace = getTooltipCoordinateSpace(tooltipElement);
    setPosition(getTooltipPlacement({
      coordinateSpace,
      gap,
      minTop,
      tooltipRect,
      triggerRect,
      viewportPadding,
    }));
  }, [tooltipRef, triggerRef]);

  const closeTooltip = useCallback(() => {
    if (typeof window !== "undefined" && frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setIsOpen(false);
    setPosition(null);
  }, []);

  const openTooltip = useCallback((element?: T | null) => {
    if (element) {
      triggerRef.current = element;
    }

    setIsOpen(true);

    if (typeof window === "undefined") return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      updateTooltipPosition();
      frameRef.current = null;
    });
  }, [triggerRef, updateTooltipPosition]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const triggerElement = triggerRef.current;
    const tooltipElement = tooltipRef.current;
    if (!triggerElement || !tooltipElement) return;

    const observer = new ResizeObserver(() => {
      updateTooltipPosition();
    });
    observer.observe(tooltipElement);

    const handleViewportChange = () => updateTooltipPosition();
    const scrollParents = getTooltipScrollParents(triggerElement);
    window.addEventListener("resize", handleViewportChange);
    scrollParents.forEach((parent) => parent.addEventListener("scroll", handleViewportChange, {passive: true}));

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      scrollParents.forEach((parent) => parent.removeEventListener("scroll", handleViewportChange));
    };
  }, [isOpen, tooltipRef, triggerRef, updateTooltipPosition]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  return {
    isOpen,
    position,
    openTooltip,
    closeTooltip,
    updateTooltipPosition,
  };
}

function getHoverAnchorLeft(
  triggerRect: DOMRect,
  tooltipWidth: number,
  viewportPadding: number,
  preferRightEdge: boolean,
): number {
  const minLeft = viewportPadding;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);
  const leftAligned = triggerRect.left;
  const rightAligned = triggerRect.right - tooltipWidth;

  const preferred = preferRightEdge ? rightAligned : leftAligned;
  const fallback = preferRightEdge ? leftAligned : rightAligned;

  if (preferred >= minLeft && preferred <= maxLeft) return preferred;
  if (fallback >= minLeft && fallback <= maxLeft) return fallback;
  return clamp(preferred, minLeft, maxLeft);
}

function rectsIntersect(
  left: number,
  top: number,
  width: number,
  height: number,
  triggerRect: DOMRect,
): boolean {
  const right = left + width;
  const bottom = top + height;

  return !(
    right <= triggerRect.left ||
    left >= triggerRect.right ||
    bottom <= triggerRect.top ||
    top >= triggerRect.bottom
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
