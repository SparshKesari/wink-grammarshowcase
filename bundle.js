(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = abusiveWords;

function abusiveWords() {
  return ['[anus]', '[anal]', '[ballsack]', '[blowjob]', '[blow] [job]', '[boner]', '[clitoris]', '[cock]', '[cunt]', '[dick]', '[dildo]', '[dyke]', '[fag]', '[fuck]', '[jizz]', '[labia]', '[muff]', '[nigger]', '[nigga]', '[penis]', '[piss]', '[pussy]', '[scrotum]', '[sex]', '[shit]', '[slut]', '[smegma]', '[spunk]', '[twat]', '[vagina]', '[wank]', '[whore]'];
}

;

},{}],5:[function(require,module,exports){
"use strict";

var _oxymoronList = _interopRequireDefault(require("./oxymoronList.mjs"));

var _abusiveList = _interopRequireDefault(require("./abusiveList.mjs"));

var _wordinessList = _interopRequireDefault(require("./wordinessList.mjs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var winkNLP = require('wink-nlp');

var model = require('wink-eng-lite-web-model');

var nlp = winkNLP(model);
var its = nlp.its;
var as = nlp.as;
var doc, logs;
var patterns = [{
  name: 'adverbSentences',
  patterns: ['[ADV]']
}, {
  name: 'oxymoron',
  patterns: (0, _oxymoronList["default"])()
}, {
  name: 'abusiveWords',
  patterns: (0, _abusiveList["default"])()
}, {
  name: 'wordinessPhrases',
  patterns: (0, _wordinessList["default"])()
}, {
  name: 'curlyApostrophes',
  patterns: ['[‘|’]']
}, {
  name: 'redundantPhrases',
  patterns: ['[TIME] [ADP|] [DET|THE|] [TIME]']
}];
nlp.learnCustomEntities(patterns);

module.exports = function (text) {
  logs = [];
  doc = nlp.readDoc(text);
};

module.exports.getTextAndLog = function () {
  return [doc.out(its.markedUpText), logs];
};
/**
 * @description Check for incorrect contractions.
 */


module.exports.checkIncorrectContractions = function () {
  var filteredTokens = doc.tokens().filter(function (token) {
    return token.out(its.type) !== 'tabCRLF';
  }).filter(function (token) {
    return token.out(its.contractionFlag) === true;
  });
  var contractionToken = filteredTokens.filter(function (token, index) {
    return index % 2 !== 0 && !token.out(its.value).includes("'");
  });
  contractionToken.each(function (token, index) {
    filteredTokens.itemAt(index * 2).markup('<mark class="checkIncorrectContractions">', '</mark>');
    token.markup('<mark class="checkIncorrectContractions">', '</mark>');
  });

  if (contractionToken.out().length > 0) {
    logs.push({
      'checkIncorrectContractions': contractionToken.out().length + ' contractions are incorrect!'
    });
  }
};
/**
 * @description Check for incorrect usage of punctuation spacing.
 */


module.exports.checkIncorrectPunctuationSpacing = function () {
  var tokens = doc.tokens();
  var filteredTokens = tokens.filter(function (token) {
    return token.out(its.pos) === 'PUNCT';
  });
  var incorrectToken = filteredTokens.filter(function (token, index) {
    return index < filteredTokens.out().length - 1 && !(token.out(its.precedingSpaces) === '' && tokens.itemAt(token.index() + 1).out(its.precedingSpaces) === ' ') || index === filteredTokens.out().length - 1 && !(token.out(its.precedingSpaces) === '');
  });
  incorrectToken.each(function (token) {
    token.markup('<mark class="checkIncorrectPunctuationSpacing" >', '</mark>');
  });
  if (incorrectToken.out().length > 0) logs.push({
    'checkIncorrectPunctuationSpacing': incorrectToken.out().length + ' punctuations are incorrect!'
  });
};
/**
 * @description Check if the first word of sentence is capital or not.
 */


module.exports.checkFirstWordOfSentence = function () {
  var count = 0;

  if (doc.out() !== ('%c<empty string>', '', 'font-style: italic;', '')) {
    doc.sentences().each(function (sentence) {
      var firstWord = sentence.tokens().filter(function (word) {
        return word.out(its.type) === 'word';
      }).itemAt(0);

      if (firstWord.out(its["case"]) !== 'titleCase' && !(firstWord.out(its["case"]) === 'upperCase' && firstWord.out().length <= 1)) {
        count += 1;
        firstWord.markup('<mark class="checkFirstWordOfSentence" >', '</mark>');
      }
    });
  }

  if (count > 0) logs.push({
    'checkFirstWordOfSentence': count + ' first words have incorrect grammar!'
  });
};
/**
 * @description Check use of adverbs. Adverbs are okay to be used, but it is generally recommended
 * that use of -ly ending adverbs should be avoided, and there should be only two adverbs at most
 * - if a sentence is moderately large.
 */


module.exports.checkUseOfAdverbs = function () {
  var adverbSentence = doc.customEntities().filter(function (sentence) {
    return sentence.out(its.type) === 'adverbSentences';
  });
  adverbSentence.each(function (token) {
    return token.markup('<mark class="checkUseOfAdverbs" >', '</mark>');
  });
  if (adverbSentence.out().length > 0) logs.push({
    'checkUseOfAdverbs': adverbSentence.out().length + ' adverbs are in the sentences - not a grammatical error, but be careful not to overuse them!'
  });
};
/**
 * @description Check use of passive voice.
 */


module.exports.checkUseOfPassiveVoice = function () {// -- empty function
};
/**
 * @description Marks long and very long sentences.
 */


module.exports.checkUseOfLongSentence = function () {
  var sentences = doc.sentences();
  sentences.each(function (sentence) {
    var longSentence = 0;
    var veryLongSentence = 0;
    var wordCount = sentence.tokens().filter(function (token) {
      return token.out(its.type) === 'word';
    }).out().length;

    if (wordCount >= 15 && wordCount < 21) {
      longSentence += 1;
      sentence.markup('<mark class="checkUseOfLongSentence-Long" >', '</mark>');
    } else if (wordCount >= 21) {
      veryLongSentence += 1;
      sentence.markup('<mark class="checkUseOfLongSentence-VeryLong" >', '</mark>');
    }

    if (longSentence > 0) logs.push({
      'checkUseOfLongSentence-Long': longSentence + ' sentences are long - try to shorten the length!'
    });
    if (veryLongSentence > 0) logs.push({
      'checkUseOfLongSentence-VeryLong': veryLongSentence + ' sentences are very long - try to shorten the length!'
    });
  });
};
/**
 * @description Check for duplicate words.
 */


module.exports.checkDuplicateWords = function () {
  var sentences = doc.sentences();
  var tokens = doc.tokens();

  if (sentences.length() === tokens.filter(function (token) {
    return token.out() === '.' || token.out() === '!' || token.out() === '?';
  }).out().length) {
    var duplicateWord = 0;
    sentences.each(function (sentence) {
      var eachSentence = sentence.tokens().filter(function (token) {
        return token.out(its.type) !== 'tabCRLF';
      });
      eachSentence.each(function (token, index) {
        if (index < sentence.tokens().length() - 2 && token.out() === eachSentence.itemAt(index + 1).out()) {
          duplicateWord += 1;
          token.markup('<mark class="checkDuplicateWords" >', '</mark>');
          eachSentence.itemAt(index + 1).markup('<mark class="checkDuplicateWords">', '</mark>');
        }
      });
    });
    if (duplicateWord > 0) logs.push({
      'checkDuplicateWords': duplicateWord + ' words have duplicates!'
    });
  }
};
/**
 * @description Check for abusive words.
 */


module.exports.avoidAbusiveWords = function () {
  var count = 0;
  doc.customEntities().filter(function (entity) {
    return entity.out(its.type) === 'abusiveWords';
  }).each(function (entity) {
    count += 1;
    entity.markup('<mark class="avoidAbusiveWords" >', '</mark>');
  });
  if (count > 0) logs.push({
    'avoidAbusiveWords': count + ' abusive words! Avoid them!'
  });
};
/**
 * @description Use consistent spellings - either British or American.
 */


module.exports.useConsistentSpellings = function () {// -- empty function
};
/**
 * @description Always use consistent apostrophe (curly vs straight). No need to check for quotes.
 */


module.exports.useConsistentApostrophe = function () {
  var count = 0;
  doc.customEntities().filter(function (entity) {
    return entity.out(its.type) === 'curlyApostrophes';
  }).each(function (symbol) {
    count += 1;
    symbol.markup('<mark class="useConsistentApostrophe" >', '</mark>');
  });
  if (count > 0) logs.push({
    'useConsistentApostrophe': count + ' apostrophe not consistent! Use flat apostrophe only!'
  });
};
/**
 * @description Avoid use of "am" and "pm" when sentences defines the time of the
 * day(i.e. morning, evening, night, etc).
 */


module.exports.avoidRedundantConstruct = function () {
  var count = 0;
  doc.customEntities().filter(function (entity) {
    return entity.out(its.type) === 'redundantPhrases';
  }).each(function (entity) {
    count += 1;
    entity.markup('<mark class="avoidRedundantConstruct">', '</mark>');
  });
  if (count > 0) logs.push({
    'avoidRedundantConstruct': count + ' redundant constructs! Not necessarily wrong, but avoid them!'
  });
};
/**
 * @description Highlights interjections without punctuations
 */


module.exports.highlightInterjectionsWithoutPunctuations = function () {
  var count = 0;
  var tokens = doc.tokens();
  var sentences = doc.sentences();

  if (sentences.length() === tokens.filter(function (token) {
    return token.out() === '.' || token.out() === '!' || token.out() === '?';
  }).out().length) {
    tokens.filter(function (token, index) {
      return token.out(its.pos) === 'INTJ' && !(tokens.itemAt(index + 1).out() === '?' || tokens.itemAt(index + 1).out() === '!' || tokens.itemAt(index + 1).out() === ',' || tokens.itemAt(index + 1).out() === '.');
    }).each(function (token) {
      count += 1;
      token.markup('<mark class="highlightInterjectionsWithoutPunctuations" >', '</mark>');
    });
  }

  if (count > 0) logs.push({
    'highlightInterjectionsWithoutPunctuations': count + ' incorrect interjections without proper punctuations! Use the following - "!", ".", "," OR "?".'
  });
};
/**
 * @description Highlights wordiness (includes redundant acronym syndrome).
 */


module.exports.highlightWordiness = function () {
  var count = 0;
  doc.customEntities().filter(function (entity) {
    return entity.out(its.type) === 'wordinessPhrases';
  }).each(function (entity) {
    count += 1;
    entity.markup('<mark class="highlightWordiness">', '</mark>');
  });
  if (count > 0) logs.push({
    'highlightWordiness': count + ' phrases have been found with wordiness. It is advisible to update them.'
  });
};
/** 
 * @description A function that highlights the use of oxymoron.
 */


module.exports.highlightUseOfOxymoron = function () {
  var count = 0;
  doc.customEntities().filter(function (e) {
    return e.out(its.type) === 'oxymoron';
  }).each(function (entity) {
    count += 1;
    entity.markup('<mark class="highlightUseOfOxymoron" >', '</mark>');
  });
  if (count > 0) logs.push({
    'highlightUseOfOxymoron': count + ' oxymorons detected! Careful while using them!'
  });
};
/**
 * @description A function that warns the user for starting with a conjunction
 */


module.exports.avoidStartingWithConjunctions = function () {
  var count = 0;

  if (doc.out() !== ('%c<empty string>', '', 'font-style: italic;', '')) {
    doc.sentences().each(function (sentence) {
      if (sentence.out() !== ('%c<empty string>', '', 'font-style: italic;', '') //&&
      //sentence.tokens().itemAt(0).out(its.type) === 'word'
      ) {
        var firstWord = sentence.tokens().filter(function (word) {
          return word.out(its.type) === 'word';
        }).itemAt(0);

        if (firstWord.out(its.pos) === 'SCONJ' || firstWord.out(its.pos) === 'CCONJ') {
          count += 1;
          firstWord.markup('<mark class="avoidStartingWithConjunctions" >', '</mark>');
        }
      }
    });
  }

  if (count > 0) logs.push({
    'avoidStartingWithConjunctions': count + ' conjunctions! Avoid using them!'
  });
};

},{"./abusiveList.mjs":4,"./oxymoronList.mjs":7,"./wordinessList.mjs":8,"wink-eng-lite-web-model":27,"wink-nlp":81}],6:[function(require,module,exports){
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var grammar = require('./grammar.mjs');

var $container = $('#text-container');
var $backdrop = $('.backdrop-wink');
var $highlights = $('.highlights-wink');
var $textArea = $('textarea');
var $legendTableBody = $('#legend-body'); // var $toggle = $('button')
// var $dropdown = $('.language')

/**
 * @description Applies all the required highlights layer-by-layer.
 * @param {String} text Input string from the text area.
 * @returns {[String, Array]} Returns an array that consists of:
 * 1. String with all the grammar rules markings
 * 2. An array that has all the logs saved to show grammar errors.
 */

var applyHighlights = function applyHighlights(text) {
  grammar(text); // -- functions that highlight the mistakes in sentence structuring

  grammar.checkFirstWordOfSentence(); // working
  // -- functions that highlight mistakes in parts of sentences

  grammar.checkUseOfAdverbs(); // working

  grammar.avoidAbusiveWords(); // working

  grammar.highlightUseOfOxymoron(); // working

  grammar.highlightWordiness(); // working
  // grammar.checkUseOfPassiceVoice();

  grammar.checkDuplicateWords(); // -- functions that emphasis grammar rules

  grammar.useConsistentApostrophe(); // working

  grammar.avoidStartingWithConjunctions(); // working

  grammar.checkIncorrectContractions(); // working

  grammar.checkIncorrectPunctuationSpacing(); // working

  grammar.checkUseOfLongSentence(); // working x 2

  grammar.highlightInterjectionsWithoutPunctuations(); // working

  grammar.avoidRedundantConstruct();
  return grammar.getTextAndLog();
};
/**
 * @description A simple function that handles the input.
 */


var handleInput = function handleInput() {
  var text = $textArea.val(); // var language = $dropdown.val()
  // console.log(language);

  var _applyHighlights = applyHighlights(text),
      _applyHighlights2 = _slicedToArray(_applyHighlights, 2),
      highlightedText = _applyHighlights2[0],
      log = _applyHighlights2[1];

  $highlights.html(highlightedText);
  highlightLegends(log);
};

var highlightLegends = function highlightLegends(log) {
  var appendHTML = '';
  var def = "No grammatical errors found- you're good to go!";
  var prefix = "<tr><td scope='col'>";
  var suffix = '</td></tr>';

  if (log.length > 0) {
    log.forEach(function (element) {
      Object.keys(element).forEach(function (key) {
        appendHTML += prefix + '<div class=' + key + '>' + element[key] + '</div>' + suffix;
      });
    });
  } else {
    appendHTML = prefix + def + suffix;
  }

  $legendTableBody.html(appendHTML);
};
/**
 * @description A simple function that handles the scroll for textarea and highlight.
 */


var handleScroll = function handleScroll() {
  var scrollTop = $textArea.scrollTop();
  $backdrop.scrollTop(scrollTop);
  var scrollLeft = $textArea.scrollLeft();
  $backdrop.scrollLeft(scrollLeft);
};
/**
 * @description A simple function that binds all the events together.
 */


var bindEvents = function bindEvents() {
  $textArea.on({
    input: handleInput,
    scroll: handleScroll
  }); // $toggle.on('click', function () {
  //   $container.toggleClass('perspective')
  // })
  // console.log($dropdown.val());
  // $dropdown.on({
  //   change: handleInput,
  // })
};

bindEvents();
handleInput();

},{"./grammar.mjs":5}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = oxymoronList;

/**
 * @description
 * @returns All the 
 */
function oxymoronList() {
  return ['[act] [natural]', '[action] [plan]', '[additional] [reduction]', '[adult] [children]', '[all] [alone]', '[almost] [exactly]', '[Alone] [together]', '[altogether] [separate]', '[another] [one]', '[anxious] [patient]', '[apparently] [invisible]', '[assistant] [principal]', '[assisted] [suicide]'];
}

;

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = wordinessPhrases;

/**
 * Refer - https://web.uvic.ca/~gkblank/wordiness.html
 * Right now, this only consist of words starting with `A`
 * @returns All the list of wordiness phrases
 */
function wordinessPhrases() {
  return ['[absolutely] [essential]', '[above] [all] [else]', '[aforementioned]', '[a] [bigger | greater | higher | larger] [degree] [of]', '[a] [considerable] [amount] [of]', '[a] [decreased] [number] [of]', '[a] [distance] [of] [CARDINAL] [kilometers]', '[a] [lesser | smaller] [degree] [of]', '[a] [lot] [of]', '[a] [majority] [of]', '[a] [person] [who] [is] [ADJ]', '[a] [total] [of] [CARDINAL] [NOUN]', '[added] [bonus]', '[advance] [notice | reservations]', '[advance] [warning]', '[advance] [planning]', '[after] [all] [is | was] [said] [and] [done]', '[alike] [share]', '[all] [across]', '[all] [of]', '[all] [of] [a] [sudden]', '[all] [of] [these]', '[all] [time] [record]', '[all] [said]', '[almost] [never]', '[along] [the] [lines] [of]', '[any] [and] [all]', '[appears] [on] [the] [surface] [to] [be]', '[are | is] [such] [that]', '[are | was | were] [able] [to]', '[armed] [gunman]', '[assemble | attach] [together]', '[as] [a] [matter] [of] [fact]', '[as] [a] [means] [to]', '[as] [a] [result] [of]', '[as] [a] [whole]'];
}

;

},{}],9:[function(require,module,exports){
const transformers=new Array(1),constants=require("./constants.js");var tkSize=constants.tkSize,bits4lemma=constants.bits4lemma,posMask=constants.posMask;transformers[0]=function(t,itsUndefined,config,index){var normal,cache=config.rdd.cache,tokens=config.rdd.tokens,preserve=config.preserve,value=cache.value(tokens[index*tkSize]);return"string"==typeof t?t:preserve[value]?preserve[value]:!config.matchValue&&preserve[normal=cache.value(t)]?preserve[normal]:config.usePOS?cache.valueOf("pos",(tokens[index*tkSize+2]&posMask)>>>bits4lemma):config.matchValue?value:normal},module.exports=transformers;
},{"./constants.js":10}],10:[function(require,module,exports){
var consts=Object.create(null);consts.UNK=0,consts.bits4PrecedingSpace=16,consts.bits4lemma=20,consts.posMask=66060288,consts.psMask=65535,consts.xnMask=1073676288,consts.tkSize=4,consts.xpSize=4,consts.xcMask=31,consts.bits4xpPointer=14,consts.negationFlag=Math.pow(2,31),module.exports=consts;
},{}],11:[function(require,module,exports){
var tcat=require("./token-categories.js"),tcat2pos=new Array(tcat.list.length);tcat2pos.fill(0),tcat2pos[0]=17,tcat2pos[2]=9,tcat2pos[3]=15,tcat2pos[4]=15,tcat2pos[4]=15,tcat2pos[5]=12,tcat2pos[6]=15,tcat2pos[7]=15,tcat2pos[8]=15,tcat2pos[9]=15,tcat2pos[10]=11,tcat2pos[11]=15,tcat2pos[12]=13,tcat2pos[13]=15,tcat2pos[14]=14,tcat2pos[18]=9;var suffix2pos=Object.create(null);suffix2pos.ing=16,suffix2pos.ed=16,suffix2pos.ly=3,suffix2pos.able=1,suffix2pos.tish=1,suffix2pos.like=1,suffix2pos.ous=1,suffix2pos.ful=1,suffix2pos.ary=1,suffix2pos.less=1,suffix2pos.ier=1,suffix2pos.est=1,suffix2pos.fy=1,suffix2pos.ky=1,suffix2pos.es=8,suffix2pos.er=8,suffix2pos.or=8,suffix2pos.ity=8,suffix2pos.ion=8,suffix2pos.llah=12,suffix2pos.stan=12,suffix2pos.gton=12,suffix2pos.abad=12,suffix2pos.land=12,suffix2pos.pur=12,suffix2pos.tnam=12;var prefix2pos=Object.create(null);prefix2pos.anti=1,prefix2pos.post=1,prefix2pos.non=1,prefix2pos.cross=8;var feature=function(config,lang,featuresData,isLexicographer){const rgxLC=/^[a-z][a-z\-\–\—\.]*$/,rgxUC=/^[A-Z][A-Z\-\–\—\.]*$/,rgxTC=/^[A-Z][a-z\-\–\—\.]*$/;var i,rgxCatDetectors=[],regexes=lang?lang.trex.lex:null,imax=lang?regexes.length:0;const fd=featuresData;var methods=Object.create(null);for(i=0;i<imax;i+=1)rgxCatDetectors.push([new RegExp(regexes[i][0],regexes[i][1]),regexes[i][2]]);return methods.shape=function(word){return word.replace(/[A-Z]{4,}/g,"XXXX").replace(/[A-Z]/g,"X").replace(/[a-z]{4,}/g,"xxxx").replace(/[a-z]/g,"x").replace(/\d{4,}/g,"dddd").replace(/\d/g,"d")},methods.suffix=function(word){return word.slice(-config.suffix)},methods.prefix=function(word){return word.slice(0,config.prefix)},methods.lexeme=function(word){return word},methods.lexemeCID=function(word){return word},methods.isAbbrev=function(word){return/[a-z].*\.$/i.test(word)?1:0},methods.normal=function(word){const lcwHash=fd.lexeme.hash[word.toLowerCase()];if(void 0===lcwHash)return console.log("[41m%s[0m entry is missing! (feature.normal)",JSON.stringify(word.toLowerCase())),0;const offset=lcwHash-fd.lexeme.hash[word];if(offset<0||offset>3)throw new Error("feature.normal: offset of "+offset+" for "+JSON.stringify(word));return offset},methods.tokenType=function(word){var cat;for(cat=0;cat<rgxCatDetectors.length;cat+=1)if(rgxCatDetectors[cat][0].test(word))return rgxCatDetectors[cat][1];return console.log("[41m%s[0m has unknown token type! (feature.tokenType)",JSON.stringify(word)),tcat.hash.word},methods.pos=function(word,category,cache){if(isLexicographer){const tags=fd.pos.hash[word];return tags?lang.xpos.hash[tags&&1===tags.length?tags[0]:"UNK"]:lang.xpos.hash.UNK}var pos,wordInLC;if(category===tcat.hash.word){wordInLC=word.toLowerCase();const hash=cache.lookup(wordInLC)[0];if(hash<cache.intrinsicSize()){const posOfWLC=cache.posOf(hash);pos=rgxTC.test(word)&&8===posOfWLC?12:posOfWLC}else pos=function(word){if(!rgxLC.test(word))return 12;var wlc=word.toLowerCase();return suffix2pos[wlc.slice(-4)]||suffix2pos[wlc.slice(-3)]||suffix2pos[wlc.slice(-2)]||prefix2pos[wlc.slice(0,5)]||prefix2pos[wlc.slice(0,4)]||prefix2pos[wlc.slice(0,3)]||prefix2pos[wlc.slice(0,2)]||8}(word)}return pos||tcat2pos[category]||(rgxTC.test(word)?12:8)},methods.isSPoS=function(word){const tags=fd.pos.hash[word];return tags&&1===tags.length?1:0},methods.lemma=function(word){if(0===fd.lexeme.hash[word])return 0;const lmh=fd.lemma.hash[word];return void 0===lmh||void 0===fd.lexeme.hash[lmh[0]]?(console.log("[41m%s[0m entry is missing! (feature.lemma)",JSON.stringify(lmh[0])),0):fd.lexeme.hash[lmh[0]]},methods.isSLemma=function(word){if(0===fd.lexeme.hash[word])return 0;const lmh=fd.lemma.hash[word];return lmh&&fd.lexeme.hash[lmh[0]]&&1===lmh.length?1:0},methods.lutCase=function(word){return rgxLC.test(word)?1:rgxUC.test(word)?2:rgxTC.test(word)?3:0},methods};module.exports=feature;
},{"./token-categories.js":40}],12:[function(require,module,exports){
module.exports=[100,63,{"0":{" otherwise":0,"^":1,"ADV":33,"INTJ":34,"ADJ":35,"NOUN":36,"URL":37,"PROPN":38,"MENTION":39,"VERB":40,"HASHTAG":41,"ADP":42,"EMOTICON":43,"AUX":44,"EMOJI":45,"CCONJ":46,"EMAIL":47,"TIME":49,"PART":50,"PERCENT":51,"PRON":52,"ORDINAL":53,"SCONJ":54,"MONEY":55,"PUNCT":56,"DURATION":57,"NUM":58,"DATE":59,"SYM":60,"CARDINAL":61,"X":62,"DET":63},"1":{" otherwise":48,"ADV":2,"^":3,"SYM":4,"CARDINAL":5,"NUM":6,"DATE":7,"PUNCT":8,"DURATION":9,"SCONJ":10,"MONEY":11,"PRON":12,"ORDINAL":13,"PART":14,"PERCENT":15,"DET":16,"TIME":17,"CCONJ":18,"EMAIL":19,"AUX":20,"EMOJI":21,"ADP":22,"EMOTICON":23,"VERB":24,"HASHTAG":25,"PROPN":26,"MENTION":27,"NOUN":28,"URL":29,"INTJ":30,"ADJ":31,"X":32}},{"2":"ADV&","3":"^","4":"SYM&","5":"CARDINAL&","6":"NUM&","7":"DATE&","8":"PUNCT&","9":"DURATION&","10":"SCONJ&","11":"MONEY&","12":"PRON&","13":"ORDINAL&","14":"PART&","15":"PERCENT&","16":"DET&","17":"TIME&","18":"CCONJ&","19":"EMAIL&","20":"AUX&","21":"EMOJI&","22":"ADP&","23":"EMOTICON&","24":"VERB&","25":"HASHTAG&","26":"PROPN&","27":"MENTION&","28":"NOUN&","29":"URL&","30":"INTJ&","31":"ADJ&","32":"X&","33":"ADV","34":"INTJ","35":"ADJ","36":"NOUN","37":"URL","38":"PROPN","39":"MENTION","40":"VERB","41":"HASHTAG","42":"ADP","43":"EMOTICON","44":"AUX","45":"EMOJI","46":"CCONJ","47":"EMAIL","48":"","49":"TIME","50":"PART","51":"PERCENT","52":"PRON","53":"ORDINAL","54":"SCONJ","55":"MONEY","56":"PUNCT","57":"DURATION","58":"NUM","59":"DATE","60":"SYM","61":"CARDINAL","62":"X","63":"DET"},{},{"2":{"preserve":true},"3":{"preserve":true},"4":{"preserve":true},"5":{"preserve":true},"6":{"preserve":true},"7":{"preserve":true},"8":{"preserve":true},"9":{"preserve":true},"10":{"preserve":true},"11":{"preserve":true},"12":{"preserve":true},"13":{"preserve":true},"14":{"preserve":true},"15":{"preserve":true},"16":{"preserve":true},"17":{"preserve":true},"18":{"preserve":true},"19":{"preserve":true},"20":{"preserve":true},"21":{"preserve":true},"22":{"preserve":true},"23":{"preserve":true},"24":{"preserve":true},"25":{"preserve":true},"26":{"preserve":true},"27":{"preserve":true},"28":{"preserve":true},"29":{"preserve":true},"30":{"preserve":true},"31":{"preserve":true},"32":{"preserve":true},"33":{"preserve":false},"34":{"preserve":false},"35":{"preserve":false},"36":{"preserve":false},"37":{"preserve":false},"38":{"preserve":false},"39":{"preserve":false},"40":{"preserve":false},"41":{"preserve":false},"42":{"preserve":false},"43":{"preserve":false},"44":{"preserve":false},"45":{"preserve":false},"46":{"preserve":false},"47":{"preserve":false},"48":{"preserve":false},"49":{"preserve":false},"50":{"preserve":false},"51":{"preserve":false},"52":{"preserve":false},"53":{"preserve":false},"54":{"preserve":false},"55":{"preserve":false},"56":{"preserve":false},"57":{"preserve":false},"58":{"preserve":false},"59":{"preserve":false},"60":{"preserve":false},"61":{"preserve":false},"62":{"preserve":false},"63":{"preserve":false}}]

},{}],13:[function(require,module,exports){
},{}],14:[function(require,module,exports){
module.exports=["[100,127,{\"0\":{\"5\":111,\"43\":113,\"46\":108,\"49\":109,\"197\":110,\"214\":112,\"2661\":114,\"5177\":53,\"7410\":117,\"10779\":116,\"12417\":81,\"12421\":84,\"24604\":103,\"26662\":118,\"27487\":67,\"27488\":69,\"27489\":71,\"27492\":73,\"32007\":1,\"33823\":105,\"35824\":119,\"37305\":65,\"45293\":92,\"46493\":94,\"49377\":101,\"49641\":96,\"49644\":120,\"49955\":89,\"50237\":97,\"50508\":102,\"50616\":45,\"58180\":104,\"60751\":106,\"64138\":75,\"64139\":79,\"64143\":77,\"65201\":107,\"68997\":121,\"71161\":122,\"75291\":123,\"79335\":124,\"79347\":63,\"80184\":125,\"83015\":126,\"83589\":50,\"84293\":127,\"2070003\":0},\"1\":{\"47\":2,\"51\":26,\"49955\":34,\"84671\":10,\"84672\":18,\"2070003\":0},\"2\":{\"49955\":3,\"2070003\":0},\"3\":{\"47\":4,\"32007\":41,\"84671\":6,\"84672\":8,\"2070003\":0},\"4\":{\"32007\":5,\"2070003\":0},\"6\":{\"32007\":7,\"2070003\":0},\"8\":{\"32007\":9,\"2070003\":0},\"10\":{\"49955\":11,\"2070003\":0},\"11\":{\"47\":12,\"32007\":42,\"84671\":14,\"84672\":16,\"2070003\":0},\"12\":{\"32007\":13,\"2070003\":0},\"14\":{\"32007\":15,\"2070003\":0},\"16\":{\"32007\":17,\"2070003\":0},\"18\":{\"49955\":19,\"2070003\":0},\"19\":{\"47\":20,\"32007\":43,\"84671\":22,\"84672\":24,\"2070003\":0},\"20\":{\"32007\":21,\"2070003\":0},\"22\":{\"32007\":23,\"2070003\":0},\"24\":{\"32007\":25,\"2070003\":0},\"26\":{\"49955\":27,\"2070003\":0},\"27\":{\"47\":28,\"32007\":44,\"84671\":30,\"84672\":32,\"2070003\":0},\"28\":{\"32007\":29,\"2070003\":0},\"30\":{\"32007\":31,\"2070003\":0},\"32\":{\"32007\":33,\"2070003\":0},\"34\":{\"47\":35,\"32007\":62,\"84671\":37,\"84672\":39,\"2070003\":0},\"35\":{\"32007\":36,\"2070003\":0},\"37\":{\"32007\":38,\"2070003\":0},\"39\":{\"32007\":40,\"2070003\":0},\"45\":{\"12790\":48,\"40590\":88,\"51632\":87,\"75830\":46,\"2070003\":98},\"46\":{\"45825\":47,\"2070003\":0},\"48\":{\"36767\":49,\"2070003\":0},\"50\":{\"30604\":51,\"2070003\":100},\"51\":{\"1406\":52,\"2070003\":0},\"53\":{\"32167\":54,\"43452\":58,\"48182\":56,\"69374\":60,\"2070003\":115},\"54\":{\"5177\":55,\"2070003\":0},\"56\":{\"5177\":57,\"2070003\":0},\"58\":{\"5177\":59,\"2070003\":0},\"60\":{\"5177\":61,\"2070003\":0},\"63\":{\"75830\":64,\"2070003\":0},\"65\":{\"75830\":66,\"2070003\":0},\"67\":{\"75830\":68,\"2070003\":0},\"69\":{\"75830\":70,\"2070003\":0},\"71\":{\"75830\":72,\"2070003\":0},\"73\":{\"75830\":74,\"2070003\":0},\"75\":{\"52285\":76,\"2070003\":0},\"77\":{\"52285\":78,\"2070003\":0},\"79\":{\"52285\":80,\"2070003\":0},\"81\":{\"29527\":82,\"51345\":83,\"2070003\":0},\"84\":{\"29527\":85,\"51345\":86,\"2070003\":0},\"89\":{\"30604\":91,\"83689\":90,\"2070003\":99},\"92\":{\"50616\":93,\"2070003\":0},\"94\":{\"50616\":95,\"2070003\":0}},{\"5\":\"0\",\"7\":\"0\",\"9\":\"0\",\"13\":\"0\",\"15\":\"0\",\"17\":\"0\",\"21\":\"0\",\"23\":\"0\",\"25\":\"0\",\"29\":\"0\",\"31\":\"0\",\"33\":\"0\",\"36\":\"0\",\"38\":\"0\",\"40\":\"0\",\"41\":\"0\",\"42\":\"0\",\"43\":\"0\",\"44\":\"0\",\"47\":\"0\",\"49\":\"0\",\"52\":\"0\",\"55\":\"0\",\"57\":\"0\",\"59\":\"0\",\"61\":\"0\",\"62\":\"0\",\"64\":\"1\",\"66\":\"1\",\"68\":\"1\",\"70\":\"1\",\"72\":\"1\",\"74\":\"1\",\"76\":\"1\",\"78\":\"1\",\"80\":\"1\",\"82\":\"2\",\"83\":\"2\",\"85\":\"2\",\"86\":\"2\",\"87\":\"0\",\"88\":\"0\",\"90\":\"0\",\"91\":\"0\",\"93\":\"0\",\"95\":\"0\",\"96\":\"1\",\"97\":\"1\",\"98\":\"1\",\"99\":\"1\",\"100\":\"1\",\"101\":\"1\",\"102\":\"1\",\"103\":\"1\",\"104\":\"1\",\"105\":\"1\",\"106\":\"1\",\"107\":\"1\",\"108\":\"2\",\"109\":\"2\",\"110\":\"2\",\"111\":\"2\",\"112\":\"2\",\"113\":\"2\",\"114\":\"2\",\"115\":\"2\",\"116\":\"2\",\"117\":\"2\",\"118\":\"2\",\"119\":\"2\",\"120\":\"2\",\"121\":\"2\",\"122\":\"2\",\"123\":\"2\",\"124\":\"2\",\"125\":\"2\",\"126\":\"2\",\"127\":\"2\"},{},{}]"]
},{}],15:[function(require,module,exports){
module.exports=["[100,2126,{\"0\":{\"9\":1961,\"40\":1953,\"47\":1947,\"219\":1549,\"1812\":2095,\"3320\":1959,\"4125\":1886,\"7916\":1878,\"7963\":1876,\"7970\":1957,\"13781\":1916,\"17522\":1910,\"19315\":1528,\"23909\":1890,\"26503\":2094,\"26532\":1892,\"32167\":1874,\"33514\":1861,\"36767\":1888,\"44354\":1882,\"46381\":2041,\"46405\":2101,\"46416\":2102,\"46436\":2100,\"46457\":2099,\"46824\":1884,\"47869\":2093,\"49799\":2097,\"49955\":1880,\"50501\":2096,\"60084\":1853,\"60555\":1908,\"67851\":1872,\"74816\":1935,\"74868\":1870,\"76008\":2098,\"84230\":1955,\"84671\":1949,\"84672\":1951,\"1080001\":753,\"1080002\":758,\"1080003\":1098,\"1080004\":1,\"1080005\":2084,\"1080006\":2085,\"1080007\":2086,\"1080008\":2087,\"1080009\":2088,\"1080011\":2089,\"1080012\":2090,\"1080013\":8,\"1080014\":1639,\"1080015\":457,\"1080016\":464,\"1080017\":743,\"1080018\":748,\"1080019\":1580,\"1080020\":1193,\"1080021\":2104,\"1080022\":2105,\"1080023\":2106,\"1080024\":2107,\"1080025\":2108,\"1080026\":2113,\"1080027\":2073,\"1080028\":2065,\"1080029\":1963,\"1080030\":2066,\"1080031\":2069,\"1080032\":1075,\"1080033\":2067,\"1080036\":2112,\"1080037\":1538,\"1080039\":1506,\"1080040\":1912,\"1080041\":1533,\"1080042\":2071,\"1080043\":15,\"1080044\":2109,\"1080045\":1593,\"1080046\":1596,\"1080047\":2082,\"1080048\":1240,\"1080049\":2068,\"1080051\":529,\"1080052\":2121,\"1080053\":2122,\"1080054\":2123,\"1080055\":2124,\"1080056\":2125,\"1080057\":2126,\"2070003\":0},\"1\":{\"1080014\":2,\"2070003\":2083},\"2\":{\"51345\":3,\"2070003\":0},\"3\":{\"19315\":1126,\"74868\":4,\"1080032\":447,\"1080037\":1127,\"1080045\":1124,\"2070003\":0},\"4\":{\"19315\":450,\"1080032\":5,\"1080037\":451,\"2070003\":0},\"5\":{\"19315\":6,\"1080037\":7,\"2070003\":0},\"8\":{\"47\":1542,\"12716\":1079,\"84671\":1544,\"84672\":1546,\"1080014\":9,\"2070003\":2091},\"9\":{\"51345\":10,\"2070003\":0},\"10\":{\"19315\":1128,\"74868\":11,\"1080032\":452,\"1080037\":1129,\"1080045\":1125,\"2070003\":0},\"11\":{\"19315\":455,\"1080032\":12,\"1080037\":456,\"2070003\":0},\"12\":{\"19315\":13,\"1080037\":14,\"2070003\":0},\"15\":{\"33514\":1414,\"60084\":1406,\"1080001\":187,\"1080002\":192,\"1080003\":439,\"1080014\":1130,\"1080015\":16,\"1080016\":23,\"1080017\":177,\"1080018\":182,\"1080048\":525,\"1080051\":42,\"2070003\":2110},\"16\":{\"219\":471,\"3320\":17,\"46849\":991,\"50951\":1841,\"53018\":1842,\"1080014\":30,\"1080034\":169,\"2070003\":0},\"17\":{\"219\":18,\"1080014\":476,\"2070003\":0},\"18\":{\"1080014\":19,\"2070003\":0},\"19\":{\"1080022\":20,\"1080023\":21,\"1080024\":22,\"2070003\":480},\"23\":{\"219\":481,\"3320\":24,\"46849\":1005,\"50951\":1843,\"53018\":1844,\"1080014\":36,\"1080034\":173,\"2070003\":0},\"24\":{\"219\":25,\"1080014\":486,\"2070003\":0},\"25\":{\"1080014\":26,\"2070003\":0},\"26\":{\"1080022\":27,\"1080023\":28,\"1080024\":29,\"2070003\":490},\"30\":{\"219\":503,\"51345\":31,\"1080022\":1179,\"1080023\":1180,\"1080024\":1181,\"2070003\":1657},\"31\":{\"219\":32,\"1080022\":507,\"1080023\":508,\"1080024\":509,\"2070003\":0},\"32\":{\"1080022\":33,\"1080023\":34,\"1080024\":35,\"2070003\":0},\"36\":{\"219\":510,\"51345\":37,\"1080022\":1182,\"1080023\":1183,\"1080024\":1184,\"2070003\":1658},\"37\":{\"219\":38,\"1080022\":514,\"1080023\":515,\"1080024\":516,\"2070003\":0},\"38\":{\"1080022\":39,\"1080023\":40,\"1080024\":41,\"2070003\":0},\"42\":{\"1469\":1747,\"2191\":705,\"5495\":1742,\"5671\":730,\"10111\":542,\"12499\":1748,\"12665\":720,\"18386\":1743,\"23998\":725,\"24243\":1746,\"26181\":1741,\"31979\":1737,\"34054\":700,\"35744\":43,\"35749\":47,\"37852\":557,\"39834\":1738,\"45372\":1744,\"48070\":715,\"48176\":1739,\"53050\":710,\"54276\":1745,\"59285\":1740,\"80639\":1736,\"1080034\":51,\"2070003\":0},\"43\":{\"1469\":1212,\"2191\":69,\"5495\":1207,\"5671\":94,\"10111\":44,\"12499\":1213,\"12665\":84,\"18386\":1208,\"23998\":89,\"24243\":1211,\"26181\":1206,\"31979\":1202,\"34054\":64,\"37852\":55,\"39834\":1203,\"45372\":1209,\"48070\":79,\"48176\":1204,\"53050\":74,\"54276\":1210,\"59285\":1205,\"80639\":1201,\"2070003\":1733},\"44\":{\"1080033\":45,\"2070003\":0},\"45\":{\"75640\":46,\"2070003\":0},\"47\":{\"1469\":1225,\"2191\":104,\"5495\":1220,\"5671\":129,\"10111\":48,\"12499\":1226,\"12665\":119,\"18386\":1221,\"23998\":124,\"24243\":1224,\"26181\":1219,\"31979\":1215,\"34054\":99,\"37852\":58,\"39834\":1216,\"45372\":1222,\"48070\":114,\"48176\":1217,\"53050\":109,\"54276\":1223,\"59285\":1218,\"80639\":1214,\"2070003\":1734},\"48\":{\"1080033\":49,\"2070003\":0},\"49\":{\"75640\":50,\"2070003\":0},\"51\":{\"1469\":1238,\"2191\":139,\"5495\":1233,\"5671\":164,\"10111\":52,\"12499\":1239,\"12665\":154,\"18386\":1234,\"23998\":159,\"24243\":1237,\"26181\":1232,\"31979\":1228,\"34054\":134,\"37852\":61,\"39834\":1229,\"45372\":1235,\"48070\":149,\"48176\":1230,\"53050\":144,\"54276\":1236,\"59285\":1231,\"80639\":1227,\"2070003\":1735},\"52\":{\"1080033\":53,\"2070003\":0},\"53\":{\"75640\":54,\"2070003\":0},\"55\":{\"70709\":56,\"2070003\":0},\"56\":{\"75640\":57,\"2070003\":0},\"58\":{\"70709\":59,\"2070003\":0},\"59\":{\"75640\":60,\"2070003\":0},\"61\":{\"70709\":62,\"2070003\":0},\"62\":{\"75640\":63,\"2070003\":0},\"64\":{\"19327\":67,\"70709\":65,\"2070003\":0},\"65\":{\"75640\":66,\"2070003\":0},\"67\":{\"75640\":68,\"2070003\":0},\"69\":{\"19327\":72,\"70709\":70,\"2070003\":0},\"70\":{\"75640\":71,\"2070003\":0},\"72\":{\"75640\":73,\"2070003\":0},\"74\":{\"19327\":77,\"70709\":75,\"2070003\":0},\"75\":{\"75640\":76,\"2070003\":0},\"77\":{\"75640\":78,\"2070003\":0},\"79\":{\"19327\":82,\"70709\":80,\"2070003\":0},\"80\":{\"75640\":81,\"2070003\":0},\"82\":{\"75640\":83,\"2070003\":0},\"84\":{\"19327\":87,\"70709\":85,\"2070003\":0},\"85\":{\"75640\":86,\"2070003\":0},\"87\":{\"75640\":88,\"2070003\":0},\"89\":{\"19327\":92,\"70709\":90,\"2070003\":0},\"90\":{\"75640\":91,\"2070003\":0},\"92\":{\"75640\":93,\"2070003\":0},\"94\":{\"19327\":97,\"70709\":95,\"2070003\":0},\"95\":{\"75640\":96,\"2070003\":0},\"97\":{\"75640\":98,\"2070003\":0},\"99\":{\"19327\":102,\"70709\":100,\"2070003\":0},\"100\":{\"75640\":101,\"2070003\":0},\"102\":{\"75640\":103,\"2070003\":0},\"104\":{\"19327\":107,\"70709\":105,\"2070003\":0},\"105\":{\"75640\":106,\"2070003\":0},\"107\":{\"75640\":108,\"2070003\":0},\"109\":{\"19327\":112,\"70709\":110,\"2070003\":0},\"110\":{\"75640\":111,\"2070003\":0},\"112\":{\"75640\":113,\"2070003\":0},\"114\":{\"19327\":117,\"70709\":115,\"2070003\":0},\"115\":{\"75640\":116,\"2070003\":0},\"117\":{\"75640\":118,\"2070003\":0},\"119\":{\"19327\":122,\"70709\":120,\"2070003\":0},\"120\":{\"75640\":121,\"2070003\":0},\"122\":{\"75640\":123,\"2070003\":0},\"124\":{\"19327\":127,\"70709\":125,\"2070003\":0},\"125\":{\"75640\":126,\"2070003\":0},\"127\":{\"75640\":128,\"2070003\":0},\"129\":{\"19327\":132,\"70709\":130,\"2070003\":0},\"130\":{\"75640\":131,\"2070003\":0},\"132\":{\"75640\":133,\"2070003\":0},\"134\":{\"19327\":137,\"70709\":135,\"2070003\":0},\"135\":{\"75640\":136,\"2070003\":0},\"137\":{\"75640\":138,\"2070003\":0},\"139\":{\"19327\":142,\"70709\":140,\"2070003\":0},\"140\":{\"75640\":141,\"2070003\":0},\"142\":{\"75640\":143,\"2070003\":0},\"144\":{\"19327\":147,\"70709\":145,\"2070003\":0},\"145\":{\"75640\":146,\"2070003\":0},\"147\":{\"75640\":148,\"2070003\":0},\"149\":{\"19327\":152,\"70709\":150,\"2070003\":0},\"150\":{\"75640\":151,\"2070003\":0},\"152\":{\"75640\":153,\"2070003\":0},\"154\":{\"19327\":157,\"70709\":155,\"2070003\":0},\"155\":{\"75640\":156,\"2070003\":0},\"157\":{\"75640\":158,\"2070003\":0},\"159\":{\"19327\":162,\"70709\":160,\"2070003\":0},\"160\":{\"75640\":161,\"2070003\":0},\"162\":{\"75640\":163,\"2070003\":0},\"164\":{\"19327\":167,\"70709\":165,\"2070003\":0},\"165\":{\"75640\":166,\"2070003\":0},\"167\":{\"75640\":168,\"2070003\":0},\"169\":{\"1469\":1339,\"2191\":220,\"5495\":1334,\"5671\":245,\"10111\":170,\"12499\":1340,\"12665\":235,\"18386\":1335,\"23998\":240,\"24243\":1338,\"26181\":1333,\"31979\":1329,\"34054\":215,\"37852\":197,\"39834\":1330,\"45372\":1336,\"48070\":230,\"48176\":1331,\"53050\":225,\"54276\":1337,\"59285\":1332,\"80639\":1328,\"2070003\":1835},\"170\":{\"1080033\":171,\"2070003\":0},\"171\":{\"75640\":172,\"2070003\":0},\"173\":{\"1469\":1352,\"2191\":255,\"5495\":1347,\"5671\":280,\"10111\":174,\"12499\":1353,\"12665\":270,\"18386\":1348,\"23998\":275,\"24243\":1351,\"26181\":1346,\"31979\":1342,\"34054\":250,\"37852\":200,\"39834\":1343,\"45372\":1349,\"48070\":265,\"48176\":1344,\"53050\":260,\"54276\":1350,\"59285\":1345,\"80639\":1341,\"2070003\":1836},\"174\":{\"1080033\":175,\"2070003\":0},\"175\":{\"75640\":176,\"2070003\":0},\"177\":{\"46849\":1019,\"50951\":1845,\"53018\":1846,\"1080034\":178,\"2070003\":0},\"178\":{\"1469\":1365,\"2191\":290,\"5495\":1360,\"5671\":315,\"10111\":179,\"12499\":1366,\"12665\":305,\"18386\":1361,\"23998\":310,\"24243\":1364,\"26181\":1359,\"31979\":1355,\"34054\":285,\"37852\":203,\"39834\":1356,\"45372\":1362,\"48070\":300,\"48176\":1357,\"53050\":295,\"54276\":1363,\"59285\":1358,\"80639\":1354,\"2070003\":1837},\"179\":{\"1080033\":180,\"2070003\":0},\"180\":{\"75640\":181,\"2070003\":0},\"182\":{\"46849\":1033,\"50951\":1847,\"53018\":1848,\"1080034\":183,\"2070003\":0},\"183\":{\"1469\":1378,\"2191\":325,\"5495\":1373,\"5671\":350,\"10111\":184,\"12499\":1379,\"12665\":340,\"18386\":1374,\"23998\":345,\"24243\":1377,\"26181\":1372,\"31979\":1368,\"34054\":320,\"37852\":206,\"39834\":1369,\"45372\":1375,\"48070\":335,\"48176\":1370,\"53050\":330,\"54276\":1376,\"59285\":1371,\"80639\":1367,\"2070003\":1838},\"184\":{\"1080033\":185,\"2070003\":0},\"185\":{\"75640\":186,\"2070003\":0},\"187\":{\"47\":425,\"19315\":1106,\"46849\":1047,\"50951\":1849,\"53018\":1850,\"1080034\":188,\"1080036\":1110,\"1080037\":1108,\"2070003\":0},\"188\":{\"1469\":1391,\"2191\":360,\"5495\":1386,\"5671\":385,\"10111\":189,\"12499\":1392,\"12665\":375,\"18386\":1387,\"23998\":380,\"24243\":1390,\"26181\":1385,\"31979\":1381,\"34054\":355,\"37852\":209,\"39834\":1382,\"45372\":1388,\"48070\":370,\"48176\":1383,\"53050\":365,\"54276\":1389,\"59285\":1384,\"80639\":1380,\"2070003\":1839},\"189\":{\"1080033\":190,\"2070003\":0},\"190\":{\"75640\":191,\"2070003\":0},\"192\":{\"47\":432,\"19315\":1112,\"46849\":1061,\"50951\":1851,\"53018\":1852,\"1080034\":193,\"1080036\":1116,\"1080037\":1114,\"2070003\":0},\"193\":{\"1469\":1404,\"2191\":395,\"5495\":1399,\"5671\":420,\"10111\":194,\"12499\":1405,\"12665\":410,\"18386\":1400,\"23998\":415,\"24243\":1403,\"26181\":1398,\"31979\":1394,\"34054\":390,\"37852\":212,\"39834\":1395,\"45372\":1401,\"48070\":405,\"48176\":1396,\"53050\":400,\"54276\":1402,\"59285\":1397,\"80639\":1393,\"2070003\":1840},\"194\":{\"1080033\":195,\"2070003\":0},\"195\":{\"75640\":196,\"2070003\":0},\"197\":{\"70709\":198,\"2070003\":0},\"198\":{\"75640\":199,\"2070003\":0},\"200\":{\"70709\":201,\"2070003\":0},\"201\":{\"75640\":202,\"2070003\":0},\"203\":{\"70709\":204,\"2070003\":0},\"204\":{\"75640\":205,\"2070003\":0},\"206\":{\"70709\":207,\"2070003\":0},\"207\":{\"75640\":208,\"2070003\":0},\"209\":{\"70709\":210,\"2070003\":0},\"210\":{\"75640\":211,\"2070003\":0},\"212\":{\"70709\":213,\"2070003\":0},\"213\":{\"75640\":214,\"2070003\":0},\"215\":{\"19327\":218,\"70709\":216,\"2070003\":0},\"216\":{\"75640\":217,\"2070003\":0},\"218\":{\"75640\":219,\"2070003\":0},\"220\":{\"19327\":223,\"70709\":221,\"2070003\":0},\"221\":{\"75640\":222,\"2070003\":0},\"223\":{\"75640\":224,\"2070003\":0},\"225\":{\"19327\":228,\"70709\":226,\"2070003\":0},\"226\":{\"75640\":227,\"2070003\":0},\"228\":{\"75640\":229,\"2070003\":0},\"230\":{\"19327\":233,\"70709\":231,\"2070003\":0},\"231\":{\"75640\":232,\"2070003\":0},\"233\":{\"75640\":234,\"2070003\":0},\"235\":{\"19327\":238,\"70709\":236,\"2070003\":0},\"236\":{\"75640\":237,\"2070003\":0},\"238\":{\"75640\":239,\"2070003\":0},\"240\":{\"19327\":243,\"70709\":241,\"2070003\":0},\"241\":{\"75640\":242,\"2070003\":0},\"243\":{\"75640\":244,\"2070003\":0},\"245\":{\"19327\":248,\"70709\":246,\"2070003\":0},\"246\":{\"75640\":247,\"2070003\":0},\"248\":{\"75640\":249,\"2070003\":0},\"250\":{\"19327\":253,\"70709\":251,\"2070003\":0},\"251\":{\"75640\":252,\"2070003\":0},\"253\":{\"75640\":254,\"2070003\":0},\"255\":{\"19327\":258,\"70709\":256,\"2070003\":0},\"256\":{\"75640\":257,\"2070003\":0},\"258\":{\"75640\":259,\"2070003\":0},\"260\":{\"19327\":263,\"70709\":261,\"2070003\":0},\"261\":{\"75640\":262,\"2070003\":0},\"263\":{\"75640\":264,\"2070003\":0},\"265\":{\"19327\":268,\"70709\":266,\"2070003\":0},\"266\":{\"75640\":267,\"2070003\":0},\"268\":{\"75640\":269,\"2070003\":0},\"270\":{\"19327\":273,\"70709\":271,\"2070003\":0},\"271\":{\"75640\":272,\"2070003\":0},\"273\":{\"75640\":274,\"2070003\":0},\"275\":{\"19327\":278,\"70709\":276,\"2070003\":0},\"276\":{\"75640\":277,\"2070003\":0},\"278\":{\"75640\":279,\"2070003\":0},\"280\":{\"19327\":283,\"70709\":281,\"2070003\":0},\"281\":{\"75640\":282,\"2070003\":0},\"283\":{\"75640\":284,\"2070003\":0},\"285\":{\"19327\":288,\"70709\":286,\"2070003\":0},\"286\":{\"75640\":287,\"2070003\":0},\"288\":{\"75640\":289,\"2070003\":0},\"290\":{\"19327\":293,\"70709\":291,\"2070003\":0},\"291\":{\"75640\":292,\"2070003\":0},\"293\":{\"75640\":294,\"2070003\":0},\"295\":{\"19327\":298,\"70709\":296,\"2070003\":0},\"296\":{\"75640\":297,\"2070003\":0},\"298\":{\"75640\":299,\"2070003\":0},\"300\":{\"19327\":303,\"70709\":301,\"2070003\":0},\"301\":{\"75640\":302,\"2070003\":0},\"303\":{\"75640\":304,\"2070003\":0},\"305\":{\"19327\":308,\"70709\":306,\"2070003\":0},\"306\":{\"75640\":307,\"2070003\":0},\"308\":{\"75640\":309,\"2070003\":0},\"310\":{\"19327\":313,\"70709\":311,\"2070003\":0},\"311\":{\"75640\":312,\"2070003\":0},\"313\":{\"75640\":314,\"2070003\":0},\"315\":{\"19327\":318,\"70709\":316,\"2070003\":0},\"316\":{\"75640\":317,\"2070003\":0},\"318\":{\"75640\":319,\"2070003\":0},\"320\":{\"19327\":323,\"70709\":321,\"2070003\":0},\"321\":{\"75640\":322,\"2070003\":0},\"323\":{\"75640\":324,\"2070003\":0},\"325\":{\"19327\":328,\"70709\":326,\"2070003\":0},\"326\":{\"75640\":327,\"2070003\":0},\"328\":{\"75640\":329,\"2070003\":0},\"330\":{\"19327\":333,\"70709\":331,\"2070003\":0},\"331\":{\"75640\":332,\"2070003\":0},\"333\":{\"75640\":334,\"2070003\":0},\"335\":{\"19327\":338,\"70709\":336,\"2070003\":0},\"336\":{\"75640\":337,\"2070003\":0},\"338\":{\"75640\":339,\"2070003\":0},\"340\":{\"19327\":343,\"70709\":341,\"2070003\":0},\"341\":{\"75640\":342,\"2070003\":0},\"343\":{\"75640\":344,\"2070003\":0},\"345\":{\"19327\":348,\"70709\":346,\"2070003\":0},\"346\":{\"75640\":347,\"2070003\":0},\"348\":{\"75640\":349,\"2070003\":0},\"350\":{\"19327\":353,\"70709\":351,\"2070003\":0},\"351\":{\"75640\":352,\"2070003\":0},\"353\":{\"75640\":354,\"2070003\":0},\"355\":{\"19327\":358,\"70709\":356,\"2070003\":0},\"356\":{\"75640\":357,\"2070003\":0},\"358\":{\"75640\":359,\"2070003\":0},\"360\":{\"19327\":363,\"70709\":361,\"2070003\":0},\"361\":{\"75640\":362,\"2070003\":0},\"363\":{\"75640\":364,\"2070003\":0},\"365\":{\"19327\":368,\"70709\":366,\"2070003\":0},\"366\":{\"75640\":367,\"2070003\":0},\"368\":{\"75640\":369,\"2070003\":0},\"370\":{\"19327\":373,\"70709\":371,\"2070003\":0},\"371\":{\"75640\":372,\"2070003\":0},\"373\":{\"75640\":374,\"2070003\":0},\"375\":{\"19327\":378,\"70709\":376,\"2070003\":0},\"376\":{\"75640\":377,\"2070003\":0},\"378\":{\"75640\":379,\"2070003\":0},\"380\":{\"19327\":383,\"70709\":381,\"2070003\":0},\"381\":{\"75640\":382,\"2070003\":0},\"383\":{\"75640\":384,\"2070003\":0},\"385\":{\"19327\":388,\"70709\":386,\"2070003\":0},\"386\":{\"75640\":387,\"2070003\":0},\"388\":{\"75640\":389,\"2070003\":0},\"390\":{\"19327\":393,\"70709\":391,\"2070003\":0},\"391\":{\"75640\":392,\"2070003\":0},\"393\":{\"75640\":394,\"2070003\":0},\"395\":{\"19327\":398,\"70709\":396,\"2070003\":0},\"396\":{\"75640\":397,\"2070003\":0},\"398\":{\"75640\":399,\"2070003\":0},\"400\":{\"19327\":403,\"70709\":401,\"2070003\":0},\"401\":{\"75640\":402,\"2070003\":0},\"403\":{\"75640\":404,\"2070003\":0},\"405\":{\"19327\":408,\"70709\":406,\"2070003\":0},\"406\":{\"75640\":407,\"2070003\":0},\"408\":{\"75640\":409,\"2070003\":0},\"410\":{\"19327\":413,\"70709\":411,\"2070003\":0},\"411\":{\"75640\":412,\"2070003\":0},\"413\":{\"75640\":414,\"2070003\":0},\"415\":{\"19327\":418,\"70709\":416,\"2070003\":0},\"416\":{\"75640\":417,\"2070003\":0},\"418\":{\"75640\":419,\"2070003\":0},\"420\":{\"19327\":423,\"70709\":421,\"2070003\":0},\"421\":{\"75640\":422,\"2070003\":0},\"423\":{\"75640\":424,\"2070003\":0},\"425\":{\"19315\":426,\"1080036\":430,\"1080037\":428,\"2070003\":0},\"426\":{\"1948\":427,\"2070003\":0},\"428\":{\"1948\":429,\"2070003\":0},\"430\":{\"1948\":431,\"2070003\":0},\"432\":{\"19315\":433,\"1080036\":437,\"1080037\":435,\"2070003\":0},\"433\":{\"1948\":434,\"2070003\":0},\"435\":{\"1948\":436,\"2070003\":0},\"437\":{\"1948\":438,\"2070003\":0},\"439\":{\"47\":440,\"19315\":1118,\"1080036\":1122,\"1080037\":1120,\"2070003\":0},\"440\":{\"19315\":441,\"1080036\":445,\"1080037\":443,\"2070003\":0},\"441\":{\"1948\":442,\"2070003\":0},\"443\":{\"1948\":444,\"2070003\":0},\"445\":{\"1948\":446,\"2070003\":0},\"447\":{\"19315\":448,\"1080037\":449,\"2070003\":0},\"452\":{\"19315\":453,\"1080037\":454,\"2070003\":0},\"457\":{\"219\":1135,\"3320\":458,\"11361\":1899,\"17346\":1900,\"19315\":1556,\"33932\":1901,\"39717\":1894,\"46849\":1422,\"48540\":1896,\"50951\":2053,\"53018\":2054,\"67379\":1895,\"83367\":1898,\"83916\":1897,\"1080014\":491,\"1080020\":517,\"1080021\":1970,\"1080034\":735,\"1080036\":1560,\"1080037\":1558,\"2070003\":2074},\"458\":{\"219\":459,\"1080014\":1140,\"2070003\":0},\"459\":{\"1080014\":460,\"2070003\":0},\"460\":{\"1080022\":461,\"1080023\":462,\"1080024\":463,\"2070003\":1144},\"464\":{\"219\":1145,\"3320\":465,\"19315\":1562,\"46849\":1436,\"50951\":2055,\"53018\":2056,\"1080014\":497,\"1080020\":521,\"1080021\":1971,\"1080034\":739,\"1080036\":1566,\"1080037\":1564,\"2070003\":2075},\"465\":{\"219\":466,\"1080014\":1150,\"2070003\":0},\"466\":{\"1080014\":467,\"2070003\":0},\"467\":{\"1080022\":468,\"1080023\":469,\"1080024\":470,\"2070003\":1154},\"471\":{\"1080014\":472,\"2070003\":0},\"472\":{\"1080022\":473,\"1080023\":474,\"1080024\":475,\"2070003\":1158},\"476\":{\"1080022\":477,\"1080023\":478,\"1080024\":479,\"2070003\":1159},\"481\":{\"1080014\":482,\"2070003\":0},\"482\":{\"1080022\":483,\"1080023\":484,\"1080024\":485,\"2070003\":1163},\"486\":{\"1080022\":487,\"1080023\":488,\"1080024\":489,\"2070003\":1164},\"491\":{\"219\":1165,\"51345\":492,\"1080022\":1659,\"1080023\":1660,\"1080024\":1661,\"2070003\":1981},\"492\":{\"219\":493,\"1080022\":1169,\"1080023\":1170,\"1080024\":1171,\"2070003\":0},\"493\":{\"1080022\":494,\"1080023\":495,\"1080024\":496,\"2070003\":0},\"497\":{\"219\":1172,\"51345\":498,\"1080022\":1662,\"1080023\":1663,\"1080024\":1664,\"2070003\":1982},\"498\":{\"219\":499,\"1080022\":1176,\"1080023\":1177,\"1080024\":1178,\"2070003\":0},\"499\":{\"1080022\":500,\"1080023\":501,\"1080024\":502,\"2070003\":0},\"503\":{\"1080022\":504,\"1080023\":505,\"1080024\":506,\"2070003\":0},\"510\":{\"1080022\":511,\"1080023\":512,\"1080024\":513,\"2070003\":0},\"517\":{\"3320\":518,\"1080004\":1671,\"1080005\":1672,\"1080006\":1673,\"1080007\":1674,\"1080019\":1197,\"1080021\":1637,\"2070003\":1967},\"518\":{\"1080004\":1185,\"1080005\":1186,\"1080006\":1187,\"1080007\":1188,\"1080019\":519,\"2070003\":0},\"519\":{\"1080004\":520,\"2070003\":0},\"521\":{\"3320\":522,\"1080004\":1675,\"1080005\":1676,\"1080006\":1677,\"1080007\":1678,\"1080019\":1199,\"1080021\":1638,\"2070003\":1968},\"522\":{\"1080004\":1189,\"1080005\":1190,\"1080006\":1191,\"1080007\":1192,\"1080019\":523,\"2070003\":0},\"523\":{\"1080004\":524,\"2070003\":0},\"525\":{\"1469\":1692,\"2191\":565,\"5495\":1687,\"5671\":590,\"10111\":526,\"12499\":1693,\"12665\":580,\"18386\":1688,\"23998\":585,\"24243\":1691,\"26181\":1686,\"31979\":1682,\"34054\":560,\"37852\":545,\"39834\":1683,\"45372\":1689,\"48070\":575,\"48176\":1684,\"53050\":570,\"54276\":1690,\"59285\":1685,\"80639\":1681,\"2070003\":2016},\"526\":{\"1080033\":527,\"2070003\":0},\"527\":{\"75640\":528,\"2070003\":0},\"529\":{\"1469\":2031,\"2191\":1293,\"5495\":2026,\"5671\":1318,\"10111\":1244,\"12499\":2032,\"12665\":1308,\"18386\":2027,\"23998\":1313,\"24243\":2030,\"26181\":2025,\"31979\":2021,\"34054\":1288,\"35744\":530,\"35749\":534,\"37852\":1250,\"39834\":2022,\"45372\":2028,\"48070\":1303,\"48176\":2023,\"53050\":1298,\"54276\":2029,\"59285\":2024,\"80639\":2020,\"1080034\":538,\"2070003\":0},\"530\":{\"1469\":1705,\"2191\":600,\"5495\":1700,\"5671\":625,\"10111\":531,\"12499\":1706,\"12665\":615,\"18386\":1701,\"23998\":620,\"24243\":1704,\"26181\":1699,\"31979\":1695,\"34054\":595,\"37852\":548,\"39834\":1696,\"45372\":1702,\"48070\":610,\"48176\":1697,\"53050\":605,\"54276\":1703,\"59285\":1698,\"80639\":1694,\"2070003\":2017},\"531\":{\"1080033\":532,\"2070003\":0},\"532\":{\"75640\":533,\"2070003\":0},\"534\":{\"1469\":1718,\"2191\":635,\"5495\":1713,\"5671\":660,\"10111\":535,\"12499\":1719,\"12665\":650,\"18386\":1714,\"23998\":655,\"24243\":1717,\"26181\":1712,\"31979\":1708,\"34054\":630,\"37852\":551,\"39834\":1709,\"45372\":1715,\"48070\":645,\"48176\":1710,\"53050\":640,\"54276\":1716,\"59285\":1711,\"80639\":1707,\"2070003\":2018},\"535\":{\"1080033\":536,\"2070003\":0},\"536\":{\"75640\":537,\"2070003\":0},\"538\":{\"1469\":1731,\"2191\":670,\"5495\":1726,\"5671\":695,\"10111\":539,\"12499\":1732,\"12665\":685,\"18386\":1727,\"23998\":690,\"24243\":1730,\"26181\":1725,\"31979\":1721,\"34054\":665,\"37852\":554,\"39834\":1722,\"45372\":1728,\"48070\":680,\"48176\":1723,\"53050\":675,\"54276\":1729,\"59285\":1724,\"80639\":1720,\"2070003\":2019},\"539\":{\"1080033\":540,\"2070003\":0},\"540\":{\"75640\":541,\"2070003\":0},\"542\":{\"1080033\":543,\"2070003\":0},\"543\":{\"75640\":544,\"2070003\":0},\"545\":{\"70709\":546,\"2070003\":0},\"546\":{\"75640\":547,\"2070003\":0},\"548\":{\"70709\":549,\"2070003\":0},\"549\":{\"75640\":550,\"2070003\":0},\"551\":{\"70709\":552,\"2070003\":0},\"552\":{\"75640\":553,\"2070003\":0},\"554\":{\"70709\":555,\"2070003\":0},\"555\":{\"75640\":556,\"2070003\":0},\"557\":{\"70709\":558,\"2070003\":0},\"558\":{\"75640\":559,\"2070003\":0},\"560\":{\"19327\":563,\"70709\":561,\"2070003\":0},\"561\":{\"75640\":562,\"2070003\":0},\"563\":{\"75640\":564,\"2070003\":0},\"565\":{\"19327\":568,\"70709\":566,\"2070003\":0},\"566\":{\"75640\":567,\"2070003\":0},\"568\":{\"75640\":569,\"2070003\":0},\"570\":{\"19327\":573,\"70709\":571,\"2070003\":0},\"571\":{\"75640\":572,\"2070003\":0},\"573\":{\"75640\":574,\"2070003\":0},\"575\":{\"19327\":578,\"70709\":576,\"2070003\":0},\"576\":{\"75640\":577,\"2070003\":0},\"578\":{\"75640\":579,\"2070003\":0},\"580\":{\"19327\":583,\"70709\":581,\"2070003\":0},\"581\":{\"75640\":582,\"2070003\":0},\"583\":{\"75640\":584,\"2070003\":0},\"585\":{\"19327\":588,\"70709\":586,\"2070003\":0},\"586\":{\"75640\":587,\"2070003\":0},\"588\":{\"75640\":589,\"2070003\":0},\"590\":{\"19327\":593,\"70709\":591,\"2070003\":0},\"591\":{\"75640\":592,\"2070003\":0},\"593\":{\"75640\":594,\"2070003\":0},\"595\":{\"19327\":598,\"70709\":596,\"2070003\":0},\"596\":{\"75640\":597,\"2070003\":0},\"598\":{\"75640\":599,\"2070003\":0},\"600\":{\"19327\":603,\"70709\":601,\"2070003\":0},\"601\":{\"75640\":602,\"2070003\":0},\"603\":{\"75640\":604,\"2070003\":0},\"605\":{\"19327\":608,\"70709\":606,\"2070003\":0},\"606\":{\"75640\":607,\"2070003\":0},\"608\":{\"75640\":609,\"2070003\":0},\"610\":{\"19327\":613,\"70709\":611,\"2070003\":0},\"611\":{\"75640\":612,\"2070003\":0},\"613\":{\"75640\":614,\"2070003\":0},\"615\":{\"19327\":618,\"70709\":616,\"2070003\":0},\"616\":{\"75640\":617,\"2070003\":0},\"618\":{\"75640\":619,\"2070003\":0},\"620\":{\"19327\":623,\"70709\":621,\"2070003\":0},\"621\":{\"75640\":622,\"2070003\":0},\"623\":{\"75640\":624,\"2070003\":0},\"625\":{\"19327\":628,\"70709\":626,\"2070003\":0},\"626\":{\"75640\":627,\"2070003\":0},\"628\":{\"75640\":629,\"2070003\":0},\"630\":{\"19327\":633,\"70709\":631,\"2070003\":0},\"631\":{\"75640\":632,\"2070003\":0},\"633\":{\"75640\":634,\"2070003\":0},\"635\":{\"19327\":638,\"70709\":636,\"2070003\":0},\"636\":{\"75640\":637,\"2070003\":0},\"638\":{\"75640\":639,\"2070003\":0},\"640\":{\"19327\":643,\"70709\":641,\"2070003\":0},\"641\":{\"75640\":642,\"2070003\":0},\"643\":{\"75640\":644,\"2070003\":0},\"645\":{\"19327\":648,\"70709\":646,\"2070003\":0},\"646\":{\"75640\":647,\"2070003\":0},\"648\":{\"75640\":649,\"2070003\":0},\"650\":{\"19327\":653,\"70709\":651,\"2070003\":0},\"651\":{\"75640\":652,\"2070003\":0},\"653\":{\"75640\":654,\"2070003\":0},\"655\":{\"19327\":658,\"70709\":656,\"2070003\":0},\"656\":{\"75640\":657,\"2070003\":0},\"658\":{\"75640\":659,\"2070003\":0},\"660\":{\"19327\":663,\"70709\":661,\"2070003\":0},\"661\":{\"75640\":662,\"2070003\":0},\"663\":{\"75640\":664,\"2070003\":0},\"665\":{\"19327\":668,\"70709\":666,\"2070003\":0},\"666\":{\"75640\":667,\"2070003\":0},\"668\":{\"75640\":669,\"2070003\":0},\"670\":{\"19327\":673,\"70709\":671,\"2070003\":0},\"671\":{\"75640\":672,\"2070003\":0},\"673\":{\"75640\":674,\"2070003\":0},\"675\":{\"19327\":678,\"70709\":676,\"2070003\":0},\"676\":{\"75640\":677,\"2070003\":0},\"678\":{\"75640\":679,\"2070003\":0},\"680\":{\"19327\":683,\"70709\":681,\"2070003\":0},\"681\":{\"75640\":682,\"2070003\":0},\"683\":{\"75640\":684,\"2070003\":0},\"685\":{\"19327\":688,\"70709\":686,\"2070003\":0},\"686\":{\"75640\":687,\"2070003\":0},\"688\":{\"75640\":689,\"2070003\":0},\"690\":{\"19327\":693,\"70709\":691,\"2070003\":0},\"691\":{\"75640\":692,\"2070003\":0},\"693\":{\"75640\":694,\"2070003\":0},\"695\":{\"19327\":698,\"70709\":696,\"2070003\":0},\"696\":{\"75640\":697,\"2070003\":0},\"698\":{\"75640\":699,\"2070003\":0},\"700\":{\"19327\":703,\"70709\":701,\"2070003\":0},\"701\":{\"75640\":702,\"2070003\":0},\"703\":{\"75640\":704,\"2070003\":0},\"705\":{\"19327\":708,\"70709\":706,\"2070003\":0},\"706\":{\"75640\":707,\"2070003\":0},\"708\":{\"75640\":709,\"2070003\":0},\"710\":{\"19327\":713,\"70709\":711,\"2070003\":0},\"711\":{\"75640\":712,\"2070003\":0},\"713\":{\"75640\":714,\"2070003\":0},\"715\":{\"19327\":718,\"70709\":716,\"2070003\":0},\"716\":{\"75640\":717,\"2070003\":0},\"718\":{\"75640\":719,\"2070003\":0},\"720\":{\"19327\":723,\"70709\":721,\"2070003\":0},\"721\":{\"75640\":722,\"2070003\":0},\"723\":{\"75640\":724,\"2070003\":0},\"725\":{\"19327\":728,\"70709\":726,\"2070003\":0},\"726\":{\"75640\":727,\"2070003\":0},\"728\":{\"75640\":729,\"2070003\":0},\"730\":{\"19327\":733,\"70709\":731,\"2070003\":0},\"731\":{\"75640\":732,\"2070003\":0},\"733\":{\"75640\":734,\"2070003\":0},\"735\":{\"1469\":1768,\"2191\":786,\"5495\":1763,\"5671\":811,\"10111\":736,\"12499\":1769,\"12665\":801,\"18386\":1764,\"23998\":806,\"24243\":1767,\"26181\":1762,\"31979\":1758,\"34054\":781,\"37852\":763,\"39834\":1759,\"45372\":1765,\"48070\":796,\"48176\":1760,\"53050\":791,\"54276\":1766,\"59285\":1761,\"80639\":1757,\"2070003\":2047},\"736\":{\"1080033\":737,\"2070003\":0},\"737\":{\"75640\":738,\"2070003\":0},\"739\":{\"1469\":1781,\"2191\":821,\"5495\":1776,\"5671\":846,\"10111\":740,\"12499\":1782,\"12665\":836,\"18386\":1777,\"23998\":841,\"24243\":1780,\"26181\":1775,\"31979\":1771,\"34054\":816,\"37852\":766,\"39834\":1772,\"45372\":1778,\"48070\":831,\"48176\":1773,\"53050\":826,\"54276\":1779,\"59285\":1774,\"80639\":1770,\"2070003\":2048},\"740\":{\"1080033\":741,\"2070003\":0},\"741\":{\"75640\":742,\"2070003\":0},\"743\":{\"19315\":1568,\"46849\":1450,\"50951\":2057,\"53018\":2058,\"1080021\":1972,\"1080034\":744,\"1080036\":1572,\"1080037\":1570,\"2070003\":2076},\"744\":{\"1469\":1794,\"2191\":856,\"5495\":1789,\"5671\":881,\"10111\":745,\"12499\":1795,\"12665\":871,\"18386\":1790,\"23998\":876,\"24243\":1793,\"26181\":1788,\"31979\":1784,\"34054\":851,\"37852\":769,\"39834\":1785,\"45372\":1791,\"48070\":866,\"48176\":1786,\"53050\":861,\"54276\":1792,\"59285\":1787,\"80639\":1783,\"2070003\":2049},\"745\":{\"1080033\":746,\"2070003\":0},\"746\":{\"75640\":747,\"2070003\":0},\"748\":{\"19315\":1574,\"46849\":1464,\"50951\":2059,\"53018\":2060,\"1080020\":1969,\"1080021\":1973,\"1080034\":749,\"1080036\":1578,\"1080037\":1576,\"2070003\":2077},\"749\":{\"1469\":1807,\"2191\":891,\"5495\":1802,\"5671\":916,\"10111\":750,\"12499\":1808,\"12665\":906,\"18386\":1803,\"23998\":911,\"24243\":1806,\"26181\":1801,\"31979\":1797,\"34054\":886,\"37852\":772,\"39834\":1798,\"45372\":1804,\"48070\":901,\"48176\":1799,\"53050\":896,\"54276\":1805,\"59285\":1800,\"80639\":1796,\"2070003\":2050},\"750\":{\"1080033\":751,\"2070003\":0},\"751\":{\"75640\":752,\"2070003\":0},\"753\":{\"47\":1084,\"226\":1587,\"6352\":1599,\"19315\":1609,\"46849\":1478,\"50951\":2061,\"53018\":2062,\"1080009\":1988,\"1080011\":1989,\"1080012\":1990,\"1080034\":754,\"1080036\":1613,\"1080037\":1611,\"1080038\":1939,\"2070003\":2115},\"754\":{\"1469\":1820,\"2191\":926,\"5495\":1815,\"5671\":951,\"10111\":755,\"12499\":1821,\"12665\":941,\"18386\":1816,\"23998\":946,\"24243\":1819,\"26181\":1814,\"31979\":1810,\"34054\":921,\"37852\":775,\"39834\":1811,\"45372\":1817,\"48070\":936,\"48176\":1812,\"53050\":931,\"54276\":1818,\"59285\":1813,\"80639\":1809,\"2070003\":2051},\"755\":{\"1080033\":756,\"2070003\":0},\"756\":{\"75640\":757,\"2070003\":0},\"758\":{\"47\":1091,\"226\":1589,\"6352\":1601,\"19315\":1615,\"46849\":1492,\"50951\":2063,\"53018\":2064,\"1080009\":1991,\"1080011\":1992,\"1080012\":1993,\"1080034\":759,\"1080036\":1619,\"1080037\":1617,\"1080038\":1940,\"2070003\":2116},\"759\":{\"1469\":1833,\"2191\":961,\"5495\":1828,\"5671\":986,\"10111\":760,\"12499\":1834,\"12665\":976,\"18386\":1829,\"23998\":981,\"24243\":1832,\"26181\":1827,\"31979\":1823,\"34054\":956,\"37852\":778,\"39834\":1824,\"45372\":1830,\"48070\":971,\"48176\":1825,\"53050\":966,\"54276\":1831,\"59285\":1826,\"80639\":1822,\"2070003\":2052},\"760\":{\"1080033\":761,\"2070003\":0},\"761\":{\"75640\":762,\"2070003\":0},\"763\":{\"70709\":764,\"2070003\":0},\"764\":{\"75640\":765,\"2070003\":0},\"766\":{\"70709\":767,\"2070003\":0},\"767\":{\"75640\":768,\"2070003\":0},\"769\":{\"70709\":770,\"2070003\":0},\"770\":{\"75640\":771,\"2070003\":0},\"772\":{\"70709\":773,\"2070003\":0},\"773\":{\"75640\":774,\"2070003\":0},\"775\":{\"70709\":776,\"2070003\":0},\"776\":{\"75640\":777,\"2070003\":0},\"778\":{\"70709\":779,\"2070003\":0},\"779\":{\"75640\":780,\"2070003\":0},\"781\":{\"19327\":784,\"70709\":782,\"2070003\":0},\"782\":{\"75640\":783,\"2070003\":0},\"784\":{\"75640\":785,\"2070003\":0},\"786\":{\"19327\":789,\"70709\":787,\"2070003\":0},\"787\":{\"75640\":788,\"2070003\":0},\"789\":{\"75640\":790,\"2070003\":0},\"791\":{\"19327\":794,\"70709\":792,\"2070003\":0},\"792\":{\"75640\":793,\"2070003\":0},\"794\":{\"75640\":795,\"2070003\":0},\"796\":{\"19327\":799,\"70709\":797,\"2070003\":0},\"797\":{\"75640\":798,\"2070003\":0},\"799\":{\"75640\":800,\"2070003\":0},\"801\":{\"19327\":804,\"70709\":802,\"2070003\":0},\"802\":{\"75640\":803,\"2070003\":0},\"804\":{\"75640\":805,\"2070003\":0},\"806\":{\"19327\":809,\"70709\":807,\"2070003\":0},\"807\":{\"75640\":808,\"2070003\":0},\"809\":{\"75640\":810,\"2070003\":0},\"811\":{\"19327\":814,\"70709\":812,\"2070003\":0},\"812\":{\"75640\":813,\"2070003\":0},\"814\":{\"75640\":815,\"2070003\":0},\"816\":{\"19327\":819,\"70709\":817,\"2070003\":0},\"817\":{\"75640\":818,\"2070003\":0},\"819\":{\"75640\":820,\"2070003\":0},\"821\":{\"19327\":824,\"70709\":822,\"2070003\":0},\"822\":{\"75640\":823,\"2070003\":0},\"824\":{\"75640\":825,\"2070003\":0},\"826\":{\"19327\":829,\"70709\":827,\"2070003\":0},\"827\":{\"75640\":828,\"2070003\":0},\"829\":{\"75640\":830,\"2070003\":0},\"831\":{\"19327\":834,\"70709\":832,\"2070003\":0},\"832\":{\"75640\":833,\"2070003\":0},\"834\":{\"75640\":835,\"2070003\":0},\"836\":{\"19327\":839,\"70709\":837,\"2070003\":0},\"837\":{\"75640\":838,\"2070003\":0},\"839\":{\"75640\":840,\"2070003\":0},\"841\":{\"19327\":844,\"70709\":842,\"2070003\":0},\"842\":{\"75640\":843,\"2070003\":0},\"844\":{\"75640\":845,\"2070003\":0},\"846\":{\"19327\":849,\"70709\":847,\"2070003\":0},\"847\":{\"75640\":848,\"2070003\":0},\"849\":{\"75640\":850,\"2070003\":0},\"851\":{\"19327\":854,\"70709\":852,\"2070003\":0},\"852\":{\"75640\":853,\"2070003\":0},\"854\":{\"75640\":855,\"2070003\":0},\"856\":{\"19327\":859,\"70709\":857,\"2070003\":0},\"857\":{\"75640\":858,\"2070003\":0},\"859\":{\"75640\":860,\"2070003\":0},\"861\":{\"19327\":864,\"70709\":862,\"2070003\":0},\"862\":{\"75640\":863,\"2070003\":0},\"864\":{\"75640\":865,\"2070003\":0},\"866\":{\"19327\":869,\"70709\":867,\"2070003\":0},\"867\":{\"75640\":868,\"2070003\":0},\"869\":{\"75640\":870,\"2070003\":0},\"871\":{\"19327\":874,\"70709\":872,\"2070003\":0},\"872\":{\"75640\":873,\"2070003\":0},\"874\":{\"75640\":875,\"2070003\":0},\"876\":{\"19327\":879,\"70709\":877,\"2070003\":0},\"877\":{\"75640\":878,\"2070003\":0},\"879\":{\"75640\":880,\"2070003\":0},\"881\":{\"19327\":884,\"70709\":882,\"2070003\":0},\"882\":{\"75640\":883,\"2070003\":0},\"884\":{\"75640\":885,\"2070003\":0},\"886\":{\"19327\":889,\"70709\":887,\"2070003\":0},\"887\":{\"75640\":888,\"2070003\":0},\"889\":{\"75640\":890,\"2070003\":0},\"891\":{\"19327\":894,\"70709\":892,\"2070003\":0},\"892\":{\"75640\":893,\"2070003\":0},\"894\":{\"75640\":895,\"2070003\":0},\"896\":{\"19327\":899,\"70709\":897,\"2070003\":0},\"897\":{\"75640\":898,\"2070003\":0},\"899\":{\"75640\":900,\"2070003\":0},\"901\":{\"19327\":904,\"70709\":902,\"2070003\":0},\"902\":{\"75640\":903,\"2070003\":0},\"904\":{\"75640\":905,\"2070003\":0},\"906\":{\"19327\":909,\"70709\":907,\"2070003\":0},\"907\":{\"75640\":908,\"2070003\":0},\"909\":{\"75640\":910,\"2070003\":0},\"911\":{\"19327\":914,\"70709\":912,\"2070003\":0},\"912\":{\"75640\":913,\"2070003\":0},\"914\":{\"75640\":915,\"2070003\":0},\"916\":{\"19327\":919,\"70709\":917,\"2070003\":0},\"917\":{\"75640\":918,\"2070003\":0},\"919\":{\"75640\":920,\"2070003\":0},\"921\":{\"19327\":924,\"70709\":922,\"2070003\":0},\"922\":{\"75640\":923,\"2070003\":0},\"924\":{\"75640\":925,\"2070003\":0},\"926\":{\"19327\":929,\"70709\":927,\"2070003\":0},\"927\":{\"75640\":928,\"2070003\":0},\"929\":{\"75640\":930,\"2070003\":0},\"931\":{\"19327\":934,\"70709\":932,\"2070003\":0},\"932\":{\"75640\":933,\"2070003\":0},\"934\":{\"75640\":935,\"2070003\":0},\"936\":{\"19327\":939,\"70709\":937,\"2070003\":0},\"937\":{\"75640\":938,\"2070003\":0},\"939\":{\"75640\":940,\"2070003\":0},\"941\":{\"19327\":944,\"70709\":942,\"2070003\":0},\"942\":{\"75640\":943,\"2070003\":0},\"944\":{\"75640\":945,\"2070003\":0},\"946\":{\"19327\":949,\"70709\":947,\"2070003\":0},\"947\":{\"75640\":948,\"2070003\":0},\"949\":{\"75640\":950,\"2070003\":0},\"951\":{\"19327\":954,\"70709\":952,\"2070003\":0},\"952\":{\"75640\":953,\"2070003\":0},\"954\":{\"75640\":955,\"2070003\":0},\"956\":{\"19327\":959,\"70709\":957,\"2070003\":0},\"957\":{\"75640\":958,\"2070003\":0},\"959\":{\"75640\":960,\"2070003\":0},\"961\":{\"19327\":964,\"70709\":962,\"2070003\":0},\"962\":{\"75640\":963,\"2070003\":0},\"964\":{\"75640\":965,\"2070003\":0},\"966\":{\"19327\":969,\"70709\":967,\"2070003\":0},\"967\":{\"75640\":968,\"2070003\":0},\"969\":{\"75640\":970,\"2070003\":0},\"971\":{\"19327\":974,\"70709\":972,\"2070003\":0},\"972\":{\"75640\":973,\"2070003\":0},\"974\":{\"75640\":975,\"2070003\":0},\"976\":{\"19327\":979,\"70709\":977,\"2070003\":0},\"977\":{\"75640\":978,\"2070003\":0},\"979\":{\"75640\":980,\"2070003\":0},\"981\":{\"19327\":984,\"70709\":982,\"2070003\":0},\"982\":{\"75640\":983,\"2070003\":0},\"984\":{\"75640\":985,\"2070003\":0},\"986\":{\"19327\":989,\"70709\":987,\"2070003\":0},\"987\":{\"75640\":988,\"2070003\":0},\"989\":{\"75640\":990,\"2070003\":0},\"991\":{\"75830\":992,\"2070003\":0},\"992\":{\"1080001\":1003,\"1080002\":1004,\"1080015\":999,\"1080016\":1000,\"1080017\":1001,\"1080018\":1002,\"2070003\":0},\"1005\":{\"75830\":1006,\"2070003\":0},\"1006\":{\"1080001\":1017,\"1080002\":1018,\"1080015\":1013,\"1080016\":1014,\"1080017\":1015,\"1080018\":1016,\"2070003\":0},\"1019\":{\"75830\":1020,\"2070003\":0},\"1020\":{\"1080001\":1031,\"1080002\":1032,\"1080015\":1027,\"1080016\":1028,\"1080017\":1029,\"1080018\":1030,\"2070003\":0},\"1033\":{\"75830\":1034,\"2070003\":0},\"1034\":{\"1080001\":1045,\"1080002\":1046,\"1080015\":1041,\"1080016\":1042,\"1080017\":1043,\"1080018\":1044,\"2070003\":0},\"1047\":{\"75830\":1048,\"2070003\":0},\"1048\":{\"1080001\":1059,\"1080002\":1060,\"1080015\":1055,\"1080016\":1056,\"1080017\":1057,\"1080018\":1058,\"2070003\":0},\"1061\":{\"75830\":1062,\"2070003\":0},\"1062\":{\"1080001\":1073,\"1080002\":1074,\"1080015\":1069,\"1080016\":1070,\"1080017\":1071,\"1080018\":1072,\"2070003\":0},\"1075\":{\"1812\":2035,\"13781\":1930,\"19315\":1323,\"26503\":2034,\"46381\":1749,\"46405\":2044,\"46416\":2045,\"46436\":2040,\"46457\":2039,\"47869\":2033,\"49799\":2037,\"50501\":2036,\"76008\":2038,\"1080036\":1934,\"1080037\":1076,\"2070003\":2120},\"1076\":{\"47\":1077,\"25091\":1541,\"2070003\":1932},\"1077\":{\"25091\":1078,\"2070003\":0},\"1079\":{\"226\":1080,\"6352\":1082,\"1080038\":1548,\"2070003\":1938},\"1080\":{\"18983\":1081,\"2070003\":0},\"1082\":{\"10894\":1083,\"2070003\":0},\"1084\":{\"19315\":1085,\"1080036\":1089,\"1080037\":1087,\"2070003\":0},\"1085\":{\"1948\":1086,\"2070003\":0},\"1087\":{\"1948\":1088,\"2070003\":0},\"1089\":{\"1948\":1090,\"2070003\":0},\"1091\":{\"19315\":1092,\"1080036\":1096,\"1080037\":1094,\"2070003\":0},\"1092\":{\"1948\":1093,\"2070003\":0},\"1094\":{\"1948\":1095,\"2070003\":0},\"1096\":{\"1948\":1097,\"2070003\":0},\"1098\":{\"47\":1099,\"226\":1591,\"6352\":1603,\"19315\":1621,\"1080009\":1994,\"1080011\":1995,\"1080012\":1996,\"1080036\":1625,\"1080037\":1623,\"1080038\":1941,\"2070003\":2117},\"1099\":{\"19315\":1100,\"1080036\":1104,\"1080037\":1102,\"2070003\":0},\"1100\":{\"1948\":1101,\"2070003\":0},\"1102\":{\"1948\":1103,\"2070003\":0},\"1104\":{\"1948\":1105,\"2070003\":0},\"1106\":{\"1948\":1107,\"2070003\":0},\"1108\":{\"1948\":1109,\"2070003\":0},\"1110\":{\"1948\":1111,\"2070003\":0},\"1112\":{\"1948\":1113,\"2070003\":0},\"1114\":{\"1948\":1115,\"2070003\":0},\"1116\":{\"1948\":1117,\"2070003\":0},\"1118\":{\"1948\":1119,\"2070003\":0},\"1120\":{\"1948\":1121,\"2070003\":0},\"1122\":{\"1948\":1123,\"2070003\":0},\"1130\":{\"219\":1131,\"1080022\":1644,\"1080023\":1645,\"1080024\":1646,\"2070003\":1977},\"1131\":{\"1080022\":1132,\"1080023\":1133,\"1080024\":1134,\"2070003\":0},\"1135\":{\"1080014\":1136,\"2070003\":0},\"1136\":{\"1080022\":1137,\"1080023\":1138,\"1080024\":1139,\"2070003\":1650},\"1140\":{\"1080022\":1141,\"1080023\":1142,\"1080024\":1143,\"2070003\":1651},\"1145\":{\"1080014\":1146,\"2070003\":0},\"1146\":{\"1080022\":1147,\"1080023\":1148,\"1080024\":1149,\"2070003\":1655},\"1150\":{\"1080022\":1151,\"1080023\":1152,\"1080024\":1153,\"2070003\":1656},\"1165\":{\"1080022\":1166,\"1080023\":1167,\"1080024\":1168,\"2070003\":0},\"1172\":{\"1080022\":1173,\"1080023\":1174,\"1080024\":1175,\"2070003\":0},\"1193\":{\"3320\":1194,\"1080004\":1984,\"1080005\":1985,\"1080006\":1986,\"1080007\":1987,\"1080019\":1679,\"1080021\":1975,\"2070003\":2103},\"1194\":{\"1080004\":1667,\"1080005\":1668,\"1080006\":1669,\"1080007\":1670,\"1080019\":1195,\"2070003\":0},\"1195\":{\"1080004\":1196,\"2070003\":0},\"1197\":{\"1080004\":1198,\"2070003\":0},\"1199\":{\"1080004\":1200,\"2070003\":0},\"1240\":{\"1469\":2014,\"2191\":1258,\"5495\":2009,\"5671\":1283,\"10111\":1241,\"12499\":2015,\"12665\":1273,\"18386\":2010,\"23998\":1278,\"24243\":2013,\"26181\":2008,\"31979\":2004,\"34054\":1253,\"37852\":1247,\"39834\":2005,\"45372\":2011,\"48070\":1268,\"48176\":2006,\"53050\":1263,\"54276\":2012,\"59285\":2007,\"80639\":2003,\"2070003\":2092},\"1241\":{\"1080033\":1242,\"2070003\":0},\"1242\":{\"75640\":1243,\"2070003\":0},\"1244\":{\"1080033\":1245,\"2070003\":0},\"1245\":{\"75640\":1246,\"2070003\":0},\"1247\":{\"70709\":1248,\"2070003\":0},\"1248\":{\"75640\":1249,\"2070003\":0},\"1250\":{\"70709\":1251,\"2070003\":0},\"1251\":{\"75640\":1252,\"2070003\":0},\"1253\":{\"19327\":1256,\"70709\":1254,\"2070003\":0},\"1254\":{\"75640\":1255,\"2070003\":0},\"1256\":{\"75640\":1257,\"2070003\":0},\"1258\":{\"19327\":1261,\"70709\":1259,\"2070003\":0},\"1259\":{\"75640\":1260,\"2070003\":0},\"1261\":{\"75640\":1262,\"2070003\":0},\"1263\":{\"19327\":1266,\"70709\":1264,\"2070003\":0},\"1264\":{\"75640\":1265,\"2070003\":0},\"1266\":{\"75640\":1267,\"2070003\":0},\"1268\":{\"19327\":1271,\"70709\":1269,\"2070003\":0},\"1269\":{\"75640\":1270,\"2070003\":0},\"1271\":{\"75640\":1272,\"2070003\":0},\"1273\":{\"19327\":1276,\"70709\":1274,\"2070003\":0},\"1274\":{\"75640\":1275,\"2070003\":0},\"1276\":{\"75640\":1277,\"2070003\":0},\"1278\":{\"19327\":1281,\"70709\":1279,\"2070003\":0},\"1279\":{\"75640\":1280,\"2070003\":0},\"1281\":{\"75640\":1282,\"2070003\":0},\"1283\":{\"19327\":1286,\"70709\":1284,\"2070003\":0},\"1284\":{\"75640\":1285,\"2070003\":0},\"1286\":{\"75640\":1287,\"2070003\":0},\"1288\":{\"19327\":1291,\"70709\":1289,\"2070003\":0},\"1289\":{\"75640\":1290,\"2070003\":0},\"1291\":{\"75640\":1292,\"2070003\":0},\"1293\":{\"19327\":1296,\"70709\":1294,\"2070003\":0},\"1294\":{\"75640\":1295,\"2070003\":0},\"1296\":{\"75640\":1297,\"2070003\":0},\"1298\":{\"19327\":1301,\"70709\":1299,\"2070003\":0},\"1299\":{\"75640\":1300,\"2070003\":0},\"1301\":{\"75640\":1302,\"2070003\":0},\"1303\":{\"19327\":1306,\"70709\":1304,\"2070003\":0},\"1304\":{\"75640\":1305,\"2070003\":0},\"1306\":{\"75640\":1307,\"2070003\":0},\"1308\":{\"19327\":1311,\"70709\":1309,\"2070003\":0},\"1309\":{\"75640\":1310,\"2070003\":0},\"1311\":{\"75640\":1312,\"2070003\":0},\"1313\":{\"19327\":1316,\"70709\":1314,\"2070003\":0},\"1314\":{\"75640\":1315,\"2070003\":0},\"1316\":{\"75640\":1317,\"2070003\":0},\"1318\":{\"19327\":1321,\"70709\":1319,\"2070003\":0},\"1319\":{\"75640\":1320,\"2070003\":0},\"1321\":{\"75640\":1322,\"2070003\":0},\"1323\":{\"47\":1324,\"25091\":1756,\"84671\":1326,\"2070003\":1931},\"1324\":{\"25091\":1325,\"2070003\":0},\"1326\":{\"25091\":1327,\"2070003\":0},\"1406\":{\"54010\":1407,\"2070003\":0},\"1407\":{\"1080001\":1412,\"1080002\":1413,\"1080015\":1408,\"1080016\":1409,\"1080017\":1410,\"1080018\":1411,\"2070003\":0},\"1414\":{\"54010\":1415,\"2070003\":0},\"1415\":{\"1080001\":1420,\"1080002\":1421,\"1080015\":1416,\"1080016\":1417,\"1080017\":1418,\"1080018\":1419,\"2070003\":0},\"1422\":{\"75830\":1423,\"2070003\":0},\"1423\":{\"1080001\":1434,\"1080002\":1435,\"1080015\":1430,\"1080016\":1431,\"1080017\":1432,\"1080018\":1433,\"2070003\":0},\"1436\":{\"75830\":1437,\"2070003\":0},\"1437\":{\"1080001\":1448,\"1080002\":1449,\"1080015\":1444,\"1080016\":1445,\"1080017\":1446,\"1080018\":1447,\"2070003\":0},\"1450\":{\"75830\":1451,\"2070003\":0},\"1451\":{\"1080001\":1462,\"1080002\":1463,\"1080015\":1458,\"1080016\":1459,\"1080017\":1460,\"1080018\":1461,\"2070003\":0},\"1464\":{\"75830\":1465,\"2070003\":0},\"1465\":{\"1080001\":1476,\"1080002\":1477,\"1080015\":1472,\"1080016\":1473,\"1080017\":1474,\"1080018\":1475,\"2070003\":0},\"1478\":{\"75830\":1479,\"2070003\":0},\"1479\":{\"1080001\":1490,\"1080002\":1491,\"1080015\":1486,\"1080016\":1487,\"1080017\":1488,\"1080018\":1489,\"2070003\":0},\"1492\":{\"75830\":1493,\"2070003\":0},\"1493\":{\"1080001\":1504,\"1080002\":1505,\"1080015\":1500,\"1080016\":1501,\"1080017\":1502,\"1080018\":1503,\"2070003\":0},\"1506\":{\"23933\":1510,\"27544\":1906,\"41891\":1513,\"44826\":1903,\"45293\":1902,\"64899\":1904,\"70334\":1907,\"72493\":1905,\"1080032\":1507,\"1080045\":1944,\"2070003\":0},\"1507\":{\"27544\":1522,\"44826\":1509,\"45293\":1508,\"64899\":1516,\"70334\":1525,\"72493\":1517,\"2070003\":0},\"1510\":{\"27544\":1523,\"44826\":1512,\"45293\":1511,\"64899\":1518,\"70334\":1526,\"72493\":1519,\"2070003\":0},\"1513\":{\"27544\":1524,\"44826\":1515,\"45293\":1514,\"64899\":1520,\"70334\":1527,\"72493\":1521,\"2070003\":0},\"1528\":{\"47\":1752,\"1800\":1531,\"7543\":1529,\"25091\":2046,\"84671\":1754,\"2070003\":0},\"1529\":{\"1080031\":1530,\"2070003\":0},\"1531\":{\"1080031\":1532,\"2070003\":0},\"1533\":{\"35\":1534,\"2070003\":0},\"1534\":{\"19315\":1535,\"1080036\":1537,\"1080037\":1536,\"2070003\":0},\"1538\":{\"47\":1539,\"25091\":1933,\"2070003\":2111},\"1539\":{\"25091\":1540,\"2070003\":0},\"1542\":{\"12716\":1543,\"2070003\":0},\"1544\":{\"12716\":1545,\"2070003\":0},\"1546\":{\"12716\":1547,\"2070003\":0},\"1549\":{\"19315\":1550,\"1080015\":1869,\"1080025\":1976,\"1080036\":1554,\"1080037\":1552,\"1080045\":1946,\"2070003\":0},\"1550\":{\"1948\":1551,\"2070003\":0},\"1552\":{\"1948\":1553,\"2070003\":0},\"1554\":{\"1948\":1555,\"2070003\":0},\"1556\":{\"1948\":1557,\"2070003\":0},\"1558\":{\"1948\":1559,\"2070003\":0},\"1560\":{\"1948\":1561,\"2070003\":0},\"1562\":{\"1948\":1563,\"2070003\":0},\"1564\":{\"1948\":1565,\"2070003\":0},\"1566\":{\"1948\":1567,\"2070003\":0},\"1568\":{\"1948\":1569,\"2070003\":0},\"1570\":{\"1948\":1571,\"2070003\":0},\"1572\":{\"1948\":1573,\"2070003\":0},\"1574\":{\"1948\":1575,\"2070003\":0},\"1576\":{\"1948\":1577,\"2070003\":0},\"1578\":{\"1948\":1579,\"2070003\":0},\"1580\":{\"47\":1627,\"19315\":1581,\"84671\":1630,\"1080004\":1983,\"1080015\":1633,\"1080016\":1635,\"1080021\":1974,\"1080036\":1585,\"1080037\":1583,\"2070003\":2078},\"1581\":{\"1948\":1582,\"2070003\":0},\"1583\":{\"1948\":1584,\"2070003\":0},\"1585\":{\"1948\":1586,\"2070003\":0},\"1587\":{\"18983\":1588,\"2070003\":0},\"1589\":{\"18983\":1590,\"2070003\":0},\"1591\":{\"18983\":1592,\"2070003\":0},\"1593\":{\"226\":1594,\"6352\":1605,\"1080009\":1997,\"1080011\":1998,\"1080012\":1999,\"1080038\":1942,\"2070003\":2118},\"1594\":{\"18983\":1595,\"2070003\":0},\"1596\":{\"226\":1597,\"6352\":1607,\"1080009\":2000,\"1080011\":2001,\"1080012\":2002,\"1080038\":1943,\"2070003\":2119},\"1597\":{\"18983\":1598,\"2070003\":0},\"1599\":{\"10894\":1600,\"2070003\":0},\"1601\":{\"10894\":1602,\"2070003\":0},\"1603\":{\"10894\":1604,\"2070003\":0},\"1605\":{\"10894\":1606,\"2070003\":0},\"1607\":{\"10894\":1608,\"2070003\":0},\"1609\":{\"1948\":1610,\"2070003\":0},\"1611\":{\"1948\":1612,\"2070003\":0},\"1613\":{\"1948\":1614,\"2070003\":0},\"1615\":{\"1948\":1616,\"2070003\":0},\"1617\":{\"1948\":1618,\"2070003\":0},\"1619\":{\"1948\":1620,\"2070003\":0},\"1621\":{\"1948\":1622,\"2070003\":0},\"1623\":{\"1948\":1624,\"2070003\":0},\"1625\":{\"1948\":1626,\"2070003\":0},\"1627\":{\"1080004\":1665,\"1080015\":1628,\"1080016\":1629,\"2070003\":0},\"1630\":{\"1080004\":1666,\"1080015\":1631,\"1080016\":1632,\"2070003\":0},\"1633\":{\"1080021\":1634,\"2070003\":1965},\"1635\":{\"1080021\":1636,\"2070003\":1966},\"1639\":{\"219\":1640,\"1080022\":1978,\"1080023\":1979,\"1080024\":1980,\"2070003\":2114},\"1640\":{\"1080022\":1641,\"1080023\":1642,\"1080024\":1643,\"2070003\":0},\"1679\":{\"1080004\":1680,\"2070003\":0},\"1749\":{\"19315\":1750,\"49799\":1751,\"2070003\":0},\"1752\":{\"25091\":1753,\"2070003\":0},\"1754\":{\"25091\":1755,\"2070003\":0},\"1853\":{\"54010\":1854,\"2070003\":0},\"1854\":{\"1080001\":1859,\"1080002\":1860,\"1080015\":1855,\"1080016\":1856,\"1080017\":1857,\"1080018\":1858,\"2070003\":0},\"1861\":{\"54010\":1862,\"2070003\":0},\"1862\":{\"1080001\":1867,\"1080002\":1868,\"1080015\":1863,\"1080016\":1864,\"1080017\":1865,\"1080018\":1866,\"2070003\":0},\"1870\":{\"1080015\":1871,\"1080045\":1945,\"2070003\":0},\"1872\":{\"1080015\":1873,\"2070003\":0},\"1874\":{\"1080015\":1875,\"2070003\":0},\"1876\":{\"1080015\":1877,\"2070003\":0},\"1878\":{\"1080015\":1879,\"2070003\":0},\"1880\":{\"1080015\":1881,\"2070003\":0},\"1882\":{\"1080015\":1883,\"2070003\":0},\"1884\":{\"1080015\":1885,\"2070003\":0},\"1886\":{\"1080015\":1887,\"2070003\":0},\"1888\":{\"1080015\":1889,\"2070003\":0},\"1890\":{\"1080015\":1891,\"2070003\":0},\"1892\":{\"1080015\":1893,\"2070003\":0},\"1908\":{\"65882\":1909,\"2070003\":0},\"1910\":{\"51345\":1911,\"2070003\":0},\"1912\":{\"19315\":1913,\"1080036\":1915,\"1080037\":1914,\"2070003\":0},\"1916\":{\"9275\":1925,\"11943\":1928,\"11954\":1929,\"16838\":1922,\"19709\":1927,\"35750\":1921,\"42752\":1917,\"42774\":1918,\"48494\":1926,\"53911\":1924,\"53937\":1923,\"76847\":1919,\"76855\":1920,\"2070003\":2070},\"1935\":{\"19315\":1936,\"1080037\":1937,\"2070003\":0},\"1947\":{\"1080045\":1948,\"2070003\":0},\"1949\":{\"1080045\":1950,\"2070003\":0},\"1951\":{\"1080045\":1952,\"2070003\":0},\"1953\":{\"1080045\":1954,\"2070003\":0},\"1955\":{\"1080045\":1956,\"2070003\":0},\"1957\":{\"1080045\":1958,\"2070003\":0},\"1959\":{\"1080045\":1960,\"2070003\":0},\"1961\":{\"1080045\":1962,\"2070003\":0},\"1963\":{\"1080045\":1964,\"2070003\":2072},\"2041\":{\"19315\":2042,\"49799\":2043,\"2070003\":0}},{\"6\":1050004,\"7\":1050004,\"13\":1050004,\"14\":1050004,\"20\":1050010,\"21\":1050010,\"22\":1050010,\"27\":1050010,\"28\":1050010,\"29\":1050010,\"33\":1050010,\"34\":1050010,\"35\":1050010,\"39\":1050010,\"40\":1050010,\"41\":1050010,\"46\":1050013,\"50\":1050013,\"54\":1050013,\"57\":1050013,\"60\":1050013,\"63\":1050013,\"66\":1050013,\"68\":1050013,\"71\":1050013,\"73\":1050013,\"76\":1050013,\"78\":1050013,\"81\":1050013,\"83\":1050013,\"86\":1050013,\"88\":1050013,\"91\":1050013,\"93\":1050013,\"96\":1050013,\"98\":1050013,\"101\":1050013,\"103\":1050013,\"106\":1050013,\"108\":1050013,\"111\":1050013,\"113\":1050013,\"116\":1050013,\"118\":1050013,\"121\":1050013,\"123\":1050013,\"126\":1050013,\"128\":1050013,\"131\":1050013,\"133\":1050013,\"136\":1050013,\"138\":1050013,\"141\":1050013,\"143\":1050013,\"146\":1050013,\"148\":1050013,\"151\":1050013,\"153\":1050013,\"156\":1050013,\"158\":1050013,\"161\":1050013,\"163\":1050013,\"166\":1050013,\"168\":1050013,\"172\":1050013,\"176\":1050013,\"181\":1050013,\"186\":1050013,\"191\":1050013,\"196\":1050013,\"199\":1050013,\"202\":1050013,\"205\":1050013,\"208\":1050013,\"211\":1050013,\"214\":1050013,\"217\":1050013,\"219\":1050013,\"222\":1050013,\"224\":1050013,\"227\":1050013,\"229\":1050013,\"232\":1050013,\"234\":1050013,\"237\":1050013,\"239\":1050013,\"242\":1050013,\"244\":1050013,\"247\":1050013,\"249\":1050013,\"252\":1050013,\"254\":1050013,\"257\":1050013,\"259\":1050013,\"262\":1050013,\"264\":1050013,\"267\":1050013,\"269\":1050013,\"272\":1050013,\"274\":1050013,\"277\":1050013,\"279\":1050013,\"282\":1050013,\"284\":1050013,\"287\":1050013,\"289\":1050013,\"292\":1050013,\"294\":1050013,\"297\":1050013,\"299\":1050013,\"302\":1050013,\"304\":1050013,\"307\":1050013,\"309\":1050013,\"312\":1050013,\"314\":1050013,\"317\":1050013,\"319\":1050013,\"322\":1050013,\"324\":1050013,\"327\":1050013,\"329\":1050013,\"332\":1050013,\"334\":1050013,\"337\":1050013,\"339\":1050013,\"342\":1050013,\"344\":1050013,\"347\":1050013,\"349\":1050013,\"352\":1050013,\"354\":1050013,\"357\":1050013,\"359\":1050013,\"362\":1050013,\"364\":1050013,\"367\":1050013,\"369\":1050013,\"372\":1050013,\"374\":1050013,\"377\":1050013,\"379\":1050013,\"382\":1050013,\"384\":1050013,\"387\":1050013,\"389\":1050013,\"392\":1050013,\"394\":1050013,\"397\":1050013,\"399\":1050013,\"402\":1050013,\"404\":1050013,\"407\":1050013,\"409\":1050013,\"412\":1050013,\"414\":1050013,\"417\":1050013,\"419\":1050013,\"422\":1050013,\"424\":1050013,\"427\":1050004,\"429\":1050004,\"431\":1050004,\"434\":1050004,\"436\":1050004,\"438\":1050004,\"442\":1050004,\"444\":1050004,\"446\":1050004,\"448\":1050004,\"449\":1050004,\"450\":1050004,\"451\":1050004,\"453\":1050004,\"454\":1050004,\"455\":1050004,\"456\":1050004,\"461\":1050010,\"462\":1050010,\"463\":1050010,\"468\":1050010,\"469\":1050010,\"470\":1050010,\"473\":1050010,\"474\":1050010,\"475\":1050010,\"477\":1050010,\"478\":1050010,\"479\":1050010,\"480\":1050010,\"483\":1050010,\"484\":1050010,\"485\":1050010,\"487\":1050010,\"488\":1050010,\"489\":1050010,\"490\":1050010,\"494\":1050010,\"495\":1050010,\"496\":1050010,\"500\":1050010,\"501\":1050010,\"502\":1050010,\"504\":1050010,\"505\":1050010,\"506\":1050010,\"507\":1050010,\"508\":1050010,\"509\":1050010,\"511\":1050010,\"512\":1050010,\"513\":1050010,\"514\":1050010,\"515\":1050010,\"516\":1050010,\"520\":1050011,\"524\":1050011,\"528\":1050013,\"533\":1050013,\"537\":1050013,\"541\":1050013,\"544\":1050013,\"547\":1050013,\"550\":1050013,\"553\":1050013,\"556\":1050013,\"559\":1050013,\"562\":1050013,\"564\":1050013,\"567\":1050013,\"569\":1050013,\"572\":1050013,\"574\":1050013,\"577\":1050013,\"579\":1050013,\"582\":1050013,\"584\":1050013,\"587\":1050013,\"589\":1050013,\"592\":1050013,\"594\":1050013,\"597\":1050013,\"599\":1050013,\"602\":1050013,\"604\":1050013,\"607\":1050013,\"609\":1050013,\"612\":1050013,\"614\":1050013,\"617\":1050013,\"619\":1050013,\"622\":1050013,\"624\":1050013,\"627\":1050013,\"629\":1050013,\"632\":1050013,\"634\":1050013,\"637\":1050013,\"639\":1050013,\"642\":1050013,\"644\":1050013,\"647\":1050013,\"649\":1050013,\"652\":1050013,\"654\":1050013,\"657\":1050013,\"659\":1050013,\"662\":1050013,\"664\":1050013,\"667\":1050013,\"669\":1050013,\"672\":1050013,\"674\":1050013,\"677\":1050013,\"679\":1050013,\"682\":1050013,\"684\":1050013,\"687\":1050013,\"689\":1050013,\"692\":1050013,\"694\":1050013,\"697\":1050013,\"699\":1050013,\"702\":1050013,\"704\":1050013,\"707\":1050013,\"709\":1050013,\"712\":1050013,\"714\":1050013,\"717\":1050013,\"719\":1050013,\"722\":1050013,\"724\":1050013,\"727\":1050013,\"729\":1050013,\"732\":1050013,\"734\":1050013,\"738\":1050013,\"742\":1050013,\"747\":1050013,\"752\":1050013,\"757\":1050013,\"762\":1050013,\"765\":1050013,\"768\":1050013,\"771\":1050013,\"774\":1050013,\"777\":1050013,\"780\":1050013,\"783\":1050013,\"785\":1050013,\"788\":1050013,\"790\":1050013,\"793\":1050013,\"795\":1050013,\"798\":1050013,\"800\":1050013,\"803\":1050013,\"805\":1050013,\"808\":1050013,\"810\":1050013,\"813\":1050013,\"815\":1050013,\"818\":1050013,\"820\":1050013,\"823\":1050013,\"825\":1050013,\"828\":1050013,\"830\":1050013,\"833\":1050013,\"835\":1050013,\"838\":1050013,\"840\":1050013,\"843\":1050013,\"845\":1050013,\"848\":1050013,\"850\":1050013,\"853\":1050013,\"855\":1050013,\"858\":1050013,\"860\":1050013,\"863\":1050013,\"865\":1050013,\"868\":1050013,\"870\":1050013,\"873\":1050013,\"875\":1050013,\"878\":1050013,\"880\":1050013,\"883\":1050013,\"885\":1050013,\"888\":1050013,\"890\":1050013,\"893\":1050013,\"895\":1050013,\"898\":1050013,\"900\":1050013,\"903\":1050013,\"905\":1050013,\"908\":1050013,\"910\":1050013,\"913\":1050013,\"915\":1050013,\"918\":1050013,\"920\":1050013,\"923\":1050013,\"925\":1050013,\"928\":1050013,\"930\":1050013,\"933\":1050013,\"935\":1050013,\"938\":1050013,\"940\":1050013,\"943\":1050013,\"945\":1050013,\"948\":1050013,\"950\":1050013,\"953\":1050013,\"955\":1050013,\"958\":1050013,\"960\":1050013,\"963\":1050013,\"965\":1050013,\"968\":1050013,\"970\":1050013,\"973\":1050013,\"975\":1050013,\"978\":1050013,\"980\":1050013,\"983\":1050013,\"985\":1050013,\"988\":1050013,\"990\":1050013,\"993\":1050013,\"994\":1050013,\"995\":1050013,\"996\":1050013,\"997\":1050013,\"998\":1050013,\"999\":1050013,\"1000\":1050013,\"1001\":1050013,\"1002\":1050013,\"1003\":1050013,\"1004\":1050013,\"1007\":1050013,\"1008\":1050013,\"1009\":1050013,\"1010\":1050013,\"1011\":1050013,\"1012\":1050013,\"1013\":1050013,\"1014\":1050013,\"1015\":1050013,\"1016\":1050013,\"1017\":1050013,\"1018\":1050013,\"1021\":1050013,\"1022\":1050013,\"1023\":1050013,\"1024\":1050013,\"1025\":1050013,\"1026\":1050013,\"1027\":1050013,\"1028\":1050013,\"1029\":1050013,\"1030\":1050013,\"1031\":1050013,\"1032\":1050013,\"1035\":1050013,\"1036\":1050013,\"1037\":1050013,\"1038\":1050013,\"1039\":1050013,\"1040\":1050013,\"1041\":1050013,\"1042\":1050013,\"1043\":1050013,\"1044\":1050013,\"1045\":1050013,\"1046\":1050013,\"1049\":1050013,\"1050\":1050013,\"1051\":1050013,\"1052\":1050013,\"1053\":1050013,\"1054\":1050013,\"1055\":1050013,\"1056\":1050013,\"1057\":1050013,\"1058\":1050013,\"1059\":1050013,\"1060\":1050013,\"1063\":1050013,\"1064\":1050013,\"1065\":1050013,\"1066\":1050013,\"1067\":1050013,\"1068\":1050013,\"1069\":1050013,\"1070\":1050013,\"1071\":1050013,\"1072\":1050013,\"1073\":1050013,\"1074\":1050013,\"1078\":1050004,\"1081\":1050004,\"1083\":1050004,\"1086\":1050004,\"1088\":1050004,\"1090\":1050004,\"1093\":1050004,\"1095\":1050004,\"1097\":1050004,\"1101\":1050004,\"1103\":1050004,\"1105\":1050004,\"1107\":1050004,\"1109\":1050004,\"1111\":1050004,\"1113\":1050004,\"1115\":1050004,\"1117\":1050004,\"1119\":1050004,\"1121\":1050004,\"1123\":1050004,\"1124\":1050004,\"1125\":1050004,\"1126\":1050004,\"1127\":1050004,\"1128\":1050004,\"1129\":1050004,\"1132\":1050010,\"1133\":1050010,\"1134\":1050010,\"1137\":1050010,\"1138\":1050010,\"1139\":1050010,\"1141\":1050010,\"1142\":1050010,\"1143\":1050010,\"1144\":1050010,\"1147\":1050010,\"1148\":1050010,\"1149\":1050010,\"1151\":1050010,\"1152\":1050010,\"1153\":1050010,\"1154\":1050010,\"1155\":1050010,\"1156\":1050010,\"1157\":1050010,\"1158\":1050010,\"1159\":1050010,\"1160\":1050010,\"1161\":1050010,\"1162\":1050010,\"1163\":1050010,\"1164\":1050010,\"1166\":1050010,\"1167\":1050010,\"1168\":1050010,\"1169\":1050010,\"1170\":1050010,\"1171\":1050010,\"1173\":1050010,\"1174\":1050010,\"1175\":1050010,\"1176\":1050010,\"1177\":1050010,\"1178\":1050010,\"1179\":1050010,\"1180\":1050010,\"1181\":1050010,\"1182\":1050010,\"1183\":1050010,\"1184\":1050010,\"1185\":1050011,\"1186\":1050011,\"1187\":1050011,\"1188\":1050011,\"1189\":1050011,\"1190\":1050011,\"1191\":1050011,\"1192\":1050011,\"1196\":1050011,\"1198\":1050011,\"1200\":1050011,\"1201\":1050013,\"1202\":1050013,\"1203\":1050013,\"1204\":1050013,\"1205\":1050013,\"1206\":1050013,\"1207\":1050013,\"1208\":1050013,\"1209\":1050013,\"1210\":1050013,\"1211\":1050013,\"1212\":1050013,\"1213\":1050013,\"1214\":1050013,\"1215\":1050013,\"1216\":1050013,\"1217\":1050013,\"1218\":1050013,\"1219\":1050013,\"1220\":1050013,\"1221\":1050013,\"1222\":1050013,\"1223\":1050013,\"1224\":1050013,\"1225\":1050013,\"1226\":1050013,\"1227\":1050013,\"1228\":1050013,\"1229\":1050013,\"1230\":1050013,\"1231\":1050013,\"1232\":1050013,\"1233\":1050013,\"1234\":1050013,\"1235\":1050013,\"1236\":1050013,\"1237\":1050013,\"1238\":1050013,\"1239\":1050013,\"1243\":1050013,\"1246\":1050013,\"1249\":1050013,\"1252\":1050013,\"1255\":1050013,\"1257\":1050013,\"1260\":1050013,\"1262\":1050013,\"1265\":1050013,\"1267\":1050013,\"1270\":1050013,\"1272\":1050013,\"1275\":1050013,\"1277\":1050013,\"1280\":1050013,\"1282\":1050013,\"1285\":1050013,\"1287\":1050013,\"1290\":1050013,\"1292\":1050013,\"1295\":1050013,\"1297\":1050013,\"1300\":1050013,\"1302\":1050013,\"1305\":1050013,\"1307\":1050013,\"1310\":1050013,\"1312\":1050013,\"1315\":1050013,\"1317\":1050013,\"1320\":1050013,\"1322\":1050013,\"1325\":1050013,\"1327\":1050013,\"1328\":1050013,\"1329\":1050013,\"1330\":1050013,\"1331\":1050013,\"1332\":1050013,\"1333\":1050013,\"1334\":1050013,\"1335\":1050013,\"1336\":1050013,\"1337\":1050013,\"1338\":1050013,\"1339\":1050013,\"1340\":1050013,\"1341\":1050013,\"1342\":1050013,\"1343\":1050013,\"1344\":1050013,\"1345\":1050013,\"1346\":1050013,\"1347\":1050013,\"1348\":1050013,\"1349\":1050013,\"1350\":1050013,\"1351\":1050013,\"1352\":1050013,\"1353\":1050013,\"1354\":1050013,\"1355\":1050013,\"1356\":1050013,\"1357\":1050013,\"1358\":1050013,\"1359\":1050013,\"1360\":1050013,\"1361\":1050013,\"1362\":1050013,\"1363\":1050013,\"1364\":1050013,\"1365\":1050013,\"1366\":1050013,\"1367\":1050013,\"1368\":1050013,\"1369\":1050013,\"1370\":1050013,\"1371\":1050013,\"1372\":1050013,\"1373\":1050013,\"1374\":1050013,\"1375\":1050013,\"1376\":1050013,\"1377\":1050013,\"1378\":1050013,\"1379\":1050013,\"1380\":1050013,\"1381\":1050013,\"1382\":1050013,\"1383\":1050013,\"1384\":1050013,\"1385\":1050013,\"1386\":1050013,\"1387\":1050013,\"1388\":1050013,\"1389\":1050013,\"1390\":1050013,\"1391\":1050013,\"1392\":1050013,\"1393\":1050013,\"1394\":1050013,\"1395\":1050013,\"1396\":1050013,\"1397\":1050013,\"1398\":1050013,\"1399\":1050013,\"1400\":1050013,\"1401\":1050013,\"1402\":1050013,\"1403\":1050013,\"1404\":1050013,\"1405\":1050013,\"1408\":1050013,\"1409\":1050013,\"1410\":1050013,\"1411\":1050013,\"1412\":1050013,\"1413\":1050013,\"1416\":1050013,\"1417\":1050013,\"1418\":1050013,\"1419\":1050013,\"1420\":1050013,\"1421\":1050013,\"1424\":1050013,\"1425\":1050013,\"1426\":1050013,\"1427\":1050013,\"1428\":1050013,\"1429\":1050013,\"1430\":1050013,\"1431\":1050013,\"1432\":1050013,\"1433\":1050013,\"1434\":1050013,\"1435\":1050013,\"1438\":1050013,\"1439\":1050013,\"1440\":1050013,\"1441\":1050013,\"1442\":1050013,\"1443\":1050013,\"1444\":1050013,\"1445\":1050013,\"1446\":1050013,\"1447\":1050013,\"1448\":1050013,\"1449\":1050013,\"1452\":1050013,\"1453\":1050013,\"1454\":1050013,\"1455\":1050013,\"1456\":1050013,\"1457\":1050013,\"1458\":1050013,\"1459\":1050013,\"1460\":1050013,\"1461\":1050013,\"1462\":1050013,\"1463\":1050013,\"1466\":1050013,\"1467\":1050013,\"1468\":1050013,\"1469\":1050013,\"1470\":1050013,\"1471\":1050013,\"1472\":1050013,\"1473\":1050013,\"1474\":1050013,\"1475\":1050013,\"1476\":1050013,\"1477\":1050013,\"1480\":1050013,\"1481\":1050013,\"1482\":1050013,\"1483\":1050013,\"1484\":1050013,\"1485\":1050013,\"1486\":1050013,\"1487\":1050013,\"1488\":1050013,\"1489\":1050013,\"1490\":1050013,\"1491\":1050013,\"1494\":1050013,\"1495\":1050013,\"1496\":1050013,\"1497\":1050013,\"1498\":1050013,\"1499\":1050013,\"1500\":1050013,\"1501\":1050013,\"1502\":1050013,\"1503\":1050013,\"1504\":1050013,\"1505\":1050013,\"1508\":1050000,\"1509\":1050000,\"1511\":1050000,\"1512\":1050000,\"1514\":1050000,\"1515\":1050000,\"1516\":1050001,\"1517\":1050001,\"1518\":1050001,\"1519\":1050001,\"1520\":1050001,\"1521\":1050001,\"1522\":1050002,\"1523\":1050002,\"1524\":1050002,\"1525\":1050002,\"1526\":1050002,\"1527\":1050002,\"1530\":1050004,\"1532\":1050004,\"1535\":1050004,\"1536\":1050004,\"1537\":1050004,\"1540\":1050004,\"1541\":1050004,\"1543\":1050004,\"1545\":1050004,\"1547\":1050004,\"1548\":1050004,\"1551\":1050004,\"1553\":1050004,\"1555\":1050004,\"1557\":1050004,\"1559\":1050004,\"1561\":1050004,\"1563\":1050004,\"1565\":1050004,\"1567\":1050004,\"1569\":1050004,\"1571\":1050004,\"1573\":1050004,\"1575\":1050004,\"1577\":1050004,\"1579\":1050004,\"1582\":1050004,\"1584\":1050004,\"1586\":1050004,\"1588\":1050004,\"1590\":1050004,\"1592\":1050004,\"1595\":1050004,\"1598\":1050004,\"1600\":1050004,\"1602\":1050004,\"1604\":1050004,\"1606\":1050004,\"1608\":1050004,\"1610\":1050004,\"1612\":1050004,\"1614\":1050004,\"1616\":1050004,\"1618\":1050004,\"1620\":1050004,\"1622\":1050004,\"1624\":1050004,\"1626\":1050004,\"1628\":1050007,\"1629\":1050007,\"1631\":1050007,\"1632\":1050007,\"1634\":1050009,\"1636\":1050009,\"1637\":1050009,\"1638\":1050009,\"1641\":1050010,\"1642\":1050010,\"1643\":1050010,\"1644\":1050010,\"1645\":1050010,\"1646\":1050010,\"1647\":1050010,\"1648\":1050010,\"1649\":1050010,\"1650\":1050010,\"1651\":1050010,\"1652\":1050010,\"1653\":1050010,\"1654\":1050010,\"1655\":1050010,\"1656\":1050010,\"1657\":1050010,\"1658\":1050010,\"1659\":1050010,\"1660\":1050010,\"1661\":1050010,\"1662\":1050010,\"1663\":1050010,\"1664\":1050010,\"1665\":1050011,\"1666\":1050011,\"1667\":1050011,\"1668\":1050011,\"1669\":1050011,\"1670\":1050011,\"1671\":1050011,\"1672\":1050011,\"1673\":1050011,\"1674\":1050011,\"1675\":1050011,\"1676\":1050011,\"1677\":1050011,\"1678\":1050011,\"1680\":1050011,\"1681\":1050013,\"1682\":1050013,\"1683\":1050013,\"1684\":1050013,\"1685\":1050013,\"1686\":1050013,\"1687\":1050013,\"1688\":1050013,\"1689\":1050013,\"1690\":1050013,\"1691\":1050013,\"1692\":1050013,\"1693\":1050013,\"1694\":1050013,\"1695\":1050013,\"1696\":1050013,\"1697\":1050013,\"1698\":1050013,\"1699\":1050013,\"1700\":1050013,\"1701\":1050013,\"1702\":1050013,\"1703\":1050013,\"1704\":1050013,\"1705\":1050013,\"1706\":1050013,\"1707\":1050013,\"1708\":1050013,\"1709\":1050013,\"1710\":1050013,\"1711\":1050013,\"1712\":1050013,\"1713\":1050013,\"1714\":1050013,\"1715\":1050013,\"1716\":1050013,\"1717\":1050013,\"1718\":1050013,\"1719\":1050013,\"1720\":1050013,\"1721\":1050013,\"1722\":1050013,\"1723\":1050013,\"1724\":1050013,\"1725\":1050013,\"1726\":1050013,\"1727\":1050013,\"1728\":1050013,\"1729\":1050013,\"1730\":1050013,\"1731\":1050013,\"1732\":1050013,\"1733\":1050013,\"1734\":1050013,\"1735\":1050013,\"1736\":1050013,\"1737\":1050013,\"1738\":1050013,\"1739\":1050013,\"1740\":1050013,\"1741\":1050013,\"1742\":1050013,\"1743\":1050013,\"1744\":1050013,\"1745\":1050013,\"1746\":1050013,\"1747\":1050013,\"1748\":1050013,\"1750\":1050013,\"1751\":1050013,\"1753\":1050013,\"1755\":1050013,\"1756\":1050013,\"1757\":1050013,\"1758\":1050013,\"1759\":1050013,\"1760\":1050013,\"1761\":1050013,\"1762\":1050013,\"1763\":1050013,\"1764\":1050013,\"1765\":1050013,\"1766\":1050013,\"1767\":1050013,\"1768\":1050013,\"1769\":1050013,\"1770\":1050013,\"1771\":1050013,\"1772\":1050013,\"1773\":1050013,\"1774\":1050013,\"1775\":1050013,\"1776\":1050013,\"1777\":1050013,\"1778\":1050013,\"1779\":1050013,\"1780\":1050013,\"1781\":1050013,\"1782\":1050013,\"1783\":1050013,\"1784\":1050013,\"1785\":1050013,\"1786\":1050013,\"1787\":1050013,\"1788\":1050013,\"1789\":1050013,\"1790\":1050013,\"1791\":1050013,\"1792\":1050013,\"1793\":1050013,\"1794\":1050013,\"1795\":1050013,\"1796\":1050013,\"1797\":1050013,\"1798\":1050013,\"1799\":1050013,\"1800\":1050013,\"1801\":1050013,\"1802\":1050013,\"1803\":1050013,\"1804\":1050013,\"1805\":1050013,\"1806\":1050013,\"1807\":1050013,\"1808\":1050013,\"1809\":1050013,\"1810\":1050013,\"1811\":1050013,\"1812\":1050013,\"1813\":1050013,\"1814\":1050013,\"1815\":1050013,\"1816\":1050013,\"1817\":1050013,\"1818\":1050013,\"1819\":1050013,\"1820\":1050013,\"1821\":1050013,\"1822\":1050013,\"1823\":1050013,\"1824\":1050013,\"1825\":1050013,\"1826\":1050013,\"1827\":1050013,\"1828\":1050013,\"1829\":1050013,\"1830\":1050013,\"1831\":1050013,\"1832\":1050013,\"1833\":1050013,\"1834\":1050013,\"1835\":1050013,\"1836\":1050013,\"1837\":1050013,\"1838\":1050013,\"1839\":1050013,\"1840\":1050013,\"1841\":1050013,\"1842\":1050013,\"1843\":1050013,\"1844\":1050013,\"1845\":1050013,\"1846\":1050013,\"1847\":1050013,\"1848\":1050013,\"1849\":1050013,\"1850\":1050013,\"1851\":1050013,\"1852\":1050013,\"1855\":1050013,\"1856\":1050013,\"1857\":1050013,\"1858\":1050013,\"1859\":1050013,\"1860\":1050013,\"1863\":1050013,\"1864\":1050013,\"1865\":1050013,\"1866\":1050013,\"1867\":1050013,\"1868\":1050013,\"1869\":\"0\",\"1871\":\"0\",\"1873\":\"0\",\"1875\":\"0\",\"1877\":\"0\",\"1879\":\"0\",\"1881\":\"0\",\"1883\":\"0\",\"1885\":\"0\",\"1887\":\"0\",\"1889\":\"0\",\"1891\":\"0\",\"1893\":\"0\",\"1894\":\"0\",\"1895\":\"0\",\"1896\":\"0\",\"1897\":\"0\",\"1898\":\"0\",\"1899\":\"0\",\"1900\":\"0\",\"1901\":\"0\",\"1902\":1050000,\"1903\":1050000,\"1904\":1050001,\"1905\":1050001,\"1906\":1050002,\"1907\":1050002,\"1909\":1050002,\"1911\":1050003,\"1913\":1050004,\"1914\":1050004,\"1915\":1050004,\"1917\":\"0\",\"1918\":\"0\",\"1919\":\"0\",\"1920\":\"0\",\"1921\":\"0\",\"1922\":\"0\",\"1923\":\"0\",\"1924\":\"0\",\"1925\":\"0\",\"1926\":\"0\",\"1927\":\"0\",\"1928\":\"0\",\"1929\":\"0\",\"1930\":1050004,\"1931\":1050004,\"1932\":1050004,\"1933\":1050004,\"1934\":1050005,\"1936\":1050004,\"1937\":1050004,\"1938\":1050004,\"1939\":1050004,\"1940\":1050004,\"1941\":1050004,\"1942\":1050004,\"1943\":1050004,\"1944\":1050004,\"1945\":1050004,\"1946\":1050004,\"1948\":1050004,\"1950\":1050004,\"1952\":1050004,\"1954\":1050004,\"1956\":1050004,\"1958\":1050004,\"1960\":1050004,\"1962\":1050004,\"1964\":1050004,\"1965\":1050007,\"1966\":1050007,\"1967\":1050008,\"1968\":1050008,\"1969\":1050008,\"1970\":1050009,\"1971\":1050009,\"1972\":1050009,\"1973\":1050009,\"1974\":1050009,\"1975\":1050009,\"1976\":1050010,\"1977\":1050010,\"1978\":1050010,\"1979\":1050010,\"1980\":1050010,\"1981\":1050010,\"1982\":1050010,\"1983\":1050011,\"1984\":1050011,\"1985\":1050011,\"1986\":1050011,\"1987\":1050011,\"1988\":1050011,\"1989\":1050011,\"1990\":1050011,\"1991\":1050011,\"1992\":1050011,\"1993\":1050011,\"1994\":1050011,\"1995\":1050011,\"1996\":1050011,\"1997\":1050011,\"1998\":1050011,\"1999\":1050011,\"2000\":1050011,\"2001\":1050011,\"2002\":1050011,\"2003\":1050013,\"2004\":1050013,\"2005\":1050013,\"2006\":1050013,\"2007\":1050013,\"2008\":1050013,\"2009\":1050013,\"2010\":1050013,\"2011\":1050013,\"2012\":1050013,\"2013\":1050013,\"2014\":1050013,\"2015\":1050013,\"2016\":1050013,\"2017\":1050013,\"2018\":1050013,\"2019\":1050013,\"2020\":1050013,\"2021\":1050013,\"2022\":1050013,\"2023\":1050013,\"2024\":1050013,\"2025\":1050013,\"2026\":1050013,\"2027\":1050013,\"2028\":1050013,\"2029\":1050013,\"2030\":1050013,\"2031\":1050013,\"2032\":1050013,\"2033\":1050013,\"2034\":1050013,\"2035\":1050013,\"2036\":1050013,\"2037\":1050013,\"2038\":1050013,\"2039\":1050013,\"2040\":1050013,\"2042\":1050013,\"2043\":1050013,\"2044\":1050013,\"2045\":1050013,\"2046\":1050013,\"2047\":1050013,\"2048\":1050013,\"2049\":1050013,\"2050\":1050013,\"2051\":1050013,\"2052\":1050013,\"2053\":1050013,\"2054\":1050013,\"2055\":1050013,\"2056\":1050013,\"2057\":1050013,\"2058\":1050013,\"2059\":1050013,\"2060\":1050013,\"2061\":1050013,\"2062\":1050013,\"2063\":1050013,\"2064\":1050013,\"2065\":1050000,\"2066\":1050001,\"2067\":1050002,\"2068\":1050004,\"2069\":1050004,\"2070\":1050004,\"2071\":1050004,\"2072\":1050004,\"2073\":1050004,\"2074\":1050006,\"2075\":1050006,\"2076\":1050007,\"2077\":1050007,\"2078\":1050007,\"2079\":1050009,\"2080\":1050010,\"2081\":1050010,\"2082\":1050011,\"2083\":1050011,\"2084\":1050011,\"2085\":1050011,\"2086\":1050011,\"2087\":1050011,\"2088\":1050011,\"2089\":1050011,\"2090\":1050011,\"2091\":1050012,\"2092\":1050013,\"2093\":1050013,\"2094\":1050013,\"2095\":1050013,\"2096\":1050013,\"2097\":1050013,\"2098\":1050013,\"2099\":1050013,\"2100\":1050013,\"2101\":1050013,\"2102\":1050013,\"2103\":1050014,\"2104\":1050015,\"2105\":1050016,\"2106\":1050017,\"2107\":1050018,\"2108\":1050019,\"2109\":1050003,\"2110\":1050020,\"2111\":1050021,\"2112\":1050022,\"2113\":1050023,\"2114\":1050024,\"2115\":1050025,\"2116\":1050026,\"2117\":1050027,\"2118\":1050028,\"2119\":1050029,\"2120\":1050030,\"2121\":1050031,\"2122\":1050032,\"2123\":1050033,\"2124\":1050034,\"2125\":1050035,\"2126\":1050036},{\"1508\":[1,0],\"1509\":[1,0],\"1511\":[1,0],\"1512\":[1,0],\"1514\":[1,0],\"1515\":[1,0],\"1516\":[1,0],\"1517\":[1,0],\"1518\":[1,0],\"1519\":[1,0],\"1520\":[1,0],\"1521\":[1,0],\"1522\":[1,0],\"1523\":[1,0],\"1524\":[1,0],\"1525\":[1,0],\"1526\":[1,0],\"1527\":[1,0],\"1902\":[1,0],\"1903\":[1,0],\"1904\":[1,0],\"1905\":[1,0],\"1906\":[1,0],\"1907\":[1,0],\"1944\":[1,0],\"1945\":[1,0],\"1946\":[1,0],\"1948\":[1,0],\"1950\":[1,0],\"1952\":[1,0],\"1954\":[1,0],\"1956\":[1,0],\"1958\":[1,0],\"1960\":[1,0],\"1962\":[1,0]},{}]","[100,1497,{\"0\":{\"2856\":1436,\"5966\":1439,\"7572\":1048,\"10111\":1448,\"10866\":948,\"11368\":1442,\"23933\":928,\"25091\":1064,\"27544\":1179,\"37852\":1456,\"41891\":938,\"44826\":1011,\"45293\":998,\"46381\":1056,\"46438\":1060,\"57524\":1454,\"64209\":1481,\"64210\":1482,\"64899\":1032,\"70334\":1182,\"70800\":1052,\"72493\":1040,\"77845\":1451,\"80574\":1445,\"84514\":1433,\"1050000\":985,\"1050001\":1024,\"1050002\":1176,\"1050003\":1068,\"1050004\":1487,\"1050005\":1488,\"1050006\":1,\"1050007\":35,\"1050008\":69,\"1050009\":137,\"1050010\":1489,\"1050011\":1490,\"1050012\":1248,\"1050013\":1491,\"1050014\":103,\"1050015\":1295,\"1050016\":1462,\"1050017\":1463,\"1050018\":1464,\"1050019\":1465,\"1050020\":1081,\"1050021\":1484,\"1050022\":1485,\"1050023\":1477,\"1050025\":1227,\"1050026\":1234,\"1050027\":1241,\"1050028\":1339,\"1050029\":1345,\"1050030\":1425,\"1050031\":1492,\"1050032\":1493,\"1050033\":1494,\"1050034\":1495,\"1050035\":1496,\"1050036\":1497,\"2070003\":0},\"1\":{\"1050016\":2,\"1050017\":1314,\"1050018\":1319,\"2070003\":1466},\"2\":{\"46\":3,\"1050006\":1113,\"1050007\":1112,\"1050008\":1110,\"1050009\":182,\"1050014\":1111,\"2070003\":1309},\"3\":{\"1050006\":897,\"1050007\":896,\"1050008\":894,\"1050009\":4,\"1050014\":895,\"2070003\":0},\"4\":{\"46\":5,\"3320\":20,\"1050008\":213,\"1050014\":220,\"2070003\":893},\"5\":{\"1050006\":508,\"1050007\":507,\"1050008\":6,\"1050014\":13,\"2070003\":0},\"6\":{\"46\":7,\"3320\":10,\"1050006\":228,\"1050007\":227,\"2070003\":583},\"7\":{\"1050006\":9,\"1050007\":8,\"2070003\":229},\"10\":{\"1050006\":12,\"1050007\":11,\"2070003\":230},\"13\":{\"46\":14,\"3320\":17,\"1050006\":232,\"1050007\":231,\"2070003\":584},\"14\":{\"1050006\":16,\"1050007\":15,\"2070003\":233},\"17\":{\"1050006\":19,\"1050007\":18,\"2070003\":234},\"20\":{\"1050006\":512,\"1050007\":511,\"1050008\":21,\"1050014\":28,\"2070003\":0},\"21\":{\"46\":22,\"3320\":25,\"1050006\":236,\"1050007\":235,\"2070003\":585},\"22\":{\"1050006\":24,\"1050007\":23,\"2070003\":237},\"25\":{\"1050006\":27,\"1050007\":26,\"2070003\":238},\"28\":{\"46\":29,\"3320\":32,\"1050006\":240,\"1050007\":239,\"2070003\":586},\"29\":{\"1050006\":31,\"1050007\":30,\"2070003\":241},\"32\":{\"1050006\":34,\"1050007\":33,\"2070003\":242},\"35\":{\"1050016\":36,\"1050017\":1315,\"1050018\":1320,\"2070003\":1467},\"36\":{\"46\":37,\"1050006\":1118,\"1050007\":1117,\"1050008\":1115,\"1050009\":243,\"1050014\":1116,\"2070003\":1310},\"37\":{\"1050006\":902,\"1050007\":901,\"1050008\":899,\"1050009\":38,\"1050014\":900,\"2070003\":0},\"38\":{\"46\":39,\"3320\":54,\"1050008\":274,\"1050014\":281,\"2070003\":898},\"39\":{\"1050006\":516,\"1050007\":515,\"1050008\":40,\"1050014\":47,\"2070003\":0},\"40\":{\"46\":41,\"3320\":44,\"1050006\":289,\"1050007\":288,\"2070003\":625},\"41\":{\"1050006\":43,\"1050007\":42,\"2070003\":290},\"44\":{\"1050006\":46,\"1050007\":45,\"2070003\":291},\"47\":{\"46\":48,\"3320\":51,\"1050006\":293,\"1050007\":292,\"2070003\":626},\"48\":{\"1050006\":50,\"1050007\":49,\"2070003\":294},\"51\":{\"1050006\":53,\"1050007\":52,\"2070003\":295},\"54\":{\"1050006\":520,\"1050007\":519,\"1050008\":55,\"1050014\":62,\"2070003\":0},\"55\":{\"46\":56,\"3320\":59,\"1050006\":297,\"1050007\":296,\"2070003\":627},\"56\":{\"1050006\":58,\"1050007\":57,\"2070003\":298},\"59\":{\"1050006\":61,\"1050007\":60,\"2070003\":299},\"62\":{\"46\":63,\"3320\":66,\"1050006\":301,\"1050007\":300,\"2070003\":628},\"63\":{\"1050006\":65,\"1050007\":64,\"2070003\":302},\"66\":{\"1050006\":68,\"1050007\":67,\"2070003\":303},\"69\":{\"3320\":1094,\"1050006\":1301,\"1050007\":879,\"1050016\":70,\"1050017\":1316,\"1050018\":1321,\"2070003\":1468},\"70\":{\"46\":71,\"1050006\":1123,\"1050007\":1122,\"1050008\":1120,\"1050009\":304,\"1050014\":1121,\"2070003\":1311},\"71\":{\"1050006\":907,\"1050007\":906,\"1050008\":904,\"1050009\":72,\"1050014\":905,\"2070003\":0},\"72\":{\"46\":73,\"3320\":88,\"1050008\":335,\"1050014\":342,\"2070003\":903},\"73\":{\"1050006\":524,\"1050007\":523,\"1050008\":74,\"1050014\":81,\"2070003\":0},\"74\":{\"46\":75,\"3320\":78,\"1050006\":350,\"1050007\":349,\"2070003\":667},\"75\":{\"1050006\":77,\"1050007\":76,\"2070003\":351},\"78\":{\"1050006\":80,\"1050007\":79,\"2070003\":352},\"81\":{\"46\":82,\"3320\":85,\"1050006\":354,\"1050007\":353,\"2070003\":668},\"82\":{\"1050006\":84,\"1050007\":83,\"2070003\":355},\"85\":{\"1050006\":87,\"1050007\":86,\"2070003\":356},\"88\":{\"1050006\":528,\"1050007\":527,\"1050008\":89,\"1050014\":96,\"2070003\":0},\"89\":{\"46\":90,\"3320\":93,\"1050006\":358,\"1050007\":357,\"2070003\":669},\"90\":{\"1050006\":92,\"1050007\":91,\"2070003\":359},\"93\":{\"1050006\":95,\"1050007\":94,\"2070003\":360},\"96\":{\"46\":97,\"3320\":100,\"1050006\":362,\"1050007\":361,\"2070003\":670},\"97\":{\"1050006\":99,\"1050007\":98,\"2070003\":363},\"100\":{\"1050006\":102,\"1050007\":101,\"2070003\":364},\"103\":{\"3320\":1096,\"1050006\":1302,\"1050007\":882,\"1050015\":1290,\"1050016\":104,\"1050017\":1317,\"1050018\":1322,\"1050019\":1294,\"2070003\":1469},\"104\":{\"46\":105,\"1050006\":1128,\"1050007\":1127,\"1050008\":1125,\"1050009\":365,\"1050014\":1126,\"2070003\":1312},\"105\":{\"1050006\":912,\"1050007\":911,\"1050008\":909,\"1050009\":106,\"1050014\":910,\"2070003\":0},\"106\":{\"46\":107,\"3320\":122,\"1050008\":396,\"1050014\":403,\"2070003\":908},\"107\":{\"1050006\":532,\"1050007\":531,\"1050008\":108,\"1050014\":115,\"2070003\":0},\"108\":{\"46\":109,\"3320\":112,\"1050006\":411,\"1050007\":410,\"2070003\":709},\"109\":{\"1050006\":111,\"1050007\":110,\"2070003\":412},\"112\":{\"1050006\":114,\"1050007\":113,\"2070003\":413},\"115\":{\"46\":116,\"3320\":119,\"1050006\":415,\"1050007\":414,\"2070003\":710},\"116\":{\"1050006\":118,\"1050007\":117,\"2070003\":416},\"119\":{\"1050006\":121,\"1050007\":120,\"2070003\":417},\"122\":{\"1050006\":536,\"1050007\":535,\"1050008\":123,\"1050014\":130,\"2070003\":0},\"123\":{\"46\":124,\"3320\":127,\"1050006\":419,\"1050007\":418,\"2070003\":711},\"124\":{\"1050006\":126,\"1050007\":125,\"2070003\":420},\"127\":{\"1050006\":129,\"1050007\":128,\"2070003\":421},\"130\":{\"46\":131,\"3320\":134,\"1050006\":423,\"1050007\":422,\"2070003\":712},\"131\":{\"1050006\":133,\"1050007\":132,\"2070003\":424},\"134\":{\"1050006\":136,\"1050007\":135,\"2070003\":425},\"137\":{\"46\":171,\"3320\":1102,\"1050006\":1308,\"1050007\":1307,\"1050008\":487,\"1050014\":492,\"1050016\":138,\"1050017\":1318,\"1050018\":1323,\"2070003\":1470},\"138\":{\"46\":139,\"1050006\":1133,\"1050007\":1132,\"1050008\":1130,\"1050009\":426,\"1050014\":1131,\"2070003\":1313},\"139\":{\"1050006\":917,\"1050007\":916,\"1050008\":914,\"1050009\":140,\"1050014\":915,\"2070003\":0},\"140\":{\"46\":141,\"3320\":156,\"1050008\":457,\"1050014\":464,\"2070003\":913},\"141\":{\"1050006\":540,\"1050007\":539,\"1050008\":142,\"1050014\":149,\"2070003\":0},\"142\":{\"46\":143,\"3320\":146,\"1050006\":472,\"1050007\":471,\"2070003\":751},\"143\":{\"1050006\":145,\"1050007\":144,\"2070003\":473},\"146\":{\"1050006\":148,\"1050007\":147,\"2070003\":474},\"149\":{\"46\":150,\"3320\":153,\"1050006\":476,\"1050007\":475,\"2070003\":752},\"150\":{\"1050006\":152,\"1050007\":151,\"2070003\":477},\"153\":{\"1050006\":155,\"1050007\":154,\"2070003\":478},\"156\":{\"1050006\":544,\"1050007\":543,\"1050008\":157,\"1050014\":164,\"2070003\":0},\"157\":{\"46\":158,\"3320\":161,\"1050006\":480,\"1050007\":479,\"2070003\":753},\"158\":{\"1050006\":160,\"1050007\":159,\"2070003\":481},\"161\":{\"1050006\":163,\"1050007\":162,\"2070003\":482},\"164\":{\"46\":165,\"3320\":168,\"1050006\":484,\"1050007\":483,\"2070003\":754},\"165\":{\"1050006\":167,\"1050007\":166,\"2070003\":485},\"168\":{\"1050006\":170,\"1050007\":169,\"2070003\":486},\"171\":{\"1050008\":172,\"1050014\":177,\"2070003\":0},\"172\":{\"46\":173,\"3320\":755,\"1050007\":497,\"2070003\":0},\"173\":{\"1050007\":174,\"2070003\":0},\"174\":{\"3320\":175,\"1050006\":500,\"2070003\":0},\"175\":{\"1050006\":176,\"2070003\":0},\"177\":{\"46\":178,\"3320\":757,\"1050007\":501,\"2070003\":0},\"178\":{\"1050007\":179,\"2070003\":0},\"179\":{\"3320\":180,\"1050006\":504,\"2070003\":0},\"180\":{\"1050006\":181,\"2070003\":0},\"182\":{\"46\":183,\"3320\":198,\"1050008\":545,\"1050014\":552,\"2070003\":1109},\"183\":{\"1050006\":772,\"1050007\":771,\"1050008\":184,\"1050014\":191,\"2070003\":0},\"184\":{\"46\":185,\"3320\":188,\"1050006\":560,\"1050007\":559,\"2070003\":817},\"185\":{\"1050006\":187,\"1050007\":186,\"2070003\":561},\"188\":{\"1050006\":190,\"1050007\":189,\"2070003\":562},\"191\":{\"46\":192,\"3320\":195,\"1050006\":564,\"1050007\":563,\"2070003\":818},\"192\":{\"1050006\":194,\"1050007\":193,\"2070003\":565},\"195\":{\"1050006\":197,\"1050007\":196,\"2070003\":566},\"198\":{\"1050006\":776,\"1050007\":775,\"1050008\":199,\"1050014\":206,\"2070003\":0},\"199\":{\"46\":200,\"3320\":203,\"1050006\":568,\"1050007\":567,\"2070003\":819},\"200\":{\"1050006\":202,\"1050007\":201,\"2070003\":569},\"203\":{\"1050006\":205,\"1050007\":204,\"2070003\":570},\"206\":{\"46\":207,\"3320\":210,\"1050006\":572,\"1050007\":571,\"2070003\":820},\"207\":{\"1050006\":209,\"1050007\":208,\"2070003\":573},\"210\":{\"1050006\":212,\"1050007\":211,\"2070003\":574},\"213\":{\"46\":214,\"3320\":217,\"1050006\":576,\"1050007\":575,\"2070003\":821},\"214\":{\"1050006\":216,\"1050007\":215,\"2070003\":577},\"217\":{\"1050006\":219,\"1050007\":218,\"2070003\":578},\"220\":{\"46\":221,\"3320\":224,\"1050006\":580,\"1050007\":579,\"2070003\":822},\"221\":{\"1050006\":223,\"1050007\":222,\"2070003\":581},\"224\":{\"1050006\":226,\"1050007\":225,\"2070003\":582},\"243\":{\"46\":244,\"3320\":259,\"1050008\":587,\"1050014\":594,\"2070003\":1114},\"244\":{\"1050006\":780,\"1050007\":779,\"1050008\":245,\"1050014\":252,\"2070003\":0},\"245\":{\"46\":246,\"3320\":249,\"1050006\":602,\"1050007\":601,\"2070003\":831},\"246\":{\"1050006\":248,\"1050007\":247,\"2070003\":603},\"249\":{\"1050006\":251,\"1050007\":250,\"2070003\":604},\"252\":{\"46\":253,\"3320\":256,\"1050006\":606,\"1050007\":605,\"2070003\":832},\"253\":{\"1050006\":255,\"1050007\":254,\"2070003\":607},\"256\":{\"1050006\":258,\"1050007\":257,\"2070003\":608},\"259\":{\"1050006\":784,\"1050007\":783,\"1050008\":260,\"1050014\":267,\"2070003\":0},\"260\":{\"46\":261,\"3320\":264,\"1050006\":610,\"1050007\":609,\"2070003\":833},\"261\":{\"1050006\":263,\"1050007\":262,\"2070003\":611},\"264\":{\"1050006\":266,\"1050007\":265,\"2070003\":612},\"267\":{\"46\":268,\"3320\":271,\"1050006\":614,\"1050007\":613,\"2070003\":834},\"268\":{\"1050006\":270,\"1050007\":269,\"2070003\":615},\"271\":{\"1050006\":273,\"1050007\":272,\"2070003\":616},\"274\":{\"46\":275,\"3320\":278,\"1050006\":618,\"1050007\":617,\"2070003\":835},\"275\":{\"1050006\":277,\"1050007\":276,\"2070003\":619},\"278\":{\"1050006\":280,\"1050007\":279,\"2070003\":620},\"281\":{\"46\":282,\"3320\":285,\"1050006\":622,\"1050007\":621,\"2070003\":836},\"282\":{\"1050006\":284,\"1050007\":283,\"2070003\":623},\"285\":{\"1050006\":287,\"1050007\":286,\"2070003\":624},\"304\":{\"46\":305,\"3320\":320,\"1050008\":629,\"1050014\":636,\"2070003\":1119},\"305\":{\"1050006\":788,\"1050007\":787,\"1050008\":306,\"1050014\":313,\"2070003\":0},\"306\":{\"46\":307,\"3320\":310,\"1050006\":644,\"1050007\":643,\"2070003\":845},\"307\":{\"1050006\":309,\"1050007\":308,\"2070003\":645},\"310\":{\"1050006\":312,\"1050007\":311,\"2070003\":646},\"313\":{\"46\":314,\"3320\":317,\"1050006\":648,\"1050007\":647,\"2070003\":846},\"314\":{\"1050006\":316,\"1050007\":315,\"2070003\":649},\"317\":{\"1050006\":319,\"1050007\":318,\"2070003\":650},\"320\":{\"1050006\":792,\"1050007\":791,\"1050008\":321,\"1050014\":328,\"2070003\":0},\"321\":{\"46\":322,\"3320\":325,\"1050006\":652,\"1050007\":651,\"2070003\":847},\"322\":{\"1050006\":324,\"1050007\":323,\"2070003\":653},\"325\":{\"1050006\":327,\"1050007\":326,\"2070003\":654},\"328\":{\"46\":329,\"3320\":332,\"1050006\":656,\"1050007\":655,\"2070003\":848},\"329\":{\"1050006\":331,\"1050007\":330,\"2070003\":657},\"332\":{\"1050006\":334,\"1050007\":333,\"2070003\":658},\"335\":{\"46\":336,\"3320\":339,\"1050006\":660,\"1050007\":659,\"2070003\":849},\"336\":{\"1050006\":338,\"1050007\":337,\"2070003\":661},\"339\":{\"1050006\":341,\"1050007\":340,\"2070003\":662},\"342\":{\"46\":343,\"3320\":346,\"1050006\":664,\"1050007\":663,\"2070003\":850},\"343\":{\"1050006\":345,\"1050007\":344,\"2070003\":665},\"346\":{\"1050006\":348,\"1050007\":347,\"2070003\":666},\"365\":{\"46\":366,\"3320\":381,\"1050008\":671,\"1050014\":678,\"2070003\":1124},\"366\":{\"1050006\":796,\"1050007\":795,\"1050008\":367,\"1050014\":374,\"2070003\":0},\"367\":{\"46\":368,\"3320\":371,\"1050006\":686,\"1050007\":685,\"2070003\":859},\"368\":{\"1050006\":370,\"1050007\":369,\"2070003\":687},\"371\":{\"1050006\":373,\"1050007\":372,\"2070003\":688},\"374\":{\"46\":375,\"3320\":378,\"1050006\":690,\"1050007\":689,\"2070003\":860},\"375\":{\"1050006\":377,\"1050007\":376,\"2070003\":691},\"378\":{\"1050006\":380,\"1050007\":379,\"2070003\":692},\"381\":{\"1050006\":800,\"1050007\":799,\"1050008\":382,\"1050014\":389,\"2070003\":0},\"382\":{\"46\":383,\"3320\":386,\"1050006\":694,\"1050007\":693,\"2070003\":861},\"383\":{\"1050006\":385,\"1050007\":384,\"2070003\":695},\"386\":{\"1050006\":388,\"1050007\":387,\"2070003\":696},\"389\":{\"46\":390,\"3320\":393,\"1050006\":698,\"1050007\":697,\"2070003\":862},\"390\":{\"1050006\":392,\"1050007\":391,\"2070003\":699},\"393\":{\"1050006\":395,\"1050007\":394,\"2070003\":700},\"396\":{\"46\":397,\"3320\":400,\"1050006\":702,\"1050007\":701,\"2070003\":863},\"397\":{\"1050006\":399,\"1050007\":398,\"2070003\":703},\"400\":{\"1050006\":402,\"1050007\":401,\"2070003\":704},\"403\":{\"46\":404,\"3320\":407,\"1050006\":706,\"1050007\":705,\"2070003\":864},\"404\":{\"1050006\":406,\"1050007\":405,\"2070003\":707},\"407\":{\"1050006\":409,\"1050007\":408,\"2070003\":708},\"426\":{\"46\":427,\"3320\":442,\"1050008\":713,\"1050014\":720,\"2070003\":1129},\"427\":{\"1050006\":804,\"1050007\":803,\"1050008\":428,\"1050014\":435,\"2070003\":0},\"428\":{\"46\":429,\"3320\":432,\"1050006\":728,\"1050007\":727,\"2070003\":873},\"429\":{\"1050006\":431,\"1050007\":430,\"2070003\":729},\"432\":{\"1050006\":434,\"1050007\":433,\"2070003\":730},\"435\":{\"46\":436,\"3320\":439,\"1050006\":732,\"1050007\":731,\"2070003\":874},\"436\":{\"1050006\":438,\"1050007\":437,\"2070003\":733},\"439\":{\"1050006\":441,\"1050007\":440,\"2070003\":734},\"442\":{\"1050006\":808,\"1050007\":807,\"1050008\":443,\"1050014\":450,\"2070003\":0},\"443\":{\"46\":444,\"3320\":447,\"1050006\":736,\"1050007\":735,\"2070003\":875},\"444\":{\"1050006\":446,\"1050007\":445,\"2070003\":737},\"447\":{\"1050006\":449,\"1050007\":448,\"2070003\":738},\"450\":{\"46\":451,\"3320\":454,\"1050006\":740,\"1050007\":739,\"2070003\":876},\"451\":{\"1050006\":453,\"1050007\":452,\"2070003\":741},\"454\":{\"1050006\":456,\"1050007\":455,\"2070003\":742},\"457\":{\"46\":458,\"3320\":461,\"1050006\":744,\"1050007\":743,\"2070003\":877},\"458\":{\"1050006\":460,\"1050007\":459,\"2070003\":745},\"461\":{\"1050006\":463,\"1050007\":462,\"2070003\":746},\"464\":{\"46\":465,\"3320\":468,\"1050006\":748,\"1050007\":747,\"2070003\":878},\"465\":{\"1050006\":467,\"1050007\":466,\"2070003\":749},\"468\":{\"1050006\":470,\"1050007\":469,\"2070003\":750},\"487\":{\"46\":488,\"3320\":885,\"1050007\":759,\"2070003\":1305},\"488\":{\"1050007\":489,\"2070003\":0},\"489\":{\"3320\":490,\"1050006\":762,\"2070003\":0},\"490\":{\"1050006\":491,\"2070003\":0},\"492\":{\"46\":493,\"3320\":887,\"1050007\":763,\"2070003\":1306},\"493\":{\"1050007\":494,\"2070003\":0},\"494\":{\"3320\":495,\"1050006\":766,\"2070003\":0},\"495\":{\"1050006\":496,\"2070003\":0},\"497\":{\"3320\":498,\"1050006\":767,\"2070003\":889},\"498\":{\"1050006\":499,\"2070003\":0},\"501\":{\"3320\":502,\"1050006\":768,\"2070003\":890},\"502\":{\"1050006\":503,\"2070003\":0},\"545\":{\"46\":546,\"3320\":549,\"1050006\":810,\"1050007\":809,\"2070003\":918},\"546\":{\"1050006\":548,\"1050007\":547,\"2070003\":811},\"549\":{\"1050006\":551,\"1050007\":550,\"2070003\":812},\"552\":{\"46\":553,\"3320\":556,\"1050006\":814,\"1050007\":813,\"2070003\":919},\"553\":{\"1050006\":555,\"1050007\":554,\"2070003\":815},\"556\":{\"1050006\":558,\"1050007\":557,\"2070003\":816},\"587\":{\"46\":588,\"3320\":591,\"1050006\":824,\"1050007\":823,\"2070003\":920},\"588\":{\"1050006\":590,\"1050007\":589,\"2070003\":825},\"591\":{\"1050006\":593,\"1050007\":592,\"2070003\":826},\"594\":{\"46\":595,\"3320\":598,\"1050006\":828,\"1050007\":827,\"2070003\":921},\"595\":{\"1050006\":597,\"1050007\":596,\"2070003\":829},\"598\":{\"1050006\":600,\"1050007\":599,\"2070003\":830},\"629\":{\"46\":630,\"3320\":633,\"1050006\":838,\"1050007\":837,\"2070003\":922},\"630\":{\"1050006\":632,\"1050007\":631,\"2070003\":839},\"633\":{\"1050006\":635,\"1050007\":634,\"2070003\":840},\"636\":{\"46\":637,\"3320\":640,\"1050006\":842,\"1050007\":841,\"2070003\":923},\"637\":{\"1050006\":639,\"1050007\":638,\"2070003\":843},\"640\":{\"1050006\":642,\"1050007\":641,\"2070003\":844},\"671\":{\"46\":672,\"3320\":675,\"1050006\":852,\"1050007\":851,\"2070003\":924},\"672\":{\"1050006\":674,\"1050007\":673,\"2070003\":853},\"675\":{\"1050006\":677,\"1050007\":676,\"2070003\":854},\"678\":{\"46\":679,\"3320\":682,\"1050006\":856,\"1050007\":855,\"2070003\":925},\"679\":{\"1050006\":681,\"1050007\":680,\"2070003\":857},\"682\":{\"1050006\":684,\"1050007\":683,\"2070003\":858},\"713\":{\"46\":714,\"3320\":717,\"1050006\":866,\"1050007\":865,\"2070003\":926},\"714\":{\"1050006\":716,\"1050007\":715,\"2070003\":867},\"717\":{\"1050006\":719,\"1050007\":718,\"2070003\":868},\"720\":{\"46\":721,\"3320\":724,\"1050006\":870,\"1050007\":869,\"2070003\":927},\"721\":{\"1050006\":723,\"1050007\":722,\"2070003\":871},\"724\":{\"1050006\":726,\"1050007\":725,\"2070003\":872},\"755\":{\"1050007\":756,\"2070003\":0},\"757\":{\"1050007\":758,\"2070003\":0},\"759\":{\"3320\":760,\"1050006\":891,\"2070003\":1107},\"760\":{\"1050006\":761,\"2070003\":0},\"763\":{\"3320\":764,\"1050006\":892,\"2070003\":1108},\"764\":{\"1050006\":765,\"2070003\":0},\"879\":{\"46\":880,\"1050006\":1100,\"2070003\":1303},\"880\":{\"1050006\":881,\"2070003\":0},\"882\":{\"46\":883,\"1050006\":1101,\"2070003\":1304},\"883\":{\"1050006\":884,\"2070003\":0},\"885\":{\"1050007\":886,\"2070003\":0},\"887\":{\"1050007\":888,\"2070003\":0},\"928\":{\"27544\":932,\"44826\":964,\"45293\":961,\"70334\":935,\"1050000\":958,\"1050002\":929,\"1050023\":1408,\"1050028\":1401,\"2070003\":0},\"929\":{\"51345\":930,\"1050028\":1167,\"2070003\":1402},\"930\":{\"1050028\":931,\"2070003\":0},\"932\":{\"51345\":933,\"1050028\":1168,\"2070003\":1403},\"933\":{\"1050028\":934,\"2070003\":0},\"935\":{\"51345\":936,\"1050028\":1169,\"2070003\":1404},\"936\":{\"1050028\":937,\"2070003\":0},\"938\":{\"27544\":942,\"44826\":973,\"45293\":970,\"70334\":945,\"1050000\":967,\"1050002\":939,\"1050023\":1416,\"1050028\":1409,\"2070003\":0},\"939\":{\"51345\":940,\"1050028\":1170,\"2070003\":1410},\"940\":{\"1050028\":941,\"2070003\":0},\"942\":{\"51345\":943,\"1050028\":1171,\"2070003\":1411},\"943\":{\"1050028\":944,\"2070003\":0},\"945\":{\"51345\":946,\"1050028\":1172,\"2070003\":1412},\"946\":{\"1050028\":947,\"2070003\":0},\"948\":{\"27544\":952,\"44826\":982,\"45293\":979,\"70334\":955,\"1050000\":976,\"1050002\":949,\"1050023\":1424,\"1050028\":1417,\"2070003\":0},\"949\":{\"51345\":950,\"1050028\":1173,\"2070003\":1418},\"950\":{\"1050028\":951,\"2070003\":0},\"952\":{\"51345\":953,\"1050028\":1174,\"2070003\":1419},\"953\":{\"1050028\":954,\"2070003\":0},\"955\":{\"51345\":956,\"1050028\":1175,\"2070003\":1420},\"956\":{\"1050028\":957,\"2070003\":0},\"958\":{\"51345\":959,\"1050025\":1185,\"1050026\":1186,\"1050027\":1187,\"1050028\":1188,\"2070003\":1405},\"959\":{\"1050028\":960,\"2070003\":0},\"961\":{\"51345\":962,\"1050025\":1189,\"1050026\":1190,\"1050027\":1191,\"1050028\":1192,\"2070003\":1406},\"962\":{\"1050028\":963,\"2070003\":0},\"964\":{\"51345\":965,\"1050025\":1193,\"1050026\":1194,\"1050027\":1195,\"1050028\":1196,\"2070003\":1407},\"965\":{\"1050028\":966,\"2070003\":0},\"967\":{\"51345\":968,\"1050025\":1197,\"1050026\":1198,\"1050027\":1199,\"1050028\":1200,\"2070003\":1413},\"968\":{\"1050028\":969,\"2070003\":0},\"970\":{\"51345\":971,\"1050025\":1201,\"1050026\":1202,\"1050027\":1203,\"1050028\":1204,\"2070003\":1414},\"971\":{\"1050028\":972,\"2070003\":0},\"973\":{\"51345\":974,\"1050025\":1205,\"1050026\":1206,\"1050027\":1207,\"1050028\":1208,\"2070003\":1415},\"974\":{\"1050028\":975,\"2070003\":0},\"976\":{\"51345\":977,\"1050025\":1209,\"1050026\":1210,\"1050027\":1211,\"1050028\":1212,\"2070003\":1421},\"977\":{\"1050028\":978,\"2070003\":0},\"979\":{\"51345\":980,\"1050025\":1213,\"1050026\":1214,\"1050027\":1215,\"1050028\":1216,\"2070003\":1422},\"980\":{\"1050028\":981,\"2070003\":0},\"982\":{\"51345\":983,\"1050025\":1217,\"1050026\":1218,\"1050027\":1219,\"1050028\":1220,\"2070003\":1423},\"983\":{\"1050028\":984,\"2070003\":0},\"985\":{\"51345\":1221,\"1050012\":995,\"1050025\":986,\"1050026\":989,\"1050027\":992,\"1050028\":1365,\"2070003\":1479},\"986\":{\"46\":987,\"1050028\":1255,\"2070003\":1386},\"987\":{\"1050028\":988,\"2070003\":0},\"989\":{\"46\":990,\"1050028\":1256,\"2070003\":1387},\"990\":{\"1050028\":991,\"2070003\":0},\"992\":{\"46\":993,\"1050028\":1257,\"2070003\":1388},\"993\":{\"1050028\":994,\"2070003\":0},\"995\":{\"46\":996,\"1050028\":1258,\"2070003\":1389},\"996\":{\"1050028\":997,\"2070003\":0},\"998\":{\"51345\":1223,\"1050012\":1008,\"1050025\":999,\"1050026\":1002,\"1050027\":1005,\"1050028\":1369,\"2070003\":0},\"999\":{\"46\":1000,\"1050028\":1259,\"2070003\":1390},\"1000\":{\"1050028\":1001,\"2070003\":0},\"1002\":{\"46\":1003,\"1050028\":1260,\"2070003\":1391},\"1003\":{\"1050028\":1004,\"2070003\":0},\"1005\":{\"46\":1006,\"1050028\":1261,\"2070003\":1392},\"1006\":{\"1050028\":1007,\"2070003\":0},\"1008\":{\"46\":1009,\"1050028\":1262,\"2070003\":1393},\"1009\":{\"1050028\":1010,\"2070003\":0},\"1011\":{\"51345\":1225,\"1050012\":1021,\"1050025\":1012,\"1050026\":1015,\"1050027\":1018,\"1050028\":1373,\"2070003\":0},\"1012\":{\"46\":1013,\"1050028\":1263,\"2070003\":1394},\"1013\":{\"1050028\":1014,\"2070003\":0},\"1015\":{\"46\":1016,\"1050028\":1264,\"2070003\":1395},\"1016\":{\"1050028\":1017,\"2070003\":0},\"1018\":{\"46\":1019,\"1050028\":1265,\"2070003\":1396},\"1019\":{\"1050028\":1020,\"2070003\":0},\"1021\":{\"46\":1022,\"1050028\":1266,\"2070003\":1397},\"1022\":{\"1050028\":1023,\"2070003\":0},\"1024\":{\"51345\":1025,\"2070003\":1478},\"1025\":{\"44826\":1030,\"45293\":1028,\"1050000\":1026,\"2070003\":0},\"1026\":{\"1050028\":1027,\"2070003\":0},\"1028\":{\"1050028\":1029,\"2070003\":0},\"1030\":{\"1050028\":1031,\"2070003\":0},\"1032\":{\"51345\":1033,\"2070003\":0},\"1033\":{\"44826\":1038,\"45293\":1036,\"1050000\":1034,\"2070003\":0},\"1034\":{\"1050028\":1035,\"2070003\":0},\"1036\":{\"1050028\":1037,\"2070003\":0},\"1038\":{\"1050028\":1039,\"2070003\":0},\"1040\":{\"51345\":1041,\"2070003\":0},\"1041\":{\"44826\":1046,\"45293\":1044,\"1050000\":1042,\"2070003\":0},\"1042\":{\"1050028\":1043,\"2070003\":0},\"1044\":{\"1050028\":1045,\"2070003\":0},\"1046\":{\"1050028\":1047,\"2070003\":0},\"1048\":{\"51345\":1049,\"2070003\":0},\"1049\":{\"74868\":1050,\"1050028\":1267,\"2070003\":0},\"1050\":{\"1050028\":1051,\"2070003\":0},\"1052\":{\"51345\":1053,\"2070003\":0},\"1053\":{\"74868\":1054,\"1050028\":1268,\"2070003\":0},\"1054\":{\"1050028\":1055,\"2070003\":0},\"1056\":{\"51345\":1057,\"2070003\":0},\"1057\":{\"74868\":1058,\"1050028\":1269,\"2070003\":0},\"1058\":{\"1050028\":1059,\"2070003\":0},\"1060\":{\"51345\":1061,\"2070003\":0},\"1061\":{\"74868\":1062,\"1050028\":1270,\"2070003\":0},\"1062\":{\"1050028\":1063,\"2070003\":0},\"1064\":{\"51345\":1065,\"2070003\":0},\"1065\":{\"74868\":1066,\"1050028\":1271,\"2070003\":0},\"1066\":{\"1050028\":1067,\"2070003\":0},\"1068\":{\"19315\":1272,\"1050014\":1069,\"1050015\":1075,\"1050016\":1280,\"1050017\":1281,\"1050018\":1282,\"1050019\":1283,\"1050021\":1274,\"1050022\":1276,\"2070003\":1486},\"1069\":{\"1050015\":1070,\"1050016\":1071,\"1050017\":1072,\"1050018\":1073,\"1050019\":1074,\"2070003\":1278},\"1075\":{\"1050015\":1076,\"1050016\":1077,\"1050017\":1078,\"1050018\":1079,\"1050019\":1080,\"2070003\":1279},\"1081\":{\"1050014\":1082,\"1050015\":1088,\"1050016\":1286,\"1050017\":1287,\"1050018\":1288,\"1050019\":1289,\"1050025\":1134,\"1050026\":1140,\"1050027\":1146,\"1050028\":1152,\"1050029\":1158,\"2070003\":0},\"1082\":{\"1050015\":1083,\"1050016\":1084,\"1050017\":1085,\"1050018\":1086,\"1050019\":1087,\"2070003\":1284},\"1088\":{\"1050015\":1089,\"1050016\":1090,\"1050017\":1091,\"1050018\":1092,\"1050019\":1093,\"2070003\":1285},\"1094\":{\"1050006\":1095,\"1050007\":1098,\"2070003\":0},\"1096\":{\"1050006\":1097,\"1050007\":1099,\"2070003\":0},\"1102\":{\"1050006\":1106,\"1050007\":1105,\"1050008\":1103,\"1050014\":1104,\"2070003\":0},\"1134\":{\"1050015\":1135,\"1050016\":1136,\"1050017\":1137,\"1050018\":1138,\"1050019\":1139,\"2070003\":1351},\"1140\":{\"1050015\":1141,\"1050016\":1142,\"1050017\":1143,\"1050018\":1144,\"1050019\":1145,\"2070003\":1352},\"1146\":{\"1050015\":1147,\"1050016\":1148,\"1050017\":1149,\"1050018\":1150,\"1050019\":1151,\"2070003\":1353},\"1152\":{\"46\":1165,\"49\":1164,\"197\":1166,\"1050015\":1153,\"1050016\":1154,\"1050017\":1155,\"1050018\":1156,\"1050019\":1157,\"2070003\":1354},\"1158\":{\"1050015\":1159,\"1050016\":1160,\"1050017\":1161,\"1050018\":1162,\"1050019\":1163,\"2070003\":1355},\"1176\":{\"51345\":1177,\"1050028\":1359,\"2070003\":1480},\"1177\":{\"1050028\":1178,\"2070003\":0},\"1179\":{\"51345\":1180,\"1050028\":1360,\"2070003\":0},\"1180\":{\"1050028\":1181,\"2070003\":0},\"1182\":{\"51345\":1183,\"1050028\":1361,\"2070003\":0},\"1183\":{\"1050028\":1184,\"2070003\":0},\"1221\":{\"1050028\":1222,\"2070003\":0},\"1223\":{\"1050028\":1224,\"2070003\":0},\"1225\":{\"1050028\":1226,\"2070003\":0},\"1227\":{\"44826\":1232,\"45293\":1230,\"1050000\":1228,\"1050015\":1324,\"1050016\":1325,\"1050017\":1326,\"1050018\":1327,\"1050019\":1328,\"2070003\":1472},\"1228\":{\"1050028\":1229,\"2070003\":1374},\"1230\":{\"1050028\":1231,\"2070003\":1375},\"1232\":{\"1050028\":1233,\"2070003\":1376},\"1234\":{\"44826\":1239,\"45293\":1237,\"1050000\":1235,\"1050015\":1329,\"1050016\":1330,\"1050017\":1331,\"1050018\":1332,\"1050019\":1333,\"2070003\":1473},\"1235\":{\"1050028\":1236,\"2070003\":1377},\"1237\":{\"1050028\":1238,\"2070003\":1378},\"1239\":{\"1050028\":1240,\"2070003\":1379},\"1241\":{\"44826\":1246,\"45293\":1244,\"1050000\":1242,\"1050015\":1334,\"1050016\":1335,\"1050017\":1336,\"1050018\":1337,\"1050019\":1338,\"2070003\":1474},\"1242\":{\"1050028\":1243,\"2070003\":1380},\"1244\":{\"1050028\":1245,\"2070003\":1381},\"1246\":{\"1050028\":1247,\"2070003\":1382},\"1248\":{\"44826\":1253,\"45293\":1251,\"1050000\":1249,\"2070003\":1471},\"1249\":{\"1050028\":1250,\"2070003\":1383},\"1251\":{\"1050028\":1252,\"2070003\":1384},\"1253\":{\"1050028\":1254,\"2070003\":1385},\"1272\":{\"1948\":1273,\"2070003\":1398},\"1274\":{\"1948\":1275,\"2070003\":1399},\"1276\":{\"1948\":1277,\"2070003\":1400},\"1295\":{\"1050015\":1296,\"1050016\":1297,\"1050017\":1298,\"1050018\":1299,\"1050019\":1300,\"2070003\":1461},\"1339\":{\"46\":1357,\"49\":1356,\"197\":1358,\"1050015\":1340,\"1050016\":1341,\"1050017\":1342,\"1050018\":1343,\"1050019\":1344,\"2070003\":1483},\"1345\":{\"1050015\":1346,\"1050016\":1347,\"1050017\":1348,\"1050018\":1349,\"1050019\":1350,\"2070003\":1476},\"1425\":{\"44826\":1431,\"45293\":1430,\"64899\":1427,\"72493\":1428,\"1050000\":1429,\"1050001\":1426,\"1050002\":1432,\"2070003\":0},\"1433\":{\"35744\":1434,\"35749\":1435,\"2070003\":1459},\"1436\":{\"22873\":1437,\"22876\":1438,\"2070003\":0},\"1439\":{\"22873\":1440,\"22876\":1441,\"2070003\":0},\"1442\":{\"22873\":1443,\"22876\":1444,\"2070003\":0},\"1445\":{\"22873\":1446,\"22876\":1447,\"2070003\":0},\"1448\":{\"57524\":1449,\"57530\":1450,\"2070003\":0},\"1451\":{\"57524\":1452,\"57530\":1453,\"2070003\":0},\"1454\":{\"71070\":1455,\"2070003\":0},\"1456\":{\"64209\":1457,\"64210\":1458,\"2070003\":0}},{\"8\":1050037,\"9\":1050037,\"11\":1050037,\"12\":1050037,\"15\":1050037,\"16\":1050037,\"18\":1050037,\"19\":1050037,\"23\":1050037,\"24\":1050037,\"26\":1050037,\"27\":1050037,\"30\":1050037,\"31\":1050037,\"33\":1050037,\"34\":1050037,\"42\":1050037,\"43\":1050037,\"45\":1050037,\"46\":1050037,\"49\":1050037,\"50\":1050037,\"52\":1050037,\"53\":1050037,\"57\":1050037,\"58\":1050037,\"60\":1050037,\"61\":1050037,\"64\":1050037,\"65\":1050037,\"67\":1050037,\"68\":1050037,\"76\":1050037,\"77\":1050037,\"79\":1050037,\"80\":1050037,\"83\":1050037,\"84\":1050037,\"86\":1050037,\"87\":1050037,\"91\":1050037,\"92\":1050037,\"94\":1050037,\"95\":1050037,\"98\":1050037,\"99\":1050037,\"101\":1050037,\"102\":1050037,\"110\":1050037,\"111\":1050037,\"113\":1050037,\"114\":1050037,\"117\":1050037,\"118\":1050037,\"120\":1050037,\"121\":1050037,\"125\":1050037,\"126\":1050037,\"128\":1050037,\"129\":1050037,\"132\":1050037,\"133\":1050037,\"135\":1050037,\"136\":1050037,\"144\":1050037,\"145\":1050037,\"147\":1050037,\"148\":1050037,\"151\":1050037,\"152\":1050037,\"154\":1050037,\"155\":1050037,\"159\":1050037,\"160\":1050037,\"162\":1050037,\"163\":1050037,\"166\":1050037,\"167\":1050037,\"169\":1050037,\"170\":1050037,\"176\":1050037,\"181\":1050037,\"186\":1050037,\"187\":1050037,\"189\":1050037,\"190\":1050037,\"193\":1050037,\"194\":1050037,\"196\":1050037,\"197\":1050037,\"201\":1050037,\"202\":1050037,\"204\":1050037,\"205\":1050037,\"208\":1050037,\"209\":1050037,\"211\":1050037,\"212\":1050037,\"215\":1050037,\"216\":1050037,\"218\":1050037,\"219\":1050037,\"222\":1050037,\"223\":1050037,\"225\":1050037,\"226\":1050037,\"227\":1050037,\"228\":1050037,\"229\":1050037,\"230\":1050037,\"231\":1050037,\"232\":1050037,\"233\":1050037,\"234\":1050037,\"235\":1050037,\"236\":1050037,\"237\":1050037,\"238\":1050037,\"239\":1050037,\"240\":1050037,\"241\":1050037,\"242\":1050037,\"247\":1050037,\"248\":1050037,\"250\":1050037,\"251\":1050037,\"254\":1050037,\"255\":1050037,\"257\":1050037,\"258\":1050037,\"262\":1050037,\"263\":1050037,\"265\":1050037,\"266\":1050037,\"269\":1050037,\"270\":1050037,\"272\":1050037,\"273\":1050037,\"276\":1050037,\"277\":1050037,\"279\":1050037,\"280\":1050037,\"283\":1050037,\"284\":1050037,\"286\":1050037,\"287\":1050037,\"288\":1050037,\"289\":1050037,\"290\":1050037,\"291\":1050037,\"292\":1050037,\"293\":1050037,\"294\":1050037,\"295\":1050037,\"296\":1050037,\"297\":1050037,\"298\":1050037,\"299\":1050037,\"300\":1050037,\"301\":1050037,\"302\":1050037,\"303\":1050037,\"308\":1050037,\"309\":1050037,\"311\":1050037,\"312\":1050037,\"315\":1050037,\"316\":1050037,\"318\":1050037,\"319\":1050037,\"323\":1050037,\"324\":1050037,\"326\":1050037,\"327\":1050037,\"330\":1050037,\"331\":1050037,\"333\":1050037,\"334\":1050037,\"337\":1050037,\"338\":1050037,\"340\":1050037,\"341\":1050037,\"344\":1050037,\"345\":1050037,\"347\":1050037,\"348\":1050037,\"349\":1050037,\"350\":1050037,\"351\":1050037,\"352\":1050037,\"353\":1050037,\"354\":1050037,\"355\":1050037,\"356\":1050037,\"357\":1050037,\"358\":1050037,\"359\":1050037,\"360\":1050037,\"361\":1050037,\"362\":1050037,\"363\":1050037,\"364\":1050037,\"369\":1050037,\"370\":1050037,\"372\":1050037,\"373\":1050037,\"376\":1050037,\"377\":1050037,\"379\":1050037,\"380\":1050037,\"384\":1050037,\"385\":1050037,\"387\":1050037,\"388\":1050037,\"391\":1050037,\"392\":1050037,\"394\":1050037,\"395\":1050037,\"398\":1050037,\"399\":1050037,\"401\":1050037,\"402\":1050037,\"405\":1050037,\"406\":1050037,\"408\":1050037,\"409\":1050037,\"410\":1050037,\"411\":1050037,\"412\":1050037,\"413\":1050037,\"414\":1050037,\"415\":1050037,\"416\":1050037,\"417\":1050037,\"418\":1050037,\"419\":1050037,\"420\":1050037,\"421\":1050037,\"422\":1050037,\"423\":1050037,\"424\":1050037,\"425\":1050037,\"430\":1050037,\"431\":1050037,\"433\":1050037,\"434\":1050037,\"437\":1050037,\"438\":1050037,\"440\":1050037,\"441\":1050037,\"445\":1050037,\"446\":1050037,\"448\":1050037,\"449\":1050037,\"452\":1050037,\"453\":1050037,\"455\":1050037,\"456\":1050037,\"459\":1050037,\"460\":1050037,\"462\":1050037,\"463\":1050037,\"466\":1050037,\"467\":1050037,\"469\":1050037,\"470\":1050037,\"471\":1050037,\"472\":1050037,\"473\":1050037,\"474\":1050037,\"475\":1050037,\"476\":1050037,\"477\":1050037,\"478\":1050037,\"479\":1050037,\"480\":1050037,\"481\":1050037,\"482\":1050037,\"483\":1050037,\"484\":1050037,\"485\":1050037,\"486\":1050037,\"491\":1050037,\"496\":1050037,\"499\":1050037,\"500\":1050037,\"503\":1050037,\"504\":1050037,\"505\":1050037,\"506\":1050037,\"507\":1050037,\"508\":1050037,\"509\":1050037,\"510\":1050037,\"511\":1050037,\"512\":1050037,\"513\":1050037,\"514\":1050037,\"515\":1050037,\"516\":1050037,\"517\":1050037,\"518\":1050037,\"519\":1050037,\"520\":1050037,\"521\":1050037,\"522\":1050037,\"523\":1050037,\"524\":1050037,\"525\":1050037,\"526\":1050037,\"527\":1050037,\"528\":1050037,\"529\":1050037,\"530\":1050037,\"531\":1050037,\"532\":1050037,\"533\":1050037,\"534\":1050037,\"535\":1050037,\"536\":1050037,\"537\":1050037,\"538\":1050037,\"539\":1050037,\"540\":1050037,\"541\":1050037,\"542\":1050037,\"543\":1050037,\"544\":1050037,\"547\":1050037,\"548\":1050037,\"550\":1050037,\"551\":1050037,\"554\":1050037,\"555\":1050037,\"557\":1050037,\"558\":1050037,\"559\":1050037,\"560\":1050037,\"561\":1050037,\"562\":1050037,\"563\":1050037,\"564\":1050037,\"565\":1050037,\"566\":1050037,\"567\":1050037,\"568\":1050037,\"569\":1050037,\"570\":1050037,\"571\":1050037,\"572\":1050037,\"573\":1050037,\"574\":1050037,\"575\":1050037,\"576\":1050037,\"577\":1050037,\"578\":1050037,\"579\":1050037,\"580\":1050037,\"581\":1050037,\"582\":1050037,\"583\":1050037,\"584\":1050037,\"585\":1050037,\"586\":1050037,\"589\":1050037,\"590\":1050037,\"592\":1050037,\"593\":1050037,\"596\":1050037,\"597\":1050037,\"599\":1050037,\"600\":1050037,\"601\":1050037,\"602\":1050037,\"603\":1050037,\"604\":1050037,\"605\":1050037,\"606\":1050037,\"607\":1050037,\"608\":1050037,\"609\":1050037,\"610\":1050037,\"611\":1050037,\"612\":1050037,\"613\":1050037,\"614\":1050037,\"615\":1050037,\"616\":1050037,\"617\":1050037,\"618\":1050037,\"619\":1050037,\"620\":1050037,\"621\":1050037,\"622\":1050037,\"623\":1050037,\"624\":1050037,\"625\":1050037,\"626\":1050037,\"627\":1050037,\"628\":1050037,\"631\":1050037,\"632\":1050037,\"634\":1050037,\"635\":1050037,\"638\":1050037,\"639\":1050037,\"641\":1050037,\"642\":1050037,\"643\":1050037,\"644\":1050037,\"645\":1050037,\"646\":1050037,\"647\":1050037,\"648\":1050037,\"649\":1050037,\"650\":1050037,\"651\":1050037,\"652\":1050037,\"653\":1050037,\"654\":1050037,\"655\":1050037,\"656\":1050037,\"657\":1050037,\"658\":1050037,\"659\":1050037,\"660\":1050037,\"661\":1050037,\"662\":1050037,\"663\":1050037,\"664\":1050037,\"665\":1050037,\"666\":1050037,\"667\":1050037,\"668\":1050037,\"669\":1050037,\"670\":1050037,\"673\":1050037,\"674\":1050037,\"676\":1050037,\"677\":1050037,\"680\":1050037,\"681\":1050037,\"683\":1050037,\"684\":1050037,\"685\":1050037,\"686\":1050037,\"687\":1050037,\"688\":1050037,\"689\":1050037,\"690\":1050037,\"691\":1050037,\"692\":1050037,\"693\":1050037,\"694\":1050037,\"695\":1050037,\"696\":1050037,\"697\":1050037,\"698\":1050037,\"699\":1050037,\"700\":1050037,\"701\":1050037,\"702\":1050037,\"703\":1050037,\"704\":1050037,\"705\":1050037,\"706\":1050037,\"707\":1050037,\"708\":1050037,\"709\":1050037,\"710\":1050037,\"711\":1050037,\"712\":1050037,\"715\":1050037,\"716\":1050037,\"718\":1050037,\"719\":1050037,\"722\":1050037,\"723\":1050037,\"725\":1050037,\"726\":1050037,\"727\":1050037,\"728\":1050037,\"729\":1050037,\"730\":1050037,\"731\":1050037,\"732\":1050037,\"733\":1050037,\"734\":1050037,\"735\":1050037,\"736\":1050037,\"737\":1050037,\"738\":1050037,\"739\":1050037,\"740\":1050037,\"741\":1050037,\"742\":1050037,\"743\":1050037,\"744\":1050037,\"745\":1050037,\"746\":1050037,\"747\":1050037,\"748\":1050037,\"749\":1050037,\"750\":1050037,\"751\":1050037,\"752\":1050037,\"753\":1050037,\"754\":1050037,\"756\":1050037,\"758\":1050037,\"761\":1050037,\"762\":1050037,\"765\":1050037,\"766\":1050037,\"767\":1050037,\"768\":1050037,\"769\":1050037,\"770\":1050037,\"771\":1050037,\"772\":1050037,\"773\":1050037,\"774\":1050037,\"775\":1050037,\"776\":1050037,\"777\":1050037,\"778\":1050037,\"779\":1050037,\"780\":1050037,\"781\":1050037,\"782\":1050037,\"783\":1050037,\"784\":1050037,\"785\":1050037,\"786\":1050037,\"787\":1050037,\"788\":1050037,\"789\":1050037,\"790\":1050037,\"791\":1050037,\"792\":1050037,\"793\":1050037,\"794\":1050037,\"795\":1050037,\"796\":1050037,\"797\":1050037,\"798\":1050037,\"799\":1050037,\"800\":1050037,\"801\":1050037,\"802\":1050037,\"803\":1050037,\"804\":1050037,\"805\":1050037,\"806\":1050037,\"807\":1050037,\"808\":1050037,\"809\":1050037,\"810\":1050037,\"811\":1050037,\"812\":1050037,\"813\":1050037,\"814\":1050037,\"815\":1050037,\"816\":1050037,\"817\":1050037,\"818\":1050037,\"819\":1050037,\"820\":1050037,\"821\":1050037,\"822\":1050037,\"823\":1050037,\"824\":1050037,\"825\":1050037,\"826\":1050037,\"827\":1050037,\"828\":1050037,\"829\":1050037,\"830\":1050037,\"831\":1050037,\"832\":1050037,\"833\":1050037,\"834\":1050037,\"835\":1050037,\"836\":1050037,\"837\":1050037,\"838\":1050037,\"839\":1050037,\"840\":1050037,\"841\":1050037,\"842\":1050037,\"843\":1050037,\"844\":1050037,\"845\":1050037,\"846\":1050037,\"847\":1050037,\"848\":1050037,\"849\":1050037,\"850\":1050037,\"851\":1050037,\"852\":1050037,\"853\":1050037,\"854\":1050037,\"855\":1050037,\"856\":1050037,\"857\":1050037,\"858\":1050037,\"859\":1050037,\"860\":1050037,\"861\":1050037,\"862\":1050037,\"863\":1050037,\"864\":1050037,\"865\":1050037,\"866\":1050037,\"867\":1050037,\"868\":1050037,\"869\":1050037,\"870\":1050037,\"871\":1050037,\"872\":1050037,\"873\":1050037,\"874\":1050037,\"875\":1050037,\"876\":1050037,\"877\":1050037,\"878\":1050037,\"881\":1050037,\"884\":1050037,\"886\":1050037,\"888\":1050037,\"889\":1050037,\"890\":1050037,\"891\":1050037,\"892\":1050037,\"893\":1050037,\"894\":1050037,\"895\":1050037,\"896\":1050037,\"897\":1050037,\"898\":1050037,\"899\":1050037,\"900\":1050037,\"901\":1050037,\"902\":1050037,\"903\":1050037,\"904\":1050037,\"905\":1050037,\"906\":1050037,\"907\":1050037,\"908\":1050037,\"909\":1050037,\"910\":1050037,\"911\":1050037,\"912\":1050037,\"913\":1050037,\"914\":1050037,\"915\":1050037,\"916\":1050037,\"917\":1050037,\"918\":1050037,\"919\":1050037,\"920\":1050037,\"921\":1050037,\"922\":1050037,\"923\":1050037,\"924\":1050037,\"925\":1050037,\"926\":1050037,\"927\":1050037,\"931\":1050039,\"934\":1050039,\"937\":1050039,\"941\":1050039,\"944\":1050039,\"947\":1050039,\"951\":1050039,\"954\":1050039,\"957\":1050039,\"960\":1050039,\"963\":1050039,\"966\":1050039,\"969\":1050039,\"972\":1050039,\"975\":1050039,\"978\":1050039,\"981\":1050039,\"984\":1050039,\"988\":1050039,\"991\":1050039,\"994\":1050039,\"997\":1050039,\"1001\":1050039,\"1004\":1050039,\"1007\":1050039,\"1010\":1050039,\"1014\":1050039,\"1017\":1050039,\"1020\":1050039,\"1023\":1050039,\"1027\":1050039,\"1029\":1050039,\"1031\":1050039,\"1035\":1050039,\"1037\":1050039,\"1039\":1050039,\"1043\":1050039,\"1045\":1050039,\"1047\":1050039,\"1051\":1050039,\"1055\":1050039,\"1059\":1050039,\"1063\":1050039,\"1067\":1050039,\"1070\":1050037,\"1071\":1050037,\"1072\":1050037,\"1073\":1050037,\"1074\":1050037,\"1076\":1050037,\"1077\":1050037,\"1078\":1050037,\"1079\":1050037,\"1080\":1050037,\"1083\":1050037,\"1084\":1050037,\"1085\":1050037,\"1086\":1050037,\"1087\":1050037,\"1089\":1050037,\"1090\":1050037,\"1091\":1050037,\"1092\":1050037,\"1093\":1050037,\"1095\":1050037,\"1097\":1050037,\"1098\":1050037,\"1099\":1050037,\"1100\":1050037,\"1101\":1050037,\"1103\":1050037,\"1104\":1050037,\"1105\":1050037,\"1106\":1050037,\"1107\":1050037,\"1108\":1050037,\"1109\":1050037,\"1110\":1050037,\"1111\":1050037,\"1112\":1050037,\"1113\":1050037,\"1114\":1050037,\"1115\":1050037,\"1116\":1050037,\"1117\":1050037,\"1118\":1050037,\"1119\":1050037,\"1120\":1050037,\"1121\":1050037,\"1122\":1050037,\"1123\":1050037,\"1124\":1050037,\"1125\":1050037,\"1126\":1050037,\"1127\":1050037,\"1128\":1050037,\"1129\":1050037,\"1130\":1050037,\"1131\":1050037,\"1132\":1050037,\"1133\":1050037,\"1135\":1050037,\"1136\":1050037,\"1137\":1050037,\"1138\":1050037,\"1139\":1050037,\"1141\":1050037,\"1142\":1050037,\"1143\":1050037,\"1144\":1050037,\"1145\":1050037,\"1147\":1050037,\"1148\":1050037,\"1149\":1050037,\"1150\":1050037,\"1151\":1050037,\"1153\":1050037,\"1154\":1050037,\"1155\":1050037,\"1156\":1050037,\"1157\":1050037,\"1159\":1050037,\"1160\":1050037,\"1161\":1050037,\"1162\":1050037,\"1163\":1050037,\"1164\":1050039,\"1165\":1050039,\"1166\":1050039,\"1167\":1050039,\"1168\":1050039,\"1169\":1050039,\"1170\":1050039,\"1171\":1050039,\"1172\":1050039,\"1173\":1050039,\"1174\":1050039,\"1175\":1050039,\"1178\":1050039,\"1181\":1050039,\"1184\":1050039,\"1185\":1050039,\"1186\":1050039,\"1187\":1050039,\"1188\":1050039,\"1189\":1050039,\"1190\":1050039,\"1191\":1050039,\"1192\":1050039,\"1193\":1050039,\"1194\":1050039,\"1195\":1050039,\"1196\":1050039,\"1197\":1050039,\"1198\":1050039,\"1199\":1050039,\"1200\":1050039,\"1201\":1050039,\"1202\":1050039,\"1203\":1050039,\"1204\":1050039,\"1205\":1050039,\"1206\":1050039,\"1207\":1050039,\"1208\":1050039,\"1209\":1050039,\"1210\":1050039,\"1211\":1050039,\"1212\":1050039,\"1213\":1050039,\"1214\":1050039,\"1215\":1050039,\"1216\":1050039,\"1217\":1050039,\"1218\":1050039,\"1219\":1050039,\"1220\":1050039,\"1222\":1050039,\"1224\":1050039,\"1226\":1050039,\"1229\":1050039,\"1231\":1050039,\"1233\":1050039,\"1236\":1050039,\"1238\":1050039,\"1240\":1050039,\"1243\":1050039,\"1245\":1050039,\"1247\":1050039,\"1250\":1050039,\"1252\":1050039,\"1254\":1050039,\"1255\":1050039,\"1256\":1050039,\"1257\":1050039,\"1258\":1050039,\"1259\":1050039,\"1260\":1050039,\"1261\":1050039,\"1262\":1050039,\"1263\":1050039,\"1264\":1050039,\"1265\":1050039,\"1266\":1050039,\"1267\":1050039,\"1268\":1050039,\"1269\":1050039,\"1270\":1050039,\"1271\":1050039,\"1273\":1050039,\"1275\":1050039,\"1277\":1050039,\"1278\":1050037,\"1279\":1050037,\"1280\":1050037,\"1281\":1050037,\"1282\":1050037,\"1283\":1050037,\"1284\":1050037,\"1285\":1050037,\"1286\":1050037,\"1287\":1050037,\"1288\":1050037,\"1289\":1050037,\"1290\":1050037,\"1291\":1050037,\"1292\":1050037,\"1293\":1050037,\"1294\":1050037,\"1296\":1050037,\"1297\":1050037,\"1298\":1050037,\"1299\":1050037,\"1300\":1050037,\"1301\":1050037,\"1302\":1050037,\"1303\":1050037,\"1304\":1050037,\"1305\":1050037,\"1306\":1050037,\"1307\":1050037,\"1308\":1050037,\"1309\":1050037,\"1310\":1050037,\"1311\":1050037,\"1312\":1050037,\"1313\":1050037,\"1314\":1050037,\"1315\":1050037,\"1316\":1050037,\"1317\":1050037,\"1318\":1050037,\"1319\":1050037,\"1320\":1050037,\"1321\":1050037,\"1322\":1050037,\"1323\":1050037,\"1324\":1050037,\"1325\":1050037,\"1326\":1050037,\"1327\":1050037,\"1328\":1050037,\"1329\":1050037,\"1330\":1050037,\"1331\":1050037,\"1332\":1050037,\"1333\":1050037,\"1334\":1050037,\"1335\":1050037,\"1336\":1050037,\"1337\":1050037,\"1338\":1050037,\"1340\":1050037,\"1341\":1050037,\"1342\":1050037,\"1343\":1050037,\"1344\":1050037,\"1346\":1050037,\"1347\":1050037,\"1348\":1050037,\"1349\":1050037,\"1350\":1050037,\"1351\":1050037,\"1352\":1050037,\"1353\":1050037,\"1354\":1050037,\"1355\":1050037,\"1356\":1050039,\"1357\":1050039,\"1358\":1050039,\"1359\":1050039,\"1360\":1050039,\"1361\":1050039,\"1362\":1050039,\"1363\":1050039,\"1364\":1050039,\"1365\":1050039,\"1366\":1050039,\"1367\":1050039,\"1368\":1050039,\"1369\":1050039,\"1370\":1050039,\"1371\":1050039,\"1372\":1050039,\"1373\":1050039,\"1374\":1050039,\"1375\":1050039,\"1376\":1050039,\"1377\":1050039,\"1378\":1050039,\"1379\":1050039,\"1380\":1050039,\"1381\":1050039,\"1382\":1050039,\"1383\":1050039,\"1384\":1050039,\"1385\":1050039,\"1386\":1050039,\"1387\":1050039,\"1388\":1050039,\"1389\":1050039,\"1390\":1050039,\"1391\":1050039,\"1392\":1050039,\"1393\":1050039,\"1394\":1050039,\"1395\":1050039,\"1396\":1050039,\"1397\":1050039,\"1398\":1050040,\"1399\":1050040,\"1400\":1050040,\"1401\":1050039,\"1402\":1050039,\"1403\":1050039,\"1404\":1050039,\"1405\":1050039,\"1406\":1050039,\"1407\":1050039,\"1408\":1050039,\"1409\":1050039,\"1410\":1050039,\"1411\":1050039,\"1412\":1050039,\"1413\":1050039,\"1414\":1050039,\"1415\":1050039,\"1416\":1050039,\"1417\":1050039,\"1418\":1050039,\"1419\":1050039,\"1420\":1050039,\"1421\":1050039,\"1422\":1050039,\"1423\":1050039,\"1424\":1050039,\"1426\":1050039,\"1427\":1050039,\"1428\":1050039,\"1429\":1050039,\"1430\":1050039,\"1431\":1050039,\"1432\":1050039,\"1434\":1050041,\"1435\":1050041,\"1437\":1050042,\"1438\":1050042,\"1440\":1050042,\"1441\":1050042,\"1443\":1050042,\"1444\":1050042,\"1446\":1050042,\"1447\":1050042,\"1449\":1050042,\"1450\":1050042,\"1452\":1050042,\"1453\":1050042,\"1455\":1050042,\"1457\":1050042,\"1458\":1050042,\"1459\":1050037,\"1460\":1050037,\"1461\":1050037,\"1462\":1050037,\"1463\":1050037,\"1464\":1050037,\"1465\":1050037,\"1466\":1050037,\"1467\":1050037,\"1468\":1050037,\"1469\":1050037,\"1470\":1050037,\"1471\":1050038,\"1472\":1050037,\"1473\":1050037,\"1474\":1050037,\"1475\":1050037,\"1476\":1050037,\"1477\":1050039,\"1478\":1050039,\"1479\":1050039,\"1480\":1050039,\"1481\":1050042,\"1482\":1050042,\"1483\":1050043,\"1484\":1050044,\"1485\":1050045,\"1486\":1050046,\"1487\":1050039,\"1488\":1050040,\"1489\":1050037,\"1490\":1050038,\"1491\":1050041,\"1492\":1050047,\"1493\":1050048,\"1494\":1050049,\"1495\":1050050,\"1496\":1050051,\"1497\":1050052},{\"1164\":[0,1],\"1165\":[0,1],\"1166\":[0,1],\"1356\":[0,1],\"1357\":[0,1],\"1358\":[0,1]},{}]","[100,1535,{\"0\":{\"7\":1426,\"221\":1498,\"5850\":1502,\"7572\":976,\"7970\":906,\"9416\":1344,\"10893\":1506,\"14001\":1346,\"19315\":1520,\"22873\":1454,\"22876\":1474,\"25091\":1012,\"26424\":1462,\"26433\":1482,\"30284\":885,\"30461\":1137,\"35744\":1523,\"35749\":1524,\"42460\":755,\"46381\":994,\"46438\":1003,\"46659\":1528,\"46660\":1529,\"46846\":1525,\"46849\":1526,\"47850\":800,\"52525\":954,\"57524\":1458,\"57530\":1478,\"63944\":1470,\"63945\":1486,\"65938\":1527,\"67904\":1298,\"70800\":985,\"75408\":915,\"75618\":1304,\"78477\":932,\"80184\":1301,\"80576\":1494,\"80591\":1490,\"84274\":1466,\"84668\":1442,\"84700\":1450,\"84701\":1446,\"84702\":1438,\"84703\":1434,\"84704\":1430,\"1050037\":1,\"1050038\":1514,\"1050039\":1056,\"1050040\":1335,\"1050041\":1275,\"1050042\":1510,\"1050043\":88,\"1050044\":1521,\"1050045\":1522,\"1050046\":1173,\"1050047\":1530,\"1050048\":1531,\"1050049\":1532,\"1050050\":1533,\"1050051\":1534,\"1050052\":1535,\"2070003\":0},\"1\":{\"7\":1384,\"8\":1358,\"47\":2,\"221\":1401,\"5850\":1402,\"10893\":1403,\"19315\":679,\"22873\":1390,\"22876\":1395,\"26424\":1392,\"26433\":1397,\"35744\":175,\"35749\":196,\"46659\":1232,\"46660\":1237,\"46846\":1217,\"46849\":1222,\"54269\":1361,\"54272\":1362,\"54733\":1284,\"54747\":1359,\"54752\":1360,\"57524\":1391,\"57530\":1396,\"63944\":1394,\"63945\":1398,\"65938\":1227,\"80576\":1400,\"80591\":1399,\"84274\":1393,\"84668\":1388,\"84671\":45,\"84701\":1389,\"84702\":1387,\"84703\":1386,\"84704\":1385,\"1050042\":1404,\"1050044\":685,\"1050045\":691,\"2070003\":1515},\"2\":{\"35744\":3,\"35749\":24,\"46659\":1078,\"46660\":1079,\"46846\":1075,\"46849\":1076,\"65938\":1077,\"2070003\":0},\"3\":{\"46\":4,\"3320\":609,\"1050037\":217,\"2070003\":1073},\"4\":{\"1050037\":5,\"2070003\":0},\"5\":{\"46846\":6,\"46849\":15,\"2070003\":0},\"6\":{\"46\":7,\"3320\":11,\"1050037\":236,\"2070003\":607},\"7\":{\"1050037\":8,\"2070003\":0},\"8\":{\"65928\":9,\"65938\":10,\"2070003\":0},\"11\":{\"1050037\":12,\"2070003\":0},\"12\":{\"65928\":13,\"65938\":14,\"2070003\":0},\"15\":{\"46\":16,\"3320\":20,\"1050037\":239,\"2070003\":608},\"16\":{\"1050037\":17,\"2070003\":0},\"17\":{\"65928\":18,\"65938\":19,\"2070003\":0},\"20\":{\"1050037\":21,\"2070003\":0},\"21\":{\"65928\":22,\"65938\":23,\"2070003\":0},\"24\":{\"46\":25,\"3320\":615,\"1050037\":242,\"2070003\":1074},\"25\":{\"1050037\":26,\"2070003\":0},\"26\":{\"46846\":27,\"46849\":36,\"2070003\":0},\"27\":{\"46\":28,\"3320\":32,\"1050037\":261,\"2070003\":613},\"28\":{\"1050037\":29,\"2070003\":0},\"29\":{\"65928\":30,\"65938\":31,\"2070003\":0},\"32\":{\"1050037\":33,\"2070003\":0},\"33\":{\"65928\":34,\"65938\":35,\"2070003\":0},\"36\":{\"46\":37,\"3320\":41,\"1050037\":264,\"2070003\":614},\"37\":{\"1050037\":38,\"2070003\":0},\"38\":{\"65928\":39,\"65938\":40,\"2070003\":0},\"41\":{\"1050037\":42,\"2070003\":0},\"42\":{\"65928\":43,\"65938\":44,\"2070003\":0},\"45\":{\"35744\":46,\"35749\":67,\"46659\":1085,\"46660\":1086,\"46846\":1082,\"46849\":1083,\"65938\":1084,\"2070003\":0},\"46\":{\"46\":47,\"3320\":621,\"1050037\":267,\"2070003\":1080},\"47\":{\"1050037\":48,\"2070003\":0},\"48\":{\"46846\":49,\"46849\":58,\"2070003\":0},\"49\":{\"46\":50,\"3320\":54,\"1050037\":286,\"2070003\":619},\"50\":{\"1050037\":51,\"2070003\":0},\"51\":{\"65928\":52,\"65938\":53,\"2070003\":0},\"54\":{\"1050037\":55,\"2070003\":0},\"55\":{\"65928\":56,\"65938\":57,\"2070003\":0},\"58\":{\"46\":59,\"3320\":63,\"1050037\":289,\"2070003\":620},\"59\":{\"1050037\":60,\"2070003\":0},\"60\":{\"65928\":61,\"65938\":62,\"2070003\":0},\"63\":{\"1050037\":64,\"2070003\":0},\"64\":{\"65928\":65,\"65938\":66,\"2070003\":0},\"67\":{\"46\":68,\"3320\":627,\"1050037\":292,\"2070003\":1081},\"68\":{\"1050037\":69,\"2070003\":0},\"69\":{\"46846\":70,\"46849\":79,\"2070003\":0},\"70\":{\"46\":71,\"3320\":75,\"1050037\":311,\"2070003\":625},\"71\":{\"1050037\":72,\"2070003\":0},\"72\":{\"65928\":73,\"65938\":74,\"2070003\":0},\"75\":{\"1050037\":76,\"2070003\":0},\"76\":{\"65928\":77,\"65938\":78,\"2070003\":0},\"79\":{\"46\":80,\"3320\":84,\"1050037\":314,\"2070003\":626},\"80\":{\"1050037\":81,\"2070003\":0},\"81\":{\"65928\":82,\"65938\":83,\"2070003\":0},\"84\":{\"1050037\":85,\"2070003\":0},\"85\":{\"65928\":86,\"65938\":87,\"2070003\":0},\"88\":{\"7\":1405,\"47\":89,\"221\":1422,\"5850\":1423,\"9294\":1339,\"10893\":1424,\"15847\":1342,\"16014\":1341,\"19315\":697,\"22873\":1411,\"22876\":1416,\"26424\":1413,\"26433\":1418,\"35744\":317,\"35749\":338,\"37620\":1340,\"46659\":1265,\"46660\":1270,\"46846\":1250,\"46849\":1255,\"57524\":1412,\"57530\":1417,\"63944\":1415,\"63945\":1419,\"65938\":1260,\"67431\":1343,\"75830\":1060,\"80576\":1421,\"80591\":1420,\"84274\":1414,\"84668\":1409,\"84671\":132,\"84701\":1410,\"84702\":1408,\"84703\":1407,\"84704\":1406,\"1050042\":1425,\"1050044\":703,\"1050045\":709,\"2070003\":1516},\"89\":{\"35744\":90,\"35749\":111,\"46659\":1092,\"46660\":1093,\"46846\":1089,\"46849\":1090,\"65938\":1091,\"1050039\":1069,\"1050043\":1070,\"2070003\":0},\"90\":{\"46\":91,\"3320\":633,\"1050037\":359,\"2070003\":1087},\"91\":{\"1050037\":92,\"2070003\":0},\"92\":{\"46846\":93,\"46849\":102,\"2070003\":0},\"93\":{\"46\":94,\"3320\":98,\"1050037\":378,\"2070003\":631},\"94\":{\"1050037\":95,\"2070003\":0},\"95\":{\"65928\":96,\"65938\":97,\"2070003\":0},\"98\":{\"1050037\":99,\"2070003\":0},\"99\":{\"65928\":100,\"65938\":101,\"2070003\":0},\"102\":{\"46\":103,\"3320\":107,\"1050037\":381,\"2070003\":632},\"103\":{\"1050037\":104,\"2070003\":0},\"104\":{\"65928\":105,\"65938\":106,\"2070003\":0},\"107\":{\"1050037\":108,\"2070003\":0},\"108\":{\"65928\":109,\"65938\":110,\"2070003\":0},\"111\":{\"46\":112,\"3320\":639,\"1050037\":384,\"2070003\":1088},\"112\":{\"1050037\":113,\"2070003\":0},\"113\":{\"46846\":114,\"46849\":123,\"2070003\":0},\"114\":{\"46\":115,\"3320\":119,\"1050037\":403,\"2070003\":637},\"115\":{\"1050037\":116,\"2070003\":0},\"116\":{\"65928\":117,\"65938\":118,\"2070003\":0},\"119\":{\"1050037\":120,\"2070003\":0},\"120\":{\"65928\":121,\"65938\":122,\"2070003\":0},\"123\":{\"46\":124,\"3320\":128,\"1050037\":406,\"2070003\":638},\"124\":{\"1050037\":125,\"2070003\":0},\"125\":{\"65928\":126,\"65938\":127,\"2070003\":0},\"128\":{\"1050037\":129,\"2070003\":0},\"129\":{\"65928\":130,\"65938\":131,\"2070003\":0},\"132\":{\"35744\":133,\"35749\":154,\"46659\":1099,\"46660\":1100,\"46846\":1096,\"46849\":1097,\"65938\":1098,\"1050039\":1071,\"1050043\":1072,\"2070003\":0},\"133\":{\"46\":134,\"3320\":645,\"1050037\":409,\"2070003\":1094},\"134\":{\"1050037\":135,\"2070003\":0},\"135\":{\"46846\":136,\"46849\":145,\"2070003\":0},\"136\":{\"46\":137,\"3320\":141,\"1050037\":428,\"2070003\":643},\"137\":{\"1050037\":138,\"2070003\":0},\"138\":{\"65928\":139,\"65938\":140,\"2070003\":0},\"141\":{\"1050037\":142,\"2070003\":0},\"142\":{\"65928\":143,\"65938\":144,\"2070003\":0},\"145\":{\"46\":146,\"3320\":150,\"1050037\":431,\"2070003\":644},\"146\":{\"1050037\":147,\"2070003\":0},\"147\":{\"65928\":148,\"65938\":149,\"2070003\":0},\"150\":{\"1050037\":151,\"2070003\":0},\"151\":{\"65928\":152,\"65938\":153,\"2070003\":0},\"154\":{\"46\":155,\"3320\":651,\"1050037\":434,\"2070003\":1095},\"155\":{\"1050037\":156,\"2070003\":0},\"156\":{\"46846\":157,\"46849\":166,\"2070003\":0},\"157\":{\"46\":158,\"3320\":162,\"1050037\":453,\"2070003\":649},\"158\":{\"1050037\":159,\"2070003\":0},\"159\":{\"65928\":160,\"65938\":161,\"2070003\":0},\"162\":{\"1050037\":163,\"2070003\":0},\"163\":{\"65928\":164,\"65938\":165,\"2070003\":0},\"166\":{\"46\":167,\"3320\":171,\"1050037\":456,\"2070003\":650},\"167\":{\"1050037\":168,\"2070003\":0},\"168\":{\"65928\":169,\"65938\":170,\"2070003\":0},\"171\":{\"1050037\":172,\"2070003\":0},\"172\":{\"65928\":173,\"65938\":174,\"2070003\":0},\"175\":{\"46\":176,\"1948\":1211,\"3320\":717,\"7543\":1210,\"23929\":1212,\"41899\":1209,\"1050037\":459,\"2070003\":1321},\"176\":{\"1050037\":177,\"2070003\":0},\"177\":{\"46846\":178,\"46849\":187,\"2070003\":0},\"178\":{\"46\":179,\"3320\":183,\"1050037\":478,\"2070003\":715},\"179\":{\"1050037\":180,\"2070003\":0},\"180\":{\"65928\":181,\"65938\":182,\"2070003\":0},\"183\":{\"1050037\":184,\"2070003\":0},\"184\":{\"65928\":185,\"65938\":186,\"2070003\":0},\"187\":{\"46\":188,\"3320\":192,\"1050037\":481,\"2070003\":716},\"188\":{\"1050037\":189,\"2070003\":0},\"189\":{\"65928\":190,\"65938\":191,\"2070003\":0},\"192\":{\"1050037\":193,\"2070003\":0},\"193\":{\"65928\":194,\"65938\":195,\"2070003\":0},\"196\":{\"46\":197,\"1948\":1215,\"3320\":723,\"7543\":1214,\"23929\":1216,\"41899\":1213,\"1050037\":484,\"2070003\":1322},\"197\":{\"1050037\":198,\"2070003\":0},\"198\":{\"46846\":199,\"46849\":208,\"2070003\":0},\"199\":{\"46\":200,\"3320\":204,\"1050037\":503,\"2070003\":721},\"200\":{\"1050037\":201,\"2070003\":0},\"201\":{\"65928\":202,\"65938\":203,\"2070003\":0},\"204\":{\"1050037\":205,\"2070003\":0},\"205\":{\"65928\":206,\"65938\":207,\"2070003\":0},\"208\":{\"46\":209,\"3320\":213,\"1050037\":506,\"2070003\":722},\"209\":{\"1050037\":210,\"2070003\":0},\"210\":{\"65928\":211,\"65938\":212,\"2070003\":0},\"213\":{\"1050037\":214,\"2070003\":0},\"214\":{\"65928\":215,\"65938\":216,\"2070003\":0},\"217\":{\"46846\":218,\"46849\":227,\"2070003\":0},\"218\":{\"46\":219,\"3320\":223,\"1050037\":509,\"2070003\":727},\"219\":{\"1050037\":220,\"2070003\":0},\"220\":{\"65928\":221,\"65938\":222,\"2070003\":0},\"223\":{\"1050037\":224,\"2070003\":0},\"224\":{\"65928\":225,\"65938\":226,\"2070003\":0},\"227\":{\"46\":228,\"3320\":232,\"1050037\":512,\"2070003\":728},\"228\":{\"1050037\":229,\"2070003\":0},\"229\":{\"65928\":230,\"65938\":231,\"2070003\":0},\"232\":{\"1050037\":233,\"2070003\":0},\"233\":{\"65928\":234,\"65938\":235,\"2070003\":0},\"236\":{\"65928\":237,\"65938\":238,\"2070003\":0},\"239\":{\"65928\":240,\"65938\":241,\"2070003\":0},\"242\":{\"46846\":243,\"46849\":252,\"2070003\":0},\"243\":{\"46\":244,\"3320\":248,\"1050037\":515,\"2070003\":729},\"244\":{\"1050037\":245,\"2070003\":0},\"245\":{\"65928\":246,\"65938\":247,\"2070003\":0},\"248\":{\"1050037\":249,\"2070003\":0},\"249\":{\"65928\":250,\"65938\":251,\"2070003\":0},\"252\":{\"46\":253,\"3320\":257,\"1050037\":518,\"2070003\":730},\"253\":{\"1050037\":254,\"2070003\":0},\"254\":{\"65928\":255,\"65938\":256,\"2070003\":0},\"257\":{\"1050037\":258,\"2070003\":0},\"258\":{\"65928\":259,\"65938\":260,\"2070003\":0},\"261\":{\"65928\":262,\"65938\":263,\"2070003\":0},\"264\":{\"65928\":265,\"65938\":266,\"2070003\":0},\"267\":{\"46846\":268,\"46849\":277,\"2070003\":0},\"268\":{\"46\":269,\"3320\":273,\"1050037\":521,\"2070003\":731},\"269\":{\"1050037\":270,\"2070003\":0},\"270\":{\"65928\":271,\"65938\":272,\"2070003\":0},\"273\":{\"1050037\":274,\"2070003\":0},\"274\":{\"65928\":275,\"65938\":276,\"2070003\":0},\"277\":{\"46\":278,\"3320\":282,\"1050037\":524,\"2070003\":732},\"278\":{\"1050037\":279,\"2070003\":0},\"279\":{\"65928\":280,\"65938\":281,\"2070003\":0},\"282\":{\"1050037\":283,\"2070003\":0},\"283\":{\"65928\":284,\"65938\":285,\"2070003\":0},\"286\":{\"65928\":287,\"65938\":288,\"2070003\":0},\"289\":{\"65928\":290,\"65938\":291,\"2070003\":0},\"292\":{\"46846\":293,\"46849\":302,\"2070003\":0},\"293\":{\"46\":294,\"3320\":298,\"1050037\":527,\"2070003\":733},\"294\":{\"1050037\":295,\"2070003\":0},\"295\":{\"65928\":296,\"65938\":297,\"2070003\":0},\"298\":{\"1050037\":299,\"2070003\":0},\"299\":{\"65928\":300,\"65938\":301,\"2070003\":0},\"302\":{\"46\":303,\"3320\":307,\"1050037\":530,\"2070003\":734},\"303\":{\"1050037\":304,\"2070003\":0},\"304\":{\"65928\":305,\"65938\":306,\"2070003\":0},\"307\":{\"1050037\":308,\"2070003\":0},\"308\":{\"65928\":309,\"65938\":310,\"2070003\":0},\"311\":{\"65928\":312,\"65938\":313,\"2070003\":0},\"314\":{\"65928\":315,\"65938\":316,\"2070003\":0},\"317\":{\"46\":318,\"1948\":1244,\"3320\":737,\"7543\":1243,\"23929\":1245,\"41899\":1242,\"1050037\":533,\"2070003\":1328},\"318\":{\"1050037\":319,\"2070003\":0},\"319\":{\"46846\":320,\"46849\":329,\"2070003\":0},\"320\":{\"46\":321,\"3320\":325,\"1050037\":552,\"2070003\":735},\"321\":{\"1050037\":322,\"2070003\":0},\"322\":{\"65928\":323,\"65938\":324,\"2070003\":0},\"325\":{\"1050037\":326,\"2070003\":0},\"326\":{\"65928\":327,\"65938\":328,\"2070003\":0},\"329\":{\"46\":330,\"3320\":334,\"1050037\":555,\"2070003\":736},\"330\":{\"1050037\":331,\"2070003\":0},\"331\":{\"65928\":332,\"65938\":333,\"2070003\":0},\"334\":{\"1050037\":335,\"2070003\":0},\"335\":{\"65928\":336,\"65938\":337,\"2070003\":0},\"338\":{\"46\":339,\"1948\":1248,\"3320\":743,\"7543\":1247,\"23929\":1249,\"41899\":1246,\"1050037\":558,\"2070003\":1329},\"339\":{\"1050037\":340,\"2070003\":0},\"340\":{\"46846\":341,\"46849\":350,\"2070003\":0},\"341\":{\"46\":342,\"3320\":346,\"1050037\":577,\"2070003\":741},\"342\":{\"1050037\":343,\"2070003\":0},\"343\":{\"65928\":344,\"65938\":345,\"2070003\":0},\"346\":{\"1050037\":347,\"2070003\":0},\"347\":{\"65928\":348,\"65938\":349,\"2070003\":0},\"350\":{\"46\":351,\"3320\":355,\"1050037\":580,\"2070003\":742},\"351\":{\"1050037\":352,\"2070003\":0},\"352\":{\"65928\":353,\"65938\":354,\"2070003\":0},\"355\":{\"1050037\":356,\"2070003\":0},\"356\":{\"65928\":357,\"65938\":358,\"2070003\":0},\"359\":{\"46846\":360,\"46849\":369,\"2070003\":0},\"360\":{\"46\":361,\"3320\":365,\"1050037\":583,\"2070003\":747},\"361\":{\"1050037\":362,\"2070003\":0},\"362\":{\"65928\":363,\"65938\":364,\"2070003\":0},\"365\":{\"1050037\":366,\"2070003\":0},\"366\":{\"65928\":367,\"65938\":368,\"2070003\":0},\"369\":{\"46\":370,\"3320\":374,\"1050037\":586,\"2070003\":748},\"370\":{\"1050037\":371,\"2070003\":0},\"371\":{\"65928\":372,\"65938\":373,\"2070003\":0},\"374\":{\"1050037\":375,\"2070003\":0},\"375\":{\"65928\":376,\"65938\":377,\"2070003\":0},\"378\":{\"65928\":379,\"65938\":380,\"2070003\":0},\"381\":{\"65928\":382,\"65938\":383,\"2070003\":0},\"384\":{\"46846\":385,\"46849\":394,\"2070003\":0},\"385\":{\"46\":386,\"3320\":390,\"1050037\":589,\"2070003\":749},\"386\":{\"1050037\":387,\"2070003\":0},\"387\":{\"65928\":388,\"65938\":389,\"2070003\":0},\"390\":{\"1050037\":391,\"2070003\":0},\"391\":{\"65928\":392,\"65938\":393,\"2070003\":0},\"394\":{\"46\":395,\"3320\":399,\"1050037\":592,\"2070003\":750},\"395\":{\"1050037\":396,\"2070003\":0},\"396\":{\"65928\":397,\"65938\":398,\"2070003\":0},\"399\":{\"1050037\":400,\"2070003\":0},\"400\":{\"65928\":401,\"65938\":402,\"2070003\":0},\"403\":{\"65928\":404,\"65938\":405,\"2070003\":0},\"406\":{\"65928\":407,\"65938\":408,\"2070003\":0},\"409\":{\"46846\":410,\"46849\":419,\"2070003\":0},\"410\":{\"46\":411,\"3320\":415,\"1050037\":595,\"2070003\":751},\"411\":{\"1050037\":412,\"2070003\":0},\"412\":{\"65928\":413,\"65938\":414,\"2070003\":0},\"415\":{\"1050037\":416,\"2070003\":0},\"416\":{\"65928\":417,\"65938\":418,\"2070003\":0},\"419\":{\"46\":420,\"3320\":424,\"1050037\":598,\"2070003\":752},\"420\":{\"1050037\":421,\"2070003\":0},\"421\":{\"65928\":422,\"65938\":423,\"2070003\":0},\"424\":{\"1050037\":425,\"2070003\":0},\"425\":{\"65928\":426,\"65938\":427,\"2070003\":0},\"428\":{\"65928\":429,\"65938\":430,\"2070003\":0},\"431\":{\"65928\":432,\"65938\":433,\"2070003\":0},\"434\":{\"46846\":435,\"46849\":444,\"2070003\":0},\"435\":{\"46\":436,\"3320\":440,\"1050037\":601,\"2070003\":753},\"436\":{\"1050037\":437,\"2070003\":0},\"437\":{\"65928\":438,\"65938\":439,\"2070003\":0},\"440\":{\"1050037\":441,\"2070003\":0},\"441\":{\"65928\":442,\"65938\":443,\"2070003\":0},\"444\":{\"46\":445,\"3320\":449,\"1050037\":604,\"2070003\":754},\"445\":{\"1050037\":446,\"2070003\":0},\"446\":{\"65928\":447,\"65938\":448,\"2070003\":0},\"449\":{\"1050037\":450,\"2070003\":0},\"450\":{\"65928\":451,\"65938\":452,\"2070003\":0},\"453\":{\"65928\":454,\"65938\":455,\"2070003\":0},\"456\":{\"65928\":457,\"65938\":458,\"2070003\":0},\"459\":{\"46846\":460,\"46849\":469,\"2070003\":0},\"460\":{\"46\":461,\"3320\":465,\"1050037\":655,\"2070003\":924},\"461\":{\"1050037\":462,\"2070003\":0},\"462\":{\"65928\":463,\"65938\":464,\"2070003\":0},\"465\":{\"1050037\":466,\"2070003\":0},\"466\":{\"65928\":467,\"65938\":468,\"2070003\":0},\"469\":{\"46\":470,\"3320\":474,\"1050037\":658,\"2070003\":925},\"470\":{\"1050037\":471,\"2070003\":0},\"471\":{\"65928\":472,\"65938\":473,\"2070003\":0},\"474\":{\"1050037\":475,\"2070003\":0},\"475\":{\"65928\":476,\"65938\":477,\"2070003\":0},\"478\":{\"65928\":479,\"65938\":480,\"2070003\":0},\"481\":{\"65928\":482,\"65938\":483,\"2070003\":0},\"484\":{\"46846\":485,\"46849\":494,\"2070003\":0},\"485\":{\"46\":486,\"3320\":490,\"1050037\":661,\"2070003\":926},\"486\":{\"1050037\":487,\"2070003\":0},\"487\":{\"65928\":488,\"65938\":489,\"2070003\":0},\"490\":{\"1050037\":491,\"2070003\":0},\"491\":{\"65928\":492,\"65938\":493,\"2070003\":0},\"494\":{\"46\":495,\"3320\":499,\"1050037\":664,\"2070003\":927},\"495\":{\"1050037\":496,\"2070003\":0},\"496\":{\"65928\":497,\"65938\":498,\"2070003\":0},\"499\":{\"1050037\":500,\"2070003\":0},\"500\":{\"65928\":501,\"65938\":502,\"2070003\":0},\"503\":{\"65928\":504,\"65938\":505,\"2070003\":0},\"506\":{\"65928\":507,\"65938\":508,\"2070003\":0},\"509\":{\"65928\":510,\"65938\":511,\"2070003\":0},\"512\":{\"65928\":513,\"65938\":514,\"2070003\":0},\"515\":{\"65928\":516,\"65938\":517,\"2070003\":0},\"518\":{\"65928\":519,\"65938\":520,\"2070003\":0},\"521\":{\"65928\":522,\"65938\":523,\"2070003\":0},\"524\":{\"65928\":525,\"65938\":526,\"2070003\":0},\"527\":{\"65928\":528,\"65938\":529,\"2070003\":0},\"530\":{\"65928\":531,\"65938\":532,\"2070003\":0},\"533\":{\"46846\":534,\"46849\":543,\"2070003\":0},\"534\":{\"46\":535,\"3320\":539,\"1050037\":667,\"2070003\":928},\"535\":{\"1050037\":536,\"2070003\":0},\"536\":{\"65928\":537,\"65938\":538,\"2070003\":0},\"539\":{\"1050037\":540,\"2070003\":0},\"540\":{\"65928\":541,\"65938\":542,\"2070003\":0},\"543\":{\"46\":544,\"3320\":548,\"1050037\":670,\"2070003\":929},\"544\":{\"1050037\":545,\"2070003\":0},\"545\":{\"65928\":546,\"65938\":547,\"2070003\":0},\"548\":{\"1050037\":549,\"2070003\":0},\"549\":{\"65928\":550,\"65938\":551,\"2070003\":0},\"552\":{\"65928\":553,\"65938\":554,\"2070003\":0},\"555\":{\"65928\":556,\"65938\":557,\"2070003\":0},\"558\":{\"46846\":559,\"46849\":568,\"2070003\":0},\"559\":{\"46\":560,\"3320\":564,\"1050037\":673,\"2070003\":930},\"560\":{\"1050037\":561,\"2070003\":0},\"561\":{\"65928\":562,\"65938\":563,\"2070003\":0},\"564\":{\"1050037\":565,\"2070003\":0},\"565\":{\"65928\":566,\"65938\":567,\"2070003\":0},\"568\":{\"46\":569,\"3320\":573,\"1050037\":676,\"2070003\":931},\"569\":{\"1050037\":570,\"2070003\":0},\"570\":{\"65928\":571,\"65938\":572,\"2070003\":0},\"573\":{\"1050037\":574,\"2070003\":0},\"574\":{\"65928\":575,\"65938\":576,\"2070003\":0},\"577\":{\"65928\":578,\"65938\":579,\"2070003\":0},\"580\":{\"65928\":581,\"65938\":582,\"2070003\":0},\"583\":{\"65928\":584,\"65938\":585,\"2070003\":0},\"586\":{\"65928\":587,\"65938\":588,\"2070003\":0},\"589\":{\"65928\":590,\"65938\":591,\"2070003\":0},\"592\":{\"65928\":593,\"65938\":594,\"2070003\":0},\"595\":{\"65928\":596,\"65938\":597,\"2070003\":0},\"598\":{\"65928\":599,\"65938\":600,\"2070003\":0},\"601\":{\"65928\":602,\"65938\":603,\"2070003\":0},\"604\":{\"65928\":605,\"65938\":606,\"2070003\":0},\"609\":{\"1050037\":610,\"2070003\":0},\"610\":{\"46846\":611,\"46849\":612,\"2070003\":0},\"615\":{\"1050037\":616,\"2070003\":0},\"616\":{\"46846\":617,\"46849\":618,\"2070003\":0},\"621\":{\"1050037\":622,\"2070003\":0},\"622\":{\"46846\":623,\"46849\":624,\"2070003\":0},\"627\":{\"1050037\":628,\"2070003\":0},\"628\":{\"46846\":629,\"46849\":630,\"2070003\":0},\"633\":{\"1050037\":634,\"2070003\":0},\"634\":{\"46846\":635,\"46849\":636,\"2070003\":0},\"639\":{\"1050037\":640,\"2070003\":0},\"640\":{\"46846\":641,\"46849\":642,\"2070003\":0},\"645\":{\"1050037\":646,\"2070003\":0},\"646\":{\"46846\":647,\"46849\":648,\"2070003\":0},\"651\":{\"1050037\":652,\"2070003\":0},\"652\":{\"46846\":653,\"46849\":654,\"2070003\":0},\"655\":{\"65928\":656,\"65938\":657,\"2070003\":0},\"658\":{\"65928\":659,\"65938\":660,\"2070003\":0},\"661\":{\"65928\":662,\"65938\":663,\"2070003\":0},\"664\":{\"65928\":665,\"65938\":666,\"2070003\":0},\"667\":{\"65928\":668,\"65938\":669,\"2070003\":0},\"670\":{\"65928\":671,\"65938\":672,\"2070003\":0},\"673\":{\"65928\":674,\"65938\":675,\"2070003\":0},\"676\":{\"65928\":677,\"65938\":678,\"2070003\":0},\"679\":{\"1948\":1101,\"3320\":680,\"2070003\":1288},\"680\":{\"1050037\":681,\"2070003\":0},\"681\":{\"19315\":682,\"1050044\":683,\"1050045\":684,\"2070003\":0},\"685\":{\"1948\":1102,\"3320\":686,\"2070003\":1289},\"686\":{\"1050037\":687,\"2070003\":0},\"687\":{\"19315\":688,\"1050044\":689,\"1050045\":690,\"2070003\":0},\"691\":{\"1948\":1103,\"3320\":692,\"2070003\":1290},\"692\":{\"1050037\":693,\"2070003\":0},\"693\":{\"19315\":694,\"1050044\":695,\"1050045\":696,\"2070003\":0},\"697\":{\"1948\":1104,\"3320\":698,\"2070003\":1291},\"698\":{\"1050037\":699,\"2070003\":0},\"699\":{\"19315\":700,\"1050044\":701,\"1050045\":702,\"2070003\":0},\"703\":{\"1948\":1105,\"3320\":704,\"2070003\":1292},\"704\":{\"1050037\":705,\"2070003\":0},\"705\":{\"19315\":706,\"1050044\":707,\"1050045\":708,\"2070003\":0},\"709\":{\"1948\":1106,\"3320\":710,\"2070003\":1293},\"710\":{\"1050037\":711,\"2070003\":0},\"711\":{\"19315\":712,\"1050044\":713,\"1050045\":714,\"2070003\":0},\"717\":{\"1050037\":718,\"2070003\":0},\"718\":{\"46846\":719,\"46849\":720,\"2070003\":0},\"723\":{\"1050037\":724,\"2070003\":0},\"724\":{\"46846\":725,\"46849\":726,\"2070003\":0},\"737\":{\"1050037\":738,\"2070003\":0},\"738\":{\"46846\":739,\"46849\":740,\"2070003\":0},\"743\":{\"1050037\":744,\"2070003\":0},\"744\":{\"46846\":745,\"46849\":746,\"2070003\":0},\"755\":{\"74799\":778,\"74906\":756,\"2070003\":0},\"756\":{\"219\":757,\"1050037\":764,\"1050040\":1034,\"1050043\":771,\"2070003\":0},\"757\":{\"19315\":758,\"1050040\":845,\"1050044\":760,\"1050045\":762,\"2070003\":0},\"758\":{\"1948\":759,\"2070003\":849},\"760\":{\"1948\":761,\"2070003\":850},\"762\":{\"1948\":763,\"2070003\":851},\"764\":{\"19315\":765,\"1050044\":767,\"1050045\":769,\"2070003\":0},\"765\":{\"1948\":766,\"2070003\":852},\"767\":{\"1948\":768,\"2070003\":853},\"769\":{\"1948\":770,\"2070003\":854},\"771\":{\"19315\":772,\"1050044\":774,\"1050045\":776,\"2070003\":0},\"772\":{\"1948\":773,\"2070003\":855},\"774\":{\"1948\":775,\"2070003\":856},\"776\":{\"1948\":777,\"2070003\":857},\"778\":{\"219\":779,\"1050037\":786,\"1050040\":1035,\"1050043\":793,\"2070003\":0},\"779\":{\"19315\":780,\"1050040\":846,\"1050044\":782,\"1050045\":784,\"2070003\":0},\"780\":{\"1948\":781,\"2070003\":858},\"782\":{\"1948\":783,\"2070003\":859},\"784\":{\"1948\":785,\"2070003\":860},\"786\":{\"19315\":787,\"1050044\":789,\"1050045\":791,\"2070003\":0},\"787\":{\"1948\":788,\"2070003\":861},\"789\":{\"1948\":790,\"2070003\":862},\"791\":{\"1948\":792,\"2070003\":863},\"793\":{\"19315\":794,\"1050044\":796,\"1050045\":798,\"2070003\":0},\"794\":{\"1948\":795,\"2070003\":864},\"796\":{\"1948\":797,\"2070003\":865},\"798\":{\"1948\":799,\"2070003\":866},\"800\":{\"74799\":823,\"74906\":801,\"2070003\":0},\"801\":{\"219\":802,\"1050037\":809,\"1050040\":1036,\"1050043\":816,\"2070003\":0},\"802\":{\"19315\":803,\"1050040\":847,\"1050044\":805,\"1050045\":807,\"2070003\":0},\"803\":{\"1948\":804,\"2070003\":867},\"805\":{\"1948\":806,\"2070003\":868},\"807\":{\"1948\":808,\"2070003\":869},\"809\":{\"19315\":810,\"1050044\":812,\"1050045\":814,\"2070003\":0},\"810\":{\"1948\":811,\"2070003\":870},\"812\":{\"1948\":813,\"2070003\":871},\"814\":{\"1948\":815,\"2070003\":872},\"816\":{\"19315\":817,\"1050044\":819,\"1050045\":821,\"2070003\":0},\"817\":{\"1948\":818,\"2070003\":873},\"819\":{\"1948\":820,\"2070003\":874},\"821\":{\"1948\":822,\"2070003\":875},\"823\":{\"219\":824,\"1050037\":831,\"1050040\":1037,\"1050043\":838,\"2070003\":0},\"824\":{\"19315\":825,\"1050040\":848,\"1050044\":827,\"1050045\":829,\"2070003\":0},\"825\":{\"1948\":826,\"2070003\":876},\"827\":{\"1948\":828,\"2070003\":877},\"829\":{\"1948\":830,\"2070003\":878},\"831\":{\"19315\":832,\"1050044\":834,\"1050045\":836,\"2070003\":0},\"832\":{\"1948\":833,\"2070003\":879},\"834\":{\"1948\":835,\"2070003\":880},\"836\":{\"1948\":837,\"2070003\":881},\"838\":{\"19315\":839,\"1050044\":841,\"1050045\":843,\"2070003\":0},\"839\":{\"1948\":840,\"2070003\":882},\"841\":{\"1948\":842,\"2070003\":883},\"843\":{\"1948\":844,\"2070003\":884},\"885\":{\"1050039\":886,\"1050041\":1021,\"1050043\":890,\"2070003\":0},\"886\":{\"75618\":897,\"75830\":887,\"80184\":894,\"2070003\":0},\"887\":{\"1050039\":888,\"1050043\":889,\"2070003\":0},\"890\":{\"75618\":903,\"75830\":891,\"80184\":900,\"2070003\":0},\"891\":{\"1050039\":892,\"1050043\":893,\"2070003\":0},\"894\":{\"1050039\":895,\"1050043\":896,\"2070003\":0},\"897\":{\"1050039\":898,\"1050043\":899,\"2070003\":0},\"900\":{\"1050039\":901,\"1050043\":902,\"2070003\":0},\"903\":{\"1050039\":904,\"1050043\":905,\"2070003\":0},\"906\":{\"1050039\":907,\"1050041\":1028,\"1050043\":911,\"2070003\":0},\"907\":{\"3320\":908,\"2070003\":1294},\"908\":{\"1050039\":909,\"1050043\":910,\"2070003\":0},\"911\":{\"3320\":912,\"2070003\":1295},\"912\":{\"1050039\":913,\"1050043\":914,\"2070003\":0},\"915\":{\"1050039\":916,\"1050041\":1031,\"1050043\":920,\"2070003\":0},\"916\":{\"3320\":917,\"2070003\":1296},\"917\":{\"1050039\":918,\"1050043\":919,\"2070003\":0},\"920\":{\"3320\":921,\"2070003\":1297},\"921\":{\"1050039\":922,\"1050043\":923,\"2070003\":0},\"932\":{\"219\":933,\"1050037\":940,\"1050043\":947,\"2070003\":0},\"933\":{\"19315\":934,\"1050044\":936,\"1050045\":938,\"2070003\":0},\"934\":{\"1948\":935,\"2070003\":1038},\"936\":{\"1948\":937,\"2070003\":1039},\"938\":{\"1948\":939,\"2070003\":1040},\"940\":{\"19315\":941,\"1050044\":943,\"1050045\":945,\"2070003\":0},\"941\":{\"1948\":942,\"2070003\":1041},\"943\":{\"1948\":944,\"2070003\":1042},\"945\":{\"1948\":946,\"2070003\":1043},\"947\":{\"19315\":948,\"1050044\":950,\"1050045\":952,\"2070003\":0},\"948\":{\"1948\":949,\"2070003\":1044},\"950\":{\"1948\":951,\"2070003\":1045},\"952\":{\"1948\":953,\"2070003\":1046},\"954\":{\"219\":955,\"1050037\":962,\"1050043\":969,\"2070003\":0},\"955\":{\"19315\":956,\"1050044\":958,\"1050045\":960,\"2070003\":0},\"956\":{\"1948\":957,\"2070003\":1047},\"958\":{\"1948\":959,\"2070003\":1048},\"960\":{\"1948\":961,\"2070003\":1049},\"962\":{\"19315\":963,\"1050044\":965,\"1050045\":967,\"2070003\":0},\"963\":{\"1948\":964,\"2070003\":1050},\"965\":{\"1948\":966,\"2070003\":1051},\"967\":{\"1948\":968,\"2070003\":1052},\"969\":{\"19315\":970,\"1050044\":972,\"1050045\":974,\"2070003\":0},\"970\":{\"1948\":971,\"2070003\":1053},\"972\":{\"1948\":973,\"2070003\":1054},\"974\":{\"1948\":975,\"2070003\":1055},\"976\":{\"51345\":977,\"2070003\":0},\"977\":{\"19315\":1111,\"44826\":1110,\"45293\":1109,\"74868\":978,\"1050039\":1107,\"1050040\":1108,\"1050044\":1112,\"2070003\":0},\"978\":{\"19315\":983,\"44826\":982,\"45293\":981,\"1050039\":979,\"1050040\":980,\"1050044\":984,\"2070003\":0},\"985\":{\"51345\":986,\"2070003\":0},\"986\":{\"19315\":1117,\"44826\":1116,\"45293\":1115,\"74868\":987,\"1050039\":1113,\"1050040\":1114,\"1050044\":1118,\"2070003\":0},\"987\":{\"19315\":992,\"44826\":991,\"45293\":990,\"1050039\":988,\"1050040\":989,\"1050044\":993,\"2070003\":0},\"994\":{\"51345\":995,\"2070003\":0},\"995\":{\"19315\":1123,\"44826\":1122,\"45293\":1121,\"74868\":996,\"1050039\":1119,\"1050040\":1120,\"1050044\":1124,\"2070003\":0},\"996\":{\"19315\":1001,\"44826\":1000,\"45293\":999,\"1050039\":997,\"1050040\":998,\"1050044\":1002,\"2070003\":0},\"1003\":{\"51345\":1004,\"2070003\":0},\"1004\":{\"19315\":1129,\"44826\":1128,\"45293\":1127,\"74868\":1005,\"1050039\":1125,\"1050040\":1126,\"1050044\":1130,\"2070003\":0},\"1005\":{\"19315\":1010,\"44826\":1009,\"45293\":1008,\"1050039\":1006,\"1050040\":1007,\"1050044\":1011,\"2070003\":0},\"1012\":{\"51345\":1013,\"2070003\":0},\"1013\":{\"19315\":1135,\"44826\":1134,\"45293\":1133,\"74868\":1014,\"1050039\":1131,\"1050040\":1132,\"1050044\":1136,\"2070003\":0},\"1014\":{\"19315\":1019,\"44826\":1018,\"45293\":1017,\"1050039\":1015,\"1050040\":1016,\"1050044\":1020,\"2070003\":0},\"1021\":{\"75618\":1026,\"75830\":1022,\"80184\":1024,\"2070003\":0},\"1022\":{\"1050041\":1023,\"2070003\":0},\"1024\":{\"1050041\":1025,\"2070003\":0},\"1026\":{\"1050041\":1027,\"2070003\":0},\"1028\":{\"3320\":1029,\"2070003\":1348},\"1029\":{\"1050041\":1030,\"2070003\":0},\"1031\":{\"3320\":1032,\"2070003\":1349},\"1032\":{\"1050041\":1033,\"2070003\":0},\"1056\":{\"47\":1063,\"75830\":1057,\"84671\":1066,\"2070003\":1518},\"1057\":{\"1050039\":1058,\"1050043\":1059,\"2070003\":0},\"1060\":{\"1050039\":1061,\"1050043\":1062,\"2070003\":0},\"1063\":{\"1050039\":1064,\"1050043\":1065,\"2070003\":0},\"1066\":{\"1050039\":1067,\"1050043\":1068,\"2070003\":0},\"1137\":{\"35744\":1138,\"35749\":1143,\"46659\":1163,\"46660\":1168,\"46846\":1148,\"46849\":1153,\"65938\":1158,\"2070003\":0},\"1138\":{\"1948\":1141,\"7543\":1140,\"23929\":1142,\"41899\":1139,\"2070003\":1307},\"1143\":{\"1948\":1146,\"7543\":1145,\"23929\":1147,\"41899\":1144,\"2070003\":1308},\"1148\":{\"1948\":1151,\"7543\":1150,\"23929\":1152,\"41899\":1149,\"2070003\":1309},\"1153\":{\"1948\":1156,\"7543\":1155,\"23929\":1157,\"41899\":1154,\"2070003\":1310},\"1158\":{\"1948\":1161,\"7543\":1160,\"23929\":1162,\"41899\":1159,\"2070003\":1311},\"1163\":{\"1948\":1166,\"7543\":1165,\"23929\":1167,\"41899\":1164,\"2070003\":1312},\"1168\":{\"1948\":1171,\"7543\":1170,\"23929\":1172,\"41899\":1169,\"2070003\":1313},\"1173\":{\"7\":1363,\"8\":1353,\"221\":1380,\"5850\":1381,\"10893\":1382,\"22873\":1369,\"22876\":1374,\"26424\":1371,\"26433\":1376,\"35744\":1174,\"35749\":1179,\"46659\":1199,\"46660\":1204,\"46846\":1184,\"46849\":1189,\"54269\":1356,\"54272\":1357,\"54733\":1282,\"54747\":1354,\"54752\":1355,\"57524\":1370,\"57530\":1375,\"63944\":1373,\"63945\":1377,\"65938\":1194,\"80576\":1379,\"80591\":1378,\"84274\":1372,\"84668\":1367,\"84701\":1368,\"84702\":1366,\"84703\":1365,\"84704\":1364,\"1050042\":1383,\"2070003\":0},\"1174\":{\"1948\":1177,\"7543\":1176,\"23929\":1178,\"41899\":1175,\"2070003\":1314},\"1179\":{\"1948\":1182,\"7543\":1181,\"23929\":1183,\"41899\":1180,\"2070003\":1315},\"1184\":{\"1948\":1187,\"7543\":1186,\"23929\":1188,\"41899\":1185,\"2070003\":1316},\"1189\":{\"1948\":1192,\"7543\":1191,\"23929\":1193,\"41899\":1190,\"2070003\":1317},\"1194\":{\"1948\":1197,\"7543\":1196,\"23929\":1198,\"41899\":1195,\"2070003\":1318},\"1199\":{\"1948\":1202,\"7543\":1201,\"23929\":1203,\"41899\":1200,\"2070003\":1319},\"1204\":{\"1948\":1207,\"7543\":1206,\"23929\":1208,\"41899\":1205,\"2070003\":1320},\"1217\":{\"1948\":1220,\"7543\":1219,\"23929\":1221,\"41899\":1218,\"2070003\":1323},\"1222\":{\"1948\":1225,\"7543\":1224,\"23929\":1226,\"41899\":1223,\"2070003\":1324},\"1227\":{\"1948\":1230,\"7543\":1229,\"23929\":1231,\"41899\":1228,\"2070003\":1325},\"1232\":{\"1948\":1235,\"7543\":1234,\"23929\":1236,\"41899\":1233,\"2070003\":1326},\"1237\":{\"1948\":1240,\"7543\":1239,\"23929\":1241,\"41899\":1238,\"2070003\":1327},\"1250\":{\"1948\":1253,\"7543\":1252,\"23929\":1254,\"41899\":1251,\"2070003\":1330},\"1255\":{\"1948\":1258,\"7543\":1257,\"23929\":1259,\"41899\":1256,\"2070003\":1331},\"1260\":{\"1948\":1263,\"7543\":1262,\"23929\":1264,\"41899\":1261,\"2070003\":1332},\"1265\":{\"1948\":1268,\"7543\":1267,\"23929\":1269,\"41899\":1266,\"2070003\":1333},\"1270\":{\"1948\":1273,\"7543\":1272,\"23929\":1274,\"41899\":1271,\"2070003\":1334},\"1275\":{\"47\":1278,\"75830\":1276,\"84671\":1280,\"2070003\":1517},\"1276\":{\"1050041\":1277,\"2070003\":0},\"1278\":{\"1050041\":1279,\"2070003\":0},\"1280\":{\"1050041\":1281,\"2070003\":0},\"1282\":{\"12618\":1283,\"12713\":1286,\"2070003\":0},\"1284\":{\"12618\":1285,\"12713\":1287,\"2070003\":0},\"1298\":{\"1050039\":1299,\"1050041\":1350,\"1050043\":1300,\"2070003\":0},\"1301\":{\"1050039\":1302,\"1050041\":1351,\"1050043\":1303,\"2070003\":0},\"1304\":{\"1050039\":1305,\"1050041\":1352,\"1050043\":1306,\"2070003\":0},\"1335\":{\"1948\":1338,\"23929\":1336,\"41899\":1337,\"2070003\":1519},\"1344\":{\"1050043\":1345,\"2070003\":0},\"1346\":{\"1050043\":1347,\"2070003\":0},\"1426\":{\"1050037\":1428,\"1050043\":1429,\"1050046\":1427,\"2070003\":0},\"1430\":{\"1050037\":1432,\"1050043\":1433,\"1050046\":1431,\"2070003\":0},\"1434\":{\"1050037\":1436,\"1050043\":1437,\"1050046\":1435,\"2070003\":0},\"1438\":{\"1050037\":1440,\"1050043\":1441,\"1050046\":1439,\"2070003\":0},\"1442\":{\"1050037\":1444,\"1050043\":1445,\"1050046\":1443,\"2070003\":0},\"1446\":{\"1050037\":1448,\"1050043\":1449,\"1050046\":1447,\"2070003\":0},\"1450\":{\"1050037\":1452,\"1050043\":1453,\"1050046\":1451,\"2070003\":0},\"1454\":{\"1050037\":1456,\"1050043\":1457,\"1050046\":1455,\"2070003\":0},\"1458\":{\"1050037\":1460,\"1050043\":1461,\"1050046\":1459,\"2070003\":0},\"1462\":{\"1050037\":1464,\"1050043\":1465,\"1050046\":1463,\"2070003\":0},\"1466\":{\"1050037\":1468,\"1050043\":1469,\"1050046\":1467,\"2070003\":0},\"1470\":{\"1050037\":1472,\"1050043\":1473,\"1050046\":1471,\"2070003\":0},\"1474\":{\"1050037\":1476,\"1050043\":1477,\"1050046\":1475,\"2070003\":0},\"1478\":{\"1050037\":1480,\"1050043\":1481,\"1050046\":1479,\"2070003\":0},\"1482\":{\"1050037\":1484,\"1050043\":1485,\"1050046\":1483,\"2070003\":0},\"1486\":{\"1050037\":1488,\"1050043\":1489,\"1050046\":1487,\"2070003\":0},\"1490\":{\"1050037\":1492,\"1050043\":1493,\"1050046\":1491,\"2070003\":0},\"1494\":{\"1050037\":1496,\"1050043\":1497,\"1050046\":1495,\"2070003\":0},\"1498\":{\"1050037\":1500,\"1050043\":1501,\"1050046\":1499,\"2070003\":0},\"1502\":{\"1050037\":1504,\"1050043\":1505,\"1050046\":1503,\"2070003\":0},\"1506\":{\"1050037\":1508,\"1050043\":1509,\"1050046\":1507,\"2070003\":0},\"1510\":{\"1050037\":1512,\"1050043\":1513,\"1050046\":1511,\"2070003\":0}},{\"9\":\"DURATION\",\"10\":\"DURATION\",\"13\":\"DURATION\",\"14\":\"DURATION\",\"18\":\"DURATION\",\"19\":\"DURATION\",\"22\":\"DURATION\",\"23\":\"DURATION\",\"30\":\"DURATION\",\"31\":\"DURATION\",\"34\":\"DURATION\",\"35\":\"DURATION\",\"39\":\"DURATION\",\"40\":\"DURATION\",\"43\":\"DURATION\",\"44\":\"DURATION\",\"52\":\"DURATION\",\"53\":\"DURATION\",\"56\":\"DURATION\",\"57\":\"DURATION\",\"61\":\"DURATION\",\"62\":\"DURATION\",\"65\":\"DURATION\",\"66\":\"DURATION\",\"73\":\"DURATION\",\"74\":\"DURATION\",\"77\":\"DURATION\",\"78\":\"DURATION\",\"82\":\"DURATION\",\"83\":\"DURATION\",\"86\":\"DURATION\",\"87\":\"DURATION\",\"96\":\"DURATION\",\"97\":\"DURATION\",\"100\":\"DURATION\",\"101\":\"DURATION\",\"105\":\"DURATION\",\"106\":\"DURATION\",\"109\":\"DURATION\",\"110\":\"DURATION\",\"117\":\"DURATION\",\"118\":\"DURATION\",\"121\":\"DURATION\",\"122\":\"DURATION\",\"126\":\"DURATION\",\"127\":\"DURATION\",\"130\":\"DURATION\",\"131\":\"DURATION\",\"139\":\"DURATION\",\"140\":\"DURATION\",\"143\":\"DURATION\",\"144\":\"DURATION\",\"148\":\"DURATION\",\"149\":\"DURATION\",\"152\":\"DURATION\",\"153\":\"DURATION\",\"160\":\"DURATION\",\"161\":\"DURATION\",\"164\":\"DURATION\",\"165\":\"DURATION\",\"169\":\"DURATION\",\"170\":\"DURATION\",\"173\":\"DURATION\",\"174\":\"DURATION\",\"181\":\"DURATION\",\"182\":\"DURATION\",\"185\":\"DURATION\",\"186\":\"DURATION\",\"190\":\"DURATION\",\"191\":\"DURATION\",\"194\":\"DURATION\",\"195\":\"DURATION\",\"202\":\"DURATION\",\"203\":\"DURATION\",\"206\":\"DURATION\",\"207\":\"DURATION\",\"211\":\"DURATION\",\"212\":\"DURATION\",\"215\":\"DURATION\",\"216\":\"DURATION\",\"221\":\"DURATION\",\"222\":\"DURATION\",\"225\":\"DURATION\",\"226\":\"DURATION\",\"230\":\"DURATION\",\"231\":\"DURATION\",\"234\":\"DURATION\",\"235\":\"DURATION\",\"237\":\"DURATION\",\"238\":\"DURATION\",\"240\":\"DURATION\",\"241\":\"DURATION\",\"246\":\"DURATION\",\"247\":\"DURATION\",\"250\":\"DURATION\",\"251\":\"DURATION\",\"255\":\"DURATION\",\"256\":\"DURATION\",\"259\":\"DURATION\",\"260\":\"DURATION\",\"262\":\"DURATION\",\"263\":\"DURATION\",\"265\":\"DURATION\",\"266\":\"DURATION\",\"271\":\"DURATION\",\"272\":\"DURATION\",\"275\":\"DURATION\",\"276\":\"DURATION\",\"280\":\"DURATION\",\"281\":\"DURATION\",\"284\":\"DURATION\",\"285\":\"DURATION\",\"287\":\"DURATION\",\"288\":\"DURATION\",\"290\":\"DURATION\",\"291\":\"DURATION\",\"296\":\"DURATION\",\"297\":\"DURATION\",\"300\":\"DURATION\",\"301\":\"DURATION\",\"305\":\"DURATION\",\"306\":\"DURATION\",\"309\":\"DURATION\",\"310\":\"DURATION\",\"312\":\"DURATION\",\"313\":\"DURATION\",\"315\":\"DURATION\",\"316\":\"DURATION\",\"323\":\"DURATION\",\"324\":\"DURATION\",\"327\":\"DURATION\",\"328\":\"DURATION\",\"332\":\"DURATION\",\"333\":\"DURATION\",\"336\":\"DURATION\",\"337\":\"DURATION\",\"344\":\"DURATION\",\"345\":\"DURATION\",\"348\":\"DURATION\",\"349\":\"DURATION\",\"353\":\"DURATION\",\"354\":\"DURATION\",\"357\":\"DURATION\",\"358\":\"DURATION\",\"363\":\"DURATION\",\"364\":\"DURATION\",\"367\":\"DURATION\",\"368\":\"DURATION\",\"372\":\"DURATION\",\"373\":\"DURATION\",\"376\":\"DURATION\",\"377\":\"DURATION\",\"379\":\"DURATION\",\"380\":\"DURATION\",\"382\":\"DURATION\",\"383\":\"DURATION\",\"388\":\"DURATION\",\"389\":\"DURATION\",\"392\":\"DURATION\",\"393\":\"DURATION\",\"397\":\"DURATION\",\"398\":\"DURATION\",\"401\":\"DURATION\",\"402\":\"DURATION\",\"404\":\"DURATION\",\"405\":\"DURATION\",\"407\":\"DURATION\",\"408\":\"DURATION\",\"413\":\"DURATION\",\"414\":\"DURATION\",\"417\":\"DURATION\",\"418\":\"DURATION\",\"422\":\"DURATION\",\"423\":\"DURATION\",\"426\":\"DURATION\",\"427\":\"DURATION\",\"429\":\"DURATION\",\"430\":\"DURATION\",\"432\":\"DURATION\",\"433\":\"DURATION\",\"438\":\"DURATION\",\"439\":\"DURATION\",\"442\":\"DURATION\",\"443\":\"DURATION\",\"447\":\"DURATION\",\"448\":\"DURATION\",\"451\":\"DURATION\",\"452\":\"DURATION\",\"454\":\"DURATION\",\"455\":\"DURATION\",\"457\":\"DURATION\",\"458\":\"DURATION\",\"463\":\"DURATION\",\"464\":\"DURATION\",\"467\":\"DURATION\",\"468\":\"DURATION\",\"472\":\"DURATION\",\"473\":\"DURATION\",\"476\":\"DURATION\",\"477\":\"DURATION\",\"479\":\"DURATION\",\"480\":\"DURATION\",\"482\":\"DURATION\",\"483\":\"DURATION\",\"488\":\"DURATION\",\"489\":\"DURATION\",\"492\":\"DURATION\",\"493\":\"DURATION\",\"497\":\"DURATION\",\"498\":\"DURATION\",\"501\":\"DURATION\",\"502\":\"DURATION\",\"504\":\"DURATION\",\"505\":\"DURATION\",\"507\":\"DURATION\",\"508\":\"DURATION\",\"510\":\"DURATION\",\"511\":\"DURATION\",\"513\":\"DURATION\",\"514\":\"DURATION\",\"516\":\"DURATION\",\"517\":\"DURATION\",\"519\":\"DURATION\",\"520\":\"DURATION\",\"522\":\"DURATION\",\"523\":\"DURATION\",\"525\":\"DURATION\",\"526\":\"DURATION\",\"528\":\"DURATION\",\"529\":\"DURATION\",\"531\":\"DURATION\",\"532\":\"DURATION\",\"537\":\"DURATION\",\"538\":\"DURATION\",\"541\":\"DURATION\",\"542\":\"DURATION\",\"546\":\"DURATION\",\"547\":\"DURATION\",\"550\":\"DURATION\",\"551\":\"DURATION\",\"553\":\"DURATION\",\"554\":\"DURATION\",\"556\":\"DURATION\",\"557\":\"DURATION\",\"562\":\"DURATION\",\"563\":\"DURATION\",\"566\":\"DURATION\",\"567\":\"DURATION\",\"571\":\"DURATION\",\"572\":\"DURATION\",\"575\":\"DURATION\",\"576\":\"DURATION\",\"578\":\"DURATION\",\"579\":\"DURATION\",\"581\":\"DURATION\",\"582\":\"DURATION\",\"584\":\"DURATION\",\"585\":\"DURATION\",\"587\":\"DURATION\",\"588\":\"DURATION\",\"590\":\"DURATION\",\"591\":\"DURATION\",\"593\":\"DURATION\",\"594\":\"DURATION\",\"596\":\"DURATION\",\"597\":\"DURATION\",\"599\":\"DURATION\",\"600\":\"DURATION\",\"602\":\"DURATION\",\"603\":\"DURATION\",\"605\":\"DURATION\",\"606\":\"DURATION\",\"607\":\"DURATION\",\"608\":\"DURATION\",\"611\":\"DURATION\",\"612\":\"DURATION\",\"613\":\"DURATION\",\"614\":\"DURATION\",\"617\":\"DURATION\",\"618\":\"DURATION\",\"619\":\"DURATION\",\"620\":\"DURATION\",\"623\":\"DURATION\",\"624\":\"DURATION\",\"625\":\"DURATION\",\"626\":\"DURATION\",\"629\":\"DURATION\",\"630\":\"DURATION\",\"631\":\"DURATION\",\"632\":\"DURATION\",\"635\":\"DURATION\",\"636\":\"DURATION\",\"637\":\"DURATION\",\"638\":\"DURATION\",\"641\":\"DURATION\",\"642\":\"DURATION\",\"643\":\"DURATION\",\"644\":\"DURATION\",\"647\":\"DURATION\",\"648\":\"DURATION\",\"649\":\"DURATION\",\"650\":\"DURATION\",\"653\":\"DURATION\",\"654\":\"DURATION\",\"656\":\"DURATION\",\"657\":\"DURATION\",\"659\":\"DURATION\",\"660\":\"DURATION\",\"662\":\"DURATION\",\"663\":\"DURATION\",\"665\":\"DURATION\",\"666\":\"DURATION\",\"668\":\"DURATION\",\"669\":\"DURATION\",\"671\":\"DURATION\",\"672\":\"DURATION\",\"674\":\"DURATION\",\"675\":\"DURATION\",\"677\":\"DURATION\",\"678\":\"DURATION\",\"682\":\"DURATION\",\"683\":\"DURATION\",\"684\":\"DURATION\",\"688\":\"DURATION\",\"689\":\"DURATION\",\"690\":\"DURATION\",\"694\":\"DURATION\",\"695\":\"DURATION\",\"696\":\"DURATION\",\"700\":\"DURATION\",\"701\":\"DURATION\",\"702\":\"DURATION\",\"706\":\"DURATION\",\"707\":\"DURATION\",\"708\":\"DURATION\",\"712\":\"DURATION\",\"713\":\"DURATION\",\"714\":\"DURATION\",\"715\":\"DURATION\",\"716\":\"DURATION\",\"719\":\"DURATION\",\"720\":\"DURATION\",\"721\":\"DURATION\",\"722\":\"DURATION\",\"725\":\"DURATION\",\"726\":\"DURATION\",\"727\":\"DURATION\",\"728\":\"DURATION\",\"729\":\"DURATION\",\"730\":\"DURATION\",\"731\":\"DURATION\",\"732\":\"DURATION\",\"733\":\"DURATION\",\"734\":\"DURATION\",\"735\":\"DURATION\",\"736\":\"DURATION\",\"739\":\"DURATION\",\"740\":\"DURATION\",\"741\":\"DURATION\",\"742\":\"DURATION\",\"745\":\"DURATION\",\"746\":\"DURATION\",\"747\":\"DURATION\",\"748\":\"DURATION\",\"749\":\"DURATION\",\"750\":\"DURATION\",\"751\":\"DURATION\",\"752\":\"DURATION\",\"753\":\"DURATION\",\"754\":\"DURATION\",\"759\":\"DATE\",\"761\":\"DATE\",\"763\":\"DATE\",\"766\":\"DATE\",\"768\":\"DATE\",\"770\":\"DATE\",\"773\":\"DATE\",\"775\":\"DATE\",\"777\":\"DATE\",\"781\":\"DATE\",\"783\":\"DATE\",\"785\":\"DATE\",\"788\":\"DATE\",\"790\":\"DATE\",\"792\":\"DATE\",\"795\":\"DATE\",\"797\":\"DATE\",\"799\":\"DATE\",\"804\":\"DATE\",\"806\":\"DATE\",\"808\":\"DATE\",\"811\":\"DATE\",\"813\":\"DATE\",\"815\":\"DATE\",\"818\":\"DATE\",\"820\":\"DATE\",\"822\":\"DATE\",\"826\":\"DATE\",\"828\":\"DATE\",\"830\":\"DATE\",\"833\":\"DATE\",\"835\":\"DATE\",\"837\":\"DATE\",\"840\":\"DATE\",\"842\":\"DATE\",\"844\":\"DATE\",\"845\":\"DURATION\",\"846\":\"DURATION\",\"847\":\"DURATION\",\"848\":\"DURATION\",\"849\":\"DURATION\",\"850\":\"DURATION\",\"851\":\"DURATION\",\"852\":\"DURATION\",\"853\":\"DURATION\",\"854\":\"DURATION\",\"855\":\"DURATION\",\"856\":\"DURATION\",\"857\":\"DURATION\",\"858\":\"DURATION\",\"859\":\"DURATION\",\"860\":\"DURATION\",\"861\":\"DURATION\",\"862\":\"DURATION\",\"863\":\"DURATION\",\"864\":\"DURATION\",\"865\":\"DURATION\",\"866\":\"DURATION\",\"867\":\"DURATION\",\"868\":\"DURATION\",\"869\":\"DURATION\",\"870\":\"DURATION\",\"871\":\"DURATION\",\"872\":\"DURATION\",\"873\":\"DURATION\",\"874\":\"DURATION\",\"875\":\"DURATION\",\"876\":\"DURATION\",\"877\":\"DURATION\",\"878\":\"DURATION\",\"879\":\"DURATION\",\"880\":\"DURATION\",\"881\":\"DURATION\",\"882\":\"DURATION\",\"883\":\"DURATION\",\"884\":\"DURATION\",\"888\":\"DURATION\",\"889\":\"DURATION\",\"892\":\"DURATION\",\"893\":\"DURATION\",\"895\":\"DURATION\",\"896\":\"DURATION\",\"898\":\"DURATION\",\"899\":\"DURATION\",\"901\":\"DURATION\",\"902\":\"DURATION\",\"904\":\"DURATION\",\"905\":\"DURATION\",\"909\":\"DURATION\",\"910\":\"DURATION\",\"913\":\"DURATION\",\"914\":\"DURATION\",\"918\":\"DURATION\",\"919\":\"DURATION\",\"922\":\"DURATION\",\"923\":\"DURATION\",\"924\":\"DURATION\",\"925\":\"DURATION\",\"926\":\"DURATION\",\"927\":\"DURATION\",\"928\":\"DURATION\",\"929\":\"DURATION\",\"930\":\"DURATION\",\"931\":\"DURATION\",\"935\":\"DATE\",\"937\":\"DATE\",\"939\":\"DATE\",\"942\":\"DATE\",\"944\":\"DATE\",\"946\":\"DATE\",\"949\":\"DATE\",\"951\":\"DATE\",\"953\":\"DATE\",\"957\":\"DATE\",\"959\":\"DATE\",\"961\":\"DATE\",\"964\":\"DATE\",\"966\":\"DATE\",\"968\":\"DATE\",\"971\":\"DATE\",\"973\":\"DATE\",\"975\":\"DATE\",\"979\":\"DATE\",\"980\":\"DATE\",\"981\":\"DATE\",\"982\":\"DATE\",\"983\":\"DATE\",\"984\":\"DATE\",\"988\":\"DATE\",\"989\":\"DATE\",\"990\":\"DATE\",\"991\":\"DATE\",\"992\":\"DATE\",\"993\":\"DATE\",\"997\":\"DATE\",\"998\":\"DATE\",\"999\":\"DATE\",\"1000\":\"DATE\",\"1001\":\"DATE\",\"1002\":\"DATE\",\"1006\":\"DATE\",\"1007\":\"DATE\",\"1008\":\"DATE\",\"1009\":\"DATE\",\"1010\":\"DATE\",\"1011\":\"DATE\",\"1015\":\"DATE\",\"1016\":\"DATE\",\"1017\":\"DATE\",\"1018\":\"DATE\",\"1019\":\"DATE\",\"1020\":\"DATE\",\"1023\":\"DURATION\",\"1025\":\"DURATION\",\"1027\":\"DURATION\",\"1030\":\"DURATION\",\"1033\":\"DURATION\",\"1034\":\"DURATION\",\"1035\":\"DURATION\",\"1036\":\"DURATION\",\"1037\":\"DURATION\",\"1038\":\"DURATION\",\"1039\":\"DURATION\",\"1040\":\"DURATION\",\"1041\":\"DURATION\",\"1042\":\"DURATION\",\"1043\":\"DURATION\",\"1044\":\"DURATION\",\"1045\":\"DURATION\",\"1046\":\"DURATION\",\"1047\":\"DURATION\",\"1048\":\"DURATION\",\"1049\":\"DURATION\",\"1050\":\"DURATION\",\"1051\":\"DURATION\",\"1052\":\"DURATION\",\"1053\":\"DURATION\",\"1054\":\"DURATION\",\"1055\":\"DURATION\",\"1058\":\"DURATION\",\"1059\":\"DURATION\",\"1061\":\"DURATION\",\"1062\":\"DURATION\",\"1064\":\"DURATION\",\"1065\":\"DURATION\",\"1067\":\"DURATION\",\"1068\":\"DURATION\",\"1069\":\"DURATION\",\"1070\":\"DURATION\",\"1071\":\"DURATION\",\"1072\":\"DURATION\",\"1073\":\"DURATION\",\"1074\":\"DURATION\",\"1075\":\"DURATION\",\"1076\":\"DURATION\",\"1077\":\"DURATION\",\"1078\":\"DURATION\",\"1079\":\"DURATION\",\"1080\":\"DURATION\",\"1081\":\"DURATION\",\"1082\":\"DURATION\",\"1083\":\"DURATION\",\"1084\":\"DURATION\",\"1085\":\"DURATION\",\"1086\":\"DURATION\",\"1087\":\"DURATION\",\"1088\":\"DURATION\",\"1089\":\"DURATION\",\"1090\":\"DURATION\",\"1091\":\"DURATION\",\"1092\":\"DURATION\",\"1093\":\"DURATION\",\"1094\":\"DURATION\",\"1095\":\"DURATION\",\"1096\":\"DURATION\",\"1097\":\"DURATION\",\"1098\":\"DURATION\",\"1099\":\"DURATION\",\"1100\":\"DURATION\",\"1101\":\"DATE\",\"1102\":\"DATE\",\"1103\":\"DATE\",\"1104\":\"DATE\",\"1105\":\"DATE\",\"1106\":\"DATE\",\"1107\":\"DATE\",\"1108\":\"DATE\",\"1109\":\"DATE\",\"1110\":\"DATE\",\"1111\":\"DATE\",\"1112\":\"DATE\",\"1113\":\"DATE\",\"1114\":\"DATE\",\"1115\":\"DATE\",\"1116\":\"DATE\",\"1117\":\"DATE\",\"1118\":\"DATE\",\"1119\":\"DATE\",\"1120\":\"DATE\",\"1121\":\"DATE\",\"1122\":\"DATE\",\"1123\":\"DATE\",\"1124\":\"DATE\",\"1125\":\"DATE\",\"1126\":\"DATE\",\"1127\":\"DATE\",\"1128\":\"DATE\",\"1129\":\"DATE\",\"1130\":\"DATE\",\"1131\":\"DATE\",\"1132\":\"DATE\",\"1133\":\"DATE\",\"1134\":\"DATE\",\"1135\":\"DATE\",\"1136\":\"DATE\",\"1139\":\"TIME\",\"1140\":\"TIME\",\"1141\":\"TIME\",\"1142\":\"TIME\",\"1144\":\"TIME\",\"1145\":\"TIME\",\"1146\":\"TIME\",\"1147\":\"TIME\",\"1149\":\"TIME\",\"1150\":\"TIME\",\"1151\":\"TIME\",\"1152\":\"TIME\",\"1154\":\"TIME\",\"1155\":\"TIME\",\"1156\":\"TIME\",\"1157\":\"TIME\",\"1159\":\"TIME\",\"1160\":\"TIME\",\"1161\":\"TIME\",\"1162\":\"TIME\",\"1164\":\"TIME\",\"1165\":\"TIME\",\"1166\":\"TIME\",\"1167\":\"TIME\",\"1169\":\"TIME\",\"1170\":\"TIME\",\"1171\":\"TIME\",\"1172\":\"TIME\",\"1175\":\"TIME\",\"1176\":\"TIME\",\"1177\":\"TIME\",\"1178\":\"TIME\",\"1180\":\"TIME\",\"1181\":\"TIME\",\"1182\":\"TIME\",\"1183\":\"TIME\",\"1185\":\"TIME\",\"1186\":\"TIME\",\"1187\":\"TIME\",\"1188\":\"TIME\",\"1190\":\"TIME\",\"1191\":\"TIME\",\"1192\":\"TIME\",\"1193\":\"TIME\",\"1195\":\"TIME\",\"1196\":\"TIME\",\"1197\":\"TIME\",\"1198\":\"TIME\",\"1200\":\"TIME\",\"1201\":\"TIME\",\"1202\":\"TIME\",\"1203\":\"TIME\",\"1205\":\"TIME\",\"1206\":\"TIME\",\"1207\":\"TIME\",\"1208\":\"TIME\",\"1209\":\"TIME\",\"1210\":\"TIME\",\"1211\":\"TIME\",\"1212\":\"TIME\",\"1213\":\"TIME\",\"1214\":\"TIME\",\"1215\":\"TIME\",\"1216\":\"TIME\",\"1218\":\"TIME\",\"1219\":\"TIME\",\"1220\":\"TIME\",\"1221\":\"TIME\",\"1223\":\"TIME\",\"1224\":\"TIME\",\"1225\":\"TIME\",\"1226\":\"TIME\",\"1228\":\"TIME\",\"1229\":\"TIME\",\"1230\":\"TIME\",\"1231\":\"TIME\",\"1233\":\"TIME\",\"1234\":\"TIME\",\"1235\":\"TIME\",\"1236\":\"TIME\",\"1238\":\"TIME\",\"1239\":\"TIME\",\"1240\":\"TIME\",\"1241\":\"TIME\",\"1242\":\"TIME\",\"1243\":\"TIME\",\"1244\":\"TIME\",\"1245\":\"TIME\",\"1246\":\"TIME\",\"1247\":\"TIME\",\"1248\":\"TIME\",\"1249\":\"TIME\",\"1251\":\"TIME\",\"1252\":\"TIME\",\"1253\":\"TIME\",\"1254\":\"TIME\",\"1256\":\"TIME\",\"1257\":\"TIME\",\"1258\":\"TIME\",\"1259\":\"TIME\",\"1261\":\"TIME\",\"1262\":\"TIME\",\"1263\":\"TIME\",\"1264\":\"TIME\",\"1266\":\"TIME\",\"1267\":\"TIME\",\"1268\":\"TIME\",\"1269\":\"TIME\",\"1271\":\"TIME\",\"1272\":\"TIME\",\"1273\":\"TIME\",\"1274\":\"TIME\",\"1277\":\"DURATION\",\"1279\":\"DURATION\",\"1281\":\"DURATION\",\"1283\":\"PERCENT\",\"1285\":\"PERCENT\",\"1286\":\"PERCENT\",\"1287\":\"PERCENT\",\"1288\":\"DURATION\",\"1289\":\"DURATION\",\"1290\":\"DURATION\",\"1291\":\"DURATION\",\"1292\":\"DURATION\",\"1293\":\"DURATION\",\"1294\":\"DURATION\",\"1295\":\"DURATION\",\"1296\":\"DURATION\",\"1297\":\"DURATION\",\"1299\":\"DURATION\",\"1300\":\"DURATION\",\"1302\":\"DURATION\",\"1303\":\"DURATION\",\"1305\":\"DURATION\",\"1306\":\"DURATION\",\"1307\":\"DURATION\",\"1308\":\"DURATION\",\"1309\":\"DURATION\",\"1310\":\"DURATION\",\"1311\":\"DURATION\",\"1312\":\"DURATION\",\"1313\":\"DURATION\",\"1314\":\"DURATION\",\"1315\":\"DURATION\",\"1316\":\"DURATION\",\"1317\":\"DURATION\",\"1318\":\"DURATION\",\"1319\":\"DURATION\",\"1320\":\"DURATION\",\"1321\":\"DURATION\",\"1322\":\"DURATION\",\"1323\":\"DURATION\",\"1324\":\"DURATION\",\"1325\":\"DURATION\",\"1326\":\"DURATION\",\"1327\":\"DURATION\",\"1328\":\"DURATION\",\"1329\":\"DURATION\",\"1330\":\"DURATION\",\"1331\":\"DURATION\",\"1332\":\"DURATION\",\"1333\":\"DURATION\",\"1334\":\"DURATION\",\"1336\":\"DATE\",\"1337\":\"DATE\",\"1338\":\"DATE\",\"1339\":\"DATE\",\"1340\":\"DATE\",\"1341\":\"DATE\",\"1342\":\"DATE\",\"1343\":\"DATE\",\"1345\":\"DATE\",\"1347\":\"DATE\",\"1348\":\"DURATION\",\"1349\":\"DURATION\",\"1350\":\"DURATION\",\"1351\":\"DURATION\",\"1352\":\"DURATION\",\"1353\":\"PERCENT\",\"1354\":\"PERCENT\",\"1355\":\"PERCENT\",\"1356\":\"PERCENT\",\"1357\":\"PERCENT\",\"1358\":\"PERCENT\",\"1359\":\"PERCENT\",\"1360\":\"PERCENT\",\"1361\":\"PERCENT\",\"1362\":\"PERCENT\",\"1363\":\"MONEY\",\"1364\":\"MONEY\",\"1365\":\"MONEY\",\"1366\":\"MONEY\",\"1367\":\"MONEY\",\"1368\":\"MONEY\",\"1369\":\"MONEY\",\"1370\":\"MONEY\",\"1371\":\"MONEY\",\"1372\":\"MONEY\",\"1373\":\"MONEY\",\"1374\":\"MONEY\",\"1375\":\"MONEY\",\"1376\":\"MONEY\",\"1377\":\"MONEY\",\"1378\":\"MONEY\",\"1379\":\"MONEY\",\"1380\":\"MONEY\",\"1381\":\"MONEY\",\"1382\":\"MONEY\",\"1383\":\"MONEY\",\"1384\":\"MONEY\",\"1385\":\"MONEY\",\"1386\":\"MONEY\",\"1387\":\"MONEY\",\"1388\":\"MONEY\",\"1389\":\"MONEY\",\"1390\":\"MONEY\",\"1391\":\"MONEY\",\"1392\":\"MONEY\",\"1393\":\"MONEY\",\"1394\":\"MONEY\",\"1395\":\"MONEY\",\"1396\":\"MONEY\",\"1397\":\"MONEY\",\"1398\":\"MONEY\",\"1399\":\"MONEY\",\"1400\":\"MONEY\",\"1401\":\"MONEY\",\"1402\":\"MONEY\",\"1403\":\"MONEY\",\"1404\":\"MONEY\",\"1405\":\"MONEY\",\"1406\":\"MONEY\",\"1407\":\"MONEY\",\"1408\":\"MONEY\",\"1409\":\"MONEY\",\"1410\":\"MONEY\",\"1411\":\"MONEY\",\"1412\":\"MONEY\",\"1413\":\"MONEY\",\"1414\":\"MONEY\",\"1415\":\"MONEY\",\"1416\":\"MONEY\",\"1417\":\"MONEY\",\"1418\":\"MONEY\",\"1419\":\"MONEY\",\"1420\":\"MONEY\",\"1421\":\"MONEY\",\"1422\":\"MONEY\",\"1423\":\"MONEY\",\"1424\":\"MONEY\",\"1425\":\"MONEY\",\"1427\":\"MONEY\",\"1428\":\"MONEY\",\"1429\":\"MONEY\",\"1431\":\"MONEY\",\"1432\":\"MONEY\",\"1433\":\"MONEY\",\"1435\":\"MONEY\",\"1436\":\"MONEY\",\"1437\":\"MONEY\",\"1439\":\"MONEY\",\"1440\":\"MONEY\",\"1441\":\"MONEY\",\"1443\":\"MONEY\",\"1444\":\"MONEY\",\"1445\":\"MONEY\",\"1447\":\"MONEY\",\"1448\":\"MONEY\",\"1449\":\"MONEY\",\"1451\":\"MONEY\",\"1452\":\"MONEY\",\"1453\":\"MONEY\",\"1455\":\"MONEY\",\"1456\":\"MONEY\",\"1457\":\"MONEY\",\"1459\":\"MONEY\",\"1460\":\"MONEY\",\"1461\":\"MONEY\",\"1463\":\"MONEY\",\"1464\":\"MONEY\",\"1465\":\"MONEY\",\"1467\":\"MONEY\",\"1468\":\"MONEY\",\"1469\":\"MONEY\",\"1471\":\"MONEY\",\"1472\":\"MONEY\",\"1473\":\"MONEY\",\"1475\":\"MONEY\",\"1476\":\"MONEY\",\"1477\":\"MONEY\",\"1479\":\"MONEY\",\"1480\":\"MONEY\",\"1481\":\"MONEY\",\"1483\":\"MONEY\",\"1484\":\"MONEY\",\"1485\":\"MONEY\",\"1487\":\"MONEY\",\"1488\":\"MONEY\",\"1489\":\"MONEY\",\"1491\":\"MONEY\",\"1492\":\"MONEY\",\"1493\":\"MONEY\",\"1495\":\"MONEY\",\"1496\":\"MONEY\",\"1497\":\"MONEY\",\"1499\":\"MONEY\",\"1500\":\"MONEY\",\"1501\":\"MONEY\",\"1503\":\"MONEY\",\"1504\":\"MONEY\",\"1505\":\"MONEY\",\"1507\":\"MONEY\",\"1508\":\"MONEY\",\"1509\":\"MONEY\",\"1511\":\"MONEY\",\"1512\":\"MONEY\",\"1513\":\"MONEY\",\"1514\":\"ORDINAL\",\"1515\":\"CARDINAL\",\"1516\":\"CARDINAL\",\"1517\":\"TIME\",\"1518\":\"DATE\",\"1519\":\"DURATION\",\"1520\":\"DURATION\",\"1521\":\"DURATION\",\"1522\":\"DURATION\",\"1523\":\"DURATION\",\"1524\":\"DURATION\",\"1525\":\"DURATION\",\"1526\":\"DURATION\",\"1527\":\"DURATION\",\"1528\":\"DURATION\",\"1529\":\"DURATION\",\"1530\":\"EMAIL\",\"1531\":\"EMOJI\",\"1532\":\"EMOTICON\",\"1533\":\"HASHTAG\",\"1534\":\"MENTION\",\"1535\":\"URL\"},{\"1339\":[0,1],\"1340\":[0,1],\"1341\":[0,1],\"1342\":[0,1],\"1343\":[0,1],\"1345\":[1,0],\"1347\":[1,0]},{}]"]
},{}],16:[function(require,module,exports){
},{}],17:[function(require,module,exports){
},{}],18:[function(require,module,exports){
module.exports=["[100,89,{\"0\":{\"2\":87,\"1080001\":7,\"1080002\":1,\"1080007\":42,\"2070003\":0},\"1\":{\"2\":75,\"1080002\":39,\"1080003\":2,\"1080004\":21,\"1080005\":24,\"2070003\":88},\"2\":{\"2\":51,\"1080001\":5,\"1080002\":3,\"1080003\":33,\"1080004\":13,\"1080005\":15,\"2070003\":79},\"3\":{\"2\":4,\"2070003\":47},\"5\":{\"2\":6,\"2070003\":48},\"7\":{\"2\":76,\"46\":71,\"47\":72,\"84671\":73,\"84672\":74,\"1080001\":69,\"1080003\":8,\"1080004\":27,\"1080005\":30,\"2070003\":89},\"8\":{\"2\":54,\"1080001\":11,\"1080002\":9,\"1080003\":36,\"1080004\":17,\"1080005\":19,\"2070003\":82},\"9\":{\"2\":10,\"2070003\":49},\"11\":{\"2\":12,\"2070003\":50},\"13\":{\"2\":14,\"2070003\":57},\"15\":{\"2\":16,\"2070003\":58},\"17\":{\"2\":18,\"2070003\":59},\"19\":{\"2\":20,\"2070003\":60},\"21\":{\"2\":52,\"1080003\":22,\"2070003\":80},\"22\":{\"2\":23,\"2070003\":61},\"24\":{\"2\":53,\"1080003\":25,\"2070003\":81},\"25\":{\"2\":35,\"2070003\":62},\"27\":{\"2\":55,\"1080003\":28,\"2070003\":83},\"28\":{\"2\":29,\"2070003\":63},\"30\":{\"2\":56,\"1080003\":31,\"2070003\":84},\"31\":{\"2\":38,\"2070003\":64},\"33\":{\"2\":34,\"2070003\":65},\"36\":{\"2\":37,\"2070003\":66},\"39\":{\"2\":67,\"1080002\":40,\"2070003\":85},\"40\":{\"2\":41,\"2070003\":68},\"42\":{\"1080009\":45,\"1080010\":43,\"2070003\":0},\"43\":{\"2\":44,\"2070003\":77},\"45\":{\"2\":46,\"2070003\":78},\"69\":{\"1080001\":70,\"2070003\":86}},{\"4\":\"SBD\",\"6\":\"SBD\",\"10\":\"SBD\",\"12\":\"SBD\",\"14\":\"SBD\",\"16\":\"SBD\",\"18\":\"SBD\",\"20\":\"SBD\",\"23\":\"SBD\",\"26\":\"SBD\",\"29\":\"SBD\",\"32\":\"SBD\",\"34\":\"SBD\",\"35\":\"SBD\",\"37\":\"SBD\",\"38\":\"SBD\",\"41\":\"SBD\",\"44\":\"SBD\",\"46\":\"SBD\",\"47\":\"SBD\",\"48\":\"SBD\",\"49\":\"SBD\",\"50\":\"SBD\",\"51\":\"SBD\",\"52\":\"SBD\",\"53\":\"SBD\",\"54\":\"SBD\",\"55\":\"SBD\",\"56\":\"SBD\",\"57\":\"SBD\",\"58\":\"SBD\",\"59\":\"SBD\",\"60\":\"SBD\",\"61\":\"SBD\",\"62\":\"SBD\",\"63\":\"SBD\",\"64\":\"SBD\",\"65\":\"SBD\",\"66\":\"SBD\",\"67\":\"SBD\",\"68\":\"SBD\",\"70\":\"0\",\"71\":\"0\",\"72\":\"0\",\"73\":\"0\",\"74\":\"0\",\"75\":\"SBD\",\"76\":\"SBD\",\"77\":\"SBD\",\"78\":\"SBD\",\"79\":\"SBD\",\"80\":\"SBD\",\"81\":\"SBD\",\"82\":\"SBD\",\"83\":\"SBD\",\"84\":\"SBD\",\"85\":\"SBD\",\"86\":\"0\",\"87\":\"SBD\",\"88\":\"SBD\",\"89\":\"SBD\"},{\"4\":[2,1],\"6\":[2,1],\"10\":[2,1],\"12\":[2,1],\"14\":[2,1],\"16\":[2,1],\"18\":[2,1],\"20\":[2,1],\"23\":[2,1],\"26\":[2,1],\"29\":[2,1],\"32\":[2,1],\"34\":[2,1],\"35\":[2,1],\"37\":[2,1],\"38\":[2,1],\"41\":[2,1],\"44\":[0,2],\"46\":[0,2],\"47\":[2,0],\"48\":[2,0],\"49\":[2,0],\"50\":[2,0],\"51\":[1,1],\"52\":[1,1],\"53\":[1,1],\"54\":[1,1],\"55\":[1,1],\"56\":[1,1],\"57\":[2,0],\"58\":[2,0],\"59\":[2,0],\"60\":[2,0],\"61\":[2,0],\"62\":[2,0],\"63\":[2,0],\"64\":[2,0],\"65\":[2,0],\"66\":[2,0],\"67\":[1,1],\"68\":[2,0],\"75\":[0,1],\"76\":[0,1],\"77\":[0,1],\"78\":[0,1],\"79\":[1,0],\"80\":[1,0],\"81\":[1,0],\"82\":[1,0],\"83\":[1,0],\"84\":[1,0],\"85\":[1,0]},{}]"]
},{}],19:[function(require,module,exports){
const adjectiveExceptions=require("./wn-adjective-exceptions.js"),nounExceptions=require("./wn-noun-exceptions.js"),verbExceptions=require("./wn-verb-exceptions.js"),lemmatizeAdjective=function(value,cache){var lemma=adjectiveExceptions[value];return lemma||((lemma=value.replace(/est$|er$/,"")).length===value.length?value:cache.hasSamePOS(lemma,"ADJ")?lemma:(lemma+="e",cache.hasSamePOS(lemma,"ADJ")?lemma:value))},lemmatizeVerb=function(value,cache){var lemma=verbExceptions[value];if(lemma)return lemma;if((lemma=value.replace(/s$/,"")).length!==value.length&&cache.hasSamePOS(lemma,"VERB"))return lemma;if((lemma=value.replace(/ies$/,"y")).length!==value.length&&cache.hasSamePOS(lemma,"VERB"))return lemma;if((lemma=value.replace(/es$|ed$|ing$/,"")).length!==value.length){if(cache.hasSamePOS(lemma,"VERB"))return lemma;if(lemma+="e",cache.hasSamePOS(lemma,"VERB"))return lemma}return value},nounRegexes=[{replace:/s$/,by:""},{replace:/ses$/,by:"s"},{replace:/xes$/,by:"x"},{replace:/zes$/,by:"s"},{replace:/ves$/,by:"f"},{replace:/ches$/,by:"ch"},{replace:/shes$/,by:"sh"},{replace:/ies$/,by:"y"}],lemmatizeNoun=function(value,cache){var lemma=nounExceptions[value];if(lemma)return lemma;lemma=value;for(let k=0;k<nounRegexes.length;k+=1)if((lemma=value.replace(nounRegexes[k].replace,nounRegexes[k].by)).length!==value.length&&cache.hasSamePOS(lemma,"NOUN"))return lemma;return value.replace(/men$/,"man")},lemmatize=function(value,pos,cache){var lemma;switch(pos){case"ADJ":lemma=lemmatizeAdjective(value,cache);break;case"NOUN":lemma=lemmatizeNoun(value,cache);break;case"VERB":lemma=lemmatizeVerb(value,cache);break;default:lemma=value}return lemma};module.exports=lemmatize;
},{"./wn-adjective-exceptions.js":41,"./wn-noun-exceptions.js":42,"./wn-verb-exceptions.js":43}],20:[function(require,module,exports){
var transformers=require("./cer-transformers.js"),machines=require("./languages/cur/models/eng-cer-meta-model.json"),loadNERModel=function(){return{machines:machines=JSON.stringify(machines),transformers:transformers}};module.exports=loadNERModel;
},{"./cer-transformers.js":9,"./languages/cur/models/eng-cer-meta-model.json":12}],21:[function(require,module,exports){
var readModel=require("./read-core-model.js"),loadModel=function(){var model=readModel();model.packing.efList=[];for(const f in model.packing.layout)0===model.packing.layout[f][3]&&(model.features[f].intrinsicSize=model.features[f].list.length,model.features[f].index=model.features[f].list.length,model.features[f].maxIndex=model.packing.layout[f][1]>>>model.packing.layout[f][2]),1===model.packing.layout[f][4]&&model.packing.efList.push(f);return model.features.lexeme.intrinsicSize=model.features.lexeme.list.length,model.features.lexeme.index=model.features.lexeme.list.length,model};module.exports=loadModel;
},{"./read-core-model.js":34}],22:[function(require,module,exports){
var setter=require("./negation-setter.js"),machines=require("./languages/cur/models/eng-negation-model.json"),loadNERModel=function(){return{machines:machines,setter:setter}};module.exports=loadNERModel;
},{"./languages/cur/models/eng-negation-model.json":14,"./negation-setter.js":28}],23:[function(require,module,exports){
var transformers=require("./ner-transformers.js"),machines=require("./languages/cur/models/eng-ner-model.json"),loadNERModel=function(){return{machines:machines,transformers:transformers}};module.exports=loadNERModel;
},{"./languages/cur/models/eng-ner-model.json":15,"./ner-transformers.js":29}],24:[function(require,module,exports){
var transformers=require("./pos-transformers.js"),setter=require("./pos-setter.js"),updater=require("./pos-updater.js"),machines=require("./languages/cur/models/eng-pos-model.json"),loadNERModel=function(){return{machines:machines,setter:setter,updater:updater,transformers:transformers}};module.exports=loadNERModel;
},{"./languages/cur/models/eng-pos-model.json":16,"./pos-setter.js":31,"./pos-transformers.js":32,"./pos-updater.js":33}],25:[function(require,module,exports){
var setter=require("./sa-setter.js"),machines=require("./languages/cur/models/eng-sa-model.json"),loadSAModel=function(){return{machines:machines,setter:setter}};module.exports=loadSAModel;
},{"./languages/cur/models/eng-sa-model.json":17,"./sa-setter.js":36}],26:[function(require,module,exports){
var transformers=require("./sbd-transformers.js"),setter=require("./sbd-setter.js"),machines=require("./languages/cur/models/eng-sbd-model.json"),loadNERModel=function(){return{machines:machines,setter:setter,transformers:transformers}};module.exports=loadNERModel;
},{"./languages/cur/models/eng-sbd-model.json":18,"./sbd-setter.js":37,"./sbd-transformers.js":38}],27:[function(require,module,exports){
},{"./feature.js":11,"./lemmatize.js":19,"./load-cer-meta-model.js":20,"./load-core-model.js":21,"./load-negation-model.js":22,"./load-ner-model.js":23,"./load-pos-model.js":24,"./load-sa-model.js":25,"./load-sbd-model.js":26,"./porter-stemmer.js":30,"./readability-stats.js":35}],28:[function(require,module,exports){
},{}],29:[function(require,module,exports){
},{}],30:[function(require,module,exports){
},{}],31:[function(require,module,exports){
//
//
//