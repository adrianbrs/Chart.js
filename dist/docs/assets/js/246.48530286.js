(window.webpackJsonp=window.webpackJsonp||[]).push([[246],{581:function(n,t,a){"use strict";a.r(t);var s=a(3),e=Object(s.a)({},(function(){var n=this,t=n._self._c;return t("ContentSlotsDistributor",{attrs:{"slot-key":n.$parent.slotKey}},[t("h1",{attrs:{id:"linear-scale-min-max"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#linear-scale-min-max"}},[n._v("#")]),n._v(" Linear Scale - Min-Max")]),n._v(" "),t("chart-editor",{attrs:{code:"// <block:setup:1>\nconst DATA_COUNT = 7;\nconst NUMBER_CFG = {count: DATA_COUNT, min: 0, max: 100};\n\nconst labels = Utils.months({count: 7});\nconst data = {\n  labels: labels,\n  datasets: [\n    {\n      label: 'Dataset 1',\n      data: [10, 30, 50, 20, 25, 44, -10],\n      borderColor: Utils.CHART_COLORS.red,\n      backgroundColor: Utils.CHART_COLORS.red,\n    },\n    {\n      label: 'Dataset 2',\n      data: [100, 33, 22, 19, 11, 49, 30],\n      borderColor: Utils.CHART_COLORS.blue,\n      backgroundColor: Utils.CHART_COLORS.blue,\n    }\n  ]\n};\n// </block:setup>\n\n// <block:config:0>\nconst config = {\n  type: 'line',\n  data: data,\n  options: {\n    responsive: true,\n    plugins: {\n      title: {\n        display: true,\n        text: 'Min and Max Settings'\n      }\n    },\n    scales: {\n      y: {\n        min: 10,\n        max: 50,\n      }\n    }\n  },\n};\n// </block:config>\n\nmodule.exports = {\n  config: config,\n};\n"}}),t("h2",{attrs:{id:"docs"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#docs"}},[n._v("#")]),n._v(" Docs")]),n._v(" "),t("ul",[t("li",[t("RouterLink",{attrs:{to:"/charts/line.html"}},[n._v("Line")])],1),n._v(" "),t("li",[t("RouterLink",{attrs:{to:"/general/data-structures.html"}},[n._v("Data structures ("),t("code",[n._v("labels")]),n._v(")")])],1),n._v(" "),t("li",[t("RouterLink",{attrs:{to:"/axes/"}},[n._v("Axes scales")]),n._v(" "),t("ul",[t("li",[t("RouterLink",{attrs:{to:"/axes/#common-options-to-all-axes"}},[n._v("Common options to all axes ("),t("code",[n._v("min")]),n._v(","),t("code",[n._v("max")]),n._v(")")])],1)])],1)])],1)}),[],!1,null,null,null);t.default=e.exports}}]);