"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _RNMBXImageNativeComponent = _interopRequireDefault(require("../specs/RNMBXImageNativeComponent"));
var _NativeRNMBXImageModule = _interopRequireDefault(require("../specs/NativeRNMBXImageModule"));
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const Image = /*#__PURE__*/(0, _react.memo)(/*#__PURE__*/(0, _react.forwardRef)(function Image({
  name,
  sdf,
  stretchX,
  stretchY,
  children
}, ref) {
  const nativeProps = {
    name,
    sdf,
    stretchX,
    stretchY,
    children
  };
  const imageRef = _react.default.useRef(null);
  const refresh = () => {
    const handle = (0, _reactNative.findNodeHandle)(imageRef.current);
    _NativeRNMBXImageModule.default.refresh(handle);
  };
  _react.default.useImperativeHandle(ref, () => {
    return {
      refresh
    };
  });

  // @ts-expect-error just codegen stuff
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNMBXImageNativeComponent.default, {
    ...nativeProps,
    ref: imageRef
  });
}));
Image.displayName = 'Image';
var _default = exports.default = Image;
//# sourceMappingURL=Image.js.map