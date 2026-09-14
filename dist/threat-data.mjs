// Built by scripts/build.mjs. Do not edit. Source lives in src/.
import { createRequire as bundledRequire } from 'node:module';
const require = bundledRequire(import.meta.url);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/pend/index.js
var require_pend = __commonJS({
  "node_modules/pend/index.js"(exports, module) {
    module.exports = Pend;
    function Pend() {
      this.pending = 0;
      this.max = Infinity;
      this.listeners = [];
      this.waiting = [];
      this.error = null;
    }
    Pend.prototype.go = function(fn) {
      if (this.pending < this.max) {
        pendGo(this, fn);
      } else {
        this.waiting.push(fn);
      }
    };
    Pend.prototype.wait = function(cb) {
      if (this.pending === 0) {
        cb(this.error);
      } else {
        this.listeners.push(cb);
      }
    };
    Pend.prototype.hold = function() {
      return pendHold(this);
    };
    function pendHold(self) {
      self.pending += 1;
      var called = false;
      return onCb;
      function onCb(err) {
        if (called) throw new Error("callback called twice");
        called = true;
        self.error = self.error || err;
        self.pending -= 1;
        if (self.waiting.length > 0 && self.pending < self.max) {
          pendGo(self, self.waiting.shift());
        } else if (self.pending === 0) {
          var listeners = self.listeners;
          self.listeners = [];
          listeners.forEach(cbListener);
        }
      }
      function cbListener(listener) {
        listener(self.error);
      }
    }
    function pendGo(self, fn) {
      fn(pendHold(self));
    }
  }
});

// node_modules/yauzl/fd-slicer.js
var require_fd_slicer = __commonJS({
  "node_modules/yauzl/fd-slicer.js"(exports) {
    var fs6 = __require("fs");
    var util = __require("util");
    var stream = __require("stream");
    var Readable2 = stream.Readable;
    var PassThrough = stream.PassThrough;
    var Pend = require_pend();
    var EventEmitter = __require("events").EventEmitter;
    exports.BufferSlicer = BufferSlicer;
    exports.FdSlicer = FdSlicer;
    util.inherits(FdSlicer, EventEmitter);
    function FdSlicer(fd) {
      EventEmitter.call(this);
      this.fd = fd;
      this.pend = new Pend();
      this.pend.max = 1;
      this.refCount = 0;
    }
    FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      var self = this;
      self.pend.go(function(cb) {
        fs6.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
          cb();
          callback(err, bytesRead, buffer2);
        });
      });
    };
    FdSlicer.prototype.createReadStream = function(options2) {
      return new ReadStream(this, options2);
    };
    FdSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    FdSlicer.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount < 0) throw new Error("invalid unref");
      if (self.refCount > 0) return;
      fs6.close(self.fd, onCloseDone);
      function onCloseDone(err) {
        if (err) {
          self.emit("error", err);
        } else {
          self.emit("close");
        }
      }
    };
    util.inherits(ReadStream, Readable2);
    function ReadStream(context, options2) {
      options2 = options2 || {};
      Readable2.call(this, options2);
      this.context = context;
      this.context.ref();
      this.start = options2.start || 0;
      this.endOffset = options2.end;
      this.pos = this.start;
    }
    ReadStream.prototype._read = function(n) {
      var self = this;
      var toRead = Math.min(self._readableState.highWaterMark, n);
      if (self.endOffset != null) {
        toRead = Math.min(toRead, self.endOffset - self.pos);
      }
      if (toRead <= 0) {
        self.push(null);
        this._cleanup();
        return;
      }
      self.context.pend.go(function(cb) {
        var buffer = Buffer.allocUnsafe(toRead);
        fs6.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
          if (err) {
            self.destroy(err);
          } else if (bytesRead === 0) {
            self.push(null);
            self._cleanup();
          } else {
            self.pos += bytesRead;
            self.push(buffer.slice(0, bytesRead));
          }
          cb();
        });
      });
    };
    ReadStream.prototype._destroy = function(err, cb) {
      this._cleanup();
      cb(err);
    };
    ReadStream.prototype._cleanup = function() {
      if (this.context != null) {
        this.context.unref();
        this.context = null;
      }
    };
    util.inherits(BufferSlicer, EventEmitter);
    function BufferSlicer(buffer) {
      EventEmitter.call(this);
      this.refCount = 0;
      this.buffer = buffer;
    }
    BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      if (!(0 <= offset && offset <= buffer.length)) throw new RangeError("offset outside buffer: 0 <= " + offset + " <= " + buffer.length);
      if (position < 0) throw new RangeError("position is negative: " + position);
      if (offset + length > buffer.length) {
        length = buffer.length - offset;
      }
      if (position + length > this.buffer.length) {
        length = this.buffer.length - position;
      }
      if (length <= 0) {
        setImmediate(function() {
          callback(null, 0);
        });
        return;
      }
      this.buffer.copy(buffer, offset, position, position + length);
      setImmediate(function() {
        callback(null, length);
      });
    };
    BufferSlicer.prototype.createReadStream = function(options2) {
      options2 = options2 || {};
      var readStream = new PassThrough(options2);
      readStream.start = options2.start || 0;
      readStream.endOffset = options2.end;
      readStream.pos = readStream.endOffset || this.buffer.length;
      var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
      var maxChunkSize = 65536;
      var offset = 0;
      while (true) {
        var nextOffset = offset + maxChunkSize;
        if (nextOffset >= entireSlice.length) {
          if (offset < entireSlice.length) {
            readStream.write(entireSlice.slice(offset, entireSlice.length));
          }
          break;
        }
        readStream.write(entireSlice.slice(offset, nextOffset));
        offset = nextOffset;
      }
      readStream.end();
      return readStream;
    };
    BufferSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    BufferSlicer.prototype.unref = function() {
      this.refCount -= 1;
      if (this.refCount < 0) {
        throw new Error("invalid unref");
      }
    };
  }
});

// node_modules/yauzl/crc32.js
var require_crc32 = __commonJS({
  "node_modules/yauzl/crc32.js"(exports, module) {
    var CRC_TABLE = new Int32Array([
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ]);
    function crc32(buf) {
      let crc = -1;
      for (let x of buf) {
        crc = CRC_TABLE[(crc ^ x) & 255] ^ crc >>> 8;
      }
      return (crc ^ -1) >>> 0;
    }
    module.exports = crc32;
  }
});

// node_modules/yauzl/index.js
var require_yauzl = __commonJS({
  "node_modules/yauzl/index.js"(exports) {
    var fs6 = __require("fs");
    var zlib = __require("zlib");
    var fd_slicer = require_fd_slicer();
    var util = __require("util");
    var EventEmitter = __require("events").EventEmitter;
    var Transform2 = __require("stream").Transform;
    var PassThrough = __require("stream").PassThrough;
    var Writable = __require("stream").Writable;
    var crc32 = typeof zlib.crc32 === "function" ? zlib.crc32 : require_crc32();
    exports.open = open;
    exports.fromFd = fromFd;
    exports.fromBuffer = fromBuffer;
    exports.fromRandomAccessReader = fromRandomAccessReader;
    exports.openPromise = openPromise;
    exports.fromFdPromise = fromFdPromise;
    exports.fromBufferPromise = fromBufferPromise;
    exports.fromRandomAccessReaderPromise = fromRandomAccessReaderPromise;
    exports.dosDateTimeToDate = dosDateTimeToDate;
    exports.getFileNameLowLevel = getFileNameLowLevel;
    exports.validateFileName = validateFileName;
    exports.parseExtraFields = parseExtraFields;
    exports.ZipFile = ZipFile;
    exports.Entry = Entry;
    exports.LocalFileHeader = LocalFileHeader;
    exports.RandomAccessReader = RandomAccessReader;
    function openPromise(path7, options2) {
      return new Promise((resolve, reject) => {
        open(path7, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve(zipfile);
        });
      });
    }
    function fromFdPromise(fd, options2) {
      return new Promise((resolve, reject) => {
        fromFd(fd, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve(zipfile);
        });
      });
    }
    function fromBufferPromise(buffer, options2) {
      return new Promise((resolve, reject) => {
        fromBuffer(buffer, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve(zipfile);
        });
      });
    }
    function fromRandomAccessReaderPromise(reader, totalSize, options2) {
      return new Promise((resolve, reject) => {
        fromRandomAccessReader(reader, totalSize, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve(zipfile);
        });
      });
    }
    function open(path7, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs6.open(path7, "r", function(err, fd) {
        if (err) return callback(err);
        fromFd(fd, options2, function(err2, zipfile) {
          if (err2) fs6.close(fd, defaultCallback);
          callback(err2, zipfile);
        });
      });
    }
    function fromFd(fd, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs6.fstat(fd, function(err, stats) {
        if (err) return callback(err);
        var reader = new fd_slicer.FdSlicer(fd);
        fromRandomAccessReader(reader, stats.size, options2, callback);
      });
    }
    function fromBuffer(buffer, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      var reader = new fd_slicer.BufferSlicer(buffer);
      fromRandomAccessReader(reader, buffer.length, options2, callback);
    }
    function fromRandomAccessReader(reader, totalSize, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      var decodeStrings = !!options2.decodeStrings;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
      if (totalSize > Number.MAX_SAFE_INTEGER) {
        throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
      }
      reader.ref();
      var eocdrWithoutCommentSize = 22;
      var zip64EocdlSize = 20;
      var maxCommentSize = 65535;
      var bufferSize = Math.min(zip64EocdlSize + eocdrWithoutCommentSize + maxCommentSize, totalSize);
      var buffer = newBuffer(bufferSize);
      var bufferReadStart = totalSize - buffer.length;
      readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
        if (err) return callback(err);
        for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
          if (buffer.readUInt32LE(i) !== 101010256) continue;
          var eocdrBuffer = buffer.subarray(i);
          var diskNumber = eocdrBuffer.readUInt16LE(4);
          var entryCount = eocdrBuffer.readUInt16LE(10);
          var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
          var commentLength = eocdrBuffer.readUInt16LE(20);
          var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
          if (commentLength !== expectedCommentLength) {
            return callback(new Error("Invalid comment length. Expected: " + expectedCommentLength + ". Found: " + commentLength + ". Are there extra bytes at the end of the file? Or is the end of central dir signature `PK\u263A\u263B` in the comment?"));
          }
          var comment = decodeStrings ? decodeBuffer(eocdrBuffer.subarray(22), false) : eocdrBuffer.subarray(22);
          if (i - zip64EocdlSize >= 0 && buffer.readUInt32LE(i - zip64EocdlSize) === 117853008) {
            var zip64EocdlBuffer = buffer.subarray(i - zip64EocdlSize, i - zip64EocdlSize + zip64EocdlSize);
            var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
            var zip64EocdrBuffer = newBuffer(56);
            return readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err2) {
              if (err2) return callback(err2);
              if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
                return callback(new Error("invalid zip64 end of central directory record signature"));
              }
              diskNumber = zip64EocdrBuffer.readUInt32LE(16);
              if (diskNumber !== 0) {
                return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
              }
              entryCount = readUInt64LE(zip64EocdrBuffer, 32);
              centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
              return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
            });
          }
          if (diskNumber !== 0) {
            return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
          }
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
        }
        callback(new Error("End of central directory record signature not found. Either not a zip file, or file is truncated."));
      });
    }
    util.inherits(ZipFile, EventEmitter);
    function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
      var self = this;
      EventEmitter.call(self);
      self.reader = reader;
      self.reader.on("error", function(err) {
        emitError(self, err);
      });
      self.reader.once("close", function() {
        self.emit("close");
      });
      self.readEntryCursor = centralDirectoryOffset;
      self.fileSize = fileSize;
      self.entryCount = entryCount;
      self.comment = comment;
      self.entriesRead = 0;
      self.autoClose = !!autoClose;
      self.lazyEntries = !!lazyEntries;
      self.decodeStrings = !!decodeStrings;
      self.validateEntrySizes = !!validateEntrySizes;
      self.strictFileNames = !!strictFileNames;
      self.isOpen = true;
      self.emittedError = false;
      self.hasEachEntryBeenCalled = false;
      if (!self.lazyEntries) self._readEntry();
    }
    ZipFile.prototype.close = function() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.reader.unref();
    };
    function emitErrorAndAutoClose(self, err) {
      if (self.autoClose) self.close();
      emitError(self, err);
    }
    function emitError(self, err) {
      if (self.emittedError) return;
      self.emittedError = true;
      self.emit("error", err);
    }
    ZipFile.prototype.readEntry = function() {
      if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
      this._readEntry();
    };
    ZipFile.prototype._readEntry = function() {
      var self = this;
      if (self.entryCount === self.entriesRead) {
        setImmediate(function() {
          if (self.autoClose) self.close();
          if (self.emittedError) return;
          self.emit("end");
        });
        return;
      }
      if (self.emittedError) return;
      var buffer = newBuffer(46);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err) {
        if (err) return emitErrorAndAutoClose(self, err);
        if (self.emittedError) return;
        var entry = new Entry();
        var signature = buffer.readUInt32LE(0);
        if (signature !== 33639248) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
        entry.versionMadeBy = buffer.readUInt16LE(4);
        entry.versionNeededToExtract = buffer.readUInt16LE(6);
        entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
        entry.compressionMethod = buffer.readUInt16LE(10);
        entry.lastModFileTime = buffer.readUInt16LE(12);
        entry.lastModFileDate = buffer.readUInt16LE(14);
        entry.crc32 = buffer.readUInt32LE(16);
        entry.compressedSize = buffer.readUInt32LE(20);
        entry.uncompressedSize = buffer.readUInt32LE(24);
        entry.fileNameLength = buffer.readUInt16LE(28);
        entry.extraFieldLength = buffer.readUInt16LE(30);
        entry.fileCommentLength = buffer.readUInt16LE(32);
        entry.internalFileAttributes = buffer.readUInt16LE(36);
        entry.externalFileAttributes = buffer.readUInt32LE(38);
        entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
        if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));
        self.readEntryCursor += 46;
        buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
        readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err2) {
          if (err2) return emitErrorAndAutoClose(self, err2);
          if (self.emittedError) return;
          entry.fileNameRaw = buffer.subarray(0, entry.fileNameLength);
          var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
          entry.extraFieldRaw = buffer.subarray(entry.fileNameLength, fileCommentStart);
          entry.fileCommentRaw = buffer.subarray(fileCommentStart, fileCommentStart + entry.fileCommentLength);
          try {
            entry.extraFields = parseExtraFields(entry.extraFieldRaw);
          } catch (err3) {
            return emitErrorAndAutoClose(self, err3);
          }
          if (self.decodeStrings) {
            var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
            entry.fileComment = decodeBuffer(entry.fileCommentRaw, isUtf8);
            entry.fileName = getFileNameLowLevel(entry.generalPurposeBitFlag, entry.fileNameRaw, entry.extraFields, self.strictFileNames);
            var errorMessage = validateFileName(entry.fileName);
            if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
          } else {
            entry.fileComment = entry.fileCommentRaw;
            entry.fileName = entry.fileNameRaw;
          }
          entry.comment = entry.fileComment;
          self.readEntryCursor += buffer.length;
          self.entriesRead += 1;
          for (var i = 0; i < entry.extraFields.length; i++) {
            var extraField = entry.extraFields[i];
            if (extraField.id !== 1) continue;
            var zip64EiefBuffer = extraField.data;
            var index = 0;
            if (entry.uncompressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
              }
              entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.compressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
              }
              entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.relativeOffsetOfLocalHeader === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
              }
              entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            break;
          }
          if (self.validateEntrySizes && entry.compressionMethod === 0) {
            var expectedCompressedSize = entry.uncompressedSize;
            if (entry.isEncrypted()) {
              expectedCompressedSize += 12;
            }
            if (entry.compressedSize !== expectedCompressedSize) {
              var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
              return emitErrorAndAutoClose(self, new Error(msg));
            }
          }
          self.emit("entry", entry);
          if (!self.lazyEntries) self._readEntry();
        });
      });
    };
    ZipFile.prototype.eachEntry = function() {
      const self = this;
      if (!self.lazyEntries) throw new Error("eachEntry() requires lazyEntries: true");
      if (self.hasEachEntryBeenCalled) throw new Error("eachEntry() must only be called once per ZipFile");
      self.hasEachEntryBeenCalled = true;
      let pendingResolveReject = null;
      self.on("entry", onEntry);
      self.on("end", onEnd);
      self.on("error", onError);
      function cleanup() {
        self.removeListener("entry", onEntry);
        self.removeListener("end", onEnd);
        self.removeListener("error", onError);
        if (self.autoClose) self.close();
      }
      function onEntry(entry) {
        let { resolve } = pendingResolveReject;
        pendingResolveReject = null;
        resolve({ value: entry });
      }
      function onEnd() {
        let { resolve } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        resolve({ done: true });
      }
      function onError(err) {
        let { reject } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        reject(err);
      }
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        next() {
          const promise = new Promise((resolve, reject) => {
            if (pendingResolveReject != null) throw new Error("next() called before previous Promise was resolved.");
            pendingResolveReject = { resolve, reject };
          });
          self.readEntry();
          return promise;
        },
        return(value) {
          cleanup();
          return Promise.resolve({ done: true, value });
        },
        throw(value) {
          cleanup();
          return Promise.reject(value);
        }
      };
    };
    ZipFile.prototype.openReadStream = function(entry, options2, callback) {
      var self = this;
      var relativeStart = 0;
      var relativeEnd = entry.compressedSize;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) {
        options2 = {};
      } else {
        if (options2.decodeFileData === false) {
          if (options2.decrypt != null) {
            throw new Error("cannot use options.decrypt when options.decodeFileData === false");
          }
          if (options2.decompress != null) {
            throw new Error("cannot use options.decompress when options.decodeFileData === false");
          }
        } else {
          if (options2.decrypt != null) {
            if (!entry.isEncrypted()) {
              throw new Error("options.decrypt can only be specified for encrypted entries. See also option decodeFileData.");
            }
            if (options2.decrypt !== false) throw new Error("invalid options.decrypt value: " + options2.decrypt);
            if (entry.isCompressed()) {
              if (options2.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false. See also option decodeFileData.");
            }
          }
          if (options2.decompress != null) {
            if (!entry.isCompressed()) {
              throw new Error("options.decompress can only be specified for compressed entries. See also option decodeFileData.");
            }
            if (!(options2.decompress === false || options2.decompress === true)) {
              throw new Error("invalid options.decompress value: " + options2.decompress);
            }
            decompress = options2.decompress;
          }
        }
        if (options2.start != null) {
          relativeStart = options2.start;
          if (relativeStart < 0) throw new Error("options.start < 0");
          if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
        }
        if (options2.end != null) {
          relativeEnd = options2.end;
          if (relativeEnd < 0) throw new Error("options.end < 0");
          if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
          if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
        }
      }
      var rawMode = options2.decodeFileData === false || // Explicitly requested raw.
      (entry.compressionMethod === 0 || // Naturally without compression.
      entry.compressionMethod === 8 && options2.decompress === false) && (!entry.isEncrypted() || // Naturally without encryption.
      options2.decrypt === false);
      if (options2.start != null || options2.end != null) {
        if (!rawMode) throw new Error("start/end range require options.decodeFileData === false for non-trivial encoded entries.");
      }
      if (!self.isOpen) return callback(new Error("closed"));
      if (entry.isEncrypted() && !rawMode) {
        if (options2.decrypt !== false) return callback(new Error("entry is encrypted, and options.decodeFileData !== false"));
      }
      var decompress;
      if (rawMode) {
        decompress = false;
      } else if (entry.compressionMethod === 8) {
        decompress = options2.decodeFileData !== true;
      } else {
        return callback(new Error("unsupported compression method: " + entry.compressionMethod));
      }
      self.readLocalFileHeader(entry, { minimal: true }, function(err, localFileHeader) {
        if (err) return callback(err);
        self.openReadStreamLowLevel(
          localFileHeader.fileDataStart,
          entry.compressedSize,
          relativeStart,
          relativeEnd,
          decompress,
          entry.uncompressedSize,
          callback
        );
      });
    };
    ZipFile.prototype.openReadStreamLowLevel = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, callback) {
      var self = this;
      var fileDataEnd = fileDataStart + compressedSize;
      var readStream = self.reader.createReadStream({
        start: fileDataStart + relativeStart,
        end: fileDataStart + relativeEnd
      });
      var endpointStream = readStream;
      if (decompress) {
        var destroyed = false;
        var inflateFilter = zlib.createInflateRaw();
        readStream.on("error", function(err) {
          setImmediate(function() {
            if (!destroyed) inflateFilter.emit("error", err);
          });
        });
        readStream.pipe(inflateFilter);
        if (self.validateEntrySizes) {
          endpointStream = new AssertByteCountStream(uncompressedSize);
          inflateFilter.on("error", function(err) {
            setImmediate(function() {
              if (!destroyed) endpointStream.emit("error", err);
            });
          });
          inflateFilter.pipe(endpointStream);
        } else {
          endpointStream = inflateFilter;
        }
        installDestroyFn(endpointStream, function() {
          destroyed = true;
          if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
          readStream.unpipe(inflateFilter);
          readStream.destroy();
        });
      }
      callback(null, endpointStream);
    };
    ZipFile.prototype.readLocalFileHeader = function(entry, options2, callback) {
      var self = this;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      self.reader.ref();
      var buffer = newBuffer(30);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
        try {
          if (err) return callback(err);
          var signature = buffer.readUInt32LE(0);
          if (signature !== 67324752) {
            return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
          }
          var fileNameLength = buffer.readUInt16LE(26);
          var extraFieldLength = buffer.readUInt16LE(28);
          var fileDataStart = entry.relativeOffsetOfLocalHeader + 30 + fileNameLength + extraFieldLength;
          if (fileDataStart + entry.compressedSize > self.fileSize) {
            return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
          }
          if (options2.minimal) {
            return callback(null, { fileDataStart });
          }
          var localFileHeader = new LocalFileHeader();
          localFileHeader.fileDataStart = fileDataStart;
          localFileHeader.versionNeededToExtract = buffer.readUInt16LE(4);
          localFileHeader.generalPurposeBitFlag = buffer.readUInt16LE(6);
          localFileHeader.compressionMethod = buffer.readUInt16LE(8);
          localFileHeader.lastModFileTime = buffer.readUInt16LE(10);
          localFileHeader.lastModFileDate = buffer.readUInt16LE(12);
          localFileHeader.crc32 = buffer.readUInt32LE(14);
          localFileHeader.compressedSize = buffer.readUInt32LE(18);
          localFileHeader.uncompressedSize = buffer.readUInt32LE(22);
          localFileHeader.fileNameLength = fileNameLength;
          localFileHeader.extraFieldLength = extraFieldLength;
          buffer = newBuffer(fileNameLength + extraFieldLength);
          self.reader.ref();
          readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader + 30, function(err2) {
            try {
              if (err2) return callback(err2);
              localFileHeader.fileName = buffer.subarray(0, fileNameLength);
              localFileHeader.extraField = buffer.subarray(fileNameLength);
              return callback(null, localFileHeader);
            } finally {
              self.reader.unref();
            }
          });
        } finally {
          self.reader.unref();
        }
      });
    };
    ZipFile.prototype.openReadStreamPromise = function(entry, options2) {
      return new Promise((resolve, reject) => {
        this.openReadStream(entry, options2, function(err, readStream) {
          if (err) return reject(err);
          resolve(readStream);
        });
      });
    };
    ZipFile.prototype.openReadStreamLowLevelPromise = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize) {
      return new Promise((resolve, reject) => {
        this.openReadStream(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, function(err, readStream) {
          if (err) return reject(err);
          resolve(readStream);
        });
      });
    };
    ZipFile.prototype.readLocalFileHeaderPromise = function(entry, options2) {
      return new Promise((resolve, reject) => {
        this.readLocalFileHeader(entry, options2, function(err, localFileHeader) {
          if (err) return reject(err);
          resolve(localFileHeader);
        });
      });
    };
    function Entry() {
    }
    Entry.prototype.getLastModDate = function(options2) {
      if (options2 == null) options2 = {};
      if (!options2.forceDosFormat) {
        for (var i = 0; i < this.extraFields.length; i++) {
          var extraField = this.extraFields[i];
          if (extraField.id === 21589) {
            var data = extraField.data;
            if (data.length < 5) continue;
            var flags = data[0];
            var HAS_MTIME = 1;
            if (!(flags & HAS_MTIME)) continue;
            var posixTimestamp = data.readInt32LE(1);
            return new Date(posixTimestamp * 1e3);
          } else if (extraField.id === 10) {
            var data = extraField.data;
            if (data.length !== 32) continue;
            if (data.readUInt16LE(4) !== 1) continue;
            if (data.readUInt16LE(6) !== 24) continue;
            var hundredNanoSecondsSince1601 = data.readUInt32LE(8) + 4294967296 * data.readInt32LE(12);
            var millisecondsSince1970 = hundredNanoSecondsSince1601 / 1e4 - 116444736e5;
            return new Date(millisecondsSince1970);
          }
        }
      }
      return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime, options2.timezone);
    };
    Entry.prototype.canDecodeFileData = function() {
      return !this.isEncrypted() && (this.compressionMethod === 0 || this.compressionMethod === 8);
    };
    Entry.prototype.isEncrypted = function() {
      return (this.generalPurposeBitFlag & 1) !== 0;
    };
    Entry.prototype.isCompressed = function() {
      return this.compressionMethod === 8;
    };
    function LocalFileHeader() {
    }
    function dosDateTimeToDate(date, time, timezone) {
      var day = date & 31;
      var month = (date >> 5 & 15) - 1;
      var year = (date >> 9 & 127) + 1980;
      var millisecond = 0;
      var second = (time & 31) * 2;
      var minute = time >> 5 & 63;
      var hour = time >> 11 & 31;
      if (timezone == null || timezone === "local") {
        return new Date(year, month, day, hour, minute, second, millisecond);
      } else if (timezone === "UTC") {
        return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
      } else {
        throw new Error("unrecognized options.timezone: " + options.timezone);
      }
    }
    function getFileNameLowLevel(generalPurposeBitFlag, fileNameBuffer, extraFields, strictFileNames) {
      var fileName = null;
      for (var i = 0; i < extraFields.length; i++) {
        var extraField = extraFields[i];
        if (extraField.id === 28789) {
          if (extraField.data.length < 6) {
            continue;
          }
          if (extraField.data.readUInt8(0) !== 1) {
            continue;
          }
          var oldNameCrc32 = extraField.data.readUInt32LE(1);
          if (crc32(fileNameBuffer) !== oldNameCrc32) {
            continue;
          }
          fileName = decodeBuffer(extraField.data.subarray(5), true);
          break;
        }
      }
      if (fileName == null) {
        var isUtf8 = (generalPurposeBitFlag & 2048) !== 0;
        fileName = decodeBuffer(fileNameBuffer, isUtf8);
      }
      if (!strictFileNames) {
        fileName = fileName.replace(/\\/g, "/");
      }
      return fileName;
    }
    function validateFileName(fileName) {
      if (fileName.indexOf("\\") !== -1) {
        return "invalid characters in fileName: " + fileName;
      }
      if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
        return "absolute path: " + fileName;
      }
      if (fileName.split("/").indexOf("..") !== -1) {
        return "invalid relative path: " + fileName;
      }
      return null;
    }
    function parseExtraFields(extraFieldBuffer) {
      var extraFields = [];
      var i = 0;
      while (i < extraFieldBuffer.length - 3) {
        var headerId = extraFieldBuffer.readUInt16LE(i + 0);
        var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
        var dataStart = i + 4;
        var dataEnd = dataStart + dataSize;
        if (dataEnd > extraFieldBuffer.length) throw new Error("extra field length exceeds extra field buffer size");
        var dataBuffer = extraFieldBuffer.subarray(dataStart, dataEnd);
        extraFields.push({
          id: headerId,
          data: dataBuffer
        });
        i = dataEnd;
      }
      return extraFields;
    }
    function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
      if (length === 0) {
        return setImmediate(function() {
          callback(null, newBuffer(0));
        });
      }
      reader.read(buffer, offset, length, position, function(err, bytesRead) {
        if (err) return callback(err);
        if (bytesRead < length) {
          return callback(new Error("unexpected EOF"));
        }
        callback();
      });
    }
    util.inherits(AssertByteCountStream, Transform2);
    function AssertByteCountStream(byteCount) {
      Transform2.call(this);
      this.actualByteCount = 0;
      this.expectedByteCount = byteCount;
    }
    AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
      this.actualByteCount += chunk.length;
      if (this.actualByteCount > this.expectedByteCount) {
        var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb(null, chunk);
    };
    AssertByteCountStream.prototype._flush = function(cb) {
      if (this.actualByteCount < this.expectedByteCount) {
        var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb();
    };
    util.inherits(RandomAccessReader, EventEmitter);
    function RandomAccessReader() {
      EventEmitter.call(this);
      this.refCount = 0;
    }
    RandomAccessReader.prototype.ref = function() {
      this.refCount += 1;
    };
    RandomAccessReader.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount > 0) return;
      if (self.refCount < 0) throw new Error("invalid unref");
      self.close(onCloseDone);
      function onCloseDone(err) {
        if (err) return self.emit("error", err);
        self.emit("close");
      }
    };
    RandomAccessReader.prototype.createReadStream = function(options2) {
      if (options2 == null) options2 = {};
      var start = options2.start;
      var end = options2.end;
      if (start === end) {
        var emptyStream = new PassThrough();
        setImmediate(function() {
          emptyStream.end();
        });
        return emptyStream;
      }
      var stream = this._readStreamForRange(start, end);
      var destroyed = false;
      var refUnrefFilter = new RefUnrefFilter(this);
      stream.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) refUnrefFilter.emit("error", err);
        });
      });
      installDestroyFn(refUnrefFilter, function() {
        stream.unpipe(refUnrefFilter);
        refUnrefFilter.unref();
        stream.destroy();
      });
      var byteCounter = new AssertByteCountStream(end - start);
      refUnrefFilter.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) byteCounter.emit("error", err);
        });
      });
      installDestroyFn(byteCounter, function() {
        destroyed = true;
        refUnrefFilter.unpipe(byteCounter);
        refUnrefFilter.destroy();
      });
      return stream.pipe(refUnrefFilter).pipe(byteCounter);
    };
    RandomAccessReader.prototype._readStreamForRange = function(start, end) {
      throw new Error("not implemented");
    };
    RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
      var readStream = this.createReadStream({ start: position, end: position + length });
      var writeStream = new Writable();
      var written = 0;
      writeStream._write = function(chunk, encoding, cb) {
        chunk.copy(buffer, offset + written, 0, chunk.length);
        written += chunk.length;
        cb();
      };
      writeStream.on("finish", callback);
      readStream.on("error", function(error) {
        callback(error);
      });
      readStream.pipe(writeStream);
    };
    RandomAccessReader.prototype.close = function(callback) {
      setImmediate(callback);
    };
    util.inherits(RefUnrefFilter, PassThrough);
    function RefUnrefFilter(context) {
      PassThrough.call(this);
      this.context = context;
      this.context.ref();
      this.unreffedYet = false;
    }
    RefUnrefFilter.prototype._flush = function(cb) {
      this.unref();
      cb();
    };
    RefUnrefFilter.prototype.unref = function(cb) {
      if (this.unreffedYet) return;
      this.unreffedYet = true;
      this.context.unref();
    };
    var cp437 = "\0\u263A\u263B\u2665\u2666\u2663\u2660\u2022\u25D8\u25CB\u25D9\u2642\u2640\u266A\u266B\u263C\u25BA\u25C4\u2195\u203C\xB6\xA7\u25AC\u21A8\u2191\u2193\u2192\u2190\u221F\u2194\u25B2\u25BC !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2302\xC7\xFC\xE9\xE2\xE4\xE0\xE5\xE7\xEA\xEB\xE8\xEF\xEE\xEC\xC4\xC5\xC9\xE6\xC6\xF4\xF6\xF2\xFB\xF9\xFF\xD6\xDC\xA2\xA3\xA5\u20A7\u0192\xE1\xED\xF3\xFA\xF1\xD1\xAA\xBA\xBF\u2310\xAC\xBD\xBC\xA1\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0";
    function decodeBuffer(buffer, isUtf8) {
      if (isUtf8) {
        return buffer.toString("utf8");
      } else {
        var result = "";
        for (var i = 0; i < buffer.length; i++) {
          result += cp437[buffer[i]];
        }
        return result;
      }
    }
    function readUInt64LE(buffer, offset) {
      var lower32 = buffer.readUInt32LE(offset);
      var upper32 = buffer.readUInt32LE(offset + 4);
      return upper32 * 4294967296 + lower32;
    }
    var newBuffer;
    if (typeof Buffer.allocUnsafe === "function") {
      newBuffer = function(len) {
        return Buffer.allocUnsafe(len);
      };
    } else {
      newBuffer = function(len) {
        return new Buffer(len);
      };
    }
    function installDestroyFn(stream, fn) {
      if (typeof stream.destroy === "function") {
        stream._destroy = function(err, cb) {
          fn();
          if (cb != null) cb(err);
        };
      } else {
        stream.destroy = fn;
      }
    }
    function defaultCallback(err) {
      if (err) throw err;
    }
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args2) => console.error("SEMVER", ...args2) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options2) => {
      if (!options2) {
        return emptyOpts;
      }
      if (typeof options2 !== "object") {
        return looseOption;
      }
      return options2;
    };
    module.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version, options2) {
        options2 = parseOptions(options2);
        if (version instanceof _SemVer) {
          if (version.loose === !!options2.loose && version.includePrerelease === !!options2.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options2);
        this.options = options2;
        this.loose = !!options2.loose;
        this.includePrerelease = !!options2.includePrerelease;
        const m = version.trim().match(options2.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options2, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options2);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options2) => {
      const v = parse(version, options2);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options2) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options2);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options2, identifier, identifierBase) => {
      if (typeof options2 === "string") {
        identifierBase = identifier;
        identifier = options2;
        options2 = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options2
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options2) => {
      const parsed = parse(version, options2);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options2) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options2 = options2 || {};
      let match = null;
      if (!options2.rtl) {
        match = version.match(options2.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options2.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options2.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options2.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options2);
    };
    module.exports = coerce;
  }
});

// node_modules/semver/functions/truncate.js
var require_truncate = __commonJS({
  "node_modules/semver/functions/truncate.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = (version, truncation, options2) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version, options2);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    };
    var cloneInputVersion = (version, options2) => {
      const versionStringToParse = version instanceof SemVer ? version.version : version;
      return parse(versionStringToParse, options2);
    };
    var doTruncation = (version, truncation) => {
      if (isPrerelease(truncation)) {
        return version.version;
      }
      version.prerelease = [];
      switch (truncation) {
        case "major":
          version.minor = 0;
          version.patch = 0;
          break;
        case "minor":
          version.patch = 0;
          break;
      }
      return version.format();
    };
    var isPrerelease = (type) => {
      return type.startsWith("pre");
    };
    module.exports = truncate;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options2) {
        options2 = parseOptions(options2);
        if (range instanceof _Range) {
          if (range.loose === !!options2.loose && range.includePrerelease === !!options2.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options2);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options2;
        this.loose = !!options2.loose;
        this.includePrerelease = !!options2.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options2) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options2) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options2) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options2);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options2) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options2);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options2) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options2);
      comp = replaceCarets(comp, options2);
      debug("caret", comp);
      comp = replaceTildes(comp, options2);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options2);
      debug("xrange", comp);
      comp = replaceStars(comp, options2);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options2) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options2)).join(" ");
    };
    var replaceTilde = (comp, options2) => {
      const r = options2.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options2.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options2) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options2)).join(" ");
    };
    var replaceCaret = (comp, options2) => {
      debug("caret", comp, options2);
      const r = options2.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options2.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options2) => {
      debug("replaceXRanges", comp, options2);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options2)).join(" ");
    };
    var replaceXRange = (comp, options2) => {
      comp = comp.trim();
      const r = options2.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options2.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options2) => {
      debug("replaceStars", comp, options2);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options2) => {
      debug("replaceGTE0", comp, options2);
      return comp.trim().replace(re[options2.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options2) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options2.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options2) {
        options2 = parseOptions(options2);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options2.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options2);
        this.options = options2;
        this.loose = !!options2.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options2) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options2).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options2).test(comp.semver);
        }
        options2 = parseOptions(options2);
        if (options2.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options2.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options2) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options2) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options2) => {
      try {
        range = new Range(range, options2);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options2) => new Range(range, options2).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options2) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options2);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options2);
          }
        }
      });
      return max;
    };
    module.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options2) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options2);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options2);
          }
        }
      });
      return min;
    };
    module.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options2) => {
      try {
        return new Range(range, options2).range || "*";
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options2) => {
      version = new SemVer(version, options2);
      range = new Range(range, options2);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options2)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options2)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options2)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options2) => outside(version, range, ">", options2);
    module.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options2) => outside(version, range, "<", options2);
    module.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options2) => {
      r1 = new Range(r1, options2);
      r2 = new Range(r2, options2);
      return r1.intersects(r2, options2);
    };
    module.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module.exports = (versions, range, options2) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options2));
      for (const version of v) {
        const included = satisfies(version, range, options2);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options2 = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options2);
      dom = new Range(dom, options2);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options2);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options2) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options2.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options2.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options2);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options2);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options2);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options2)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options2)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options2)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options2.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options2.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options2);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !c.test(gt.semver)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options2);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !c.test(lt.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options2) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options2);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options2) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options2);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/threat/cli.js
import path6 from "node:path";

// src/threat/updater.js
import fs4 from "node:fs";
import path4 from "node:path";
import { execFile as execFile2 } from "node:child_process";
import { promisify as promisify2 } from "node:util";

// src/threat/paths.js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
var DAY = 864e5;
var REPOSITORY = "https://github.com/subhashdasyam/guardrails-js.git";
var DATA_URL = "https://raw.githubusercontent.com/subhashdasyam/guardrails-js/threat-data";
function dataRoot() {
  return path.join(process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), ".claude/plugins/data/guardrails-js"), "threat");
}
function pluginRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "hooks/hooks.json"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("Cannot locate guardrails-js plugin files");
}
function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(temp, file);
}
function snapshot() {
  if (process.env.GUARDRAILS_THREAT_SNAPSHOT) {
    const dir2 = path.resolve(process.env.GUARDRAILS_THREAT_SNAPSHOT);
    return { file: path.join(dir2, "threat-data.db"), metadata: readJson(path.join(dir2, "manifest.json")) };
  }
  const root = dataRoot();
  const active = readJson(path.join(root, "active.json"));
  if (active && /^[a-f0-9]{64}$/.test(active.sha256)) {
    const file = path.join(root, "snapshots", active.sha256, "threat-data.db");
    if (fs.existsSync(file)) return { file, metadata: active };
  }
  const dir = path.join(pluginRoot(), "data");
  return { file: path.join(dir, "threat-data.db"), metadata: readJson(path.join(dir, "manifest.json")) };
}
function lock(file, leaseMs = 20 * 6e4) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (Date.now() - fs.statSync(file).mtimeMs > leaseMs) fs.unlinkSync(file);
  } catch {
  }
  try {
    const fd = fs.openSync(file, "wx");
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);
    return () => {
      try {
        fs.unlinkSync(file);
      } catch {
      }
    };
  } catch {
    return null;
  }
}

// src/threat/sqlite.js
import fs2 from "node:fs";
import path2 from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var exec = promisify(execFile);
var SQLITE3_VERSION = "6.0.1";
function driverDirectory() {
  if (process.env.GUARDRAILS_SQLITE_RUNTIME) return path2.resolve(process.env.GUARDRAILS_SQLITE_RUNTIME);
  return path2.join(dataRoot(), "runtime", `${process.platform}-${process.arch}`, SQLITE3_VERSION);
}
function nativeDriver() {
  return createRequire(path2.join(driverDirectory(), "package.json"))("sqlite3");
}
var builtin;
async function builtinDriver() {
  if (process.env.GUARDRAILS_SQLITE_DRIVER === "sqlite3") return null;
  if (builtin !== void 0) return builtin;
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || major === 22 && minor < 13) return builtin = null;
  try {
    const moduleName = "node:sqlite";
    const mod = await import(moduleName);
    builtin = typeof mod.DatabaseSync === "function" ? mod : null;
  } catch {
    builtin = null;
  }
  return builtin;
}
async function ensureDriver({ network = true, force = false } = {}) {
  if (await builtinDriver()) return "node:sqlite";
  try {
    nativeDriver();
    return "sqlite3";
  } catch {
  }
  if (!network) throw new Error("SQLite3 is not installed; network access is disabled");
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || major === 20 && minor < 17) throw new Error("Use Node 20.17+; Node 22.13+ is recommended");
  const dir = driverDirectory();
  const statusFile = path2.join(dataRoot(), "driver-status.json");
  const status = readJson(statusFile, {});
  if (!force && status.nextRetry > Date.now()) throw new Error(status.error || "SQLite3 installation is in backoff");
  const release = lock(path2.join(dataRoot(), "driver.lock"));
  if (!release) throw new Error("SQLite3 installation is already running");
  try {
    fs2.mkdirSync(dir, { recursive: true });
    writeJson(path2.join(dir, "package.json"), { name: "guardrails-js-sqlite-runtime", private: true });
    const candidates = [
      process.env.npm_execpath,
      path2.join(path2.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
      path2.resolve(path2.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js")
    ];
    const npmCli = candidates.find((p) => p && /npm-cli\.js$/.test(p) && fs2.existsSync(p));
    const args2 = ["install", "--prefix", dir, "--no-audit", "--no-fund", "--save-exact", "--ignore-scripts=false", `sqlite3@${SQLITE3_VERSION}`];
    await exec(npmCli ? process.execPath : "npm", npmCli ? [npmCli, ...args2] : args2, {
      cwd: dir,
      timeout: 24e4,
      maxBuffer: 2e6,
      windowsHide: true,
      env: { ...process.env, PATH: `${path2.dirname(process.execPath)}${path2.delimiter}${process.env.PATH || ""}` }
    });
    nativeDriver();
    writeJson(statusFile, { installedAt: Date.now(), version: SQLITE3_VERSION });
    return "sqlite3";
  } catch (error) {
    writeJson(statusFile, { nextRetry: Date.now() + DAY, error: `SQLite3 installation failed: ${error.message.slice(0, 500)}` });
    throw error;
  } finally {
    release();
  }
}
async function openDatabase(file, { readOnly = true } = {}) {
  const mod = await builtinDriver();
  if (mod) {
    const db2 = new mod.DatabaseSync(file, { readOnly, allowExtension: false });
    return {
      backend: "node:sqlite",
      exec: async (sql) => {
        db2.exec(sql);
      },
      all: async (sql, params = []) => db2.prepare(sql).all(...params),
      run: async (sql, params = []) => db2.prepare(sql).run(...params),
      close: async () => db2.close()
    };
  }
  let driver;
  try {
    driver = nativeDriver();
  } catch {
    throw new Error("SQLite3 driver unavailable; automatic setup runs in the background. Node 22.13+ includes SQLite.");
  }
  const db = await new Promise((resolve, reject) => {
    const instance = new driver.Database(
      file,
      readOnly ? driver.OPEN_READONLY : driver.OPEN_READWRITE | driver.OPEN_CREATE,
      (error) => error ? reject(error) : resolve(instance)
    );
  });
  const call = (method) => (sql, params = []) => new Promise((resolve, reject) => {
    db[method](sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
  return {
    backend: "sqlite3",
    all: call("all"),
    run: call("run"),
    exec: (sql) => new Promise((resolve, reject) => db.exec(sql, (e) => e ? reject(e) : resolve())),
    close: () => new Promise((resolve, reject) => db.close((e) => e ? reject(e) : resolve()))
  };
}

// src/threat/importer.js
var import_yauzl = __toESM(require_yauzl(), 1);
import fs3 from "node:fs";
import path3 from "node:path";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// src/threat/store.js
var import_semver = __toESM(require_semver2(), 1);
var SCHEMA_VERSION = 1;

// src/threat/importer.js
var OSV_URL = "https://osv-vulnerabilities.storage.googleapis.com/npm/all.zip";
async function download(url, file, { maxBytes = 1e8, timeout = 12e4 } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Download exceeds size limit");
  let bytes = 0;
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, cb) {
    bytes += chunk.length;
    cb(bytes > maxBytes ? new Error("Download exceeds size limit") : null, chunk);
  } }), fs3.createWriteStream(file, { flags: "wx" }));
  return response.headers.get("last-modified");
}
async function sha256(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs3.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
function maliciousRecords(advisory) {
  if (advisory.withdrawn) return [];
  const malware = String(advisory.id).startsWith("MAL-") || advisory.database_specific?.malicious === true || (advisory.database_specific?.cwe_ids || []).includes("CWE-506") || /^Malicious (?:code|package)\b/i.test(advisory.summary || "");
  if (!malware) return [];
  const result = [];
  for (const affected of advisory.affected || []) {
    const name = affected.package?.name;
    if (affected.package?.ecosystem !== "npm" || typeof name !== "string" || name.length > 214) continue;
    const ranges = (affected.ranges || []).filter((r) => r.type === "SEMVER").map((r) => ({ type: r.type, events: r.events || [] }));
    const versions = (affected.versions || []).filter((v) => typeof v === "string");
    result.push({
      name,
      id: advisory.id,
      versions,
      ranges,
      description: String(advisory.summary || "Reported malicious package").slice(0, 2e3),
      reference: `https://osv.dev/vulnerability/${encodeURIComponent(advisory.id)}`
    });
  }
  return result;
}
async function readZip(file, consume) {
  const zip = await new Promise((resolve, reject) => import_yauzl.default.open(file, { lazyEntries: true }, (e, z) => e ? reject(e) : resolve(z)));
  return new Promise((resolve, reject) => {
    let total = 0;
    const fail = (error) => {
      zip.close();
      reject(error);
    };
    zip.on("error", fail);
    zip.on("end", resolve);
    zip.on("entry", (entry) => {
      if (!entry.fileName.endsWith(".json")) {
        zip.readEntry();
        return;
      }
      if (entry.uncompressedSize > 1e7 || (total += entry.uncompressedSize) > 4e9) {
        fail(new Error("OSV archive exceeds extraction limits"));
        return;
      }
      zip.openReadStream(entry, (error, stream) => {
        if (error) {
          fail(error);
          return;
        }
        (async () => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          await consume(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          zip.readEntry();
        })().catch(fail);
      });
    });
    zip.readEntry();
  });
}
async function collectPopular() {
  const names = /* @__PURE__ */ new Set();
  for (const term of ["react", "node", "typescript", "cli", "test", "http", "database", "auth", "build", "vue", "css", "aws", "parser", "graphql", "mcp", "json", "logging", "validation", "stream", "image"]) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${term}&size=250&popularity=1&quality=0&maintenance=0`;
    const response = await fetch(url, { signal: AbortSignal.timeout(2e4) });
    if (!response.ok) throw new Error(`npm search HTTP ${response.status}`);
    const json = await response.json();
    for (const item of json.objects || []) {
      if (typeof item.package?.name === "string") names.add(item.package.name);
    }
  }
  if (names.size < 500) throw new Error("npm returned too few popular packages");
  return [...names].sort();
}
async function buildDatabase({ output, osvDir, osvZip, advisories, popular, sourceUpdated, source = "osv/npm", seedOnly = false, warnings = [] }) {
  fs3.mkdirSync(output, { recursive: true });
  const file = path3.join(output, "threat-data.db");
  if (fs3.existsSync(file)) throw new Error("Build output already exists");
  const seed = readJson(path3.join(pluginRoot(), "src/supply-chain/data/denylist.json"));
  if (!seed) throw new Error("Curated seed data is missing");
  const db = await openDatabase(file, { readOnly: false });
  try {
    await db.exec(`PRAGMA journal_mode=DELETE; PRAGMA user_version=${SCHEMA_VERSION};
      CREATE TABLE threats(name TEXT NOT NULL, id TEXT NOT NULL, record TEXT NOT NULL, PRIMARY KEY(name,id)) WITHOUT ROWID;
      CREATE TABLE popular(name TEXT PRIMARY KEY) WITHOUT ROWID;
      CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
      BEGIN;`);
    const add = async (record) => {
      const prior = await db.all("SELECT record FROM threats WHERE name=? AND id=?", [record.name, record.id]);
      if (prior.length) {
        const old = JSON.parse(prior[0].record);
        record.versions = [.../* @__PURE__ */ new Set([...old.versions, ...record.versions])].sort();
        record.ranges = [...old.ranges, ...record.ranges];
      }
      await db.run("INSERT OR REPLACE INTO threats VALUES(?,?,?)", [record.name, record.id, JSON.stringify(record)]);
    };
    for (const [name, entry] of Object.entries(seed.packages)) {
      await add({ name, id: `curated:${entry.incident}`, versions: entry.versions, ranges: [], ...seed.incidents[entry.incident] });
    }
    let scanned = 0;
    const consume = async (advisory) => {
      scanned++;
      for (const record of maliciousRecords(advisory)) await add(record);
    };
    if (osvZip) await readZip(osvZip, consume);
    if (osvDir) {
      for (const name of fs3.readdirSync(osvDir).sort()) {
        if (name.endsWith(".json")) await consume(JSON.parse(fs3.readFileSync(path3.join(osvDir, name), "utf8")));
      }
    }
    if (advisories) for (const advisory of advisories) await consume(advisory);
    const baselinePopular = readJson(path3.join(pluginRoot(), "src/supply-chain/data/top-packages.json")).names;
    for (const name of [.../* @__PURE__ */ new Set([...baselinePopular, ...popular || []])].sort()) {
      await db.run("INSERT INTO popular VALUES(?)", [name]);
    }
    const metadata = {
      schemaVersion: SCHEMA_VERSION,
      source,
      sourceUpdated: sourceUpdated || seed.updated,
      builtAt: (/* @__PURE__ */ new Date()).toISOString(),
      seedOnly,
      scanned,
      warnings,
      packages: (await db.all("SELECT count(DISTINCT name) AS n FROM threats"))[0].n,
      records: (await db.all("SELECT count(*) AS n FROM threats"))[0].n
    };
    await db.run("INSERT INTO metadata VALUES(?,?)", ["manifest", JSON.stringify(metadata)]);
    await db.exec("COMMIT; VACUUM;");
    await db.close();
    metadata.sha256 = await sha256(file);
    metadata.bytes = fs3.statSync(file).size;
    writeJson(path3.join(output, "manifest.json"), metadata);
    fs3.writeFileSync(path3.join(output, "summary.md"), `# Threat data

Source: ${source}

Source snapshot: ${metadata.sourceUpdated}

Packages: ${metadata.packages}

Advisories: ${metadata.records}

SHA-256: ${metadata.sha256}

${warnings.join("\n")}
`);
    return metadata;
  } catch (error) {
    try {
      await db.close();
    } catch {
    }
    throw error;
  }
}
async function buildFromSources(output) {
  await ensureDriver();
  const zip = path3.join(output, "npm-osv.zip");
  const modified = await download(OSV_URL, zip, { maxBytes: 6e8, timeout: 3e5 });
  if (!modified || !Number.isFinite(Date.parse(modified))) throw new Error("OSV source lacks a valid Last-Modified timestamp");
  let popular;
  const warnings = [];
  try {
    popular = await collectPopular();
  } catch (error) {
    warnings.push(`Popularity refresh failed; retained bundled names: ${error.message}`);
  }
  return buildDatabase({ output, osvZip: zip, popular, sourceUpdated: new Date(modified).toISOString(), warnings });
}
async function validateSnapshot(dir) {
  const metadata = readJson(path3.join(dir, "manifest.json"));
  if (!metadata || metadata.schemaVersion !== SCHEMA_VERSION || !/^[a-f0-9]{64}$/.test(metadata.sha256) || !Number.isFinite(Date.parse(metadata.sourceUpdated)) || Date.parse(metadata.sourceUpdated) > Date.now() + 3e5 || !Number.isInteger(metadata.records) || metadata.records < 1) throw new Error("Invalid threat database manifest");
  const file = path3.join(dir, "threat-data.db");
  if (fs3.statSync(file).size !== metadata.bytes || metadata.bytes > 1e8 || await sha256(file) !== metadata.sha256) throw new Error("Threat database checksum or size mismatch");
  const db = await openDatabase(file);
  try {
    await db.exec("PRAGMA trusted_schema=OFF;");
    const check = await db.all("PRAGMA quick_check");
    if (check.length !== 1 || Object.values(check[0])[0] !== "ok") throw new Error("SQLite integrity check failed");
    for (const name of ["threats", "popular", "metadata"]) {
      if ((await db.all("SELECT type FROM sqlite_master WHERE name=?", [name]))[0]?.type !== "table") throw new Error("Invalid database tables");
    }
    const embedded = JSON.parse((await db.all("SELECT value FROM metadata WHERE key='manifest'"))[0]?.value);
    for (const key of ["schemaVersion", "sourceUpdated", "source", "seedOnly", "records", "packages"]) {
      if (embedded[key] !== metadata[key]) throw new Error("Database metadata mismatch");
    }
    if ((await db.all("SELECT count(*) AS n FROM threats"))[0].n !== metadata.records) throw new Error("Database record count mismatch");
    return metadata;
  } finally {
    await db.close();
  }
}

// src/threat/updater.js
var exec2 = promisify2(execFile2);
function failedRoute(previous, error, now) {
  const failures = (previous?.failures || 0) + 1;
  const blocked = /HTTP (401|403|404|451)|ENOTFOUND|certificate|not found/i.test(error.message);
  return {
    failures,
    lastAttempt: now,
    error: error.message.slice(0, 400),
    nextRetry: now + (blocked || failures >= 3 ? 7 * DAY : Math.min(DAY, 36e5 * 2 ** (failures - 1)))
  };
}
async function activate(dir, { allowOlder = false } = {}) {
  const metadata = await validateSnapshot(dir);
  const release = lock(path4.join(dataRoot(), "activation.lock"), 6e4);
  if (!release) throw new Error("Another threat database activation is in progress");
  try {
    const old = snapshot().metadata;
    if (!allowOlder && old && Date.parse(metadata.sourceUpdated) < Date.parse(old.sourceUpdated)) throw new Error("Refusing an older threat database");
    if (Date.now() - Date.parse(metadata.sourceUpdated) > 7 * DAY) throw new Error("Published threat database is more than seven days old");
    const destination = path4.join(dataRoot(), "snapshots", metadata.sha256);
    fs4.mkdirSync(destination, { recursive: true });
    const file = path4.join(destination, "threat-data.db");
    if (!fs4.existsSync(file) || await sha256(file) !== metadata.sha256) {
      const temp = `${file}.${process.pid}.tmp`;
      fs4.copyFileSync(path4.join(dir, "threat-data.db"), temp);
      fs4.renameSync(temp, file);
    }
    writeJson(path4.join(destination, "manifest.json"), metadata);
    writeJson(path4.join(dataRoot(), "active.json"), metadata);
    try {
      fs4.unlinkSync(path4.join(dataRoot(), "store-error.json"));
    } catch {
    }
    const snapshots = path4.dirname(destination);
    for (const name of fs4.readdirSync(snapshots)) {
      if (!/^[a-f0-9]{64}$/.test(name) || name === metadata.sha256 || name === old?.sha256) continue;
      const obsolete = path4.join(snapshots, name);
      try {
        if (Date.now() - fs4.statSync(obsolete).mtimeMs > DAY) fs4.rmSync(obsolete, { recursive: true });
      } catch {
      }
    }
    return metadata;
  } finally {
    release();
  }
}
var routes = {
  async download(dir) {
    await download(`${DATA_URL}/manifest.json`, path4.join(dir, "manifest.json"), { maxBytes: 64e3, timeout: 15e3 });
    const manifest = readJson(path4.join(dir, "manifest.json"));
    if (!manifest || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error("Invalid remote manifest");
    const current = snapshot();
    if (current.metadata?.sha256 === manifest.sha256 && fs4.existsSync(current.file)) {
      fs4.copyFileSync(current.file, path4.join(dir, "threat-data.db"));
      return dir;
    }
    await download(`${DATA_URL}/threat-data.db`, path4.join(dir, "threat-data.db"));
    return dir;
  },
  async clone(dir) {
    const target = path4.join(dir, "repo");
    const noHooks = path4.join(dir, "no-hooks");
    fs4.mkdirSync(noHooks);
    await exec2("git", ["-c", `core.hooksPath=${noHooks}`, "clone", "--depth", "1", "--single-branch", "--branch", "threat-data", REPOSITORY, target], {
      timeout: 12e4,
      maxBuffer: 1e6,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1" }
    });
    return target;
  },
  async sources(dir) {
    await buildFromSources(dir);
    return dir;
  }
};
async function refresh({ force = false, interval = DAY, now = Date.now(), handlers = routes, install = ensureDriver, accept = activate } = {}) {
  const root = dataRoot();
  const release = lock(path4.join(root, "update.lock"));
  if (!release) return { busy: true };
  const stateFile = path4.join(root, "update-state.json");
  const state = readJson(stateFile, { routes: {} });
  state.routes ||= {};
  try {
    if (!force && now < (state.nextCheck || 0)) return state;
    if (force) state.routes = {};
    try {
      await install({ force });
    } catch (error) {
      state.error = `SQLite setup failed: ${error.message.slice(0, 400)}`;
      state.nextCheck = now + DAY;
      writeJson(stateFile, state);
      return state;
    }
    for (const name of ["download", "clone", "sources"]) {
      if (!force && now < (state.routes[name]?.nextRetry || 0)) continue;
      const dir = fs4.mkdtempSync(path4.join(root, "staging-"));
      try {
        const output = await handlers[name](dir);
        const metadata = await accept(output);
        state.routes[name] = { lastAttempt: now, lastSuccess: now, failures: 0 };
        state.lastSuccess = now;
        state.source = name;
        state.sourceUpdated = metadata.sourceUpdated;
        state.nextCheck = now + interval;
        delete state.error;
        writeJson(stateFile, state);
        return state;
      } catch (error) {
        state.routes[name] = failedRoute(state.routes[name], error, now);
        writeJson(stateFile, state);
      } finally {
        fs4.rmSync(dir, { recursive: true, force: true });
      }
    }
    state.error = "All eligible threat data update routes failed";
    state.nextCheck = Math.min(...Object.values(state.routes).map((r) => r.nextRetry || now + DAY));
    writeJson(stateFile, state);
    return state;
  } finally {
    release();
  }
}

// src/engine/config.js
import fs5 from "node:fs";
import path5 from "node:path";
var SECURITY_SEVERITIES = ["low", "medium", "high", "critical"];
var DEFAULTS = {
  severityOverrides: {},
  disableRules: [],
  // Package specifiers that never hard block, as "lodash" or "lodash@4.17.21".
  // A blocked install has no other way past, so this is the release valve for a
  // project that genuinely needs a version carrying an advisory.
  allowPackages: [],
  excludePaths: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.min.js"
  ],
  network: true,
  threatDataAutoRefresh: true,
  threatDataRefreshHours: 24,
  primingPacks: ["auto"],
  priming: true,
  // Security findings below this are dropped. Performance findings are not on
  // this scale, see the note above SECURITY_SEVERITIES.
  minSeverity: "medium",
  // Performance findings are advisory and never interrupt, so they are on by
  // default and switched separately from the security floor.
  //
  //   true or 'high'  the findings that reliably bite, which is the default
  //   'all'           everything, including the ones that depend on data we
  //                   cannot see, such as whether a render is actually slow
  //   false or 'off'  none
  performance: "high",
  // Write .claude/guardrails-js-report.md as findings arrive.
  report: true
};
function readJson2(file) {
  try {
    return JSON.parse(fs5.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function findConfigFile(startDir) {
  let dir = path5.resolve(startDir);
  for (let depth = 0; depth < 30; depth += 1) {
    const candidate = path5.join(dir, ".guardrails-js.json");
    if (fs5.existsSync(candidate)) return candidate;
    const parent = path5.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function loadConfig(cwd = process.cwd()) {
  const file = findConfigFile(cwd);
  const fromFile = file ? readJson2(file) ?? {} : {};
  const config = {
    ...DEFAULTS,
    ...fromFile,
    severityOverrides: { ...DEFAULTS.severityOverrides, ...fromFile.severityOverrides ?? {} },
    excludePaths: fromFile.excludePaths ?? DEFAULTS.excludePaths,
    disableRules: fromFile.disableRules ?? DEFAULTS.disableRules,
    allowPackages: fromFile.allowPackages ?? DEFAULTS.allowPackages,
    configFile: file,
    projectRoot: file ? path5.dirname(file) : cwd
  };
  if (!SECURITY_SEVERITIES.includes(config.minSeverity)) {
    config.minSeverity = DEFAULTS.minSeverity;
  }
  const disabled = new Set(config.disableRules.map((id) => String(id).toUpperCase()));
  const overrides = {};
  for (const [id, value] of Object.entries(config.severityOverrides)) {
    overrides[String(id).toUpperCase()] = String(value).toLowerCase();
  }
  config.isRuleDisabled = (ruleId) => {
    const id = String(ruleId).toUpperCase();
    if (disabled.has(id)) return true;
    return overrides[id] === "off";
  };
  config.severityFor = (rule) => {
    const override = overrides[String(rule.id).toUpperCase()];
    if (override && override !== "off") return override;
    return rule.severity;
  };
  return config;
}

// src/threat/cli.js
var [command = "status", ...args] = process.argv.slice(2);
var deadline = setTimeout(() => {
  console.error("Threat data worker exceeded its 15 minute deadline");
  process.exit(1);
}, 15 * 6e4);
deadline.unref();
try {
  const config = loadConfig(process.cwd());
  if (command === "refresh") {
    if (config.network === false) throw new Error("network:false disables threat data downloads and driver installation");
    const value = Number(args[args.indexOf("--interval") + 1]);
    const state = await refresh({ force: args.includes("--force"), interval: Number.isFinite(value) && value >= 36e5 ? value : DAY });
    console.log(JSON.stringify(state, null, 2));
    if (state.error) process.exitCode = 1;
  } else if (command === "setup") {
    console.log(await ensureDriver({ network: config.network, force: args.includes("--force") }));
  } else if (command === "import") {
    if (!args[0]) throw new Error("Usage: node dist/threat-data.mjs import <directory containing threat-data.db and manifest.json>");
    await ensureDriver({ network: config.network });
    console.log(JSON.stringify(await activate(path6.resolve(args[0])), null, 2));
  } else if (command === "status") {
    let backend;
    try {
      const db = await openDatabase(snapshot().file);
      backend = db.backend;
      await db.close();
    } catch (e) {
      backend = e.message;
    }
    console.log(JSON.stringify({
      node: process.versions.node,
      backend,
      driverDirectory: driverDirectory(),
      ...snapshot(),
      updates: readJson(path6.join(dataRoot(), "update-state.json"), {}),
      driver: readJson(path6.join(dataRoot(), "driver-status.json"), {})
    }, null, 2));
  } else throw new Error("Commands: status | setup [--force] | refresh [--force] | import <directory>");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
}
