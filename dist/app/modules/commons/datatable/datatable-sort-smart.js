/*! oplus-modules v1.0.0 */
$.fn.dataTable.ext.order["oplus-smart"]=function(t,r,a,n){return this.api().column(r,{order:"index"}).nodes().map(function(t,r){return $(">[data-sort]",t).data("sort")})};