import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
type ViewRef = Int32 | null;
interface NativeCameraStop {
    centerCoordinate?: string;
    bounds?: string;
    heading?: number;
    pitch?: number;
    zoom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    duration?: number;
    mode?: number;
}
type Stop = {
    stops: NativeCameraStop[];
} | NativeCameraStop;
type ObjectOr<T> = Object;
export interface Spec extends TurboModule {
    updateCameraStop(viewRef: ViewRef, stop: ObjectOr<Stop>): Promise<void>;
    moveBy: (viewRef: ViewRef, x: number, y: number, animationMode: number, animationDuration: number) => Promise<void>;
    scaleBy: (viewRef: ViewRef, x: number, y: number, animationMode: number, animationDuration: number, scaleFactor: number) => Promise<void>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeRNMBXCameraModule.d.ts.map