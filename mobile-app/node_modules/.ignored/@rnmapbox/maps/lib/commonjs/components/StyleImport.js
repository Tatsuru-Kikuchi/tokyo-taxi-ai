"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _RNMBXStyleImportNativeComponent = _interopRequireDefault(require("../specs/RNMBXStyleImportNativeComponent"));
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * Use StyleImport to set configuration options on the new standard style. **V11 only.**
 *
 * See https://github.com/mapbox/mapbox-maps-ios/blob/main/Sources/MapboxMaps/Documentation.docc/Migrate%20to%20v11.md#21-the-mapbox-standard-style
 */
var _default = exports.default = /*#__PURE__*/(0, _react.memo)(props => {
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNMBXStyleImportNativeComponent.default, {
    ...props
  });
});
//# sourceMappingURL=StyleImport.js.map