"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _RNMBXLightNativeComponent = _interopRequireDefault(require("../specs/RNMBXLightNativeComponent"));
var _StyleValue = require("../utils/StyleValue");
var _nativeRef = _interopRequireDefault(require("../utils/nativeRef"));
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * Light represents the light source for extruded geometries
 */
function Light(props, ref) {
  const {
    style,
    ...propWithoutStyle
  } = props;
  const nativeLightRef = (0, _nativeRef.default)((0, _react.useRef)(null));
  (0, _react.useImperativeHandle)(ref, () => ({
    setNativeProps(_props) {
      let propsToPass = _props;
      if (_props.style) {
        propsToPass = {
          ..._props,
          reactStyle: (0, _StyleValue.transformStyle)(_props.style)
        };
      }
      nativeLightRef.current?.setNativeProps(propsToPass);
    }
  }));
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNMBXLightNativeComponent.default
  // @ts-expect-error just codegen stuff
  , {
    ref: nativeLightRef,
    testID: "RNMBXLight",
    ...propWithoutStyle,
    reactStyle: (0, _StyleValue.transformStyle)(style)
  });
}
var _default = exports.default = /*#__PURE__*/(0, _react.memo)(/*#__PURE__*/(0, _react.forwardRef)(Light));
//# sourceMappingURL=Light.js.map