/*! oplus-modules v1.0.0 */
"use strict";var Validator=require("../Validator");module.exports=function(r){return(new Validator).addAll(r).getErrors()};