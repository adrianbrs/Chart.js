(window.webpackJsonp=window.webpackJsonp||[]).push([[252],{588:function(n,t,a){"use strict";a.r(t);var e=a(3),s=Object(e.a)({},(function(){var n=this,t=n._self._c;return t("ContentSlotsDistributor",{attrs:{"slot-key":n.$parent.slotKey}},[t("h1",{attrs:{id:"time-scale-max-span"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#time-scale-max-span"}},[n._v("#")]),n._v(" Time Scale - Max Span")]),n._v(" "),t("chart-editor",{attrs:{code:"// <block:actions:2>\nconst actions = [\n  {\n    name: 'Randomize',\n    handler(chart) {\n      chart.data.datasets.forEach(dataset => {\n        dataset.data.forEach(function(dataObj, j) {\n          const newVal = Utils.rand(0, 100);\n\n          if (typeof dataObj === 'object') {\n            dataObj.y = newVal;\n          } else {\n            dataset.data[j] = newVal;\n          }\n        });\n      });\n      chart.update();\n    }\n  },\n];\n// </block:actions>\n\n// <block:setup:1>\nconst data = {\n  datasets: [{\n    label: 'Dataset with string point data',\n    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),\n    borderColor: Utils.CHART_COLORS.red,\n    fill: false,\n    data: [{\n      x: Utils.newDateString(0),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDateString(2),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDateString(4),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDateString(6),\n      y: Utils.rand(0, 100)\n    }],\n  }, {\n    label: 'Dataset with date object point data',\n    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),\n    borderColor: Utils.CHART_COLORS.blue,\n    fill: false,\n    data: [{\n      x: Utils.newDate(0),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDate(2),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDate(5),\n      y: Utils.rand(0, 100)\n    }, {\n      x: Utils.newDate(6),\n      y: Utils.rand(0, 100)\n    }]\n  }]\n};\n// </block:setup>\n\n// <block:config:0>\nconst config = {\n  type: 'line',\n  data: data,\n  options: {\n    spanGaps: 1000 * 60 * 60 * 24 * 2, // 2 days\n    responsive: true,\n    interaction: {\n      mode: 'nearest',\n    },\n    plugins: {\n      title: {\n        display: true,\n        text: 'Chart.js Time - spanGaps: 172800000 (2 days in ms)'\n      },\n    },\n    scales: {\n      x: {\n        type: 'time',\n        display: true,\n        title: {\n          display: true,\n          text: 'Date'\n        },\n        ticks: {\n          autoSkip: false,\n          maxRotation: 0,\n          major: {\n            enabled: true\n          },\n          // color: function(context) {\n          //   return context.tick && context.tick.major ? '#FF0000' : 'rgba(0,0,0,0.1)';\n          // },\n          font: function(context) {\n            if (context.tick && context.tick.major) {\n              return {\n                weight: 'bold',\n              };\n            }\n          }\n        }\n      },\n      y: {\n        display: true,\n        title: {\n          display: true,\n          text: 'value'\n        }\n      }\n    }\n  },\n};\n// </block:config>\n\nmodule.exports = {\n  actions: [],\n  config: config,\n};\n"}}),t("h2",{attrs:{id:"docs"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#docs"}},[n._v("#")]),n._v(" Docs")]),n._v(" "),t("ul",[t("li",[t("RouterLink",{attrs:{to:"/charts/line.html"}},[n._v("Line")]),n._v(" "),t("ul",[t("li",[t("RouterLink",{attrs:{to:"/charts/line.html#line-styling"}},[t("code",[n._v("spanGaps")])])],1)])],1),n._v(" "),t("li",[t("RouterLink",{attrs:{to:"/axes/cartesian/time.html"}},[n._v("Time Scale")])],1)])],1)}),[],!1,null,null,null);t.default=s.exports}}]);