/*! oplus-modules v1.0.0 */
import{getOrientation}from"diagram-js/lib/layout/LayoutUtil";export function getBoundaryAttachment(t,n){var r=getOrientation(t,n,-15);return"intersect"!==r?r:null}