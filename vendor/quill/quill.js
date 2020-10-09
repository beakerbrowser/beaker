/*!
 * Quill Editor v2.0.0-dev.3
 * https://quilljs.com/
 * Copyright (c) 2014, Jason Chen
 * Copyright (c) 2013, salesforce.com
 * 
 * Branch: https://github.com/yananym/quill
 */
const factory = (function() {
 return /******/ (function(modules) { // webpackBootstrap
 /******/ 	// The module cache
 /******/ 	var installedModules = {};
 /******/
 /******/ 	// The require function
 /******/ 	function __webpack_require__(moduleId) {
 /******/
 /******/ 		// Check if module is in cache
 /******/ 		if(installedModules[moduleId]) {
 /******/ 			return installedModules[moduleId].exports;
 /******/ 		}
 /******/ 		// Create a new module (and put it into the cache)
 /******/ 		var module = installedModules[moduleId] = {
 /******/ 			i: moduleId,
 /******/ 			l: false,
 /******/ 			exports: {}
 /******/ 		};
 /******/
 /******/ 		// Execute the module function
 /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
 /******/
 /******/ 		// Flag the module as loaded
 /******/ 		module.l = true;
 /******/
 /******/ 		// Return the exports of the module
 /******/ 		return module.exports;
 /******/ 	}
 /******/
 /******/
 /******/ 	// expose the modules object (__webpack_modules__)
 /******/ 	__webpack_require__.m = modules;
 /******/
 /******/ 	// expose the module cache
 /******/ 	__webpack_require__.c = installedModules;
 /******/
 /******/ 	// define getter function for harmony exports
 /******/ 	__webpack_require__.d = function(exports, name, getter) {
 /******/ 		if(!__webpack_require__.o(exports, name)) {
 /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
 /******/ 		}
 /******/ 	};
 /******/
 /******/ 	// define __esModule on exports
 /******/ 	__webpack_require__.r = function(exports) {
 /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
 /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
 /******/ 		}
 /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
 /******/ 	};
 /******/
 /******/ 	// create a fake namespace object
 /******/ 	// mode & 1: value is a module id, require it
 /******/ 	// mode & 2: merge all properties of value into the ns
 /******/ 	// mode & 4: return value when already ns object
 /******/ 	// mode & 8|1: behave like require
 /******/ 	__webpack_require__.t = function(value, mode) {
 /******/ 		if(mode & 1) value = __webpack_require__(value);
 /******/ 		if(mode & 8) return value;
 /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
 /******/ 		var ns = Object.create(null);
 /******/ 		__webpack_require__.r(ns);
 /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
 /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
 /******/ 		return ns;
 /******/ 	};
 /******/
 /******/ 	// getDefaultExport function for compatibility with non-harmony modules
 /******/ 	__webpack_require__.n = function(module) {
 /******/ 		var getter = module && module.__esModule ?
 /******/ 			function getDefault() { return module['default']; } :
 /******/ 			function getModuleExports() { return module; };
 /******/ 		__webpack_require__.d(getter, 'a', getter);
 /******/ 		return getter;
 /******/ 	};
 /******/
 /******/ 	// Object.prototype.hasOwnProperty.call
 /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
 /******/
 /******/ 	// __webpack_public_path__
 /******/ 	__webpack_require__.p = "";
 /******/
 /******/
 /******/ 	// Load entry module and return exports
 /******/ 	return __webpack_require__(__webpack_require__.s = 0);
 /******/ })
 /************************************************************************/
 /******/ ({
 
 /***/ "./assets/icons/align-center.svg":
 /*!***************************************!*\
   !*** ./assets/icons/align-center.svg ***!
   \***************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=14 x2=4 y1=14 y2=14></line> <line class=ql-stroke x1=12 x2=6 y1=4 y2=4></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/align-justify.svg":
 /*!****************************************!*\
   !*** ./assets/icons/align-justify.svg ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=15 x2=3 y1=14 y2=14></line> <line class=ql-stroke x1=15 x2=3 y1=4 y2=4></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/align-left.svg":
 /*!*************************************!*\
   !*** ./assets/icons/align-left.svg ***!
   \*************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=3 x2=13 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=9 y1=4 y2=4></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/align-right.svg":
 /*!**************************************!*\
   !*** ./assets/icons/align-right.svg ***!
   \**************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=15 x2=5 y1=14 y2=14></line> <line class=ql-stroke x1=15 x2=9 y1=4 y2=4></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/background.svg":
 /*!*************************************!*\
   !*** ./assets/icons/background.svg ***!
   \*************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <g class=\"ql-fill ql-color-label\"> <polygon points=\"6 6.868 6 6 5 6 5 7 5.942 7 6 6.868\"></polygon> <rect height=1 width=1 x=4 y=4></rect> <polygon points=\"6.817 5 6 5 6 6 6.38 6 6.817 5\"></polygon> <rect height=1 width=1 x=2 y=6></rect> <rect height=1 width=1 x=3 y=5></rect> <rect height=1 width=1 x=4 y=7></rect> <polygon points=\"4 11.439 4 11 3 11 3 12 3.755 12 4 11.439\"></polygon> <rect height=1 width=1 x=2 y=12></rect> <rect height=1 width=1 x=2 y=9></rect> <rect height=1 width=1 x=2 y=15></rect> <polygon points=\"4.63 10 4 10 4 11 4.192 11 4.63 10\"></polygon> <rect height=1 width=1 x=3 y=8></rect> <path d=M10.832,4.2L11,4.582V4H10.708A1.948,1.948,0,0,1,10.832,4.2Z></path> <path d=M7,4.582L7.168,4.2A1.929,1.929,0,0,1,7.292,4H7V4.582Z></path> <path d=M8,13H7.683l-0.351.8a1.933,1.933,0,0,1-.124.2H8V13Z></path> <rect height=1 width=1 x=12 y=2></rect> <rect height=1 width=1 x=11 y=3></rect> <path d=M9,3H8V3.282A1.985,1.985,0,0,1,9,3Z></path> <rect height=1 width=1 x=2 y=3></rect> <rect height=1 width=1 x=6 y=2></rect> <rect height=1 width=1 x=3 y=2></rect> <rect height=1 width=1 x=5 y=3></rect> <rect height=1 width=1 x=9 y=2></rect> <rect height=1 width=1 x=15 y=14></rect> <polygon points=\"13.447 10.174 13.469 10.225 13.472 10.232 13.808 11 14 11 14 10 13.37 10 13.447 10.174\"></polygon> <rect height=1 width=1 x=13 y=7></rect> <rect height=1 width=1 x=15 y=5></rect> <rect height=1 width=1 x=14 y=6></rect> <rect height=1 width=1 x=15 y=8></rect> <rect height=1 width=1 x=14 y=9></rect> <path d=M3.775,14H3v1H4V14.314A1.97,1.97,0,0,1,3.775,14Z></path> <rect height=1 width=1 x=14 y=3></rect> <polygon points=\"12 6.868 12 6 11.62 6 12 6.868\"></polygon> <rect height=1 width=1 x=15 y=2></rect> <rect height=1 width=1 x=12 y=5></rect> <rect height=1 width=1 x=13 y=4></rect> <polygon points=\"12.933 9 13 9 13 8 12.495 8 12.933 9\"></polygon> <rect height=1 width=1 x=9 y=14></rect> <rect height=1 width=1 x=8 y=15></rect> <path d=M6,14.926V15H7V14.316A1.993,1.993,0,0,1,6,14.926Z></path> <rect height=1 width=1 x=5 y=15></rect> <path d=M10.668,13.8L10.317,13H10v1h0.792A1.947,1.947,0,0,1,10.668,13.8Z></path> <rect height=1 width=1 x=11 y=15></rect> <path d=M14.332,12.2a1.99,1.99,0,0,1,.166.8H15V12H14.245Z></path> <rect height=1 width=1 x=14 y=15></rect> <rect height=1 width=1 x=15 y=11></rect> </g> <polyline class=ql-stroke points=\"5.5 13 9 5 12.5 13\"></polyline> <line class=ql-stroke x1=11.63 x2=6.38 y1=11 y2=11></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/blockquote.svg":
 /*!*************************************!*\
   !*** ./assets/icons/blockquote.svg ***!
   \*************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=\"ql-fill ql-stroke\" height=3 width=3 x=4 y=5></rect> <rect class=\"ql-fill ql-stroke\" height=3 width=3 x=11 y=5></rect> <path class=\"ql-even ql-fill ql-stroke\" d=M7,8c0,4.031-3,5-3,5></path> <path class=\"ql-even ql-fill ql-stroke\" d=M14,8c0,4.031-3,5-3,5></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/bold.svg":
 /*!*******************************!*\
   !*** ./assets/icons/bold.svg ***!
   \*******************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-stroke d=M5,4H9.5A2.5,2.5,0,0,1,12,6.5v0A2.5,2.5,0,0,1,9.5,9H5A0,0,0,0,1,5,9V4A0,0,0,0,1,5,4Z></path> <path class=ql-stroke d=M5,9h5.5A2.5,2.5,0,0,1,13,11.5v0A2.5,2.5,0,0,1,10.5,14H5a0,0,0,0,1,0,0V9A0,0,0,0,1,5,9Z></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/clean.svg":
 /*!********************************!*\
   !*** ./assets/icons/clean.svg ***!
   \********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg class=\"\" viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=5 x2=13 y1=3 y2=3></line> <line class=ql-stroke x1=6 x2=9.35 y1=12 y2=3></line> <line class=ql-stroke x1=11 x2=15 y1=11 y2=15></line> <line class=ql-stroke x1=15 x2=11 y1=11 y2=15></line> <rect class=ql-fill height=1 rx=0.5 ry=0.5 width=7 x=2 y=14></rect> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/code.svg":
 /*!*******************************!*\
   !*** ./assets/icons/code.svg ***!
   \*******************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <polyline class=\"ql-even ql-stroke\" points=\"5 7 3 9 5 11\"></polyline> <polyline class=\"ql-even ql-stroke\" points=\"13 7 15 9 13 11\"></polyline> <line class=ql-stroke x1=10 x2=8 y1=5 y2=13></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/color.svg":
 /*!********************************!*\
   !*** ./assets/icons/color.svg ***!
   \********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=\"ql-color-label ql-stroke ql-transparent\" x1=3 x2=15 y1=15 y2=15></line> <polyline class=ql-stroke points=\"5.5 11 9 3 12.5 11\"></polyline> <line class=ql-stroke x1=11.63 x2=6.38 y1=9 y2=9></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/direction-ltr.svg":
 /*!****************************************!*\
   !*** ./assets/icons/direction-ltr.svg ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=\"ql-stroke ql-fill\" points=\"3 11 5 9 3 7 3 11\"></polygon> <line class=\"ql-stroke ql-fill\" x1=15 x2=11 y1=4 y2=4></line> <path class=ql-fill d=M11,3a3,3,0,0,0,0,6h1V3H11Z></path> <rect class=ql-fill height=11 width=1 x=11 y=4></rect> <rect class=ql-fill height=11 width=1 x=13 y=4></rect> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/direction-rtl.svg":
 /*!****************************************!*\
   !*** ./assets/icons/direction-rtl.svg ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=\"ql-stroke ql-fill\" points=\"15 12 13 10 15 8 15 12\"></polygon> <line class=\"ql-stroke ql-fill\" x1=9 x2=5 y1=4 y2=4></line> <path class=ql-fill d=M5,3A3,3,0,0,0,5,9H6V3H5Z></path> <rect class=ql-fill height=11 width=1 x=5 y=4></rect> <rect class=ql-fill height=11 width=1 x=7 y=4></rect> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/dropdown.svg":
 /*!***********************************!*\
   !*** ./assets/icons/dropdown.svg ***!
   \***********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=ql-stroke points=\"7 11 9 13 11 11 7 11\"></polygon> <polygon class=ql-stroke points=\"7 7 9 5 11 7 7 7\"></polygon> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/formula.svg":
 /*!**********************************!*\
   !*** ./assets/icons/formula.svg ***!
   \**********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M11.759,2.482a2.561,2.561,0,0,0-3.53.607A7.656,7.656,0,0,0,6.8,6.2C6.109,9.188,5.275,14.677,4.15,14.927a1.545,1.545,0,0,0-1.3-.933A0.922,0.922,0,0,0,2,15.036S1.954,16,4.119,16s3.091-2.691,3.7-5.553c0.177-.826.36-1.726,0.554-2.6L8.775,6.2c0.381-1.421.807-2.521,1.306-2.676a1.014,1.014,0,0,0,1.02.56A0.966,0.966,0,0,0,11.759,2.482Z></path> <rect class=ql-fill height=1.6 rx=0.8 ry=0.8 width=5 x=5.15 y=6.2></rect> <path class=ql-fill d=M13.663,12.027a1.662,1.662,0,0,1,.266-0.276q0.193,0.069.456,0.138a2.1,2.1,0,0,0,.535.069,1.075,1.075,0,0,0,.767-0.3,1.044,1.044,0,0,0,.314-0.8,0.84,0.84,0,0,0-.238-0.619,0.8,0.8,0,0,0-.594-0.239,1.154,1.154,0,0,0-.781.3,4.607,4.607,0,0,0-.781,1q-0.091.15-.218,0.346l-0.246.38c-0.068-.288-0.137-0.582-0.212-0.885-0.459-1.847-2.494-.984-2.941-0.8-0.482.2-.353,0.647-0.094,0.529a0.869,0.869,0,0,1,1.281.585c0.217,0.751.377,1.436,0.527,2.038a5.688,5.688,0,0,1-.362.467,2.69,2.69,0,0,1-.264.271q-0.221-.08-0.471-0.147a2.029,2.029,0,0,0-.522-0.066,1.079,1.079,0,0,0-.768.3A1.058,1.058,0,0,0,9,15.131a0.82,0.82,0,0,0,.832.852,1.134,1.134,0,0,0,.787-0.3,5.11,5.11,0,0,0,.776-0.993q0.141-.219.215-0.34c0.046-.076.122-0.194,0.223-0.346a2.786,2.786,0,0,0,.918,1.726,2.582,2.582,0,0,0,2.376-.185c0.317-.181.212-0.565,0-0.494A0.807,0.807,0,0,1,14.176,15a5.159,5.159,0,0,1-.913-2.446l0,0Q13.487,12.24,13.663,12.027Z></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/header-2.svg":
 /*!***********************************!*\
   !*** ./assets/icons/header-2.svg ***!
   \***********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewBox=\"0 0 18 18\"> <path class=ql-fill d=M16.73975,13.81445v.43945a.54085.54085,0,0,1-.605.60547H11.855a.58392.58392,0,0,1-.64893-.60547V14.0127c0-2.90527,3.39941-3.42187,3.39941-4.55469a.77675.77675,0,0,0-.84717-.78125,1.17684,1.17684,0,0,0-.83594.38477c-.2749.26367-.561.374-.85791.13184l-.4292-.34082c-.30811-.24219-.38525-.51758-.1543-.81445a2.97155,2.97155,0,0,1,2.45361-1.17676,2.45393,2.45393,0,0,1,2.68408,2.40918c0,2.45312-3.1792,2.92676-3.27832,3.93848h2.79443A.54085.54085,0,0,1,16.73975,13.81445ZM9,3A.99974.99974,0,0,0,8,4V8H3V4A1,1,0,0,0,1,4V14a1,1,0,0,0,2,0V10H8v4a1,1,0,0,0,2,0V4A.99974.99974,0,0,0,9,3Z /> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/header.svg":
 /*!*********************************!*\
   !*** ./assets/icons/header.svg ***!
   \*********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewBox=\"0 0 18 18\"> <path class=ql-fill d=M10,4V14a1,1,0,0,1-2,0V10H3v4a1,1,0,0,1-2,0V4A1,1,0,0,1,3,4V8H8V4a1,1,0,0,1,2,0Zm6.06787,9.209H14.98975V7.59863a.54085.54085,0,0,0-.605-.60547h-.62744a1.01119,1.01119,0,0,0-.748.29688L11.645,8.56641a.5435.5435,0,0,0-.022.8584l.28613.30762a.53861.53861,0,0,0,.84717.0332l.09912-.08789a1.2137,1.2137,0,0,0,.2417-.35254h.02246s-.01123.30859-.01123.60547V13.209H12.041a.54085.54085,0,0,0-.605.60547v.43945a.54085.54085,0,0,0,.605.60547h4.02686a.54085.54085,0,0,0,.605-.60547v-.43945A.54085.54085,0,0,0,16.06787,13.209Z /> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/image.svg":
 /*!********************************!*\
   !*** ./assets/icons/image.svg ***!
   \********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=ql-stroke height=10 width=12 x=3 y=4></rect> <circle class=ql-fill cx=6 cy=7 r=1></circle> <polyline class=\"ql-even ql-fill\" points=\"5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12\"></polyline> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/indent.svg":
 /*!*********************************!*\
   !*** ./assets/icons/indent.svg ***!
   \*********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=\"ql-fill ql-stroke\" points=\"3 7 3 11 5 9 3 7\"></polyline> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/italic.svg":
 /*!*********************************!*\
   !*** ./assets/icons/italic.svg ***!
   \*********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=13 y1=4 y2=4></line> <line class=ql-stroke x1=5 x2=11 y1=14 y2=14></line> <line class=ql-stroke x1=8 x2=10 y1=14 y2=4></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/link.svg":
 /*!*******************************!*\
   !*** ./assets/icons/link.svg ***!
   \*******************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=11 y1=7 y2=11></line> <path class=\"ql-even ql-stroke\" d=M8.9,4.577a3.476,3.476,0,0,1,.36,4.679A3.476,3.476,0,0,1,4.577,8.9C3.185,7.5,2.035,6.4,4.217,4.217S7.5,3.185,8.9,4.577Z></path> <path class=\"ql-even ql-stroke\" d=M13.423,9.1a3.476,3.476,0,0,0-4.679-.36,3.476,3.476,0,0,0,.36,4.679c1.392,1.392,2.5,2.542,4.679.36S14.815,10.5,13.423,9.1Z></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/list-bullet.svg":
 /*!**************************************!*\
   !*** ./assets/icons/list-bullet.svg ***!
   \**************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=6 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=6 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=6 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=3 y1=4 y2=4></line> <line class=ql-stroke x1=3 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=3 x2=3 y1=14 y2=14></line> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/list-check.svg":
 /*!*************************************!*\
   !*** ./assets/icons/list-check.svg ***!
   \*************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg class=\"\" viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=9 x2=15 y1=4 y2=4></line> <polyline class=ql-stroke points=\"3 4 4 5 6 3\"></polyline> <line class=ql-stroke x1=9 x2=15 y1=14 y2=14></line> <polyline class=ql-stroke points=\"3 14 4 15 6 13\"></polyline> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=ql-stroke points=\"3 9 4 10 6 8\"></polyline> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/list-ordered.svg":
 /*!***************************************!*\
   !*** ./assets/icons/list-ordered.svg ***!
   \***************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=7 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=7 x2=15 y1=14 y2=14></line> <line class=\"ql-stroke ql-thin\" x1=2.5 x2=4.5 y1=5.5 y2=5.5></line> <path class=ql-fill d=M3.5,6A0.5,0.5,0,0,1,3,5.5V3.085l-0.276.138A0.5,0.5,0,0,1,2.053,3c-0.124-.247-0.023-0.324.224-0.447l1-.5A0.5,0.5,0,0,1,4,2.5v3A0.5,0.5,0,0,1,3.5,6Z></path> <path class=\"ql-stroke ql-thin\" d=M4.5,10.5h-2c0-.234,1.85-1.076,1.85-2.234A0.959,0.959,0,0,0,2.5,8.156></path> <path class=\"ql-stroke ql-thin\" d=M2.5,14.846a0.959,0.959,0,0,0,1.85-.109A0.7,0.7,0,0,0,3.75,14a0.688,0.688,0,0,0,.6-0.736,0.959,0.959,0,0,0-1.85-.109></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/outdent.svg":
 /*!**********************************!*\
   !*** ./assets/icons/outdent.svg ***!
   \**********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=ql-stroke points=\"5 7 5 11 3 9 5 7\"></polyline> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/strike.svg":
 /*!*********************************!*\
   !*** ./assets/icons/strike.svg ***!
   \*********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=\"ql-stroke ql-thin\" x1=15.5 x2=2.5 y1=8.5 y2=9.5></line> <path class=ql-fill d=M9.007,8C6.542,7.791,6,7.519,6,6.5,6,5.792,7.283,5,9,5c1.571,0,2.765.679,2.969,1.309a1,1,0,0,0,1.9-.617C13.356,4.106,11.354,3,9,3,6.2,3,4,4.538,4,6.5a3.2,3.2,0,0,0,.5,1.843Z></path> <path class=ql-fill d=M8.984,10C11.457,10.208,12,10.479,12,11.5c0,0.708-1.283,1.5-3,1.5-1.571,0-2.765-.679-2.969-1.309a1,1,0,1,0-1.9.617C4.644,13.894,6.646,15,9,15c2.8,0,5-1.538,5-3.5a3.2,3.2,0,0,0-.5-1.843Z></path> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/subscript.svg":
 /*!************************************!*\
   !*** ./assets/icons/subscript.svg ***!
   \************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M15.5,15H13.861a3.858,3.858,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.921,1.921,0,0,0,12.021,11.7a0.50013,0.50013,0,1,0,.957.291h0a0.914,0.914,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.076-1.16971,1.86982-1.93971,2.43082A1.45639,1.45639,0,0,0,12,15.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,15Z /> <path class=ql-fill d=M9.65,5.241a1,1,0,0,0-1.409.108L6,7.964,3.759,5.349A1,1,0,0,0,2.192,6.59178Q2.21541,6.6213,2.241,6.649L4.684,9.5,2.241,12.35A1,1,0,0,0,3.71,13.70722q0.02557-.02768.049-0.05722L6,11.036,8.241,13.65a1,1,0,1,0,1.567-1.24277Q9.78459,12.3777,9.759,12.35L7.316,9.5,9.759,6.651A1,1,0,0,0,9.65,5.241Z /> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/superscript.svg":
 /*!**************************************!*\
   !*** ./assets/icons/superscript.svg ***!
   \**************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M15.5,7H13.861a4.015,4.015,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.922,1.922,0,0,0,12.021,3.7a0.5,0.5,0,1,0,.957.291,0.917,0.917,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.077-1.164,1.925-1.934,2.486A1.423,1.423,0,0,0,12,7.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,7Z /> <path class=ql-fill d=M9.651,5.241a1,1,0,0,0-1.41.108L6,7.964,3.759,5.349a1,1,0,1,0-1.519,1.3L4.683,9.5,2.241,12.35a1,1,0,1,0,1.519,1.3L6,11.036,8.241,13.65a1,1,0,0,0,1.519-1.3L7.317,9.5,9.759,6.651A1,1,0,0,0,9.651,5.241Z /> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/table.svg":
 /*!********************************!*\
   !*** ./assets/icons/table.svg ***!
   \********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=ql-stroke height=12 width=12 x=3 y=3></rect> <rect class=ql-fill height=2 width=3 x=5 y=5></rect> <rect class=ql-fill height=2 width=4 x=9 y=5></rect> <g class=\"ql-fill ql-transparent\"> <rect height=2 width=3 x=5 y=8></rect> <rect height=2 width=4 x=9 y=8></rect> <rect height=2 width=3 x=5 y=11></rect> <rect height=2 width=4 x=9 y=11></rect> </g> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/underline.svg":
 /*!************************************!*\
   !*** ./assets/icons/underline.svg ***!
   \************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-stroke d=M5,3V9a4.012,4.012,0,0,0,4,4H9a4.012,4.012,0,0,0,4-4V3></path> <rect class=ql-fill height=1 rx=0.5 ry=0.5 width=12 x=3 y=15></rect> </svg>";
 
 /***/ }),
 
 /***/ "./assets/icons/video.svg":
 /*!********************************!*\
   !*** ./assets/icons/video.svg ***!
   \********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=ql-stroke height=12 width=12 x=3 y=3></rect> <rect class=ql-fill height=12 width=1 x=5 y=3></rect> <rect class=ql-fill height=12 width=1 x=12 y=3></rect> <rect class=ql-fill height=2 width=8 x=5 y=8></rect> <rect class=ql-fill height=1 width=3 x=3 y=5></rect> <rect class=ql-fill height=1 width=3 x=3 y=7></rect> <rect class=ql-fill height=1 width=3 x=3 y=10></rect> <rect class=ql-fill height=1 width=3 x=3 y=12></rect> <rect class=ql-fill height=1 width=3 x=12 y=5></rect> <rect class=ql-fill height=1 width=3 x=12 y=7></rect> <rect class=ql-fill height=1 width=3 x=12 y=10></rect> <rect class=ql-fill height=1 width=3 x=12 y=12></rect> </svg>";
 
 /***/ }),
 
 /***/ "./blots/block.js":
 /*!************************!*\
   !*** ./blots/block.js ***!
   \************************/
 /*! exports provided: blockDelta, bubbleFormats, BlockEmbed, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "blockDelta", function() { return blockDelta; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "bubbleFormats", function() { return bubbleFormats; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BlockEmbed", function() { return BlockEmbed; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Block; });
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _break__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./break */ "./blots/break.js");
 /* harmony import */ var _inline__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./inline */ "./blots/inline.js");
 /* harmony import */ var _text__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./text */ "./blots/text.js");
 
 
 
 
 
 
 const NEWLINE_LENGTH = 1;
 
 class Block extends parchment__WEBPACK_IMPORTED_MODULE_2__["BlockBlot"] {
   constructor(scroll, domNode) {
     super(scroll, domNode);
     this.cache = {};
   }
 
   delta() {
     if (this.cache.delta == null) {
       this.cache.delta = blockDelta(this);
     }
 
     return this.cache.delta;
   }
 
   deleteAt(index, length) {
     super.deleteAt(index, length);
     this.cache = {};
   }
 
   formatAt(index, length, name, value) {
     if (length <= 0) return;
 
     if (this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK)) {
       if (index + length === this.length()) {
         this.format(name, value);
       }
     } else {
       super.formatAt(index, Math.min(length, this.length() - index - 1), name, value);
     }
 
     this.cache = {};
   }
 
   insertAt(index, value, def) {
     if (def != null) {
       super.insertAt(index, value, def);
       this.cache = {};
       return;
     }
 
     if (value.length === 0) return;
     const lines = value.split('\n');
     const text = lines.shift();
 
     if (text.length > 0) {
       if (index < this.length() - 1 || this.children.tail == null) {
         super.insertAt(Math.min(index, this.length() - 1), text);
       } else {
         this.children.tail.insertAt(this.children.tail.length(), text);
       }
 
       this.cache = {};
     }
 
     let block = this;
     lines.reduce((lineIndex, line) => {
       block = block.split(lineIndex, true);
       block.insertAt(0, line);
       return line.length;
     }, index + text.length);
   }
 
   insertBefore(blot, ref) {
     const {
       head
     } = this.children;
     super.insertBefore(blot, ref);
 
     if (head instanceof _break__WEBPACK_IMPORTED_MODULE_3__["default"]) {
       head.remove();
     }
 
     this.cache = {};
   }
 
   length() {
     if (this.cache.length == null) {
       this.cache.length = super.length() + NEWLINE_LENGTH;
     }
 
     return this.cache.length;
   }
 
   moveChildren(target, ref) {
     super.moveChildren(target, ref);
     this.cache = {};
   }
 
   optimize(context) {
     super.optimize(context);
     this.cache = {};
   }
 
   path(index) {
     return super.path(index, true);
   }
 
   removeChild(child) {
     super.removeChild(child);
     this.cache = {};
   }
 
   split(index, force = false) {
     if (force && (index === 0 || index >= this.length() - NEWLINE_LENGTH)) {
       const clone = this.clone();
 
       if (index === 0) {
         this.parent.insertBefore(clone, this);
         return this;
       }
 
       this.parent.insertBefore(clone, this.next);
       return clone;
     }
 
     const next = super.split(index, force);
     this.cache = {};
     return next;
   }
 
 }
 
 Block.blotName = 'block';
 Block.tagName = 'P';
 Block.defaultChild = _break__WEBPACK_IMPORTED_MODULE_3__["default"];
 Block.allowedChildren = [_break__WEBPACK_IMPORTED_MODULE_3__["default"], _inline__WEBPACK_IMPORTED_MODULE_4__["default"], parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"], _text__WEBPACK_IMPORTED_MODULE_5__["default"]];
 
 class BlockEmbed extends parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"] {
   attach() {
     super.attach();
     this.attributes = new parchment__WEBPACK_IMPORTED_MODULE_2__["AttributorStore"](this.domNode);
   }
 
   delta() {
     return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(this.value(), extend__WEBPACK_IMPORTED_MODULE_0___default()(this.formats(), this.attributes.values()));
   }
 
   format(name, value) {
     const attribute = this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK_ATTRIBUTE);
 
     if (attribute != null) {
       this.attributes.attribute(attribute, value);
     }
   }
 
   formatAt(index, length, name, value) {
     this.format(name, value);
   }
 
   insertAt(index, value, def) {
     if (typeof value === 'string' && value.endsWith('\n')) {
       const block = this.scroll.create(Block.blotName);
       this.parent.insertBefore(block, index === 0 ? this : this.next);
       block.insertAt(0, value.slice(0, -1));
     } else {
       super.insertAt(index, value, def);
     }
   }
 
 }
 
 BlockEmbed.scope = parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK_BLOT; // It is important for cursor behavior BlockEmbeds use tags that are block level elements
 
 function blockDelta(blot, filter = true) {
   return blot.descendants(parchment__WEBPACK_IMPORTED_MODULE_2__["LeafBlot"]).reduce((delta, leaf) => {
     if (leaf.length() === 0) {
       return delta;
     }
 
     return delta.insert(leaf.value(), bubbleFormats(leaf, {}, filter));
   }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a()).insert('\n', bubbleFormats(blot));
 }
 
 function bubbleFormats(blot, formats = {}, filter = true) {
   if (blot == null) return formats;
 
   if (typeof blot.formats === 'function') {
     formats = extend__WEBPACK_IMPORTED_MODULE_0___default()(formats, blot.formats());
 
     if (filter) {
       // exclude syntax highlighting from deltas and getFormat()
       delete formats['code-token'];
     }
   }
 
   if (blot.parent == null || blot.parent.statics.blotName === 'scroll' || blot.parent.statics.scope !== blot.statics.scope) {
     return formats;
   }
 
   return bubbleFormats(blot.parent, formats, filter);
 }
 
 
 
 /***/ }),
 
 /***/ "./blots/break.js":
 /*!************************!*\
   !*** ./blots/break.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 
 class Break extends parchment__WEBPACK_IMPORTED_MODULE_0__["EmbedBlot"] {
   static value() {
     return undefined;
   }
 
   optimize() {
     if (this.prev || this.next) {
       this.remove();
     }
   }
 
   length() {
     return 0;
   }
 
   value() {
     return '';
   }
 
 }
 
 Break.blotName = 'break';
 Break.tagName = 'BR';
 /* harmony default export */ __webpack_exports__["default"] = (Break);
 
 /***/ }),
 
 /***/ "./blots/container.js":
 /*!****************************!*\
   !*** ./blots/container.js ***!
   \****************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 
 class Container extends parchment__WEBPACK_IMPORTED_MODULE_0__["ContainerBlot"] {}
 
 /* harmony default export */ __webpack_exports__["default"] = (Container);
 
 /***/ }),
 
 /***/ "./blots/cursor.js":
 /*!*************************!*\
   !*** ./blots/cursor.js ***!
   \*************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _text__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./text */ "./blots/text.js");
 
 
 
 class Cursor extends parchment__WEBPACK_IMPORTED_MODULE_0__["EmbedBlot"] {
   static value() {
     return undefined;
   }
 
   constructor(scroll, domNode, selection) {
     super(scroll, domNode);
     this.selection = selection;
     this.textNode = document.createTextNode(Cursor.CONTENTS);
     this.domNode.appendChild(this.textNode);
     this.savedLength = 0;
   }
 
   detach() {
     // super.detach() will also clear domNode.__blot
     if (this.parent != null) this.parent.removeChild(this);
   }
 
   format(name, value) {
     if (this.savedLength !== 0) {
       super.format(name, value);
       return;
     }
 
     let target = this;
     let index = 0;
 
     while (target != null && target.statics.scope !== parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK_BLOT) {
       index += target.offset(target.parent);
       target = target.parent;
     }
 
     if (target != null) {
       this.savedLength = Cursor.CONTENTS.length;
       target.optimize();
       target.formatAt(index, Cursor.CONTENTS.length, name, value);
       this.savedLength = 0;
     }
   }
 
   index(node, offset) {
     if (node === this.textNode) return 0;
     return super.index(node, offset);
   }
 
   length() {
     return this.savedLength;
   }
 
   position() {
     return [this.textNode, this.textNode.data.length];
   }
 
   remove() {
     super.remove();
     this.parent = null;
   }
 
   restore() {
     if (this.selection.composing || this.parent == null) return null;
     const range = this.selection.getNativeRange(); // Link format will insert text outside of anchor tag
 
     while (this.domNode.lastChild != null && this.domNode.lastChild !== this.textNode) {
       this.domNode.parentNode.insertBefore(this.domNode.lastChild, this.domNode);
     }
 
     const prevTextBlot = this.prev instanceof _text__WEBPACK_IMPORTED_MODULE_1__["default"] ? this.prev : null;
     const prevTextLength = prevTextBlot ? prevTextBlot.length() : 0;
     const nextTextBlot = this.next instanceof _text__WEBPACK_IMPORTED_MODULE_1__["default"] ? this.next : null;
     const nextText = nextTextBlot ? nextTextBlot.text : '';
     const {
       textNode
     } = this; // take text from inside this blot and reset it
 
     const newText = textNode.data.split(Cursor.CONTENTS).join('');
     textNode.data = Cursor.CONTENTS; // proactively merge TextBlots around cursor so that optimization
     // doesn't lose the cursor.  the reason we are here in cursor.restore
     // could be that the user clicked in prevTextBlot or nextTextBlot, or
     // the user typed something.
 
     let mergedTextBlot;
 
     if (prevTextBlot) {
       mergedTextBlot = prevTextBlot;
 
       if (newText || nextTextBlot) {
         prevTextBlot.insertAt(prevTextBlot.length(), newText + nextText);
 
         if (nextTextBlot) {
           nextTextBlot.remove();
         }
       }
     } else if (nextTextBlot) {
       mergedTextBlot = nextTextBlot;
       nextTextBlot.insertAt(0, newText);
     } else {
       const newTextNode = document.createTextNode(newText);
       mergedTextBlot = this.scroll.create(newTextNode);
       this.parent.insertBefore(mergedTextBlot, this);
     }
 
     this.remove();
 
     if (range) {
       // calculate selection to restore
       const remapOffset = (node, offset) => {
         if (prevTextBlot && node === prevTextBlot.domNode) {
           return offset;
         }
 
         if (node === textNode) {
           return prevTextLength + offset - 1;
         }
 
         if (nextTextBlot && node === nextTextBlot.domNode) {
           return prevTextLength + newText.length + offset;
         }
 
         return null;
       };
 
       const start = remapOffset(range.start.node, range.start.offset);
       const end = remapOffset(range.end.node, range.end.offset);
 
       if (start !== null && end !== null) {
         return {
           startNode: mergedTextBlot.domNode,
           startOffset: start,
           endNode: mergedTextBlot.domNode,
           endOffset: end
         };
       }
     }
 
     return null;
   }
 
   update(mutations, context) {
     if (mutations.some(mutation => {
       return mutation.type === 'characterData' && mutation.target === this.textNode;
     })) {
       const range = this.restore();
       if (range) context.range = range;
     }
   }
 
   value() {
     return '';
   }
 
 }
 
 Cursor.blotName = 'cursor';
 Cursor.className = 'ql-cursor';
 Cursor.tagName = 'span';
 Cursor.CONTENTS = '\uFEFF'; // Zero width no break space
 
 /* harmony default export */ __webpack_exports__["default"] = (Cursor);
 
 /***/ }),
 
 /***/ "./blots/embed.js":
 /*!************************!*\
   !*** ./blots/embed.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _text__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./text */ "./blots/text.js");
 
 
 const GUARD_TEXT = '\uFEFF';
 
 class Embed extends parchment__WEBPACK_IMPORTED_MODULE_0__["EmbedBlot"] {
   constructor(scroll, node) {
     super(scroll, node);
     this.contentNode = document.createElement('span');
     this.contentNode.setAttribute('contenteditable', false);
     Array.from(this.domNode.childNodes).forEach(childNode => {
       this.contentNode.appendChild(childNode);
     });
     this.leftGuard = document.createTextNode(GUARD_TEXT);
     this.rightGuard = document.createTextNode(GUARD_TEXT);
     this.domNode.appendChild(this.leftGuard);
     this.domNode.appendChild(this.contentNode);
     this.domNode.appendChild(this.rightGuard);
   }
 
   index(node, offset) {
     if (node === this.leftGuard) return 0;
     if (node === this.rightGuard) return 1;
     return super.index(node, offset);
   }
 
   restore(node) {
     let range;
     let textNode;
     const text = node.data.split(GUARD_TEXT).join('');
 
     if (node === this.leftGuard) {
       if (this.prev instanceof _text__WEBPACK_IMPORTED_MODULE_1__["default"]) {
         const prevLength = this.prev.length();
         this.prev.insertAt(prevLength, text);
         range = {
           startNode: this.prev.domNode,
           startOffset: prevLength + text.length
         };
       } else {
         textNode = document.createTextNode(text);
         this.parent.insertBefore(this.scroll.create(textNode), this);
         range = {
           startNode: textNode,
           startOffset: text.length
         };
       }
     } else if (node === this.rightGuard) {
       if (this.next instanceof _text__WEBPACK_IMPORTED_MODULE_1__["default"]) {
         this.next.insertAt(0, text);
         range = {
           startNode: this.next.domNode,
           startOffset: text.length
         };
       } else {
         textNode = document.createTextNode(text);
         this.parent.insertBefore(this.scroll.create(textNode), this.next);
         range = {
           startNode: textNode,
           startOffset: text.length
         };
       }
     }
 
     node.data = GUARD_TEXT;
     return range;
   }
 
   update(mutations, context) {
     mutations.forEach(mutation => {
       if (mutation.type === 'characterData' && (mutation.target === this.leftGuard || mutation.target === this.rightGuard)) {
         const range = this.restore(mutation.target);
         if (range) context.range = range;
       }
     });
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (Embed);
 
 /***/ }),
 
 /***/ "./blots/inline.js":
 /*!*************************!*\
   !*** ./blots/inline.js ***!
   \*************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _break__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./break */ "./blots/break.js");
 /* harmony import */ var _text__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./text */ "./blots/text.js");
 
 
 
 
 class Inline extends parchment__WEBPACK_IMPORTED_MODULE_0__["InlineBlot"] {
   static compare(self, other) {
     const selfIndex = Inline.order.indexOf(self);
     const otherIndex = Inline.order.indexOf(other);
 
     if (selfIndex >= 0 || otherIndex >= 0) {
       return selfIndex - otherIndex;
     }
 
     if (self === other) {
       return 0;
     }
 
     if (self < other) {
       return -1;
     }
 
     return 1;
   }
 
   formatAt(index, length, name, value) {
     if (Inline.compare(this.statics.blotName, name) < 0 && this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOT)) {
       const blot = this.isolate(index, length);
 
       if (value) {
         blot.wrap(name, value);
       }
     } else {
       super.formatAt(index, length, name, value);
     }
   }
 
   optimize(context) {
     super.optimize(context);
 
     if (this.parent instanceof Inline && Inline.compare(this.statics.blotName, this.parent.statics.blotName) > 0) {
       const parent = this.parent.isolate(this.offset(), this.length());
       this.moveChildren(parent);
       parent.wrap(this);
     }
   }
 
 }
 
 Inline.allowedChildren = [Inline, _break__WEBPACK_IMPORTED_MODULE_1__["default"], parchment__WEBPACK_IMPORTED_MODULE_0__["EmbedBlot"], _text__WEBPACK_IMPORTED_MODULE_2__["default"]]; // Lower index means deeper in the DOM tree, since not found (-1) is for embeds
 
 Inline.order = ['cursor', 'inline', // Must be lower
 'link', // Chrome wants <a> to be lower
 'underline', 'strike', 'italic', 'bold', 'script', 'code' // Must be higher
 ];
 /* harmony default export */ __webpack_exports__["default"] = (Inline);
 
 /***/ }),
 
 /***/ "./blots/scroll.js":
 /*!*************************!*\
   !*** ./blots/scroll.js ***!
   \*************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _core_emitter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/emitter */ "./core/emitter.js");
 /* harmony import */ var _block__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./block */ "./blots/block.js");
 /* harmony import */ var _break__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./break */ "./blots/break.js");
 /* harmony import */ var _container__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./container */ "./blots/container.js");
 
 
 
 
 
 
 function isLine(blot) {
   return blot instanceof _block__WEBPACK_IMPORTED_MODULE_2__["default"] || blot instanceof _block__WEBPACK_IMPORTED_MODULE_2__["BlockEmbed"];
 }
 
 class Scroll extends parchment__WEBPACK_IMPORTED_MODULE_0__["ScrollBlot"] {
   constructor(registry, domNode, {
     emitter
   }) {
     super(registry, domNode);
     this.emitter = emitter;
     this.batch = false;
     this.optimize();
     this.enable();
     this.domNode.addEventListener('dragstart', e => this.handleDragStart(e));
   }
 
   batchStart() {
     if (!Array.isArray(this.batch)) {
       this.batch = [];
     }
   }
 
   batchEnd() {
     const mutations = this.batch;
     this.batch = false;
     this.update(mutations);
   }
 
   emitMount(blot) {
     this.emitter.emit(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_BLOT_MOUNT, blot);
   }
 
   emitUnmount(blot) {
     this.emitter.emit(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_BLOT_UNMOUNT, blot);
   }
 
   deleteAt(index, length) {
     const [first, offset] = this.line(index);
     const [last] = this.line(index + length);
     super.deleteAt(index, length);
 
     if (last != null && first !== last && offset > 0) {
       if (first instanceof _block__WEBPACK_IMPORTED_MODULE_2__["BlockEmbed"] || last instanceof _block__WEBPACK_IMPORTED_MODULE_2__["BlockEmbed"]) {
         this.optimize();
         return;
       }
 
       const ref = last.children.head instanceof _break__WEBPACK_IMPORTED_MODULE_3__["default"] ? null : last.children.head;
       first.moveChildren(last, ref);
       first.remove();
     }
 
     this.optimize();
   }
 
   enable(enabled = true) {
     this.domNode.setAttribute('contenteditable', enabled);
   }
 
   formatAt(index, length, format, value) {
     super.formatAt(index, length, format, value);
     this.optimize();
   }
 
   handleDragStart(event) {
     event.preventDefault();
   }
 
   insertAt(index, value, def) {
     if (index >= this.length()) {
       if (def == null || this.scroll.query(value, parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK) == null) {
         const blot = this.scroll.create(this.statics.defaultChild.blotName);
         this.appendChild(blot);
 
         if (def == null && value.endsWith('\n')) {
           blot.insertAt(0, value.slice(0, -1), def);
         } else {
           blot.insertAt(0, value, def);
         }
       } else {
         const embed = this.scroll.create(value, def);
         this.appendChild(embed);
       }
     } else {
       super.insertAt(index, value, def);
     }
 
     this.optimize();
   }
 
   insertBefore(blot, ref) {
     if (blot.statics.scope === parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE_BLOT) {
       const wrapper = this.scroll.create(this.statics.defaultChild.blotName);
       wrapper.appendChild(blot);
       super.insertBefore(wrapper, ref);
     } else {
       super.insertBefore(blot, ref);
     }
   }
 
   isEnabled() {
     return this.domNode.getAttribute('contenteditable') === 'true';
   }
 
   leaf(index) {
     return this.path(index).pop() || [null, -1];
   }
 
   line(index) {
     if (index === this.length()) {
       return this.line(index - 1);
     }
 
     return this.descendant(isLine, index);
   }
 
   lines(index = 0, length = Number.MAX_VALUE) {
     const getLines = (blot, blotIndex, blotLength) => {
       let lines = [];
       let lengthLeft = blotLength;
       blot.children.forEachAt(blotIndex, blotLength, (child, childIndex, childLength) => {
         if (isLine(child)) {
           lines.push(child);
         } else if (child instanceof parchment__WEBPACK_IMPORTED_MODULE_0__["ContainerBlot"]) {
           lines = lines.concat(getLines(child, childIndex, lengthLeft));
         }
 
         lengthLeft -= childLength;
       });
       return lines;
     };
 
     return getLines(this, index, length);
   }
 
   optimize(mutations = [], context = {}) {
     if (this.batch) return;
     super.optimize(mutations, context);
 
     if (mutations.length > 0) {
       this.emitter.emit(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_OPTIMIZE, mutations, context);
     }
   }
 
   path(index) {
     return super.path(index).slice(1); // Exclude self
   }
 
   remove() {// Never remove self
   }
 
   update(mutations) {
     if (this.batch) {
       if (Array.isArray(mutations)) {
         this.batch = this.batch.concat(mutations);
       }
 
       return;
     }
 
     let source = _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER;
 
     if (typeof mutations === 'string') {
       source = mutations;
     }
 
     if (!Array.isArray(mutations)) {
       mutations = this.observer.takeRecords();
     }
 
     if (mutations.length > 0) {
       this.emitter.emit(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_BEFORE_UPDATE, source, mutations);
     }
 
     super.update(mutations.concat([])); // pass copy
 
     if (mutations.length > 0) {
       this.emitter.emit(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_UPDATE, source, mutations);
     }
   }
 
 }
 
 Scroll.blotName = 'scroll';
 Scroll.className = 'ql-editor';
 Scroll.tagName = 'DIV';
 Scroll.defaultChild = _block__WEBPACK_IMPORTED_MODULE_2__["default"];
 Scroll.allowedChildren = [_block__WEBPACK_IMPORTED_MODULE_2__["default"], _block__WEBPACK_IMPORTED_MODULE_2__["BlockEmbed"], _container__WEBPACK_IMPORTED_MODULE_4__["default"]];
 /* harmony default export */ __webpack_exports__["default"] = (Scroll);
 
 /***/ }),
 
 /***/ "./blots/text.js":
 /*!***********************!*\
   !*** ./blots/text.js ***!
   \***********************/
 /*! exports provided: default, escapeText */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Text; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "escapeText", function() { return escapeText; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 
 class Text extends parchment__WEBPACK_IMPORTED_MODULE_0__["TextBlot"] {}
 
 function escapeText(text) {
   return text.replace(/[&<>"']/g, s => {
     // https://lodash.com/docs#escape
     const entityMap = {
       '&': '&amp;',
       '<': '&lt;',
       '>': '&gt;',
       '"': '&quot;',
       "'": '&#39;'
     };
     return entityMap[s];
   });
 }
 
 
 
 /***/ }),
 
 /***/ "./core.js":
 /*!*****************!*\
   !*** ./core.js ***!
   \*****************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core/quill */ "./core/quill.js");
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_break__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./blots/break */ "./blots/break.js");
 /* harmony import */ var _blots_container__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./blots/container */ "./blots/container.js");
 /* harmony import */ var _blots_cursor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./blots/cursor */ "./blots/cursor.js");
 /* harmony import */ var _blots_embed__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./blots/embed */ "./blots/embed.js");
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./blots/inline */ "./blots/inline.js");
 /* harmony import */ var _blots_scroll__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./blots/scroll */ "./blots/scroll.js");
 /* harmony import */ var _blots_text__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./blots/text */ "./blots/text.js");
 /* harmony import */ var _modules_clipboard__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./modules/clipboard */ "./modules/clipboard.js");
 /* harmony import */ var _modules_history__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./modules/history */ "./modules/history.js");
 /* harmony import */ var _modules_keyboard__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./modules/keyboard */ "./modules/keyboard.js");
 /* harmony import */ var _modules_uploader__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./modules/uploader */ "./modules/uploader.js");
 
 
 
 
 
 
 
 
 
 
 
 
 
 _core_quill__WEBPACK_IMPORTED_MODULE_0__["default"].register({
   'blots/block': _blots_block__WEBPACK_IMPORTED_MODULE_1__["default"],
   'blots/block/embed': _blots_block__WEBPACK_IMPORTED_MODULE_1__["BlockEmbed"],
   'blots/break': _blots_break__WEBPACK_IMPORTED_MODULE_2__["default"],
   'blots/container': _blots_container__WEBPACK_IMPORTED_MODULE_3__["default"],
   'blots/cursor': _blots_cursor__WEBPACK_IMPORTED_MODULE_4__["default"],
   'blots/embed': _blots_embed__WEBPACK_IMPORTED_MODULE_5__["default"],
   'blots/inline': _blots_inline__WEBPACK_IMPORTED_MODULE_6__["default"],
   'blots/scroll': _blots_scroll__WEBPACK_IMPORTED_MODULE_7__["default"],
   'blots/text': _blots_text__WEBPACK_IMPORTED_MODULE_8__["default"],
   'modules/clipboard': _modules_clipboard__WEBPACK_IMPORTED_MODULE_9__["default"],
   'modules/history': _modules_history__WEBPACK_IMPORTED_MODULE_10__["default"],
   'modules/keyboard': _modules_keyboard__WEBPACK_IMPORTED_MODULE_11__["default"],
   'modules/uploader': _modules_uploader__WEBPACK_IMPORTED_MODULE_12__["default"]
 });
 /* harmony default export */ __webpack_exports__["default"] = (_core_quill__WEBPACK_IMPORTED_MODULE_0__["default"]);
 
 /***/ }),
 
 /***/ "./core/editor.js":
 /*!************************!*\
   !*** ./core/editor.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! clone */ "./node_modules/clone/clone.js");
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(clone__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js");
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(deep_equal__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_3__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _selection__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./selection */ "./core/selection.js");
 /* harmony import */ var _blots_cursor__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../blots/cursor */ "./blots/cursor.js");
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_break__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../blots/break */ "./blots/break.js");
 /* harmony import */ var _blots_text__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../blots/text */ "./blots/text.js");
 
 
 
 
 
 
 
 
 
 
 const ASCII = /^[ -~]*$/;
 
 class Editor {
   constructor(scroll) {
     this.scroll = scroll;
     this.delta = this.getDelta();
   }
 
   applyDelta(delta) {
     let consumeNextNewline = false;
     this.scroll.update();
     let scrollLength = this.scroll.length();
     this.scroll.batchStart();
     const normalizedDelta = normalizeDelta(delta);
     normalizedDelta.reduce((index, op) => {
       const length = op.retain || op.delete || op.insert.length || 1;
       let attributes = op.attributes || {};
 
       if (op.insert != null) {
         if (typeof op.insert === 'string') {
           let text = op.insert;
 
           if (text.endsWith('\n') && consumeNextNewline) {
             consumeNextNewline = false;
             text = text.slice(0, -1);
           }
 
           if ((index >= scrollLength || this.scroll.descendant(_blots_block__WEBPACK_IMPORTED_MODULE_7__["BlockEmbed"], index)[0]) && !text.endsWith('\n')) {
             consumeNextNewline = true;
           }
 
           this.scroll.insertAt(index, text);
           const [line, offset] = this.scroll.line(index);
           let formats = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(line));
 
           if (line instanceof _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"]) {
             const [leaf] = line.descendant(parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"], offset);
             formats = extend__WEBPACK_IMPORTED_MODULE_2___default()(formats, Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(leaf));
           }
 
           attributes = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(formats, attributes) || {};
         } else if (typeof op.insert === 'object') {
           const key = Object.keys(op.insert)[0]; // There should only be one key
 
           if (key == null) return index;
           this.scroll.insertAt(index, key, op.insert[key]);
         }
 
         scrollLength += length;
       }
 
       Object.keys(attributes).forEach(name => {
         this.scroll.formatAt(index, length, name, attributes[name]);
       });
       return index + length;
     }, 0);
     normalizedDelta.reduce((index, op) => {
       if (typeof op.delete === 'number') {
         this.scroll.deleteAt(index, op.delete);
         return index;
       }
 
       return index + (op.retain || op.insert.length || 1);
     }, 0);
     this.scroll.batchEnd();
     this.scroll.optimize();
     return this.update(normalizedDelta);
   }
 
   deleteText(index, length) {
     this.scroll.deleteAt(index, length);
     return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).delete(length));
   }
 
   formatLine(index, length, formats = {}) {
     this.scroll.update();
     Object.keys(formats).forEach(format => {
       this.scroll.lines(index, Math.max(length, 1)).forEach(line => {
         line.format(format, formats[format]);
       });
     });
     this.scroll.optimize();
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).retain(length, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats));
     return this.update(delta);
   }
 
   formatText(index, length, formats = {}) {
     Object.keys(formats).forEach(format => {
       this.scroll.formatAt(index, length, format, formats[format]);
     });
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).retain(length, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats));
     return this.update(delta);
   }
 
   getContents(index, length) {
     return this.delta.slice(index, index + length);
   }
 
   getDelta() {
     return this.scroll.lines().reduce((delta, line) => {
       return delta.concat(line.delta());
     }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
   }
 
   getFormat(index, length = 0) {
     let lines = [];
     let leaves = [];
 
     if (length === 0) {
       this.scroll.path(index).forEach(path => {
         const [blot] = path;
 
         if (blot instanceof _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"]) {
           lines.push(blot);
         } else if (blot instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"]) {
           leaves.push(blot);
         }
       });
     } else {
       lines = this.scroll.lines(index, length);
       leaves = this.scroll.descendants(parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"], index, length);
     }
 
     const formatsArr = [lines, leaves].map(blots => {
       if (blots.length === 0) return {};
       let formats = Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(blots.shift());
 
       while (Object.keys(formats).length > 0) {
         const blot = blots.shift();
         if (blot == null) return formats;
         formats = combineFormats(Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(blot), formats);
       }
 
       return formats;
     });
     return extend__WEBPACK_IMPORTED_MODULE_2___default.a.apply(extend__WEBPACK_IMPORTED_MODULE_2___default.a, formatsArr);
   }
 
   getHTML(index, length) {
     const [line, lineOffset] = this.scroll.line(index);
 
     if (line.length() >= lineOffset + length) {
       return convertHTML(line, lineOffset, length, true);
     }
 
     return convertHTML(this.scroll, index, length, true);
   }
 
   getText(index, length) {
     return this.getContents(index, length).filter(op => typeof op.insert === 'string').map(op => op.insert).join('');
   }
 
   insertEmbed(index, embed, value) {
     this.scroll.insertAt(index, embed, value);
     return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert({
       [embed]: value
     }));
   }
 
   insertText(index, text, formats = {}) {
     text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
     this.scroll.insertAt(index, text);
     Object.keys(formats).forEach(format => {
       this.scroll.formatAt(index, text.length, format, formats[format]);
     });
     return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert(text, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats)));
   }
 
   isBlank() {
     if (this.scroll.children.length === 0) return true;
     if (this.scroll.children.length > 1) return false;
     const block = this.scroll.children.head;
     if (block.statics.blotName !== _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"].blotName) return false;
     if (block.children.length > 1) return false;
     return block.children.head instanceof _blots_break__WEBPACK_IMPORTED_MODULE_8__["default"];
   }
 
   removeFormat(index, length) {
     const text = this.getText(index, length);
     const [line, offset] = this.scroll.line(index + length);
     let suffixLength = 0;
     let suffix = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a();
 
     if (line != null) {
       suffixLength = line.length() - offset;
       suffix = line.delta().slice(offset, offset + suffixLength - 1).insert('\n');
     }
 
     const contents = this.getContents(index, length + suffixLength);
     const diff = contents.diff(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(text).concat(suffix));
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).concat(diff);
     return this.applyDelta(delta);
   }
 
   update(change, mutations = [], selectionInfo = undefined) {
     const oldDelta = this.delta;
 
     if (mutations.length === 1 && mutations[0].type === 'characterData' && mutations[0].target.data.match(ASCII) && this.scroll.find(mutations[0].target)) {
       // Optimization for character changes
       const textBlot = this.scroll.find(mutations[0].target);
       const formats = Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(textBlot);
       const index = textBlot.offset(this.scroll);
       const oldValue = mutations[0].oldValue.replace(_blots_cursor__WEBPACK_IMPORTED_MODULE_6__["default"].CONTENTS, '');
       const oldText = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(oldValue);
       const newText = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(textBlot.value());
       const relativeSelectionInfo = selectionInfo && {
         oldRange: shiftRange(selectionInfo.oldRange, -index),
         newRange: shiftRange(selectionInfo.newRange, -index)
       };
       const diffDelta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).concat(oldText.diff(newText, relativeSelectionInfo));
       change = diffDelta.reduce((delta, op) => {
         if (op.insert) {
           return delta.insert(op.insert, formats);
         }
 
         return delta.push(op);
       }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
       this.delta = oldDelta.compose(change);
     } else {
       this.delta = this.getDelta();
 
       if (!change || !deep_equal__WEBPACK_IMPORTED_MODULE_1___default()(oldDelta.compose(change), this.delta)) {
         change = oldDelta.diff(this.delta, selectionInfo);
       }
     }
 
     return change;
   }
 
 }
 
 function convertListHTML(items, lastIndent, types) {
   if (items.length === 0) {
     const [endTag] = getListType(types.pop());
 
     if (lastIndent <= 0) {
       return "</li></".concat(endTag, ">");
     }
 
     return "</li></".concat(endTag, ">").concat(convertListHTML([], lastIndent - 1, types));
   }
 
   const [{
     child,
     offset,
     length,
     indent,
     type
   }, ...rest] = items;
   const [tag, attribute] = getListType(type);
 
   if (indent > lastIndent) {
     types.push(type);
 
     if (indent === lastIndent + 1) {
       return "<".concat(tag, "><li").concat(attribute, ">").concat(convertHTML(child, offset, length)).concat(convertListHTML(rest, indent, types));
     }
 
     return "<".concat(tag, "><li>").concat(convertListHTML(items, lastIndent + 1, types));
   }
 
   const previousType = types[types.length - 1];
 
   if (indent === lastIndent && type === previousType) {
     return "</li><li".concat(attribute, ">").concat(convertHTML(child, offset, length)).concat(convertListHTML(rest, indent, types));
   }
 
   const [endTag] = getListType(types.pop());
   return "</li></".concat(endTag, ">").concat(convertListHTML(items, lastIndent - 1, types));
 }
 
 function convertHTML(blot, index, length, isRoot = false) {
   if (typeof blot.html === 'function') {
     return blot.html(index, length);
   }
 
   if (blot instanceof _blots_text__WEBPACK_IMPORTED_MODULE_9__["default"]) {
     return Object(_blots_text__WEBPACK_IMPORTED_MODULE_9__["escapeText"])(blot.value().slice(index, index + length));
   }
 
   if (blot.children) {
     // TODO fix API
     if (blot.statics.blotName === 'list-container') {
       const items = [];
       blot.children.forEachAt(index, length, (child, offset, childLength) => {
         const formats = child.formats();
         items.push({
           child,
           offset,
           length: childLength,
           indent: formats.indent || 0,
           type: formats.list
         });
       });
       return convertListHTML(items, -1, []);
     }
 
     const parts = [];
     blot.children.forEachAt(index, length, (child, offset, childLength) => {
       parts.push(convertHTML(child, offset, childLength));
     });
 
     if (isRoot || blot.statics.blotName === 'list') {
       return parts.join('');
     }
 
     const {
       outerHTML,
       innerHTML
     } = blot.domNode;
     const [start, end] = outerHTML.split(">".concat(innerHTML, "<")); // TODO cleanup
 
     if (start === '<table') {
       return "<table style=\"border: 1px solid #000;\">".concat(parts.join(''), "<").concat(end);
     }
 
     return "".concat(start, ">").concat(parts.join(''), "<").concat(end);
   }
 
   return blot.domNode.outerHTML;
 }
 
 function combineFormats(formats, combined) {
   return Object.keys(combined).reduce((merged, name) => {
     if (formats[name] == null) return merged;
 
     if (combined[name] === formats[name]) {
       merged[name] = combined[name];
     } else if (Array.isArray(combined[name])) {
       if (combined[name].indexOf(formats[name]) < 0) {
         merged[name] = combined[name].concat([formats[name]]);
       }
     } else {
       merged[name] = [combined[name], formats[name]];
     }
 
     return merged;
   }, {});
 }
 
 function getListType(type) {
   const tag = type === 'ordered' ? 'ol' : 'ul';
 
   switch (type) {
     case 'checked':
       return [tag, ' data-list="checked"'];
 
     case 'unchecked':
       return [tag, ' data-list="unchecked"'];
 
     default:
       return [tag, ''];
   }
 }
 
 function normalizeDelta(delta) {
   return delta.reduce((normalizedDelta, op) => {
     if (typeof op.insert === 'string') {
       const text = op.insert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
       return normalizedDelta.insert(text, op.attributes);
     }
 
     return normalizedDelta.push(op);
   }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
 }
 
 function shiftRange({
   index,
   length
 }, amount) {
   return new _selection__WEBPACK_IMPORTED_MODULE_5__["Range"](index + amount, length);
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (Editor);
 
 /***/ }),
 
 /***/ "./core/emitter.js":
 /*!*************************!*\
   !*** ./core/emitter.js ***!
   \*************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! eventemitter3 */ "./node_modules/eventemitter3/index.js");
 /* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(eventemitter3__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logger */ "./core/logger.js");
 /* harmony import */ var _shadow_selection_polyfill__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./shadow-selection-polyfill */ "./core/shadow-selection-polyfill.js");
 
 
 
 const debug = Object(_logger__WEBPACK_IMPORTED_MODULE_1__["default"])('quill:events');
 const EVENTS = [_shadow_selection_polyfill__WEBPACK_IMPORTED_MODULE_2__["SHADOW_SELECTIONCHANGE"], 'mousedown', 'mouseup', 'click'];
 const EMITTERS = [];
 const supportsRootNode = ('getRootNode' in document);
 EVENTS.forEach(eventName => {
   document.addEventListener(eventName, (...args) => {
     EMITTERS.forEach(em => {
       em.handleDOM(...args);
     });
   });
 });
 
 class Emitter extends eventemitter3__WEBPACK_IMPORTED_MODULE_0___default.a {
   constructor() {
     super();
     this.listeners = {};
     EMITTERS.push(this);
     this.on('error', debug.error);
   }
 
   emit(...args) {
     debug.log.call(debug, ...args);
     super.emit(...args);
   }
 
   handleDOM(event, ...args) {
     const target = event.composedPath ? event.composedPath()[0] : event.target;
 
     const containsNode = (node, srcTarget) => {
       if (!supportsRootNode || srcTarget.getRootNode() === document) {
         return node.contains(srcTarget);
       }
 
       while (!node.contains(srcTarget)) {
         const root = srcTarget.getRootNode();
 
         if (!root || !root.host) {
           return false;
         }
 
         srcTarget = root.host;
       }
 
       return true;
     };
 
     (this.listeners[event.type] || []).forEach(({
       node,
       handler
     }) => {
       if (target === node || containsNode(node, target)) {
         handler(event, ...args);
       }
     });
   }
 
   listenDOM(eventName, node, handler) {
     if (!this.listeners[eventName]) {
       this.listeners[eventName] = [];
     }
 
     this.listeners[eventName].push({
       node,
       handler
     });
   }
 
 }
 
 Emitter.events = {
   EDITOR_CHANGE: 'editor-change',
   SCROLL_BEFORE_UPDATE: 'scroll-before-update',
   SCROLL_BLOT_MOUNT: 'scroll-blot-mount',
   SCROLL_BLOT_UNMOUNT: 'scroll-blot-unmount',
   SCROLL_OPTIMIZE: 'scroll-optimize',
   SCROLL_UPDATE: 'scroll-update',
   SELECTION_CHANGE: 'selection-change',
   TEXT_CHANGE: 'text-change'
 };
 Emitter.sources = {
   API: 'api',
   SILENT: 'silent',
   USER: 'user'
 };
 /* harmony default export */ __webpack_exports__["default"] = (Emitter);
 
 /***/ }),
 
 /***/ "./core/instances.js":
 /*!***************************!*\
   !*** ./core/instances.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony default export */ __webpack_exports__["default"] = (new WeakMap());
 
 /***/ }),
 
 /***/ "./core/logger.js":
 /*!************************!*\
   !*** ./core/logger.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 const levels = ['error', 'warn', 'log', 'info'];
 let level = 'warn';
 
 function debug(method, ...args) {
   if (levels.indexOf(method) <= levels.indexOf(level)) {
     console[method](...args); // eslint-disable-line no-console
   }
 }
 
 function namespace(ns) {
   return levels.reduce((logger, method) => {
     logger[method] = debug.bind(console, method, ns);
     return logger;
   }, {});
 }
 
 namespace.level = newLevel => {
   level = newLevel;
 };
 
 debug.level = namespace.level;
 /* harmony default export */ __webpack_exports__["default"] = (namespace);
 
 /***/ }),
 
 /***/ "./core/module.js":
 /*!************************!*\
   !*** ./core/module.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 class Module {
   constructor(quill, options = {}) {
     this.quill = quill;
     this.options = options;
   }
 
 }
 
 Module.DEFAULTS = {};
 /* harmony default export */ __webpack_exports__["default"] = (Module);
 
 /***/ }),
 
 /***/ "./core/quill.js":
 /*!***********************!*\
   !*** ./core/quill.js ***!
   \***********************/
 /*! exports provided: globalRegistry, expandConfig, overload, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "globalRegistry", function() { return globalRegistry; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "expandConfig", function() { return expandConfig; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "overload", function() { return overload; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Quill; });
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
 /* harmony import */ var _editor__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./editor */ "./core/editor.js");
 /* harmony import */ var _emitter__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./emitter */ "./core/emitter.js");
 /* harmony import */ var _module__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./module */ "./core/module.js");
 /* harmony import */ var _selection__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./selection */ "./core/selection.js");
 /* harmony import */ var _instances__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./instances */ "./core/instances.js");
 /* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./logger */ "./core/logger.js");
 /* harmony import */ var _theme__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./theme */ "./core/theme.js");
 
 
 
 
 
 
 
 
 
 
 const debug = Object(_logger__WEBPACK_IMPORTED_MODULE_8__["default"])('quill');
 const globalRegistry = new parchment__WEBPACK_IMPORTED_MODULE_1__["Registry"]();
 parchment__WEBPACK_IMPORTED_MODULE_1__["ParentBlot"].uiClass = 'ql-ui';
 
 class Quill {
   static debug(limit) {
     if (limit === true) {
       limit = 'log';
     }
 
     _logger__WEBPACK_IMPORTED_MODULE_8__["default"].level(limit);
   }
 
   static find(node) {
     return _instances__WEBPACK_IMPORTED_MODULE_7__["default"].get(node) || globalRegistry.find(node);
   }
 
   static import(name) {
     if (this.imports[name] == null) {
       debug.error("Cannot import ".concat(name, ". Are you sure it was registered?"));
     }
 
     return this.imports[name];
   }
 
   static register(path, target, overwrite = false) {
     if (typeof path !== 'string') {
       const name = path.attrName || path.blotName;
 
       if (typeof name === 'string') {
         // register(Blot | Attributor, overwrite)
         this.register("formats/".concat(name), path, target);
       } else {
         Object.keys(path).forEach(key => {
           this.register(key, path[key], target);
         });
       }
     } else {
       if (this.imports[path] != null && !overwrite) {
         debug.warn("Overwriting ".concat(path, " with"), target);
       }
 
       this.imports[path] = target;
 
       if ((path.startsWith('blots/') || path.startsWith('formats/')) && target.blotName !== 'abstract') {
         globalRegistry.register(target);
       }
 
       if (typeof target.register === 'function') {
         target.register(globalRegistry);
       }
     }
   }
 
   constructor(container, options = {}) {
     this.options = expandConfig(container, options);
     this.container = this.options.container;
 
     if (this.container == null) {
       return debug.error('Invalid Quill container', container);
     }
 
     if (this.options.debug) {
       Quill.debug(this.options.debug);
     }
 
     const html = this.container.innerHTML.trim();
     this.container.classList.add('ql-container');
     this.container.innerHTML = '';
     _instances__WEBPACK_IMPORTED_MODULE_7__["default"].set(this.container, this);
     this.root = this.addContainer('ql-editor');
     this.root.classList.add('ql-blank');
     this.root.setAttribute('data-gramm', false);
     this.scrollingContainer = this.options.scrollingContainer || this.root;
     this.emitter = new _emitter__WEBPACK_IMPORTED_MODULE_4__["default"]();
     const ScrollBlot = this.options.registry.query(parchment__WEBPACK_IMPORTED_MODULE_1__["ScrollBlot"].blotName);
     this.scroll = new ScrollBlot(this.options.registry, this.root, {
       emitter: this.emitter
     });
     this.editor = new _editor__WEBPACK_IMPORTED_MODULE_3__["default"](this.scroll);
     this.selection = new _selection__WEBPACK_IMPORTED_MODULE_6__["default"](this.scroll, this.emitter);
     this.theme = new this.options.theme(this, this.options); // eslint-disable-line new-cap
 
     this.keyboard = this.theme.addModule('keyboard');
     this.clipboard = this.theme.addModule('clipboard');
     this.history = this.theme.addModule('history');
     this.uploader = this.theme.addModule('uploader');
     this.theme.init();
     this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.EDITOR_CHANGE, type => {
       if (type === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.TEXT_CHANGE) {
         this.root.classList.toggle('ql-blank', this.editor.isBlank());
       }
     });
     this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.SCROLL_UPDATE, (source, mutations) => {
       const oldRange = this.selection.lastRange;
       const [newRange] = this.selection.getRange();
       const selectionInfo = oldRange && newRange ? {
         oldRange,
         newRange
       } : undefined;
       modify.call(this, () => this.editor.update(null, mutations, selectionInfo), source);
     });
     const contents = this.clipboard.convert({
       html: "".concat(html, "<p><br></p>"),
       text: '\n'
     });
     this.setContents(contents);
     this.history.clear();
 
     if (this.options.placeholder) {
       this.root.setAttribute('data-placeholder', this.options.placeholder);
     }
 
     if (this.options.readOnly) {
       this.disable();
     }
 
     this.allowReadOnlyEdits = false;
   }
 
   addContainer(container, refNode = null) {
     if (typeof container === 'string') {
       const className = container;
       container = document.createElement('div');
       container.classList.add(className);
     }
 
     this.container.insertBefore(container, refNode);
     return container;
   }
 
   blur() {
     this.selection.setRange(null);
   }
 
   deleteText(index, length, source) {
     [index, length,, source] = overload(index, length, source);
     return modify.call(this, () => {
       return this.editor.deleteText(index, length);
     }, source, index, -1 * length);
   }
 
   disable() {
     this.enable(false);
   }
 
   editReadOnly(modifier) {
     this.allowReadOnlyEdits = true;
     const value = modifier();
     this.allowReadOnlyEdits = false;
     return value;
   }
 
   enable(enabled = true) {
     this.scroll.enable(enabled);
     this.container.classList.toggle('ql-disabled', !enabled);
   }
 
   focus() {
     const {
       scrollTop
     } = this.scrollingContainer;
     this.selection.focus();
     this.scrollingContainer.scrollTop = scrollTop;
     this.scrollIntoView();
   }
 
   format(name, value, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
     return modify.call(this, () => {
       const range = this.getSelection(true);
       let change = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a();
       if (range == null) return change;
 
       if (this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_1__["Scope"].BLOCK)) {
         change = this.editor.formatLine(range.index, range.length, {
           [name]: value
         });
       } else if (range.length === 0) {
         this.selection.format(name, value);
         return change;
       } else {
         change = this.editor.formatText(range.index, range.length, {
           [name]: value
         });
       }
 
       this.setSelection(range, _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
       return change;
     }, source);
   }
 
   formatLine(index, length, name, value, source) {
     let formats; // eslint-disable-next-line prefer-const
 
     [index, length, formats, source] = overload(index, length, name, value, source);
     return modify.call(this, () => {
       return this.editor.formatLine(index, length, formats);
     }, source, index, 0);
   }
 
   formatText(index, length, name, value, source) {
     let formats; // eslint-disable-next-line prefer-const
 
     [index, length, formats, source] = overload(index, length, name, value, source);
     return modify.call(this, () => {
       return this.editor.formatText(index, length, formats);
     }, source, index, 0);
   }
 
   getBounds(index, length = 0) {
     let bounds;
 
     if (typeof index === 'number') {
       bounds = this.selection.getBounds(index, length);
     } else {
       bounds = this.selection.getBounds(index.index, index.length);
     }
 
     const containerBounds = this.container.getBoundingClientRect();
     return {
       bottom: bounds.bottom - containerBounds.top,
       height: bounds.height,
       left: bounds.left - containerBounds.left,
       right: bounds.right - containerBounds.left,
       top: bounds.top - containerBounds.top,
       width: bounds.width
     };
   }
 
   getContents(index = 0, length = this.getLength() - index) {
     [index, length] = overload(index, length);
     return this.editor.getContents(index, length);
   }
 
   getFormat(index = this.getSelection(true), length = 0) {
     if (typeof index === 'number') {
       return this.editor.getFormat(index, length);
     }
 
     return this.editor.getFormat(index.index, index.length);
   }
 
   getIndex(blot) {
     return blot.offset(this.scroll);
   }
 
   getLength() {
     return this.scroll.length();
   }
 
   getLeaf(index) {
     return this.scroll.leaf(index);
   }
 
   getLine(index) {
     return this.scroll.line(index);
   }
 
   getLines(index = 0, length = Number.MAX_VALUE) {
     if (typeof index !== 'number') {
       return this.scroll.lines(index.index, index.length);
     }
 
     return this.scroll.lines(index, length);
   }
 
   getModule(name) {
     return this.theme.modules[name];
   }
 
   getSelection(focus = false) {
     if (focus) this.focus();
     this.update(); // Make sure we access getRange with editor in consistent state
 
     return this.selection.getRange()[0];
   }
 
   getSemanticHTML(index = 0, length = this.getLength() - index) {
     [index, length] = overload(index, length);
     return this.editor.getHTML(index, length);
   }
 
   getText(index = 0, length = this.getLength() - index) {
     [index, length] = overload(index, length);
     return this.editor.getText(index, length);
   }
 
   hasFocus() {
     return this.selection.hasFocus();
   }
 
   insertEmbed(index, embed, value, source = Quill.sources.API) {
     return modify.call(this, () => {
       return this.editor.insertEmbed(index, embed, value);
     }, source, index);
   }
 
   insertText(index, text, name, value, source) {
     let formats; // eslint-disable-next-line prefer-const
 
     [index,, formats, source] = overload(index, 0, name, value, source);
     return modify.call(this, () => {
       return this.editor.insertText(index, text, formats);
     }, source, index, text.length);
   }
 
   isEnabled() {
     return this.scroll.isEnabled();
   }
 
   off(...args) {
     return this.emitter.off(...args);
   }
 
   on(...args) {
     return this.emitter.on(...args);
   }
 
   once(...args) {
     return this.emitter.once(...args);
   }
 
   removeFormat(index, length, source) {
     [index, length,, source] = overload(index, length, source);
     return modify.call(this, () => {
       return this.editor.removeFormat(index, length);
     }, source, index);
   }
 
   scrollIntoView() {
     this.selection.scrollIntoView(this.scrollingContainer);
   }
 
   setContents(delta, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
     return modify.call(this, () => {
       delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a(delta);
       const length = this.getLength();
       const deleted = this.editor.deleteText(0, length);
       const applied = this.editor.applyDelta(delta);
       const lastOp = applied.ops[applied.ops.length - 1];
 
       if (lastOp != null && typeof lastOp.insert === 'string' && lastOp.insert[lastOp.insert.length - 1] === '\n') {
         this.editor.deleteText(this.getLength() - 1, 1);
         applied.delete(1);
       }
 
       return deleted.compose(applied);
     }, source);
   }
 
   setSelection(index, length, source) {
     if (index == null) {
       this.selection.setRange(null, length || Quill.sources.API);
     } else {
       [index, length,, source] = overload(index, length, source);
       this.selection.setRange(new _selection__WEBPACK_IMPORTED_MODULE_6__["Range"](Math.max(0, index), length), source);
 
       if (source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT) {
         this.selection.scrollIntoView(this.scrollingContainer);
       }
     }
   }
 
   setText(text, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().insert(text);
     return this.setContents(delta, source);
   }
 
   update(source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER) {
     const change = this.scroll.update(source); // Will update selection before selection.update() does if text changes
 
     this.selection.update(source); // TODO this is usually undefined
 
     return change;
   }
 
   updateContents(delta, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
     return modify.call(this, () => {
       delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a(delta);
       return this.editor.applyDelta(delta, source);
     }, source, true);
   }
 
 }
 
 Quill.DEFAULTS = {
   bounds: null,
   modules: {},
   placeholder: '',
   readOnly: false,
   registry: globalRegistry,
   scrollingContainer: null,
   theme: 'default'
 };
 Quill.events = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events;
 Quill.sources = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources; // eslint-disable-next-line no-undef
 
 Quill.version =  false ? undefined : "2.0.0-dev.3";
 Quill.imports = {
   delta: quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a,
   parchment: parchment__WEBPACK_IMPORTED_MODULE_1__,
   'core/module': _module__WEBPACK_IMPORTED_MODULE_5__["default"],
   'core/theme': _theme__WEBPACK_IMPORTED_MODULE_9__["default"]
 };
 
 function expandConfig(container, userConfig) {
   userConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {
     container,
     modules: {
       clipboard: true,
       keyboard: true,
       history: true,
       uploader: true
     }
   }, userConfig);
 
   if (!userConfig.theme || userConfig.theme === Quill.DEFAULTS.theme) {
     userConfig.theme = _theme__WEBPACK_IMPORTED_MODULE_9__["default"];
   } else {
     userConfig.theme = Quill.import("themes/".concat(userConfig.theme));
 
     if (userConfig.theme == null) {
       throw new Error("Invalid theme ".concat(userConfig.theme, ". Did you register it?"));
     }
   }
 
   const themeConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {}, userConfig.theme.DEFAULTS);
   [themeConfig, userConfig].forEach(config => {
     config.modules = config.modules || {};
     Object.keys(config.modules).forEach(module => {
       if (config.modules[module] === true) {
         config.modules[module] = {};
       }
     });
   });
   const moduleNames = Object.keys(themeConfig.modules).concat(Object.keys(userConfig.modules));
   const moduleConfig = moduleNames.reduce((config, name) => {
     const moduleClass = Quill.import("modules/".concat(name));
 
     if (moduleClass == null) {
       debug.error("Cannot load ".concat(name, " module. Are you sure you registered it?"));
     } else {
       config[name] = moduleClass.DEFAULTS || {};
     }
 
     return config;
   }, {}); // Special case toolbar shorthand
 
   if (userConfig.modules != null && userConfig.modules.toolbar && userConfig.modules.toolbar.constructor !== Object) {
     userConfig.modules.toolbar = {
       container: userConfig.modules.toolbar
     };
   }
 
   userConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {}, Quill.DEFAULTS, {
     modules: moduleConfig
   }, themeConfig, userConfig);
   ['bounds', 'container', 'scrollingContainer'].forEach(key => {
     if (typeof userConfig[key] === 'string') {
       userConfig[key] = document.querySelector(userConfig[key]);
     }
   });
   userConfig.modules = Object.keys(userConfig.modules).reduce((config, name) => {
     if (userConfig.modules[name]) {
       config[name] = userConfig.modules[name];
     }
 
     return config;
   }, {});
   return userConfig;
 } // Handle selection preservation and TEXT_CHANGE emission
 // common to modification APIs
 
 
 function modify(modifier, source, index, shift) {
   if (!this.isEnabled() && source === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER && !this.allowReadOnlyEdits) {
     return new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a();
   }
 
   let range = index == null ? null : this.getSelection();
   const oldDelta = this.editor.delta;
   const change = modifier();
 
   if (range != null) {
     if (index === true) {
       index = range.index; // eslint-disable-line prefer-destructuring
     }
 
     if (shift == null) {
       range = shiftRange(range, change, source);
     } else if (shift !== 0) {
       range = shiftRange(range, index, shift, source);
     }
 
     this.setSelection(range, _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
   }
 
   if (change.length() > 0) {
     const args = [_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.TEXT_CHANGE, change, oldDelta, source];
     this.emitter.emit(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.EDITOR_CHANGE, ...args);
 
     if (source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT) {
       this.emitter.emit(...args);
     }
   }
 
   return change;
 }
 
 function overload(index, length, name, value, source) {
   let formats = {};
 
   if (typeof index.index === 'number' && typeof index.length === 'number') {
     // Allow for throwaway end (used by insertText/insertEmbed)
     if (typeof length !== 'number') {
       source = value;
       value = name;
       name = length;
       length = index.length; // eslint-disable-line prefer-destructuring
 
       index = index.index; // eslint-disable-line prefer-destructuring
     } else {
       length = index.length; // eslint-disable-line prefer-destructuring
 
       index = index.index; // eslint-disable-line prefer-destructuring
     }
   } else if (typeof length !== 'number') {
     source = value;
     value = name;
     name = length;
     length = 0;
   } // Handle format being object, two format name/value strings or excluded
 
 
   if (typeof name === 'object') {
     formats = name;
     source = value;
   } else if (typeof name === 'string') {
     if (value != null) {
       formats[name] = value;
     } else {
       source = name;
     }
   } // Handle optional source
 
 
   source = source || _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API;
   return [index, length, formats, source];
 }
 
 function shiftRange(range, index, length, source) {
   if (range == null) return null;
   let start;
   let end;
 
   if (index instanceof quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a) {
     [start, end] = [range.index, range.index + range.length].map(pos => index.transformPosition(pos, source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER));
   } else {
     [start, end] = [range.index, range.index + range.length].map(pos => {
       if (pos < index || pos === index && source === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER) return pos;
 
       if (length >= 0) {
         return pos + length;
       }
 
       return Math.max(index, pos + length);
     });
   }
 
   return new _selection__WEBPACK_IMPORTED_MODULE_6__["Range"](start, end - start);
 }
 
 
 
 /***/ }),
 
 /***/ "./core/selection.js":
 /*!***************************!*\
   !*** ./core/selection.js ***!
   \***************************/
 /*! exports provided: Range, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Range", function() { return Range; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Selection; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! clone */ "./node_modules/clone/clone.js");
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(clone__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js");
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(deep_equal__WEBPACK_IMPORTED_MODULE_2__);
 /* harmony import */ var _emitter__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./emitter */ "./core/emitter.js");
 /* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./logger */ "./core/logger.js");
 /* harmony import */ var _shadow_selection_polyfill__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./shadow-selection-polyfill */ "./core/shadow-selection-polyfill.js");
 
 
 
 
 
 
 const debug = Object(_logger__WEBPACK_IMPORTED_MODULE_4__["default"])('quill:selection');
 
 class Range {
   constructor(index, length = 0) {
     this.index = index;
     this.length = length;
   }
 
 }
 
 class Selection {
   constructor(scroll, emitter) {
     this.emitter = emitter;
     this.scroll = scroll;
     this.composing = false;
     this.mouseDown = false;
     this.root = this.scroll.domNode;
     this.rootDocument = this.root.getRootNode ? this.root.getRootNode() : document;
     this.cursor = this.scroll.create('cursor', this); // savedRange is last non-null range
 
     this.savedRange = new Range(0, 0);
     this.lastRange = this.savedRange;
     this.handleComposition();
     this.handleDragging();
     this.emitter.listenDOM(_shadow_selection_polyfill__WEBPACK_IMPORTED_MODULE_5__["SHADOW_SELECTIONCHANGE"], document, () => {
       if (!this.mouseDown && !this.composing) {
         setTimeout(this.update.bind(this, _emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.USER), 1);
       }
     });
     this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].events.SCROLL_BEFORE_UPDATE, () => {
       if (!this.hasFocus()) return;
       const native = this.getNativeRange();
       if (native == null) return;
       if (native.start.node === this.cursor.textNode) return; // cursor.restore() will handle
 
       this.emitter.once(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].events.SCROLL_UPDATE, () => {
         try {
           if (this.root.contains(native.start.node) && this.root.contains(native.end.node)) {
             this.setNativeRange(native.start.node, native.start.offset, native.end.node, native.end.offset);
           }
 
           this.update(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT);
         } catch (ignored) {// ignore
         }
       });
     });
     this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].events.SCROLL_OPTIMIZE, (mutations, context) => {
       if (context.range) {
         const {
           startNode,
           startOffset,
           endNode,
           endOffset
         } = context.range;
         this.setNativeRange(startNode, startOffset, endNode, endOffset);
         this.update(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT);
       }
     });
     this.update(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT);
   }
 
   handleComposition() {
     this.root.addEventListener('compositionstart', () => {
       this.composing = true;
       this.scroll.batchStart();
     });
     this.root.addEventListener('compositionend', () => {
       this.scroll.batchEnd();
       this.composing = false;
 
       if (this.cursor.parent) {
         const range = this.cursor.restore();
         if (!range) return;
         setTimeout(() => {
           this.setNativeRange(range.startNode, range.startOffset, range.endNode, range.endOffset);
         }, 1);
       }
     });
   }
 
   handleDragging() {
     this.emitter.listenDOM('mousedown', document.body, () => {
       this.mouseDown = true;
     });
     this.emitter.listenDOM('mouseup', document.body, () => {
       this.mouseDown = false;
       this.update(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.USER);
     });
   }
 
   focus() {
     if (this.hasFocus()) return;
     this.root.focus();
     this.setRange(this.savedRange);
   }
 
   format(format, value) {
     this.scroll.update();
     const nativeRange = this.getNativeRange();
     if (nativeRange == null || !nativeRange.native.collapsed || this.scroll.query(format, parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK)) return;
 
     if (nativeRange.start.node !== this.cursor.textNode) {
       const blot = this.scroll.find(nativeRange.start.node, false);
       if (blot == null) return; // TODO Give blot ability to not split
 
       if (blot instanceof parchment__WEBPACK_IMPORTED_MODULE_0__["LeafBlot"]) {
         const after = blot.split(nativeRange.start.offset);
         blot.parent.insertBefore(this.cursor, after);
       } else {
         blot.insertBefore(this.cursor, nativeRange.start.node); // Should never happen
       }
 
       this.cursor.attach();
     }
 
     this.cursor.format(format, value);
     this.scroll.optimize();
     this.setNativeRange(this.cursor.textNode, this.cursor.textNode.data.length);
     this.update();
   }
 
   getBounds(index, length = 0) {
     const scrollLength = this.scroll.length();
     index = Math.min(index, scrollLength - 1);
     length = Math.min(index + length, scrollLength - 1) - index;
     let node;
     let [leaf, offset] = this.scroll.leaf(index);
     if (leaf == null) return null;
     [node, offset] = leaf.position(offset, true);
     const range = document.createRange();
 
     if (length > 0) {
       range.setStart(node, offset);
       [leaf, offset] = this.scroll.leaf(index + length);
       if (leaf == null) return null;
       [node, offset] = leaf.position(offset, true);
       range.setEnd(node, offset);
       return range.getBoundingClientRect();
     }
 
     let side = 'left';
     let rect;
 
     if (node instanceof Text) {
       if (offset < node.data.length) {
         range.setStart(node, offset);
         range.setEnd(node, offset + 1);
       } else {
         range.setStart(node, offset - 1);
         range.setEnd(node, offset);
         side = 'right';
       }
 
       rect = range.getBoundingClientRect();
     } else {
       rect = leaf.domNode.getBoundingClientRect();
       if (offset > 0) side = 'right';
     }
 
     return {
       bottom: rect.top + rect.height,
       height: rect.height,
       left: rect[side],
       right: rect[side],
       top: rect.top,
       width: 0
     };
   }
 
   getNativeRange() {
     const nativeRange = Object(_shadow_selection_polyfill__WEBPACK_IMPORTED_MODULE_5__["getRange"])(this.rootDocument);
     if (nativeRange == null) return null;
     const range = this.normalizeNative(nativeRange);
     debug.info('getNativeRange', range);
     return range;
   }
 
   getRange() {
     const normalized = this.getNativeRange();
     if (normalized == null) return [null, null];
     const range = this.normalizedToRange(normalized);
     return [range, normalized];
   }
 
   hasFocus() {
     return this.rootDocument.activeElement === this.root;
   }
 
   normalizedToRange(range) {
     const positions = [[range.start.node, range.start.offset]];
 
     if (!range.native.collapsed) {
       positions.push([range.end.node, range.end.offset]);
     }
 
     const indexes = positions.map(position => {
       const [node, offset] = position;
       const blot = this.scroll.find(node, true);
       const index = blot.offset(this.scroll);
 
       if (offset === 0) {
         return index;
       }
 
       if (blot instanceof parchment__WEBPACK_IMPORTED_MODULE_0__["LeafBlot"]) {
         return index + blot.index(node, offset);
       }
 
       return index + blot.length();
     });
     const end = Math.min(Math.max(...indexes), this.scroll.length() - 1);
     const start = Math.min(end, ...indexes);
     return new Range(start, end - start);
   }
 
   normalizeNative(nativeRange) {
     if (!contains(this.root, nativeRange.startContainer) || !nativeRange.collapsed && !contains(this.root, nativeRange.endContainer)) {
       return null;
     }
 
     const range = {
       start: {
         node: nativeRange.startContainer,
         offset: nativeRange.startOffset
       },
       end: {
         node: nativeRange.endContainer,
         offset: nativeRange.endOffset
       },
       native: nativeRange
     };
     [range.start, range.end].forEach(position => {
       let {
         node,
         offset
       } = position;
 
       while (!(node instanceof Text) && node.childNodes.length > 0) {
         if (node.childNodes.length > offset) {
           node = node.childNodes[offset];
           offset = 0;
         } else if (node.childNodes.length === offset) {
           node = node.lastChild;
 
           if (node instanceof Text) {
             offset = node.data.length;
           } else if (node.childNodes.length > 0) {
             // Container case
             offset = node.childNodes.length;
           } else {
             // Embed case
             offset = node.childNodes.length + 1;
           }
         } else {
           break;
         }
       }
 
       position.node = node;
       position.offset = offset;
     });
     return range;
   }
 
   rangeToNative(range) {
     const indexes = range.collapsed ? [range.index] : [range.index, range.index + range.length];
     const args = [];
     const scrollLength = this.scroll.length();
     indexes.forEach((index, i) => {
       index = Math.min(scrollLength - 1, index);
       const [leaf, leafOffset] = this.scroll.leaf(index);
       const [node, offset] = leaf.position(leafOffset, i !== 0);
       args.push(node, offset);
     });
 
     if (args.length < 2) {
       return args.concat(args);
     }
 
     return args;
   }
 
   scrollIntoView(scrollingContainer) {
     const range = this.lastRange;
     if (range == null) return;
     const bounds = this.getBounds(range.index, range.length);
     if (bounds == null) return;
     const limit = this.scroll.length() - 1;
     const [first] = this.scroll.line(Math.min(range.index, limit));
     let last = first;
 
     if (range.length > 0) {
       [last] = this.scroll.line(Math.min(range.index + range.length, limit));
     }
 
     if (first == null || last == null) return;
     const scrollBounds = scrollingContainer.getBoundingClientRect();
 
     if (bounds.top < scrollBounds.top) {
       scrollingContainer.scrollTop -= scrollBounds.top - bounds.top;
     } else if (bounds.bottom > scrollBounds.bottom) {
       scrollingContainer.scrollTop += bounds.bottom - scrollBounds.bottom;
     }
   }
 
   setNativeRange(startNode, startOffset, endNode = startNode, endOffset = startOffset, force = false) {
     debug.info('setNativeRange', startNode, startOffset, endNode, endOffset);
 
     if (startNode != null && (this.root.parentNode == null || startNode.parentNode == null || endNode.parentNode == null)) {
       return;
     }
 
     const selection = typeof this.rootDocument.getSelection === 'function' ? this.rootDocument.getSelection() : document.getSelection();
     if (selection == null) return;
 
     if (startNode != null) {
       if (!this.hasFocus()) this.root.focus();
       const {
         native
       } = this.getNativeRange() || {};
 
       if (native == null || force || startNode !== native.startContainer || startOffset !== native.startOffset || endNode !== native.endContainer || endOffset !== native.endOffset) {
         if (startNode.tagName === 'BR') {
           startOffset = Array.from(startNode.parentNode.childNodes).indexOf(startNode);
           startNode = startNode.parentNode;
         }
 
         if (endNode.tagName === 'BR') {
           endOffset = Array.from(endNode.parentNode.childNodes).indexOf(endNode);
           endNode = endNode.parentNode;
         }
 
         const range = document.createRange();
         range.setStart(startNode, startOffset);
         range.setEnd(endNode, endOffset);
         selection.removeAllRanges();
         selection.addRange(range);
       }
     } else {
       selection.removeAllRanges();
       this.root.blur();
     }
   }
 
   setRange(range, force = false, source = _emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.API) {
     if (typeof force === 'string') {
       source = force;
       force = false;
     }
 
     debug.info('setRange', range);
 
     if (range != null) {
       const args = this.rangeToNative(range);
       this.setNativeRange(...args, force);
     } else {
       this.setNativeRange(null);
     }
 
     this.update(source);
   }
 
   update(source = _emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.USER) {
     const oldRange = this.lastRange;
     const [lastRange, nativeRange] = this.getRange();
     this.lastRange = lastRange;
 
     if (this.lastRange != null) {
       this.savedRange = this.lastRange;
     }
 
     if (!deep_equal__WEBPACK_IMPORTED_MODULE_2___default()(oldRange, this.lastRange)) {
       if (!this.composing && nativeRange != null && nativeRange.native.collapsed && nativeRange.start.node !== this.cursor.textNode) {
         const range = this.cursor.restore();
 
         if (range) {
           this.setNativeRange(range.startNode, range.startOffset, range.endNode, range.endOffset);
         }
       }
 
       const args = [_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].events.SELECTION_CHANGE, clone__WEBPACK_IMPORTED_MODULE_1___default()(this.lastRange), clone__WEBPACK_IMPORTED_MODULE_1___default()(oldRange), source];
       this.emitter.emit(_emitter__WEBPACK_IMPORTED_MODULE_3__["default"].events.EDITOR_CHANGE, ...args);
 
       if (source !== _emitter__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT) {
         this.emitter.emit(...args);
       }
     }
   }
 
 }
 
 function contains(parent, descendant) {
   try {
     // Firefox inserts inaccessible nodes around video elements
     descendant.parentNode; // eslint-disable-line no-unused-expressions
   } catch (e) {
     return false;
   }
 
   return parent.contains(descendant);
 }
 
 
 
 /***/ }),
 
 /***/ "./core/shadow-selection-polyfill.js":
 /*!*******************************************!*\
   !*** ./core/shadow-selection-polyfill.js ***!
   \*******************************************/
 /*! exports provided: SHADOW_SELECTIONCHANGE, getRange, internalGetShadowSelection */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SHADOW_SELECTIONCHANGE", function() { return SHADOW_SELECTIONCHANGE; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getRange", function() { return getRange; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "internalGetShadowSelection", function() { return internalGetShadowSelection; });
 /* eslint-disable no-cond-assign */
 
 /* eslint-disable no-plusplus */
 
 /**
  * Copyright 2018 Google LLC
  *
  * Licensed under the Apache License, Version 2.0 (the "License"); you may not
  * use this file except in compliance with the License. You may obtain a copy of
  * the License at
  *
  *     http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  * License for the specific language governing permissions and limitations under
  * the License.
  */
 // NOTE: copied from https://github.com/GoogleChromeLabs/shadow-selection-polyfill
 const SHADOW_SELECTIONCHANGE = '-shadow-selectionchange';
 const hasShadow = 'attachShadow' in Element.prototype && 'getRootNode' in Element.prototype;
 const hasSelection = !!(hasShadow && document.createElement('div').attachShadow({
   mode: 'open'
 }).getSelection);
 const hasShady = window.ShadyDOM && window.ShadyDOM.inUse;
 const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
 const useDocument = !hasShadow || hasShady || !hasSelection && !isSafari;
 const validNodeTypes = [Node.ELEMENT_NODE, Node.TEXT_NODE, Node.DOCUMENT_FRAGMENT_NODE];
 
 function isValidNode(node) {
   return validNodeTypes.includes(node.nodeType);
 }
 
 function findNode(s, parentNode, isLeft) {
   const nodes = parentNode.childNodes || parentNode.children;
 
   if (!nodes) {
     return parentNode; // found it, probably text
   }
 
   for (let i = 0; i < nodes.length; ++i) {
     const j = isLeft ? i : nodes.length - 1 - i;
     const childNode = nodes[j];
 
     if (!isValidNode(childNode)) {
       continue; // eslint-disable-line no-continue
     }
 
     if (s.containsNode(childNode, true)) {
       if (s.containsNode(childNode, false)) {
         return childNode;
       }
 
       return findNode(s, childNode, isLeft);
     }
   }
 
   return parentNode;
 }
 /**
  * @param {function(!Event)} fn to add to selectionchange internals
  */
 
 
 const addInternalListener = (() => {
   if (hasSelection || useDocument) {
     // getSelection exists or document API can be used
     document.addEventListener('selectionchange', () => {
       document.dispatchEvent(new CustomEvent(SHADOW_SELECTIONCHANGE));
     });
     return () => {};
   }
 
   let withinInternals = false;
   const handlers = [];
   document.addEventListener('selectionchange', ev => {
     if (withinInternals) {
       return;
     }
 
     document.dispatchEvent(new CustomEvent(SHADOW_SELECTIONCHANGE));
     withinInternals = true;
     window.setTimeout(() => {
       withinInternals = false;
     }, 2); // FIXME: should be > 1 to prevent infinite Selection.update() loop
 
     handlers.forEach(fn => fn(ev));
   });
   return fn => handlers.push(fn);
 })();
 
 let wasCaret = false;
 let resolveTask = null;
 addInternalListener(() => {
   const s = window.getSelection();
 
   if (s.type === 'Caret') {
     wasCaret = true;
   } else if (wasCaret && !resolveTask) {
     resolveTask = Promise.resolve(true).then(() => {
       wasCaret = false;
       resolveTask = null;
     });
   }
 });
 /**
  * @param {!Selection} s the window selection to use
  * @param {!Node} node the node to walk from
  * @param {boolean} walkForward should this walk in natural direction
  * @return {boolean} whether the selection contains the following node (even partially)
  */
 
 function containsNextElement(s, node, walkForward) {
   const start = node;
 
   while (node = walkFromNode(node, walkForward)) {
     // eslint-disable-line no-cond-assign
     // walking (left) can contain our own parent, which we don't want
     if (!node.contains(start)) {
       break;
     }
   }
 
   if (!node) {
     return false;
   } // we look for Element as .containsNode says true for _every_ text node, and we only care about
   // elements themselves
 
 
   return node instanceof Element && s.containsNode(node, true);
 }
 /**
  * @param {!Selection} s the window selection to use
  * @param {!Node} leftNode the left node
  * @param {!Node} rightNode the right node
  * @return {boolean|undefined} whether this has natural direction
  */
 
 
 function getSelectionDirection(s, leftNode, rightNode) {
   if (s.type !== 'Range') {
     return undefined; // no direction
   }
 
   const measure = () => s.toString().length;
 
   const initialSize = measure();
 
   if (initialSize === 1 && wasCaret && leftNode === rightNode) {
     // nb. We need to reset a single selection as Safari _always_ tells us the cursor was dragged
     // left to right (maybe RTL on those devices).
     // To be fair, Chrome has the same bug.
     s.extend(leftNode, 0);
     s.collapseToEnd();
     return undefined;
   }
 
   let updatedSize; // Try extending forward and seeing what happens.
 
   s.modify('extend', 'forward', 'character');
   updatedSize = measure();
 
   if (updatedSize > initialSize || containsNextElement(s, rightNode, true)) {
     s.modify('extend', 'backward', 'character');
     return true;
   }
 
   if (updatedSize < initialSize || !s.containsNode(leftNode)) {
     s.modify('extend', 'backward', 'character');
     return false;
   } // Maybe we were at the end of something. Extend backwards.
   // TODO(samthor): We seem to be able to get away without the 'backwards' case.
 
 
   s.modify('extend', 'backward', 'character');
   updatedSize = measure();
 
   if (updatedSize > initialSize || containsNextElement(s, leftNode, false)) {
     s.modify('extend', 'forward', 'character');
     return false;
   }
 
   if (updatedSize < initialSize || !s.containsNode(rightNode)) {
     s.modify('extend', 'forward', 'character');
     return true;
   } // This is likely a select-all.
 
 
   return undefined;
 }
 /**
  * Returns the next valid node (element or text). This is needed as Safari doesn't support
  * TreeWalker inside Shadow DOM. Don't escape shadow roots.
  *
  * @param {!Node} node to start from
  * @param {boolean} walkForward should this walk in natural direction
  * @return {Node} node found, if any
  */
 
 
 function walkFromNode(node, walkForward) {
   if (!walkForward) {
     return node.previousSibling || node.parentNode || null;
   }
 
   while (node) {
     if (node.nextSibling) {
       return node.nextSibling;
     }
 
     node = node.parentNode;
   }
 
   return null;
 }
 /**
  * @param {!Node} node to check for initial space
  * @return {number} count of initial space
  */
 
 
 function initialSpace(node) {
   if (node.nodeType !== Node.TEXT_NODE) {
     return 0;
   }
 
   return /^\s*/.exec(node.textContent)[0].length;
 }
 /**
  * @param {!Node} node to check for trailing space
  * @return {number} count of ignored trailing space
  */
 
 
 function ignoredTrailingSpace(node) {
   if (node.nodeType !== Node.TEXT_NODE) {
     return 0;
   }
 
   const trailingSpaceCount = /\s*$/.exec(node.textContent)[0].length;
 
   if (!trailingSpaceCount) {
     return 0;
   }
 
   return trailingSpaceCount - 1; // always allow single last
 }
 
 const cachedRange = new Map();
 function getRange(root) {
   if (hasSelection || useDocument) {
     const s = (useDocument ? document : root).getSelection();
     return s.rangeCount ? s.getRangeAt(0) : null;
   }
 
   const thisFrame = cachedRange.get(root);
 
   if (thisFrame) {
     return thisFrame;
   }
 
   const result = internalGetShadowSelection(root);
   cachedRange.set(root, result.range);
   window.setTimeout(() => {
     cachedRange.delete(root);
   }, 0);
   return result.range;
 }
 const fakeSelectionNode = document.createTextNode('');
 function internalGetShadowSelection(root) {
   const range = document.createRange();
   const s = window.getSelection();
 
   if (!s.containsNode(root.host, true)) {
     return {
       range: null,
       mode: 'none'
     };
   } // TODO: inserting fake nodes isn't ideal, but containsNode doesn't work on nearby adjacent
   // text nodes (in fact it returns true for all text nodes on the page?!).
   // insert a fake 'before' node to see if it's selected
 
 
   root.insertBefore(fakeSelectionNode, root.childNodes[0]);
   const includesBeforeRoot = s.containsNode(fakeSelectionNode);
   fakeSelectionNode.remove();
 
   if (includesBeforeRoot) {
     return {
       range: null,
       mode: 'outside-before'
     };
   } // insert a fake 'after' node to see if it's selected
 
 
   root.appendChild(fakeSelectionNode);
   const includesAfterRoot = s.containsNode(fakeSelectionNode);
   fakeSelectionNode.remove();
 
   if (includesAfterRoot) {
     return {
       range: null,
       mode: 'outside-after'
     };
   }
 
   const measure = () => s.toString().length;
 
   if (!(s.type === 'Caret' || s.type === 'Range')) {
     throw new TypeError("unexpected type: ".concat(s.type));
   }
 
   const leftNode = findNode(s, root, true);
   let rightNode;
   let isNaturalDirection;
 
   if (s.type === 'Range') {
     rightNode = findNode(s, root, false); // get right node here _before_ getSelectionDirection
 
     isNaturalDirection = getSelectionDirection(s, leftNode, rightNode); // isNaturalDirection means "going right"
   }
 
   if (s.type === 'Caret') {
     // we might transition to being a caret, so don't check initial value
     s.extend(leftNode, 0);
     const at = measure();
     s.collapseToEnd();
     range.setStart(leftNode, at);
     range.setEnd(leftNode, at);
     return {
       range,
       mode: 'caret'
     };
   }
 
   if (isNaturalDirection === undefined) {
     if (s.type !== 'Range') {
       throw new TypeError("unexpected type: ".concat(s.type));
     } // This occurs when we can't move because we can't extend left or right to measure the
     // direction we're moving in. Good news though: we don't need to _change_ the selection
     // to measure it, so just return immediately.
 
 
     range.setStart(leftNode, 0);
     range.setEnd(rightNode, rightNode.length);
     return {
       range,
       mode: 'all'
     };
   }
 
   const size = measure();
   let offsetLeft;
   let offsetRight; // only one newline/space char is cared about
 
   const validRightLength = rightNode.length - ignoredTrailingSpace(rightNode);
 
   if (isNaturalDirection) {
     // walk in the opposite direction first
     s.extend(leftNode, 0);
     offsetLeft = measure() + initialSpace(leftNode); // measure doesn't include initial space
     // then in our actual direction
 
     s.extend(rightNode, validRightLength);
     offsetRight = validRightLength - (measure() - size); // then revert to the original position
 
     s.extend(rightNode, offsetRight);
   } else {
     // walk in the opposite direction first
     s.extend(rightNode, validRightLength);
     offsetRight = validRightLength - measure(); // then in our actual direction
 
     s.extend(leftNode, 0);
     offsetLeft = measure() - size + initialSpace(leftNode); // doesn't include initial space
     // then revert to the original position
 
     s.extend(leftNode, offsetLeft);
   }
 
   range.setStart(leftNode, offsetLeft);
   range.setEnd(rightNode, offsetRight);
   return {
     mode: isNaturalDirection ? 'right' : 'left',
     range
   };
 }
 
 /***/ }),
 
 /***/ "./core/theme.js":
 /*!***********************!*\
   !*** ./core/theme.js ***!
   \***********************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 class Theme {
   constructor(quill, options) {
     this.quill = quill;
     this.options = options;
     this.modules = {};
   }
 
   init() {
     Object.keys(this.options.modules).forEach(name => {
       if (this.modules[name] == null) {
         this.addModule(name);
       }
     });
   }
 
   addModule(name) {
     const ModuleClass = this.quill.constructor.import("modules/".concat(name));
     this.modules[name] = new ModuleClass(this.quill, this.options.modules[name] || {});
     return this.modules[name];
   }
 
 }
 
 Theme.DEFAULTS = {
   modules: {}
 };
 Theme.themes = {
   default: Theme
 };
 /* harmony default export */ __webpack_exports__["default"] = (Theme);
 
 /***/ }),
 
 /***/ "./formats/align.js":
 /*!**************************!*\
   !*** ./formats/align.js ***!
   \**************************/
 /*! exports provided: AlignAttribute, AlignClass, AlignStyle */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AlignAttribute", function() { return AlignAttribute; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AlignClass", function() { return AlignClass; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AlignStyle", function() { return AlignStyle; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 const config = {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK,
   whitelist: ['right', 'center', 'justify']
 };
 const AlignAttribute = new parchment__WEBPACK_IMPORTED_MODULE_0__["Attributor"]('align', 'align', config);
 const AlignClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('align', 'ql-align', config);
 const AlignStyle = new parchment__WEBPACK_IMPORTED_MODULE_0__["StyleAttributor"]('align', 'text-align', config);
 
 
 /***/ }),
 
 /***/ "./formats/background.js":
 /*!*******************************!*\
   !*** ./formats/background.js ***!
   \*******************************/
 /*! exports provided: BackgroundClass, BackgroundStyle */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BackgroundClass", function() { return BackgroundClass; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BackgroundStyle", function() { return BackgroundStyle; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _color__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./color */ "./formats/color.js");
 
 
 const BackgroundClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('background', 'ql-bg', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE
 });
 const BackgroundStyle = new _color__WEBPACK_IMPORTED_MODULE_1__["ColorAttributor"]('background', 'background-color', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE
 });
 
 
 /***/ }),
 
 /***/ "./formats/blockquote.js":
 /*!*******************************!*\
   !*** ./formats/blockquote.js ***!
   \*******************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 
 
 class Blockquote extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {}
 
 Blockquote.blotName = 'blockquote';
 Blockquote.tagName = 'blockquote';
 /* harmony default export */ __webpack_exports__["default"] = (Blockquote);
 
 /***/ }),
 
 /***/ "./formats/bold.js":
 /*!*************************!*\
   !*** ./formats/bold.js ***!
   \*************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 
 
 class Bold extends _blots_inline__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create() {
     return super.create();
   }
 
   static formats() {
     return true;
   }
 
   optimize(context) {
     super.optimize(context);
 
     if (this.domNode.tagName !== this.statics.tagName[0]) {
       this.replaceWith(this.statics.blotName);
     }
   }
 
 }
 
 Bold.blotName = 'bold';
 Bold.tagName = ['STRONG', 'B'];
 /* harmony default export */ __webpack_exports__["default"] = (Bold);
 
 /***/ }),
 
 /***/ "./formats/code.js":
 /*!*************************!*\
   !*** ./formats/code.js ***!
   \*************************/
 /*! exports provided: Code, CodeBlockContainer, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Code", function() { return Code; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CodeBlockContainer", function() { return CodeBlockContainer; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return CodeBlock; });
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_break__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../blots/break */ "./blots/break.js");
 /* harmony import */ var _blots_cursor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../blots/cursor */ "./blots/cursor.js");
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 /* harmony import */ var _blots_text__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../blots/text */ "./blots/text.js");
 /* harmony import */ var _blots_container__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../blots/container */ "./blots/container.js");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 
 
 
 
 
 
 
 
 class CodeBlockContainer extends _blots_container__WEBPACK_IMPORTED_MODULE_5__["default"] {
   static create(value) {
     const domNode = super.create(value);
     domNode.setAttribute('spellcheck', false);
     return domNode;
   }
 
   html(index, length) {
     const text = this.children.map(child => child.domNode.innerText).join('\n').slice(index, index + length);
     return "<pre>".concat(Object(_blots_text__WEBPACK_IMPORTED_MODULE_4__["escapeText"])(text), "</pre>");
   }
 
 }
 
 class CodeBlock extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static register() {
     _core_quill__WEBPACK_IMPORTED_MODULE_6__["default"].register(CodeBlockContainer);
   }
 
 }
 
 class Code extends _blots_inline__WEBPACK_IMPORTED_MODULE_3__["default"] {}
 
 Code.blotName = 'code';
 Code.tagName = 'CODE';
 CodeBlock.blotName = 'code-block';
 CodeBlock.className = 'ql-code-block';
 CodeBlock.tagName = 'DIV';
 CodeBlockContainer.blotName = 'code-block-container';
 CodeBlockContainer.className = 'ql-code-block-container';
 CodeBlockContainer.tagName = 'DIV';
 CodeBlockContainer.allowedChildren = [CodeBlock];
 CodeBlock.allowedChildren = [_blots_text__WEBPACK_IMPORTED_MODULE_4__["default"], _blots_break__WEBPACK_IMPORTED_MODULE_1__["default"], _blots_cursor__WEBPACK_IMPORTED_MODULE_2__["default"]];
 CodeBlock.requiredContainer = CodeBlockContainer;
 CodeBlock.TAB = '  ';
 
 
 /***/ }),
 
 /***/ "./formats/color.js":
 /*!**************************!*\
   !*** ./formats/color.js ***!
   \**************************/
 /*! exports provided: ColorAttributor, ColorClass, ColorStyle */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ColorAttributor", function() { return ColorAttributor; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ColorClass", function() { return ColorClass; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ColorStyle", function() { return ColorStyle; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 
 class ColorAttributor extends parchment__WEBPACK_IMPORTED_MODULE_0__["StyleAttributor"] {
   value(domNode) {
     let value = super.value(domNode);
     if (!value.startsWith('rgb(')) return value;
     value = value.replace(/^[^\d]+/, '').replace(/[^\d]+$/, '');
     const hex = value.split(',').map(component => "00".concat(parseInt(component, 10).toString(16)).slice(-2)).join('');
     return "#".concat(hex);
   }
 
 }
 
 const ColorClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('color', 'ql-color', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE
 });
 const ColorStyle = new ColorAttributor('color', 'color', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE
 });
 
 
 /***/ }),
 
 /***/ "./formats/direction.js":
 /*!******************************!*\
   !*** ./formats/direction.js ***!
   \******************************/
 /*! exports provided: DirectionAttribute, DirectionClass, DirectionStyle */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DirectionAttribute", function() { return DirectionAttribute; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DirectionClass", function() { return DirectionClass; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DirectionStyle", function() { return DirectionStyle; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 const config = {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK,
   whitelist: ['rtl']
 };
 const DirectionAttribute = new parchment__WEBPACK_IMPORTED_MODULE_0__["Attributor"]('direction', 'dir', config);
 const DirectionClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('direction', 'ql-direction', config);
 const DirectionStyle = new parchment__WEBPACK_IMPORTED_MODULE_0__["StyleAttributor"]('direction', 'direction', config);
 
 
 /***/ }),
 
 /***/ "./formats/font.js":
 /*!*************************!*\
   !*** ./formats/font.js ***!
   \*************************/
 /*! exports provided: FontStyle, FontClass */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FontStyle", function() { return FontStyle; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FontClass", function() { return FontClass; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 const config = {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE,
   whitelist: ['serif', 'monospace']
 };
 const FontClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('font', 'ql-font', config);
 
 class FontStyleAttributor extends parchment__WEBPACK_IMPORTED_MODULE_0__["StyleAttributor"] {
   value(node) {
     return super.value(node).replace(/["']/g, '');
   }
 
 }
 
 const FontStyle = new FontStyleAttributor('font', 'font-family', config);
 
 
 /***/ }),
 
 /***/ "./formats/formula.js":
 /*!****************************!*\
   !*** ./formats/formula.js ***!
   \****************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_embed__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/embed */ "./blots/embed.js");
 
 
 class Formula extends _blots_embed__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create(value) {
     if (window.katex == null) {
       throw new Error('Formula module requires KaTeX.');
     }
 
     const node = super.create(value);
 
     if (typeof value === 'string') {
       window.katex.render(value, node, {
         throwOnError: false,
         errorColor: '#f00'
       });
       node.setAttribute('data-value', value);
     }
 
     return node;
   }
 
   static value(domNode) {
     return domNode.getAttribute('data-value');
   }
 
   html() {
     const {
       formula
     } = this.value();
     return "<span>".concat(formula, "</span>");
   }
 
 }
 
 Formula.blotName = 'formula';
 Formula.className = 'ql-formula';
 Formula.tagName = 'SPAN';
 /* harmony default export */ __webpack_exports__["default"] = (Formula);
 
 /***/ }),
 
 /***/ "./formats/header.js":
 /*!***************************!*\
   !*** ./formats/header.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 
 
 class Header extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static formats(domNode) {
     return this.tagName.indexOf(domNode.tagName) + 1;
   }
 
 }
 
 Header.blotName = 'header';
 Header.tagName = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
 /* harmony default export */ __webpack_exports__["default"] = (Header);
 
 /***/ }),
 
 /***/ "./formats/image.js":
 /*!**************************!*\
   !*** ./formats/image.js ***!
   \**************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./link */ "./formats/link.js");
 
 
 const ATTRIBUTES = ['alt', 'height', 'width'];
 
 class Image extends parchment__WEBPACK_IMPORTED_MODULE_0__["EmbedBlot"] {
   static create(value) {
     const node = super.create(value);
 
     if (typeof value === 'string') {
       node.setAttribute('src', this.sanitize(value));
     }
 
     return node;
   }
 
   static formats(domNode) {
     return ATTRIBUTES.reduce((formats, attribute) => {
       if (domNode.hasAttribute(attribute)) {
         formats[attribute] = domNode.getAttribute(attribute);
       }
 
       return formats;
     }, {});
   }
 
   static match(url) {
     return /\.(jpe?g|gif|png)$/.test(url) || /^data:image\/.+;base64/.test(url);
   }
 
   static register() {
     if (/Firefox/i.test(navigator.userAgent)) {
       setTimeout(() => {
         // Disable image resizing in Firefox
         document.execCommand('enableObjectResizing', false, false);
       }, 1);
     }
   }
 
   static sanitize(url) {
     return Object(_link__WEBPACK_IMPORTED_MODULE_1__["sanitize"])(url, ['http', 'https', 'data']) ? url : '//:0';
   }
 
   static value(domNode) {
     return domNode.getAttribute('src');
   }
 
   format(name, value) {
     if (ATTRIBUTES.indexOf(name) > -1) {
       if (value) {
         this.domNode.setAttribute(name, value);
       } else {
         this.domNode.removeAttribute(name);
       }
     } else {
       super.format(name, value);
     }
   }
 
 }
 
 Image.blotName = 'image';
 Image.tagName = 'IMG';
 /* harmony default export */ __webpack_exports__["default"] = (Image);
 
 /***/ }),
 
 /***/ "./formats/indent.js":
 /*!***************************!*\
   !*** ./formats/indent.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 
 class IndentAttributor extends parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"] {
   add(node, value) {
     if (value === '+1' || value === '-1') {
       const indent = this.value(node) || 0;
       value = value === '+1' ? indent + 1 : indent - 1;
     }
 
     if (value === 0) {
       this.remove(node);
       return true;
     }
 
     return super.add(node, value);
   }
 
   canAdd(node, value) {
     return super.canAdd(node, value) || super.canAdd(node, parseInt(value, 10));
   }
 
   value(node) {
     return parseInt(super.value(node), 10) || undefined; // Don't return NaN
   }
 
 }
 
 const IndentClass = new IndentAttributor('indent', 'ql-indent', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK,
   whitelist: [1, 2, 3, 4, 5, 6, 7, 8]
 });
 /* harmony default export */ __webpack_exports__["default"] = (IndentClass);
 
 /***/ }),
 
 /***/ "./formats/italic.js":
 /*!***************************!*\
   !*** ./formats/italic.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _bold__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bold */ "./formats/bold.js");
 
 
 class Italic extends _bold__WEBPACK_IMPORTED_MODULE_0__["default"] {}
 
 Italic.blotName = 'italic';
 Italic.tagName = ['EM', 'I'];
 /* harmony default export */ __webpack_exports__["default"] = (Italic);
 
 /***/ }),
 
 /***/ "./formats/link.js":
 /*!*************************!*\
   !*** ./formats/link.js ***!
   \*************************/
 /*! exports provided: default, sanitize */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Link; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sanitize", function() { return sanitize; });
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 
 
 class Link extends _blots_inline__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create(value) {
     const node = super.create(value);
     node.setAttribute('href', this.sanitize(value));
     node.setAttribute('rel', 'noopener noreferrer');
     node.setAttribute('target', '_blank');
     return node;
   }
 
   static formats(domNode) {
     return domNode.getAttribute('href');
   }
 
   static sanitize(url) {
     return sanitize(url, this.PROTOCOL_WHITELIST) ? url : this.SANITIZED_URL;
   }
 
   format(name, value) {
     if (name !== this.statics.blotName || !value) {
       super.format(name, value);
     } else {
       this.domNode.setAttribute('href', this.constructor.sanitize(value));
     }
   }
 
 }
 
 Link.blotName = 'link';
 Link.tagName = 'A';
 Link.SANITIZED_URL = 'about:blank';
 Link.PROTOCOL_WHITELIST = ['http', 'https', 'mailto', 'tel'];
 
 function sanitize(url, protocols) {
   const anchor = document.createElement('a');
   anchor.href = url;
   const protocol = anchor.href.slice(0, anchor.href.indexOf(':'));
   return protocols.indexOf(protocol) > -1;
 }
 
 
 
 /***/ }),
 
 /***/ "./formats/list.js":
 /*!*************************!*\
   !*** ./formats/list.js ***!
   \*************************/
 /*! exports provided: ListContainer, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ListContainer", function() { return ListContainer; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ListItem; });
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_container__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../blots/container */ "./blots/container.js");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 
 
 
 
 class ListContainer extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {}
 
 ListContainer.blotName = 'list-container';
 ListContainer.tagName = 'OL';
 
 class ListItem extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create(value) {
     const node = super.create();
     node.setAttribute('data-list', value);
     return node;
   }
 
   static formats(domNode) {
     return domNode.getAttribute('data-list') || undefined;
   }
 
   static register() {
     _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].register(ListContainer);
   }
 
   constructor(scroll, domNode) {
     super(scroll, domNode);
     const ui = domNode.ownerDocument.createElement('span');
 
     const listEventHandler = e => {
       if (!scroll.isEnabled()) return;
       const format = this.statics.formats(domNode, scroll);
 
       if (format === 'checked') {
         this.format('list', 'unchecked');
         e.preventDefault();
       } else if (format === 'unchecked') {
         this.format('list', 'checked');
         e.preventDefault();
       }
     };
 
     ui.addEventListener('mousedown', listEventHandler);
     ui.addEventListener('touchstart', listEventHandler);
     this.attachUI(ui);
   }
 
   format(name, value) {
     if (name === this.statics.blotName && value) {
       this.domNode.setAttribute('data-list', value);
     } else {
       super.format(name, value);
     }
   }
 
 }
 
 ListItem.blotName = 'list';
 ListItem.tagName = 'LI';
 ListContainer.allowedChildren = [ListItem];
 ListItem.requiredContainer = ListContainer;
 
 
 /***/ }),
 
 /***/ "./formats/script.js":
 /*!***************************!*\
   !*** ./formats/script.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 
 
 class Script extends _blots_inline__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create(value) {
     if (value === 'super') {
       return document.createElement('sup');
     }
 
     if (value === 'sub') {
       return document.createElement('sub');
     }
 
     return super.create(value);
   }
 
   static formats(domNode) {
     if (domNode.tagName === 'SUB') return 'sub';
     if (domNode.tagName === 'SUP') return 'super';
     return undefined;
   }
 
 }
 
 Script.blotName = 'script';
 Script.tagName = ['SUB', 'SUP'];
 /* harmony default export */ __webpack_exports__["default"] = (Script);
 
 /***/ }),
 
 /***/ "./formats/size.js":
 /*!*************************!*\
   !*** ./formats/size.js ***!
   \*************************/
 /*! exports provided: SizeClass, SizeStyle */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SizeClass", function() { return SizeClass; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SizeStyle", function() { return SizeStyle; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 
 const SizeClass = new parchment__WEBPACK_IMPORTED_MODULE_0__["ClassAttributor"]('size', 'ql-size', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE,
   whitelist: ['small', 'large', 'huge']
 });
 const SizeStyle = new parchment__WEBPACK_IMPORTED_MODULE_0__["StyleAttributor"]('size', 'font-size', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].INLINE,
   whitelist: ['10px', '18px', '32px']
 });
 
 
 /***/ }),
 
 /***/ "./formats/strike.js":
 /*!***************************!*\
   !*** ./formats/strike.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _bold__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bold */ "./formats/bold.js");
 
 
 class Strike extends _bold__WEBPACK_IMPORTED_MODULE_0__["default"] {}
 
 Strike.blotName = 'strike';
 Strike.tagName = ['S', 'STRIKE'];
 /* harmony default export */ __webpack_exports__["default"] = (Strike);
 
 /***/ }),
 
 /***/ "./formats/table.js":
 /*!**************************!*\
   !*** ./formats/table.js ***!
   \**************************/
 /*! exports provided: TableCell, TableRow, TableBody, TableContainer, tableId */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableCell", function() { return TableCell; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableRow", function() { return TableRow; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableBody", function() { return TableBody; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableContainer", function() { return TableContainer; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "tableId", function() { return tableId; });
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_container__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../blots/container */ "./blots/container.js");
 
 
 
 class TableCell extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {
   static create(value) {
     const node = super.create();
 
     if (value) {
       node.setAttribute('data-row', value);
     } else {
       node.setAttribute('data-row', tableId());
     }
 
     return node;
   }
 
   static formats(domNode) {
     if (domNode.hasAttribute('data-row')) {
       return domNode.getAttribute('data-row');
     }
 
     return undefined;
   }
 
   cellOffset() {
     if (this.parent) {
       return this.parent.children.indexOf(this);
     }
 
     return -1;
   }
 
   format(name, value) {
     if (name === TableCell.blotName && value) {
       this.domNode.setAttribute('data-row', value);
     } else {
       super.format(name, value);
     }
   }
 
   row() {
     return this.parent;
   }
 
   rowOffset() {
     if (this.row()) {
       return this.row().rowOffset();
     }
 
     return -1;
   }
 
   table() {
     return this.row() && this.row().table();
   }
 
 }
 
 TableCell.blotName = 'table';
 TableCell.tagName = 'TD';
 
 class TableRow extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {
   checkMerge() {
     if (super.checkMerge() && this.next.children.head != null) {
       const thisHead = this.children.head.formats();
       const thisTail = this.children.tail.formats();
       const nextHead = this.next.children.head.formats();
       const nextTail = this.next.children.tail.formats();
       return thisHead.table === thisTail.table && thisHead.table === nextHead.table && thisHead.table === nextTail.table;
     }
 
     return false;
   }
 
   optimize(...args) {
     super.optimize(...args);
     this.children.forEach(child => {
       if (child.next == null) return;
       const childFormats = child.formats();
       const nextFormats = child.next.formats();
 
       if (childFormats.table !== nextFormats.table) {
         const next = this.splitAfter(child);
 
         if (next) {
           next.optimize();
         } // We might be able to merge with prev now
 
 
         if (this.prev) {
           this.prev.optimize();
         }
       }
     });
   }
 
   rowOffset() {
     if (this.parent) {
       return this.parent.children.indexOf(this);
     }
 
     return -1;
   }
 
   table() {
     return this.parent && this.parent.parent;
   }
 
 }
 
 TableRow.blotName = 'table-row';
 TableRow.tagName = 'TR';
 
 class TableBody extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {}
 
 TableBody.blotName = 'table-body';
 TableBody.tagName = 'TBODY';
 
 class TableContainer extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {
   balanceCells() {
     const rows = this.descendants(TableRow);
     const maxColumns = rows.reduce((max, row) => {
       return Math.max(row.children.length, max);
     }, 0);
     rows.forEach(row => {
       new Array(maxColumns - row.children.length).fill(0).forEach(() => {
         let value;
 
         if (row.children.head != null) {
           value = TableCell.formats(row.children.head.domNode);
         }
 
         const blot = this.scroll.create(TableCell.blotName, value);
         row.appendChild(blot);
         blot.optimize(); // Add break blot
       });
     });
   }
 
   cells(column) {
     return this.rows().map(row => row.children.at(column));
   }
 
   deleteColumn(index) {
     const [body] = this.descendant(TableBody);
     if (body == null || body.children.head == null) return;
     body.children.forEach(row => {
       const cell = row.children.at(index);
 
       if (cell != null) {
         cell.remove();
       }
     });
   }
 
   insertColumn(index) {
     const [body] = this.descendant(TableBody);
     if (body == null || body.children.head == null) return;
     body.children.forEach(row => {
       const ref = row.children.at(index);
       const value = TableCell.formats(row.children.head.domNode);
       const cell = this.scroll.create(TableCell.blotName, value);
       row.insertBefore(cell, ref);
     });
   }
 
   insertRow(index) {
     const [body] = this.descendant(TableBody);
     if (body == null || body.children.head == null) return;
     const id = tableId();
     const row = this.scroll.create(TableRow.blotName);
     body.children.head.children.forEach(() => {
       const cell = this.scroll.create(TableCell.blotName, id);
       row.appendChild(cell);
     });
     const ref = body.children.at(index);
     body.insertBefore(row, ref);
   }
 
   rows() {
     const body = this.children.head;
     if (body == null) return [];
     return body.children.map(row => row);
   }
 
 }
 
 TableContainer.blotName = 'table-container';
 TableContainer.tagName = 'TABLE';
 TableContainer.allowedChildren = [TableBody];
 TableBody.requiredContainer = TableContainer;
 TableBody.allowedChildren = [TableRow];
 TableRow.requiredContainer = TableBody;
 TableRow.allowedChildren = [TableCell];
 TableCell.requiredContainer = TableRow;
 
 function tableId() {
   const id = Math.random().toString(36).slice(2, 6);
   return "row-".concat(id);
 }
 
 
 
 /***/ }),
 
 /***/ "./formats/underline.js":
 /*!******************************!*\
   !*** ./formats/underline.js ***!
   \******************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 
 
 class Underline extends _blots_inline__WEBPACK_IMPORTED_MODULE_0__["default"] {}
 
 Underline.blotName = 'underline';
 Underline.tagName = 'U';
 /* harmony default export */ __webpack_exports__["default"] = (Underline);
 
 /***/ }),
 
 /***/ "./formats/video.js":
 /*!**************************!*\
   !*** ./formats/video.js ***!
   \**************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./link */ "./formats/link.js");
 
 
 const ATTRIBUTES = ['height', 'width'];
 
 class Video extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["BlockEmbed"] {
   static create(value) {
     const node = super.create(value);
     node.setAttribute('frameborder', '0');
     node.setAttribute('allowfullscreen', true);
     node.setAttribute('src', this.sanitize(value));
     return node;
   }
 
   static formats(domNode) {
     return ATTRIBUTES.reduce((formats, attribute) => {
       if (domNode.hasAttribute(attribute)) {
         formats[attribute] = domNode.getAttribute(attribute);
       }
 
       return formats;
     }, {});
   }
 
   static sanitize(url) {
     return _link__WEBPACK_IMPORTED_MODULE_1__["default"].sanitize(url); // eslint-disable-line import/no-named-as-default-member
   }
 
   static value(domNode) {
     return domNode.getAttribute('src');
   }
 
   format(name, value) {
     if (ATTRIBUTES.indexOf(name) > -1) {
       if (value) {
         this.domNode.setAttribute(name, value);
       } else {
         this.domNode.removeAttribute(name);
       }
     } else {
       super.format(name, value);
     }
   }
 
   html() {
     const {
       video
     } = this.value();
     return "<a href=\"".concat(video, "\">").concat(video, "</a>");
   }
 
 }
 
 Video.blotName = 'video';
 Video.className = 'ql-video';
 Video.tagName = 'IFRAME';
 /* harmony default export */ __webpack_exports__["default"] = (Video);
 
 /***/ }),
 
 /***/ "./modules/clipboard.js":
 /*!******************************!*\
   !*** ./modules/clipboard.js ***!
   \******************************/
 /*! exports provided: default, matchAttributor, matchBlot, matchNewline, matchText, traverse */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Clipboard; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "matchAttributor", function() { return matchAttributor; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "matchBlot", function() { return matchBlot; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "matchNewline", function() { return matchNewline; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "matchText", function() { return matchText; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "traverse", function() { return traverse; });
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_logger__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/logger */ "./core/logger.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 /* harmony import */ var _formats_align__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../formats/align */ "./formats/align.js");
 /* harmony import */ var _formats_background__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../formats/background */ "./formats/background.js");
 /* harmony import */ var _formats_code__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../formats/code */ "./formats/code.js");
 /* harmony import */ var _formats_color__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../formats/color */ "./formats/color.js");
 /* harmony import */ var _formats_direction__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../formats/direction */ "./formats/direction.js");
 /* harmony import */ var _formats_font__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../formats/font */ "./formats/font.js");
 /* harmony import */ var _formats_size__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../formats/size */ "./formats/size.js");
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 const debug = Object(_core_logger__WEBPACK_IMPORTED_MODULE_5__["default"])('quill:clipboard');
 const CLIPBOARD_CONFIG = [[Node.TEXT_NODE, matchText], [Node.TEXT_NODE, matchNewline], ['br', matchBreak], [Node.ELEMENT_NODE, matchNewline], [Node.ELEMENT_NODE, matchBlot], [Node.ELEMENT_NODE, matchAttributor], [Node.ELEMENT_NODE, matchStyles], ['li', matchIndent], ['ol, ul', matchList], ['pre', matchCodeBlock], ['tr', matchTable], ['b', matchAlias.bind(matchAlias, 'bold')], ['i', matchAlias.bind(matchAlias, 'italic')], ['strike', matchAlias.bind(matchAlias, 'strike')], ['style', matchIgnore]];
 const ATTRIBUTE_ATTRIBUTORS = [_formats_align__WEBPACK_IMPORTED_MODULE_7__["AlignAttribute"], _formats_direction__WEBPACK_IMPORTED_MODULE_11__["DirectionAttribute"]].reduce((memo, attr) => {
   memo[attr.keyName] = attr;
   return memo;
 }, {});
 const STYLE_ATTRIBUTORS = [_formats_align__WEBPACK_IMPORTED_MODULE_7__["AlignStyle"], _formats_background__WEBPACK_IMPORTED_MODULE_8__["BackgroundStyle"], _formats_color__WEBPACK_IMPORTED_MODULE_10__["ColorStyle"], _formats_direction__WEBPACK_IMPORTED_MODULE_11__["DirectionStyle"], _formats_font__WEBPACK_IMPORTED_MODULE_12__["FontStyle"], _formats_size__WEBPACK_IMPORTED_MODULE_13__["SizeStyle"]].reduce((memo, attr) => {
   memo[attr.keyName] = attr;
   return memo;
 }, {});
 
 class Clipboard extends _core_module__WEBPACK_IMPORTED_MODULE_6__["default"] {
   constructor(quill, options) {
     super(quill, options);
     this.quill.root.addEventListener('copy', e => this.onCaptureCopy(e, false));
     this.quill.root.addEventListener('cut', e => this.onCaptureCopy(e, true));
     this.quill.root.addEventListener('paste', this.onCapturePaste.bind(this));
     this.matchers = [];
     CLIPBOARD_CONFIG.concat(this.options.matchers).forEach(([selector, matcher]) => {
       this.addMatcher(selector, matcher);
     });
   }
 
   addMatcher(selector, matcher) {
     this.matchers.push([selector, matcher]);
   }
 
   convert({
     html,
     text
   }, formats = {}) {
     if (formats[_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]) {
       return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(text, {
         [_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]: formats[_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]
       });
     }
 
     if (!html) {
       return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(text || '');
     }
 
     const doc = new DOMParser().parseFromString(html, 'text/html');
     const container = doc.body;
     const nodeMatches = new WeakMap();
     const [elementMatchers, textMatchers] = this.prepareMatching(container, nodeMatches);
     const delta = traverse(this.quill.scroll, container, elementMatchers, textMatchers, nodeMatches); // Remove trailing newline
 
     if (deltaEndsWith(delta, '\n') && (delta.ops[delta.ops.length - 1].attributes == null || formats.table)) {
       return delta.compose(new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().retain(delta.length() - 1).delete(1));
     }
 
     return delta;
   }
 
   dangerouslyPasteHTML(index, html, source = _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
     if (typeof index === 'string') {
       const delta = this.convert({
         html: index,
         text: ''
       });
       this.quill.setContents(delta, html);
       this.quill.setSelection(0, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
     } else {
       const paste = this.convert({
         html,
         text: ''
       });
       this.quill.updateContents(new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().retain(index).concat(paste), source);
       this.quill.setSelection(index + paste.length(), _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
     }
   }
 
   onCaptureCopy(e, isCut = false) {
     if (e.defaultPrevented) return;
     e.preventDefault();
     const [range] = this.quill.selection.getRange();
     if (range == null) return;
     const {
       html,
       text
     } = this.onCopy(range, isCut);
     e.clipboardData.setData('text/plain', text);
     e.clipboardData.setData('text/html', html);
 
     if (isCut) {
       this.quill.deleteText(range, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER);
     }
   }
 
   onCapturePaste(e) {
     if (e.defaultPrevented || !this.quill.isEnabled()) return;
     e.preventDefault();
     const range = this.quill.getSelection(true);
     if (range == null) return;
     const html = e.clipboardData.getData('text/html');
     const text = e.clipboardData.getData('text/plain');
     const files = Array.from(e.clipboardData.files || []);
 
     if (!html && files.length > 0) {
       this.quill.uploader.upload(range, files);
     } else {
       this.onPaste(range, {
         html,
         text
       });
     }
   }
 
   onCopy(range) {
     const text = this.quill.getText(range);
     const html = this.quill.getSemanticHTML(range);
     return {
       html,
       text
     };
   }
 
   onPaste(range, {
     text,
     html
   }) {
     const formats = this.quill.getFormat(range.index);
     const pastedDelta = this.convert({
       text,
       html
     }, formats);
     debug.log('onPaste', pastedDelta, {
       text,
       html
     });
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().retain(range.index).delete(range.length).concat(pastedDelta);
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER); // range.length contributes to delta.length()
 
     this.quill.setSelection(delta.length() - range.length, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
     this.quill.scrollIntoView();
   }
 
   prepareMatching(container, nodeMatches) {
     const elementMatchers = [];
     const textMatchers = [];
     this.matchers.forEach(pair => {
       const [selector, matcher] = pair;
 
       switch (selector) {
         case Node.TEXT_NODE:
           textMatchers.push(matcher);
           break;
 
         case Node.ELEMENT_NODE:
           elementMatchers.push(matcher);
           break;
 
         default:
           Array.from(container.querySelectorAll(selector)).forEach(node => {
             if (nodeMatches.has(node)) {
               const matches = nodeMatches.get(node);
               matches.push(matcher);
             } else {
               nodeMatches.set(node, [matcher]);
             }
           });
           break;
       }
     });
     return [elementMatchers, textMatchers];
   }
 
 }
 
 Clipboard.DEFAULTS = {
   matchers: []
 };
 
 function applyFormat(delta, format, value) {
   if (typeof format === 'object') {
     return Object.keys(format).reduce((newDelta, key) => {
       return applyFormat(newDelta, key, format[key]);
     }, delta);
   }
 
   return delta.reduce((newDelta, op) => {
     if (op.attributes && op.attributes[format]) {
       return newDelta.push(op);
     }
 
     return newDelta.insert(op.insert, extend__WEBPACK_IMPORTED_MODULE_0___default()({}, {
       [format]: value
     }, op.attributes));
   }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
 }
 
 function deltaEndsWith(delta, text) {
   let endText = '';
 
   for (let i = delta.ops.length - 1; i >= 0 && endText.length < text.length; --i // eslint-disable-line no-plusplus
   ) {
     const op = delta.ops[i];
     if (typeof op.insert !== 'string') break;
     endText = op.insert + endText;
   }
 
   return endText.slice(-1 * text.length) === text;
 }
 
 function isLine(node) {
   if (node.childNodes.length === 0) return false; // Exclude embed blocks
 
   return ['address', 'article', 'blockquote', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'iframe', 'li', 'main', 'nav', 'ol', 'output', 'p', 'pre', 'section', 'table', 'td', 'tr', 'ul', 'video'].includes(node.tagName.toLowerCase());
 }
 
 const preNodes = new WeakMap();
 
 function isPre(node) {
   if (node == null) return false;
 
   if (!preNodes.has(node)) {
     if (node.tagName === 'PRE') {
       preNodes.set(node, true);
     } else {
       preNodes.set(node, isPre(node.parentNode));
     }
   }
 
   return preNodes.get(node);
 }
 
 function traverse(scroll, node, elementMatchers, textMatchers, nodeMatches) {
   // Post-order
   if (node.nodeType === node.TEXT_NODE) {
     return textMatchers.reduce((delta, matcher) => {
       return matcher(node, delta, scroll);
     }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
   }
 
   if (node.nodeType === node.ELEMENT_NODE) {
     return Array.from(node.childNodes || []).reduce((delta, childNode) => {
       let childrenDelta = traverse(scroll, childNode, elementMatchers, textMatchers, nodeMatches);
 
       if (childNode.nodeType === node.ELEMENT_NODE) {
         childrenDelta = elementMatchers.reduce((reducedDelta, matcher) => {
           return matcher(childNode, reducedDelta, scroll);
         }, childrenDelta);
         childrenDelta = (nodeMatches.get(childNode) || []).reduce((reducedDelta, matcher) => {
           return matcher(childNode, reducedDelta, scroll);
         }, childrenDelta);
       }
 
       return delta.concat(childrenDelta);
     }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
   }
 
   return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a();
 }
 
 function matchAlias(format, node, delta) {
   return applyFormat(delta, format, true);
 }
 
 function matchAttributor(node, delta, scroll) {
   const attributes = parchment__WEBPACK_IMPORTED_MODULE_2__["Attributor"].keys(node);
   const classes = parchment__WEBPACK_IMPORTED_MODULE_2__["ClassAttributor"].keys(node);
   const styles = parchment__WEBPACK_IMPORTED_MODULE_2__["StyleAttributor"].keys(node);
   const formats = {};
   attributes.concat(classes).concat(styles).forEach(name => {
     let attr = scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].ATTRIBUTE);
 
     if (attr != null) {
       formats[attr.attrName] = attr.value(node);
       if (formats[attr.attrName]) return;
     }
 
     attr = ATTRIBUTE_ATTRIBUTORS[name];
 
     if (attr != null && (attr.attrName === name || attr.keyName === name)) {
       formats[attr.attrName] = attr.value(node) || undefined;
     }
 
     attr = STYLE_ATTRIBUTORS[name];
 
     if (attr != null && (attr.attrName === name || attr.keyName === name)) {
       attr = STYLE_ATTRIBUTORS[name];
       formats[attr.attrName] = attr.value(node) || undefined;
     }
   });
 
   if (Object.keys(formats).length > 0) {
     return applyFormat(delta, formats);
   }
 
   return delta;
 }
 
 function matchBlot(node, delta, scroll) {
   const match = scroll.query(node);
   if (match == null) return delta;
 
   if (match.prototype instanceof parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"]) {
     const embed = {};
     const value = match.value(node);
 
     if (value != null) {
       embed[match.blotName] = value;
       return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(embed, match.formats(node, scroll));
     }
   } else {
     if (match.prototype instanceof parchment__WEBPACK_IMPORTED_MODULE_2__["BlockBlot"] && !deltaEndsWith(delta, '\n')) {
       delta.insert('\n');
     }
 
     if (typeof match.formats === 'function') {
       return applyFormat(delta, match.blotName, match.formats(node, scroll));
     }
   }
 
   return delta;
 }
 
 function matchBreak(node, delta) {
   if (!deltaEndsWith(delta, '\n')) {
     delta.insert('\n');
   }
 
   return delta;
 }
 
 function matchCodeBlock(node, delta, scroll) {
   const match = scroll.query('code-block');
   const language = match ? match.formats(node, scroll) : true;
   return applyFormat(delta, 'code-block', language);
 }
 
 function matchIgnore() {
   return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a();
 }
 
 function matchIndent(node, delta, scroll) {
   const match = scroll.query(node);
 
   if (match == null || match.blotName !== 'list' || !deltaEndsWith(delta, '\n')) {
     return delta;
   }
 
   let indent = -1;
   let parent = node.parentNode;
 
   while (parent != null) {
     if (['OL', 'UL'].includes(parent.tagName)) {
       indent += 1;
     }
 
     parent = parent.parentNode;
   }
 
   if (indent <= 0) return delta;
   return delta.reduce((composed, op) => {
     if (op.attributes && op.attributes.list) {
       return composed.push(op);
     }
 
     return composed.insert(op.insert, {
       indent,
       ...(op.attributes || {})
     });
   }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
 }
 
 function matchList(node, delta) {
   const list = node.tagName === 'OL' ? 'ordered' : 'bullet';
   return applyFormat(delta, 'list', list);
 }
 
 function matchNewline(node, delta, scroll) {
   if (!deltaEndsWith(delta, '\n')) {
     if (isLine(node)) {
       return delta.insert('\n');
     }
 
     if (delta.length() > 0 && node.nextSibling) {
       let {
         nextSibling
       } = node;
 
       while (nextSibling != null) {
         if (isLine(nextSibling)) {
           return delta.insert('\n');
         }
 
         const match = scroll.query(nextSibling);
 
         if (match && match.prototype instanceof _blots_block__WEBPACK_IMPORTED_MODULE_3__["BlockEmbed"]) {
           return delta.insert('\n');
         }
 
         nextSibling = nextSibling.firstChild;
       }
     }
   }
 
   return delta;
 }
 
 function matchStyles(node, delta) {
   const formats = {};
   const style = node.style || {};
 
   if (style.fontStyle === 'italic') {
     formats.italic = true;
   }
 
   if (style.textDecoration === 'underline') {
     formats.underline = true;
   }
 
   if (style.textDecoration === 'line-through') {
     formats.strike = true;
   }
 
   if (style.fontWeight.startsWith('bold') || parseInt(style.fontWeight, 10) >= 700) {
     formats.bold = true;
   }
 
   if (Object.keys(formats).length > 0) {
     delta = applyFormat(delta, formats);
   }
 
   if (parseFloat(style.textIndent || 0) > 0) {
     // Could be 0.5in
     return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert('\t').concat(delta);
   }
 
   return delta;
 }
 
 function matchTable(node, delta) {
   const table = node.parentNode.tagName === 'TABLE' ? node.parentNode : node.parentNode.parentNode;
   const rows = Array.from(table.querySelectorAll('tr'));
   const row = rows.indexOf(node) + 1;
   return applyFormat(delta, 'table', row);
 }
 
 function matchText(node, delta) {
   let text = node.data; // Word represents empty line with <o:p>&nbsp;</o:p>
 
   if (node.parentNode.tagName === 'O:P') {
     return delta.insert(text.trim());
   }
 
   if (text.trim().length === 0 && text.includes('\n')) {
     return delta;
   }
 
   if (!isPre(node)) {
     const replacer = (collapse, match) => {
       const replaced = match.replace(/[^\u00a0]/g, ''); // \u00a0 is nbsp;
 
       return replaced.length < 1 && collapse ? ' ' : replaced;
     };
 
     text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
     text = text.replace(/\s\s+/g, replacer.bind(replacer, true)); // collapse whitespace
 
     if (node.previousSibling == null && isLine(node.parentNode) || node.previousSibling != null && isLine(node.previousSibling)) {
       text = text.replace(/^\s+/, replacer.bind(replacer, false));
     }
 
     if (node.nextSibling == null && isLine(node.parentNode) || node.nextSibling != null && isLine(node.nextSibling)) {
       text = text.replace(/\s+$/, replacer.bind(replacer, false));
     }
   }
 
   return delta.insert(text);
 }
 
 
 
 /***/ }),
 
 /***/ "./modules/history.js":
 /*!****************************!*\
   !*** ./modules/history.js ***!
   \****************************/
 /*! exports provided: default, getLastChangeIndex */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return History; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getLastChangeIndex", function() { return getLastChangeIndex; });
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 
 
 
 
 class History extends _core_module__WEBPACK_IMPORTED_MODULE_2__["default"] {
   constructor(quill, options) {
     super(quill, options);
     this.lastRecorded = 0;
     this.ignoreChange = false;
     this.clear();
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.EDITOR_CHANGE, (eventName, delta, oldDelta, source) => {
       if (eventName !== _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.TEXT_CHANGE || this.ignoreChange) return;
 
       if (!this.options.userOnly || source === _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER) {
         this.record(delta, oldDelta);
       } else {
         this.transform(delta);
       }
     });
     this.quill.keyboard.addBinding({
       key: 'z',
       shortKey: true
     }, this.undo.bind(this));
     this.quill.keyboard.addBinding({
       key: 'z',
       shortKey: true,
       shiftKey: true
     }, this.redo.bind(this));
 
     if (/Win/i.test(navigator.platform)) {
       this.quill.keyboard.addBinding({
         key: 'y',
         shortKey: true
       }, this.redo.bind(this));
     }
   }
 
   change(source, dest) {
     if (this.stack[source].length === 0) return;
     const delta = this.stack[source].pop();
     const base = this.quill.getContents();
     const inverseDelta = delta.invert(base);
     this.stack[dest].push(inverseDelta);
     this.lastRecorded = 0;
     this.ignoreChange = true;
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
     this.ignoreChange = false;
     const index = getLastChangeIndex(this.quill.scroll, delta);
     this.quill.setSelection(index);
   }
 
   clear() {
     this.stack = {
       undo: [],
       redo: []
     };
   }
 
   cutoff() {
     this.lastRecorded = 0;
   }
 
   record(changeDelta, oldDelta) {
     if (changeDelta.ops.length === 0) return;
     this.stack.redo = [];
     let undoDelta = changeDelta.invert(oldDelta);
     const timestamp = Date.now();
 
     if (this.lastRecorded + this.options.delay > timestamp && this.stack.undo.length > 0) {
       const delta = this.stack.undo.pop();
       undoDelta = undoDelta.compose(delta);
     } else {
       this.lastRecorded = timestamp;
     }
 
     if (undoDelta.length() === 0) return;
     this.stack.undo.push(undoDelta);
 
     if (this.stack.undo.length > this.options.maxStack) {
       this.stack.undo.shift();
     }
   }
 
   redo() {
     this.change('redo', 'undo');
   }
 
   transform(delta) {
     transformStack(this.stack.undo, delta);
     transformStack(this.stack.redo, delta);
   }
 
   undo() {
     this.change('undo', 'redo');
   }
 
 }
 
 History.DEFAULTS = {
   delay: 1000,
   maxStack: 100,
   userOnly: false
 };
 
 function transformStack(stack, delta) {
   let remoteDelta = delta;
 
   for (let i = stack.length - 1; i >= 0; i -= 1) {
     const oldDelta = stack[i];
     stack[i] = remoteDelta.transform(oldDelta, true);
     remoteDelta = oldDelta.transform(remoteDelta);
 
     if (stack[i].length() === 0) {
       stack.splice(i, 1);
     }
   }
 }
 
 function endsWithNewlineChange(scroll, delta) {
   const lastOp = delta.ops[delta.ops.length - 1];
   if (lastOp == null) return false;
 
   if (lastOp.insert != null) {
     return typeof lastOp.insert === 'string' && lastOp.insert.endsWith('\n');
   }
 
   if (lastOp.attributes != null) {
     return Object.keys(lastOp.attributes).some(attr => {
       return scroll.query(attr, parchment__WEBPACK_IMPORTED_MODULE_0__["Scope"].BLOCK) != null;
     });
   }
 
   return false;
 }
 
 function getLastChangeIndex(scroll, delta) {
   const deleteLength = delta.reduce((length, op) => {
     return length + (op.delete || 0);
   }, 0);
   let changeIndex = delta.length() - deleteLength;
 
   if (endsWithNewlineChange(scroll, delta)) {
     changeIndex -= 1;
   }
 
   return changeIndex;
 }
 
 
 
 /***/ }),
 
 /***/ "./modules/keyboard.js":
 /*!*****************************!*\
   !*** ./modules/keyboard.js ***!
   \*****************************/
 /*! exports provided: default, SHORTKEY, normalize */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Keyboard; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SHORTKEY", function() { return SHORTKEY; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! clone */ "./node_modules/clone/clone.js");
 /* harmony import */ var clone__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(clone__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js");
 /* harmony import */ var deep_equal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(deep_equal__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_3__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_logger__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/logger */ "./core/logger.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 
 
 
 
 
 
 
 
 const debug = Object(_core_logger__WEBPACK_IMPORTED_MODULE_6__["default"])('quill:keyboard');
 const SHORTKEY = /Mac/i.test(navigator.platform) ? 'metaKey' : 'ctrlKey';
 
 class Keyboard extends _core_module__WEBPACK_IMPORTED_MODULE_7__["default"] {
   static match(evt, binding) {
     if (['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].some(key => {
       return !!binding[key] !== evt[key] && binding[key] !== null;
     })) {
       return false;
     }
 
     return binding.key === evt.key || binding.key === evt.which;
   }
 
   constructor(quill, options) {
     super(quill, options);
     this.bindings = {};
     Object.keys(this.options.bindings).forEach(name => {
       if (this.options.bindings[name]) {
         this.addBinding(this.options.bindings[name]);
       }
     });
     this.addBinding({
       key: 'Enter',
       shiftKey: null
     }, this.handleEnter);
     this.addBinding({
       key: 'Enter',
       metaKey: null,
       ctrlKey: null,
       altKey: null
     }, () => {});
 
     if (/Firefox/i.test(navigator.userAgent)) {
       // Need to handle delete and backspace for Firefox in the general case #1171
       this.addBinding({
         key: 'Backspace'
       }, {
         collapsed: true
       }, this.handleBackspace);
       this.addBinding({
         key: 'Delete'
       }, {
         collapsed: true
       }, this.handleDelete);
     } else {
       this.addBinding({
         key: 'Backspace'
       }, {
         collapsed: true,
         prefix: /^.?$/
       }, this.handleBackspace);
       this.addBinding({
         key: 'Delete'
       }, {
         collapsed: true,
         suffix: /^.?$/
       }, this.handleDelete);
     }
 
     this.addBinding({
       key: 'Backspace'
     }, {
       collapsed: false
     }, this.handleDeleteRange);
     this.addBinding({
       key: 'Delete'
     }, {
       collapsed: false
     }, this.handleDeleteRange);
     this.addBinding({
       key: 'Backspace',
       altKey: null,
       ctrlKey: null,
       metaKey: null,
       shiftKey: null
     }, {
       collapsed: true,
       offset: 0
     }, this.handleBackspace);
     this.listen();
   }
 
   addBinding(keyBinding, context = {}, handler = {}) {
     const binding = normalize(keyBinding);
 
     if (binding == null) {
       debug.warn('Attempted to add invalid keyboard binding', binding);
       return;
     }
 
     if (typeof context === 'function') {
       context = {
         handler: context
       };
     }
 
     if (typeof handler === 'function') {
       handler = {
         handler
       };
     }
 
     const keys = Array.isArray(binding.key) ? binding.key : [binding.key];
     keys.forEach(key => {
       const singleBinding = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, binding, {
         key
       }, context, handler);
       this.bindings[singleBinding.key] = this.bindings[singleBinding.key] || [];
       this.bindings[singleBinding.key].push(singleBinding);
     });
   }
 
   listen() {
     this.quill.root.addEventListener('keydown', evt => {
       if (evt.defaultPrevented || evt.isComposing) return;
       const bindings = (this.bindings[evt.key] || []).concat(this.bindings[evt.which] || []);
       const matches = bindings.filter(binding => Keyboard.match(evt, binding));
       if (matches.length === 0) return;
       const range = this.quill.getSelection();
       if (range == null || !this.quill.hasFocus()) return;
       const [line, offset] = this.quill.getLine(range.index);
       const [leafStart, offsetStart] = this.quill.getLeaf(range.index);
       const [leafEnd, offsetEnd] = range.length === 0 ? [leafStart, offsetStart] : this.quill.getLeaf(range.index + range.length);
       const prefixText = leafStart instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["TextBlot"] ? leafStart.value().slice(0, offsetStart) : '';
       const suffixText = leafEnd instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["TextBlot"] ? leafEnd.value().slice(offsetEnd) : '';
       const curContext = {
         collapsed: range.length === 0,
         empty: range.length === 0 && line.length() <= 1,
         format: this.quill.getFormat(range),
         line,
         offset,
         prefix: prefixText,
         suffix: suffixText,
         event: evt
       };
       const prevented = matches.some(binding => {
         if (binding.collapsed != null && binding.collapsed !== curContext.collapsed) {
           return false;
         }
 
         if (binding.empty != null && binding.empty !== curContext.empty) {
           return false;
         }
 
         if (binding.offset != null && binding.offset !== curContext.offset) {
           return false;
         }
 
         if (Array.isArray(binding.format)) {
           // any format is present
           if (binding.format.every(name => curContext.format[name] == null)) {
             return false;
           }
         } else if (typeof binding.format === 'object') {
           // all formats must match
           if (!Object.keys(binding.format).every(name => {
             if (binding.format[name] === true) return curContext.format[name] != null;
             if (binding.format[name] === false) return curContext.format[name] == null;
             return deep_equal__WEBPACK_IMPORTED_MODULE_1___default()(binding.format[name], curContext.format[name]);
           })) {
             return false;
           }
         }
 
         if (binding.prefix != null && !binding.prefix.test(curContext.prefix)) {
           return false;
         }
 
         if (binding.suffix != null && !binding.suffix.test(curContext.suffix)) {
           return false;
         }
 
         return binding.handler.call(this, range, curContext, binding) !== true;
       });
 
       if (prevented) {
         evt.preventDefault();
       }
     });
   }
 
   handleBackspace(range, context) {
     // Check for astral symbols
     const length = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(context.prefix) ? 2 : 1;
     if (range.index === 0 || this.quill.getLength() <= 1) return;
     let formats = {};
     const [line] = this.quill.getLine(range.index);
     let delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index - length).delete(length);
 
     if (context.offset === 0) {
       // Always deleting newline here, length always 1
       const [prev] = this.quill.getLine(range.index - 1);
 
       if (prev) {
         const curFormats = line.formats();
         const prevFormats = this.quill.getFormat(range.index - 1, 1);
         formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(curFormats, prevFormats) || {};
 
         if (Object.keys(formats).length > 0) {
           // line.length() - 1 targets \n in line, another -1 for newline being deleted
           const formatDelta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index + line.length() - 2).retain(1, formats);
           delta = delta.compose(formatDelta);
         }
       }
     }
 
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     this.quill.focus();
   }
 
   handleDelete(range, context) {
     // Check for astral symbols
     const length = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(context.suffix) ? 2 : 1;
     if (range.index >= this.quill.getLength() - length) return;
     let formats = {};
     const [line] = this.quill.getLine(range.index);
     let delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(length);
 
     if (context.offset >= line.length() - 1) {
       const [next] = this.quill.getLine(range.index + 1);
 
       if (next) {
         const curFormats = line.formats();
         const nextFormats = this.quill.getFormat(range.index, 1);
         formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(curFormats, nextFormats) || {};
 
         if (Object.keys(formats).length > 0) {
           delta = delta.retain(next.length() - 1).retain(1, formats);
         }
       }
     }
 
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     this.quill.focus();
   }
 
   handleDeleteRange(range) {
     const lines = this.quill.getLines(range);
     let formats = {};
 
     if (lines.length > 1) {
       const firstFormats = lines[0].formats();
       const lastFormats = lines[lines.length - 1].formats();
       formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(lastFormats, firstFormats) || {};
     }
 
     this.quill.deleteText(range, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
 
     if (Object.keys(formats).length > 0) {
       this.quill.formatLine(range.index, 1, formats, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     }
 
     this.quill.setSelection(range.index, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
     this.quill.focus();
   }
 
   handleEnter(range, context) {
     const lineFormats = Object.keys(context.format).reduce((formats, format) => {
       if (this.quill.scroll.query(format, parchment__WEBPACK_IMPORTED_MODULE_4__["Scope"].BLOCK) && !Array.isArray(context.format[format])) {
         formats[format] = context.format[format];
       }
 
       return formats;
     }, {});
     const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(range.length).insert('\n', lineFormats);
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
     this.quill.focus();
     Object.keys(context.format).forEach(name => {
       if (lineFormats[name] != null) return;
       if (Array.isArray(context.format[name])) return;
       if (name === 'code' || name === 'link') return;
       this.quill.format(name, context.format[name], _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     });
   }
 
 }
 
 Keyboard.DEFAULTS = {
   bindings: {
     bold: makeFormatHandler('bold'),
     italic: makeFormatHandler('italic'),
     underline: makeFormatHandler('underline'),
     indent: {
       // highlight tab or tab at beginning of list, indent or blockquote
       key: 'Tab',
       format: ['blockquote', 'indent', 'list'],
 
       handler(range, context) {
         if (context.collapsed && context.offset !== 0) return true;
         this.quill.format('indent', '+1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         return false;
       }
 
     },
     outdent: {
       key: 'Tab',
       shiftKey: true,
       format: ['blockquote', 'indent', 'list'],
 
       // highlight tab or tab at beginning of list, indent or blockquote
       handler(range, context) {
         if (context.collapsed && context.offset !== 0) return true;
         this.quill.format('indent', '-1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         return false;
       }
 
     },
     'outdent backspace': {
       key: 'Backspace',
       collapsed: true,
       shiftKey: null,
       metaKey: null,
       ctrlKey: null,
       altKey: null,
       format: ['indent', 'list'],
       offset: 0,
 
       handler(range, context) {
         if (context.format.indent != null) {
           this.quill.format('indent', '-1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         } else if (context.format.list != null) {
           this.quill.format('list', false, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         }
       }
 
     },
     'indent code-block': makeCodeBlockHandler(true),
     'outdent code-block': makeCodeBlockHandler(false),
     'remove tab': {
       key: 'Tab',
       shiftKey: true,
       collapsed: true,
       prefix: /\t$/,
 
       handler(range) {
         this.quill.deleteText(range.index - 1, 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       }
 
     },
     tab: {
       key: 'Tab',
 
       handler(range, context) {
         if (context.format.table) return true;
         this.quill.history.cutoff();
         const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(range.length).insert('\t');
         this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         this.quill.history.cutoff();
         this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
         return false;
       }
 
     },
     'blockquote empty enter': {
       key: 'Enter',
       collapsed: true,
       format: ['blockquote'],
       empty: true,
 
       handler() {
         this.quill.format('blockquote', false, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       }
 
     },
     'list empty enter': {
       key: 'Enter',
       collapsed: true,
       format: ['list'],
       empty: true,
 
       handler(range, context) {
         const formats = {
           list: false
         };
 
         if (context.format.indent) {
           formats.indent = false;
         }
 
         this.quill.formatLine(range.index, range.length, formats, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       }
 
     },
     'checklist enter': {
       key: 'Enter',
       collapsed: true,
       format: {
         list: 'checked'
       },
 
       handler(range) {
         const [line, offset] = this.quill.getLine(range.index);
         const formats = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, line.formats(), {
           list: 'checked'
         });
         const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).insert('\n', formats).retain(line.length() - offset - 1).retain(1, {
           list: 'unchecked'
         });
         this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
         this.quill.scrollIntoView();
       }
 
     },
     'header enter': {
       key: 'Enter',
       collapsed: true,
       format: ['header'],
       suffix: /^$/,
 
       handler(range, context) {
         const [line, offset] = this.quill.getLine(range.index);
         const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).insert('\n', context.format).retain(line.length() - offset - 1).retain(1, {
           header: null
         });
         this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
         this.quill.scrollIntoView();
       }
 
     },
     'table backspace': {
       key: 'Backspace',
       format: ['table'],
       collapsed: true,
       offset: 0,
 
       handler() {}
 
     },
     'table delete': {
       key: 'Delete',
       format: ['table'],
       collapsed: true,
       suffix: /^$/,
 
       handler() {}
 
     },
     'table enter': {
       key: 'Enter',
       shiftKey: null,
       format: ['table'],
 
       handler(range) {
         const module = this.quill.getModule('table');
 
         if (module) {
           const [table, row, cell, offset] = module.getTable(range);
           const shift = tableSide(table, row, cell, offset);
           if (shift == null) return;
           let index = table.offset();
 
           if (shift < 0) {
             const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert('\n');
             this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
             this.quill.setSelection(range.index + 1, range.length, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
           } else if (shift > 0) {
             index += table.length();
             const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert('\n');
             this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
             this.quill.setSelection(index, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
           }
         }
       }
 
     },
     'table tab': {
       key: 'Tab',
       shiftKey: null,
       format: ['table'],
 
       handler(range, context) {
         const {
           event,
           line: cell
         } = context;
         const offset = cell.offset(this.quill.scroll);
 
         if (event.shiftKey) {
           this.quill.setSelection(offset - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         } else {
           this.quill.setSelection(offset + cell.length(), _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         }
       }
 
     },
     'list autofill': {
       key: ' ',
       shiftKey: null,
       collapsed: true,
       format: {
         list: false,
         'code-block': false,
         blockquote: false,
         header: false,
         table: false
       },
       prefix: /^\s*?(\d+\.|-|\*|\[ ?\]|\[x\])$/,
 
       handler(range, context) {
         if (this.quill.scroll.query('list') == null) return true;
         const {
           length
         } = context.prefix;
         const [line, offset] = this.quill.getLine(range.index);
         if (offset > length) return true;
         let value;
 
         switch (context.prefix.trim()) {
           case '[]':
           case '[ ]':
             value = 'unchecked';
             break;
 
           case '[x]':
             value = 'checked';
             break;
 
           case '-':
           case '*':
             value = 'bullet';
             break;
 
           default:
             value = 'ordered';
         }
 
         this.quill.insertText(range.index, ' ', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         this.quill.history.cutoff();
         const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index - offset).delete(length + 1).retain(line.length() - 2 - offset).retain(1, {
           list: value
         });
         this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         this.quill.history.cutoff();
         this.quill.setSelection(range.index - length, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
         return false;
       }
 
     },
     'code exit': {
       key: 'Enter',
       collapsed: true,
       format: ['code-block'],
       prefix: /^$/,
       suffix: /^\s*$/,
 
       handler(range) {
         const [line, offset] = this.quill.getLine(range.index);
         let numLines = 2;
         let cur = line;
 
         while (cur != null && cur.length() <= 1 && cur.formats()['code-block']) {
           cur = cur.prev;
           numLines -= 1; // Requisite prev lines are empty
 
           if (numLines <= 0) {
             const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index + line.length() - offset - 2).retain(1, {
               'code-block': null
             }).delete(1);
             this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
             this.quill.setSelection(range.index - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
             return false;
           }
         }
 
         return true;
       }
 
     },
     'embed left': makeEmbedArrowHandler('ArrowLeft', false),
     'embed left shift': makeEmbedArrowHandler('ArrowLeft', true),
     'embed right': makeEmbedArrowHandler('ArrowRight', false),
     'embed right shift': makeEmbedArrowHandler('ArrowRight', true),
     'table down': makeTableArrowHandler(false),
     'table up': makeTableArrowHandler(true)
   }
 };
 
 function makeCodeBlockHandler(indent) {
   return {
     key: 'Tab',
     shiftKey: !indent,
     format: {
       'code-block': true
     },
 
     handler(range) {
       const CodeBlock = this.quill.scroll.query('code-block');
       const lines = range.length === 0 ? this.quill.getLines(range.index, 1) : this.quill.getLines(range);
       let {
         index,
         length
       } = range;
       lines.forEach((line, i) => {
         if (indent) {
           line.insertAt(0, CodeBlock.TAB);
 
           if (i === 0) {
             index += CodeBlock.TAB.length;
           } else {
             length += CodeBlock.TAB.length;
           }
         } else if (line.domNode.textContent.startsWith(CodeBlock.TAB)) {
           line.deleteAt(0, CodeBlock.TAB.length);
 
           if (i === 0) {
             index -= CodeBlock.TAB.length;
           } else {
             length -= CodeBlock.TAB.length;
           }
         }
       });
       this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       this.quill.setSelection(index, length, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
     }
 
   };
 }
 
 function makeEmbedArrowHandler(key, shiftKey) {
   const where = key === 'ArrowLeft' ? 'prefix' : 'suffix';
   return {
     key,
     shiftKey,
     altKey: null,
     [where]: /^$/,
 
     handler(range) {
       let {
         index
       } = range;
 
       if (key === 'ArrowRight') {
         index += range.length + 1;
       }
 
       const [leaf] = this.quill.getLeaf(index);
       if (!(leaf instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["EmbedBlot"])) return true;
 
       if (key === 'ArrowLeft') {
         if (shiftKey) {
           this.quill.setSelection(range.index - 1, range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         } else {
           this.quill.setSelection(range.index - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         }
       } else if (shiftKey) {
         this.quill.setSelection(range.index, range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       } else {
         this.quill.setSelection(range.index + range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
       }
 
       return false;
     }
 
   };
 }
 
 function makeFormatHandler(format) {
   return {
     key: format[0],
     shortKey: true,
 
     handler(range, context) {
       this.quill.format(format, !context.format[format], _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
     }
 
   };
 }
 
 function makeTableArrowHandler(up) {
   return {
     key: up ? 'ArrowUp' : 'ArrowDown',
     collapsed: true,
     format: ['table'],
 
     handler(range, context) {
       // TODO move to table module
       const key = up ? 'prev' : 'next';
       const cell = context.line;
       const targetRow = cell.parent[key];
 
       if (targetRow != null) {
         if (targetRow.statics.blotName === 'table-row') {
           let targetCell = targetRow.children.head;
           let cur = cell;
 
           while (cur.prev != null) {
             cur = cur.prev;
             targetCell = targetCell.next;
           }
 
           const index = targetCell.offset(this.quill.scroll) + Math.min(context.offset, targetCell.length() - 1);
           this.quill.setSelection(index, 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
         }
       } else {
         const targetLine = cell.table()[key];
 
         if (targetLine != null) {
           if (up) {
             this.quill.setSelection(targetLine.offset(this.quill.scroll) + targetLine.length() - 1, 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
           } else {
             this.quill.setSelection(targetLine.offset(this.quill.scroll), 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
           }
         }
       }
 
       return false;
     }
 
   };
 }
 
 function normalize(binding) {
   if (typeof binding === 'string' || typeof binding === 'number') {
     binding = {
       key: binding
     };
   } else if (typeof binding === 'object') {
     binding = clone__WEBPACK_IMPORTED_MODULE_0___default()(binding, false);
   } else {
     return null;
   }
 
   if (binding.shortKey) {
     binding[SHORTKEY] = binding.shortKey;
     delete binding.shortKey;
   }
 
   return binding;
 }
 
 function tableSide(table, row, cell, offset) {
   if (row.prev == null && row.next == null) {
     if (cell.prev == null && cell.next == null) {
       return offset === 0 ? -1 : 1;
     }
 
     return cell.prev == null ? -1 : 1;
   }
 
   if (row.prev == null) {
     return -1;
   }
 
   if (row.next == null) {
     return 1;
   }
 
   return null;
 }
 
 
 
 /***/ }),
 
 /***/ "./modules/syntax.js":
 /*!***************************!*\
   !*** ./modules/syntax.js ***!
   \***************************/
 /*! exports provided: CodeBlock, CodeToken, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CodeBlock", function() { return SyntaxCodeBlock; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CodeToken", function() { return CodeToken; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Syntax; });
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _blots_inline__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../blots/inline */ "./blots/inline.js");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 /* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
 /* harmony import */ var _blots_break__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../blots/break */ "./blots/break.js");
 /* harmony import */ var _blots_cursor__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../blots/cursor */ "./blots/cursor.js");
 /* harmony import */ var _blots_text__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../blots/text */ "./blots/text.js");
 /* harmony import */ var _formats_code__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../formats/code */ "./formats/code.js");
 /* harmony import */ var _clipboard__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./clipboard */ "./modules/clipboard.js");
 
 
 
 
 
 
 
 
 
 
 
 const TokenAttributor = new parchment__WEBPACK_IMPORTED_MODULE_1__["ClassAttributor"]('code-token', 'hljs', {
   scope: parchment__WEBPACK_IMPORTED_MODULE_1__["Scope"].INLINE
 });
 
 class CodeToken extends _blots_inline__WEBPACK_IMPORTED_MODULE_2__["default"] {
   static formats(node, scroll) {
     while (node != null && node !== scroll.domNode) {
       if (node.classList && node.classList.contains(_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].className)) {
         return super.formats(node, scroll);
       }
 
       node = node.parentNode;
     }
 
     return undefined;
   }
 
   constructor(scroll, domNode, value) {
     super(scroll, domNode, value);
     TokenAttributor.add(this.domNode, value);
   }
 
   format(format, value) {
     if (format !== CodeToken.blotName) {
       super.format(format, value);
     } else if (value) {
       TokenAttributor.add(this.domNode, value);
     } else {
       TokenAttributor.remove(this.domNode);
       this.domNode.classList.remove(this.statics.className);
     }
   }
 
   optimize(...args) {
     super.optimize(...args);
 
     if (!TokenAttributor.value(this.domNode)) {
       this.unwrap();
     }
   }
 
 }
 
 CodeToken.blotName = 'code-token';
 CodeToken.className = 'ql-token';
 
 class SyntaxCodeBlock extends _formats_code__WEBPACK_IMPORTED_MODULE_9__["default"] {
   static create(value) {
     const domNode = super.create(value);
 
     if (typeof value === 'string') {
       domNode.setAttribute('data-language', value);
     }
 
     return domNode;
   }
 
   static formats(domNode) {
     return domNode.getAttribute('data-language') || 'plain';
   }
 
   static register() {} // Syntax module will register
 
 
   format(name, value) {
     if (name === this.statics.blotName && value) {
       this.domNode.setAttribute('data-language', value);
     } else {
       super.format(name, value);
     }
   }
 
   replaceWith(name, value) {
     this.formatAt(0, this.length(), CodeToken.blotName, false);
     return super.replaceWith(name, value);
   }
 
 }
 
 class SyntaxCodeBlockContainer extends _formats_code__WEBPACK_IMPORTED_MODULE_9__["CodeBlockContainer"] {
   attach() {
     super.attach();
     this.forceNext = false;
     this.scroll.emitMount(this);
   }
 
   format(name, value) {
     if (name === SyntaxCodeBlock.blotName) {
       this.forceNext = true;
       this.children.forEach(child => {
         child.format(name, value);
       });
     }
   }
 
   formatAt(index, length, name, value) {
     if (name === SyntaxCodeBlock.blotName) {
       this.forceNext = true;
     }
 
     super.formatAt(index, length, name, value);
   }
 
   highlight(highlight, forced = false) {
     if (this.children.head == null) return;
     const nodes = Array.from(this.domNode.childNodes).filter(node => node !== this.uiNode);
     const text = "".concat(nodes.map(node => node.textContent).join('\n'), "\n");
     const language = SyntaxCodeBlock.formats(this.children.head.domNode);
 
     if (forced || this.forceNext || this.cachedText !== text) {
       if (text.trim().length > 0 || this.cachedText == null) {
         const oldDelta = this.children.reduce((delta, child) => {
           return delta.concat(Object(_blots_block__WEBPACK_IMPORTED_MODULE_5__["blockDelta"])(child, false));
         }, new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a());
         const delta = highlight(text, language);
         oldDelta.diff(delta).reduce((index, {
           retain,
           attributes
         }) => {
           // Should be all retains
           if (!retain) return index;
 
           if (attributes) {
             Object.keys(attributes).forEach(format => {
               if ([SyntaxCodeBlock.blotName, CodeToken.blotName].includes(format)) {
                 this.formatAt(index, retain, format, attributes[format]);
               }
             });
           }
 
           return index + retain;
         }, 0);
       }
 
       this.cachedText = text;
       this.forceNext = false;
     }
   }
 
   optimize(context) {
     super.optimize(context);
 
     if (this.parent != null && this.children.head != null && this.uiNode != null) {
       const language = SyntaxCodeBlock.formats(this.children.head.domNode);
 
       if (language !== this.uiNode.value) {
         this.uiNode.value = language;
       }
     }
   }
 
 }
 
 SyntaxCodeBlockContainer.allowedChildren = [SyntaxCodeBlock];
 SyntaxCodeBlock.requiredContainer = SyntaxCodeBlockContainer;
 SyntaxCodeBlock.allowedChildren = [CodeToken, _blots_cursor__WEBPACK_IMPORTED_MODULE_7__["default"], _blots_text__WEBPACK_IMPORTED_MODULE_8__["default"], _blots_break__WEBPACK_IMPORTED_MODULE_6__["default"]];
 
 class Syntax extends _core_module__WEBPACK_IMPORTED_MODULE_4__["default"] {
   static register() {
     _core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].register(CodeToken, true);
     _core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].register(SyntaxCodeBlock, true);
     _core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].register(SyntaxCodeBlockContainer, true);
   }
 
   constructor(quill, options) {
     super(quill, options);
 
     if (this.options.hljs == null) {
       throw new Error('Syntax module requires highlight.js. Please include the library on the page before Quill.');
     }
 
     this.languages = this.options.languages.reduce((memo, {
       key
     }) => {
       memo[key] = true;
       return memo;
     }, {});
     this.highlightBlot = this.highlightBlot.bind(this);
     this.initListener();
     this.initTimer();
   }
 
   initListener() {
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].events.SCROLL_BLOT_MOUNT, blot => {
       if (!(blot instanceof SyntaxCodeBlockContainer)) return;
       const select = this.quill.root.ownerDocument.createElement('select');
       this.options.languages.forEach(({
         key,
         label
       }) => {
         const option = select.ownerDocument.createElement('option');
         option.textContent = label;
         option.setAttribute('value', key);
         select.appendChild(option);
       });
       select.addEventListener('change', () => {
         blot.format(SyntaxCodeBlock.blotName, select.value);
         this.quill.root.focus(); // Prevent scrolling
 
         this.highlight(blot, true);
       });
 
       if (blot.uiNode == null) {
         blot.attachUI(select);
 
         if (blot.children.head) {
           select.value = SyntaxCodeBlock.formats(blot.children.head.domNode);
         }
       }
     });
   }
 
   initTimer() {
     let timer = null;
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].events.SCROLL_OPTIMIZE, () => {
       clearTimeout(timer);
       timer = setTimeout(() => {
         this.highlight();
         timer = null;
       }, this.options.interval);
     });
   }
 
   highlight(blot = null, force = false) {
     if (this.quill.selection.composing) return;
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].sources.USER);
     const range = this.quill.getSelection();
     const blots = blot == null ? this.quill.scroll.descendants(SyntaxCodeBlockContainer) : [blot];
     blots.forEach(container => {
       container.highlight(this.highlightBlot, force);
     });
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT);
 
     if (range != null) {
       this.quill.setSelection(range, _core_quill__WEBPACK_IMPORTED_MODULE_3__["default"].sources.SILENT);
     }
   }
 
   highlightBlot(text, language = 'plain') {
     language = this.languages[language] ? language : 'plain';
 
     if (language === 'plain') {
       return Object(_blots_text__WEBPACK_IMPORTED_MODULE_8__["escapeText"])(text).split('\n').reduce((delta, line, i) => {
         if (i !== 0) {
           delta.insert('\n', {
             [_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]: language
           });
         }
 
         return delta.insert(line);
       }, new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a());
     }
 
     const container = this.quill.root.ownerDocument.createElement('div');
     container.classList.add(_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].className);
     container.innerHTML = this.options.hljs.highlight(language, text).value;
     return Object(_clipboard__WEBPACK_IMPORTED_MODULE_10__["traverse"])(this.quill.scroll, container, [(node, delta) => {
       const value = TokenAttributor.value(node);
 
       if (value) {
         return delta.compose(new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().retain(delta.length(), {
           [CodeToken.blotName]: value
         }));
       }
 
       return delta;
     }], [(node, delta) => {
       return node.data.split('\n').reduce((memo, nodeText, i) => {
         if (i !== 0) memo.insert('\n', {
           [_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]: language
         });
         return memo.insert(nodeText);
       }, delta);
     }], new WeakMap());
   }
 
 }
 
 Syntax.DEFAULTS = {
   hljs: (() => {
     return window.hljs;
   })(),
   interval: 1000,
   languages: [{
     key: 'plain',
     label: 'Plain'
   }, {
     key: 'bash',
     label: 'Bash'
   }, {
     key: 'cpp',
     label: 'C++'
   }, {
     key: 'cs',
     label: 'C#'
   }, {
     key: 'css',
     label: 'CSS'
   }, {
     key: 'diff',
     label: 'Diff'
   }, {
     key: 'xml',
     label: 'HTML/XML'
   }, {
     key: 'java',
     label: 'Java'
   }, {
     key: 'javascript',
     label: 'Javascript'
   }, {
     key: 'markdown',
     label: 'Markdown'
   }, {
     key: 'php',
     label: 'PHP'
   }, {
     key: 'python',
     label: 'Python'
   }, {
     key: 'ruby',
     label: 'Ruby'
   }, {
     key: 'sql',
     label: 'SQL'
   }]
 };
 
 
 /***/ }),
 
 /***/ "./modules/table.js":
 /*!**************************!*\
   !*** ./modules/table.js ***!
   \**************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 /* harmony import */ var _formats_table__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../formats/table */ "./formats/table.js");
 
 
 
 
 
 class Table extends _core_module__WEBPACK_IMPORTED_MODULE_2__["default"] {
   static register() {
     _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableCell"]);
     _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableRow"]);
     _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableBody"]);
     _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableContainer"]);
   }
 
   constructor(...args) {
     super(...args);
     this.listenBalanceCells();
   }
 
   balanceTables() {
     this.quill.scroll.descendants(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableContainer"]).forEach(table => {
       table.balanceCells();
     });
   }
 
   deleteColumn() {
     const [table,, cell] = this.getTable();
     if (cell == null) return;
     table.deleteColumn(cell.cellOffset());
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
   }
 
   deleteRow() {
     const [, row] = this.getTable();
     if (row == null) return;
     row.remove();
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
   }
 
   deleteTable() {
     const [table] = this.getTable();
     if (table == null) return;
     const offset = table.offset();
     table.remove();
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
     this.quill.setSelection(offset, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
   }
 
   getTable(range = this.quill.getSelection()) {
     if (range == null) return [null, null, null, -1];
     const [cell, offset] = this.quill.getLine(range.index);
 
     if (cell == null || cell.statics.blotName !== _formats_table__WEBPACK_IMPORTED_MODULE_3__["TableCell"].blotName) {
       return [null, null, null, -1];
     }
 
     const row = cell.parent;
     const table = row.parent.parent;
     return [table, row, cell, offset];
   }
 
   insertColumn(offset) {
     const range = this.quill.getSelection();
     const [table, row, cell] = this.getTable(range);
     if (cell == null) return;
     const column = cell.cellOffset();
     table.insertColumn(column + offset);
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
     let shift = row.rowOffset();
 
     if (offset === 0) {
       shift += 1;
     }
 
     this.quill.setSelection(range.index + shift, range.length, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
   }
 
   insertColumnLeft() {
     this.insertColumn(0);
   }
 
   insertColumnRight() {
     this.insertColumn(1);
   }
 
   insertRow(offset) {
     const range = this.quill.getSelection();
     const [table, row, cell] = this.getTable(range);
     if (cell == null) return;
     const index = row.rowOffset();
     table.insertRow(index + offset);
     this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
 
     if (offset > 0) {
       this.quill.setSelection(range, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
     } else {
       this.quill.setSelection(range.index + row.children.length, range.length, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
     }
   }
 
   insertRowAbove() {
     this.insertRow(0);
   }
 
   insertRowBelow() {
     this.insertRow(1);
   }
 
   insertTable(rows, columns) {
     const range = this.quill.getSelection();
     if (range == null) return;
     const delta = new Array(rows).fill(0).reduce(memo => {
       const text = new Array(columns).fill('\n').join('');
       return memo.insert(text, {
         table: Object(_formats_table__WEBPACK_IMPORTED_MODULE_3__["tableId"])()
       });
     }, new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().retain(range.index));
     this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
     this.quill.setSelection(range.index, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
     this.balanceTables();
   }
 
   listenBalanceCells() {
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_OPTIMIZE, mutations => {
       mutations.some(mutation => {
         if (['TD', 'TR', 'TBODY', 'TABLE'].includes(mutation.target.tagName)) {
           this.quill.once(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.TEXT_CHANGE, (delta, old, source) => {
             if (source !== _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER) return;
             this.balanceTables();
           });
           return true;
         }
 
         return false;
       });
     });
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (Table);
 
 /***/ }),
 
 /***/ "./modules/toolbar.js":
 /*!****************************!*\
   !*** ./modules/toolbar.js ***!
   \****************************/
 /*! exports provided: default, addControls */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Toolbar; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "addControls", function() { return addControls; });
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var parchment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
 /* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
 /* harmony import */ var _core_logger__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/logger */ "./core/logger.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 
 
 
 
 
 const supportsRootNode = ('getRootNode' in document);
 const debug = Object(_core_logger__WEBPACK_IMPORTED_MODULE_3__["default"])('quill:toolbar');
 
 class Toolbar extends _core_module__WEBPACK_IMPORTED_MODULE_4__["default"] {
   constructor(quill, options) {
     super(quill, options);
 
     if (Array.isArray(this.options.container)) {
       const container = document.createElement('div');
       addControls(container, this.options.container);
       quill.container.parentNode.insertBefore(container, quill.container);
       this.container = container;
     } else if (typeof this.options.container === 'string') {
       const rootDocument = supportsRootNode ? quill.container.getRootNode() : document;
       this.container = rootDocument.querySelector(this.options.container);
     } else {
       this.container = this.options.container;
     }
 
     if (!(this.container instanceof HTMLElement)) {
       return debug.error('Container required for toolbar', this.options);
     }
 
     this.container.classList.add('ql-toolbar');
     this.controls = [];
     this.handlers = {};
     Object.keys(this.options.handlers).forEach(format => {
       this.addHandler(format, this.options.handlers[format]);
     });
     Array.from(this.container.querySelectorAll('button, select')).forEach(input => {
       this.attach(input);
     });
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].events.EDITOR_CHANGE, (type, range) => {
       if (type === _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].events.SELECTION_CHANGE) {
         this.update(range);
       }
     });
     this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].events.SCROLL_OPTIMIZE, () => {
       const [range] = this.quill.selection.getRange(); // quill.getSelection triggers update
 
       this.update(range);
     });
   }
 
   addHandler(format, handler) {
     this.handlers[format] = handler;
   }
 
   attach(input) {
     let format = Array.from(input.classList).find(className => {
       return className.indexOf('ql-') === 0;
     });
     if (!format) return;
     format = format.slice('ql-'.length);
 
     if (input.tagName === 'BUTTON') {
       input.setAttribute('type', 'button');
     }
 
     if (this.handlers[format] == null && this.quill.scroll.query(format) == null) {
       debug.warn('ignoring attaching to nonexistent format', format, input);
       return;
     }
 
     const eventName = input.tagName === 'SELECT' ? 'change' : 'click';
     input.addEventListener(eventName, e => {
       let value;
 
       if (input.tagName === 'SELECT') {
         if (input.selectedIndex < 0) return;
         const selected = input.options[input.selectedIndex];
 
         if (selected.hasAttribute('selected')) {
           value = false;
         } else {
           value = selected.value || false;
         }
       } else {
         if (input.classList.contains('ql-active')) {
           value = false;
         } else {
           value = input.value || !input.hasAttribute('value');
         }
 
         e.preventDefault();
       }
 
       this.quill.focus();
       const [range] = this.quill.selection.getRange();
 
       if (this.handlers[format] != null) {
         this.handlers[format].call(this, value);
       } else if (this.quill.scroll.query(format).prototype instanceof parchment__WEBPACK_IMPORTED_MODULE_1__["EmbedBlot"]) {
         value = prompt("Enter ".concat(format)); // eslint-disable-line no-alert
 
         if (!value) return;
         this.quill.updateContents(new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().retain(range.index).delete(range.length).insert({
           [format]: value
         }), _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       } else {
         this.quill.format(format, value, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       }
 
       this.update(range);
     });
     this.controls.push([format, input]);
   }
 
   update(range) {
     const formats = range == null ? {} : this.quill.getFormat(range);
     this.controls.forEach(pair => {
       const [format, input] = pair;
 
       if (input.tagName === 'SELECT') {
         let option;
 
         if (range == null) {
           option = null;
         } else if (formats[format] == null) {
           option = input.querySelector('option[selected]');
         } else if (!Array.isArray(formats[format])) {
           let value = formats[format];
 
           if (typeof value === 'string') {
             value = value.replace(/"/g, '\\"');
           }
 
           option = input.querySelector("option[value=\"".concat(value, "\"]"));
         }
 
         if (option == null) {
           input.value = ''; // TODO make configurable?
 
           input.selectedIndex = -1;
         } else {
           option.selected = true;
         }
       } else if (range == null) {
         input.classList.remove('ql-active');
       } else if (input.hasAttribute('value')) {
         // both being null should match (default values)
         // '1' should match with 1 (headers)
         const isActive = formats[format] === input.getAttribute('value') || formats[format] != null && formats[format].toString() === input.getAttribute('value') || formats[format] == null && !input.getAttribute('value');
         input.classList.toggle('ql-active', isActive);
       } else {
         input.classList.toggle('ql-active', formats[format] != null);
       }
     });
   }
 
 }
 
 Toolbar.DEFAULTS = {};
 
 function addButton(container, format, value) {
   const input = document.createElement('button');
   input.setAttribute('type', 'button');
   input.classList.add("ql-".concat(format));
 
   if (value != null) {
     input.value = value;
   }
 
   container.appendChild(input);
 }
 
 function addControls(container, groups) {
   if (!Array.isArray(groups[0])) {
     groups = [groups];
   }
 
   groups.forEach(controls => {
     const group = document.createElement('span');
     group.classList.add('ql-formats');
     controls.forEach(control => {
       if (typeof control === 'string') {
         addButton(group, control);
       } else {
         const format = Object.keys(control)[0];
         const value = control[format];
 
         if (Array.isArray(value)) {
           addSelect(group, format, value);
         } else {
           addButton(group, format, value);
         }
       }
     });
     container.appendChild(group);
   });
 }
 
 function addSelect(container, format, values) {
   const input = document.createElement('select');
   input.classList.add("ql-".concat(format));
   values.forEach(value => {
     const option = document.createElement('option');
 
     if (value !== false) {
       option.setAttribute('value', value);
     } else {
       option.setAttribute('selected', 'selected');
     }
 
     input.appendChild(option);
   });
   container.appendChild(input);
 }
 
 Toolbar.DEFAULTS = {
   container: null,
   handlers: {
     clean() {
       const range = this.quill.getSelection();
       if (range == null) return;
 
       if (range.length === 0) {
         const formats = this.quill.getFormat();
         Object.keys(formats).forEach(name => {
           // Clean functionality in existing apps only clean inline formats
           if (this.quill.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_1__["Scope"].INLINE) != null) {
             this.quill.format(name, false, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
           }
         });
       } else {
         this.quill.removeFormat(range, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       }
     },
 
     direction(value) {
       const {
         align
       } = this.quill.getFormat();
 
       if (value === 'rtl' && align == null) {
         this.quill.format('align', 'right', _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       } else if (!value && align === 'right') {
         this.quill.format('align', false, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       }
 
       this.quill.format('direction', value, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
     },
 
     indent(value) {
       const range = this.quill.getSelection();
       const formats = this.quill.getFormat(range);
       const indent = parseInt(formats.indent || 0, 10);
 
       if (value === '+1' || value === '-1') {
         let modifier = value === '+1' ? 1 : -1;
         if (formats.direction === 'rtl') modifier *= -1;
         this.quill.format('indent', indent + modifier, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       }
     },
 
     link(value) {
       if (value === true) {
         value = prompt('Enter link URL:'); // eslint-disable-line no-alert
       }
 
       this.quill.format('link', value, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
     },
 
     list(value) {
       const range = this.quill.getSelection();
       const formats = this.quill.getFormat(range);
 
       if (value === 'check') {
         if (formats.list === 'checked' || formats.list === 'unchecked') {
           this.quill.format('list', false, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
         } else {
           this.quill.format('list', 'unchecked', _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
         }
       } else {
         this.quill.format('list', value, _core_quill__WEBPACK_IMPORTED_MODULE_2__["default"].sources.USER);
       }
     }
 
   }
 };
 
 
 /***/ }),
 
 /***/ "./modules/uploader.js":
 /*!*****************************!*\
   !*** ./modules/uploader.js ***!
   \*****************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
 /* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _core_emitter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/emitter */ "./core/emitter.js");
 /* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
 
 
 
 
 class Uploader extends _core_module__WEBPACK_IMPORTED_MODULE_2__["default"] {
   constructor(quill, options) {
     super(quill, options);
     quill.root.addEventListener('drop', e => {
       e.preventDefault();
       let native;
 
       if (document.caretRangeFromPoint) {
         native = document.caretRangeFromPoint(e.clientX, e.clientY);
       } else if (document.caretPositionFromPoint) {
         const position = document.caretPositionFromPoint(e.clientX, e.clientY);
         native = document.createRange();
         native.setStart(position.offsetNode, position.offset);
         native.setEnd(position.offsetNode, position.offset);
       } else {
         return;
       }
 
       const normalized = quill.selection.normalizeNative(native);
       const range = quill.selection.normalizedToRange(normalized);
       this.upload(range, e.dataTransfer.files);
     });
   }
 
   upload(range, files) {
     const uploads = [];
     Array.from(files).forEach(file => {
       if (file && this.options.mimetypes.includes(file.type)) {
         uploads.push(file);
       }
     });
 
     if (uploads.length > 0) {
       this.options.handler.call(this, range, uploads);
     }
   }
 
 }
 
 Uploader.DEFAULTS = {
   mimetypes: ['image/png', 'image/jpeg'],
 
   handler(range, files) {
     const promises = files.map(file => {
       return new Promise(resolve => {
         const reader = new FileReader();
 
         reader.onload = e => {
           resolve(e.target.result);
         };
 
         reader.readAsDataURL(file);
       });
     });
     Promise.all(promises).then(images => {
       const update = images.reduce((delta, image) => {
         return delta.insert({
           image
         });
       }, new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().retain(range.index).delete(range.length));
       this.quill.updateContents(update, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
       this.quill.setSelection(range.index + images.length, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
     });
   }
 
 };
 /* harmony default export */ __webpack_exports__["default"] = (Uploader);
 
 /***/ }),
 
 /***/ "./node_modules/clone/clone.js":
 /*!*************************************!*\
   !*** ./node_modules/clone/clone.js ***!
   \*************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 var clone = (function() {
 'use strict';
 
 function _instanceof(obj, type) {
   return type != null && obj instanceof type;
 }
 
 var nativeMap;
 try {
   nativeMap = Map;
 } catch(_) {
   // maybe a reference error because no `Map`. Give it a dummy value that no
   // value will ever be an instanceof.
   nativeMap = function() {};
 }
 
 var nativeSet;
 try {
   nativeSet = Set;
 } catch(_) {
   nativeSet = function() {};
 }
 
 var nativePromise;
 try {
   nativePromise = Promise;
 } catch(_) {
   nativePromise = function() {};
 }
 
 /**
  * Clones (copies) an Object using deep copying.
  *
  * This function supports circular references by default, but if you are certain
  * there are no circular references in your object, you can save some CPU time
  * by calling clone(obj, false).
  *
  * Caution: if `circular` is false and `parent` contains circular references,
  * your program may enter an infinite loop and crash.
  *
  * @param `parent` - the object to be cloned
  * @param `circular` - set to true if the object to be cloned may contain
  *    circular references. (optional - true by default)
  * @param `depth` - set to a number if the object is only to be cloned to
  *    a particular depth. (optional - defaults to Infinity)
  * @param `prototype` - sets the prototype to be used when cloning an object.
  *    (optional - defaults to parent prototype).
  * @param `includeNonEnumerable` - set to true if the non-enumerable properties
  *    should be cloned as well. Non-enumerable properties on the prototype
  *    chain will be ignored. (optional - false by default)
 */
 function clone(parent, circular, depth, prototype, includeNonEnumerable) {
   if (typeof circular === 'object') {
     depth = circular.depth;
     prototype = circular.prototype;
     includeNonEnumerable = circular.includeNonEnumerable;
     circular = circular.circular;
   }
   // maintain two arrays for circular references, where corresponding parents
   // and children have the same index
   var allParents = [];
   var allChildren = [];
 
   var useBuffer = typeof Buffer != 'undefined';
 
   if (typeof circular == 'undefined')
     circular = true;
 
   if (typeof depth == 'undefined')
     depth = Infinity;
 
   // recurse this function so we don't reset allParents and allChildren
   function _clone(parent, depth) {
     // cloning null always returns null
     if (parent === null)
       return null;
 
     if (depth === 0)
       return parent;
 
     var child;
     var proto;
     if (typeof parent != 'object') {
       return parent;
     }
 
     if (_instanceof(parent, nativeMap)) {
       child = new nativeMap();
     } else if (_instanceof(parent, nativeSet)) {
       child = new nativeSet();
     } else if (_instanceof(parent, nativePromise)) {
       child = new nativePromise(function (resolve, reject) {
         parent.then(function(value) {
           resolve(_clone(value, depth - 1));
         }, function(err) {
           reject(_clone(err, depth - 1));
         });
       });
     } else if (clone.__isArray(parent)) {
       child = [];
     } else if (clone.__isRegExp(parent)) {
       child = new RegExp(parent.source, __getRegExpFlags(parent));
       if (parent.lastIndex) child.lastIndex = parent.lastIndex;
     } else if (clone.__isDate(parent)) {
       child = new Date(parent.getTime());
     } else if (useBuffer && Buffer.isBuffer(parent)) {
       if (Buffer.allocUnsafe) {
         // Node.js >= 4.5.0
         child = Buffer.allocUnsafe(parent.length);
       } else {
         // Older Node.js versions
         child = new Buffer(parent.length);
       }
       parent.copy(child);
       return child;
     } else if (_instanceof(parent, Error)) {
       child = Object.create(parent);
     } else {
       if (typeof prototype == 'undefined') {
         proto = Object.getPrototypeOf(parent);
         child = Object.create(proto);
       }
       else {
         child = Object.create(prototype);
         proto = prototype;
       }
     }
 
     if (circular) {
       var index = allParents.indexOf(parent);
 
       if (index != -1) {
         return allChildren[index];
       }
       allParents.push(parent);
       allChildren.push(child);
     }
 
     if (_instanceof(parent, nativeMap)) {
       parent.forEach(function(value, key) {
         var keyChild = _clone(key, depth - 1);
         var valueChild = _clone(value, depth - 1);
         child.set(keyChild, valueChild);
       });
     }
     if (_instanceof(parent, nativeSet)) {
       parent.forEach(function(value) {
         var entryChild = _clone(value, depth - 1);
         child.add(entryChild);
       });
     }
 
     for (var i in parent) {
       var attrs;
       if (proto) {
         attrs = Object.getOwnPropertyDescriptor(proto, i);
       }
 
       if (attrs && attrs.set == null) {
         continue;
       }
       child[i] = _clone(parent[i], depth - 1);
     }
 
     if (Object.getOwnPropertySymbols) {
       var symbols = Object.getOwnPropertySymbols(parent);
       for (var i = 0; i < symbols.length; i++) {
         // Don't need to worry about cloning a symbol because it is a primitive,
         // like a number or string.
         var symbol = symbols[i];
         var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
         if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
           continue;
         }
         child[symbol] = _clone(parent[symbol], depth - 1);
         if (!descriptor.enumerable) {
           Object.defineProperty(child, symbol, {
             enumerable: false
           });
         }
       }
     }
 
     if (includeNonEnumerable) {
       var allPropertyNames = Object.getOwnPropertyNames(parent);
       for (var i = 0; i < allPropertyNames.length; i++) {
         var propertyName = allPropertyNames[i];
         var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
         if (descriptor && descriptor.enumerable) {
           continue;
         }
         child[propertyName] = _clone(parent[propertyName], depth - 1);
         Object.defineProperty(child, propertyName, {
           enumerable: false
         });
       }
     }
 
     return child;
   }
 
   return _clone(parent, depth);
 }
 
 /**
  * Simple flat clone using prototype, accepts only objects, usefull for property
  * override on FLAT configuration object (no nested props).
  *
  * USE WITH CAUTION! This may not behave as you wish if you do not know how this
  * works.
  */
 clone.clonePrototype = function clonePrototype(parent) {
   if (parent === null)
     return null;
 
   var c = function () {};
   c.prototype = parent;
   return new c();
 };
 
 // private utility functions
 
 function __objToStr(o) {
   return Object.prototype.toString.call(o);
 }
 clone.__objToStr = __objToStr;
 
 function __isDate(o) {
   return typeof o === 'object' && __objToStr(o) === '[object Date]';
 }
 clone.__isDate = __isDate;
 
 function __isArray(o) {
   return typeof o === 'object' && __objToStr(o) === '[object Array]';
 }
 clone.__isArray = __isArray;
 
 function __isRegExp(o) {
   return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
 }
 clone.__isRegExp = __isRegExp;
 
 function __getRegExpFlags(re) {
   var flags = '';
   if (re.global) flags += 'g';
   if (re.ignoreCase) flags += 'i';
   if (re.multiline) flags += 'm';
   return flags;
 }
 clone.__getRegExpFlags = __getRegExpFlags;
 
 return clone;
 })();
 
 if (typeof module === 'object' && module.exports) {
   module.exports = clone;
 }
 
 
 /***/ }),
 
 /***/ "./node_modules/deep-equal/index.js":
 /*!******************************************!*\
   !*** ./node_modules/deep-equal/index.js ***!
   \******************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 var objectKeys = __webpack_require__(/*! object-keys */ "./node_modules/object-keys/index.js");
 var isArguments = __webpack_require__(/*! is-arguments */ "./node_modules/is-arguments/index.js");
 var is = __webpack_require__(/*! object-is */ "./node_modules/object-is/index.js");
 var isRegex = __webpack_require__(/*! is-regex */ "./node_modules/is-regex/index.js");
 var flags = __webpack_require__(/*! regexp.prototype.flags */ "./node_modules/regexp.prototype.flags/index.js");
 var isDate = __webpack_require__(/*! is-date-object */ "./node_modules/is-date-object/index.js");
 
 var getTime = Date.prototype.getTime;
 
 function deepEqual(actual, expected, options) {
   var opts = options || {};
 
   // 7.1. All identical values are equivalent, as determined by ===.
   if (opts.strict ? is(actual, expected) : actual === expected) {
     return true;
   }
 
   // 7.3. Other pairs that do not both pass typeof value == 'object', equivalence is determined by ==.
   if (!actual || !expected || (typeof actual !== 'object' && typeof expected !== 'object')) {
     return opts.strict ? is(actual, expected) : actual == expected;
   }
 
   /*
    * 7.4. For all other Object pairs, including Array objects, equivalence is
    * determined by having the same number of owned properties (as verified
    * with Object.prototype.hasOwnProperty.call), the same set of keys
    * (although not necessarily the same order), equivalent values for every
    * corresponding key, and an identical 'prototype' property. Note: this
    * accounts for both named and indexed properties on Arrays.
    */
   // eslint-disable-next-line no-use-before-define
   return objEquiv(actual, expected, opts);
 }
 
 function isUndefinedOrNull(value) {
   return value === null || value === undefined;
 }
 
 function isBuffer(x) {
   if (!x || typeof x !== 'object' || typeof x.length !== 'number') {
     return false;
   }
   if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
     return false;
   }
   if (x.length > 0 && typeof x[0] !== 'number') {
     return false;
   }
   return true;
 }
 
 function objEquiv(a, b, opts) {
   /* eslint max-statements: [2, 50] */
   var i, key;
   if (typeof a !== typeof b) { return false; }
   if (isUndefinedOrNull(a) || isUndefinedOrNull(b)) { return false; }
 
   // an identical 'prototype' property.
   if (a.prototype !== b.prototype) { return false; }
 
   if (isArguments(a) !== isArguments(b)) { return false; }
 
   var aIsRegex = isRegex(a);
   var bIsRegex = isRegex(b);
   if (aIsRegex !== bIsRegex) { return false; }
   if (aIsRegex || bIsRegex) {
     return a.source === b.source && flags(a) === flags(b);
   }
 
   if (isDate(a) && isDate(b)) {
     return getTime.call(a) === getTime.call(b);
   }
 
   var aIsBuffer = isBuffer(a);
   var bIsBuffer = isBuffer(b);
   if (aIsBuffer !== bIsBuffer) { return false; }
   if (aIsBuffer || bIsBuffer) { // && would work too, because both are true or both false here
     if (a.length !== b.length) { return false; }
     for (i = 0; i < a.length; i++) {
       if (a[i] !== b[i]) { return false; }
     }
     return true;
   }
 
   if (typeof a !== typeof b) { return false; }
 
   try {
     var ka = objectKeys(a);
     var kb = objectKeys(b);
   } catch (e) { // happens when one is a string literal and the other isn't
     return false;
   }
   // having the same number of owned properties (keys incorporates hasOwnProperty)
   if (ka.length !== kb.length) { return false; }
 
   // the same set of keys (although not necessarily the same order),
   ka.sort();
   kb.sort();
   // ~~~cheap key test
   for (i = ka.length - 1; i >= 0; i--) {
     if (ka[i] != kb[i]) { return false; }
   }
   // equivalent values for every corresponding key, and ~~~possibly expensive deep test
   for (i = ka.length - 1; i >= 0; i--) {
     key = ka[i];
     if (!deepEqual(a[key], b[key], opts)) { return false; }
   }
 
   return true;
 }
 
 module.exports = deepEqual;
 
 
 /***/ }),
 
 /***/ "./node_modules/define-properties/index.js":
 /*!*************************************************!*\
   !*** ./node_modules/define-properties/index.js ***!
   \*************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var keys = __webpack_require__(/*! object-keys */ "./node_modules/object-keys/index.js");
 var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';
 
 var toStr = Object.prototype.toString;
 var concat = Array.prototype.concat;
 var origDefineProperty = Object.defineProperty;
 
 var isFunction = function (fn) {
   return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
 };
 
 var arePropertyDescriptorsSupported = function () {
   var obj = {};
   try {
     origDefineProperty(obj, 'x', { enumerable: false, value: obj });
     // eslint-disable-next-line no-unused-vars, no-restricted-syntax
     for (var _ in obj) { // jscs:ignore disallowUnusedVariables
       return false;
     }
     return obj.x === obj;
   } catch (e) { /* this is IE 8. */
     return false;
   }
 };
 var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();
 
 var defineProperty = function (object, name, value, predicate) {
   if (name in object && (!isFunction(predicate) || !predicate())) {
     return;
   }
   if (supportsDescriptors) {
     origDefineProperty(object, name, {
       configurable: true,
       enumerable: false,
       value: value,
       writable: true
     });
   } else {
     object[name] = value;
   }
 };
 
 var defineProperties = function (object, map) {
   var predicates = arguments.length > 2 ? arguments[2] : {};
   var props = keys(map);
   if (hasSymbols) {
     props = concat.call(props, Object.getOwnPropertySymbols(map));
   }
   for (var i = 0; i < props.length; i += 1) {
     defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
   }
 };
 
 defineProperties.supportsDescriptors = !!supportsDescriptors;
 
 module.exports = defineProperties;
 
 
 /***/ }),
 
 /***/ "./node_modules/es-abstract/GetIntrinsic.js":
 /*!**************************************************!*\
   !*** ./node_modules/es-abstract/GetIntrinsic.js ***!
   \**************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 /* globals
   Atomics,
   SharedArrayBuffer,
 */
 
 var undefined;
 
 var $TypeError = TypeError;
 
 var $gOPD = Object.getOwnPropertyDescriptor;
 if ($gOPD) {
   try {
     $gOPD({}, '');
   } catch (e) {
     $gOPD = null; // this is IE 8, which has a broken gOPD
   }
 }
 
 var throwTypeError = function () { throw new $TypeError(); };
 var ThrowTypeError = $gOPD
   ? (function () {
     try {
       // eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
       arguments.callee; // IE 8 does not throw here
       return throwTypeError;
     } catch (calleeThrows) {
       try {
         // IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
         return $gOPD(arguments, 'callee').get;
       } catch (gOPDthrows) {
         return throwTypeError;
       }
     }
   }())
   : throwTypeError;
 
 var hasSymbols = __webpack_require__(/*! has-symbols */ "./node_modules/has-symbols/index.js")();
 
 var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto
 
 var generator; // = function * () {};
 var generatorFunction = generator ? getProto(generator) : undefined;
 var asyncFn; // async function() {};
 var asyncFunction = asyncFn ? asyncFn.constructor : undefined;
 var asyncGen; // async function * () {};
 var asyncGenFunction = asyncGen ? getProto(asyncGen) : undefined;
 var asyncGenIterator = asyncGen ? asyncGen() : undefined;
 
 var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);
 
 var INTRINSICS = {
   '%Array%': Array,
   '%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
   '%ArrayBufferPrototype%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer.prototype,
   '%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
   '%ArrayPrototype%': Array.prototype,
   '%ArrayProto_entries%': Array.prototype.entries,
   '%ArrayProto_forEach%': Array.prototype.forEach,
   '%ArrayProto_keys%': Array.prototype.keys,
   '%ArrayProto_values%': Array.prototype.values,
   '%AsyncFromSyncIteratorPrototype%': undefined,
   '%AsyncFunction%': asyncFunction,
   '%AsyncFunctionPrototype%': asyncFunction ? asyncFunction.prototype : undefined,
   '%AsyncGenerator%': asyncGen ? getProto(asyncGenIterator) : undefined,
   '%AsyncGeneratorFunction%': asyncGenFunction,
   '%AsyncGeneratorPrototype%': asyncGenFunction ? asyncGenFunction.prototype : undefined,
   '%AsyncIteratorPrototype%': asyncGenIterator && hasSymbols && Symbol.asyncIterator ? asyncGenIterator[Symbol.asyncIterator]() : undefined,
   '%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
   '%Boolean%': Boolean,
   '%BooleanPrototype%': Boolean.prototype,
   '%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
   '%DataViewPrototype%': typeof DataView === 'undefined' ? undefined : DataView.prototype,
   '%Date%': Date,
   '%DatePrototype%': Date.prototype,
   '%decodeURI%': decodeURI,
   '%decodeURIComponent%': decodeURIComponent,
   '%encodeURI%': encodeURI,
   '%encodeURIComponent%': encodeURIComponent,
   '%Error%': Error,
   '%ErrorPrototype%': Error.prototype,
   '%eval%': eval, // eslint-disable-line no-eval
   '%EvalError%': EvalError,
   '%EvalErrorPrototype%': EvalError.prototype,
   '%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
   '%Float32ArrayPrototype%': typeof Float32Array === 'undefined' ? undefined : Float32Array.prototype,
   '%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
   '%Float64ArrayPrototype%': typeof Float64Array === 'undefined' ? undefined : Float64Array.prototype,
   '%Function%': Function,
   '%FunctionPrototype%': Function.prototype,
   '%Generator%': generator ? getProto(generator()) : undefined,
   '%GeneratorFunction%': generatorFunction,
   '%GeneratorPrototype%': generatorFunction ? generatorFunction.prototype : undefined,
   '%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
   '%Int8ArrayPrototype%': typeof Int8Array === 'undefined' ? undefined : Int8Array.prototype,
   '%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
   '%Int16ArrayPrototype%': typeof Int16Array === 'undefined' ? undefined : Int8Array.prototype,
   '%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
   '%Int32ArrayPrototype%': typeof Int32Array === 'undefined' ? undefined : Int32Array.prototype,
   '%isFinite%': isFinite,
   '%isNaN%': isNaN,
   '%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
   '%JSON%': typeof JSON === 'object' ? JSON : undefined,
   '%JSONParse%': typeof JSON === 'object' ? JSON.parse : undefined,
   '%Map%': typeof Map === 'undefined' ? undefined : Map,
   '%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
   '%MapPrototype%': typeof Map === 'undefined' ? undefined : Map.prototype,
   '%Math%': Math,
   '%Number%': Number,
   '%NumberPrototype%': Number.prototype,
   '%Object%': Object,
   '%ObjectPrototype%': Object.prototype,
   '%ObjProto_toString%': Object.prototype.toString,
   '%ObjProto_valueOf%': Object.prototype.valueOf,
   '%parseFloat%': parseFloat,
   '%parseInt%': parseInt,
   '%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
   '%PromisePrototype%': typeof Promise === 'undefined' ? undefined : Promise.prototype,
   '%PromiseProto_then%': typeof Promise === 'undefined' ? undefined : Promise.prototype.then,
   '%Promise_all%': typeof Promise === 'undefined' ? undefined : Promise.all,
   '%Promise_reject%': typeof Promise === 'undefined' ? undefined : Promise.reject,
   '%Promise_resolve%': typeof Promise === 'undefined' ? undefined : Promise.resolve,
   '%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
   '%RangeError%': RangeError,
   '%RangeErrorPrototype%': RangeError.prototype,
   '%ReferenceError%': ReferenceError,
   '%ReferenceErrorPrototype%': ReferenceError.prototype,
   '%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
   '%RegExp%': RegExp,
   '%RegExpPrototype%': RegExp.prototype,
   '%Set%': typeof Set === 'undefined' ? undefined : Set,
   '%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
   '%SetPrototype%': typeof Set === 'undefined' ? undefined : Set.prototype,
   '%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
   '%SharedArrayBufferPrototype%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer.prototype,
   '%String%': String,
   '%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
   '%StringPrototype%': String.prototype,
   '%Symbol%': hasSymbols ? Symbol : undefined,
   '%SymbolPrototype%': hasSymbols ? Symbol.prototype : undefined,
   '%SyntaxError%': SyntaxError,
   '%SyntaxErrorPrototype%': SyntaxError.prototype,
   '%ThrowTypeError%': ThrowTypeError,
   '%TypedArray%': TypedArray,
   '%TypedArrayPrototype%': TypedArray ? TypedArray.prototype : undefined,
   '%TypeError%': $TypeError,
   '%TypeErrorPrototype%': $TypeError.prototype,
   '%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
   '%Uint8ArrayPrototype%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array.prototype,
   '%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
   '%Uint8ClampedArrayPrototype%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray.prototype,
   '%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
   '%Uint16ArrayPrototype%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array.prototype,
   '%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
   '%Uint32ArrayPrototype%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array.prototype,
   '%URIError%': URIError,
   '%URIErrorPrototype%': URIError.prototype,
   '%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
   '%WeakMapPrototype%': typeof WeakMap === 'undefined' ? undefined : WeakMap.prototype,
   '%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet,
   '%WeakSetPrototype%': typeof WeakSet === 'undefined' ? undefined : WeakSet.prototype
 };
 
 var bind = __webpack_require__(/*! function-bind */ "./node_modules/function-bind/index.js");
 var $replace = bind.call(Function.call, String.prototype.replace);
 
 /* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
 var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
 var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
 var stringToPath = function stringToPath(string) {
   var result = [];
   $replace(string, rePropName, function (match, number, quote, subString) {
     result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : (number || match);
   });
   return result;
 };
 /* end adaptation */
 
 var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
   if (!(name in INTRINSICS)) {
     throw new SyntaxError('intrinsic ' + name + ' does not exist!');
   }
 
   // istanbul ignore if // hopefully this is impossible to test :-)
   if (typeof INTRINSICS[name] === 'undefined' && !allowMissing) {
     throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
   }
 
   return INTRINSICS[name];
 };
 
 module.exports = function GetIntrinsic(name, allowMissing) {
   if (typeof name !== 'string' || name.length === 0) {
     throw new TypeError('intrinsic name must be a non-empty string');
   }
   if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
     throw new TypeError('"allowMissing" argument must be a boolean');
   }
 
   var parts = stringToPath(name);
 
   var value = getBaseIntrinsic('%' + (parts.length > 0 ? parts[0] : '') + '%', allowMissing);
   for (var i = 1; i < parts.length; i += 1) {
     if (value != null) {
       if ($gOPD && (i + 1) >= parts.length) {
         var desc = $gOPD(value, parts[i]);
         if (!allowMissing && !(parts[i] in value)) {
           throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
         }
         value = desc ? (desc.get || desc.value) : value[parts[i]];
       } else {
         value = value[parts[i]];
       }
     }
   }
   return value;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/es-abstract/helpers/callBind.js":
 /*!******************************************************!*\
   !*** ./node_modules/es-abstract/helpers/callBind.js ***!
   \******************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var bind = __webpack_require__(/*! function-bind */ "./node_modules/function-bind/index.js");
 
 var GetIntrinsic = __webpack_require__(/*! ../GetIntrinsic */ "./node_modules/es-abstract/GetIntrinsic.js");
 
 var $apply = GetIntrinsic('%Function.prototype.apply%');
 var $call = GetIntrinsic('%Function.prototype.call%');
 var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);
 
 module.exports = function callBind() {
   return $reflectApply(bind, $call, arguments);
 };
 
 module.exports.apply = function applyBind() {
   return $reflectApply(bind, $apply, arguments);
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/eventemitter3/index.js":
 /*!*********************************************!*\
   !*** ./node_modules/eventemitter3/index.js ***!
   \*********************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 'use strict';
 
 var has = Object.prototype.hasOwnProperty
   , prefix = '~';
 
 /**
  * Constructor to create a storage for our `EE` objects.
  * An `Events` instance is a plain object whose properties are event names.
  *
  * @constructor
  * @private
  */
 function Events() {}
 
 //
 // We try to not inherit from `Object.prototype`. In some engines creating an
 // instance in this way is faster than calling `Object.create(null)` directly.
 // If `Object.create(null)` is not supported we prefix the event names with a
 // character to make sure that the built-in object properties are not
 // overridden or used as an attack vector.
 //
 if (Object.create) {
   Events.prototype = Object.create(null);
 
   //
   // This hack is needed because the `__proto__` property is still inherited in
   // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
   //
   if (!new Events().__proto__) prefix = false;
 }
 
 /**
  * Representation of a single event listener.
  *
  * @param {Function} fn The listener function.
  * @param {*} context The context to invoke the listener with.
  * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
  * @constructor
  * @private
  */
 function EE(fn, context, once) {
   this.fn = fn;
   this.context = context;
   this.once = once || false;
 }
 
 /**
  * Add a listener for a given event.
  *
  * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
  * @param {(String|Symbol)} event The event name.
  * @param {Function} fn The listener function.
  * @param {*} context The context to invoke the listener with.
  * @param {Boolean} once Specify if the listener is a one-time listener.
  * @returns {EventEmitter}
  * @private
  */
 function addListener(emitter, event, fn, context, once) {
   if (typeof fn !== 'function') {
     throw new TypeError('The listener must be a function');
   }
 
   var listener = new EE(fn, context || emitter, once)
     , evt = prefix ? prefix + event : event;
 
   if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
   else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
   else emitter._events[evt] = [emitter._events[evt], listener];
 
   return emitter;
 }
 
 /**
  * Clear event by name.
  *
  * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
  * @param {(String|Symbol)} evt The Event name.
  * @private
  */
 function clearEvent(emitter, evt) {
   if (--emitter._eventsCount === 0) emitter._events = new Events();
   else delete emitter._events[evt];
 }
 
 /**
  * Minimal `EventEmitter` interface that is molded against the Node.js
  * `EventEmitter` interface.
  *
  * @constructor
  * @public
  */
 function EventEmitter() {
   this._events = new Events();
   this._eventsCount = 0;
 }
 
 /**
  * Return an array listing the events for which the emitter has registered
  * listeners.
  *
  * @returns {Array}
  * @public
  */
 EventEmitter.prototype.eventNames = function eventNames() {
   var names = []
     , events
     , name;
 
   if (this._eventsCount === 0) return names;
 
   for (name in (events = this._events)) {
     if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
   }
 
   if (Object.getOwnPropertySymbols) {
     return names.concat(Object.getOwnPropertySymbols(events));
   }
 
   return names;
 };
 
 /**
  * Return the listeners registered for a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @returns {Array} The registered listeners.
  * @public
  */
 EventEmitter.prototype.listeners = function listeners(event) {
   var evt = prefix ? prefix + event : event
     , handlers = this._events[evt];
 
   if (!handlers) return [];
   if (handlers.fn) return [handlers.fn];
 
   for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
     ee[i] = handlers[i].fn;
   }
 
   return ee;
 };
 
 /**
  * Return the number of listeners listening to a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @returns {Number} The number of listeners.
  * @public
  */
 EventEmitter.prototype.listenerCount = function listenerCount(event) {
   var evt = prefix ? prefix + event : event
     , listeners = this._events[evt];
 
   if (!listeners) return 0;
   if (listeners.fn) return 1;
   return listeners.length;
 };
 
 /**
  * Calls each of the listeners registered for a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @returns {Boolean} `true` if the event had listeners, else `false`.
  * @public
  */
 EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
   var evt = prefix ? prefix + event : event;
 
   if (!this._events[evt]) return false;
 
   var listeners = this._events[evt]
     , len = arguments.length
     , args
     , i;
 
   if (listeners.fn) {
     if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
 
     switch (len) {
       case 1: return listeners.fn.call(listeners.context), true;
       case 2: return listeners.fn.call(listeners.context, a1), true;
       case 3: return listeners.fn.call(listeners.context, a1, a2), true;
       case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
       case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
       case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
     }
 
     for (i = 1, args = new Array(len -1); i < len; i++) {
       args[i - 1] = arguments[i];
     }
 
     listeners.fn.apply(listeners.context, args);
   } else {
     var length = listeners.length
       , j;
 
     for (i = 0; i < length; i++) {
       if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
 
       switch (len) {
         case 1: listeners[i].fn.call(listeners[i].context); break;
         case 2: listeners[i].fn.call(listeners[i].context, a1); break;
         case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
         case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
         default:
           if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
             args[j - 1] = arguments[j];
           }
 
           listeners[i].fn.apply(listeners[i].context, args);
       }
     }
   }
 
   return true;
 };
 
 /**
  * Add a listener for a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @param {Function} fn The listener function.
  * @param {*} [context=this] The context to invoke the listener with.
  * @returns {EventEmitter} `this`.
  * @public
  */
 EventEmitter.prototype.on = function on(event, fn, context) {
   return addListener(this, event, fn, context, false);
 };
 
 /**
  * Add a one-time listener for a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @param {Function} fn The listener function.
  * @param {*} [context=this] The context to invoke the listener with.
  * @returns {EventEmitter} `this`.
  * @public
  */
 EventEmitter.prototype.once = function once(event, fn, context) {
   return addListener(this, event, fn, context, true);
 };
 
 /**
  * Remove the listeners of a given event.
  *
  * @param {(String|Symbol)} event The event name.
  * @param {Function} fn Only remove the listeners that match this function.
  * @param {*} context Only remove the listeners that have this context.
  * @param {Boolean} once Only remove one-time listeners.
  * @returns {EventEmitter} `this`.
  * @public
  */
 EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
   var evt = prefix ? prefix + event : event;
 
   if (!this._events[evt]) return this;
   if (!fn) {
     clearEvent(this, evt);
     return this;
   }
 
   var listeners = this._events[evt];
 
   if (listeners.fn) {
     if (
       listeners.fn === fn &&
       (!once || listeners.once) &&
       (!context || listeners.context === context)
     ) {
       clearEvent(this, evt);
     }
   } else {
     for (var i = 0, events = [], length = listeners.length; i < length; i++) {
       if (
         listeners[i].fn !== fn ||
         (once && !listeners[i].once) ||
         (context && listeners[i].context !== context)
       ) {
         events.push(listeners[i]);
       }
     }
 
     //
     // Reset the array, or remove it completely if we have no more listeners.
     //
     if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
     else clearEvent(this, evt);
   }
 
   return this;
 };
 
 /**
  * Remove all listeners, or those of the specified event.
  *
  * @param {(String|Symbol)} [event] The event name.
  * @returns {EventEmitter} `this`.
  * @public
  */
 EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
   var evt;
 
   if (event) {
     evt = prefix ? prefix + event : event;
     if (this._events[evt]) clearEvent(this, evt);
   } else {
     this._events = new Events();
     this._eventsCount = 0;
   }
 
   return this;
 };
 
 //
 // Alias methods names because people roll like that.
 //
 EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
 EventEmitter.prototype.addListener = EventEmitter.prototype.on;
 
 //
 // Expose the prefix.
 //
 EventEmitter.prefixed = prefix;
 
 //
 // Allow `EventEmitter` to be imported as module namespace.
 //
 EventEmitter.EventEmitter = EventEmitter;
 
 //
 // Expose the module.
 //
 if ('undefined' !== typeof module) {
   module.exports = EventEmitter;
 }
 
 
 /***/ }),
 
 /***/ "./node_modules/extend/index.js":
 /*!**************************************!*\
   !*** ./node_modules/extend/index.js ***!
   \**************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 'use strict';
 
 var hasOwn = Object.prototype.hasOwnProperty;
 var toStr = Object.prototype.toString;
 var defineProperty = Object.defineProperty;
 var gOPD = Object.getOwnPropertyDescriptor;
 
 var isArray = function isArray(arr) {
   if (typeof Array.isArray === 'function') {
     return Array.isArray(arr);
   }
 
   return toStr.call(arr) === '[object Array]';
 };
 
 var isPlainObject = function isPlainObject(obj) {
   if (!obj || toStr.call(obj) !== '[object Object]') {
     return false;
   }
 
   var hasOwnConstructor = hasOwn.call(obj, 'constructor');
   var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
   // Not own constructor property must be Object
   if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
     return false;
   }
 
   // Own properties are enumerated firstly, so to speed up,
   // if last one is own, then all properties are own.
   var key;
   for (key in obj) { /**/ }
 
   return typeof key === 'undefined' || hasOwn.call(obj, key);
 };
 
 // If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
 var setProperty = function setProperty(target, options) {
   if (defineProperty && options.name === '__proto__') {
     defineProperty(target, options.name, {
       enumerable: true,
       configurable: true,
       value: options.newValue,
       writable: true
     });
   } else {
     target[options.name] = options.newValue;
   }
 };
 
 // Return undefined instead of __proto__ if '__proto__' is not an own property
 var getProperty = function getProperty(obj, name) {
   if (name === '__proto__') {
     if (!hasOwn.call(obj, name)) {
       return void 0;
     } else if (gOPD) {
       // In early versions of node, obj['__proto__'] is buggy when obj has
       // __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
       return gOPD(obj, name).value;
     }
   }
 
   return obj[name];
 };
 
 module.exports = function extend() {
   var options, name, src, copy, copyIsArray, clone;
   var target = arguments[0];
   var i = 1;
   var length = arguments.length;
   var deep = false;
 
   // Handle a deep copy situation
   if (typeof target === 'boolean') {
     deep = target;
     target = arguments[1] || {};
     // skip the boolean and the target
     i = 2;
   }
   if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
     target = {};
   }
 
   for (; i < length; ++i) {
     options = arguments[i];
     // Only deal with non-null/undefined values
     if (options != null) {
       // Extend the base object
       for (name in options) {
         src = getProperty(target, name);
         copy = getProperty(options, name);
 
         // Prevent never-ending loop
         if (target !== copy) {
           // Recurse if we're merging plain objects or arrays
           if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
             if (copyIsArray) {
               copyIsArray = false;
               clone = src && isArray(src) ? src : [];
             } else {
               clone = src && isPlainObject(src) ? src : {};
             }
 
             // Never move original objects, clone them
             setProperty(target, { name: name, newValue: extend(deep, clone, copy) });
 
           // Don't bring in undefined values
           } else if (typeof copy !== 'undefined') {
             setProperty(target, { name: name, newValue: copy });
           }
         }
       }
     }
   }
 
   // Return the modified object
   return target;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/fast-diff/diff.js":
 /*!****************************************!*\
   !*** ./node_modules/fast-diff/diff.js ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 /**
  * This library modifies the diff-patch-match library by Neil Fraser
  * by removing the patch and match functionality and certain advanced
  * options in the diff function. The original license is as follows:
  *
  * ===
  *
  * Diff Match and Patch
  *
  * Copyright 2006 Google Inc.
  * http://code.google.com/p/google-diff-match-patch/
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  */
 
 
 /**
  * The data structure representing a diff is an array of tuples:
  * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
  * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
  */
 var DIFF_DELETE = -1;
 var DIFF_INSERT = 1;
 var DIFF_EQUAL = 0;
 
 
 /**
  * Find the differences between two texts.  Simplifies the problem by stripping
  * any common prefix or suffix off the texts before diffing.
  * @param {string} text1 Old string to be diffed.
  * @param {string} text2 New string to be diffed.
  * @param {Int|Object} [cursor_pos] Edit position in text1 or object with more info
  * @return {Array} Array of diff tuples.
  */
 function diff_main(text1, text2, cursor_pos, _fix_unicode) {
   // Check for equality
   if (text1 === text2) {
     if (text1) {
       return [[DIFF_EQUAL, text1]];
     }
     return [];
   }
 
   if (cursor_pos != null) {
     var editdiff = find_cursor_edit_diff(text1, text2, cursor_pos);
     if (editdiff) {
       return editdiff;
     }
   }
 
   // Trim off common prefix (speedup).
   var commonlength = diff_commonPrefix(text1, text2);
   var commonprefix = text1.substring(0, commonlength);
   text1 = text1.substring(commonlength);
   text2 = text2.substring(commonlength);
 
   // Trim off common suffix (speedup).
   commonlength = diff_commonSuffix(text1, text2);
   var commonsuffix = text1.substring(text1.length - commonlength);
   text1 = text1.substring(0, text1.length - commonlength);
   text2 = text2.substring(0, text2.length - commonlength);
 
   // Compute the diff on the middle block.
   var diffs = diff_compute_(text1, text2);
 
   // Restore the prefix and suffix.
   if (commonprefix) {
     diffs.unshift([DIFF_EQUAL, commonprefix]);
   }
   if (commonsuffix) {
     diffs.push([DIFF_EQUAL, commonsuffix]);
   }
   diff_cleanupMerge(diffs, _fix_unicode);
   return diffs;
 };
 
 
 /**
  * Find the differences between two texts.  Assumes that the texts do not
  * have any common prefix or suffix.
  * @param {string} text1 Old string to be diffed.
  * @param {string} text2 New string to be diffed.
  * @return {Array} Array of diff tuples.
  */
 function diff_compute_(text1, text2) {
   var diffs;
 
   if (!text1) {
     // Just add some text (speedup).
     return [[DIFF_INSERT, text2]];
   }
 
   if (!text2) {
     // Just delete some text (speedup).
     return [[DIFF_DELETE, text1]];
   }
 
   var longtext = text1.length > text2.length ? text1 : text2;
   var shorttext = text1.length > text2.length ? text2 : text1;
   var i = longtext.indexOf(shorttext);
   if (i !== -1) {
     // Shorter text is inside the longer text (speedup).
     diffs = [
       [DIFF_INSERT, longtext.substring(0, i)],
       [DIFF_EQUAL, shorttext],
       [DIFF_INSERT, longtext.substring(i + shorttext.length)]
     ];
     // Swap insertions for deletions if diff is reversed.
     if (text1.length > text2.length) {
       diffs[0][0] = diffs[2][0] = DIFF_DELETE;
     }
     return diffs;
   }
 
   if (shorttext.length === 1) {
     // Single character string.
     // After the previous speedup, the character can't be an equality.
     return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
   }
 
   // Check to see if the problem can be split in two.
   var hm = diff_halfMatch_(text1, text2);
   if (hm) {
     // A half-match was found, sort out the return data.
     var text1_a = hm[0];
     var text1_b = hm[1];
     var text2_a = hm[2];
     var text2_b = hm[3];
     var mid_common = hm[4];
     // Send both pairs off for separate processing.
     var diffs_a = diff_main(text1_a, text2_a);
     var diffs_b = diff_main(text1_b, text2_b);
     // Merge the results.
     return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
   }
 
   return diff_bisect_(text1, text2);
 };
 
 
 /**
  * Find the 'middle snake' of a diff, split the problem in two
  * and return the recursively constructed diff.
  * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
  * @param {string} text1 Old string to be diffed.
  * @param {string} text2 New string to be diffed.
  * @return {Array} Array of diff tuples.
  * @private
  */
 function diff_bisect_(text1, text2) {
   // Cache the text lengths to prevent multiple calls.
   var text1_length = text1.length;
   var text2_length = text2.length;
   var max_d = Math.ceil((text1_length + text2_length) / 2);
   var v_offset = max_d;
   var v_length = 2 * max_d;
   var v1 = new Array(v_length);
   var v2 = new Array(v_length);
   // Setting all elements to -1 is faster in Chrome & Firefox than mixing
   // integers and undefined.
   for (var x = 0; x < v_length; x++) {
     v1[x] = -1;
     v2[x] = -1;
   }
   v1[v_offset + 1] = 0;
   v2[v_offset + 1] = 0;
   var delta = text1_length - text2_length;
   // If the total number of characters is odd, then the front path will collide
   // with the reverse path.
   var front = (delta % 2 !== 0);
   // Offsets for start and end of k loop.
   // Prevents mapping of space beyond the grid.
   var k1start = 0;
   var k1end = 0;
   var k2start = 0;
   var k2end = 0;
   for (var d = 0; d < max_d; d++) {
     // Walk the front path one step.
     for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
       var k1_offset = v_offset + k1;
       var x1;
       if (k1 === -d || (k1 !== d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
         x1 = v1[k1_offset + 1];
       } else {
         x1 = v1[k1_offset - 1] + 1;
       }
       var y1 = x1 - k1;
       while (
         x1 < text1_length && y1 < text2_length &&
         text1.charAt(x1) === text2.charAt(y1)
       ) {
         x1++;
         y1++;
       }
       v1[k1_offset] = x1;
       if (x1 > text1_length) {
         // Ran off the right of the graph.
         k1end += 2;
       } else if (y1 > text2_length) {
         // Ran off the bottom of the graph.
         k1start += 2;
       } else if (front) {
         var k2_offset = v_offset + delta - k1;
         if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] !== -1) {
           // Mirror x2 onto top-left coordinate system.
           var x2 = text1_length - v2[k2_offset];
           if (x1 >= x2) {
             // Overlap detected.
             return diff_bisectSplit_(text1, text2, x1, y1);
           }
         }
       }
     }
 
     // Walk the reverse path one step.
     for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
       var k2_offset = v_offset + k2;
       var x2;
       if (k2 === -d || (k2 !== d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
         x2 = v2[k2_offset + 1];
       } else {
         x2 = v2[k2_offset - 1] + 1;
       }
       var y2 = x2 - k2;
       while (
         x2 < text1_length && y2 < text2_length &&
         text1.charAt(text1_length - x2 - 1) === text2.charAt(text2_length - y2 - 1)
       ) {
         x2++;
         y2++;
       }
       v2[k2_offset] = x2;
       if (x2 > text1_length) {
         // Ran off the left of the graph.
         k2end += 2;
       } else if (y2 > text2_length) {
         // Ran off the top of the graph.
         k2start += 2;
       } else if (!front) {
         var k1_offset = v_offset + delta - k2;
         if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] !== -1) {
           var x1 = v1[k1_offset];
           var y1 = v_offset + x1 - k1_offset;
           // Mirror x2 onto top-left coordinate system.
           x2 = text1_length - x2;
           if (x1 >= x2) {
             // Overlap detected.
             return diff_bisectSplit_(text1, text2, x1, y1);
           }
         }
       }
     }
   }
   // Diff took too long and hit the deadline or
   // number of diffs equals number of characters, no commonality at all.
   return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
 };
 
 
 /**
  * Given the location of the 'middle snake', split the diff in two parts
  * and recurse.
  * @param {string} text1 Old string to be diffed.
  * @param {string} text2 New string to be diffed.
  * @param {number} x Index of split point in text1.
  * @param {number} y Index of split point in text2.
  * @return {Array} Array of diff tuples.
  */
 function diff_bisectSplit_(text1, text2, x, y) {
   var text1a = text1.substring(0, x);
   var text2a = text2.substring(0, y);
   var text1b = text1.substring(x);
   var text2b = text2.substring(y);
 
   // Compute both diffs serially.
   var diffs = diff_main(text1a, text2a);
   var diffsb = diff_main(text1b, text2b);
 
   return diffs.concat(diffsb);
 };
 
 
 /**
  * Determine the common prefix of two strings.
  * @param {string} text1 First string.
  * @param {string} text2 Second string.
  * @return {number} The number of characters common to the start of each
  *     string.
  */
 function diff_commonPrefix(text1, text2) {
   // Quick check for common null cases.
   if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) {
     return 0;
   }
   // Binary search.
   // Performance analysis: http://neil.fraser.name/news/2007/10/09/
   var pointermin = 0;
   var pointermax = Math.min(text1.length, text2.length);
   var pointermid = pointermax;
   var pointerstart = 0;
   while (pointermin < pointermid) {
     if (
       text1.substring(pointerstart, pointermid) ==
       text2.substring(pointerstart, pointermid)
     ) {
       pointermin = pointermid;
       pointerstart = pointermin;
     } else {
       pointermax = pointermid;
     }
     pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
   }
 
   if (is_surrogate_pair_start(text1.charCodeAt(pointermid - 1))) {
     pointermid--;
   }
 
   return pointermid;
 };
 
 
 /**
  * Determine the common suffix of two strings.
  * @param {string} text1 First string.
  * @param {string} text2 Second string.
  * @return {number} The number of characters common to the end of each string.
  */
 function diff_commonSuffix(text1, text2) {
   // Quick check for common null cases.
   if (!text1 || !text2 || text1.slice(-1) !== text2.slice(-1)) {
     return 0;
   }
   // Binary search.
   // Performance analysis: http://neil.fraser.name/news/2007/10/09/
   var pointermin = 0;
   var pointermax = Math.min(text1.length, text2.length);
   var pointermid = pointermax;
   var pointerend = 0;
   while (pointermin < pointermid) {
     if (
       text1.substring(text1.length - pointermid, text1.length - pointerend) ==
       text2.substring(text2.length - pointermid, text2.length - pointerend)
     ) {
       pointermin = pointermid;
       pointerend = pointermin;
     } else {
       pointermax = pointermid;
     }
     pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
   }
 
   if (is_surrogate_pair_end(text1.charCodeAt(text1.length - pointermid))) {
     pointermid--;
   }
 
   return pointermid;
 };
 
 
 /**
  * Do the two texts share a substring which is at least half the length of the
  * longer text?
  * This speedup can produce non-minimal diffs.
  * @param {string} text1 First string.
  * @param {string} text2 Second string.
  * @return {Array.<string>} Five element Array, containing the prefix of
  *     text1, the suffix of text1, the prefix of text2, the suffix of
  *     text2 and the common middle.  Or null if there was no match.
  */
 function diff_halfMatch_(text1, text2) {
   var longtext = text1.length > text2.length ? text1 : text2;
   var shorttext = text1.length > text2.length ? text2 : text1;
   if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
     return null;  // Pointless.
   }
 
   /**
    * Does a substring of shorttext exist within longtext such that the substring
    * is at least half the length of longtext?
    * Closure, but does not reference any external variables.
    * @param {string} longtext Longer string.
    * @param {string} shorttext Shorter string.
    * @param {number} i Start index of quarter length substring within longtext.
    * @return {Array.<string>} Five element Array, containing the prefix of
    *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
    *     of shorttext and the common middle.  Or null if there was no match.
    * @private
    */
   function diff_halfMatchI_(longtext, shorttext, i) {
     // Start with a 1/4 length substring at position i as a seed.
     var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
     var j = -1;
     var best_common = '';
     var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
     while ((j = shorttext.indexOf(seed, j + 1)) !== -1) {
       var prefixLength = diff_commonPrefix(
         longtext.substring(i), shorttext.substring(j));
       var suffixLength = diff_commonSuffix(
         longtext.substring(0, i), shorttext.substring(0, j));
       if (best_common.length < suffixLength + prefixLength) {
         best_common = shorttext.substring(
           j - suffixLength, j) + shorttext.substring(j, j + prefixLength);
         best_longtext_a = longtext.substring(0, i - suffixLength);
         best_longtext_b = longtext.substring(i + prefixLength);
         best_shorttext_a = shorttext.substring(0, j - suffixLength);
         best_shorttext_b = shorttext.substring(j + prefixLength);
       }
     }
     if (best_common.length * 2 >= longtext.length) {
       return [
         best_longtext_a, best_longtext_b,
         best_shorttext_a, best_shorttext_b, best_common
       ];
     } else {
       return null;
     }
   }
 
   // First check if the second quarter is the seed for a half-match.
   var hm1 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 4));
   // Check again based on the third quarter.
   var hm2 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 2));
   var hm;
   if (!hm1 && !hm2) {
     return null;
   } else if (!hm2) {
     hm = hm1;
   } else if (!hm1) {
     hm = hm2;
   } else {
     // Both matched.  Select the longest.
     hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
   }
 
   // A half-match was found, sort out the return data.
   var text1_a, text1_b, text2_a, text2_b;
   if (text1.length > text2.length) {
     text1_a = hm[0];
     text1_b = hm[1];
     text2_a = hm[2];
     text2_b = hm[3];
   } else {
     text2_a = hm[0];
     text2_b = hm[1];
     text1_a = hm[2];
     text1_b = hm[3];
   }
   var mid_common = hm[4];
   return [text1_a, text1_b, text2_a, text2_b, mid_common];
 };
 
 
 /**
  * Reorder and merge like edit sections.  Merge equalities.
  * Any edit section can move as long as it doesn't cross an equality.
  * @param {Array} diffs Array of diff tuples.
  * @param {boolean} fix_unicode Whether to normalize to a unicode-correct diff
  */
 function diff_cleanupMerge(diffs, fix_unicode) {
   diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
   var pointer = 0;
   var count_delete = 0;
   var count_insert = 0;
   var text_delete = '';
   var text_insert = '';
   var commonlength;
   while (pointer < diffs.length) {
     if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
       diffs.splice(pointer, 1);
       continue;
     }
     switch (diffs[pointer][0]) {
       case DIFF_INSERT:
 
         count_insert++;
         text_insert += diffs[pointer][1];
         pointer++;
         break;
       case DIFF_DELETE:
         count_delete++;
         text_delete += diffs[pointer][1];
         pointer++;
         break;
       case DIFF_EQUAL:
         var previous_equality = pointer - count_insert - count_delete - 1;
         if (fix_unicode) {
           // prevent splitting of unicode surrogate pairs.  when fix_unicode is true,
           // we assume that the old and new text in the diff are complete and correct
           // unicode-encoded JS strings, but the tuple boundaries may fall between
           // surrogate pairs.  we fix this by shaving off stray surrogates from the end
           // of the previous equality and the beginning of this equality.  this may create
           // empty equalities or a common prefix or suffix.  for example, if AB and AC are
           // emojis, `[[0, 'A'], [-1, 'BA'], [0, 'C']]` would turn into deleting 'ABAC' and
           // inserting 'AC', and then the common suffix 'AC' will be eliminated.  in this
           // particular case, both equalities go away, we absorb any previous inequalities,
           // and we keep scanning for the next equality before rewriting the tuples.
           if (previous_equality >= 0 && ends_with_pair_start(diffs[previous_equality][1])) {
             var stray = diffs[previous_equality][1].slice(-1);
             diffs[previous_equality][1] = diffs[previous_equality][1].slice(0, -1);
             text_delete = stray + text_delete;
             text_insert = stray + text_insert;
             if (!diffs[previous_equality][1]) {
               // emptied out previous equality, so delete it and include previous delete/insert
               diffs.splice(previous_equality, 1);
               pointer--;
               var k = previous_equality - 1;
               if (diffs[k] && diffs[k][0] === DIFF_INSERT) {
                 count_insert++;
                 text_insert = diffs[k][1] + text_insert;
                 k--;
               }
               if (diffs[k] && diffs[k][0] === DIFF_DELETE) {
                 count_delete++;
                 text_delete = diffs[k][1] + text_delete;
                 k--;
               }
               previous_equality = k;
             }
           }
           if (starts_with_pair_end(diffs[pointer][1])) {
             var stray = diffs[pointer][1].charAt(0);
             diffs[pointer][1] = diffs[pointer][1].slice(1);
             text_delete += stray;
             text_insert += stray;
           }
         }
         if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
           // for empty equality not at end, wait for next equality
           diffs.splice(pointer, 1);
           break;
         }
         if (text_delete.length > 0 || text_insert.length > 0) {
           // note that diff_commonPrefix and diff_commonSuffix are unicode-aware
           if (text_delete.length > 0 && text_insert.length > 0) {
             // Factor out any common prefixes.
             commonlength = diff_commonPrefix(text_insert, text_delete);
             if (commonlength !== 0) {
               if (previous_equality >= 0) {
                 diffs[previous_equality][1] += text_insert.substring(0, commonlength);
               } else {
                 diffs.splice(0, 0, [DIFF_EQUAL, text_insert.substring(0, commonlength)]);
                 pointer++;
               }
               text_insert = text_insert.substring(commonlength);
               text_delete = text_delete.substring(commonlength);
             }
             // Factor out any common suffixes.
             commonlength = diff_commonSuffix(text_insert, text_delete);
             if (commonlength !== 0) {
               diffs[pointer][1] =
                 text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
               text_insert = text_insert.substring(0, text_insert.length - commonlength);
               text_delete = text_delete.substring(0, text_delete.length - commonlength);
             }
           }
           // Delete the offending records and add the merged ones.
           var n = count_insert + count_delete;
           if (text_delete.length === 0 && text_insert.length === 0) {
             diffs.splice(pointer - n, n);
             pointer = pointer - n;
           } else if (text_delete.length === 0) {
             diffs.splice(pointer - n, n, [DIFF_INSERT, text_insert]);
             pointer = pointer - n + 1;
           } else if (text_insert.length === 0) {
             diffs.splice(pointer - n, n, [DIFF_DELETE, text_delete]);
             pointer = pointer - n + 1;
           } else {
             diffs.splice(pointer - n, n, [DIFF_DELETE, text_delete], [DIFF_INSERT, text_insert]);
             pointer = pointer - n + 2;
           }
         }
         if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
           // Merge this equality with the previous one.
           diffs[pointer - 1][1] += diffs[pointer][1];
           diffs.splice(pointer, 1);
         } else {
           pointer++;
         }
         count_insert = 0;
         count_delete = 0;
         text_delete = '';
         text_insert = '';
         break;
     }
   }
   if (diffs[diffs.length - 1][1] === '') {
     diffs.pop();  // Remove the dummy entry at the end.
   }
 
   // Second pass: look for single edits surrounded on both sides by equalities
   // which can be shifted sideways to eliminate an equality.
   // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
   var changes = false;
   pointer = 1;
   // Intentionally ignore the first and last element (don't need checking).
   while (pointer < diffs.length - 1) {
     if (diffs[pointer - 1][0] === DIFF_EQUAL &&
       diffs[pointer + 1][0] === DIFF_EQUAL) {
       // This is a single edit surrounded by equalities.
       if (diffs[pointer][1].substring(diffs[pointer][1].length -
         diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
         // Shift the edit over the previous equality.
         diffs[pointer][1] = diffs[pointer - 1][1] +
           diffs[pointer][1].substring(0, diffs[pointer][1].length -
             diffs[pointer - 1][1].length);
         diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
         diffs.splice(pointer - 1, 1);
         changes = true;
       } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
         diffs[pointer + 1][1]) {
         // Shift the edit over the next equality.
         diffs[pointer - 1][1] += diffs[pointer + 1][1];
         diffs[pointer][1] =
           diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
           diffs[pointer + 1][1];
         diffs.splice(pointer + 1, 1);
         changes = true;
       }
     }
     pointer++;
   }
   // If shifts were made, the diff needs reordering and another shift sweep.
   if (changes) {
     diff_cleanupMerge(diffs, fix_unicode);
   }
 };
 
 function is_surrogate_pair_start(charCode) {
   return charCode >= 0xD800 && charCode <= 0xDBFF;
 }
 
 function is_surrogate_pair_end(charCode) {
   return charCode >= 0xDC00 && charCode <= 0xDFFF;
 }
 
 function starts_with_pair_end(str) {
   return is_surrogate_pair_end(str.charCodeAt(0));
 }
 
 function ends_with_pair_start(str) {
   return is_surrogate_pair_start(str.charCodeAt(str.length - 1));
 }
 
 function remove_empty_tuples(tuples) {
   var ret = [];
   for (var i = 0; i < tuples.length; i++) {
     if (tuples[i][1].length > 0) {
       ret.push(tuples[i]);
     }
   }
   return ret;
 }
 
 function make_edit_splice(before, oldMiddle, newMiddle, after) {
   if (ends_with_pair_start(before) || starts_with_pair_end(after)) {
     return null;
   }
   return remove_empty_tuples([
     [DIFF_EQUAL, before],
     [DIFF_DELETE, oldMiddle],
     [DIFF_INSERT, newMiddle],
     [DIFF_EQUAL, after]
   ]);
 }
 
 function find_cursor_edit_diff(oldText, newText, cursor_pos) {
   // note: this runs after equality check has ruled out exact equality
   var oldRange = typeof cursor_pos === 'number' ?
     { index: cursor_pos, length: 0 } : cursor_pos.oldRange;
   var newRange = typeof cursor_pos === 'number' ?
     null : cursor_pos.newRange;
   // take into account the old and new selection to generate the best diff
   // possible for a text edit.  for example, a text change from "xxx" to "xx"
   // could be a delete or forwards-delete of any one of the x's, or the
   // result of selecting two of the x's and typing "x".
   var oldLength = oldText.length;
   var newLength = newText.length;
   if (oldRange.length === 0 && (newRange === null || newRange.length === 0)) {
     // see if we have an insert or delete before or after cursor
     var oldCursor = oldRange.index;
     var oldBefore = oldText.slice(0, oldCursor);
     var oldAfter = oldText.slice(oldCursor);
     var maybeNewCursor = newRange ? newRange.index : null;
     editBefore: {
       // is this an insert or delete right before oldCursor?
       var newCursor = oldCursor + newLength - oldLength;
       if (maybeNewCursor !== null && maybeNewCursor !== newCursor) {
         break editBefore;
       }
       if (newCursor < 0 || newCursor > newLength) {
         break editBefore;
       }
       var newBefore = newText.slice(0, newCursor);
       var newAfter = newText.slice(newCursor);
       if (newAfter !== oldAfter) {
         break editBefore;
       }
       var prefixLength = Math.min(oldCursor, newCursor);
       var oldPrefix = oldBefore.slice(0, prefixLength);
       var newPrefix = newBefore.slice(0, prefixLength);
       if (oldPrefix !== newPrefix) {
         break editBefore;
       }
       var oldMiddle = oldBefore.slice(prefixLength);
       var newMiddle = newBefore.slice(prefixLength);
       return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldAfter);
     }
     editAfter: {
       // is this an insert or delete right after oldCursor?
       if (maybeNewCursor !== null && maybeNewCursor !== oldCursor) {
         break editAfter;
       }
       var cursor = oldCursor;
       var newBefore = newText.slice(0, cursor);
       var newAfter = newText.slice(cursor);
       if (newBefore !== oldBefore) {
         break editAfter;
       }
       var suffixLength = Math.min(oldLength - cursor, newLength - cursor);
       var oldSuffix = oldAfter.slice(oldAfter.length - suffixLength);
       var newSuffix = newAfter.slice(newAfter.length - suffixLength);
       if (oldSuffix !== newSuffix) {
         break editAfter;
       }
       var oldMiddle = oldAfter.slice(0, oldAfter.length - suffixLength);
       var newMiddle = newAfter.slice(0, newAfter.length - suffixLength);
       return make_edit_splice(oldBefore, oldMiddle, newMiddle, oldSuffix);
     }
   }
   if (oldRange.length > 0 && newRange && newRange.length === 0) {
     replaceRange: {
       // see if diff could be a splice of the old selection range
       var oldPrefix = oldText.slice(0, oldRange.index);
       var oldSuffix = oldText.slice(oldRange.index + oldRange.length);
       var prefixLength = oldPrefix.length;
       var suffixLength = oldSuffix.length;
       if (newLength < prefixLength + suffixLength) {
         break replaceRange;
       }
       var newPrefix = newText.slice(0, prefixLength);
       var newSuffix = newText.slice(newLength - suffixLength);
       if (oldPrefix !== newPrefix || oldSuffix !== newSuffix) {
         break replaceRange;
       }
       var oldMiddle = oldText.slice(prefixLength, oldLength - suffixLength);
       var newMiddle = newText.slice(prefixLength, newLength - suffixLength);
       return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldSuffix);
     }
   }
 
   return null;
 }
 
 function diff(text1, text2, cursor_pos) {
   // only pass fix_unicode=true at the top level, not when diff_main is
   // recursively invoked
   return diff_main(text1, text2, cursor_pos, true);
 }
 
 diff.INSERT = DIFF_INSERT;
 diff.DELETE = DIFF_DELETE;
 diff.EQUAL = DIFF_EQUAL;
 
 module.exports = diff;
 
 
 /***/ }),
 
 /***/ "./node_modules/function-bind/implementation.js":
 /*!******************************************************!*\
   !*** ./node_modules/function-bind/implementation.js ***!
   \******************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 /* eslint no-invalid-this: 1 */
 
 var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
 var slice = Array.prototype.slice;
 var toStr = Object.prototype.toString;
 var funcType = '[object Function]';
 
 module.exports = function bind(that) {
     var target = this;
     if (typeof target !== 'function' || toStr.call(target) !== funcType) {
         throw new TypeError(ERROR_MESSAGE + target);
     }
     var args = slice.call(arguments, 1);
 
     var bound;
     var binder = function () {
         if (this instanceof bound) {
             var result = target.apply(
                 this,
                 args.concat(slice.call(arguments))
             );
             if (Object(result) === result) {
                 return result;
             }
             return this;
         } else {
             return target.apply(
                 that,
                 args.concat(slice.call(arguments))
             );
         }
     };
 
     var boundLength = Math.max(0, target.length - args.length);
     var boundArgs = [];
     for (var i = 0; i < boundLength; i++) {
         boundArgs.push('$' + i);
     }
 
     bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);
 
     if (target.prototype) {
         var Empty = function Empty() {};
         Empty.prototype = target.prototype;
         bound.prototype = new Empty();
         Empty.prototype = null;
     }
 
     return bound;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/function-bind/index.js":
 /*!*********************************************!*\
   !*** ./node_modules/function-bind/index.js ***!
   \*********************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/function-bind/implementation.js");
 
 module.exports = Function.prototype.bind || implementation;
 
 
 /***/ }),
 
 /***/ "./node_modules/has-symbols/index.js":
 /*!*******************************************!*\
   !*** ./node_modules/has-symbols/index.js ***!
   \*******************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 /* WEBPACK VAR INJECTION */(function(global) {
 
 var origSymbol = global.Symbol;
 var hasSymbolSham = __webpack_require__(/*! ./shams */ "./node_modules/has-symbols/shams.js");
 
 module.exports = function hasNativeSymbols() {
   if (typeof origSymbol !== 'function') { return false; }
   if (typeof Symbol !== 'function') { return false; }
   if (typeof origSymbol('foo') !== 'symbol') { return false; }
   if (typeof Symbol('bar') !== 'symbol') { return false; }
 
   return hasSymbolSham();
 };
 
 /* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))
 
 /***/ }),
 
 /***/ "./node_modules/has-symbols/shams.js":
 /*!*******************************************!*\
   !*** ./node_modules/has-symbols/shams.js ***!
   \*******************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 /* eslint complexity: [2, 18], max-statements: [2, 33] */
 module.exports = function hasSymbols() {
   if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
   if (typeof Symbol.iterator === 'symbol') { return true; }
 
   var obj = {};
   var sym = Symbol('test');
   var symObj = Object(sym);
   if (typeof sym === 'string') { return false; }
 
   if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
   if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }
 
   // temp disabled per https://github.com/ljharb/object.assign/issues/17
   // if (sym instanceof Symbol) { return false; }
   // temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
   // if (!(symObj instanceof Symbol)) { return false; }
 
   // if (typeof Symbol.prototype.toString !== 'function') { return false; }
   // if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }
 
   var symVal = 42;
   obj[sym] = symVal;
   for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax
   if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }
 
   if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }
 
   var syms = Object.getOwnPropertySymbols(obj);
   if (syms.length !== 1 || syms[0] !== sym) { return false; }
 
   if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }
 
   if (typeof Object.getOwnPropertyDescriptor === 'function') {
     var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
     if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
   }
 
   return true;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/is-arguments/index.js":
 /*!********************************************!*\
   !*** ./node_modules/is-arguments/index.js ***!
   \********************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
 var toStr = Object.prototype.toString;
 
 var isStandardArguments = function isArguments(value) {
   if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
     return false;
   }
   return toStr.call(value) === '[object Arguments]';
 };
 
 var isLegacyArguments = function isArguments(value) {
   if (isStandardArguments(value)) {
     return true;
   }
   return value !== null &&
     typeof value === 'object' &&
     typeof value.length === 'number' &&
     value.length >= 0 &&
     toStr.call(value) !== '[object Array]' &&
     toStr.call(value.callee) === '[object Function]';
 };
 
 var supportsStandardArguments = (function () {
   return isStandardArguments(arguments);
 }());
 
 isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests
 
 module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
 
 
 /***/ }),
 
 /***/ "./node_modules/is-date-object/index.js":
 /*!**********************************************!*\
   !*** ./node_modules/is-date-object/index.js ***!
   \**********************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var getDay = Date.prototype.getDay;
 var tryDateObject = function tryDateGetDayCall(value) {
   try {
     getDay.call(value);
     return true;
   } catch (e) {
     return false;
   }
 };
 
 var toStr = Object.prototype.toString;
 var dateClass = '[object Date]';
 var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
 
 module.exports = function isDateObject(value) {
   if (typeof value !== 'object' || value === null) {
     return false;
   }
   return hasToStringTag ? tryDateObject(value) : toStr.call(value) === dateClass;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/is-regex/index.js":
 /*!****************************************!*\
   !*** ./node_modules/is-regex/index.js ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var hasSymbols = __webpack_require__(/*! has-symbols */ "./node_modules/has-symbols/index.js")();
 var hasToStringTag = hasSymbols && typeof Symbol.toStringTag === 'symbol';
 var hasOwnProperty;
 var regexExec;
 var isRegexMarker;
 var badStringifier;
 
 if (hasToStringTag) {
   hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
   regexExec = Function.call.bind(RegExp.prototype.exec);
   isRegexMarker = {};
 
   var throwRegexMarker = function () {
     throw isRegexMarker;
   };
   badStringifier = {
     toString: throwRegexMarker,
     valueOf: throwRegexMarker
   };
 
   if (typeof Symbol.toPrimitive === 'symbol') {
     badStringifier[Symbol.toPrimitive] = throwRegexMarker;
   }
 }
 
 var toStr = Object.prototype.toString;
 var gOPD = Object.getOwnPropertyDescriptor;
 var regexClass = '[object RegExp]';
 
 module.exports = hasToStringTag
   // eslint-disable-next-line consistent-return
   ? function isRegex(value) {
     if (!value || typeof value !== 'object') {
       return false;
     }
 
     var descriptor = gOPD(value, 'lastIndex');
     var hasLastIndexDataProperty = descriptor && hasOwnProperty(descriptor, 'value');
     if (!hasLastIndexDataProperty) {
       return false;
     }
 
     try {
       regexExec(value, badStringifier);
     } catch (e) {
       return e === isRegexMarker;
     }
   }
   : function isRegex(value) {
     // In older browsers, typeof regex incorrectly returns 'function'
     if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
       return false;
     }
 
     return toStr.call(value) === regexClass;
   };
 
 
 /***/ }),
 
 /***/ "./node_modules/object-is/implementation.js":
 /*!**************************************************!*\
   !*** ./node_modules/object-is/implementation.js ***!
   \**************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var numberIsNaN = function (value) {
   return value !== value;
 };
 
 module.exports = function is(a, b) {
   if (a === 0 && b === 0) {
     return 1 / a === 1 / b;
   }
   if (a === b) {
     return true;
   }
   if (numberIsNaN(a) && numberIsNaN(b)) {
     return true;
   }
   return false;
 };
 
 
 
 /***/ }),
 
 /***/ "./node_modules/object-is/index.js":
 /*!*****************************************!*\
   !*** ./node_modules/object-is/index.js ***!
   \*****************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var define = __webpack_require__(/*! define-properties */ "./node_modules/define-properties/index.js");
 var callBind = __webpack_require__(/*! es-abstract/helpers/callBind */ "./node_modules/es-abstract/helpers/callBind.js");
 
 var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/object-is/implementation.js");
 var getPolyfill = __webpack_require__(/*! ./polyfill */ "./node_modules/object-is/polyfill.js");
 var shim = __webpack_require__(/*! ./shim */ "./node_modules/object-is/shim.js");
 
 var polyfill = callBind(getPolyfill(), Object);
 
 define(polyfill, {
   getPolyfill: getPolyfill,
   implementation: implementation,
   shim: shim
 });
 
 module.exports = polyfill;
 
 
 /***/ }),
 
 /***/ "./node_modules/object-is/polyfill.js":
 /*!********************************************!*\
   !*** ./node_modules/object-is/polyfill.js ***!
   \********************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/object-is/implementation.js");
 
 module.exports = function getPolyfill() {
   return typeof Object.is === 'function' ? Object.is : implementation;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/object-is/shim.js":
 /*!****************************************!*\
   !*** ./node_modules/object-is/shim.js ***!
   \****************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var getPolyfill = __webpack_require__(/*! ./polyfill */ "./node_modules/object-is/polyfill.js");
 var define = __webpack_require__(/*! define-properties */ "./node_modules/define-properties/index.js");
 
 module.exports = function shimObjectIs() {
   var polyfill = getPolyfill();
   define(Object, { is: polyfill }, {
     is: function testObjectIs() {
       return Object.is !== polyfill;
     }
   });
   return polyfill;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/object-keys/implementation.js":
 /*!****************************************************!*\
   !*** ./node_modules/object-keys/implementation.js ***!
   \****************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var keysShim;
 if (!Object.keys) {
   // modified from https://github.com/es-shims/es5-shim
   var has = Object.prototype.hasOwnProperty;
   var toStr = Object.prototype.toString;
   var isArgs = __webpack_require__(/*! ./isArguments */ "./node_modules/object-keys/isArguments.js"); // eslint-disable-line global-require
   var isEnumerable = Object.prototype.propertyIsEnumerable;
   var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
   var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
   var dontEnums = [
     'toString',
     'toLocaleString',
     'valueOf',
     'hasOwnProperty',
     'isPrototypeOf',
     'propertyIsEnumerable',
     'constructor'
   ];
   var equalsConstructorPrototype = function (o) {
     var ctor = o.constructor;
     return ctor && ctor.prototype === o;
   };
   var excludedKeys = {
     $applicationCache: true,
     $console: true,
     $external: true,
     $frame: true,
     $frameElement: true,
     $frames: true,
     $innerHeight: true,
     $innerWidth: true,
     $onmozfullscreenchange: true,
     $onmozfullscreenerror: true,
     $outerHeight: true,
     $outerWidth: true,
     $pageXOffset: true,
     $pageYOffset: true,
     $parent: true,
     $scrollLeft: true,
     $scrollTop: true,
     $scrollX: true,
     $scrollY: true,
     $self: true,
     $webkitIndexedDB: true,
     $webkitStorageInfo: true,
     $window: true
   };
   var hasAutomationEqualityBug = (function () {
     /* global window */
     if (typeof window === 'undefined') { return false; }
     for (var k in window) {
       try {
         if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
           try {
             equalsConstructorPrototype(window[k]);
           } catch (e) {
             return true;
           }
         }
       } catch (e) {
         return true;
       }
     }
     return false;
   }());
   var equalsConstructorPrototypeIfNotBuggy = function (o) {
     /* global window */
     if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
       return equalsConstructorPrototype(o);
     }
     try {
       return equalsConstructorPrototype(o);
     } catch (e) {
       return false;
     }
   };
 
   keysShim = function keys(object) {
     var isObject = object !== null && typeof object === 'object';
     var isFunction = toStr.call(object) === '[object Function]';
     var isArguments = isArgs(object);
     var isString = isObject && toStr.call(object) === '[object String]';
     var theKeys = [];
 
     if (!isObject && !isFunction && !isArguments) {
       throw new TypeError('Object.keys called on a non-object');
     }
 
     var skipProto = hasProtoEnumBug && isFunction;
     if (isString && object.length > 0 && !has.call(object, 0)) {
       for (var i = 0; i < object.length; ++i) {
         theKeys.push(String(i));
       }
     }
 
     if (isArguments && object.length > 0) {
       for (var j = 0; j < object.length; ++j) {
         theKeys.push(String(j));
       }
     } else {
       for (var name in object) {
         if (!(skipProto && name === 'prototype') && has.call(object, name)) {
           theKeys.push(String(name));
         }
       }
     }
 
     if (hasDontEnumBug) {
       var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);
 
       for (var k = 0; k < dontEnums.length; ++k) {
         if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
           theKeys.push(dontEnums[k]);
         }
       }
     }
     return theKeys;
   };
 }
 module.exports = keysShim;
 
 
 /***/ }),
 
 /***/ "./node_modules/object-keys/index.js":
 /*!*******************************************!*\
   !*** ./node_modules/object-keys/index.js ***!
   \*******************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var slice = Array.prototype.slice;
 var isArgs = __webpack_require__(/*! ./isArguments */ "./node_modules/object-keys/isArguments.js");
 
 var origKeys = Object.keys;
 var keysShim = origKeys ? function keys(o) { return origKeys(o); } : __webpack_require__(/*! ./implementation */ "./node_modules/object-keys/implementation.js");
 
 var originalKeys = Object.keys;
 
 keysShim.shim = function shimObjectKeys() {
   if (Object.keys) {
     var keysWorksWithArguments = (function () {
       // Safari 5.0 bug
       var args = Object.keys(arguments);
       return args && args.length === arguments.length;
     }(1, 2));
     if (!keysWorksWithArguments) {
       Object.keys = function keys(object) { // eslint-disable-line func-name-matching
         if (isArgs(object)) {
           return originalKeys(slice.call(object));
         }
         return originalKeys(object);
       };
     }
   } else {
     Object.keys = keysShim;
   }
   return Object.keys || keysShim;
 };
 
 module.exports = keysShim;
 
 
 /***/ }),
 
 /***/ "./node_modules/object-keys/isArguments.js":
 /*!*************************************************!*\
   !*** ./node_modules/object-keys/isArguments.js ***!
   \*************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var toStr = Object.prototype.toString;
 
 module.exports = function isArguments(value) {
   var str = toStr.call(value);
   var isArgs = str === '[object Arguments]';
   if (!isArgs) {
     isArgs = str !== '[object Array]' &&
       value !== null &&
       typeof value === 'object' &&
       typeof value.length === 'number' &&
       value.length >= 0 &&
       toStr.call(value.callee) === '[object Function]';
   }
   return isArgs;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/attributor/attributor.ts":
 /*!*************************************************************!*\
   !*** ./node_modules/parchment/src/attributor/attributor.ts ***!
   \*************************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Attributor; });
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 
 class Attributor {
     constructor(attrName, keyName, options = {}) {
         this.attrName = attrName;
         this.keyName = keyName;
         const attributeBit = _scope__WEBPACK_IMPORTED_MODULE_0__["default"].TYPE & _scope__WEBPACK_IMPORTED_MODULE_0__["default"].ATTRIBUTE;
         this.scope =
             options.scope != null
                 ? // Ignore type bits, force attribute bit
                     (options.scope & _scope__WEBPACK_IMPORTED_MODULE_0__["default"].LEVEL) | attributeBit
                 : _scope__WEBPACK_IMPORTED_MODULE_0__["default"].ATTRIBUTE;
         if (options.whitelist != null) {
             this.whitelist = options.whitelist;
         }
     }
     static keys(node) {
         return Array.from(node.attributes).map((item) => item.name);
     }
     add(node, value) {
         if (!this.canAdd(node, value)) {
             return false;
         }
         node.setAttribute(this.keyName, value);
         return true;
     }
     canAdd(_node, value) {
         if (this.whitelist == null) {
             return true;
         }
         if (typeof value === 'string') {
             return this.whitelist.indexOf(value.replace(/["']/g, '')) > -1;
         }
         else {
             return this.whitelist.indexOf(value) > -1;
         }
     }
     remove(node) {
         node.removeAttribute(this.keyName);
     }
     value(node) {
         const value = node.getAttribute(this.keyName);
         if (this.canAdd(node, value) && value) {
             return value;
         }
         return '';
     }
 }
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/attributor/class.ts":
 /*!********************************************************!*\
   !*** ./node_modules/parchment/src/attributor/class.ts ***!
   \********************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _attributor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 
 function match(node, prefix) {
     const className = node.getAttribute('class') || '';
     return className
         .split(/\s+/)
         .filter(name => name.indexOf(`${prefix}-`) === 0);
 }
 class ClassAttributor extends _attributor__WEBPACK_IMPORTED_MODULE_0__["default"] {
     static keys(node) {
         return (node.getAttribute('class') || '').split(/\s+/).map(name => name
             .split('-')
             .slice(0, -1)
             .join('-'));
     }
     add(node, value) {
         if (!this.canAdd(node, value)) {
             return false;
         }
         this.remove(node);
         node.classList.add(`${this.keyName}-${value}`);
         return true;
     }
     remove(node) {
         const matches = match(node, this.keyName);
         matches.forEach(name => {
             node.classList.remove(name);
         });
         if (node.classList.length === 0) {
             node.removeAttribute('class');
         }
     }
     value(node) {
         const result = match(node, this.keyName)[0] || '';
         const value = result.slice(this.keyName.length + 1); // +1 for hyphen
         return this.canAdd(node, value) ? value : '';
     }
 }
 /* harmony default export */ __webpack_exports__["default"] = (ClassAttributor);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/attributor/store.ts":
 /*!********************************************************!*\
   !*** ./node_modules/parchment/src/attributor/store.ts ***!
   \********************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./node_modules/parchment/src/registry.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _attributor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 /* harmony import */ var _class__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./class */ "./node_modules/parchment/src/attributor/class.ts");
 /* harmony import */ var _style__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./style */ "./node_modules/parchment/src/attributor/style.ts");
 
 
 
 
 
 class AttributorStore {
     constructor(domNode) {
         this.attributes = {};
         this.domNode = domNode;
         this.build();
     }
     attribute(attribute, value) {
         // verb
         if (value) {
             if (attribute.add(this.domNode, value)) {
                 if (attribute.value(this.domNode) != null) {
                     this.attributes[attribute.attrName] = attribute;
                 }
                 else {
                     delete this.attributes[attribute.attrName];
                 }
             }
         }
         else {
             attribute.remove(this.domNode);
             delete this.attributes[attribute.attrName];
         }
     }
     build() {
         this.attributes = {};
         const blot = _registry__WEBPACK_IMPORTED_MODULE_0__["default"].find(this.domNode);
         if (blot == null) {
             return;
         }
         const attributes = _attributor__WEBPACK_IMPORTED_MODULE_2__["default"].keys(this.domNode);
         const classes = _class__WEBPACK_IMPORTED_MODULE_3__["default"].keys(this.domNode);
         const styles = _style__WEBPACK_IMPORTED_MODULE_4__["default"].keys(this.domNode);
         attributes
             .concat(classes)
             .concat(styles)
             .forEach(name => {
             const attr = blot.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_1__["default"].ATTRIBUTE);
             if (attr instanceof _attributor__WEBPACK_IMPORTED_MODULE_2__["default"]) {
                 this.attributes[attr.attrName] = attr;
             }
         });
     }
     copy(target) {
         Object.keys(this.attributes).forEach(key => {
             const value = this.attributes[key].value(this.domNode);
             target.format(key, value);
         });
     }
     move(target) {
         this.copy(target);
         Object.keys(this.attributes).forEach(key => {
             this.attributes[key].remove(this.domNode);
         });
         this.attributes = {};
     }
     values() {
         return Object.keys(this.attributes).reduce((attributes, name) => {
             attributes[name] = this.attributes[name].value(this.domNode);
             return attributes;
         }, {});
     }
 }
 /* harmony default export */ __webpack_exports__["default"] = (AttributorStore);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/attributor/style.ts":
 /*!********************************************************!*\
   !*** ./node_modules/parchment/src/attributor/style.ts ***!
   \********************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _attributor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 
 function camelize(name) {
     const parts = name.split('-');
     const rest = parts
         .slice(1)
         .map((part) => part[0].toUpperCase() + part.slice(1))
         .join('');
     return parts[0] + rest;
 }
 class StyleAttributor extends _attributor__WEBPACK_IMPORTED_MODULE_0__["default"] {
     static keys(node) {
         return (node.getAttribute('style') || '').split(';').map(value => {
             const arr = value.split(':');
             return arr[0].trim();
         });
     }
     add(node, value) {
         if (!this.canAdd(node, value)) {
             return false;
         }
         // @ts-ignore
         node.style[camelize(this.keyName)] = value;
         return true;
     }
     remove(node) {
         // @ts-ignore
         node.style[camelize(this.keyName)] = '';
         if (!node.getAttribute('style')) {
             node.removeAttribute('style');
         }
     }
     value(node) {
         // @ts-ignore
         const value = node.style[camelize(this.keyName)];
         return this.canAdd(node, value) ? value : '';
     }
 }
 /* harmony default export */ __webpack_exports__["default"] = (StyleAttributor);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/abstract/container.ts":
 /*!***************************************************************!*\
   !*** ./node_modules/parchment/src/blot/abstract/container.ts ***!
   \***************************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _parent__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
 
 
 class ContainerBlot extends _parent__WEBPACK_IMPORTED_MODULE_1__["default"] {
     checkMerge() {
         return (this.next !== null && this.next.statics.blotName === this.statics.blotName);
     }
     deleteAt(index, length) {
         super.deleteAt(index, length);
         this.enforceAllowedChildren();
     }
     formatAt(index, length, name, value) {
         super.formatAt(index, length, name, value);
         this.enforceAllowedChildren();
     }
     insertAt(index, value, def) {
         super.insertAt(index, value, def);
         this.enforceAllowedChildren();
     }
     optimize(context) {
         super.optimize(context);
         if (this.children.length > 0 && this.next != null && this.checkMerge()) {
             this.next.moveChildren(this);
             this.next.remove();
         }
     }
 }
 ContainerBlot.blotName = 'container';
 ContainerBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_0__["default"].BLOCK_BLOT;
 /* harmony default export */ __webpack_exports__["default"] = (ContainerBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/abstract/leaf.ts":
 /*!**********************************************************!*\
   !*** ./node_modules/parchment/src/blot/abstract/leaf.ts ***!
   \**********************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _shadow__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shadow */ "./node_modules/parchment/src/blot/abstract/shadow.ts");
 
 
 class LeafBlot extends _shadow__WEBPACK_IMPORTED_MODULE_1__["default"] {
     static value(_domNode) {
         return true;
     }
     index(node, offset) {
         if (this.domNode === node ||
             this.domNode.compareDocumentPosition(node) &
                 Node.DOCUMENT_POSITION_CONTAINED_BY) {
             return Math.min(offset, 1);
         }
         return -1;
     }
     position(index, _inclusive) {
         const childNodes = Array.from(this.parent.domNode.childNodes);
         let offset = childNodes.indexOf(this.domNode);
         if (index > 0) {
             offset += 1;
         }
         return [this.parent.domNode, offset];
     }
     value() {
         return {
             [this.statics.blotName]: this.statics.value(this.domNode) || true,
         };
     }
 }
 LeafBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_0__["default"].INLINE_BLOT;
 /* harmony default export */ __webpack_exports__["default"] = (LeafBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/abstract/parent.ts":
 /*!************************************************************!*\
   !*** ./node_modules/parchment/src/blot/abstract/parent.ts ***!
   \************************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _collection_linked_list__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../collection/linked-list */ "./node_modules/parchment/src/collection/linked-list.ts");
 /* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../error */ "./node_modules/parchment/src/error.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _shadow__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./shadow */ "./node_modules/parchment/src/blot/abstract/shadow.ts");
 
 
 
 
 class ParentBlot extends _shadow__WEBPACK_IMPORTED_MODULE_3__["default"] {
     constructor(scroll, domNode) {
         super(scroll, domNode);
         this.uiNode = null;
         this.build();
     }
     appendChild(other) {
         this.insertBefore(other);
     }
     attach() {
         super.attach();
         this.children.forEach(child => {
             child.attach();
         });
     }
     attachUI(node) {
         if (this.uiNode != null) {
             this.uiNode.remove();
         }
         this.uiNode = node;
         if (ParentBlot.uiClass) {
             this.uiNode.classList.add(ParentBlot.uiClass);
         }
         this.uiNode.setAttribute('contenteditable', 'false');
         this.domNode.insertBefore(this.uiNode, this.domNode.firstChild);
     }
     build() {
         this.children = new _collection_linked_list__WEBPACK_IMPORTED_MODULE_0__["default"]();
         // Need to be reversed for if DOM nodes already in order
         Array.from(this.domNode.childNodes)
             .filter((node) => node !== this.uiNode)
             .reverse()
             .forEach((node) => {
             try {
                 const child = makeAttachedBlot(node, this.scroll);
                 this.insertBefore(child, this.children.head || undefined);
             }
             catch (err) {
                 if (err instanceof _error__WEBPACK_IMPORTED_MODULE_1__["default"]) {
                     return;
                 }
                 else {
                     throw err;
                 }
             }
         });
     }
     deleteAt(index, length) {
         if (index === 0 && length === this.length()) {
             return this.remove();
         }
         this.children.forEachAt(index, length, (child, offset, childLength) => {
             child.deleteAt(offset, childLength);
         });
     }
     descendant(criteria, index = 0) {
         const [child, offset] = this.children.find(index);
         if ((criteria.blotName == null && criteria(child)) ||
             (criteria.blotName != null && child instanceof criteria)) {
             return [child, offset];
         }
         else if (child instanceof ParentBlot) {
             return child.descendant(criteria, offset);
         }
         else {
             return [null, -1];
         }
     }
     descendants(criteria, index = 0, length = Number.MAX_VALUE) {
         let descendants = [];
         let lengthLeft = length;
         this.children.forEachAt(index, length, (child, childIndex, childLength) => {
             if ((criteria.blotName == null && criteria(child)) ||
                 (criteria.blotName != null && child instanceof criteria)) {
                 descendants.push(child);
             }
             if (child instanceof ParentBlot) {
                 descendants = descendants.concat(child.descendants(criteria, childIndex, lengthLeft));
             }
             lengthLeft -= childLength;
         });
         return descendants;
     }
     detach() {
         this.children.forEach(child => {
             child.detach();
         });
         super.detach();
     }
     enforceAllowedChildren() {
         let done = false;
         this.children.forEach((child) => {
             if (done) {
                 return;
             }
             const allowed = this.statics.allowedChildren.some((def) => child instanceof def);
             if (allowed) {
                 return;
             }
             if (child.statics.scope === _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK_BLOT) {
                 if (child.next != null) {
                     this.splitAfter(child);
                 }
                 if (child.prev != null) {
                     this.splitAfter(child.prev);
                 }
                 child.parent.unwrap();
                 done = true;
             }
             else if (child instanceof ParentBlot) {
                 child.unwrap();
             }
             else {
                 child.remove();
             }
         });
     }
     formatAt(index, length, name, value) {
         this.children.forEachAt(index, length, (child, offset, childLength) => {
             child.formatAt(offset, childLength, name, value);
         });
     }
     insertAt(index, value, def) {
         const [child, offset] = this.children.find(index);
         if (child) {
             child.insertAt(offset, value, def);
         }
         else {
             const blot = def == null
                 ? this.scroll.create('text', value)
                 : this.scroll.create(value, def);
             this.appendChild(blot);
         }
     }
     insertBefore(childBlot, refBlot) {
         if (childBlot.parent != null) {
             childBlot.parent.children.remove(childBlot);
         }
         let refDomNode = null;
         this.children.insertBefore(childBlot, refBlot || null);
         if (refBlot != null) {
             refDomNode = refBlot.domNode;
         }
         if (this.domNode.parentNode !== childBlot.domNode ||
             this.domNode.nextSibling !== refDomNode) {
             this.domNode.insertBefore(childBlot.domNode, refDomNode);
         }
         childBlot.parent = this;
         childBlot.attach();
     }
     length() {
         return this.children.reduce((memo, child) => {
             return memo + child.length();
         }, 0);
     }
     moveChildren(targetParent, refNode) {
         this.children.forEach(child => {
             targetParent.insertBefore(child, refNode);
         });
     }
     optimize(context) {
         super.optimize(context);
         this.enforceAllowedChildren();
         if (this.uiNode != null && this.uiNode !== this.domNode.firstChild) {
             this.domNode.insertBefore(this.uiNode, this.domNode.firstChild);
         }
         if (this.children.length === 0) {
             if (this.statics.defaultChild != null) {
                 const child = this.scroll.create(this.statics.defaultChild.blotName);
                 this.appendChild(child);
                 // TODO double check if necessary
                 // child.optimize(context);
             }
             else {
                 this.remove();
             }
         }
     }
     path(index, inclusive = false) {
         const [child, offset] = this.children.find(index, inclusive);
         const position = [[this, index]];
         if (child instanceof ParentBlot) {
             return position.concat(child.path(offset, inclusive));
         }
         else if (child != null) {
             position.push([child, offset]);
         }
         return position;
     }
     removeChild(child) {
         this.children.remove(child);
     }
     replaceWith(name, value) {
         const replacement = typeof name === 'string' ? this.scroll.create(name, value) : name;
         if (replacement instanceof ParentBlot) {
             this.moveChildren(replacement);
         }
         return super.replaceWith(replacement);
     }
     split(index, force = false) {
         if (!force) {
             if (index === 0) {
                 return this;
             }
             if (index === this.length()) {
                 return this.next;
             }
         }
         const after = this.clone();
         if (this.parent) {
             this.parent.insertBefore(after, this.next || undefined);
         }
         this.children.forEachAt(index, this.length(), (child, offset, _length) => {
             const split = child.split(offset, force);
             if (split != null) {
                 after.appendChild(split);
             }
         });
         return after;
     }
     splitAfter(child) {
         const after = this.clone();
         while (child.next != null) {
             after.appendChild(child.next);
         }
         if (this.parent) {
             this.parent.insertBefore(after, this.next || undefined);
         }
         return after;
     }
     unwrap() {
         if (this.parent) {
             this.moveChildren(this.parent, this.next || undefined);
         }
         this.remove();
     }
     update(mutations, _context) {
         const addedNodes = [];
         const removedNodes = [];
         mutations.forEach(mutation => {
             if (mutation.target === this.domNode && mutation.type === 'childList') {
                 addedNodes.push.apply(addedNodes, mutation.addedNodes);
                 removedNodes.push.apply(removedNodes, mutation.removedNodes);
             }
         });
         removedNodes.forEach((node) => {
             // Check node has actually been removed
             // One exception is Chrome does not immediately remove IFRAMEs
             // from DOM but MutationRecord is correct in its reported removal
             if (node.parentNode != null &&
                 // @ts-ignore
                 node.tagName !== 'IFRAME' &&
                 document.body.compareDocumentPosition(node) &
                     Node.DOCUMENT_POSITION_CONTAINED_BY) {
                 return;
             }
             const blot = this.scroll.find(node);
             if (blot == null) {
                 return;
             }
             if (blot.domNode.parentNode == null ||
                 blot.domNode.parentNode === this.domNode) {
                 blot.detach();
             }
         });
         addedNodes
             .filter(node => {
             return node.parentNode === this.domNode || node === this.uiNode;
         })
             .sort((a, b) => {
             if (a === b) {
                 return 0;
             }
             if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
                 return 1;
             }
             return -1;
         })
             .forEach(node => {
             let refBlot = null;
             if (node.nextSibling != null) {
                 refBlot = this.scroll.find(node.nextSibling);
             }
             const blot = makeAttachedBlot(node, this.scroll);
             if (blot.next !== refBlot || blot.next == null) {
                 if (blot.parent != null) {
                     blot.parent.removeChild(this);
                 }
                 this.insertBefore(blot, refBlot || undefined);
             }
         });
         this.enforceAllowedChildren();
     }
 }
 ParentBlot.uiClass = '';
 function makeAttachedBlot(node, scroll) {
     let blot = scroll.find(node);
     if (blot == null) {
         try {
             blot = scroll.create(node);
         }
         catch (e) {
             blot = scroll.create(_scope__WEBPACK_IMPORTED_MODULE_2__["default"].INLINE);
             Array.from(node.childNodes).forEach((child) => {
                 // @ts-ignore
                 blot.domNode.appendChild(child);
             });
             if (node.parentNode) {
                 node.parentNode.replaceChild(blot.domNode, node);
             }
             blot.attach();
         }
     }
     return blot;
 }
 /* harmony default export */ __webpack_exports__["default"] = (ParentBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/abstract/shadow.ts":
 /*!************************************************************!*\
   !*** ./node_modules/parchment/src/blot/abstract/shadow.ts ***!
   \************************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../error */ "./node_modules/parchment/src/error.ts");
 /* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../registry */ "./node_modules/parchment/src/registry.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../scope */ "./node_modules/parchment/src/scope.ts");
 
 
 
 class ShadowBlot {
     constructor(scroll, domNode) {
         this.scroll = scroll;
         this.domNode = domNode;
         _registry__WEBPACK_IMPORTED_MODULE_1__["default"].blots.set(domNode, this);
         this.prev = null;
         this.next = null;
     }
     static create(value) {
         if (this.tagName == null) {
             throw new _error__WEBPACK_IMPORTED_MODULE_0__["default"]('Blot definition missing tagName');
         }
         let node;
         if (Array.isArray(this.tagName)) {
             if (typeof value === 'string') {
                 value = value.toUpperCase();
                 if (parseInt(value, 10).toString() === value) {
                     value = parseInt(value, 10);
                 }
             }
             if (typeof value === 'number') {
                 node = document.createElement(this.tagName[value - 1]);
             }
             else if (this.tagName.indexOf(value) > -1) {
                 node = document.createElement(value);
             }
             else {
                 node = document.createElement(this.tagName[0]);
             }
         }
         else {
             node = document.createElement(this.tagName);
         }
         if (this.className) {
             node.classList.add(this.className);
         }
         return node;
     }
     // Hack for accessing inherited static methods
     get statics() {
         return this.constructor;
     }
     attach() {
         // Nothing to do
     }
     clone() {
         const domNode = this.domNode.cloneNode(false);
         return this.scroll.create(domNode);
     }
     detach() {
         if (this.parent != null) {
             this.parent.removeChild(this);
         }
         _registry__WEBPACK_IMPORTED_MODULE_1__["default"].blots.delete(this.domNode);
     }
     deleteAt(index, length) {
         const blot = this.isolate(index, length);
         blot.remove();
     }
     formatAt(index, length, name, value) {
         const blot = this.isolate(index, length);
         if (this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOT) != null && value) {
             blot.wrap(name, value);
         }
         else if (this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].ATTRIBUTE) != null) {
             const parent = this.scroll.create(this.statics.scope);
             blot.wrap(parent);
             parent.format(name, value);
         }
     }
     insertAt(index, value, def) {
         const blot = def == null
             ? this.scroll.create('text', value)
             : this.scroll.create(value, def);
         const ref = this.split(index);
         this.parent.insertBefore(blot, ref || undefined);
     }
     isolate(index, length) {
         const target = this.split(index);
         if (target == null) {
             throw new Error('Attempt to isolate at end');
         }
         target.split(length);
         return target;
     }
     length() {
         return 1;
     }
     offset(root = this.parent) {
         if (this.parent == null || this === root) {
             return 0;
         }
         return this.parent.children.offset(this) + this.parent.offset(root);
     }
     optimize(_context) {
         if (this.statics.requiredContainer &&
             !(this.parent instanceof this.statics.requiredContainer)) {
             this.wrap(this.statics.requiredContainer.blotName);
         }
     }
     remove() {
         if (this.domNode.parentNode != null) {
             this.domNode.parentNode.removeChild(this.domNode);
         }
         this.detach();
     }
     replaceWith(name, value) {
         const replacement = typeof name === 'string' ? this.scroll.create(name, value) : name;
         if (this.parent != null) {
             this.parent.insertBefore(replacement, this.next || undefined);
             this.remove();
         }
         return replacement;
     }
     split(index, _force) {
         return index === 0 ? this : this.next;
     }
     update(_mutations, _context) {
         // Nothing to do by default
     }
     wrap(name, value) {
         const wrapper = typeof name === 'string'
             ? this.scroll.create(name, value)
             : name;
         if (this.parent != null) {
             this.parent.insertBefore(wrapper, this.next || undefined);
         }
         if (typeof wrapper.appendChild !== 'function') {
             throw new _error__WEBPACK_IMPORTED_MODULE_0__["default"](`Cannot wrap ${name}`);
         }
         wrapper.appendChild(this);
         return wrapper;
     }
 }
 ShadowBlot.blotName = 'abstract';
 /* harmony default export */ __webpack_exports__["default"] = (ShadowBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/block.ts":
 /*!**************************************************!*\
   !*** ./node_modules/parchment/src/blot/block.ts ***!
   \**************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../attributor/attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 /* harmony import */ var _attributor_store__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../attributor/store */ "./node_modules/parchment/src/attributor/store.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
 /* harmony import */ var _abstract_parent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./abstract/parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
 /* harmony import */ var _inline__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./inline */ "./node_modules/parchment/src/blot/inline.ts");
 
 
 
 
 
 
 class BlockBlot extends _abstract_parent__WEBPACK_IMPORTED_MODULE_4__["default"] {
     constructor(scroll, domNode) {
         super(scroll, domNode);
         this.attributes = new _attributor_store__WEBPACK_IMPORTED_MODULE_1__["default"](this.domNode);
     }
     static formats(domNode, scroll) {
         const match = scroll.query(BlockBlot.blotName);
         if (match != null &&
             domNode.tagName === match.tagName) {
             return undefined;
         }
         else if (typeof this.tagName === 'string') {
             return true;
         }
         else if (Array.isArray(this.tagName)) {
             return domNode.tagName.toLowerCase();
         }
     }
     format(name, value) {
         const format = this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK);
         if (format == null) {
             return;
         }
         else if (format instanceof _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__["default"]) {
             this.attributes.attribute(format, value);
         }
         else if (name === this.statics.blotName && !value) {
             this.replaceWith(BlockBlot.blotName);
         }
         else if (value &&
             (name !== this.statics.blotName || this.formats()[name] !== value)) {
             this.replaceWith(name, value);
         }
     }
     formats() {
         const formats = this.attributes.values();
         const format = this.statics.formats(this.domNode, this.scroll);
         if (format != null) {
             formats[this.statics.blotName] = format;
         }
         return formats;
     }
     formatAt(index, length, name, value) {
         if (this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK) != null) {
             this.format(name, value);
         }
         else {
             super.formatAt(index, length, name, value);
         }
     }
     insertAt(index, value, def) {
         if (def == null || this.scroll.query(value, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].INLINE) != null) {
             // Insert text or inline
             super.insertAt(index, value, def);
         }
         else {
             const after = this.split(index);
             if (after != null) {
                 const blot = this.scroll.create(value, def);
                 after.parent.insertBefore(blot, after);
             }
             else {
                 throw new Error('Attempt to insertAt after block boundaries');
             }
         }
     }
     replaceWith(name, value) {
         const replacement = super.replaceWith(name, value);
         this.attributes.copy(replacement);
         return replacement;
     }
     update(mutations, context) {
         super.update(mutations, context);
         const attributeChanged = mutations.some(mutation => mutation.target === this.domNode && mutation.type === 'attributes');
         if (attributeChanged) {
             this.attributes.build();
         }
     }
 }
 BlockBlot.blotName = 'block';
 BlockBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK_BLOT;
 BlockBlot.tagName = 'P';
 BlockBlot.allowedChildren = [
     _inline__WEBPACK_IMPORTED_MODULE_5__["default"],
     BlockBlot,
     _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__["default"],
 ];
 /* harmony default export */ __webpack_exports__["default"] = (BlockBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/embed.ts":
 /*!**************************************************!*\
   !*** ./node_modules/parchment/src/blot/embed.ts ***!
   \**************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _abstract_leaf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
 
 class EmbedBlot extends _abstract_leaf__WEBPACK_IMPORTED_MODULE_0__["default"] {
     static formats(_domNode, _scroll) {
         return undefined;
     }
     format(name, value) {
         // super.formatAt wraps, which is what we want in general,
         // but this allows subclasses to overwrite for formats
         // that just apply to particular embeds
         super.formatAt(0, this.length(), name, value);
     }
     formatAt(index, length, name, value) {
         if (index === 0 && length === this.length()) {
             this.format(name, value);
         }
         else {
             super.formatAt(index, length, name, value);
         }
     }
     formats() {
         return this.statics.formats(this.domNode, this.scroll);
     }
 }
 /* harmony default export */ __webpack_exports__["default"] = (EmbedBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/inline.ts":
 /*!***************************************************!*\
   !*** ./node_modules/parchment/src/blot/inline.ts ***!
   \***************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../attributor/attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 /* harmony import */ var _attributor_store__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../attributor/store */ "./node_modules/parchment/src/attributor/store.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
 /* harmony import */ var _abstract_parent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./abstract/parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
 
 
 
 
 
 // Shallow object comparison
 function isEqual(obj1, obj2) {
     if (Object.keys(obj1).length !== Object.keys(obj2).length) {
         return false;
     }
     // @ts-ignore
     for (const prop in obj1) {
         // @ts-ignore
         if (obj1[prop] !== obj2[prop]) {
             return false;
         }
     }
     return true;
 }
 class InlineBlot extends _abstract_parent__WEBPACK_IMPORTED_MODULE_4__["default"] {
     constructor(scroll, domNode) {
         super(scroll, domNode);
         this.attributes = new _attributor_store__WEBPACK_IMPORTED_MODULE_1__["default"](this.domNode);
     }
     static formats(domNode, scroll) {
         const match = scroll.query(InlineBlot.blotName);
         if (match != null &&
             domNode.tagName === match.tagName) {
             return undefined;
         }
         else if (typeof this.tagName === 'string') {
             return true;
         }
         else if (Array.isArray(this.tagName)) {
             return domNode.tagName.toLowerCase();
         }
         return undefined;
     }
     format(name, value) {
         if (name === this.statics.blotName && !value) {
             this.children.forEach(child => {
                 if (!(child instanceof InlineBlot)) {
                     child = child.wrap(InlineBlot.blotName, true);
                 }
                 this.attributes.copy(child);
             });
             this.unwrap();
         }
         else {
             const format = this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].INLINE);
             if (format == null) {
                 return;
             }
             if (format instanceof _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__["default"]) {
                 this.attributes.attribute(format, value);
             }
             else if (value &&
                 (name !== this.statics.blotName || this.formats()[name] !== value)) {
                 this.replaceWith(name, value);
             }
         }
     }
     formats() {
         const formats = this.attributes.values();
         const format = this.statics.formats(this.domNode, this.scroll);
         if (format != null) {
             formats[this.statics.blotName] = format;
         }
         return formats;
     }
     formatAt(index, length, name, value) {
         if (this.formats()[name] != null ||
             this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].ATTRIBUTE)) {
             const blot = this.isolate(index, length);
             blot.format(name, value);
         }
         else {
             super.formatAt(index, length, name, value);
         }
     }
     optimize(context) {
         super.optimize(context);
         const formats = this.formats();
         if (Object.keys(formats).length === 0) {
             return this.unwrap(); // unformatted span
         }
         const next = this.next;
         if (next instanceof InlineBlot &&
             next.prev === this &&
             isEqual(formats, next.formats())) {
             next.moveChildren(this);
             next.remove();
         }
     }
     replaceWith(name, value) {
         const replacement = super.replaceWith(name, value);
         this.attributes.copy(replacement);
         return replacement;
     }
     update(mutations, context) {
         super.update(mutations, context);
         const attributeChanged = mutations.some(mutation => mutation.target === this.domNode && mutation.type === 'attributes');
         if (attributeChanged) {
             this.attributes.build();
         }
     }
     wrap(name, value) {
         const wrapper = super.wrap(name, value);
         if (wrapper instanceof InlineBlot) {
             this.attributes.move(wrapper);
         }
         return wrapper;
     }
 }
 InlineBlot.allowedChildren = [InlineBlot, _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__["default"]];
 InlineBlot.blotName = 'inline';
 InlineBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_2__["default"].INLINE_BLOT;
 InlineBlot.tagName = 'SPAN';
 /* harmony default export */ __webpack_exports__["default"] = (InlineBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/scroll.ts":
 /*!***************************************************!*\
   !*** ./node_modules/parchment/src/blot/scroll.ts ***!
   \***************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./node_modules/parchment/src/registry.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _abstract_container__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./abstract/container */ "./node_modules/parchment/src/blot/abstract/container.ts");
 /* harmony import */ var _abstract_parent__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./abstract/parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
 /* harmony import */ var _block__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./block */ "./node_modules/parchment/src/blot/block.ts");
 
 
 
 
 
 const OBSERVER_CONFIG = {
     attributes: true,
     characterData: true,
     characterDataOldValue: true,
     childList: true,
     subtree: true,
 };
 const MAX_OPTIMIZE_ITERATIONS = 100;
 class ScrollBlot extends _abstract_parent__WEBPACK_IMPORTED_MODULE_3__["default"] {
     constructor(registry, node) {
         // @ts-ignore
         super(null, node);
         this.registry = registry;
         this.scroll = this;
         this.build();
         this.observer = new MutationObserver((mutations) => {
             this.update(mutations);
         });
         this.observer.observe(this.domNode, OBSERVER_CONFIG);
         this.attach();
     }
     create(input, value) {
         return this.registry.create(this, input, value);
     }
     find(node, bubble = false) {
         return this.registry.find(node, bubble);
     }
     query(query, scope = _scope__WEBPACK_IMPORTED_MODULE_1__["default"].ANY) {
         return this.registry.query(query, scope);
     }
     register(...definitions) {
         return this.registry.register(...definitions);
     }
     build() {
         if (this.scroll == null) {
             return;
         }
         super.build();
     }
     detach() {
         super.detach();
         this.observer.disconnect();
     }
     deleteAt(index, length) {
         this.update();
         if (index === 0 && length === this.length()) {
             this.children.forEach(child => {
                 child.remove();
             });
         }
         else {
             super.deleteAt(index, length);
         }
     }
     formatAt(index, length, name, value) {
         this.update();
         super.formatAt(index, length, name, value);
     }
     insertAt(index, value, def) {
         this.update();
         super.insertAt(index, value, def);
     }
     optimize(mutations = [], context = {}) {
         super.optimize(context);
         const mutationsMap = context.mutationsMap || new WeakMap();
         // We must modify mutations directly, cannot make copy and then modify
         let records = Array.from(this.observer.takeRecords());
         // Array.push currently seems to be implemented by a non-tail recursive function
         // so we cannot just mutations.push.apply(mutations, this.observer.takeRecords());
         while (records.length > 0) {
             mutations.push(records.pop());
         }
         const mark = (blot, markParent = true) => {
             if (blot == null || blot === this) {
                 return;
             }
             if (blot.domNode.parentNode == null) {
                 return;
             }
             if (!mutationsMap.has(blot.domNode)) {
                 mutationsMap.set(blot.domNode, []);
             }
             if (markParent) {
                 mark(blot.parent);
             }
         };
         const optimize = (blot) => {
             // Post-order traversal
             if (!mutationsMap.has(blot.domNode)) {
                 return;
             }
             if (blot instanceof _abstract_parent__WEBPACK_IMPORTED_MODULE_3__["default"]) {
                 blot.children.forEach(optimize);
             }
             mutationsMap.delete(blot.domNode);
             blot.optimize(context);
         };
         let remaining = mutations;
         for (let i = 0; remaining.length > 0; i += 1) {
             if (i >= MAX_OPTIMIZE_ITERATIONS) {
                 throw new Error('[Parchment] Maximum optimize iterations reached');
             }
             remaining.forEach((mutation) => {
                 const blot = this.find(mutation.target, true);
                 if (blot == null) {
                     return;
                 }
                 if (blot.domNode === mutation.target) {
                     if (mutation.type === 'childList') {
                         mark(this.find(mutation.previousSibling, false));
                         Array.from(mutation.addedNodes).forEach((node) => {
                             const child = this.find(node, false);
                             mark(child, false);
                             if (child instanceof _abstract_parent__WEBPACK_IMPORTED_MODULE_3__["default"]) {
                                 child.children.forEach((grandChild) => {
                                     mark(grandChild, false);
                                 });
                             }
                         });
                     }
                     else if (mutation.type === 'attributes') {
                         mark(blot.prev);
                     }
                 }
                 mark(blot);
             });
             this.children.forEach(optimize);
             remaining = Array.from(this.observer.takeRecords());
             records = remaining.slice();
             while (records.length > 0) {
                 mutations.push(records.pop());
             }
         }
     }
     update(mutations, context = {}) {
         mutations = mutations || this.observer.takeRecords();
         const mutationsMap = new WeakMap();
         mutations
             .map((mutation) => {
             const blot = _registry__WEBPACK_IMPORTED_MODULE_0__["default"].find(mutation.target, true);
             if (blot == null) {
                 return null;
             }
             if (mutationsMap.has(blot.domNode)) {
                 mutationsMap.get(blot.domNode).push(mutation);
                 return null;
             }
             else {
                 mutationsMap.set(blot.domNode, [mutation]);
                 return blot;
             }
         })
             .forEach((blot) => {
             if (blot != null && blot !== this && mutationsMap.has(blot.domNode)) {
                 blot.update(mutationsMap.get(blot.domNode) || [], context);
             }
         });
         context.mutationsMap = mutationsMap;
         if (mutationsMap.has(this.domNode)) {
             super.update(mutationsMap.get(this.domNode), context);
         }
         this.optimize(mutations, context);
     }
 }
 ScrollBlot.blotName = 'scroll';
 ScrollBlot.defaultChild = _block__WEBPACK_IMPORTED_MODULE_4__["default"];
 ScrollBlot.allowedChildren = [_block__WEBPACK_IMPORTED_MODULE_4__["default"], _abstract_container__WEBPACK_IMPORTED_MODULE_2__["default"]];
 ScrollBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_1__["default"].BLOCK_BLOT;
 ScrollBlot.tagName = 'DIV';
 /* harmony default export */ __webpack_exports__["default"] = (ScrollBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/blot/text.ts":
 /*!*************************************************!*\
   !*** ./node_modules/parchment/src/blot/text.ts ***!
   \*************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony import */ var _abstract_leaf__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
 
 
 class TextBlot extends _abstract_leaf__WEBPACK_IMPORTED_MODULE_1__["default"] {
     constructor(scroll, node) {
         super(scroll, node);
         this.text = this.statics.value(this.domNode);
     }
     static create(value) {
         return document.createTextNode(value);
     }
     static value(domNode) {
         return domNode.data;
     }
     deleteAt(index, length) {
         this.domNode.data = this.text =
             this.text.slice(0, index) + this.text.slice(index + length);
     }
     index(node, offset) {
         if (this.domNode === node) {
             return offset;
         }
         return -1;
     }
     insertAt(index, value, def) {
         if (def == null) {
             this.text = this.text.slice(0, index) + value + this.text.slice(index);
             this.domNode.data = this.text;
         }
         else {
             super.insertAt(index, value, def);
         }
     }
     length() {
         return this.text.length;
     }
     optimize(context) {
         super.optimize(context);
         this.text = this.statics.value(this.domNode);
         if (this.text.length === 0) {
             this.remove();
         }
         else if (this.next instanceof TextBlot && this.next.prev === this) {
             this.insertAt(this.length(), this.next.value());
             this.next.remove();
         }
     }
     position(index, _inclusive = false) {
         return [this.domNode, index];
     }
     split(index, force = false) {
         if (!force) {
             if (index === 0) {
                 return this;
             }
             if (index === this.length()) {
                 return this.next;
             }
         }
         const after = this.scroll.create(this.domNode.splitText(index));
         this.parent.insertBefore(after, this.next || undefined);
         this.text = this.statics.value(this.domNode);
         return after;
     }
     update(mutations, _context) {
         if (mutations.some(mutation => {
             return (mutation.type === 'characterData' && mutation.target === this.domNode);
         })) {
             this.text = this.statics.value(this.domNode);
         }
     }
     value() {
         return this.text;
     }
 }
 TextBlot.blotName = 'text';
 TextBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_0__["default"].INLINE_BLOT;
 /* harmony default export */ __webpack_exports__["default"] = (TextBlot);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/collection/linked-list.ts":
 /*!**************************************************************!*\
   !*** ./node_modules/parchment/src/collection/linked-list.ts ***!
   \**************************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 class LinkedList {
     constructor() {
         this.head = null;
         this.tail = null;
         this.length = 0;
     }
     append(...nodes) {
         this.insertBefore(nodes[0], null);
         if (nodes.length > 1) {
             this.append.apply(this, nodes.slice(1));
         }
     }
     at(index) {
         const next = this.iterator();
         let cur = next();
         while (cur && index > 0) {
             index -= 1;
             cur = next();
         }
         return cur;
     }
     contains(node) {
         const next = this.iterator();
         let cur = next();
         while (cur) {
             if (cur === node) {
                 return true;
             }
             cur = next();
         }
         return false;
     }
     indexOf(node) {
         const next = this.iterator();
         let cur = next();
         let index = 0;
         while (cur) {
             if (cur === node) {
                 return index;
             }
             index += 1;
             cur = next();
         }
         return -1;
     }
     insertBefore(node, refNode) {
         if (node == null) {
             return;
         }
         this.remove(node);
         node.next = refNode;
         if (refNode != null) {
             node.prev = refNode.prev;
             if (refNode.prev != null) {
                 refNode.prev.next = node;
             }
             refNode.prev = node;
             if (refNode === this.head) {
                 this.head = node;
             }
         }
         else if (this.tail != null) {
             this.tail.next = node;
             node.prev = this.tail;
             this.tail = node;
         }
         else {
             node.prev = null;
             this.head = this.tail = node;
         }
         this.length += 1;
     }
     offset(target) {
         let index = 0;
         let cur = this.head;
         while (cur != null) {
             if (cur === target) {
                 return index;
             }
             index += cur.length();
             cur = cur.next;
         }
         return -1;
     }
     remove(node) {
         if (!this.contains(node)) {
             return;
         }
         if (node.prev != null) {
             node.prev.next = node.next;
         }
         if (node.next != null) {
             node.next.prev = node.prev;
         }
         if (node === this.head) {
             this.head = node.next;
         }
         if (node === this.tail) {
             this.tail = node.prev;
         }
         this.length -= 1;
     }
     iterator(curNode = this.head) {
         // TODO use yield when we can
         return () => {
             const ret = curNode;
             if (curNode != null) {
                 curNode = curNode.next;
             }
             return ret;
         };
     }
     find(index, inclusive = false) {
         const next = this.iterator();
         let cur = next();
         while (cur) {
             const length = cur.length();
             if (index < length ||
                 (inclusive &&
                     index === length &&
                     (cur.next == null || cur.next.length() !== 0))) {
                 return [cur, index];
             }
             index -= length;
             cur = next();
         }
         return [null, 0];
     }
     forEach(callback) {
         const next = this.iterator();
         let cur = next();
         while (cur) {
             callback(cur);
             cur = next();
         }
     }
     forEachAt(index, length, callback) {
         if (length <= 0) {
             return;
         }
         const [startNode, offset] = this.find(index);
         let curIndex = index - offset;
         const next = this.iterator(startNode);
         let cur = next();
         while (cur && curIndex < index + length) {
             const curLength = cur.length();
             if (index > curIndex) {
                 callback(cur, index - curIndex, Math.min(length, curIndex + curLength - index));
             }
             else {
                 callback(cur, 0, Math.min(curLength, index + length - curIndex));
             }
             curIndex += curLength;
             cur = next();
         }
     }
     map(callback) {
         return this.reduce((memo, cur) => {
             memo.push(callback(cur));
             return memo;
         }, []);
     }
     reduce(callback, memo) {
         const next = this.iterator();
         let cur = next();
         while (cur) {
             memo = callback(memo, cur);
             cur = next();
         }
         return memo;
     }
 }
 /* harmony default export */ __webpack_exports__["default"] = (LinkedList);
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/error.ts":
 /*!*********************************************!*\
   !*** ./node_modules/parchment/src/error.ts ***!
   \*********************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ParchmentError; });
 class ParchmentError extends Error {
     constructor(message) {
         message = '[Parchment] ' + message;
         super(message);
         this.message = message;
         this.name = this.constructor.name;
     }
 }
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/parchment.ts":
 /*!*************************************************!*\
   !*** ./node_modules/parchment/src/parchment.ts ***!
   \*************************************************/
 /*! exports provided: ParentBlot, ContainerBlot, LeafBlot, EmbedBlot, ScrollBlot, BlockBlot, InlineBlot, TextBlot, Attributor, ClassAttributor, StyleAttributor, AttributorStore, Registry, Scope */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _blot_abstract_container__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./blot/abstract/container */ "./node_modules/parchment/src/blot/abstract/container.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ContainerBlot", function() { return _blot_abstract_container__WEBPACK_IMPORTED_MODULE_0__["default"]; });
 
 /* harmony import */ var _blot_abstract_leaf__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./blot/abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "LeafBlot", function() { return _blot_abstract_leaf__WEBPACK_IMPORTED_MODULE_1__["default"]; });
 
 /* harmony import */ var _blot_abstract_parent__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./blot/abstract/parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ParentBlot", function() { return _blot_abstract_parent__WEBPACK_IMPORTED_MODULE_2__["default"]; });
 
 /* harmony import */ var _blot_block__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./blot/block */ "./node_modules/parchment/src/blot/block.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "BlockBlot", function() { return _blot_block__WEBPACK_IMPORTED_MODULE_3__["default"]; });
 
 /* harmony import */ var _blot_embed__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./blot/embed */ "./node_modules/parchment/src/blot/embed.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "EmbedBlot", function() { return _blot_embed__WEBPACK_IMPORTED_MODULE_4__["default"]; });
 
 /* harmony import */ var _blot_inline__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./blot/inline */ "./node_modules/parchment/src/blot/inline.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "InlineBlot", function() { return _blot_inline__WEBPACK_IMPORTED_MODULE_5__["default"]; });
 
 /* harmony import */ var _blot_scroll__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./blot/scroll */ "./node_modules/parchment/src/blot/scroll.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ScrollBlot", function() { return _blot_scroll__WEBPACK_IMPORTED_MODULE_6__["default"]; });
 
 /* harmony import */ var _blot_text__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./blot/text */ "./node_modules/parchment/src/blot/text.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "TextBlot", function() { return _blot_text__WEBPACK_IMPORTED_MODULE_7__["default"]; });
 
 /* harmony import */ var _attributor_attributor__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./attributor/attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Attributor", function() { return _attributor_attributor__WEBPACK_IMPORTED_MODULE_8__["default"]; });
 
 /* harmony import */ var _attributor_class__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./attributor/class */ "./node_modules/parchment/src/attributor/class.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ClassAttributor", function() { return _attributor_class__WEBPACK_IMPORTED_MODULE_9__["default"]; });
 
 /* harmony import */ var _attributor_store__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./attributor/store */ "./node_modules/parchment/src/attributor/store.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "AttributorStore", function() { return _attributor_store__WEBPACK_IMPORTED_MODULE_10__["default"]; });
 
 /* harmony import */ var _attributor_style__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./attributor/style */ "./node_modules/parchment/src/attributor/style.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "StyleAttributor", function() { return _attributor_style__WEBPACK_IMPORTED_MODULE_11__["default"]; });
 
 /* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./registry */ "./node_modules/parchment/src/registry.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Registry", function() { return _registry__WEBPACK_IMPORTED_MODULE_12__["default"]; });
 
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./scope */ "./node_modules/parchment/src/scope.ts");
 /* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Scope", function() { return _scope__WEBPACK_IMPORTED_MODULE_13__["default"]; });
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/registry.ts":
 /*!************************************************!*\
   !*** ./node_modules/parchment/src/registry.ts ***!
   \************************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Registry; });
 /* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./error */ "./node_modules/parchment/src/error.ts");
 /* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scope */ "./node_modules/parchment/src/scope.ts");
 
 
 class Registry {
     constructor() {
         this.attributes = {};
         this.classes = {};
         this.tags = {};
         this.types = {};
     }
     static find(node, bubble = false) {
         if (node == null) {
             return null;
         }
         if (this.blots.has(node)) {
             return this.blots.get(node) || null;
         }
         if (bubble) {
             return this.find(node.parentNode, bubble);
         }
         return null;
     }
     create(scroll, input, value) {
         const match = this.query(input);
         if (match == null) {
             throw new _error__WEBPACK_IMPORTED_MODULE_0__["default"](`Unable to create ${input} blot`);
         }
         const blotClass = match;
         const node = 
         // @ts-ignore
         input instanceof Node || input.nodeType === Node.TEXT_NODE
             ? input
             : blotClass.create(value);
         const blot = new blotClass(scroll, node, value);
         Registry.blots.set(blot.domNode, blot);
         return blot;
     }
     find(node, bubble = false) {
         return Registry.find(node, bubble);
     }
     query(query, scope = _scope__WEBPACK_IMPORTED_MODULE_1__["default"].ANY) {
         let match;
         if (typeof query === 'string') {
             match = this.types[query] || this.attributes[query];
             // @ts-ignore
         }
         else if (query instanceof Text || query.nodeType === Node.TEXT_NODE) {
             match = this.types.text;
         }
         else if (typeof query === 'number') {
             if (query & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].LEVEL & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].BLOCK) {
                 match = this.types.block;
             }
             else if (query & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].LEVEL & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].INLINE) {
                 match = this.types.inline;
             }
         }
         else if (query instanceof HTMLElement) {
             const names = (query.getAttribute('class') || '').split(/\s+/);
             names.some(name => {
                 match = this.classes[name];
                 if (match) {
                     return true;
                 }
                 return false;
             });
             match = match || this.tags[query.tagName];
         }
         if (match == null) {
             return null;
         }
         // @ts-ignore
         if (scope & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].LEVEL & match.scope && scope & _scope__WEBPACK_IMPORTED_MODULE_1__["default"].TYPE & match.scope) {
             return match;
         }
         return null;
     }
     register(...definitions) {
         if (definitions.length > 1) {
             return definitions.map(d => {
                 return this.register(d);
             });
         }
         const definition = definitions[0];
         if (typeof definition.blotName !== 'string' &&
             typeof definition.attrName !== 'string') {
             throw new _error__WEBPACK_IMPORTED_MODULE_0__["default"]('Invalid definition');
         }
         else if (definition.blotName === 'abstract') {
             throw new _error__WEBPACK_IMPORTED_MODULE_0__["default"]('Cannot register abstract class');
         }
         this.types[definition.blotName || definition.attrName] = definition;
         if (typeof definition.keyName === 'string') {
             this.attributes[definition.keyName] = definition;
         }
         else {
             if (definition.className != null) {
                 this.classes[definition.className] = definition;
             }
             if (definition.tagName != null) {
                 if (Array.isArray(definition.tagName)) {
                     definition.tagName = definition.tagName.map((tagName) => {
                         return tagName.toUpperCase();
                     });
                 }
                 else {
                     definition.tagName = definition.tagName.toUpperCase();
                 }
                 const tagNames = Array.isArray(definition.tagName)
                     ? definition.tagName
                     : [definition.tagName];
                 tagNames.forEach((tag) => {
                     if (this.tags[tag] == null || definition.className == null) {
                         this.tags[tag] = definition;
                     }
                 });
             }
         }
         return definition;
     }
 }
 Registry.blots = new WeakMap();
 
 
 /***/ }),
 
 /***/ "./node_modules/parchment/src/scope.ts":
 /*!*********************************************!*\
   !*** ./node_modules/parchment/src/scope.ts ***!
   \*********************************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 var Scope;
 (function (Scope) {
     Scope[Scope["TYPE"] = 3] = "TYPE";
     Scope[Scope["LEVEL"] = 12] = "LEVEL";
     Scope[Scope["ATTRIBUTE"] = 13] = "ATTRIBUTE";
     Scope[Scope["BLOT"] = 14] = "BLOT";
     Scope[Scope["INLINE"] = 7] = "INLINE";
     Scope[Scope["BLOCK"] = 11] = "BLOCK";
     Scope[Scope["BLOCK_BLOT"] = 10] = "BLOCK_BLOT";
     Scope[Scope["INLINE_BLOT"] = 6] = "INLINE_BLOT";
     Scope[Scope["BLOCK_ATTRIBUTE"] = 9] = "BLOCK_ATTRIBUTE";
     Scope[Scope["INLINE_ATTRIBUTE"] = 5] = "INLINE_ATTRIBUTE";
     Scope[Scope["ANY"] = 15] = "ANY";
 })(Scope || (Scope = {}));
 /* harmony default export */ __webpack_exports__["default"] = (Scope);
 
 
 /***/ }),
 
 /***/ "./node_modules/quill-delta/dist/AttributeMap.js":
 /*!*******************************************************!*\
   !*** ./node_modules/quill-delta/dist/AttributeMap.js ***!
   \*******************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 var __importDefault = (this && this.__importDefault) || function (mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
 };
 Object.defineProperty(exports, "__esModule", { value: true });
 var deep_equal_1 = __importDefault(__webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js"));
 var extend_1 = __importDefault(__webpack_require__(/*! extend */ "./node_modules/extend/index.js"));
 var AttributeMap;
 (function (AttributeMap) {
     function compose(a, b, keepNull) {
         if (a === void 0) { a = {}; }
         if (b === void 0) { b = {}; }
         if (typeof a !== 'object') {
             a = {};
         }
         if (typeof b !== 'object') {
             b = {};
         }
         var attributes = extend_1.default(true, {}, b);
         if (!keepNull) {
             attributes = Object.keys(attributes).reduce(function (copy, key) {
                 if (attributes[key] != null) {
                     copy[key] = attributes[key];
                 }
                 return copy;
             }, {});
         }
         for (var key in a) {
             if (a[key] !== undefined && b[key] === undefined) {
                 attributes[key] = a[key];
             }
         }
         return Object.keys(attributes).length > 0 ? attributes : undefined;
     }
     AttributeMap.compose = compose;
     function diff(a, b) {
         if (a === void 0) { a = {}; }
         if (b === void 0) { b = {}; }
         if (typeof a !== 'object') {
             a = {};
         }
         if (typeof b !== 'object') {
             b = {};
         }
         var attributes = Object.keys(a)
             .concat(Object.keys(b))
             .reduce(function (attrs, key) {
             if (!deep_equal_1.default(a[key], b[key])) {
                 attrs[key] = b[key] === undefined ? null : b[key];
             }
             return attrs;
         }, {});
         return Object.keys(attributes).length > 0 ? attributes : undefined;
     }
     AttributeMap.diff = diff;
     function invert(attr, base) {
         if (attr === void 0) { attr = {}; }
         if (base === void 0) { base = {}; }
         attr = attr || {};
         var baseInverted = Object.keys(base).reduce(function (memo, key) {
             if (base[key] !== attr[key] && attr[key] !== undefined) {
                 memo[key] = base[key];
             }
             return memo;
         }, {});
         return Object.keys(attr).reduce(function (memo, key) {
             if (attr[key] !== base[key] && base[key] === undefined) {
                 memo[key] = null;
             }
             return memo;
         }, baseInverted);
     }
     AttributeMap.invert = invert;
     function transform(a, b, priority) {
         if (priority === void 0) { priority = false; }
         if (typeof a !== 'object') {
             return b;
         }
         if (typeof b !== 'object') {
             return undefined;
         }
         if (!priority) {
             return b; // b simply overwrites us without priority
         }
         var attributes = Object.keys(b).reduce(function (attrs, key) {
             if (a[key] === undefined) {
                 attrs[key] = b[key]; // null is a valid value
             }
             return attrs;
         }, {});
         return Object.keys(attributes).length > 0 ? attributes : undefined;
     }
     AttributeMap.transform = transform;
 })(AttributeMap || (AttributeMap = {}));
 exports.default = AttributeMap;
 //# sourceMappingURL=AttributeMap.js.map
 
 /***/ }),
 
 /***/ "./node_modules/quill-delta/dist/Delta.js":
 /*!************************************************!*\
   !*** ./node_modules/quill-delta/dist/Delta.js ***!
   \************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 var __importDefault = (this && this.__importDefault) || function (mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
 };
 var deep_equal_1 = __importDefault(__webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js"));
 var extend_1 = __importDefault(__webpack_require__(/*! extend */ "./node_modules/extend/index.js"));
 var fast_diff_1 = __importDefault(__webpack_require__(/*! fast-diff */ "./node_modules/fast-diff/diff.js"));
 var AttributeMap_1 = __importDefault(__webpack_require__(/*! ./AttributeMap */ "./node_modules/quill-delta/dist/AttributeMap.js"));
 var Op_1 = __importDefault(__webpack_require__(/*! ./Op */ "./node_modules/quill-delta/dist/Op.js"));
 var NULL_CHARACTER = String.fromCharCode(0); // Placeholder char for embed in diff()
 var Delta = /** @class */ (function () {
     function Delta(ops) {
         // Assume we are given a well formed ops
         if (Array.isArray(ops)) {
             this.ops = ops;
         }
         else if (ops != null && Array.isArray(ops.ops)) {
             this.ops = ops.ops;
         }
         else {
             this.ops = [];
         }
     }
     Delta.prototype.insert = function (arg, attributes) {
         var newOp = {};
         if (typeof arg === 'string' && arg.length === 0) {
             return this;
         }
         newOp.insert = arg;
         if (attributes != null &&
             typeof attributes === 'object' &&
             Object.keys(attributes).length > 0) {
             newOp.attributes = attributes;
         }
         return this.push(newOp);
     };
     Delta.prototype.delete = function (length) {
         if (length <= 0) {
             return this;
         }
         return this.push({ delete: length });
     };
     Delta.prototype.retain = function (length, attributes) {
         if (length <= 0) {
             return this;
         }
         var newOp = { retain: length };
         if (attributes != null &&
             typeof attributes === 'object' &&
             Object.keys(attributes).length > 0) {
             newOp.attributes = attributes;
         }
         return this.push(newOp);
     };
     Delta.prototype.push = function (newOp) {
         var index = this.ops.length;
         var lastOp = this.ops[index - 1];
         newOp = extend_1.default(true, {}, newOp);
         if (typeof lastOp === 'object') {
             if (typeof newOp.delete === 'number' &&
                 typeof lastOp.delete === 'number') {
                 this.ops[index - 1] = { delete: lastOp.delete + newOp.delete };
                 return this;
             }
             // Since it does not matter if we insert before or after deleting at the same index,
             // always prefer to insert first
             if (typeof lastOp.delete === 'number' && newOp.insert != null) {
                 index -= 1;
                 lastOp = this.ops[index - 1];
                 if (typeof lastOp !== 'object') {
                     this.ops.unshift(newOp);
                     return this;
                 }
             }
             if (deep_equal_1.default(newOp.attributes, lastOp.attributes)) {
                 if (typeof newOp.insert === 'string' &&
                     typeof lastOp.insert === 'string') {
                     this.ops[index - 1] = { insert: lastOp.insert + newOp.insert };
                     if (typeof newOp.attributes === 'object') {
                         this.ops[index - 1].attributes = newOp.attributes;
                     }
                     return this;
                 }
                 else if (typeof newOp.retain === 'number' &&
                     typeof lastOp.retain === 'number') {
                     this.ops[index - 1] = { retain: lastOp.retain + newOp.retain };
                     if (typeof newOp.attributes === 'object') {
                         this.ops[index - 1].attributes = newOp.attributes;
                     }
                     return this;
                 }
             }
         }
         if (index === this.ops.length) {
             this.ops.push(newOp);
         }
         else {
             this.ops.splice(index, 0, newOp);
         }
         return this;
     };
     Delta.prototype.chop = function () {
         var lastOp = this.ops[this.ops.length - 1];
         if (lastOp && lastOp.retain && !lastOp.attributes) {
             this.ops.pop();
         }
         return this;
     };
     Delta.prototype.filter = function (predicate) {
         return this.ops.filter(predicate);
     };
     Delta.prototype.forEach = function (predicate) {
         this.ops.forEach(predicate);
     };
     Delta.prototype.map = function (predicate) {
         return this.ops.map(predicate);
     };
     Delta.prototype.partition = function (predicate) {
         var passed = [];
         var failed = [];
         this.forEach(function (op) {
             var target = predicate(op) ? passed : failed;
             target.push(op);
         });
         return [passed, failed];
     };
     Delta.prototype.reduce = function (predicate, initialValue) {
         return this.ops.reduce(predicate, initialValue);
     };
     Delta.prototype.changeLength = function () {
         return this.reduce(function (length, elem) {
             if (elem.insert) {
                 return length + Op_1.default.length(elem);
             }
             else if (elem.delete) {
                 return length - elem.delete;
             }
             return length;
         }, 0);
     };
     Delta.prototype.length = function () {
         return this.reduce(function (length, elem) {
             return length + Op_1.default.length(elem);
         }, 0);
     };
     Delta.prototype.slice = function (start, end) {
         if (start === void 0) { start = 0; }
         if (end === void 0) { end = Infinity; }
         var ops = [];
         var iter = Op_1.default.iterator(this.ops);
         var index = 0;
         while (index < end && iter.hasNext()) {
             var nextOp = void 0;
             if (index < start) {
                 nextOp = iter.next(start - index);
             }
             else {
                 nextOp = iter.next(end - index);
                 ops.push(nextOp);
             }
             index += Op_1.default.length(nextOp);
         }
         return new Delta(ops);
     };
     Delta.prototype.compose = function (other) {
         var thisIter = Op_1.default.iterator(this.ops);
         var otherIter = Op_1.default.iterator(other.ops);
         var ops = [];
         var firstOther = otherIter.peek();
         if (firstOther != null &&
             typeof firstOther.retain === 'number' &&
             firstOther.attributes == null) {
             var firstLeft = firstOther.retain;
             while (thisIter.peekType() === 'insert' &&
                 thisIter.peekLength() <= firstLeft) {
                 firstLeft -= thisIter.peekLength();
                 ops.push(thisIter.next());
             }
             if (firstOther.retain - firstLeft > 0) {
                 otherIter.next(firstOther.retain - firstLeft);
             }
         }
         var delta = new Delta(ops);
         while (thisIter.hasNext() || otherIter.hasNext()) {
             if (otherIter.peekType() === 'insert') {
                 delta.push(otherIter.next());
             }
             else if (thisIter.peekType() === 'delete') {
                 delta.push(thisIter.next());
             }
             else {
                 var length_1 = Math.min(thisIter.peekLength(), otherIter.peekLength());
                 var thisOp = thisIter.next(length_1);
                 var otherOp = otherIter.next(length_1);
                 if (typeof otherOp.retain === 'number') {
                     var newOp = {};
                     if (typeof thisOp.retain === 'number') {
                         newOp.retain = length_1;
                     }
                     else {
                         newOp.insert = thisOp.insert;
                     }
                     // Preserve null when composing with a retain, otherwise remove it for inserts
                     var attributes = AttributeMap_1.default.compose(thisOp.attributes, otherOp.attributes, typeof thisOp.retain === 'number');
                     if (attributes) {
                         newOp.attributes = attributes;
                     }
                     delta.push(newOp);
                     // Optimization if rest of other is just retain
                     if (!otherIter.hasNext() &&
                         deep_equal_1.default(delta.ops[delta.ops.length - 1], newOp)) {
                         var rest = new Delta(thisIter.rest());
                         return delta.concat(rest).chop();
                     }
                     // Other op should be delete, we could be an insert or retain
                     // Insert + delete cancels out
                 }
                 else if (typeof otherOp.delete === 'number' &&
                     typeof thisOp.retain === 'number') {
                     delta.push(otherOp);
                 }
             }
         }
         return delta.chop();
     };
     Delta.prototype.concat = function (other) {
         var delta = new Delta(this.ops.slice());
         if (other.ops.length > 0) {
             delta.push(other.ops[0]);
             delta.ops = delta.ops.concat(other.ops.slice(1));
         }
         return delta;
     };
     Delta.prototype.diff = function (other, cursor) {
         if (this.ops === other.ops) {
             return new Delta();
         }
         var strings = [this, other].map(function (delta) {
             return delta
                 .map(function (op) {
                 if (op.insert != null) {
                     return typeof op.insert === 'string' ? op.insert : NULL_CHARACTER;
                 }
                 var prep = delta === other ? 'on' : 'with';
                 throw new Error('diff() called ' + prep + ' non-document');
             })
                 .join('');
         });
         var retDelta = new Delta();
         var diffResult = fast_diff_1.default(strings[0], strings[1], cursor);
         var thisIter = Op_1.default.iterator(this.ops);
         var otherIter = Op_1.default.iterator(other.ops);
         diffResult.forEach(function (component) {
             var length = component[1].length;
             while (length > 0) {
                 var opLength = 0;
                 switch (component[0]) {
                     case fast_diff_1.default.INSERT:
                         opLength = Math.min(otherIter.peekLength(), length);
                         retDelta.push(otherIter.next(opLength));
                         break;
                     case fast_diff_1.default.DELETE:
                         opLength = Math.min(length, thisIter.peekLength());
                         thisIter.next(opLength);
                         retDelta.delete(opLength);
                         break;
                     case fast_diff_1.default.EQUAL:
                         opLength = Math.min(thisIter.peekLength(), otherIter.peekLength(), length);
                         var thisOp = thisIter.next(opLength);
                         var otherOp = otherIter.next(opLength);
                         if (deep_equal_1.default(thisOp.insert, otherOp.insert)) {
                             retDelta.retain(opLength, AttributeMap_1.default.diff(thisOp.attributes, otherOp.attributes));
                         }
                         else {
                             retDelta.push(otherOp).delete(opLength);
                         }
                         break;
                 }
                 length -= opLength;
             }
         });
         return retDelta.chop();
     };
     Delta.prototype.eachLine = function (predicate, newline) {
         if (newline === void 0) { newline = '\n'; }
         var iter = Op_1.default.iterator(this.ops);
         var line = new Delta();
         var i = 0;
         while (iter.hasNext()) {
             if (iter.peekType() !== 'insert') {
                 return;
             }
             var thisOp = iter.peek();
             var start = Op_1.default.length(thisOp) - iter.peekLength();
             var index = typeof thisOp.insert === 'string'
                 ? thisOp.insert.indexOf(newline, start) - start
                 : -1;
             if (index < 0) {
                 line.push(iter.next());
             }
             else if (index > 0) {
                 line.push(iter.next(index));
             }
             else {
                 if (predicate(line, iter.next(1).attributes || {}, i) === false) {
                     return;
                 }
                 i += 1;
                 line = new Delta();
             }
         }
         if (line.length() > 0) {
             predicate(line, {}, i);
         }
     };
     Delta.prototype.invert = function (base) {
         var inverted = new Delta();
         this.reduce(function (baseIndex, op) {
             if (op.insert) {
                 inverted.delete(Op_1.default.length(op));
             }
             else if (op.retain && op.attributes == null) {
                 inverted.retain(op.retain);
                 return baseIndex + op.retain;
             }
             else if (op.delete || (op.retain && op.attributes)) {
                 var length_2 = (op.delete || op.retain);
                 var slice = base.slice(baseIndex, baseIndex + length_2);
                 slice.forEach(function (baseOp) {
                     if (op.delete) {
                         inverted.push(baseOp);
                     }
                     else if (op.retain && op.attributes) {
                         inverted.retain(Op_1.default.length(baseOp), AttributeMap_1.default.invert(op.attributes, baseOp.attributes));
                     }
                 });
                 return baseIndex + length_2;
             }
             return baseIndex;
         }, 0);
         return inverted.chop();
     };
     Delta.prototype.transform = function (arg, priority) {
         if (priority === void 0) { priority = false; }
         priority = !!priority;
         if (typeof arg === 'number') {
             return this.transformPosition(arg, priority);
         }
         var other = arg;
         var thisIter = Op_1.default.iterator(this.ops);
         var otherIter = Op_1.default.iterator(other.ops);
         var delta = new Delta();
         while (thisIter.hasNext() || otherIter.hasNext()) {
             if (thisIter.peekType() === 'insert' &&
                 (priority || otherIter.peekType() !== 'insert')) {
                 delta.retain(Op_1.default.length(thisIter.next()));
             }
             else if (otherIter.peekType() === 'insert') {
                 delta.push(otherIter.next());
             }
             else {
                 var length_3 = Math.min(thisIter.peekLength(), otherIter.peekLength());
                 var thisOp = thisIter.next(length_3);
                 var otherOp = otherIter.next(length_3);
                 if (thisOp.delete) {
                     // Our delete either makes their delete redundant or removes their retain
                     continue;
                 }
                 else if (otherOp.delete) {
                     delta.push(otherOp);
                 }
                 else {
                     // We retain either their retain or insert
                     delta.retain(length_3, AttributeMap_1.default.transform(thisOp.attributes, otherOp.attributes, priority));
                 }
             }
         }
         return delta.chop();
     };
     Delta.prototype.transformPosition = function (index, priority) {
         if (priority === void 0) { priority = false; }
         priority = !!priority;
         var thisIter = Op_1.default.iterator(this.ops);
         var offset = 0;
         while (thisIter.hasNext() && offset <= index) {
             var length_4 = thisIter.peekLength();
             var nextType = thisIter.peekType();
             thisIter.next();
             if (nextType === 'delete') {
                 index -= Math.min(length_4, index - offset);
                 continue;
             }
             else if (nextType === 'insert' && (offset < index || !priority)) {
                 index += length_4;
             }
             offset += length_4;
         }
         return index;
     };
     Delta.Op = Op_1.default;
     Delta.AttributeMap = AttributeMap_1.default;
     return Delta;
 }());
 module.exports = Delta;
 //# sourceMappingURL=Delta.js.map
 
 /***/ }),
 
 /***/ "./node_modules/quill-delta/dist/Iterator.js":
 /*!***************************************************!*\
   !*** ./node_modules/quill-delta/dist/Iterator.js ***!
   \***************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 var __importDefault = (this && this.__importDefault) || function (mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
 };
 Object.defineProperty(exports, "__esModule", { value: true });
 var Op_1 = __importDefault(__webpack_require__(/*! ./Op */ "./node_modules/quill-delta/dist/Op.js"));
 var Iterator = /** @class */ (function () {
     function Iterator(ops) {
         this.ops = ops;
         this.index = 0;
         this.offset = 0;
     }
     Iterator.prototype.hasNext = function () {
         return this.peekLength() < Infinity;
     };
     Iterator.prototype.next = function (length) {
         if (!length) {
             length = Infinity;
         }
         var nextOp = this.ops[this.index];
         if (nextOp) {
             var offset = this.offset;
             var opLength = Op_1.default.length(nextOp);
             if (length >= opLength - offset) {
                 length = opLength - offset;
                 this.index += 1;
                 this.offset = 0;
             }
             else {
                 this.offset += length;
             }
             if (typeof nextOp.delete === 'number') {
                 return { delete: length };
             }
             else {
                 var retOp = {};
                 if (nextOp.attributes) {
                     retOp.attributes = nextOp.attributes;
                 }
                 if (typeof nextOp.retain === 'number') {
                     retOp.retain = length;
                 }
                 else if (typeof nextOp.insert === 'string') {
                     retOp.insert = nextOp.insert.substr(offset, length);
                 }
                 else {
                     // offset should === 0, length should === 1
                     retOp.insert = nextOp.insert;
                 }
                 return retOp;
             }
         }
         else {
             return { retain: Infinity };
         }
     };
     Iterator.prototype.peek = function () {
         return this.ops[this.index];
     };
     Iterator.prototype.peekLength = function () {
         if (this.ops[this.index]) {
             // Should never return 0 if our index is being managed correctly
             return Op_1.default.length(this.ops[this.index]) - this.offset;
         }
         else {
             return Infinity;
         }
     };
     Iterator.prototype.peekType = function () {
         if (this.ops[this.index]) {
             if (typeof this.ops[this.index].delete === 'number') {
                 return 'delete';
             }
             else if (typeof this.ops[this.index].retain === 'number') {
                 return 'retain';
             }
             else {
                 return 'insert';
             }
         }
         return 'retain';
     };
     Iterator.prototype.rest = function () {
         if (!this.hasNext()) {
             return [];
         }
         else if (this.offset === 0) {
             return this.ops.slice(this.index);
         }
         else {
             var offset = this.offset;
             var index = this.index;
             var next = this.next();
             var rest = this.ops.slice(this.index);
             this.offset = offset;
             this.index = index;
             return [next].concat(rest);
         }
     };
     return Iterator;
 }());
 exports.default = Iterator;
 //# sourceMappingURL=Iterator.js.map
 
 /***/ }),
 
 /***/ "./node_modules/quill-delta/dist/Op.js":
 /*!*********************************************!*\
   !*** ./node_modules/quill-delta/dist/Op.js ***!
   \*********************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 var __importDefault = (this && this.__importDefault) || function (mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
 };
 Object.defineProperty(exports, "__esModule", { value: true });
 var Iterator_1 = __importDefault(__webpack_require__(/*! ./Iterator */ "./node_modules/quill-delta/dist/Iterator.js"));
 var Op;
 (function (Op) {
     function iterator(ops) {
         return new Iterator_1.default(ops);
     }
     Op.iterator = iterator;
     function length(op) {
         if (typeof op.delete === 'number') {
             return op.delete;
         }
         else if (typeof op.retain === 'number') {
             return op.retain;
         }
         else {
             return typeof op.insert === 'string' ? op.insert.length : 1;
         }
     }
     Op.length = length;
 })(Op || (Op = {}));
 exports.default = Op;
 //# sourceMappingURL=Op.js.map
 
 /***/ }),
 
 /***/ "./node_modules/regexp.prototype.flags/implementation.js":
 /*!***************************************************************!*\
   !*** ./node_modules/regexp.prototype.flags/implementation.js ***!
   \***************************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var $Object = Object;
 var $TypeError = TypeError;
 
 module.exports = function flags() {
   if (this != null && this !== $Object(this)) {
     throw new $TypeError('RegExp.prototype.flags getter called on non-object');
   }
   var result = '';
   if (this.global) {
     result += 'g';
   }
   if (this.ignoreCase) {
     result += 'i';
   }
   if (this.multiline) {
     result += 'm';
   }
   if (this.dotAll) {
     result += 's';
   }
   if (this.unicode) {
     result += 'u';
   }
   if (this.sticky) {
     result += 'y';
   }
   return result;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/regexp.prototype.flags/index.js":
 /*!******************************************************!*\
   !*** ./node_modules/regexp.prototype.flags/index.js ***!
   \******************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var define = __webpack_require__(/*! define-properties */ "./node_modules/define-properties/index.js");
 var callBind = __webpack_require__(/*! es-abstract/helpers/callBind */ "./node_modules/es-abstract/helpers/callBind.js");
 
 var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/regexp.prototype.flags/implementation.js");
 var getPolyfill = __webpack_require__(/*! ./polyfill */ "./node_modules/regexp.prototype.flags/polyfill.js");
 var shim = __webpack_require__(/*! ./shim */ "./node_modules/regexp.prototype.flags/shim.js");
 
 var flagsBound = callBind(implementation);
 
 define(flagsBound, {
   getPolyfill: getPolyfill,
   implementation: implementation,
   shim: shim
 });
 
 module.exports = flagsBound;
 
 
 /***/ }),
 
 /***/ "./node_modules/regexp.prototype.flags/polyfill.js":
 /*!*********************************************************!*\
   !*** ./node_modules/regexp.prototype.flags/polyfill.js ***!
   \*********************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/regexp.prototype.flags/implementation.js");
 
 var supportsDescriptors = __webpack_require__(/*! define-properties */ "./node_modules/define-properties/index.js").supportsDescriptors;
 var $gOPD = Object.getOwnPropertyDescriptor;
 var $TypeError = TypeError;
 
 module.exports = function getPolyfill() {
   if (!supportsDescriptors) {
     throw new $TypeError('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
   }
   if ((/a/mig).flags === 'gim') {
     var descriptor = $gOPD(RegExp.prototype, 'flags');
     if (descriptor && typeof descriptor.get === 'function' && typeof (/a/).dotAll === 'boolean') {
       return descriptor.get;
     }
   }
   return implementation;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/regexp.prototype.flags/shim.js":
 /*!*****************************************************!*\
   !*** ./node_modules/regexp.prototype.flags/shim.js ***!
   \*****************************************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 "use strict";
 
 
 var supportsDescriptors = __webpack_require__(/*! define-properties */ "./node_modules/define-properties/index.js").supportsDescriptors;
 var getPolyfill = __webpack_require__(/*! ./polyfill */ "./node_modules/regexp.prototype.flags/polyfill.js");
 var gOPD = Object.getOwnPropertyDescriptor;
 var defineProperty = Object.defineProperty;
 var TypeErr = TypeError;
 var getProto = Object.getPrototypeOf;
 var regex = /a/;
 
 module.exports = function shimFlags() {
   if (!supportsDescriptors || !getProto) {
     throw new TypeErr('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
   }
   var polyfill = getPolyfill();
   var proto = getProto(regex);
   var descriptor = gOPD(proto, 'flags');
   if (!descriptor || descriptor.get !== polyfill) {
     defineProperty(proto, 'flags', {
       configurable: true,
       enumerable: false,
       get: polyfill
     });
   }
   return polyfill;
 };
 
 
 /***/ }),
 
 /***/ "./node_modules/webpack/buildin/global.js":
 /*!***********************************!*\
   !*** (webpack)/buildin/global.js ***!
   \***********************************/
 /*! no static exports found */
 /***/ (function(module, exports) {
 
 var g;
 
 // This works in non-strict mode
 g = (function() {
   return this;
 })();
 
 try {
   // This works if eval is allowed (see CSP)
   g = g || new Function("return this")();
 } catch (e) {
   // This works if the window reference is available
   if (typeof window === "object") g = window;
 }
 
 // g can still be undefined, but nothing to do about it...
 // We return undefined, instead of nothing here, so it's
 // easier to handle this case. if(!global) { ...}
 
 module.exports = g;
 
 
 /***/ }),
 
 /***/ "./quill.js":
 /*!******************!*\
   !*** ./quill.js ***!
   \******************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core */ "./core.js");
 /* harmony import */ var _formats_align__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./formats/align */ "./formats/align.js");
 /* harmony import */ var _formats_direction__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./formats/direction */ "./formats/direction.js");
 /* harmony import */ var _formats_indent__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./formats/indent */ "./formats/indent.js");
 /* harmony import */ var _formats_blockquote__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./formats/blockquote */ "./formats/blockquote.js");
 /* harmony import */ var _formats_header__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./formats/header */ "./formats/header.js");
 /* harmony import */ var _formats_list__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./formats/list */ "./formats/list.js");
 /* harmony import */ var _formats_background__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./formats/background */ "./formats/background.js");
 /* harmony import */ var _formats_color__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./formats/color */ "./formats/color.js");
 /* harmony import */ var _formats_font__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./formats/font */ "./formats/font.js");
 /* harmony import */ var _formats_size__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./formats/size */ "./formats/size.js");
 /* harmony import */ var _formats_bold__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./formats/bold */ "./formats/bold.js");
 /* harmony import */ var _formats_italic__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./formats/italic */ "./formats/italic.js");
 /* harmony import */ var _formats_link__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./formats/link */ "./formats/link.js");
 /* harmony import */ var _formats_script__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./formats/script */ "./formats/script.js");
 /* harmony import */ var _formats_strike__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./formats/strike */ "./formats/strike.js");
 /* harmony import */ var _formats_underline__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./formats/underline */ "./formats/underline.js");
 /* harmony import */ var _formats_formula__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./formats/formula */ "./formats/formula.js");
 /* harmony import */ var _formats_image__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./formats/image */ "./formats/image.js");
 /* harmony import */ var _formats_video__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./formats/video */ "./formats/video.js");
 /* harmony import */ var _formats_code__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./formats/code */ "./formats/code.js");
 /* harmony import */ var _modules_syntax__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./modules/syntax */ "./modules/syntax.js");
 /* harmony import */ var _modules_table__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./modules/table */ "./modules/table.js");
 /* harmony import */ var _modules_toolbar__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./modules/toolbar */ "./modules/toolbar.js");
 /* harmony import */ var _ui_icons__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./ui/icons */ "./ui/icons.js");
 /* harmony import */ var _ui_picker__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./ui/picker */ "./ui/picker.js");
 /* harmony import */ var _ui_color_picker__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./ui/color-picker */ "./ui/color-picker.js");
 /* harmony import */ var _ui_icon_picker__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./ui/icon-picker */ "./ui/icon-picker.js");
 /* harmony import */ var _ui_tooltip__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./ui/tooltip */ "./ui/tooltip.js");
 /* harmony import */ var _themes_bubble__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./themes/bubble */ "./themes/bubble.js");
 /* harmony import */ var _themes_snow__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./themes/snow */ "./themes/snow.js");
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 _core__WEBPACK_IMPORTED_MODULE_0__["default"].register({
   'attributors/attribute/direction': _formats_direction__WEBPACK_IMPORTED_MODULE_2__["DirectionAttribute"],
   'attributors/class/align': _formats_align__WEBPACK_IMPORTED_MODULE_1__["AlignClass"],
   'attributors/class/background': _formats_background__WEBPACK_IMPORTED_MODULE_7__["BackgroundClass"],
   'attributors/class/color': _formats_color__WEBPACK_IMPORTED_MODULE_8__["ColorClass"],
   'attributors/class/direction': _formats_direction__WEBPACK_IMPORTED_MODULE_2__["DirectionClass"],
   'attributors/class/font': _formats_font__WEBPACK_IMPORTED_MODULE_9__["FontClass"],
   'attributors/class/size': _formats_size__WEBPACK_IMPORTED_MODULE_10__["SizeClass"],
   'attributors/style/align': _formats_align__WEBPACK_IMPORTED_MODULE_1__["AlignStyle"],
   'attributors/style/background': _formats_background__WEBPACK_IMPORTED_MODULE_7__["BackgroundStyle"],
   'attributors/style/color': _formats_color__WEBPACK_IMPORTED_MODULE_8__["ColorStyle"],
   'attributors/style/direction': _formats_direction__WEBPACK_IMPORTED_MODULE_2__["DirectionStyle"],
   'attributors/style/font': _formats_font__WEBPACK_IMPORTED_MODULE_9__["FontStyle"],
   'attributors/style/size': _formats_size__WEBPACK_IMPORTED_MODULE_10__["SizeStyle"]
 }, true);
 _core__WEBPACK_IMPORTED_MODULE_0__["default"].register({
   'formats/align': _formats_align__WEBPACK_IMPORTED_MODULE_1__["AlignClass"],
   'formats/direction': _formats_direction__WEBPACK_IMPORTED_MODULE_2__["DirectionClass"],
   'formats/indent': _formats_indent__WEBPACK_IMPORTED_MODULE_3__["default"],
   'formats/background': _formats_background__WEBPACK_IMPORTED_MODULE_7__["BackgroundStyle"],
   'formats/color': _formats_color__WEBPACK_IMPORTED_MODULE_8__["ColorStyle"],
   'formats/font': _formats_font__WEBPACK_IMPORTED_MODULE_9__["FontClass"],
   'formats/size': _formats_size__WEBPACK_IMPORTED_MODULE_10__["SizeClass"],
   'formats/blockquote': _formats_blockquote__WEBPACK_IMPORTED_MODULE_4__["default"],
   'formats/code-block': _formats_code__WEBPACK_IMPORTED_MODULE_20__["default"],
   'formats/header': _formats_header__WEBPACK_IMPORTED_MODULE_5__["default"],
   'formats/list': _formats_list__WEBPACK_IMPORTED_MODULE_6__["default"],
   'formats/bold': _formats_bold__WEBPACK_IMPORTED_MODULE_11__["default"],
   'formats/code': _formats_code__WEBPACK_IMPORTED_MODULE_20__["Code"],
   'formats/italic': _formats_italic__WEBPACK_IMPORTED_MODULE_12__["default"],
   'formats/link': _formats_link__WEBPACK_IMPORTED_MODULE_13__["default"],
   'formats/script': _formats_script__WEBPACK_IMPORTED_MODULE_14__["default"],
   'formats/strike': _formats_strike__WEBPACK_IMPORTED_MODULE_15__["default"],
   'formats/underline': _formats_underline__WEBPACK_IMPORTED_MODULE_16__["default"],
   'formats/formula': _formats_formula__WEBPACK_IMPORTED_MODULE_17__["default"],
   'formats/image': _formats_image__WEBPACK_IMPORTED_MODULE_18__["default"],
   'formats/video': _formats_video__WEBPACK_IMPORTED_MODULE_19__["default"],
   'modules/syntax': _modules_syntax__WEBPACK_IMPORTED_MODULE_21__["default"],
   'modules/table': _modules_table__WEBPACK_IMPORTED_MODULE_22__["default"],
   'modules/toolbar': _modules_toolbar__WEBPACK_IMPORTED_MODULE_23__["default"],
   'themes/bubble': _themes_bubble__WEBPACK_IMPORTED_MODULE_29__["default"],
   'themes/snow': _themes_snow__WEBPACK_IMPORTED_MODULE_30__["default"],
   'ui/icons': _ui_icons__WEBPACK_IMPORTED_MODULE_24__["default"],
   'ui/picker': _ui_picker__WEBPACK_IMPORTED_MODULE_25__["default"],
   'ui/icon-picker': _ui_icon_picker__WEBPACK_IMPORTED_MODULE_27__["default"],
   'ui/color-picker': _ui_color_picker__WEBPACK_IMPORTED_MODULE_26__["default"],
   'ui/tooltip': _ui_tooltip__WEBPACK_IMPORTED_MODULE_28__["default"]
 }, true);
 /* harmony default export */ __webpack_exports__["default"] = (_core__WEBPACK_IMPORTED_MODULE_0__["default"]);
 
 /***/ }),
 
 /***/ "./themes/base.js":
 /*!************************!*\
   !*** ./themes/base.js ***!
   \************************/
 /*! exports provided: BaseTooltip, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BaseTooltip", function() { return BaseTooltip; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return BaseTheme; });
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _core_emitter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/emitter */ "./core/emitter.js");
 /* harmony import */ var _core_theme__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/theme */ "./core/theme.js");
 /* harmony import */ var _ui_color_picker__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../ui/color-picker */ "./ui/color-picker.js");
 /* harmony import */ var _ui_icon_picker__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../ui/icon-picker */ "./ui/icon-picker.js");
 /* harmony import */ var _ui_picker__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/picker */ "./ui/picker.js");
 /* harmony import */ var _ui_tooltip__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../ui/tooltip */ "./ui/tooltip.js");
 
 
 
 
 
 
 
 const ALIGNS = [false, 'center', 'right', 'justify'];
 const COLORS = ['#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff', '#bbbbbb', '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0', '#c285ff', '#888888', '#a10000', '#b26b00', '#b2b200', '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000', '#663d00', '#666600', '#003700', '#002966', '#3d1466'];
 const FONTS = [false, 'serif', 'monospace'];
 const HEADERS = ['1', '2', '3', false];
 const SIZES = ['small', false, 'large', 'huge'];
 
 class BaseTheme extends _core_theme__WEBPACK_IMPORTED_MODULE_2__["default"] {
   constructor(quill, options) {
     super(quill, options);
 
     const listener = e => {
       if (!document.body.contains(quill.root)) {
         document.body.removeEventListener('click', listener);
         return;
       }
 
       if (this.tooltip != null && !this.tooltip.root.contains(e.target) && document.activeElement !== this.tooltip.textbox && !this.quill.hasFocus()) {
         this.tooltip.hide();
       }
 
       if (this.pickers != null) {
         this.pickers.forEach(picker => {
           if (!picker.container.contains(e.target)) {
             picker.close();
           }
         });
       }
     };
 
     quill.emitter.listenDOM('click', document.body, listener);
   }
 
   addModule(name) {
     const module = super.addModule(name);
 
     if (name === 'toolbar') {
       this.extendToolbar(module);
     }
 
     return module;
   }
 
   buildButtons(buttons, icons) {
     Array.from(buttons).forEach(button => {
       const className = button.getAttribute('class') || '';
       className.split(/\s+/).forEach(name => {
         if (!name.startsWith('ql-')) return;
         name = name.slice('ql-'.length);
         if (icons[name] == null) return;
 
         if (name === 'direction') {
           button.innerHTML = icons[name][''] + icons[name].rtl;
         } else if (typeof icons[name] === 'string') {
           button.innerHTML = icons[name];
         } else {
           const value = button.value || '';
 
           if (value != null && icons[name][value]) {
             button.innerHTML = icons[name][value];
           }
         }
       });
     });
   }
 
   buildPickers(selects, icons) {
     this.pickers = Array.from(selects).map(select => {
       if (select.classList.contains('ql-align')) {
         if (select.querySelector('option') == null) {
           fillSelect(select, ALIGNS);
         }
 
         return new _ui_icon_picker__WEBPACK_IMPORTED_MODULE_4__["default"](select, icons.align);
       }
 
       if (select.classList.contains('ql-background') || select.classList.contains('ql-color')) {
         const format = select.classList.contains('ql-background') ? 'background' : 'color';
 
         if (select.querySelector('option') == null) {
           fillSelect(select, COLORS, format === 'background' ? '#ffffff' : '#000000');
         }
 
         return new _ui_color_picker__WEBPACK_IMPORTED_MODULE_3__["default"](select, icons[format]);
       }
 
       if (select.querySelector('option') == null) {
         if (select.classList.contains('ql-font')) {
           fillSelect(select, FONTS);
         } else if (select.classList.contains('ql-header')) {
           fillSelect(select, HEADERS);
         } else if (select.classList.contains('ql-size')) {
           fillSelect(select, SIZES);
         }
       }
 
       return new _ui_picker__WEBPACK_IMPORTED_MODULE_5__["default"](select);
     });
 
     const update = () => {
       this.pickers.forEach(picker => {
         picker.update();
       });
     };
 
     this.quill.on(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.EDITOR_CHANGE, update);
   }
 
 }
 
 BaseTheme.DEFAULTS = extend__WEBPACK_IMPORTED_MODULE_0___default()(true, {}, _core_theme__WEBPACK_IMPORTED_MODULE_2__["default"].DEFAULTS, {
   modules: {
     toolbar: {
       handlers: {
         formula() {
           this.quill.theme.tooltip.edit('formula');
         },
 
         image() {
           let fileInput = this.container.querySelector('input.ql-image[type=file]');
 
           if (fileInput == null) {
             fileInput = document.createElement('input');
             fileInput.setAttribute('type', 'file');
             fileInput.setAttribute('accept', this.quill.uploader.options.mimetypes.join(', '));
             fileInput.classList.add('ql-image');
             fileInput.addEventListener('change', () => {
               const range = this.quill.getSelection(true);
               this.quill.uploader.upload(range, fileInput.files);
               fileInput.value = '';
             });
             this.container.appendChild(fileInput);
           }
 
           fileInput.click();
         },
 
         video() {
           this.quill.theme.tooltip.edit('video');
         }
 
       }
     }
   }
 });
 
 class BaseTooltip extends _ui_tooltip__WEBPACK_IMPORTED_MODULE_6__["default"] {
   constructor(quill, boundsContainer) {
     super(quill, boundsContainer);
     this.textbox = this.root.querySelector('input[type="text"]');
     this.listen();
   }
 
   listen() {
     this.textbox.addEventListener('keydown', event => {
       if (event.key === 'Enter') {
         this.save();
         event.preventDefault();
       } else if (event.key === 'Escape') {
         this.cancel();
         event.preventDefault();
       }
     });
   }
 
   cancel() {
     this.hide();
   }
 
   edit(mode = 'link', preview = null) {
     this.root.classList.remove('ql-hidden');
     this.root.classList.add('ql-editing');
 
     if (preview != null) {
       this.textbox.value = preview;
     } else if (mode !== this.root.getAttribute('data-mode')) {
       this.textbox.value = '';
     }
 
     this.position(this.quill.getBounds(this.quill.selection.savedRange));
     this.textbox.select();
     this.textbox.setAttribute('placeholder', this.textbox.getAttribute("data-".concat(mode)) || '');
     this.root.setAttribute('data-mode', mode);
   }
 
   restoreFocus() {
     const {
       scrollTop
     } = this.quill.scrollingContainer;
     this.quill.focus();
     this.quill.scrollingContainer.scrollTop = scrollTop;
   }
 
   save() {
     let {
       value
     } = this.textbox;
 
     switch (this.root.getAttribute('data-mode')) {
       case 'link':
         {
           const {
             scrollTop
           } = this.quill.root;
 
           if (this.linkRange) {
             this.quill.formatText(this.linkRange, 'link', value, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
             delete this.linkRange;
           } else {
             this.restoreFocus();
             this.quill.format('link', value, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
           }
 
           this.quill.root.scrollTop = scrollTop;
           break;
         }
 
       case 'video':
         {
           value = extractVideoUrl(value);
         }
       // eslint-disable-next-line no-fallthrough
 
       case 'formula':
         {
           if (!value) break;
           const range = this.quill.getSelection(true);
 
           if (range != null) {
             const index = range.index + range.length;
             this.quill.insertEmbed(index, this.root.getAttribute('data-mode'), value, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
 
             if (this.root.getAttribute('data-mode') === 'formula') {
               this.quill.insertText(index + 1, ' ', _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
             }
 
             this.quill.setSelection(index + 2, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
           }
 
           break;
         }
 
       default:
     }
 
     this.textbox.value = '';
     this.hide();
   }
 
 }
 
 function extractVideoUrl(url) {
   let match = url.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtube\.com\/watch.*v=([a-zA-Z0-9_-]+)/) || url.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);
 
   if (match) {
     return "".concat(match[1] || 'https', "://www.youtube.com/embed/").concat(match[2], "?showinfo=0");
   } // eslint-disable-next-line no-cond-assign
 
 
   if (match = url.match(/^(?:(https?):\/\/)?(?:www\.)?vimeo\.com\/(\d+)/)) {
     return "".concat(match[1] || 'https', "://player.vimeo.com/video/").concat(match[2], "/");
   }
 
   return url;
 }
 
 function fillSelect(select, values, defaultValue = false) {
   values.forEach(value => {
     const option = document.createElement('option');
 
     if (value === defaultValue) {
       option.setAttribute('selected', 'selected');
     } else {
       option.setAttribute('value', value);
     }
 
     select.appendChild(option);
   });
 }
 
 
 
 /***/ }),
 
 /***/ "./themes/bubble.js":
 /*!**************************!*\
   !*** ./themes/bubble.js ***!
   \**************************/
 /*! exports provided: BubbleTooltip, default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BubbleTooltip", function() { return BubbleTooltip; });
 /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return BubbleTheme; });
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _core_emitter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/emitter */ "./core/emitter.js");
 /* harmony import */ var _base__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./base */ "./themes/base.js");
 /* harmony import */ var _core_selection__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/selection */ "./core/selection.js");
 /* harmony import */ var _ui_icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../ui/icons */ "./ui/icons.js");
 
 
 
 
 
 const TOOLBAR_CONFIG = [['bold', 'italic', 'link'], [{
   header: 1
 }, {
   header: 2
 }, 'blockquote']];
 
 class BubbleTooltip extends _base__WEBPACK_IMPORTED_MODULE_2__["BaseTooltip"] {
   constructor(quill, bounds) {
     super(quill, bounds);
     this.quill.on(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.EDITOR_CHANGE, (type, range, oldRange, source) => {
       if (type !== _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SELECTION_CHANGE) return;
 
       if (range != null && range.length > 0 && source === _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER) {
         this.show(); // Lock our width so we will expand beyond our offsetParent boundaries
 
         this.root.style.left = '0px';
         this.root.style.width = '';
         this.root.style.width = "".concat(this.root.offsetWidth, "px");
         const lines = this.quill.getLines(range.index, range.length);
 
         if (lines.length === 1) {
           this.position(this.quill.getBounds(range));
         } else {
           const lastLine = lines[lines.length - 1];
           const index = this.quill.getIndex(lastLine);
           const length = Math.min(lastLine.length() - 1, range.index + range.length - index);
           const indexBounds = this.quill.getBounds(new _core_selection__WEBPACK_IMPORTED_MODULE_3__["Range"](index, length));
           this.position(indexBounds);
         }
       } else if (document.activeElement !== this.textbox && this.quill.hasFocus()) {
         this.hide();
       }
     });
   }
 
   listen() {
     super.listen();
     this.root.querySelector('.ql-close').addEventListener('click', () => {
       this.root.classList.remove('ql-editing');
     });
     this.quill.on(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_OPTIMIZE, () => {
       // Let selection be restored by toolbar handlers before repositioning
       setTimeout(() => {
         if (this.root.classList.contains('ql-hidden')) return;
         const range = this.quill.getSelection();
 
         if (range != null) {
           this.position(this.quill.getBounds(range));
         }
       }, 1);
     });
   }
 
   cancel() {
     this.show();
   }
 
   position(reference) {
     const shift = super.position(reference);
     const arrow = this.root.querySelector('.ql-tooltip-arrow');
     arrow.style.marginLeft = '';
 
     if (shift !== 0) {
       arrow.style.marginLeft = "".concat(-1 * shift - arrow.offsetWidth / 2, "px");
     }
 
     return shift;
   }
 
 }
 
 BubbleTooltip.TEMPLATE = ['<span class="ql-tooltip-arrow"></span>', '<div class="ql-tooltip-editor">', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-close"></a>', '</div>'].join('');
 
 class BubbleTheme extends _base__WEBPACK_IMPORTED_MODULE_2__["default"] {
   constructor(quill, options) {
     if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
       options.modules.toolbar.container = TOOLBAR_CONFIG;
     }
 
     super(quill, options);
     this.quill.container.classList.add('ql-bubble');
   }
 
   extendToolbar(toolbar) {
     this.tooltip = new BubbleTooltip(this.quill, this.options.bounds);
     this.tooltip.root.appendChild(toolbar.container);
     this.buildButtons(toolbar.container.querySelectorAll('button'), _ui_icons__WEBPACK_IMPORTED_MODULE_4__["default"]);
     this.buildPickers(toolbar.container.querySelectorAll('select'), _ui_icons__WEBPACK_IMPORTED_MODULE_4__["default"]);
   }
 
 }
 
 BubbleTheme.DEFAULTS = extend__WEBPACK_IMPORTED_MODULE_0___default()(true, {}, _base__WEBPACK_IMPORTED_MODULE_2__["default"].DEFAULTS, {
   modules: {
     toolbar: {
       handlers: {
         link(value) {
           if (!value) {
             this.quill.format('link', false);
           } else {
             this.quill.theme.tooltip.edit();
           }
         }
 
       }
     }
   }
 });
 
 
 /***/ }),
 
 /***/ "./themes/snow.js":
 /*!************************!*\
   !*** ./themes/snow.js ***!
   \************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
 /* harmony import */ var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _core_emitter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/emitter */ "./core/emitter.js");
 /* harmony import */ var _base__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./base */ "./themes/base.js");
 /* harmony import */ var _formats_link__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../formats/link */ "./formats/link.js");
 /* harmony import */ var _core_selection__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/selection */ "./core/selection.js");
 /* harmony import */ var _ui_icons__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/icons */ "./ui/icons.js");
 
 
 
 
 
 
 const TOOLBAR_CONFIG = [[{
   header: ['1', '2', '3', false]
 }], ['bold', 'italic', 'underline', 'link'], [{
   list: 'ordered'
 }, {
   list: 'bullet'
 }], ['clean']];
 
 class SnowTooltip extends _base__WEBPACK_IMPORTED_MODULE_2__["BaseTooltip"] {
   constructor(quill, bounds) {
     super(quill, bounds);
     this.preview = this.root.querySelector('a.ql-preview');
   }
 
   listen() {
     super.listen();
     this.root.querySelector('a.ql-action').addEventListener('click', event => {
       if (this.root.classList.contains('ql-editing')) {
         this.save();
       } else {
         this.edit('link', this.preview.textContent);
       }
 
       event.preventDefault();
     });
     this.root.querySelector('a.ql-remove').addEventListener('click', event => {
       if (this.linkRange != null) {
         const range = this.linkRange;
         this.restoreFocus();
         this.quill.formatText(range, 'link', false, _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
         delete this.linkRange;
       }
 
       event.preventDefault();
       this.hide();
     });
     this.quill.on(_core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].events.SELECTION_CHANGE, (range, oldRange, source) => {
       if (range == null) return;
 
       if (range.length === 0 && source === _core_emitter__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER) {
         const [link, offset] = this.quill.scroll.descendant(_formats_link__WEBPACK_IMPORTED_MODULE_3__["default"], range.index);
 
         if (link != null) {
           this.linkRange = new _core_selection__WEBPACK_IMPORTED_MODULE_4__["Range"](range.index - offset, link.length());
           const preview = _formats_link__WEBPACK_IMPORTED_MODULE_3__["default"].formats(link.domNode);
           this.preview.textContent = preview;
           this.preview.setAttribute('href', preview);
           this.show();
           this.position(this.quill.getBounds(this.linkRange));
           return;
         }
       } else {
         delete this.linkRange;
       }
 
       this.hide();
     });
   }
 
   show() {
     super.show();
     this.root.removeAttribute('data-mode');
   }
 
 }
 
 SnowTooltip.TEMPLATE = ['<a class="ql-preview" rel="noopener noreferrer" target="_blank" href="about:blank"></a>', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-action"></a>', '<a class="ql-remove"></a>'].join('');
 
 class SnowTheme extends _base__WEBPACK_IMPORTED_MODULE_2__["default"] {
   constructor(quill, options) {
     if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
       options.modules.toolbar.container = TOOLBAR_CONFIG;
     }
 
     super(quill, options);
     this.quill.container.classList.add('ql-snow');
   }
 
   extendToolbar(toolbar) {
     toolbar.container.classList.add('ql-snow');
     this.buildButtons(toolbar.container.querySelectorAll('button'), _ui_icons__WEBPACK_IMPORTED_MODULE_5__["default"]);
     this.buildPickers(toolbar.container.querySelectorAll('select'), _ui_icons__WEBPACK_IMPORTED_MODULE_5__["default"]);
     this.tooltip = new SnowTooltip(this.quill, this.options.bounds);
 
     if (toolbar.container.querySelector('.ql-link')) {
       this.quill.keyboard.addBinding({
         key: 'k',
         shortKey: true
       }, (range, context) => {
         toolbar.handlers.link.call(toolbar, !context.format.link);
       });
     }
   }
 
 }
 
 SnowTheme.DEFAULTS = extend__WEBPACK_IMPORTED_MODULE_0___default()(true, {}, _base__WEBPACK_IMPORTED_MODULE_2__["default"].DEFAULTS, {
   modules: {
     toolbar: {
       handlers: {
         link(value) {
           if (value) {
             const range = this.quill.getSelection();
             if (range == null || range.length === 0) return;
             let preview = this.quill.getText(range);
 
             if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf('mailto:') !== 0) {
               preview = "mailto:".concat(preview);
             }
 
             const {
               tooltip
             } = this.quill.theme;
             tooltip.edit('link', preview);
           } else {
             this.quill.format('link', false);
           }
         }
 
       }
     }
   }
 });
 /* harmony default export */ __webpack_exports__["default"] = (SnowTheme);
 
 /***/ }),
 
 /***/ "./ui/color-picker.js":
 /*!****************************!*\
   !*** ./ui/color-picker.js ***!
   \****************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _picker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./picker */ "./ui/picker.js");
 
 
 class ColorPicker extends _picker__WEBPACK_IMPORTED_MODULE_0__["default"] {
   constructor(select, label) {
     super(select);
     this.label.innerHTML = label;
     this.container.classList.add('ql-color-picker');
     Array.from(this.container.querySelectorAll('.ql-picker-item')).slice(0, 7).forEach(item => {
       item.classList.add('ql-primary');
     });
   }
 
   buildItem(option) {
     const item = super.buildItem(option);
     item.style.backgroundColor = option.getAttribute('value') || '';
     return item;
   }
 
   selectItem(item, trigger) {
     super.selectItem(item, trigger);
     const colorLabel = this.label.querySelector('.ql-color-label');
     const value = item ? item.getAttribute('data-value') || '' : '';
 
     if (colorLabel) {
       if (colorLabel.tagName === 'line') {
         colorLabel.style.stroke = value;
       } else {
         colorLabel.style.fill = value;
       }
     }
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (ColorPicker);
 
 /***/ }),
 
 /***/ "./ui/icon-picker.js":
 /*!***************************!*\
   !*** ./ui/icon-picker.js ***!
   \***************************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _picker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./picker */ "./ui/picker.js");
 
 
 class IconPicker extends _picker__WEBPACK_IMPORTED_MODULE_0__["default"] {
   constructor(select, icons) {
     super(select);
     this.container.classList.add('ql-icon-picker');
     Array.from(this.container.querySelectorAll('.ql-picker-item')).forEach(item => {
       item.innerHTML = icons[item.getAttribute('data-value') || ''];
     });
     this.defaultItem = this.container.querySelector('.ql-selected');
     this.selectItem(this.defaultItem);
   }
 
   selectItem(target, trigger) {
     super.selectItem(target, trigger);
     const item = target || this.defaultItem;
     if (this.label.innerHTML === item.innerHTML) return;
     this.label.innerHTML = item.innerHTML;
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (IconPicker);
 
 /***/ }),
 
 /***/ "./ui/icons.js":
 /*!*********************!*\
   !*** ./ui/icons.js ***!
   \*********************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _assets_icons_align_left_svg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../assets/icons/align-left.svg */ "./assets/icons/align-left.svg");
 /* harmony import */ var _assets_icons_align_left_svg__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_align_left_svg__WEBPACK_IMPORTED_MODULE_0__);
 /* harmony import */ var _assets_icons_align_center_svg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../assets/icons/align-center.svg */ "./assets/icons/align-center.svg");
 /* harmony import */ var _assets_icons_align_center_svg__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_align_center_svg__WEBPACK_IMPORTED_MODULE_1__);
 /* harmony import */ var _assets_icons_align_right_svg__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../assets/icons/align-right.svg */ "./assets/icons/align-right.svg");
 /* harmony import */ var _assets_icons_align_right_svg__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_align_right_svg__WEBPACK_IMPORTED_MODULE_2__);
 /* harmony import */ var _assets_icons_align_justify_svg__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../assets/icons/align-justify.svg */ "./assets/icons/align-justify.svg");
 /* harmony import */ var _assets_icons_align_justify_svg__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_align_justify_svg__WEBPACK_IMPORTED_MODULE_3__);
 /* harmony import */ var _assets_icons_background_svg__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../assets/icons/background.svg */ "./assets/icons/background.svg");
 /* harmony import */ var _assets_icons_background_svg__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_background_svg__WEBPACK_IMPORTED_MODULE_4__);
 /* harmony import */ var _assets_icons_blockquote_svg__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../assets/icons/blockquote.svg */ "./assets/icons/blockquote.svg");
 /* harmony import */ var _assets_icons_blockquote_svg__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_blockquote_svg__WEBPACK_IMPORTED_MODULE_5__);
 /* harmony import */ var _assets_icons_bold_svg__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../assets/icons/bold.svg */ "./assets/icons/bold.svg");
 /* harmony import */ var _assets_icons_bold_svg__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_bold_svg__WEBPACK_IMPORTED_MODULE_6__);
 /* harmony import */ var _assets_icons_clean_svg__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../assets/icons/clean.svg */ "./assets/icons/clean.svg");
 /* harmony import */ var _assets_icons_clean_svg__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_clean_svg__WEBPACK_IMPORTED_MODULE_7__);
 /* harmony import */ var _assets_icons_code_svg__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../assets/icons/code.svg */ "./assets/icons/code.svg");
 /* harmony import */ var _assets_icons_code_svg__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_code_svg__WEBPACK_IMPORTED_MODULE_8__);
 /* harmony import */ var _assets_icons_color_svg__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../assets/icons/color.svg */ "./assets/icons/color.svg");
 /* harmony import */ var _assets_icons_color_svg__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_color_svg__WEBPACK_IMPORTED_MODULE_9__);
 /* harmony import */ var _assets_icons_direction_ltr_svg__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../assets/icons/direction-ltr.svg */ "./assets/icons/direction-ltr.svg");
 /* harmony import */ var _assets_icons_direction_ltr_svg__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_direction_ltr_svg__WEBPACK_IMPORTED_MODULE_10__);
 /* harmony import */ var _assets_icons_direction_rtl_svg__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../assets/icons/direction-rtl.svg */ "./assets/icons/direction-rtl.svg");
 /* harmony import */ var _assets_icons_direction_rtl_svg__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_direction_rtl_svg__WEBPACK_IMPORTED_MODULE_11__);
 /* harmony import */ var _assets_icons_formula_svg__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../assets/icons/formula.svg */ "./assets/icons/formula.svg");
 /* harmony import */ var _assets_icons_formula_svg__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_formula_svg__WEBPACK_IMPORTED_MODULE_12__);
 /* harmony import */ var _assets_icons_header_svg__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../assets/icons/header.svg */ "./assets/icons/header.svg");
 /* harmony import */ var _assets_icons_header_svg__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_header_svg__WEBPACK_IMPORTED_MODULE_13__);
 /* harmony import */ var _assets_icons_header_2_svg__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../assets/icons/header-2.svg */ "./assets/icons/header-2.svg");
 /* harmony import */ var _assets_icons_header_2_svg__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_header_2_svg__WEBPACK_IMPORTED_MODULE_14__);
 /* harmony import */ var _assets_icons_italic_svg__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../assets/icons/italic.svg */ "./assets/icons/italic.svg");
 /* harmony import */ var _assets_icons_italic_svg__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_italic_svg__WEBPACK_IMPORTED_MODULE_15__);
 /* harmony import */ var _assets_icons_image_svg__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../assets/icons/image.svg */ "./assets/icons/image.svg");
 /* harmony import */ var _assets_icons_image_svg__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_image_svg__WEBPACK_IMPORTED_MODULE_16__);
 /* harmony import */ var _assets_icons_indent_svg__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../assets/icons/indent.svg */ "./assets/icons/indent.svg");
 /* harmony import */ var _assets_icons_indent_svg__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_indent_svg__WEBPACK_IMPORTED_MODULE_17__);
 /* harmony import */ var _assets_icons_outdent_svg__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../assets/icons/outdent.svg */ "./assets/icons/outdent.svg");
 /* harmony import */ var _assets_icons_outdent_svg__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_outdent_svg__WEBPACK_IMPORTED_MODULE_18__);
 /* harmony import */ var _assets_icons_link_svg__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../assets/icons/link.svg */ "./assets/icons/link.svg");
 /* harmony import */ var _assets_icons_link_svg__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_link_svg__WEBPACK_IMPORTED_MODULE_19__);
 /* harmony import */ var _assets_icons_list_bullet_svg__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../assets/icons/list-bullet.svg */ "./assets/icons/list-bullet.svg");
 /* harmony import */ var _assets_icons_list_bullet_svg__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_list_bullet_svg__WEBPACK_IMPORTED_MODULE_20__);
 /* harmony import */ var _assets_icons_list_check_svg__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../assets/icons/list-check.svg */ "./assets/icons/list-check.svg");
 /* harmony import */ var _assets_icons_list_check_svg__WEBPACK_IMPORTED_MODULE_21___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_list_check_svg__WEBPACK_IMPORTED_MODULE_21__);
 /* harmony import */ var _assets_icons_list_ordered_svg__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../assets/icons/list-ordered.svg */ "./assets/icons/list-ordered.svg");
 /* harmony import */ var _assets_icons_list_ordered_svg__WEBPACK_IMPORTED_MODULE_22___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_list_ordered_svg__WEBPACK_IMPORTED_MODULE_22__);
 /* harmony import */ var _assets_icons_subscript_svg__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../assets/icons/subscript.svg */ "./assets/icons/subscript.svg");
 /* harmony import */ var _assets_icons_subscript_svg__WEBPACK_IMPORTED_MODULE_23___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_subscript_svg__WEBPACK_IMPORTED_MODULE_23__);
 /* harmony import */ var _assets_icons_superscript_svg__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../assets/icons/superscript.svg */ "./assets/icons/superscript.svg");
 /* harmony import */ var _assets_icons_superscript_svg__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_superscript_svg__WEBPACK_IMPORTED_MODULE_24__);
 /* harmony import */ var _assets_icons_strike_svg__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../assets/icons/strike.svg */ "./assets/icons/strike.svg");
 /* harmony import */ var _assets_icons_strike_svg__WEBPACK_IMPORTED_MODULE_25___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_strike_svg__WEBPACK_IMPORTED_MODULE_25__);
 /* harmony import */ var _assets_icons_table_svg__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../assets/icons/table.svg */ "./assets/icons/table.svg");
 /* harmony import */ var _assets_icons_table_svg__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_table_svg__WEBPACK_IMPORTED_MODULE_26__);
 /* harmony import */ var _assets_icons_underline_svg__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ../assets/icons/underline.svg */ "./assets/icons/underline.svg");
 /* harmony import */ var _assets_icons_underline_svg__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_underline_svg__WEBPACK_IMPORTED_MODULE_27__);
 /* harmony import */ var _assets_icons_video_svg__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ../assets/icons/video.svg */ "./assets/icons/video.svg");
 /* harmony import */ var _assets_icons_video_svg__WEBPACK_IMPORTED_MODULE_28___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_video_svg__WEBPACK_IMPORTED_MODULE_28__);
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 /* harmony default export */ __webpack_exports__["default"] = ({
   align: {
     '': _assets_icons_align_left_svg__WEBPACK_IMPORTED_MODULE_0___default.a,
     center: _assets_icons_align_center_svg__WEBPACK_IMPORTED_MODULE_1___default.a,
     right: _assets_icons_align_right_svg__WEBPACK_IMPORTED_MODULE_2___default.a,
     justify: _assets_icons_align_justify_svg__WEBPACK_IMPORTED_MODULE_3___default.a
   },
   background: _assets_icons_background_svg__WEBPACK_IMPORTED_MODULE_4___default.a,
   blockquote: _assets_icons_blockquote_svg__WEBPACK_IMPORTED_MODULE_5___default.a,
   bold: _assets_icons_bold_svg__WEBPACK_IMPORTED_MODULE_6___default.a,
   clean: _assets_icons_clean_svg__WEBPACK_IMPORTED_MODULE_7___default.a,
   code: _assets_icons_code_svg__WEBPACK_IMPORTED_MODULE_8___default.a,
   'code-block': _assets_icons_code_svg__WEBPACK_IMPORTED_MODULE_8___default.a,
   color: _assets_icons_color_svg__WEBPACK_IMPORTED_MODULE_9___default.a,
   direction: {
     '': _assets_icons_direction_ltr_svg__WEBPACK_IMPORTED_MODULE_10___default.a,
     rtl: _assets_icons_direction_rtl_svg__WEBPACK_IMPORTED_MODULE_11___default.a
   },
   formula: _assets_icons_formula_svg__WEBPACK_IMPORTED_MODULE_12___default.a,
   header: {
     '1': _assets_icons_header_svg__WEBPACK_IMPORTED_MODULE_13___default.a,
     '2': _assets_icons_header_2_svg__WEBPACK_IMPORTED_MODULE_14___default.a
   },
   italic: _assets_icons_italic_svg__WEBPACK_IMPORTED_MODULE_15___default.a,
   image: _assets_icons_image_svg__WEBPACK_IMPORTED_MODULE_16___default.a,
   indent: {
     '+1': _assets_icons_indent_svg__WEBPACK_IMPORTED_MODULE_17___default.a,
     '-1': _assets_icons_outdent_svg__WEBPACK_IMPORTED_MODULE_18___default.a
   },
   link: _assets_icons_link_svg__WEBPACK_IMPORTED_MODULE_19___default.a,
   list: {
     bullet: _assets_icons_list_bullet_svg__WEBPACK_IMPORTED_MODULE_20___default.a,
     check: _assets_icons_list_check_svg__WEBPACK_IMPORTED_MODULE_21___default.a,
     ordered: _assets_icons_list_ordered_svg__WEBPACK_IMPORTED_MODULE_22___default.a
   },
   script: {
     sub: _assets_icons_subscript_svg__WEBPACK_IMPORTED_MODULE_23___default.a,
     super: _assets_icons_superscript_svg__WEBPACK_IMPORTED_MODULE_24___default.a
   },
   strike: _assets_icons_strike_svg__WEBPACK_IMPORTED_MODULE_25___default.a,
   table: _assets_icons_table_svg__WEBPACK_IMPORTED_MODULE_26___default.a,
   underline: _assets_icons_underline_svg__WEBPACK_IMPORTED_MODULE_27___default.a,
   video: _assets_icons_video_svg__WEBPACK_IMPORTED_MODULE_28___default.a
 });
 
 /***/ }),
 
 /***/ "./ui/picker.js":
 /*!**********************!*\
   !*** ./ui/picker.js ***!
   \**********************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 /* harmony import */ var _assets_icons_dropdown_svg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../assets/icons/dropdown.svg */ "./assets/icons/dropdown.svg");
 /* harmony import */ var _assets_icons_dropdown_svg__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_assets_icons_dropdown_svg__WEBPACK_IMPORTED_MODULE_0__);
 
 let optionsCounter = 0;
 
 function toggleAriaAttribute(element, attribute) {
   element.setAttribute(attribute, !(element.getAttribute(attribute) === 'true'));
 }
 
 class Picker {
   constructor(select) {
     this.select = select;
     this.container = document.createElement('span');
     this.buildPicker();
     this.select.style.display = 'none';
     this.select.parentNode.insertBefore(this.container, this.select);
     this.label.addEventListener('mousedown', () => {
       this.togglePicker();
     });
     this.label.addEventListener('keydown', event => {
       switch (event.key) {
         case 'Enter':
           this.togglePicker();
           break;
 
         case 'Escape':
           this.escape();
           event.preventDefault();
           break;
 
         default:
       }
     });
     this.select.addEventListener('change', this.update.bind(this));
   }
 
   togglePicker() {
     this.container.classList.toggle('ql-expanded'); // Toggle aria-expanded and aria-hidden to make the picker accessible
 
     toggleAriaAttribute(this.label, 'aria-expanded');
     toggleAriaAttribute(this.options, 'aria-hidden');
   }
 
   buildItem(option) {
     const item = document.createElement('span');
     item.tabIndex = '0';
     item.setAttribute('role', 'button');
     item.classList.add('ql-picker-item');
 
     if (option.hasAttribute('value')) {
       item.setAttribute('data-value', option.getAttribute('value'));
     }
 
     if (option.textContent) {
       item.setAttribute('data-label', option.textContent);
     }
 
     item.addEventListener('click', () => {
       this.selectItem(item, true);
     });
     item.addEventListener('keydown', event => {
       switch (event.key) {
         case 'Enter':
           this.selectItem(item, true);
           event.preventDefault();
           break;
 
         case 'Escape':
           this.escape();
           event.preventDefault();
           break;
 
         default:
       }
     });
     return item;
   }
 
   buildLabel() {
     const label = document.createElement('span');
     label.classList.add('ql-picker-label');
     label.innerHTML = _assets_icons_dropdown_svg__WEBPACK_IMPORTED_MODULE_0___default.a;
     label.tabIndex = '0';
     label.setAttribute('role', 'button');
     label.setAttribute('aria-expanded', 'false');
     this.container.appendChild(label);
     return label;
   }
 
   buildOptions() {
     const options = document.createElement('span');
     options.classList.add('ql-picker-options'); // Don't want screen readers to read this until options are visible
 
     options.setAttribute('aria-hidden', 'true');
     options.tabIndex = '-1'; // Need a unique id for aria-controls
 
     options.id = "ql-picker-options-".concat(optionsCounter);
     optionsCounter += 1;
     this.label.setAttribute('aria-controls', options.id);
     this.options = options;
     Array.from(this.select.options).forEach(option => {
       const item = this.buildItem(option);
       options.appendChild(item);
 
       if (option.selected === true) {
         this.selectItem(item);
       }
     });
     this.container.appendChild(options);
   }
 
   buildPicker() {
     Array.from(this.select.attributes).forEach(item => {
       this.container.setAttribute(item.name, item.value);
     });
     this.container.classList.add('ql-picker');
     this.label = this.buildLabel();
     this.buildOptions();
   }
 
   escape() {
     // Close menu and return focus to trigger label
     this.close(); // Need setTimeout for accessibility to ensure that the browser executes
     // focus on the next process thread and after any DOM content changes
 
     setTimeout(() => this.label.focus(), 1);
   }
 
   close() {
     this.container.classList.remove('ql-expanded');
     this.label.setAttribute('aria-expanded', 'false');
     this.options.setAttribute('aria-hidden', 'true');
   }
 
   selectItem(item, trigger = false) {
     const selected = this.container.querySelector('.ql-selected');
     if (item === selected) return;
 
     if (selected != null) {
       selected.classList.remove('ql-selected');
     }
 
     if (item == null) return;
     item.classList.add('ql-selected');
     this.select.selectedIndex = Array.from(item.parentNode.children).indexOf(item);
 
     if (item.hasAttribute('data-value')) {
       this.label.setAttribute('data-value', item.getAttribute('data-value'));
     } else {
       this.label.removeAttribute('data-value');
     }
 
     if (item.hasAttribute('data-label')) {
       this.label.setAttribute('data-label', item.getAttribute('data-label'));
     } else {
       this.label.removeAttribute('data-label');
     }
 
     if (trigger) {
       this.select.dispatchEvent(new Event('change'));
       this.close();
     }
   }
 
   update() {
     let option;
 
     if (this.select.selectedIndex > -1) {
       const item = this.container.querySelector('.ql-picker-options').children[this.select.selectedIndex];
       option = this.select.options[this.select.selectedIndex];
       this.selectItem(item);
     } else {
       this.selectItem(null);
     }
 
     const isActive = option != null && option !== this.select.querySelector('option[selected]');
     this.label.classList.toggle('ql-active', isActive);
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (Picker);
 
 /***/ }),
 
 /***/ "./ui/tooltip.js":
 /*!***********************!*\
   !*** ./ui/tooltip.js ***!
   \***********************/
 /*! exports provided: default */
 /***/ (function(module, __webpack_exports__, __webpack_require__) {
 
 "use strict";
 __webpack_require__.r(__webpack_exports__);
 class Tooltip {
   constructor(quill, boundsContainer) {
     this.quill = quill;
     this.boundsContainer = boundsContainer || document.body;
     this.root = quill.addContainer('ql-tooltip');
     this.root.innerHTML = this.constructor.TEMPLATE;
 
     if (this.quill.root === this.quill.scrollingContainer) {
       this.quill.root.addEventListener('scroll', () => {
         this.root.style.marginTop = "".concat(-1 * this.quill.root.scrollTop, "px");
       });
     }
 
     this.hide();
   }
 
   hide() {
     this.root.classList.add('ql-hidden');
   }
 
   position(reference) {
     const left = reference.left + reference.width / 2 - this.root.offsetWidth / 2; // root.scrollTop should be 0 if scrollContainer !== root
 
     const top = reference.bottom + this.quill.root.scrollTop;
     this.root.style.left = "".concat(left, "px");
     this.root.style.top = "".concat(top, "px");
     this.root.classList.remove('ql-flip');
     const containerBounds = this.boundsContainer.getBoundingClientRect();
     const rootBounds = this.root.getBoundingClientRect();
     let shift = 0;
 
     if (rootBounds.right > containerBounds.right) {
       shift = containerBounds.right - rootBounds.right;
       this.root.style.left = "".concat(left + shift, "px");
     }
 
     if (rootBounds.left < containerBounds.left) {
       shift = containerBounds.left - rootBounds.left;
       this.root.style.left = "".concat(left + shift, "px");
     }
 
     if (rootBounds.bottom > containerBounds.bottom) {
       const height = rootBounds.bottom - rootBounds.top;
       const verticalShift = reference.bottom - reference.top + height;
       this.root.style.top = "".concat(top - verticalShift, "px");
       this.root.classList.add('ql-flip');
     }
 
     return shift;
   }
 
   show() {
     this.root.classList.remove('ql-editing');
     this.root.classList.remove('ql-hidden');
   }
 
 }
 
 /* harmony default export */ __webpack_exports__["default"] = (Tooltip);
 
 /***/ }),
 
 /***/ 0:
 /*!************************!*\
   !*** multi ./quill.js ***!
   \************************/
 /*! no static exports found */
 /***/ (function(module, exports, __webpack_require__) {
 
 module.exports = __webpack_require__(/*! ./quill.js */"./quill.js");
 
 
 /***/ })
 
 /******/ })["default"];
 });
 //# sourceMappingURL=quill.js.map
const Quill = factory()
export { Quill }