"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Terrain = void 0;
var _react = _interopRequireWildcard(require("react"));
var _StyleValue = require("../utils/StyleValue");
var _RNMBXTerrainNativeComponent = _interopRequireDefault(require("../specs/RNMBXTerrainNativeComponent"));
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const Terrain = exports.Terrain = /*#__PURE__*/(0, _react.memo)(props => {
  let {
    style = {}
  } = props;
  if (props.exaggeration) {
    console.warn(`Terrain: exaggeration property is deprecated pls use style.exaggeration instead!`);
    style = {
      exaggeration: props.exaggeration,
      ...style
    };
  }
  const baseProps = (0, _react.useMemo)(() => {
    return {
      ...props,
      reactStyle: (0, _StyleValue.transformStyle)(style),
      style: undefined
    };
  }, [props, style]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNMBXTerrainNativeComponent.default, {
    ...baseProps
  });
});
//# sourceMappingURL=Terrain.js.map