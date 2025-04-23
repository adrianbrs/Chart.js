import defaults from '../core/core.defaults.js';
import Element from '../core/core.element.js';
import layouts from '../core/core.layouts.js';
import {addRoundedRectPath, drawPointLegend, renderText} from '../helpers/helpers.canvas.js';
import {
  _isBetween,
  callback as call,
  clipArea,
  getRtlAdapter,
  overrideTextDirection,
  restoreTextDirection,
  toFont,
  toPadding,
  unclipArea,
  valueOrDefault,
} from '../helpers/index.js';
import {_alignStartEnd, _textX, _toLeftRightCenter} from '../helpers/helpers.extras.js';
import {toTRBLCorners} from '../helpers/helpers.options.js';

/**
 * @typedef { import('../types/index.js').ChartEvent } ChartEvent
 */

const getBoxSize = (labelOpts, fontSize) => {
  let {boxHeight = fontSize, boxWidth = fontSize} = labelOpts;

  if (labelOpts.usePointStyle) {
    boxHeight = Math.min(boxHeight, fontSize);
    boxWidth = labelOpts.pointStyleWidth || Math.min(boxWidth, fontSize);
  }

  return {
    boxWidth,
    boxHeight,
    itemHeight: Math.max(fontSize, boxHeight)
  };
};

const itemsEqual = (a, b) => a !== null && b !== null && a.datasetIndex === b.datasetIndex && a.index === b.index;

export class Legend extends Element {

  /**
	 * @param {{ ctx: any; options: any; chart: any; }} config
	 */
  constructor(config) {
    super();

    this._added = false;

    // Contains hit boxes for each dataset (in dataset order)
    this.legendHitBoxes = [];

    /**
 		 * @private
 		 */
    this._hoveredItem = null;

    // Are we in doughnut mode which has a different data type
    this.doughnutMode = false;

    this.chart = config.chart;
    this.options = config.options;
    this.ctx = config.ctx;
    this.legendItems = undefined;
    this.maxHeight = undefined;
    this.maxWidth = undefined;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.height = undefined;
    this.width = undefined;
    this._margins = undefined;
    this.position = undefined;
    this.weight = undefined;
    this.fullSize = undefined;
    this._groups = undefined;
  }

  update(maxWidth, maxHeight, margins) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this._margins = margins;

    this.setDimensions();
    this.buildLabels();
    this.fit();
  }

  setDimensions() {
    if (this.isHorizontal()) {
      this.width = this.maxWidth;
      this.left = this._margins.left;
      this.right = this.width;
    } else {
      this.height = this.maxHeight;
      this.top = this._margins.top;
      this.bottom = this.height;
    }
  }

  buildLabels() {
    const labelOpts = this.options.labels || {};
    let legendItems = call(labelOpts.generateLabels, [this.chart], this) || [];

    if (labelOpts.filter) {
      legendItems = legendItems.filter((item) => labelOpts.filter(item, this.chart.data));
    }

    if (labelOpts.sort) {
      legendItems = legendItems.sort((a, b) => labelOpts.sort(a, b, this.chart.data));
    }

    if (this.options.reverse) {
      legendItems.reverse();
    }

    this.legendItems = legendItems;
  }

  fit() {
    const {options, ctx} = this;

    // The legend may not be displayed for a variety of reasons including
    // the fact that the defaults got set to `false`.
    // When the legend is not displayed, there are no guarantees that the options
    // are correctly formatted so we need to bail out as early as possible.
    if (!options.display) {
      this.width = this.height = 0;
      return;
    }

    const labelFont = toFont(options.labels.font);
    const {boxWidth, itemHeight} = getBoxSize(options.labels, labelFont.size);
    const isHorizontal = this.isHorizontal();
    const titleHeight = this._computeTitleHeight();
    // #11805 respect max width and height in both horizontal and vertical legends
    const maxHeight = options.maxHeight || this.maxHeight;
    const maxWidth = options.maxWidth || this.maxWidth;

    let width, height;

    ctx.font = labelFont.string;

    if (isHorizontal) {
      width = maxWidth; // fill all the available width
      height = this._fitGroups(labelFont, boxWidth, itemHeight, maxWidth, titleHeight);
    } else {
      height = maxHeight; // fill all the available height

      const maxLegendsHeight = maxHeight - titleHeight;
      width = this._fitGroups(labelFont, boxWidth, itemHeight, maxLegendsHeight);

      // #11850 make sure the title can fit
      width = Math.max(width, this._computeTitleWidth());
    }

    this.width = Math.min(width, maxWidth);
    this.height = Math.min(height, maxHeight);
  }

  /**
	 * @private
	 */
  _fitGroups(labelFont, boxWidth, _itemHeight, maxSize, initialOffset = 0) {
    const {ctx, legendItems, options: {labels: {padding}}} = this;
    const hitboxes = this.legendHitBoxes = [];
    const groups = this._groups = [];
    const isHorizontal = this.isHorizontal();

    let start = 0;
    let offset = initialOffset;
    // max height of each row when horizontal, max width of each column when vertical
    let currentRowHeight = 0;
    // total row width when horizontal, total col height when vertical
    let currentRowSize = 0;

    legendItems.forEach((legendItem, i) => {
      // #11824 always measure item height to account for multiline legend items
      const {itemWidth, itemHeight} = calculateItemSize(boxWidth, labelFont, ctx, legendItem, _itemHeight);
      const itemRowHeight = isHorizontal ? itemHeight : itemWidth;
      const itemRowSize = isHorizontal ? itemWidth : itemHeight;

      if (i > 0 && currentRowSize + itemRowSize + 2 * padding > maxSize) {
        groups.push({index: groups.length, start, end: i, rowSize: currentRowSize, rowHeight: currentRowHeight}); // previous block
        offset += currentRowHeight + padding;
        start = i;
        currentRowSize = currentRowHeight = 0;
      }

      const left = (isHorizontal ? currentRowSize : offset) + padding;
      const top = (isHorizontal ? offset : currentRowSize) + padding;
      hitboxes[i] = {left, top, groupIndex: groups.length, width: itemWidth, height: itemHeight};

      currentRowHeight = Math.max(currentRowHeight, itemRowHeight);
      currentRowSize += itemRowSize + padding;
    });

    offset += currentRowHeight + 2 * padding;
    groups.push({index: groups.length, start, end: legendItems.length, rowSize: currentRowSize, rowHeight: currentRowHeight}); // previous block

    return offset;
  }

  adjustHitBoxes() {
    if (!this.options.display) {
      return;
    }
    const {legendHitBoxes: hitboxes, options: {align, labels: labelOpts, rtl}} = this;
    const rtlHelper = getRtlAdapter(rtl, this.left, this.width);
    let group, start;

    if (this.isHorizontal()) {
      hitboxes.forEach((hitbox) => {
        if (!group || hitbox.groupIndex !== group.index) {
          group = this._groups[hitbox.groupIndex];
          start = _alignStartEnd(align, this.left + labelOpts.padding, this.right - group.rowSize);
        }
        hitbox.top += this.top;
        hitbox.left = rtlHelper.leftForLtr(rtlHelper.x(start), hitbox.width);
        start += hitbox.width + labelOpts.padding;
      });
    } else {
      hitboxes.forEach((hitbox, i) => {
        const legendItem = this.legendItems[i];
        const textAlign = legendItem.textAlign || (legendItem.textAlign = labelOpts.textAlign);

        if (!group || hitbox.groupIndex !== group.index) {
          group = this._groups[hitbox.groupIndex];
          start = _alignStartEnd(align, this.top + this._computeTitleHeight() + labelOpts.padding, this.bottom - group.rowSize);
        }

        // #12067 keep all the hitboxes in the same column with the same width
        // so we can align the label text properly
        if (textAlign && textAlign !== 'left') {
          hitbox.width = group.rowHeight;
        }

        hitbox.top = start;
        hitbox.left = rtlHelper.leftForLtr(rtlHelper.x(this.left + hitbox.left), hitbox.width);
        start += hitbox.height + labelOpts.padding;
      });
    }
  }

  isHorizontal() {
    return this.options.position === 'top' || this.options.position === 'bottom';
  }

  draw() {
    if (this.options.display) {
      const ctx = this.ctx;
      clipArea(ctx, this);

      this._draw();

      unclipArea(ctx);
    }
  }

  /**
	 * @private
	 */
  _draw() {
    const {options: opts, ctx} = this;
    const {labels: labelOpts} = opts;
    const defaultColor = defaults.color;
    const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
    const labelFont = toFont(labelOpts.font);
    const fontSize = labelFont.size;
    const halfFontSize = fontSize / 2;

    this.drawTitle();

    // Canvas setup
    ctx.textAlign = rtlHelper.textAlign('left');
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 0.5;
    ctx.font = labelFont.string;

    const {boxWidth, boxHeight, itemHeight} = getBoxSize(labelOpts, fontSize);

    // current position
    const drawLegendBox = function(x, y, legendItem) {
      if (isNaN(boxWidth) || boxWidth <= 0 || isNaN(boxHeight) || boxHeight < 0) {
        return;
      }

      // Set the ctx for the box
      ctx.save();

      const lineWidth = valueOrDefault(legendItem.lineWidth, 1);
      ctx.fillStyle = valueOrDefault(legendItem.fillStyle, defaultColor);
      ctx.lineCap = valueOrDefault(legendItem.lineCap, 'butt');
      ctx.lineDashOffset = valueOrDefault(legendItem.lineDashOffset, 0);
      ctx.lineJoin = valueOrDefault(legendItem.lineJoin, 'miter');
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = valueOrDefault(legendItem.strokeStyle, defaultColor);

      ctx.setLineDash(valueOrDefault(legendItem.lineDash, []));

      if (labelOpts.usePointStyle) {
        // Recalculate x and y for drawPoint() because its expecting
        // x and y to be center of figure (instead of top left)
        const drawOptions = {
          radius: boxHeight * Math.SQRT2 / 2,
          pointStyle: legendItem.pointStyle,
          rotation: legendItem.rotation,
          borderWidth: lineWidth
        };
        const centerX = rtlHelper.xPlus(x, boxWidth / 2);
        const centerY = y + halfFontSize;

        // Draw pointStyle as legend symbol
        drawPointLegend(ctx, drawOptions, centerX, centerY, labelOpts.pointStyleWidth && boxWidth);
      } else {
        // Draw box as legend symbol
        // Adjust position when boxHeight < fontSize (want it centered)
        const yBoxTop = y + Math.max((fontSize - boxHeight) / 2, 0);
        const xBoxLeft = rtlHelper.leftForLtr(x, boxWidth);
        const borderRadius = toTRBLCorners(legendItem.borderRadius);

        ctx.beginPath();

        if (Object.values(borderRadius).some(v => v !== 0)) {
          addRoundedRectPath(ctx, {
            x: xBoxLeft,
            y: yBoxTop,
            w: boxWidth,
            h: boxHeight,
            radius: borderRadius,
          });
        } else {
          ctx.rect(xBoxLeft, yBoxTop, boxWidth, boxHeight);
        }

        ctx.fill();
        if (lineWidth !== 0) {
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const fillText = function(x, y, legendItem) {
      const text = legendItem.text === null || legendItem.text === undefined ? '' : legendItem.text;
      renderText(ctx, text, x, y + (itemHeight / 2), labelFont, {
        strikethrough: legendItem.hidden,
        textAlign: rtlHelper.textAlign(legendItem.textAlign)
      });
    };

    overrideTextDirection(this.ctx, opts.textDirection);

    this.legendItems.forEach((legendItem, i) => {
      const hitbox = this.legendHitBoxes[i];

      ctx.strokeStyle = legendItem.fontColor; // for strikethrough effect
      ctx.fillStyle = legendItem.fontColor; // render in correct colour

      const textAlign = rtlHelper.textAlign(legendItem.textAlign || (legendItem.textAlign = labelOpts.textAlign));

      // Get the original x position
      let x = rtlHelper.x(hitbox.left + (opts.rtl ? hitbox.width : 0));
      let y = hitbox.top;

      drawLegendBox(rtlHelper.x(x), y, legendItem);

      x = _textX(textAlign, x + boxWidth + halfFontSize, x + hitbox.width, opts.rtl);

      // Fill the actual label
      fillText(rtlHelper.x(x), y, legendItem);
    });

    restoreTextDirection(this.ctx, opts.textDirection);
  }

  /**
	 * @protected
	 */
  drawTitle() {
    const {ctx, options: opts} = this;
    const {title: titleOpts} = opts;

    if (!titleOpts.display) {
      return;
    }

    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
    const position = titleOpts.position;
    const topPaddingPlusHalfFontSize = titlePadding.top + (titleFont.size / 2);

    // These defaults are used when the legend is vertical.
    // When horizontal, they are computed below.
    const isHorizontal = this.isHorizontal();
    const maxRowSize = this._groups.reduce((acc, block) => Math.max(acc, block.rowSize), 0);
    let maxWidth = isHorizontal ? maxRowSize : this.width;
    let left = isHorizontal ? _alignStartEnd(opts.align, this.left, this.right - maxWidth) : this.left;
    let y = this.top + topPaddingPlusHalfFontSize;

    if (!isHorizontal) {
      // Move down so that the title is above the legend stack in every alignment
      y = topPaddingPlusHalfFontSize + _alignStartEnd(opts.align, this.top, this.bottom - maxRowSize - this._computeTitleHeight() - opts.labels.padding);
    }

    // Now that we know the left edge of the inner legend box, compute the correct
    // X coordinate from the title alignment
    // #12066 respect the horizontal paddings of the title
    const x = _alignStartEnd(position, left + titlePadding.left, left + (maxWidth - titlePadding.right));

    // Canvas setup
    ctx.textAlign = rtlHelper.textAlign(_toLeftRightCenter(position));
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = titleOpts.color;
    ctx.fillStyle = titleOpts.color;
    ctx.font = titleFont.string;

    renderText(ctx, titleOpts.text, x, y, titleFont);
  }

  /**
	 * @private
	 */
  _computeTitleHeight() {
    const titleOpts = this.options.title;

    if (!titleOpts.display) {
      return 0;
    }

    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    const titleText = titleOpts.text;

    let titleHeight = titleFont.lineHeight;
    if (titleText && typeof titleText !== 'string') {
      titleHeight *= titleText.length;
    }

    return titleHeight + titlePadding.height;
  }

  /**
	 * @private
	 */
  _computeTitleWidth() {
    const titleOpts = this.options.title;

    if (!titleOpts.display) {
      return 0;
    }

    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    const titleLongestText = getLongestText(titleOpts.text);
    const titleWidth = measureText(titleLongestText, titleFont.string, this.ctx).width;

    return titleWidth + titlePadding.width;
  }

  /**
	 * @private
	 */
  _getLegendItemAt(x, y) {
    let i, hitBox, lh;

    if (_isBetween(x, this.left, this.right)
      && _isBetween(y, this.top, this.bottom)) {
      // See if we are touching one of the dataset boxes
      lh = this.legendHitBoxes;
      for (i = 0; i < lh.length; ++i) {
        hitBox = lh[i];

        if (_isBetween(x, hitBox.left, hitBox.left + hitBox.width)
          && _isBetween(y, hitBox.top, hitBox.top + hitBox.height)) {
          // Touching an element
          return this.legendItems[i];
        }
      }
    }

    return null;
  }

  /**
	 * Handle an event
	 * @param {ChartEvent} e - The event to handle
	 */
  handleEvent(e) {
    const opts = this.options;
    if (!isListened(e.type, opts)) {
      return;
    }

    // Chart event already has relative position in it
    const hoveredItem = this._getLegendItemAt(e.x, e.y);

    if (e.type === 'mousemove' || e.type === 'mouseout') {
      const previous = this._hoveredItem;
      const sameItem = itemsEqual(previous, hoveredItem);
      if (previous && !sameItem) {
        call(opts.onLeave, [e, previous, this], this);
      }

      this._hoveredItem = hoveredItem;

      if (hoveredItem && !sameItem) {
        call(opts.onHover, [e, hoveredItem, this], this);
      }
    } else if (hoveredItem) {
      call(opts.onClick, [e, hoveredItem, this], this);
    }
  }
}

/**
 * @param {string | string[]} text
 * @returns {string}
 */
function getLongestText(text) {
  if (typeof text === 'string') {
    return text;
  }
  return text ? text.reduce((a, b) => a.length > b.length ? a : b) : '';
}

function calculateItemSize(boxWidth, labelFont, ctx, legendItem, _itemHeight) {
  const itemWidth = calculateItemWidth(legendItem, boxWidth, labelFont, ctx);
  const itemHeight = calculateItemHeight(_itemHeight, legendItem, labelFont.lineHeight);
  return {itemWidth, itemHeight};
}

function calculateItemWidth(legendItem, boxWidth, labelFont, ctx) {
  const legendItemLongestText = getLongestText(legendItem.text);
  return boxWidth + (labelFont.size / 2) + ctx.measureText(legendItemLongestText).width;
}

function calculateItemHeight(itemHeight, legendItem, fontLineHeight) {
  if (legendItem.text && typeof legendItem.text !== 'string') {
    return fontLineHeight * legendItem.text.length;
  }
  return itemHeight;
}

function isListened(type, opts) {
  if ((type === 'mousemove' || type === 'mouseout') && (opts.onHover || opts.onLeave)) {
    return true;
  }
  if (opts.onClick && (type === 'click' || type === 'mouseup')) {
    return true;
  }
  return false;
}

/**
 *
 * @param {string} text
 * @param {string} font
 * @param {CanvasRenderingContext2D} ctx
 * @returns {TextMetrics}
 */
function measureText(text, font, ctx) {
  ctx.save();
  ctx.font = font;
  const result = ctx.measureText(text);
  ctx.restore();
  return result;
}

export default {
  id: 'legend',

  /**
	 * For tests
	 * @private
	 */
  _element: Legend,

  start(chart, _args, options) {
    const legend = chart.legend = new Legend({ctx: chart.ctx, options, chart});
    layouts.configure(chart, legend, options);
    layouts.addBox(chart, legend);
  },

  stop(chart) {
    layouts.removeBox(chart, chart.legend);
    delete chart.legend;
  },

  // During the beforeUpdate step, the layout configuration needs to run
  // This ensures that if the legend position changes (via an option update)
  // the layout system respects the change. See https://github.com/chartjs/Chart.js/issues/7527
  beforeUpdate(chart, _args, options) {
    const legend = chart.legend;
    layouts.configure(chart, legend, options);
    legend.options = options;
  },

  // The labels need to be built after datasets are updated to ensure that colors
  // and other styling are correct. See https://github.com/chartjs/Chart.js/issues/6968
  afterUpdate(chart) {
    const legend = chart.legend;
    legend.buildLabels();
    legend.adjustHitBoxes();
  },


  afterEvent(chart, args) {
    if (!args.replay) {
      chart.legend.handleEvent(args.event);
    }
  },

  defaults: {
    display: true,
    position: 'top',
    align: 'center',
    fullSize: true,
    reverse: false,
    weight: 1000,

    // a callback that will handle
    onClick(e, legendItem, legend) {
      const index = legendItem.datasetIndex;
      const ci = legend.chart;
      if (ci.isDatasetVisible(index)) {
        ci.hide(index);
        legendItem.hidden = true;
      } else {
        ci.show(index);
        legendItem.hidden = false;
      }
    },

    onHover: null,
    onLeave: null,

    labels: {
      color: (ctx) => ctx.chart.options.color,
      boxWidth: 40,
      padding: 10,
      // Generates labels shown in the legend
      // Valid properties to return:
      // text : text to display
      // fillStyle : fill of coloured box
      // strokeStyle: stroke of coloured box
      // hidden : if this legend item refers to a hidden item
      // lineCap : cap style for line
      // lineDash
      // lineDashOffset :
      // lineJoin :
      // lineWidth :
      generateLabels(chart) {
        const datasets = chart.data.datasets;
        const {labels: {usePointStyle, pointStyle, textAlign, color, useBorderRadius, borderRadius}} = chart.legend.options;

        return chart._getSortedDatasetMetas().map((meta) => {
          const style = meta.controller.getStyle(usePointStyle ? 0 : undefined);
          const borderWidth = toPadding(style.borderWidth);

          return {
            text: datasets[meta.index].label,
            fillStyle: style.backgroundColor,
            fontColor: color,
            hidden: !meta.visible,
            lineCap: style.borderCapStyle,
            lineDash: style.borderDash,
            lineDashOffset: style.borderDashOffset,
            lineJoin: style.borderJoinStyle,
            lineWidth: (borderWidth.width + borderWidth.height) / 4,
            strokeStyle: style.borderColor,
            pointStyle: pointStyle || style.pointStyle,
            rotation: style.rotation,
            textAlign: textAlign || style.textAlign,
            borderRadius: useBorderRadius && (borderRadius || style.borderRadius),

            // Below is extra data used for toggling the datasets
            datasetIndex: meta.index
          };
        }, this);
      }
    },

    title: {
      color: (ctx) => ctx.chart.options.color,
      display: false,
      position: 'center',
      text: '',
    }
  },

  descriptors: {
    _scriptable: (name) => !name.startsWith('on'),
    labels: {
      _scriptable: (name) => !['generateLabels', 'filter', 'sort'].includes(name),
    }
  },
};
