"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _RNMBXNativeUserLocationNativeComponent = _interopRequireDefault(require("../specs/RNMBXNativeUserLocationNativeComponent"));
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const defaultProps = {
  visible: true
};

/**
 * Renders a puck on the map that shows the device's current location.
 */
const LocationPuck = /*#__PURE__*/(0, _react.memo)(props => {
  const {
    iosShowsUserHeadingIndicator,
    pulsing,
    ...rest
  } = props;
  const nativePulsing = pulsing ? _pulsingToNative(pulsing) : undefined;
  let baseProps = {
    ...defaultProps,
    pulsing: nativePulsing
  };
  if (iosShowsUserHeadingIndicator) {
    console.warn('LocationPuck: iosShowsUserHeadingIndicator is deprecated, use puckBearingEnabled={true} puckBearing="heading" instead');
    baseProps = {
      ...baseProps,
      puckBearingEnabled: true,
      puckBearing: 'heading'
    };
  }
  const actualProps = {
    ...baseProps,
    ...rest
  };
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNMBXNativeUserLocationNativeComponent.default, {
    ...actualProps
  });
});
function _pulsingToNative(pulsing) {
  if (pulsing === 'default') {
    return {
      kind: 'default'
    };
  }
  if (pulsing == null) {
    return undefined;
  }
  const {
    color,
    isEnabled,
    radius
  } = pulsing;
  return {
    color: (0, _reactNative.processColor)(color),
    isEnabled,
    radius
  };
}
var _default = exports.default = LocationPuck;
//# sourceMappingURL=LocationPuck.js.map