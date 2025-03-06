(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.GhostMeilisearchSearch = factory());
})(this, (function () { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	var meilisearch_umd = {exports: {}};

	var browserPolyfill = {};

	var hasRequiredBrowserPolyfill;

	function requireBrowserPolyfill () {
		if (hasRequiredBrowserPolyfill) return browserPolyfill;
		hasRequiredBrowserPolyfill = 1;
		(function () {
			(function(self) {

			((function (exports) {

			  /* eslint-disable no-prototype-builtins */
			  var g =
			    (typeof globalThis !== 'undefined' && globalThis) ||
			    (typeof self !== 'undefined' && self) ||
			    // eslint-disable-next-line no-undef
			    (typeof commonjsGlobal !== 'undefined' && commonjsGlobal) ||
			    {};

			  var support = {
			    searchParams: 'URLSearchParams' in g,
			    iterable: 'Symbol' in g && 'iterator' in Symbol,
			    blob:
			      'FileReader' in g &&
			      'Blob' in g &&
			      (function() {
			        try {
			          new Blob();
			          return true
			        } catch (e) {
			          return false
			        }
			      })(),
			    formData: 'FormData' in g,
			    arrayBuffer: 'ArrayBuffer' in g
			  };

			  function isDataView(obj) {
			    return obj && DataView.prototype.isPrototypeOf(obj)
			  }

			  if (support.arrayBuffer) {
			    var viewClasses = [
			      '[object Int8Array]',
			      '[object Uint8Array]',
			      '[object Uint8ClampedArray]',
			      '[object Int16Array]',
			      '[object Uint16Array]',
			      '[object Int32Array]',
			      '[object Uint32Array]',
			      '[object Float32Array]',
			      '[object Float64Array]'
			    ];

			    var isArrayBufferView =
			      ArrayBuffer.isView ||
			      function(obj) {
			        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
			      };
			  }

			  function normalizeName(name) {
			    if (typeof name !== 'string') {
			      name = String(name);
			    }
			    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
			      throw new TypeError('Invalid character in header field name: "' + name + '"')
			    }
			    return name.toLowerCase()
			  }

			  function normalizeValue(value) {
			    if (typeof value !== 'string') {
			      value = String(value);
			    }
			    return value
			  }

			  // Build a destructive iterator for the value list
			  function iteratorFor(items) {
			    var iterator = {
			      next: function() {
			        var value = items.shift();
			        return {done: value === undefined, value: value}
			      }
			    };

			    if (support.iterable) {
			      iterator[Symbol.iterator] = function() {
			        return iterator
			      };
			    }

			    return iterator
			  }

			  function Headers(headers) {
			    this.map = {};

			    if (headers instanceof Headers) {
			      headers.forEach(function(value, name) {
			        this.append(name, value);
			      }, this);
			    } else if (Array.isArray(headers)) {
			      headers.forEach(function(header) {
			        if (header.length != 2) {
			          throw new TypeError('Headers constructor: expected name/value pair to be length 2, found' + header.length)
			        }
			        this.append(header[0], header[1]);
			      }, this);
			    } else if (headers) {
			      Object.getOwnPropertyNames(headers).forEach(function(name) {
			        this.append(name, headers[name]);
			      }, this);
			    }
			  }

			  Headers.prototype.append = function(name, value) {
			    name = normalizeName(name);
			    value = normalizeValue(value);
			    var oldValue = this.map[name];
			    this.map[name] = oldValue ? oldValue + ', ' + value : value;
			  };

			  Headers.prototype['delete'] = function(name) {
			    delete this.map[normalizeName(name)];
			  };

			  Headers.prototype.get = function(name) {
			    name = normalizeName(name);
			    return this.has(name) ? this.map[name] : null
			  };

			  Headers.prototype.has = function(name) {
			    return this.map.hasOwnProperty(normalizeName(name))
			  };

			  Headers.prototype.set = function(name, value) {
			    this.map[normalizeName(name)] = normalizeValue(value);
			  };

			  Headers.prototype.forEach = function(callback, thisArg) {
			    for (var name in this.map) {
			      if (this.map.hasOwnProperty(name)) {
			        callback.call(thisArg, this.map[name], name, this);
			      }
			    }
			  };

			  Headers.prototype.keys = function() {
			    var items = [];
			    this.forEach(function(value, name) {
			      items.push(name);
			    });
			    return iteratorFor(items)
			  };

			  Headers.prototype.values = function() {
			    var items = [];
			    this.forEach(function(value) {
			      items.push(value);
			    });
			    return iteratorFor(items)
			  };

			  Headers.prototype.entries = function() {
			    var items = [];
			    this.forEach(function(value, name) {
			      items.push([name, value]);
			    });
			    return iteratorFor(items)
			  };

			  if (support.iterable) {
			    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
			  }

			  function consumed(body) {
			    if (body._noBody) return
			    if (body.bodyUsed) {
			      return Promise.reject(new TypeError('Already read'))
			    }
			    body.bodyUsed = true;
			  }

			  function fileReaderReady(reader) {
			    return new Promise(function(resolve, reject) {
			      reader.onload = function() {
			        resolve(reader.result);
			      };
			      reader.onerror = function() {
			        reject(reader.error);
			      };
			    })
			  }

			  function readBlobAsArrayBuffer(blob) {
			    var reader = new FileReader();
			    var promise = fileReaderReady(reader);
			    reader.readAsArrayBuffer(blob);
			    return promise
			  }

			  function readBlobAsText(blob) {
			    var reader = new FileReader();
			    var promise = fileReaderReady(reader);
			    var match = /charset=([A-Za-z0-9_-]+)/.exec(blob.type);
			    var encoding = match ? match[1] : 'utf-8';
			    reader.readAsText(blob, encoding);
			    return promise
			  }

			  function readArrayBufferAsText(buf) {
			    var view = new Uint8Array(buf);
			    var chars = new Array(view.length);

			    for (var i = 0; i < view.length; i++) {
			      chars[i] = String.fromCharCode(view[i]);
			    }
			    return chars.join('')
			  }

			  function bufferClone(buf) {
			    if (buf.slice) {
			      return buf.slice(0)
			    } else {
			      var view = new Uint8Array(buf.byteLength);
			      view.set(new Uint8Array(buf));
			      return view.buffer
			    }
			  }

			  function Body() {
			    this.bodyUsed = false;

			    this._initBody = function(body) {
			      /*
			        fetch-mock wraps the Response object in an ES6 Proxy to
			        provide useful test harness features such as flush. However, on
			        ES5 browsers without fetch or Proxy support pollyfills must be used;
			        the proxy-pollyfill is unable to proxy an attribute unless it exists
			        on the object before the Proxy is created. This change ensures
			        Response.bodyUsed exists on the instance, while maintaining the
			        semantic of setting Request.bodyUsed in the constructor before
			        _initBody is called.
			      */
			      // eslint-disable-next-line no-self-assign
			      this.bodyUsed = this.bodyUsed;
			      this._bodyInit = body;
			      if (!body) {
			        this._noBody = true;
			        this._bodyText = '';
			      } else if (typeof body === 'string') {
			        this._bodyText = body;
			      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
			        this._bodyBlob = body;
			      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
			        this._bodyFormData = body;
			      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
			        this._bodyText = body.toString();
			      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
			        this._bodyArrayBuffer = bufferClone(body.buffer);
			        // IE 10-11 can't handle a DataView body.
			        this._bodyInit = new Blob([this._bodyArrayBuffer]);
			      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
			        this._bodyArrayBuffer = bufferClone(body);
			      } else {
			        this._bodyText = body = Object.prototype.toString.call(body);
			      }

			      if (!this.headers.get('content-type')) {
			        if (typeof body === 'string') {
			          this.headers.set('content-type', 'text/plain;charset=UTF-8');
			        } else if (this._bodyBlob && this._bodyBlob.type) {
			          this.headers.set('content-type', this._bodyBlob.type);
			        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
			          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
			        }
			      }
			    };

			    if (support.blob) {
			      this.blob = function() {
			        var rejected = consumed(this);
			        if (rejected) {
			          return rejected
			        }

			        if (this._bodyBlob) {
			          return Promise.resolve(this._bodyBlob)
			        } else if (this._bodyArrayBuffer) {
			          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
			        } else if (this._bodyFormData) {
			          throw new Error('could not read FormData body as blob')
			        } else {
			          return Promise.resolve(new Blob([this._bodyText]))
			        }
			      };
			    }

			    this.arrayBuffer = function() {
			      if (this._bodyArrayBuffer) {
			        var isConsumed = consumed(this);
			        if (isConsumed) {
			          return isConsumed
			        } else if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
			          return Promise.resolve(
			            this._bodyArrayBuffer.buffer.slice(
			              this._bodyArrayBuffer.byteOffset,
			              this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
			            )
			          )
			        } else {
			          return Promise.resolve(this._bodyArrayBuffer)
			        }
			      } else if (support.blob) {
			        return this.blob().then(readBlobAsArrayBuffer)
			      } else {
			        throw new Error('could not read as ArrayBuffer')
			      }
			    };

			    this.text = function() {
			      var rejected = consumed(this);
			      if (rejected) {
			        return rejected
			      }

			      if (this._bodyBlob) {
			        return readBlobAsText(this._bodyBlob)
			      } else if (this._bodyArrayBuffer) {
			        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
			      } else if (this._bodyFormData) {
			        throw new Error('could not read FormData body as text')
			      } else {
			        return Promise.resolve(this._bodyText)
			      }
			    };

			    if (support.formData) {
			      this.formData = function() {
			        return this.text().then(decode)
			      };
			    }

			    this.json = function() {
			      return this.text().then(JSON.parse)
			    };

			    return this
			  }

			  // HTTP methods whose capitalization should be normalized
			  var methods = ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'];

			  function normalizeMethod(method) {
			    var upcased = method.toUpperCase();
			    return methods.indexOf(upcased) > -1 ? upcased : method
			  }

			  function Request(input, options) {
			    if (!(this instanceof Request)) {
			      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
			    }

			    options = options || {};
			    var body = options.body;

			    if (input instanceof Request) {
			      if (input.bodyUsed) {
			        throw new TypeError('Already read')
			      }
			      this.url = input.url;
			      this.credentials = input.credentials;
			      if (!options.headers) {
			        this.headers = new Headers(input.headers);
			      }
			      this.method = input.method;
			      this.mode = input.mode;
			      this.signal = input.signal;
			      if (!body && input._bodyInit != null) {
			        body = input._bodyInit;
			        input.bodyUsed = true;
			      }
			    } else {
			      this.url = String(input);
			    }

			    this.credentials = options.credentials || this.credentials || 'same-origin';
			    if (options.headers || !this.headers) {
			      this.headers = new Headers(options.headers);
			    }
			    this.method = normalizeMethod(options.method || this.method || 'GET');
			    this.mode = options.mode || this.mode || null;
			    this.signal = options.signal || this.signal || (function () {
			      if ('AbortController' in g) {
			        var ctrl = new AbortController();
			        return ctrl.signal;
			      }
			    }());
			    this.referrer = null;

			    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
			      throw new TypeError('Body not allowed for GET or HEAD requests')
			    }
			    this._initBody(body);

			    if (this.method === 'GET' || this.method === 'HEAD') {
			      if (options.cache === 'no-store' || options.cache === 'no-cache') {
			        // Search for a '_' parameter in the query string
			        var reParamSearch = /([?&])_=[^&]*/;
			        if (reParamSearch.test(this.url)) {
			          // If it already exists then set the value with the current time
			          this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
			        } else {
			          // Otherwise add a new '_' parameter to the end with the current time
			          var reQueryString = /\?/;
			          this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
			        }
			      }
			    }
			  }

			  Request.prototype.clone = function() {
			    return new Request(this, {body: this._bodyInit})
			  };

			  function decode(body) {
			    var form = new FormData();
			    body
			      .trim()
			      .split('&')
			      .forEach(function(bytes) {
			        if (bytes) {
			          var split = bytes.split('=');
			          var name = split.shift().replace(/\+/g, ' ');
			          var value = split.join('=').replace(/\+/g, ' ');
			          form.append(decodeURIComponent(name), decodeURIComponent(value));
			        }
			      });
			    return form
			  }

			  function parseHeaders(rawHeaders) {
			    var headers = new Headers();
			    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
			    // https://tools.ietf.org/html/rfc7230#section-3.2
			    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
			    // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
			    // https://github.com/github/fetch/issues/748
			    // https://github.com/zloirock/core-js/issues/751
			    preProcessedHeaders
			      .split('\r')
			      .map(function(header) {
			        return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
			      })
			      .forEach(function(line) {
			        var parts = line.split(':');
			        var key = parts.shift().trim();
			        if (key) {
			          var value = parts.join(':').trim();
			          try {
			            headers.append(key, value);
			          } catch (error) {
			            console.warn('Response ' + error.message);
			          }
			        }
			      });
			    return headers
			  }

			  Body.call(Request.prototype);

			  function Response(bodyInit, options) {
			    if (!(this instanceof Response)) {
			      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
			    }
			    if (!options) {
			      options = {};
			    }

			    this.type = 'default';
			    this.status = options.status === undefined ? 200 : options.status;
			    if (this.status < 200 || this.status > 599) {
			      throw new RangeError("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].")
			    }
			    this.ok = this.status >= 200 && this.status < 300;
			    this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
			    this.headers = new Headers(options.headers);
			    this.url = options.url || '';
			    this._initBody(bodyInit);
			  }

			  Body.call(Response.prototype);

			  Response.prototype.clone = function() {
			    return new Response(this._bodyInit, {
			      status: this.status,
			      statusText: this.statusText,
			      headers: new Headers(this.headers),
			      url: this.url
			    })
			  };

			  Response.error = function() {
			    var response = new Response(null, {status: 200, statusText: ''});
			    response.ok = false;
			    response.status = 0;
			    response.type = 'error';
			    return response
			  };

			  var redirectStatuses = [301, 302, 303, 307, 308];

			  Response.redirect = function(url, status) {
			    if (redirectStatuses.indexOf(status) === -1) {
			      throw new RangeError('Invalid status code')
			    }

			    return new Response(null, {status: status, headers: {location: url}})
			  };

			  exports.DOMException = g.DOMException;
			  try {
			    new exports.DOMException();
			  } catch (err) {
			    exports.DOMException = function(message, name) {
			      this.message = message;
			      this.name = name;
			      var error = Error(message);
			      this.stack = error.stack;
			    };
			    exports.DOMException.prototype = Object.create(Error.prototype);
			    exports.DOMException.prototype.constructor = exports.DOMException;
			  }

			  function fetch(input, init) {
			    return new Promise(function(resolve, reject) {
			      var request = new Request(input, init);

			      if (request.signal && request.signal.aborted) {
			        return reject(new exports.DOMException('Aborted', 'AbortError'))
			      }

			      var xhr = new XMLHttpRequest();

			      function abortXhr() {
			        xhr.abort();
			      }

			      xhr.onload = function() {
			        var options = {
			          statusText: xhr.statusText,
			          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
			        };
			        // This check if specifically for when a user fetches a file locally from the file system
			        // Only if the status is out of a normal range
			        if (request.url.indexOf('file://') === 0 && (xhr.status < 200 || xhr.status > 599)) {
			          options.status = 200;
			        } else {
			          options.status = xhr.status;
			        }
			        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
			        var body = 'response' in xhr ? xhr.response : xhr.responseText;
			        setTimeout(function() {
			          resolve(new Response(body, options));
			        }, 0);
			      };

			      xhr.onerror = function() {
			        setTimeout(function() {
			          reject(new TypeError('Network request failed'));
			        }, 0);
			      };

			      xhr.ontimeout = function() {
			        setTimeout(function() {
			          reject(new TypeError('Network request timed out'));
			        }, 0);
			      };

			      xhr.onabort = function() {
			        setTimeout(function() {
			          reject(new exports.DOMException('Aborted', 'AbortError'));
			        }, 0);
			      };

			      function fixUrl(url) {
			        try {
			          return url === '' && g.location.href ? g.location.href : url
			        } catch (e) {
			          return url
			        }
			      }

			      xhr.open(request.method, fixUrl(request.url), true);

			      if (request.credentials === 'include') {
			        xhr.withCredentials = true;
			      } else if (request.credentials === 'omit') {
			        xhr.withCredentials = false;
			      }

			      if ('responseType' in xhr) {
			        if (support.blob) {
			          xhr.responseType = 'blob';
			        } else if (
			          support.arrayBuffer
			        ) {
			          xhr.responseType = 'arraybuffer';
			        }
			      }

			      if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers || (g.Headers && init.headers instanceof g.Headers))) {
			        var names = [];
			        Object.getOwnPropertyNames(init.headers).forEach(function(name) {
			          names.push(normalizeName(name));
			          xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
			        });
			        request.headers.forEach(function(value, name) {
			          if (names.indexOf(name) === -1) {
			            xhr.setRequestHeader(name, value);
			          }
			        });
			      } else {
			        request.headers.forEach(function(value, name) {
			          xhr.setRequestHeader(name, value);
			        });
			      }

			      if (request.signal) {
			        request.signal.addEventListener('abort', abortXhr);

			        xhr.onreadystatechange = function() {
			          // DONE (success or failure)
			          if (xhr.readyState === 4) {
			            request.signal.removeEventListener('abort', abortXhr);
			          }
			        };
			      }

			      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
			    })
			  }

			  fetch.polyfill = true;

			  if (!g.fetch) {
			    g.fetch = fetch;
			    g.Headers = Headers;
			    g.Request = Request;
			    g.Response = Response;
			  }

			  exports.Headers = Headers;
			  exports.Request = Request;
			  exports.Response = Response;
			  exports.fetch = fetch;

			  Object.defineProperty(exports, '__esModule', { value: true });

			  return exports;

			}))({});
			})(typeof self !== 'undefined' ? self : commonjsGlobal); 
		} ());
		return browserPolyfill;
	}

	(function (module, exports) {
		(function (global, factory) {
		  factory(exports) ;
		})(commonjsGlobal, (function (exports) {
		  // Type definitions for meilisearch
		  // Project: https://github.com/meilisearch/meilisearch-js
		  // Definitions by: qdequele <quentin@meilisearch.com> <https://github.com/meilisearch>
		  // Definitions: https://github.com/meilisearch/meilisearch-js
		  // TypeScript Version: ^3.8.3
		  /*
		   * SEARCH PARAMETERS
		   */
		  var MatchingStrategies = {
		    ALL: 'all',
		    LAST: 'last'
		  };
		  var ContentTypeEnum = {
		    JSON: 'application/json',
		    CSV: 'text/csv',
		    NDJSON: 'application/x-ndjson'
		  };
		  /*
		   ** TASKS
		   */
		  var TaskStatus = {
		    TASK_SUCCEEDED: 'succeeded',
		    TASK_PROCESSING: 'processing',
		    TASK_FAILED: 'failed',
		    TASK_ENQUEUED: 'enqueued',
		    TASK_CANCELED: 'canceled'
		  };
		  var TaskTypes = {
		    DOCUMENTS_ADDITION_OR_UPDATE: 'documentAdditionOrUpdate',
		    DOCUMENT_DELETION: 'documentDeletion',
		    DUMP_CREATION: 'dumpCreation',
		    INDEX_CREATION: 'indexCreation',
		    INDEX_DELETION: 'indexDeletion',
		    INDEXES_SWAP: 'indexSwap',
		    INDEX_UPDATE: 'indexUpdate',
		    SETTINGS_UPDATE: 'settingsUpdate',
		    SNAPSHOT_CREATION: 'snapshotCreation',
		    TASK_CANCELATION: 'taskCancelation',
		    TASK_DELETION: 'taskDeletion'
		  };
		  var ErrorStatusCode = {
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_creation_failed */
		    INDEX_CREATION_FAILED: 'index_creation_failed',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_index_uid */
		    MISSING_INDEX_UID: 'missing_index_uid',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_already_exists */
		    INDEX_ALREADY_EXISTS: 'index_already_exists',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_not_found */
		    INDEX_NOT_FOUND: 'index_not_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_index_uid */
		    INVALID_INDEX_UID: 'invalid_index_uid',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_not_accessible */
		    INDEX_NOT_ACCESSIBLE: 'index_not_accessible',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_index_offset */
		    INVALID_INDEX_OFFSET: 'invalid_index_offset',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_index_limit */
		    INVALID_INDEX_LIMIT: 'invalid_index_limit',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_state */
		    INVALID_STATE: 'invalid_state',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#primary_key_inference_failed */
		    PRIMARY_KEY_INFERENCE_FAILED: 'primary_key_inference_failed',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_primary_key_already_exists */
		    INDEX_PRIMARY_KEY_ALREADY_EXISTS: 'index_primary_key_already_exists',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_index_primary_key */
		    INVALID_INDEX_PRIMARY_KEY: 'invalid_index_primary_key',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#max_fields_limit_exceeded */
		    DOCUMENTS_FIELDS_LIMIT_REACHED: 'document_fields_limit_reached',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_document_id */
		    MISSING_DOCUMENT_ID: 'missing_document_id',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_document_id */
		    INVALID_DOCUMENT_ID: 'invalid_document_id',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_content_type */
		    INVALID_CONTENT_TYPE: 'invalid_content_type',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_content_type */
		    MISSING_CONTENT_TYPE: 'missing_content_type',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_fields */
		    INVALID_DOCUMENT_FIELDS: 'invalid_document_fields',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_limit */
		    INVALID_DOCUMENT_LIMIT: 'invalid_document_limit',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_offset */
		    INVALID_DOCUMENT_OFFSET: 'invalid_document_offset',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_filter */
		    INVALID_DOCUMENT_FILTER: 'invalid_document_filter',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_document_filter */
		    MISSING_DOCUMENT_FILTER: 'missing_document_filter',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_vectors_field */
		    INVALID_DOCUMENT_VECTORS_FIELD: 'invalid_document_vectors_field',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#payload_too_large */
		    PAYLOAD_TOO_LARGE: 'payload_too_large',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_payload */
		    MISSING_PAYLOAD: 'missing_payload',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#malformed_payload */
		    MALFORMED_PAYLOAD: 'malformed_payload',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#no_space_left_on_device */
		    NO_SPACE_LEFT_ON_DEVICE: 'no_space_left_on_device',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_store_file */
		    INVALID_STORE_FILE: 'invalid_store_file',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_ranking_rules */
		    INVALID_RANKING_RULES: 'missing_document_id',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_request */
		    INVALID_REQUEST: 'invalid_request',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_document_geo_field */
		    INVALID_DOCUMENT_GEO_FIELD: 'invalid_document_geo_field',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_q */
		    INVALID_SEARCH_Q: 'invalid_search_q',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_offset */
		    INVALID_SEARCH_OFFSET: 'invalid_search_offset',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_limit */
		    INVALID_SEARCH_LIMIT: 'invalid_search_limit',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_page */
		    INVALID_SEARCH_PAGE: 'invalid_search_page',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_hits_per_page */
		    INVALID_SEARCH_HITS_PER_PAGE: 'invalid_search_hits_per_page',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_attributes_to_retrieve */
		    INVALID_SEARCH_ATTRIBUTES_TO_RETRIEVE: 'invalid_search_attributes_to_retrieve',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_attributes_to_crop */
		    INVALID_SEARCH_ATTRIBUTES_TO_CROP: 'invalid_search_attributes_to_crop',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_crop_length */
		    INVALID_SEARCH_CROP_LENGTH: 'invalid_search_crop_length',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_attributes_to_highlight */
		    INVALID_SEARCH_ATTRIBUTES_TO_HIGHLIGHT: 'invalid_search_attributes_to_highlight',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_show_matches_position */
		    INVALID_SEARCH_SHOW_MATCHES_POSITION: 'invalid_search_show_matches_position',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_filter */
		    INVALID_SEARCH_FILTER: 'invalid_search_filter',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_sort */
		    INVALID_SEARCH_SORT: 'invalid_search_sort',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_facets */
		    INVALID_SEARCH_FACETS: 'invalid_search_facets',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_highlight_pre_tag */
		    INVALID_SEARCH_HIGHLIGHT_PRE_TAG: 'invalid_search_highlight_pre_tag',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_highlight_post_tag */
		    INVALID_SEARCH_HIGHLIGHT_POST_TAG: 'invalid_search_highlight_post_tag',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_crop_marker */
		    INVALID_SEARCH_CROP_MARKER: 'invalid_search_crop_marker',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_matching_strategy */
		    INVALID_SEARCH_MATCHING_STRATEGY: 'invalid_search_matching_strategy',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_vector */
		    INVALID_SEARCH_VECTOR: 'invalid_search_vector',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_search_attributes_to_search_on */
		    INVALID_SEARCH_ATTRIBUTES_TO_SEARCH_ON: 'invalid_search_attributes_to_search_on',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#bad_request */
		    BAD_REQUEST: 'bad_request',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#document_not_found */
		    DOCUMENT_NOT_FOUND: 'document_not_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#internal */
		    INTERNAL: 'internal',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key */
		    INVALID_API_KEY: 'invalid_api_key',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_description */
		    INVALID_API_KEY_DESCRIPTION: 'invalid_api_key_description',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_actions */
		    INVALID_API_KEY_ACTIONS: 'invalid_api_key_actions',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_indexes */
		    INVALID_API_KEY_INDEXES: 'invalid_api_key_indexes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_expires_at */
		    INVALID_API_KEY_EXPIRES_AT: 'invalid_api_key_expires_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#api_key_not_found */
		    API_KEY_NOT_FOUND: 'api_key_not_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_uid */
		    IMMUTABLE_API_KEY_UID: 'immutable_api_key_uid',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_actions */
		    IMMUTABLE_API_KEY_ACTIONS: 'immutable_api_key_actions',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_indexes */
		    IMMUTABLE_API_KEY_INDEXES: 'immutable_api_key_indexes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_expires_at */
		    IMMUTABLE_API_KEY_EXPIRES_AT: 'immutable_api_key_expires_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_created_at */
		    IMMUTABLE_API_KEY_CREATED_AT: 'immutable_api_key_created_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_api_key_updated_at */
		    IMMUTABLE_API_KEY_UPDATED_AT: 'immutable_api_key_updated_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_authorization_header */
		    MISSING_AUTHORIZATION_HEADER: 'missing_authorization_header',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#unretrievable_document */
		    UNRETRIEVABLE_DOCUMENT: 'unretrievable_document',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#database_size_limit_reached */
		    MAX_DATABASE_SIZE_LIMIT_REACHED: 'database_size_limit_reached',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#task_not_found */
		    TASK_NOT_FOUND: 'task_not_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#dump_process_failed */
		    DUMP_PROCESS_FAILED: 'dump_process_failed',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#dump_not_found */
		    DUMP_NOT_FOUND: 'dump_not_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_swap_duplicate_index_found */
		    INVALID_SWAP_DUPLICATE_INDEX_FOUND: 'invalid_swap_duplicate_index_found',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_swap_indexes */
		    INVALID_SWAP_INDEXES: 'invalid_swap_indexes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_swap_indexes */
		    MISSING_SWAP_INDEXES: 'missing_swap_indexes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_master_key */
		    MISSING_MASTER_KEY: 'missing_master_key',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_types */
		    INVALID_TASK_TYPES: 'invalid_task_types',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_uids */
		    INVALID_TASK_UIDS: 'invalid_task_uids',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_statuses */
		    INVALID_TASK_STATUSES: 'invalid_task_statuses',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_limit */
		    INVALID_TASK_LIMIT: 'invalid_task_limit',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_from */
		    INVALID_TASK_FROM: 'invalid_task_from',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_canceled_by */
		    INVALID_TASK_CANCELED_BY: 'invalid_task_canceled_by',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_task_filters */
		    MISSING_TASK_FILTERS: 'missing_task_filters',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#too_many_open_files */
		    TOO_MANY_OPEN_FILES: 'too_many_open_files',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#io_error */
		    IO_ERROR: 'io_error',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_index_uids */
		    INVALID_TASK_INDEX_UIDS: 'invalid_task_index_uids',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_index_uid */
		    IMMUTABLE_INDEX_UID: 'immutable_index_uid',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_index_created_at */
		    IMMUTABLE_INDEX_CREATED_AT: 'immutable_index_created_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#immutable_index_updated_at */
		    IMMUTABLE_INDEX_UPDATED_AT: 'immutable_index_updated_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_displayed_attributes */
		    INVALID_SETTINGS_DISPLAYED_ATTRIBUTES: 'invalid_settings_displayed_attributes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_searchable_attributes */
		    INVALID_SETTINGS_SEARCHABLE_ATTRIBUTES: 'invalid_settings_searchable_attributes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_filterable_attributes */
		    INVALID_SETTINGS_FILTERABLE_ATTRIBUTES: 'invalid_settings_filterable_attributes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_sortable_attributes */
		    INVALID_SETTINGS_SORTABLE_ATTRIBUTES: 'invalid_settings_sortable_attributes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_ranking_rules */
		    INVALID_SETTINGS_RANKING_RULES: 'invalid_settings_ranking_rules',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_stop_words */
		    INVALID_SETTINGS_STOP_WORDS: 'invalid_settings_stop_words',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_synonyms */
		    INVALID_SETTINGS_SYNONYMS: 'invalid_settings_synonyms',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_distinct_attribute */
		    INVALID_SETTINGS_DISTINCT_ATTRIBUTE: 'invalid_settings_distinct_attribute',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_typo_tolerance */
		    INVALID_SETTINGS_TYPO_TOLERANCE: 'invalid_settings_typo_tolerance',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_faceting */
		    INVALID_SETTINGS_FACETING: 'invalid_settings_faceting',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_settings_pagination */
		    INVALID_SETTINGS_PAGINATION: 'invalid_settings_pagination',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_before_enqueued_at */
		    INVALID_TASK_BEFORE_ENQUEUED_AT: 'invalid_task_before_enqueued_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_after_enqueued_at */
		    INVALID_TASK_AFTER_ENQUEUED_AT: 'invalid_task_after_enqueued_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_before_started_at */
		    INVALID_TASK_BEFORE_STARTED_AT: 'invalid_task_before_started_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_after_started_at */
		    INVALID_TASK_AFTER_STARTED_AT: 'invalid_task_after_started_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_before_finished_at */
		    INVALID_TASK_BEFORE_FINISHED_AT: 'invalid_task_before_finished_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_task_after_finished_at */
		    INVALID_TASK_AFTER_FINISHED_AT: 'invalid_task_after_finished_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_api_key_actions */
		    MISSING_API_KEY_ACTIONS: 'missing_api_key_actions',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_api_key_indexes */
		    MISSING_API_KEY_INDEXES: 'missing_api_key_indexes',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_api_key_expires_at */
		    MISSING_API_KEY_EXPIRES_AT: 'missing_api_key_expires_at',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_limit */
		    INVALID_API_KEY_LIMIT: 'invalid_api_key_limit',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_api_key_offset */
		    INVALID_API_KEY_OFFSET: 'invalid_api_key_offset',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_facet_search_facet_name */
		    INVALID_FACET_SEARCH_FACET_NAME: 'invalid_facet_search_facet_name',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#missing_facet_search_facet_name */
		    MISSING_FACET_SEARCH_FACET_NAME: 'missing_facet_search_facet_name',
		    /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#invalid_facet_search_facet_query */
		    INVALID_FACET_SEARCH_FACET_QUERY: 'invalid_facet_search_facet_query'
		  };

		  function _iterableToArrayLimit(r, l) {
		    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
		    if (null != t) {
		      var e,
		        n,
		        i,
		        u,
		        a = [],
		        f = true,
		        o = false;
		      try {
		        if (i = (t = t.call(r)).next, 0 === l) ; else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
		      } catch (r) {
		        o = true, n = r;
		      } finally {
		        try {
		          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
		        } finally {
		          if (o) throw n;
		        }
		      }
		      return a;
		    }
		  }
		  function _regeneratorRuntime() {
		    _regeneratorRuntime = function () {
		      return e;
		    };
		    var t,
		      e = {},
		      r = Object.prototype,
		      n = r.hasOwnProperty,
		      o = Object.defineProperty || function (t, e, r) {
		        t[e] = r.value;
		      },
		      i = "function" == typeof Symbol ? Symbol : {},
		      a = i.iterator || "@@iterator",
		      c = i.asyncIterator || "@@asyncIterator",
		      u = i.toStringTag || "@@toStringTag";
		    function define(t, e, r) {
		      return Object.defineProperty(t, e, {
		        value: r,
		        enumerable: true,
		        configurable: true,
		        writable: true
		      }), t[e];
		    }
		    try {
		      define({}, "");
		    } catch (t) {
		      define = function (t, e, r) {
		        return t[e] = r;
		      };
		    }
		    function wrap(t, e, r, n) {
		      var i = e && e.prototype instanceof Generator ? e : Generator,
		        a = Object.create(i.prototype),
		        c = new Context(n || []);
		      return o(a, "_invoke", {
		        value: makeInvokeMethod(t, r, c)
		      }), a;
		    }
		    function tryCatch(t, e, r) {
		      try {
		        return {
		          type: "normal",
		          arg: t.call(e, r)
		        };
		      } catch (t) {
		        return {
		          type: "throw",
		          arg: t
		        };
		      }
		    }
		    e.wrap = wrap;
		    var h = "suspendedStart",
		      l = "suspendedYield",
		      f = "executing",
		      s = "completed",
		      y = {};
		    function Generator() {}
		    function GeneratorFunction() {}
		    function GeneratorFunctionPrototype() {}
		    var p = {};
		    define(p, a, function () {
		      return this;
		    });
		    var d = Object.getPrototypeOf,
		      v = d && d(d(values([])));
		    v && v !== r && n.call(v, a) && (p = v);
		    var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p);
		    function defineIteratorMethods(t) {
		      ["next", "throw", "return"].forEach(function (e) {
		        define(t, e, function (t) {
		          return this._invoke(e, t);
		        });
		      });
		    }
		    function AsyncIterator(t, e) {
		      function invoke(r, o, i, a) {
		        var c = tryCatch(t[r], t, o);
		        if ("throw" !== c.type) {
		          var u = c.arg,
		            h = u.value;
		          return h && "object" == typeof h && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) {
		            invoke("next", t, i, a);
		          }, function (t) {
		            invoke("throw", t, i, a);
		          }) : e.resolve(h).then(function (t) {
		            u.value = t, i(u);
		          }, function (t) {
		            return invoke("throw", t, i, a);
		          });
		        }
		        a(c.arg);
		      }
		      var r;
		      o(this, "_invoke", {
		        value: function (t, n) {
		          function callInvokeWithMethodAndArg() {
		            return new e(function (e, r) {
		              invoke(t, n, e, r);
		            });
		          }
		          return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
		        }
		      });
		    }
		    function makeInvokeMethod(e, r, n) {
		      var o = h;
		      return function (i, a) {
		        if (o === f) throw new Error("Generator is already running");
		        if (o === s) {
		          if ("throw" === i) throw a;
		          return {
		            value: t,
		            done: true
		          };
		        }
		        for (n.method = i, n.arg = a;;) {
		          var c = n.delegate;
		          if (c) {
		            var u = maybeInvokeDelegate(c, n);
		            if (u) {
		              if (u === y) continue;
		              return u;
		            }
		          }
		          if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) {
		            if (o === h) throw o = s, n.arg;
		            n.dispatchException(n.arg);
		          } else "return" === n.method && n.abrupt("return", n.arg);
		          o = f;
		          var p = tryCatch(e, r, n);
		          if ("normal" === p.type) {
		            if (o = n.done ? s : l, p.arg === y) continue;
		            return {
		              value: p.arg,
		              done: n.done
		            };
		          }
		          "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg);
		        }
		      };
		    }
		    function maybeInvokeDelegate(e, r) {
		      var n = r.method,
		        o = e.iterator[n];
		      if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y;
		      var i = tryCatch(o, e.iterator, r.arg);
		      if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y;
		      var a = i.arg;
		      return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y);
		    }
		    function pushTryEntry(t) {
		      var e = {
		        tryLoc: t[0]
		      };
		      1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e);
		    }
		    function resetTryEntry(t) {
		      var e = t.completion || {};
		      e.type = "normal", delete e.arg, t.completion = e;
		    }
		    function Context(t) {
		      this.tryEntries = [{
		        tryLoc: "root"
		      }], t.forEach(pushTryEntry, this), this.reset(true);
		    }
		    function values(e) {
		      if (e || "" === e) {
		        var r = e[a];
		        if (r) return r.call(e);
		        if ("function" == typeof e.next) return e;
		        if (!isNaN(e.length)) {
		          var o = -1,
		            i = function next() {
		              for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = false, next;
		              return next.value = t, next.done = true, next;
		            };
		          return i.next = i;
		        }
		      }
		      throw new TypeError(typeof e + " is not iterable");
		    }
		    return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", {
		      value: GeneratorFunctionPrototype,
		      configurable: true
		    }), o(GeneratorFunctionPrototype, "constructor", {
		      value: GeneratorFunction,
		      configurable: true
		    }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) {
		      var e = "function" == typeof t && t.constructor;
		      return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name));
		    }, e.mark = function (t) {
		      return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t;
		    }, e.awrap = function (t) {
		      return {
		        __await: t
		      };
		    }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () {
		      return this;
		    }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) {
		      void 0 === i && (i = Promise);
		      var a = new AsyncIterator(wrap(t, r, n, o), i);
		      return e.isGeneratorFunction(r) ? a : a.next().then(function (t) {
		        return t.done ? t.value : a.next();
		      });
		    }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () {
		      return this;
		    }), define(g, "toString", function () {
		      return "[object Generator]";
		    }), e.keys = function (t) {
		      var e = Object(t),
		        r = [];
		      for (var n in e) r.push(n);
		      return r.reverse(), function next() {
		        for (; r.length;) {
		          var t = r.pop();
		          if (t in e) return next.value = t, next.done = false, next;
		        }
		        return next.done = true, next;
		      };
		    }, e.values = values, Context.prototype = {
		      constructor: Context,
		      reset: function (e) {
		        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = false, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t);
		      },
		      stop: function () {
		        this.done = true;
		        var t = this.tryEntries[0].completion;
		        if ("throw" === t.type) throw t.arg;
		        return this.rval;
		      },
		      dispatchException: function (e) {
		        if (this.done) throw e;
		        var r = this;
		        function handle(n, o) {
		          return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o;
		        }
		        for (var o = this.tryEntries.length - 1; o >= 0; --o) {
		          var i = this.tryEntries[o],
		            a = i.completion;
		          if ("root" === i.tryLoc) return handle("end");
		          if (i.tryLoc <= this.prev) {
		            var c = n.call(i, "catchLoc"),
		              u = n.call(i, "finallyLoc");
		            if (c && u) {
		              if (this.prev < i.catchLoc) return handle(i.catchLoc, true);
		              if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
		            } else if (c) {
		              if (this.prev < i.catchLoc) return handle(i.catchLoc, true);
		            } else {
		              if (!u) throw new Error("try statement without catch or finally");
		              if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
		            }
		          }
		        }
		      },
		      abrupt: function (t, e) {
		        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
		          var o = this.tryEntries[r];
		          if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
		            var i = o;
		            break;
		          }
		        }
		        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
		        var a = i ? i.completion : {};
		        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a);
		      },
		      complete: function (t, e) {
		        if ("throw" === t.type) throw t.arg;
		        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y;
		      },
		      finish: function (t) {
		        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
		          var r = this.tryEntries[e];
		          if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y;
		        }
		      },
		      catch: function (t) {
		        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
		          var r = this.tryEntries[e];
		          if (r.tryLoc === t) {
		            var n = r.completion;
		            if ("throw" === n.type) {
		              var o = n.arg;
		              resetTryEntry(r);
		            }
		            return o;
		          }
		        }
		        throw new Error("illegal catch attempt");
		      },
		      delegateYield: function (e, r, n) {
		        return this.delegate = {
		          iterator: values(e),
		          resultName: r,
		          nextLoc: n
		        }, "next" === this.method && (this.arg = t), y;
		      }
		    }, e;
		  }
		  function _toPrimitive(t, r) {
		    if ("object" != typeof t || !t) return t;
		    var e = t[Symbol.toPrimitive];
		    if (void 0 !== e) {
		      var i = e.call(t, r);
		      if ("object" != typeof i) return i;
		      throw new TypeError("@@toPrimitive must return a primitive value.");
		    }
		    return (String )(t);
		  }
		  function _toPropertyKey(t) {
		    var i = _toPrimitive(t, "string");
		    return "symbol" == typeof i ? i : String(i);
		  }
		  function _typeof(o) {
		    "@babel/helpers - typeof";

		    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
		      return typeof o;
		    } : function (o) {
		      return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		    }, _typeof(o);
		  }
		  function _classCallCheck(instance, Constructor) {
		    if (!(instance instanceof Constructor)) {
		      throw new TypeError("Cannot call a class as a function");
		    }
		  }
		  function _defineProperties(target, props) {
		    for (var i = 0; i < props.length; i++) {
		      var descriptor = props[i];
		      descriptor.enumerable = descriptor.enumerable || false;
		      descriptor.configurable = true;
		      if ("value" in descriptor) descriptor.writable = true;
		      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
		    }
		  }
		  function _createClass(Constructor, protoProps, staticProps) {
		    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
		    if (staticProps) _defineProperties(Constructor, staticProps);
		    Object.defineProperty(Constructor, "prototype", {
		      writable: false
		    });
		    return Constructor;
		  }
		  function _defineProperty(obj, key, value) {
		    key = _toPropertyKey(key);
		    if (key in obj) {
		      Object.defineProperty(obj, key, {
		        value: value,
		        enumerable: true,
		        configurable: true,
		        writable: true
		      });
		    } else {
		      obj[key] = value;
		    }
		    return obj;
		  }
		  function _inherits(subClass, superClass) {
		    if (typeof superClass !== "function" && superClass !== null) {
		      throw new TypeError("Super expression must either be null or a function");
		    }
		    subClass.prototype = Object.create(superClass && superClass.prototype, {
		      constructor: {
		        value: subClass,
		        writable: true,
		        configurable: true
		      }
		    });
		    Object.defineProperty(subClass, "prototype", {
		      writable: false
		    });
		    if (superClass) _setPrototypeOf(subClass, superClass);
		  }
		  function _getPrototypeOf(o) {
		    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
		      return o.__proto__ || Object.getPrototypeOf(o);
		    };
		    return _getPrototypeOf(o);
		  }
		  function _setPrototypeOf(o, p) {
		    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
		      o.__proto__ = p;
		      return o;
		    };
		    return _setPrototypeOf(o, p);
		  }
		  function _isNativeReflectConstruct() {
		    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
		    if (Reflect.construct.sham) return false;
		    if (typeof Proxy === "function") return true;
		    try {
		      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
		      return true;
		    } catch (e) {
		      return false;
		    }
		  }
		  function _construct(Parent, args, Class) {
		    if (_isNativeReflectConstruct()) {
		      _construct = Reflect.construct.bind();
		    } else {
		      _construct = function _construct(Parent, args, Class) {
		        var a = [null];
		        a.push.apply(a, args);
		        var Constructor = Function.bind.apply(Parent, a);
		        var instance = new Constructor();
		        if (Class) _setPrototypeOf(instance, Class.prototype);
		        return instance;
		      };
		    }
		    return _construct.apply(null, arguments);
		  }
		  function _isNativeFunction(fn) {
		    try {
		      return Function.toString.call(fn).indexOf("[native code]") !== -1;
		    } catch (e) {
		      return typeof fn === "function";
		    }
		  }
		  function _wrapNativeSuper(Class) {
		    var _cache = typeof Map === "function" ? new Map() : undefined;
		    _wrapNativeSuper = function _wrapNativeSuper(Class) {
		      if (Class === null || !_isNativeFunction(Class)) return Class;
		      if (typeof Class !== "function") {
		        throw new TypeError("Super expression must either be null or a function");
		      }
		      if (typeof _cache !== "undefined") {
		        if (_cache.has(Class)) return _cache.get(Class);
		        _cache.set(Class, Wrapper);
		      }
		      function Wrapper() {
		        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
		      }
		      Wrapper.prototype = Object.create(Class.prototype, {
		        constructor: {
		          value: Wrapper,
		          enumerable: false,
		          writable: true,
		          configurable: true
		        }
		      });
		      return _setPrototypeOf(Wrapper, Class);
		    };
		    return _wrapNativeSuper(Class);
		  }
		  function _assertThisInitialized(self) {
		    if (self === void 0) {
		      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
		    }
		    return self;
		  }
		  function _possibleConstructorReturn(self, call) {
		    if (call && (typeof call === "object" || typeof call === "function")) {
		      return call;
		    } else if (call !== void 0) {
		      throw new TypeError("Derived constructors may only return object or undefined");
		    }
		    return _assertThisInitialized(self);
		  }
		  function _createSuper(Derived) {
		    var hasNativeReflectConstruct = _isNativeReflectConstruct();
		    return function _createSuperInternal() {
		      var Super = _getPrototypeOf(Derived),
		        result;
		      if (hasNativeReflectConstruct) {
		        var NewTarget = _getPrototypeOf(this).constructor;
		        result = Reflect.construct(Super, arguments, NewTarget);
		      } else {
		        result = Super.apply(this, arguments);
		      }
		      return _possibleConstructorReturn(this, result);
		    };
		  }
		  function _slicedToArray(arr, i) {
		    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
		  }
		  function _arrayWithHoles(arr) {
		    if (Array.isArray(arr)) return arr;
		  }
		  function _unsupportedIterableToArray(o, minLen) {
		    if (!o) return;
		    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
		    var n = Object.prototype.toString.call(o).slice(8, -1);
		    if (n === "Object" && o.constructor) n = o.constructor.name;
		    if (n === "Map" || n === "Set") return Array.from(o);
		    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
		  }
		  function _arrayLikeToArray(arr, len) {
		    if (len == null || len > arr.length) len = arr.length;
		    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
		    return arr2;
		  }
		  function _nonIterableRest() {
		    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
		  }
		  function _createForOfIteratorHelper(o, allowArrayLike) {
		    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
		    if (!it) {
		      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) {
		        if (it) o = it;
		        var i = 0;
		        var F = function () {};
		        return {
		          s: F,
		          n: function () {
		            if (i >= o.length) return {
		              done: true
		            };
		            return {
		              done: false,
		              value: o[i++]
		            };
		          },
		          e: function (e) {
		            throw e;
		          },
		          f: F
		        };
		      }
		      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
		    }
		    var normalCompletion = true,
		      didErr = false,
		      err;
		    return {
		      s: function () {
		        it = it.call(o);
		      },
		      n: function () {
		        var step = it.next();
		        normalCompletion = step.done;
		        return step;
		      },
		      e: function (e) {
		        didErr = true;
		        err = e;
		      },
		      f: function () {
		        try {
		          if (!normalCompletion && it.return != null) it.return();
		        } finally {
		          if (didErr) throw err;
		        }
		      }
		    };
		  }

		  /******************************************************************************
		  Copyright (c) Microsoft Corporation.

		  Permission to use, copy, modify, and/or distribute this software for any
		  purpose with or without fee is hereby granted.

		  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
		  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
		  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
		  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
		  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
		  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
		  PERFORMANCE OF THIS SOFTWARE.
		  ***************************************************************************** */

		  function __awaiter(thisArg, _arguments, P, generator) {
		      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
		      return new (P || (P = Promise))(function (resolve, reject) {
		          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
		          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		          step((generator = generator.apply(thisArg, [])).next());
		      });
		  }

		  var MeiliSearchError = /*#__PURE__*/function (_Error) {
		    _inherits(MeiliSearchError, _Error);
		    var _super = _createSuper(MeiliSearchError);
		    function MeiliSearchError(message) {
		      var _this;
		      _classCallCheck(this, MeiliSearchError);
		      _this = _super.call(this, message);
		      // Make errors comparison possible. ex: error instanceof MeiliSearchError.
		      Object.setPrototypeOf(_assertThisInitialized(_this), MeiliSearchError.prototype);
		      _this.name = 'MeiliSearchError';
		      if (Error.captureStackTrace) {
		        Error.captureStackTrace(_assertThisInitialized(_this), MeiliSearchError);
		      }
		      return _this;
		    }
		    return _createClass(MeiliSearchError);
		  }( /*#__PURE__*/_wrapNativeSuper(Error));

		  var MeiliSearchCommunicationError = /*#__PURE__*/function (_MeiliSearchError) {
		    _inherits(MeiliSearchCommunicationError, _MeiliSearchError);
		    var _super = _createSuper(MeiliSearchCommunicationError);
		    function MeiliSearchCommunicationError(message, body, url, stack) {
		      var _this;
		      _classCallCheck(this, MeiliSearchCommunicationError);
		      var _a, _b, _c;
		      _this = _super.call(this, message);
		      // Make errors comparison possible. ex: error instanceof MeiliSearchCommunicationError.
		      Object.setPrototypeOf(_assertThisInitialized(_this), MeiliSearchCommunicationError.prototype);
		      _this.name = 'MeiliSearchCommunicationError';
		      if (body instanceof Response) {
		        _this.message = body.statusText;
		        _this.statusCode = body.status;
		      }
		      if (body instanceof Error) {
		        _this.errno = body.errno;
		        _this.code = body.code;
		      }
		      if (stack) {
		        _this.stack = stack;
		        _this.stack = (_a = _this.stack) === null || _a === void 0 ? void 0 : _a.replace(/(TypeError|FetchError)/, _this.name);
		        _this.stack = (_b = _this.stack) === null || _b === void 0 ? void 0 : _b.replace('Failed to fetch', "request to ".concat(url, " failed, reason: connect ECONNREFUSED"));
		        _this.stack = (_c = _this.stack) === null || _c === void 0 ? void 0 : _c.replace('Not Found', "Not Found: ".concat(url));
		      } else {
		        if (Error.captureStackTrace) {
		          Error.captureStackTrace(_assertThisInitialized(_this), MeiliSearchCommunicationError);
		        }
		      }
		      return _this;
		    }
		    return _createClass(MeiliSearchCommunicationError);
		  }(MeiliSearchError);

		  var MeiliSearchApiError = /*#__PURE__*/function (_MeiliSearchError) {
		    _inherits(MeiliSearchApiError, _MeiliSearchError);
		    var _super = _createSuper(MeiliSearchApiError);
		    function MeiliSearchApiError(error, status) {
		      var _this;
		      _classCallCheck(this, MeiliSearchApiError);
		      _this = _super.call(this, error.message);
		      // Make errors comparison possible. ex: error instanceof MeiliSearchApiError.
		      Object.setPrototypeOf(_assertThisInitialized(_this), MeiliSearchApiError.prototype);
		      _this.name = 'MeiliSearchApiError';
		      _this.code = error.code;
		      _this.type = error.type;
		      _this.link = error.link;
		      _this.message = error.message;
		      _this.httpStatus = status;
		      if (Error.captureStackTrace) {
		        Error.captureStackTrace(_assertThisInitialized(_this), MeiliSearchApiError);
		      }
		      return _this;
		    }
		    return _createClass(MeiliSearchApiError);
		  }(MeiliSearchError);

		  function httpResponseErrorHandler(response) {
		    return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		      var responseBody;
		      return _regeneratorRuntime().wrap(function _callee$(_context) {
		        while (1) switch (_context.prev = _context.next) {
		          case 0:
		            if (response.ok) {
		              _context.next = 11;
		              break;
		            }
		            _context.prev = 1;
		            _context.next = 4;
		            return response.json();
		          case 4:
		            responseBody = _context.sent;
		            _context.next = 10;
		            break;
		          case 7:
		            _context.prev = 7;
		            _context.t0 = _context["catch"](1);
		            throw new MeiliSearchCommunicationError(response.statusText, response, response.url);
		          case 10:
		            throw new MeiliSearchApiError(responseBody, response.status);
		          case 11:
		            return _context.abrupt("return", response);
		          case 12:
		          case "end":
		            return _context.stop();
		        }
		      }, _callee, null, [[1, 7]]);
		    }));
		  }
		  function httpErrorHandler(response, stack, url) {
		    if (response.name !== 'MeiliSearchApiError') {
		      throw new MeiliSearchCommunicationError(response.message, response, url, stack);
		    }
		    throw response;
		  }

		  var MeiliSearchTimeOutError = /*#__PURE__*/function (_MeiliSearchError) {
		    _inherits(MeiliSearchTimeOutError, _MeiliSearchError);
		    var _super = _createSuper(MeiliSearchTimeOutError);
		    function MeiliSearchTimeOutError(message) {
		      var _this;
		      _classCallCheck(this, MeiliSearchTimeOutError);
		      _this = _super.call(this, message);
		      // Make errors comparison possible. ex: error instanceof MeiliSearchTimeOutError.
		      Object.setPrototypeOf(_assertThisInitialized(_this), MeiliSearchTimeOutError.prototype);
		      _this.name = 'MeiliSearchTimeOutError';
		      if (Error.captureStackTrace) {
		        Error.captureStackTrace(_assertThisInitialized(_this), MeiliSearchTimeOutError);
		      }
		      return _this;
		    }
		    return _createClass(MeiliSearchTimeOutError);
		  }(MeiliSearchError);

		  function versionErrorHintMessage(message, method) {
		    return "".concat(message, "\nHint: It might not be working because maybe you're not up to date with the Meilisearch version that ").concat(method, " call requires.");
		  }

		  /** Removes undefined entries from object */
		  function removeUndefinedFromObject(obj) {
		    return Object.entries(obj).reduce(function (acc, curEntry) {
		      var _curEntry = _slicedToArray(curEntry, 2),
		        key = _curEntry[0],
		        val = _curEntry[1];
		      if (val !== undefined) acc[key] = val;
		      return acc;
		    }, {});
		  }
		  function sleep(ms) {
		    return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		      return _regeneratorRuntime().wrap(function _callee$(_context) {
		        while (1) switch (_context.prev = _context.next) {
		          case 0:
		            _context.next = 2;
		            return new Promise(function (resolve) {
		              return setTimeout(resolve, ms);
		            });
		          case 2:
		            return _context.abrupt("return", _context.sent);
		          case 3:
		          case "end":
		            return _context.stop();
		        }
		      }, _callee);
		    }));
		  }
		  function addProtocolIfNotPresent(host) {
		    if (!(host.startsWith('https://') || host.startsWith('http://'))) {
		      return "http://".concat(host);
		    }
		    return host;
		  }
		  function addTrailingSlash(url) {
		    if (!url.endsWith('/')) {
		      url += '/';
		    }
		    return url;
		  }

		  var PACKAGE_VERSION = '0.37.0';

		  function toQueryParams(parameters) {
		    var params = Object.keys(parameters);
		    var queryParams = params.reduce(function (acc, key) {
		      var value = parameters[key];
		      if (value === undefined) {
		        return acc;
		      } else if (Array.isArray(value)) {
		        return Object.assign(Object.assign({}, acc), _defineProperty({}, key, value.join(',')));
		      } else if (value instanceof Date) {
		        return Object.assign(Object.assign({}, acc), _defineProperty({}, key, value.toISOString()));
		      }
		      return Object.assign(Object.assign({}, acc), _defineProperty({}, key, value));
		    }, {});
		    return queryParams;
		  }
		  function constructHostURL(host) {
		    try {
		      host = addProtocolIfNotPresent(host);
		      host = addTrailingSlash(host);
		      return host;
		    } catch (e) {
		      throw new MeiliSearchError('The provided host is not valid.');
		    }
		  }
		  function cloneAndParseHeaders(headers) {
		    if (Array.isArray(headers)) {
		      return headers.reduce(function (acc, headerPair) {
		        acc[headerPair[0]] = headerPair[1];
		        return acc;
		      }, {});
		    } else if ('has' in headers) {
		      var clonedHeaders = {};
		      headers.forEach(function (value, key) {
		        return clonedHeaders[key] = value;
		      });
		      return clonedHeaders;
		    } else {
		      return Object.assign({}, headers);
		    }
		  }
		  function createHeaders(config) {
		    var _a, _b;
		    var agentHeader = 'X-Meilisearch-Client';
		    var packageAgent = "Meilisearch JavaScript (v".concat(PACKAGE_VERSION, ")");
		    var contentType = 'Content-Type';
		    var authorization = 'Authorization';
		    var headers = cloneAndParseHeaders((_b = (_a = config.requestConfig) === null || _a === void 0 ? void 0 : _a.headers) !== null && _b !== void 0 ? _b : {});
		    // do not override if user provided the header
		    if (config.apiKey && !headers[authorization]) {
		      headers[authorization] = "Bearer ".concat(config.apiKey);
		    }
		    if (!headers[contentType]) {
		      headers['Content-Type'] = 'application/json';
		    }
		    // Creates the custom user agent with information on the package used.
		    if (config.clientAgents && Array.isArray(config.clientAgents)) {
		      var clients = config.clientAgents.concat(packageAgent);
		      headers[agentHeader] = clients.join(' ; ');
		    } else if (config.clientAgents && !Array.isArray(config.clientAgents)) {
		      // If the header is defined but not an array
		      throw new MeiliSearchError("Meilisearch: The header \"".concat(agentHeader, "\" should be an array of string(s).\n"));
		    } else {
		      headers[agentHeader] = packageAgent;
		    }
		    return headers;
		  }
		  var HttpRequests = /*#__PURE__*/function () {
		    function HttpRequests(config) {
		      _classCallCheck(this, HttpRequests);
		      this.headers = createHeaders(config);
		      this.requestConfig = config.requestConfig;
		      this.httpClient = config.httpClient;
		      this.requestTimeout = config.timeout;
		      try {
		        var host = constructHostURL(config.host);
		        this.url = new URL(host);
		      } catch (e) {
		        throw new MeiliSearchError('The provided host is not valid.');
		      }
		    }
		    _createClass(HttpRequests, [{
		      key: "request",
		      value: function request(_ref) {
		        var method = _ref.method,
		          url = _ref.url,
		          params = _ref.params,
		          body = _ref.body,
		          _ref$config = _ref.config,
		          config = _ref$config === void 0 ? {} : _ref$config;
		        var _a;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		          var constructURL, queryParams, headers, result, response, parsedBody, stack;
		          return _regeneratorRuntime().wrap(function _callee$(_context) {
		            while (1) switch (_context.prev = _context.next) {
		              case 0:
		                if (typeof fetch === 'undefined') {
		                  requireBrowserPolyfill();
		                }
		                constructURL = new URL(url, this.url);
		                if (params) {
		                  queryParams = new URLSearchParams();
		                  Object.keys(params).filter(function (x) {
		                    return params[x] !== null;
		                  }).map(function (x) {
		                    return queryParams.set(x, params[x]);
		                  });
		                  constructURL.search = queryParams.toString();
		                }
		                // in case a custom content-type is provided
		                // do not stringify body
		                if (!((_a = config.headers) === null || _a === void 0 ? void 0 : _a['Content-Type'])) {
		                  body = JSON.stringify(body);
		                }
		                headers = Object.assign(Object.assign({}, this.headers), config.headers);
		                _context.prev = 5;
		                result = this.fetchWithTimeout(constructURL.toString(), Object.assign(Object.assign(Object.assign({}, config), this.requestConfig), {
		                  method: method,
		                  body: body,
		                  headers: headers
		                }), this.requestTimeout); // When using a custom HTTP client, the response is returned to allow the user to parse/handle it as they see fit
		                if (!this.httpClient) {
		                  _context.next = 11;
		                  break;
		                }
		                _context.next = 10;
		                return result;
		              case 10:
		                return _context.abrupt("return", _context.sent);
		              case 11:
		                _context.next = 13;
		                return result.then(function (res) {
		                  return httpResponseErrorHandler(res);
		                });
		              case 13:
		                response = _context.sent;
		                _context.next = 16;
		                return response.json().catch(function () {
		                  return undefined;
		                });
		              case 16:
		                parsedBody = _context.sent;
		                return _context.abrupt("return", parsedBody);
		              case 20:
		                _context.prev = 20;
		                _context.t0 = _context["catch"](5);
		                stack = _context.t0.stack;
		                httpErrorHandler(_context.t0, stack, constructURL.toString());
		              case 24:
		              case "end":
		                return _context.stop();
		            }
		          }, _callee, this, [[5, 20]]);
		        }));
		      }
		    }, {
		      key: "fetchWithTimeout",
		      value: function fetchWithTimeout(url, options, timeout) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
		          var _this = this;
		          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
		            while (1) switch (_context2.prev = _context2.next) {
		              case 0:
		                return _context2.abrupt("return", new Promise(function (resolve, reject) {
		                  var fetchFn = _this.httpClient ? _this.httpClient : fetch;
		                  var fetchPromise = fetchFn(url, options);
		                  var promises = [fetchPromise];
		                  // TimeoutPromise will not run if undefined or zero
		                  var timeoutId;
		                  if (timeout) {
		                    var timeoutPromise = new Promise(function (_, reject) {
		                      timeoutId = setTimeout(function () {
		                        reject(new Error('Error: Request Timed Out'));
		                      }, timeout);
		                    });
		                    promises.push(timeoutPromise);
		                  }
		                  Promise.race(promises).then(resolve).catch(reject).finally(function () {
		                    clearTimeout(timeoutId);
		                  });
		                }));
		              case 1:
		              case "end":
		                return _context2.stop();
		            }
		          }, _callee2);
		        }));
		      }
		    }, {
		      key: "get",
		      value: function get(url, params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
		          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
		            while (1) switch (_context3.prev = _context3.next) {
		              case 0:
		                _context3.next = 2;
		                return this.request({
		                  method: 'GET',
		                  url: url,
		                  params: params,
		                  config: config
		                });
		              case 2:
		                return _context3.abrupt("return", _context3.sent);
		              case 3:
		              case "end":
		                return _context3.stop();
		            }
		          }, _callee3, this);
		        }));
		      }
		    }, {
		      key: "post",
		      value: function post(url, data, params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
		          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
		            while (1) switch (_context4.prev = _context4.next) {
		              case 0:
		                _context4.next = 2;
		                return this.request({
		                  method: 'POST',
		                  url: url,
		                  body: data,
		                  params: params,
		                  config: config
		                });
		              case 2:
		                return _context4.abrupt("return", _context4.sent);
		              case 3:
		              case "end":
		                return _context4.stop();
		            }
		          }, _callee4, this);
		        }));
		      }
		    }, {
		      key: "put",
		      value: function put(url, data, params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
		          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
		            while (1) switch (_context5.prev = _context5.next) {
		              case 0:
		                _context5.next = 2;
		                return this.request({
		                  method: 'PUT',
		                  url: url,
		                  body: data,
		                  params: params,
		                  config: config
		                });
		              case 2:
		                return _context5.abrupt("return", _context5.sent);
		              case 3:
		              case "end":
		                return _context5.stop();
		            }
		          }, _callee5, this);
		        }));
		      }
		    }, {
		      key: "patch",
		      value: function patch(url, data, params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
		          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
		            while (1) switch (_context6.prev = _context6.next) {
		              case 0:
		                _context6.next = 2;
		                return this.request({
		                  method: 'PATCH',
		                  url: url,
		                  body: data,
		                  params: params,
		                  config: config
		                });
		              case 2:
		                return _context6.abrupt("return", _context6.sent);
		              case 3:
		              case "end":
		                return _context6.stop();
		            }
		          }, _callee6, this);
		        }));
		      }
		    }, {
		      key: "delete",
		      value: function _delete(url, data, params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
		          return _regeneratorRuntime().wrap(function _callee7$(_context7) {
		            while (1) switch (_context7.prev = _context7.next) {
		              case 0:
		                _context7.next = 2;
		                return this.request({
		                  method: 'DELETE',
		                  url: url,
		                  body: data,
		                  params: params,
		                  config: config
		                });
		              case 2:
		                return _context7.abrupt("return", _context7.sent);
		              case 3:
		              case "end":
		                return _context7.stop();
		            }
		          }, _callee7, this);
		        }));
		      }
		    }]);
		    return HttpRequests;
		  }();

		  var EnqueuedTask = /*#__PURE__*/_createClass(function EnqueuedTask(task) {
		    _classCallCheck(this, EnqueuedTask);
		    this.taskUid = task.taskUid;
		    this.indexUid = task.indexUid;
		    this.status = task.status;
		    this.type = task.type;
		    this.enqueuedAt = new Date(task.enqueuedAt);
		  });

		  var Task = /*#__PURE__*/_createClass(function Task(task) {
		    _classCallCheck(this, Task);
		    this.indexUid = task.indexUid;
		    this.status = task.status;
		    this.type = task.type;
		    this.uid = task.uid;
		    this.details = task.details;
		    this.canceledBy = task.canceledBy;
		    this.error = task.error;
		    this.duration = task.duration;
		    this.startedAt = new Date(task.startedAt);
		    this.enqueuedAt = new Date(task.enqueuedAt);
		    this.finishedAt = new Date(task.finishedAt);
		  });
		  var TaskClient = /*#__PURE__*/function () {
		    function TaskClient(config) {
		      _classCallCheck(this, TaskClient);
		      this.httpRequest = new HttpRequests(config);
		    }
		    /**
		     * Get one task
		     *
		     * @param uid - Unique identifier of the task
		     * @returns
		     */
		    _createClass(TaskClient, [{
		      key: "getTask",
		      value: function getTask(uid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		          var url, taskItem;
		          return _regeneratorRuntime().wrap(function _callee$(_context) {
		            while (1) switch (_context.prev = _context.next) {
		              case 0:
		                url = "tasks/".concat(uid);
		                _context.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                taskItem = _context.sent;
		                return _context.abrupt("return", new Task(taskItem));
		              case 5:
		              case "end":
		                return _context.stop();
		            }
		          }, _callee, this);
		        }));
		      }
		      /**
		       * Get tasks
		       *
		       * @param parameters - Parameters to browse the tasks
		       * @returns Promise containing all tasks
		       */
		    }, {
		      key: "getTasks",
		      value: function getTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
		          var url, tasks;
		          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
		            while (1) switch (_context2.prev = _context2.next) {
		              case 0:
		                url = "tasks";
		                _context2.next = 3;
		                return this.httpRequest.get(url, toQueryParams(parameters));
		              case 3:
		                tasks = _context2.sent;
		                return _context2.abrupt("return", Object.assign(Object.assign({}, tasks), {
		                  results: tasks.results.map(function (task) {
		                    return new Task(task);
		                  })
		                }));
		              case 5:
		              case "end":
		                return _context2.stop();
		            }
		          }, _callee2, this);
		        }));
		      }
		      /**
		       * Wait for a task to be processed.
		       *
		       * @param taskUid - Task identifier
		       * @param options - Additional configuration options
		       * @returns Promise returning a task after it has been processed
		       */
		    }, {
		      key: "waitForTask",
		      value: function waitForTask(taskUid) {
		        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref$timeOutMs = _ref.timeOutMs,
		          timeOutMs = _ref$timeOutMs === void 0 ? 5000 : _ref$timeOutMs,
		          _ref$intervalMs = _ref.intervalMs,
		          intervalMs = _ref$intervalMs === void 0 ? 50 : _ref$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
		          var startingTime, response;
		          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
		            while (1) switch (_context3.prev = _context3.next) {
		              case 0:
		                startingTime = Date.now();
		              case 1:
		                if (!(Date.now() - startingTime < timeOutMs)) {
		                  _context3.next = 11;
		                  break;
		                }
		                _context3.next = 4;
		                return this.getTask(taskUid);
		              case 4:
		                response = _context3.sent;
		                if ([TaskStatus.TASK_ENQUEUED, TaskStatus.TASK_PROCESSING].includes(response.status)) {
		                  _context3.next = 7;
		                  break;
		                }
		                return _context3.abrupt("return", response);
		              case 7:
		                _context3.next = 9;
		                return sleep(intervalMs);
		              case 9:
		                _context3.next = 1;
		                break;
		              case 11:
		                throw new MeiliSearchTimeOutError("timeout of ".concat(timeOutMs, "ms has exceeded on process ").concat(taskUid, " when waiting a task to be resolved."));
		              case 12:
		              case "end":
		                return _context3.stop();
		            }
		          }, _callee3, this);
		        }));
		      }
		      /**
		       * Waits for multiple tasks to be processed
		       *
		       * @param taskUids - Tasks identifier list
		       * @param options - Wait options
		       * @returns Promise returning a list of tasks after they have been processed
		       */
		    }, {
		      key: "waitForTasks",
		      value: function waitForTasks(taskUids) {
		        var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref2$timeOutMs = _ref2.timeOutMs,
		          timeOutMs = _ref2$timeOutMs === void 0 ? 5000 : _ref2$timeOutMs,
		          _ref2$intervalMs = _ref2.intervalMs,
		          intervalMs = _ref2$intervalMs === void 0 ? 50 : _ref2$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
		          var tasks, _iterator, _step, taskUid, task;
		          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
		            while (1) switch (_context4.prev = _context4.next) {
		              case 0:
		                tasks = [];
		                _iterator = _createForOfIteratorHelper(taskUids);
		                _context4.prev = 2;
		                _iterator.s();
		              case 4:
		                if ((_step = _iterator.n()).done) {
		                  _context4.next = 12;
		                  break;
		                }
		                taskUid = _step.value;
		                _context4.next = 8;
		                return this.waitForTask(taskUid, {
		                  timeOutMs: timeOutMs,
		                  intervalMs: intervalMs
		                });
		              case 8:
		                task = _context4.sent;
		                tasks.push(task);
		              case 10:
		                _context4.next = 4;
		                break;
		              case 12:
		                _context4.next = 17;
		                break;
		              case 14:
		                _context4.prev = 14;
		                _context4.t0 = _context4["catch"](2);
		                _iterator.e(_context4.t0);
		              case 17:
		                _context4.prev = 17;
		                _iterator.f();
		                return _context4.finish(17);
		              case 20:
		                return _context4.abrupt("return", tasks);
		              case 21:
		              case "end":
		                return _context4.stop();
		            }
		          }, _callee4, this, [[2, 14, 17, 20]]);
		        }));
		      }
		      /**
		       * Cancel a list of enqueued or processing tasks.
		       *
		       * @param parameters - Parameters to filter the tasks.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "cancelTasks",
		      value: function cancelTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
		            while (1) switch (_context5.prev = _context5.next) {
		              case 0:
		                url = "tasks/cancel";
		                _context5.next = 3;
		                return this.httpRequest.post(url, {}, toQueryParams(parameters));
		              case 3:
		                task = _context5.sent;
		                return _context5.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context5.stop();
		            }
		          }, _callee5, this);
		        }));
		      }
		      /**
		       * Delete a list tasks.
		       *
		       * @param parameters - Parameters to filter the tasks.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "deleteTasks",
		      value: function deleteTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
		            while (1) switch (_context6.prev = _context6.next) {
		              case 0:
		                url = "tasks";
		                _context6.next = 3;
		                return this.httpRequest.delete(url, {}, toQueryParams(parameters));
		              case 3:
		                task = _context6.sent;
		                return _context6.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context6.stop();
		            }
		          }, _callee6, this);
		        }));
		      }
		    }]);
		    return TaskClient;
		  }();

		  /*
		   * Bundle: MeiliSearch / Indexes
		   * Project: MeiliSearch - Javascript API
		   * Author: Quentin de Quelen <quentin@meilisearch.com>
		   * Copyright: 2019, MeiliSearch
		   */
		  var Index = /*#__PURE__*/function () {
		    /**
		     * @param config - Request configuration options
		     * @param uid - UID of the index
		     * @param primaryKey - Primary Key of the index
		     */
		    function Index(config, uid, primaryKey) {
		      _classCallCheck(this, Index);
		      this.uid = uid;
		      this.primaryKey = primaryKey;
		      this.httpRequest = new HttpRequests(config);
		      this.tasks = new TaskClient(config);
		    }
		    ///
		    /// SEARCH
		    ///
		    /**
		     * Search for documents into an index
		     *
		     * @param query - Query string
		     * @param options - Search options
		     * @param config - Additional request configuration options
		     * @returns Promise containing the search response
		     */
		    _createClass(Index, [{
		      key: "search",
		      value: function search(query, options, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee$(_context) {
		            while (1) switch (_context.prev = _context.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/search");
		                _context.next = 3;
		                return this.httpRequest.post(url, removeUndefinedFromObject(Object.assign({
		                  q: query
		                }, options)), undefined, config);
		              case 3:
		                return _context.abrupt("return", _context.sent);
		              case 4:
		              case "end":
		                return _context.stop();
		            }
		          }, _callee, this);
		        }));
		      }
		      /**
		       * Search for documents into an index using the GET method
		       *
		       * @param query - Query string
		       * @param options - Search options
		       * @param config - Additional request configuration options
		       * @returns Promise containing the search response
		       */
		    }, {
		      key: "searchGet",
		      value: function searchGet(query, options, config) {
		        var _a, _b, _c, _d, _e, _f, _g;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
		          var url, parseFilter, getParams;
		          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
		            while (1) switch (_context2.prev = _context2.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/search");
		                parseFilter = function parseFilter(filter) {
		                  if (typeof filter === 'string') return filter;else if (Array.isArray(filter)) throw new MeiliSearchError('The filter query parameter should be in string format when using searchGet');else return undefined;
		                };
		                getParams = Object.assign(Object.assign({
		                  q: query
		                }, options), {
		                  filter: parseFilter(options === null || options === void 0 ? void 0 : options.filter),
		                  sort: (_a = options === null || options === void 0 ? void 0 : options.sort) === null || _a === void 0 ? void 0 : _a.join(','),
		                  facets: (_b = options === null || options === void 0 ? void 0 : options.facets) === null || _b === void 0 ? void 0 : _b.join(','),
		                  attributesToRetrieve: (_c = options === null || options === void 0 ? void 0 : options.attributesToRetrieve) === null || _c === void 0 ? void 0 : _c.join(','),
		                  attributesToCrop: (_d = options === null || options === void 0 ? void 0 : options.attributesToCrop) === null || _d === void 0 ? void 0 : _d.join(','),
		                  attributesToHighlight: (_e = options === null || options === void 0 ? void 0 : options.attributesToHighlight) === null || _e === void 0 ? void 0 : _e.join(','),
		                  vector: (_f = options === null || options === void 0 ? void 0 : options.vector) === null || _f === void 0 ? void 0 : _f.join(','),
		                  attributesToSearchOn: (_g = options === null || options === void 0 ? void 0 : options.attributesToSearchOn) === null || _g === void 0 ? void 0 : _g.join(',')
		                });
		                _context2.next = 5;
		                return this.httpRequest.get(url, removeUndefinedFromObject(getParams), config);
		              case 5:
		                return _context2.abrupt("return", _context2.sent);
		              case 6:
		              case "end":
		                return _context2.stop();
		            }
		          }, _callee2, this);
		        }));
		      }
		      /**
		       * Search for facet values
		       *
		       * @param params - Parameters used to search on the facets
		       * @param config - Additional request configuration options
		       * @returns Promise containing the search response
		       */
		    }, {
		      key: "searchForFacetValues",
		      value: function searchForFacetValues(params, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
		            while (1) switch (_context3.prev = _context3.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/facet-search");
		                _context3.next = 3;
		                return this.httpRequest.post(url, removeUndefinedFromObject(params), undefined, config);
		              case 3:
		                return _context3.abrupt("return", _context3.sent);
		              case 4:
		              case "end":
		                return _context3.stop();
		            }
		          }, _callee3, this);
		        }));
		      }
		      ///
		      /// INDEX
		      ///
		      /**
		       * Get index information.
		       *
		       * @returns Promise containing index information
		       */
		    }, {
		      key: "getRawInfo",
		      value: function getRawInfo() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
		          var url, res;
		          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
		            while (1) switch (_context4.prev = _context4.next) {
		              case 0:
		                url = "indexes/".concat(this.uid);
		                _context4.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                res = _context4.sent;
		                this.primaryKey = res.primaryKey;
		                this.updatedAt = new Date(res.updatedAt);
		                this.createdAt = new Date(res.createdAt);
		                return _context4.abrupt("return", res);
		              case 8:
		              case "end":
		                return _context4.stop();
		            }
		          }, _callee4, this);
		        }));
		      }
		      /**
		       * Fetch and update Index information.
		       *
		       * @returns Promise to the current Index object with updated information
		       */
		    }, {
		      key: "fetchInfo",
		      value: function fetchInfo() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
		          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
		            while (1) switch (_context5.prev = _context5.next) {
		              case 0:
		                _context5.next = 2;
		                return this.getRawInfo();
		              case 2:
		                return _context5.abrupt("return", this);
		              case 3:
		              case "end":
		                return _context5.stop();
		            }
		          }, _callee5, this);
		        }));
		      }
		      /**
		       * Get Primary Key.
		       *
		       * @returns Promise containing the Primary Key of the index
		       */
		    }, {
		      key: "fetchPrimaryKey",
		      value: function fetchPrimaryKey() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
		          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
		            while (1) switch (_context6.prev = _context6.next) {
		              case 0:
		                _context6.next = 2;
		                return this.getRawInfo();
		              case 2:
		                this.primaryKey = _context6.sent.primaryKey;
		                return _context6.abrupt("return", this.primaryKey);
		              case 4:
		              case "end":
		                return _context6.stop();
		            }
		          }, _callee6, this);
		        }));
		      }
		      /**
		       * Create an index.
		       *
		       * @param uid - Unique identifier of the Index
		       * @param options - Index options
		       * @param config - Request configuration options
		       * @returns Newly created Index object
		       */
		    }, {
		      key: "update",
		      value:
		      /**
		       * Update an index.
		       *
		       * @param data - Data to update
		       * @returns Promise to the current Index object with updated information
		       */
		      function update(data) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee7$(_context7) {
		            while (1) switch (_context7.prev = _context7.next) {
		              case 0:
		                url = "indexes/".concat(this.uid);
		                _context7.next = 3;
		                return this.httpRequest.patch(url, data);
		              case 3:
		                task = _context7.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context7.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context7.stop();
		            }
		          }, _callee7, this);
		        }));
		      }
		      /**
		       * Delete an index.
		       *
		       * @returns Promise which resolves when index is deleted successfully
		       */
		    }, {
		      key: "delete",
		      value: function _delete() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee8$(_context8) {
		            while (1) switch (_context8.prev = _context8.next) {
		              case 0:
		                url = "indexes/".concat(this.uid);
		                _context8.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context8.sent;
		                return _context8.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context8.stop();
		            }
		          }, _callee8, this);
		        }));
		      }
		      ///
		      /// TASKS
		      ///
		      /**
		       * Get the list of all the tasks of the index.
		       *
		       * @param parameters - Parameters to browse the tasks
		       * @returns Promise containing all tasks
		       */
		    }, {
		      key: "getTasks",
		      value: function getTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
		          return _regeneratorRuntime().wrap(function _callee9$(_context9) {
		            while (1) switch (_context9.prev = _context9.next) {
		              case 0:
		                _context9.next = 2;
		                return this.tasks.getTasks(Object.assign(Object.assign({}, parameters), {
		                  indexUids: [this.uid]
		                }));
		              case 2:
		                return _context9.abrupt("return", _context9.sent);
		              case 3:
		              case "end":
		                return _context9.stop();
		            }
		          }, _callee9, this);
		        }));
		      }
		      /**
		       * Get one task of the index.
		       *
		       * @param taskUid - Task identifier
		       * @returns Promise containing a task
		       */
		    }, {
		      key: "getTask",
		      value: function getTask(taskUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
		          return _regeneratorRuntime().wrap(function _callee10$(_context10) {
		            while (1) switch (_context10.prev = _context10.next) {
		              case 0:
		                _context10.next = 2;
		                return this.tasks.getTask(taskUid);
		              case 2:
		                return _context10.abrupt("return", _context10.sent);
		              case 3:
		              case "end":
		                return _context10.stop();
		            }
		          }, _callee10, this);
		        }));
		      }
		      /**
		       * Wait for multiple tasks to be processed.
		       *
		       * @param taskUids - Tasks identifier
		       * @param waitOptions - Options on timeout and interval
		       * @returns Promise containing an array of tasks
		       */
		    }, {
		      key: "waitForTasks",
		      value: function waitForTasks(taskUids) {
		        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref$timeOutMs = _ref.timeOutMs,
		          timeOutMs = _ref$timeOutMs === void 0 ? 5000 : _ref$timeOutMs,
		          _ref$intervalMs = _ref.intervalMs,
		          intervalMs = _ref$intervalMs === void 0 ? 50 : _ref$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee11() {
		          return _regeneratorRuntime().wrap(function _callee11$(_context11) {
		            while (1) switch (_context11.prev = _context11.next) {
		              case 0:
		                _context11.next = 2;
		                return this.tasks.waitForTasks(taskUids, {
		                  timeOutMs: timeOutMs,
		                  intervalMs: intervalMs
		                });
		              case 2:
		                return _context11.abrupt("return", _context11.sent);
		              case 3:
		              case "end":
		                return _context11.stop();
		            }
		          }, _callee11, this);
		        }));
		      }
		      /**
		       * Wait for a task to be processed.
		       *
		       * @param taskUid - Task identifier
		       * @param waitOptions - Options on timeout and interval
		       * @returns Promise containing an array of tasks
		       */
		    }, {
		      key: "waitForTask",
		      value: function waitForTask(taskUid) {
		        var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref2$timeOutMs = _ref2.timeOutMs,
		          timeOutMs = _ref2$timeOutMs === void 0 ? 5000 : _ref2$timeOutMs,
		          _ref2$intervalMs = _ref2.intervalMs,
		          intervalMs = _ref2$intervalMs === void 0 ? 50 : _ref2$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
		          return _regeneratorRuntime().wrap(function _callee12$(_context12) {
		            while (1) switch (_context12.prev = _context12.next) {
		              case 0:
		                _context12.next = 2;
		                return this.tasks.waitForTask(taskUid, {
		                  timeOutMs: timeOutMs,
		                  intervalMs: intervalMs
		                });
		              case 2:
		                return _context12.abrupt("return", _context12.sent);
		              case 3:
		              case "end":
		                return _context12.stop();
		            }
		          }, _callee12, this);
		        }));
		      }
		      ///
		      /// STATS
		      ///
		      /**
		       * Get stats of an index
		       *
		       * @returns Promise containing object with stats of the index
		       */
		    }, {
		      key: "getStats",
		      value: function getStats() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee13$(_context13) {
		            while (1) switch (_context13.prev = _context13.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/stats");
		                _context13.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context13.abrupt("return", _context13.sent);
		              case 4:
		              case "end":
		                return _context13.stop();
		            }
		          }, _callee13, this);
		        }));
		      }
		      ///
		      /// DOCUMENTS
		      ///
		      /**
		       * Get documents of an index.
		       *
		       * @param parameters - Parameters to browse the documents. Parameters can
		       *   contain the `filter` field only available in Meilisearch v1.2 and newer
		       * @returns Promise containing the returned documents
		       */
		    }, {
		      key: "getDocuments",
		      value: function getDocuments() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        var _a;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
		          var url, _url, fields;
		          return _regeneratorRuntime().wrap(function _callee14$(_context14) {
		            while (1) switch (_context14.prev = _context14.next) {
		              case 0:
		                parameters = removeUndefinedFromObject(parameters);
		                // In case `filter` is provided, use `POST /documents/fetch`
		                if (!(parameters.filter !== undefined)) {
		                  _context14.next = 15;
		                  break;
		                }
		                _context14.prev = 2;
		                url = "indexes/".concat(this.uid, "/documents/fetch");
		                _context14.next = 6;
		                return this.httpRequest.post(url, parameters);
		              case 6:
		                return _context14.abrupt("return", _context14.sent);
		              case 9:
		                _context14.prev = 9;
		                _context14.t0 = _context14["catch"](2);
		                if (_context14.t0 instanceof MeiliSearchCommunicationError) {
		                  _context14.t0.message = versionErrorHintMessage(_context14.t0.message, 'getDocuments');
		                } else if (_context14.t0 instanceof MeiliSearchApiError) {
		                  _context14.t0.message = versionErrorHintMessage(_context14.t0.message, 'getDocuments');
		                }
		                throw _context14.t0;
		              case 13:
		                _context14.next = 20;
		                break;
		              case 15:
		                _url = "indexes/".concat(this.uid, "/documents"); // Transform fields to query parameter string format
		                fields = Array.isArray(parameters === null || parameters === void 0 ? void 0 : parameters.fields) ? {
		                  fields: (_a = parameters === null || parameters === void 0 ? void 0 : parameters.fields) === null || _a === void 0 ? void 0 : _a.join(',')
		                } : {};
		                _context14.next = 19;
		                return this.httpRequest.get(_url, Object.assign(Object.assign({}, parameters), fields));
		              case 19:
		                return _context14.abrupt("return", _context14.sent);
		              case 20:
		              case "end":
		                return _context14.stop();
		            }
		          }, _callee14, this, [[2, 9]]);
		        }));
		      }
		      /**
		       * Get one document
		       *
		       * @param documentId - Document ID
		       * @param parameters - Parameters applied on a document
		       * @returns Promise containing Document response
		       */
		    }, {
		      key: "getDocument",
		      value: function getDocument(documentId, parameters) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee15() {
		          var url, fields;
		          return _regeneratorRuntime().wrap(function _callee15$(_context15) {
		            while (1) switch (_context15.prev = _context15.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents/").concat(documentId);
		                fields = function () {
		                  var _a;
		                  if (Array.isArray(parameters === null || parameters === void 0 ? void 0 : parameters.fields)) {
		                    return (_a = parameters === null || parameters === void 0 ? void 0 : parameters.fields) === null || _a === void 0 ? void 0 : _a.join(',');
		                  }
		                  return undefined;
		                }();
		                _context15.next = 4;
		                return this.httpRequest.get(url, removeUndefinedFromObject(Object.assign(Object.assign({}, parameters), {
		                  fields: fields
		                })));
		              case 4:
		                return _context15.abrupt("return", _context15.sent);
		              case 5:
		              case "end":
		                return _context15.stop();
		            }
		          }, _callee15, this);
		        }));
		      }
		      /**
		       * Add or replace multiples documents to an index
		       *
		       * @param documents - Array of Document objects to add/replace
		       * @param options - Options on document addition
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "addDocuments",
		      value: function addDocuments(documents, options) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee16() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee16$(_context16) {
		            while (1) switch (_context16.prev = _context16.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents");
		                _context16.next = 3;
		                return this.httpRequest.post(url, documents, options);
		              case 3:
		                task = _context16.sent;
		                return _context16.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context16.stop();
		            }
		          }, _callee16, this);
		        }));
		      }
		      /**
		       * Add or replace multiples documents in a string format to an index. It only
		       * supports csv, ndjson and json formats.
		       *
		       * @param documents - Documents provided in a string to add/replace
		       * @param contentType - Content type of your document:
		       *   'text/csv'|'application/x-ndjson'|'application/json'
		       * @param options - Options on document addition
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "addDocumentsFromString",
		      value: function addDocumentsFromString(documents, contentType, queryParams) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee17$(_context17) {
		            while (1) switch (_context17.prev = _context17.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents");
		                _context17.next = 3;
		                return this.httpRequest.post(url, documents, queryParams, {
		                  headers: {
		                    'Content-Type': contentType
		                  }
		                });
		              case 3:
		                task = _context17.sent;
		                return _context17.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context17.stop();
		            }
		          }, _callee17, this);
		        }));
		      }
		      /**
		       * Add or replace multiples documents to an index in batches
		       *
		       * @param documents - Array of Document objects to add/replace
		       * @param batchSize - Size of the batch
		       * @param options - Options on document addition
		       * @returns Promise containing array of enqueued task objects for each batch
		       */
		    }, {
		      key: "addDocumentsInBatches",
		      value: function addDocumentsInBatches(documents) {
		        var batchSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1000;
		        var options = arguments.length > 2 ? arguments[2] : undefined;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
		          var updates, i;
		          return _regeneratorRuntime().wrap(function _callee18$(_context18) {
		            while (1) switch (_context18.prev = _context18.next) {
		              case 0:
		                updates = [];
		                i = 0;
		              case 2:
		                if (!(i < documents.length)) {
		                  _context18.next = 11;
		                  break;
		                }
		                _context18.t0 = updates;
		                _context18.next = 6;
		                return this.addDocuments(documents.slice(i, i + batchSize), options);
		              case 6:
		                _context18.t1 = _context18.sent;
		                _context18.t0.push.call(_context18.t0, _context18.t1);
		              case 8:
		                i += batchSize;
		                _context18.next = 2;
		                break;
		              case 11:
		                return _context18.abrupt("return", updates);
		              case 12:
		              case "end":
		                return _context18.stop();
		            }
		          }, _callee18, this);
		        }));
		      }
		      /**
		       * Add or update multiples documents to an index
		       *
		       * @param documents - Array of Document objects to add/update
		       * @param options - Options on document update
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateDocuments",
		      value: function updateDocuments(documents, options) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee19$(_context19) {
		            while (1) switch (_context19.prev = _context19.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents");
		                _context19.next = 3;
		                return this.httpRequest.put(url, documents, options);
		              case 3:
		                task = _context19.sent;
		                return _context19.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context19.stop();
		            }
		          }, _callee19, this);
		        }));
		      }
		      /**
		       * Add or update multiples documents to an index in batches
		       *
		       * @param documents - Array of Document objects to add/update
		       * @param batchSize - Size of the batch
		       * @param options - Options on document update
		       * @returns Promise containing array of enqueued task objects for each batch
		       */
		    }, {
		      key: "updateDocumentsInBatches",
		      value: function updateDocumentsInBatches(documents) {
		        var batchSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1000;
		        var options = arguments.length > 2 ? arguments[2] : undefined;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
		          var updates, i;
		          return _regeneratorRuntime().wrap(function _callee20$(_context20) {
		            while (1) switch (_context20.prev = _context20.next) {
		              case 0:
		                updates = [];
		                i = 0;
		              case 2:
		                if (!(i < documents.length)) {
		                  _context20.next = 11;
		                  break;
		                }
		                _context20.t0 = updates;
		                _context20.next = 6;
		                return this.updateDocuments(documents.slice(i, i + batchSize), options);
		              case 6:
		                _context20.t1 = _context20.sent;
		                _context20.t0.push.call(_context20.t0, _context20.t1);
		              case 8:
		                i += batchSize;
		                _context20.next = 2;
		                break;
		              case 11:
		                return _context20.abrupt("return", updates);
		              case 12:
		              case "end":
		                return _context20.stop();
		            }
		          }, _callee20, this);
		        }));
		      }
		      /**
		       * Add or update multiples documents in a string format to an index. It only
		       * supports csv, ndjson and json formats.
		       *
		       * @param documents - Documents provided in a string to add/update
		       * @param contentType - Content type of your document:
		       *   'text/csv'|'application/x-ndjson'|'application/json'
		       * @param queryParams - Options on raw document addition
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateDocumentsFromString",
		      value: function updateDocumentsFromString(documents, contentType, queryParams) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee21() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee21$(_context21) {
		            while (1) switch (_context21.prev = _context21.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents");
		                _context21.next = 3;
		                return this.httpRequest.put(url, documents, queryParams, {
		                  headers: {
		                    'Content-Type': contentType
		                  }
		                });
		              case 3:
		                task = _context21.sent;
		                return _context21.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context21.stop();
		            }
		          }, _callee21, this);
		        }));
		      }
		      /**
		       * Delete one document
		       *
		       * @param documentId - Id of Document to delete
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "deleteDocument",
		      value: function deleteDocument(documentId) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee22() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee22$(_context22) {
		            while (1) switch (_context22.prev = _context22.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents/").concat(documentId);
		                _context22.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context22.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context22.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context22.stop();
		            }
		          }, _callee22, this);
		        }));
		      }
		      /**
		       * Delete multiples documents of an index.
		       *
		       * @param params - Params value can be:
		       *
		       *   - DocumentsDeletionQuery: An object containing the parameters to customize
		       *       your document deletion. Only available in Meilisearch v1.2 and newer
		       *   - DocumentsIds: An array of document ids to delete
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "deleteDocuments",
		      value: function deleteDocuments(params) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee23() {
		          var isDocumentsDeletionQuery, endpoint, url, task;
		          return _regeneratorRuntime().wrap(function _callee23$(_context23) {
		            while (1) switch (_context23.prev = _context23.next) {
		              case 0:
		                // If params is of type DocumentsDeletionQuery
		                isDocumentsDeletionQuery = !Array.isArray(params) && _typeof(params) === 'object';
		                endpoint = isDocumentsDeletionQuery ? 'documents/delete' : 'documents/delete-batch';
		                url = "indexes/".concat(this.uid, "/").concat(endpoint);
		                _context23.prev = 3;
		                _context23.next = 6;
		                return this.httpRequest.post(url, params);
		              case 6:
		                task = _context23.sent;
		                return _context23.abrupt("return", new EnqueuedTask(task));
		              case 10:
		                _context23.prev = 10;
		                _context23.t0 = _context23["catch"](3);
		                if (_context23.t0 instanceof MeiliSearchCommunicationError && isDocumentsDeletionQuery) {
		                  _context23.t0.message = versionErrorHintMessage(_context23.t0.message, 'deleteDocuments');
		                } else if (_context23.t0 instanceof MeiliSearchApiError) {
		                  _context23.t0.message = versionErrorHintMessage(_context23.t0.message, 'deleteDocuments');
		                }
		                throw _context23.t0;
		              case 14:
		              case "end":
		                return _context23.stop();
		            }
		          }, _callee23, this, [[3, 10]]);
		        }));
		      }
		      /**
		       * Delete all documents of an index
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "deleteAllDocuments",
		      value: function deleteAllDocuments() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee24() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee24$(_context24) {
		            while (1) switch (_context24.prev = _context24.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/documents");
		                _context24.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context24.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context24.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context24.stop();
		            }
		          }, _callee24, this);
		        }));
		      }
		      ///
		      /// SETTINGS
		      ///
		      /**
		       * Retrieve all settings
		       *
		       * @returns Promise containing Settings object
		       */
		    }, {
		      key: "getSettings",
		      value: function getSettings() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee25() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee25$(_context25) {
		            while (1) switch (_context25.prev = _context25.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings");
		                _context25.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context25.abrupt("return", _context25.sent);
		              case 4:
		              case "end":
		                return _context25.stop();
		            }
		          }, _callee25, this);
		        }));
		      }
		      /**
		       * Update all settings Any parameters not provided will be left unchanged.
		       *
		       * @param settings - Object containing parameters with their updated values
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateSettings",
		      value: function updateSettings(settings) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee26() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee26$(_context26) {
		            while (1) switch (_context26.prev = _context26.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings");
		                _context26.next = 3;
		                return this.httpRequest.patch(url, settings);
		              case 3:
		                task = _context26.sent;
		                task.enqueued = new Date(task.enqueuedAt);
		                return _context26.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context26.stop();
		            }
		          }, _callee26, this);
		        }));
		      }
		      /**
		       * Reset settings.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetSettings",
		      value: function resetSettings() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee27() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee27$(_context27) {
		            while (1) switch (_context27.prev = _context27.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings");
		                _context27.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context27.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context27.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context27.stop();
		            }
		          }, _callee27, this);
		        }));
		      }
		      ///
		      /// PAGINATION SETTINGS
		      ///
		      /**
		       * Get the pagination settings.
		       *
		       * @returns Promise containing object of pagination settings
		       */
		    }, {
		      key: "getPagination",
		      value: function getPagination() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee28() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee28$(_context28) {
		            while (1) switch (_context28.prev = _context28.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/pagination");
		                _context28.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context28.abrupt("return", _context28.sent);
		              case 4:
		              case "end":
		                return _context28.stop();
		            }
		          }, _callee28, this);
		        }));
		      }
		      /**
		       * Update the pagination settings.
		       *
		       * @param pagination - Pagination object
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updatePagination",
		      value: function updatePagination(pagination) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee29() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee29$(_context29) {
		            while (1) switch (_context29.prev = _context29.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/pagination");
		                _context29.next = 3;
		                return this.httpRequest.patch(url, pagination);
		              case 3:
		                task = _context29.sent;
		                return _context29.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context29.stop();
		            }
		          }, _callee29, this);
		        }));
		      }
		      /**
		       * Reset the pagination settings.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetPagination",
		      value: function resetPagination() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee30() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee30$(_context30) {
		            while (1) switch (_context30.prev = _context30.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/pagination");
		                _context30.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context30.sent;
		                return _context30.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context30.stop();
		            }
		          }, _callee30, this);
		        }));
		      }
		      ///
		      /// SYNONYMS
		      ///
		      /**
		       * Get the list of all synonyms
		       *
		       * @returns Promise containing object of synonym mappings
		       */
		    }, {
		      key: "getSynonyms",
		      value: function getSynonyms() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee31() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee31$(_context31) {
		            while (1) switch (_context31.prev = _context31.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/synonyms");
		                _context31.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context31.abrupt("return", _context31.sent);
		              case 4:
		              case "end":
		                return _context31.stop();
		            }
		          }, _callee31, this);
		        }));
		      }
		      /**
		       * Update the list of synonyms. Overwrite the old list.
		       *
		       * @param synonyms - Mapping of synonyms with their associated words
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateSynonyms",
		      value: function updateSynonyms(synonyms) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee32() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee32$(_context32) {
		            while (1) switch (_context32.prev = _context32.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/synonyms");
		                _context32.next = 3;
		                return this.httpRequest.put(url, synonyms);
		              case 3:
		                task = _context32.sent;
		                return _context32.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context32.stop();
		            }
		          }, _callee32, this);
		        }));
		      }
		      /**
		       * Reset the synonym list to be empty again
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetSynonyms",
		      value: function resetSynonyms() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee33() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee33$(_context33) {
		            while (1) switch (_context33.prev = _context33.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/synonyms");
		                _context33.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context33.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context33.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context33.stop();
		            }
		          }, _callee33, this);
		        }));
		      }
		      ///
		      /// STOP WORDS
		      ///
		      /**
		       * Get the list of all stop-words
		       *
		       * @returns Promise containing array of stop-words
		       */
		    }, {
		      key: "getStopWords",
		      value: function getStopWords() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee34() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee34$(_context34) {
		            while (1) switch (_context34.prev = _context34.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/stop-words");
		                _context34.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context34.abrupt("return", _context34.sent);
		              case 4:
		              case "end":
		                return _context34.stop();
		            }
		          }, _callee34, this);
		        }));
		      }
		      /**
		       * Update the list of stop-words. Overwrite the old list.
		       *
		       * @param stopWords - Array of strings that contains the stop-words.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateStopWords",
		      value: function updateStopWords(stopWords) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee35() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee35$(_context35) {
		            while (1) switch (_context35.prev = _context35.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/stop-words");
		                _context35.next = 3;
		                return this.httpRequest.put(url, stopWords);
		              case 3:
		                task = _context35.sent;
		                return _context35.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context35.stop();
		            }
		          }, _callee35, this);
		        }));
		      }
		      /**
		       * Reset the stop-words list to be empty again
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetStopWords",
		      value: function resetStopWords() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee36() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee36$(_context36) {
		            while (1) switch (_context36.prev = _context36.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/stop-words");
		                _context36.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context36.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context36.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context36.stop();
		            }
		          }, _callee36, this);
		        }));
		      }
		      ///
		      /// RANKING RULES
		      ///
		      /**
		       * Get the list of all ranking-rules
		       *
		       * @returns Promise containing array of ranking-rules
		       */
		    }, {
		      key: "getRankingRules",
		      value: function getRankingRules() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee37() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee37$(_context37) {
		            while (1) switch (_context37.prev = _context37.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/ranking-rules");
		                _context37.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context37.abrupt("return", _context37.sent);
		              case 4:
		              case "end":
		                return _context37.stop();
		            }
		          }, _callee37, this);
		        }));
		      }
		      /**
		       * Update the list of ranking-rules. Overwrite the old list.
		       *
		       * @param rankingRules - Array that contain ranking rules sorted by order of
		       *   importance.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateRankingRules",
		      value: function updateRankingRules(rankingRules) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee38() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee38$(_context38) {
		            while (1) switch (_context38.prev = _context38.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/ranking-rules");
		                _context38.next = 3;
		                return this.httpRequest.put(url, rankingRules);
		              case 3:
		                task = _context38.sent;
		                return _context38.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context38.stop();
		            }
		          }, _callee38, this);
		        }));
		      }
		      /**
		       * Reset the ranking rules list to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetRankingRules",
		      value: function resetRankingRules() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee39() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee39$(_context39) {
		            while (1) switch (_context39.prev = _context39.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/ranking-rules");
		                _context39.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context39.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context39.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context39.stop();
		            }
		          }, _callee39, this);
		        }));
		      }
		      ///
		      /// DISTINCT ATTRIBUTE
		      ///
		      /**
		       * Get the distinct-attribute
		       *
		       * @returns Promise containing the distinct-attribute of the index
		       */
		    }, {
		      key: "getDistinctAttribute",
		      value: function getDistinctAttribute() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee40() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee40$(_context40) {
		            while (1) switch (_context40.prev = _context40.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/distinct-attribute");
		                _context40.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context40.abrupt("return", _context40.sent);
		              case 4:
		              case "end":
		                return _context40.stop();
		            }
		          }, _callee40, this);
		        }));
		      }
		      /**
		       * Update the distinct-attribute.
		       *
		       * @param distinctAttribute - Field name of the distinct-attribute
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateDistinctAttribute",
		      value: function updateDistinctAttribute(distinctAttribute) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee41() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee41$(_context41) {
		            while (1) switch (_context41.prev = _context41.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/distinct-attribute");
		                _context41.next = 3;
		                return this.httpRequest.put(url, distinctAttribute);
		              case 3:
		                task = _context41.sent;
		                return _context41.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context41.stop();
		            }
		          }, _callee41, this);
		        }));
		      }
		      /**
		       * Reset the distinct-attribute.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetDistinctAttribute",
		      value: function resetDistinctAttribute() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee42() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee42$(_context42) {
		            while (1) switch (_context42.prev = _context42.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/distinct-attribute");
		                _context42.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context42.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context42.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context42.stop();
		            }
		          }, _callee42, this);
		        }));
		      }
		      ///
		      /// FILTERABLE ATTRIBUTES
		      ///
		      /**
		       * Get the filterable-attributes
		       *
		       * @returns Promise containing an array of filterable-attributes
		       */
		    }, {
		      key: "getFilterableAttributes",
		      value: function getFilterableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee43() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee43$(_context43) {
		            while (1) switch (_context43.prev = _context43.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/filterable-attributes");
		                _context43.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context43.abrupt("return", _context43.sent);
		              case 4:
		              case "end":
		                return _context43.stop();
		            }
		          }, _callee43, this);
		        }));
		      }
		      /**
		       * Update the filterable-attributes.
		       *
		       * @param filterableAttributes - Array of strings containing the attributes
		       *   that can be used as filters at query time
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateFilterableAttributes",
		      value: function updateFilterableAttributes(filterableAttributes) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee44() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee44$(_context44) {
		            while (1) switch (_context44.prev = _context44.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/filterable-attributes");
		                _context44.next = 3;
		                return this.httpRequest.put(url, filterableAttributes);
		              case 3:
		                task = _context44.sent;
		                return _context44.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context44.stop();
		            }
		          }, _callee44, this);
		        }));
		      }
		      /**
		       * Reset the filterable-attributes.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetFilterableAttributes",
		      value: function resetFilterableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee45() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee45$(_context45) {
		            while (1) switch (_context45.prev = _context45.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/filterable-attributes");
		                _context45.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context45.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context45.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context45.stop();
		            }
		          }, _callee45, this);
		        }));
		      }
		      ///
		      /// SORTABLE ATTRIBUTES
		      ///
		      /**
		       * Get the sortable-attributes
		       *
		       * @returns Promise containing array of sortable-attributes
		       */
		    }, {
		      key: "getSortableAttributes",
		      value: function getSortableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee46() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee46$(_context46) {
		            while (1) switch (_context46.prev = _context46.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/sortable-attributes");
		                _context46.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context46.abrupt("return", _context46.sent);
		              case 4:
		              case "end":
		                return _context46.stop();
		            }
		          }, _callee46, this);
		        }));
		      }
		      /**
		       * Update the sortable-attributes.
		       *
		       * @param sortableAttributes - Array of strings containing the attributes that
		       *   can be used to sort search results at query time
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateSortableAttributes",
		      value: function updateSortableAttributes(sortableAttributes) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee47() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee47$(_context47) {
		            while (1) switch (_context47.prev = _context47.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/sortable-attributes");
		                _context47.next = 3;
		                return this.httpRequest.put(url, sortableAttributes);
		              case 3:
		                task = _context47.sent;
		                return _context47.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context47.stop();
		            }
		          }, _callee47, this);
		        }));
		      }
		      /**
		       * Reset the sortable-attributes.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetSortableAttributes",
		      value: function resetSortableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee48() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee48$(_context48) {
		            while (1) switch (_context48.prev = _context48.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/sortable-attributes");
		                _context48.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context48.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context48.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context48.stop();
		            }
		          }, _callee48, this);
		        }));
		      }
		      ///
		      /// SEARCHABLE ATTRIBUTE
		      ///
		      /**
		       * Get the searchable-attributes
		       *
		       * @returns Promise containing array of searchable-attributes
		       */
		    }, {
		      key: "getSearchableAttributes",
		      value: function getSearchableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee49() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee49$(_context49) {
		            while (1) switch (_context49.prev = _context49.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/searchable-attributes");
		                _context49.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context49.abrupt("return", _context49.sent);
		              case 4:
		              case "end":
		                return _context49.stop();
		            }
		          }, _callee49, this);
		        }));
		      }
		      /**
		       * Update the searchable-attributes.
		       *
		       * @param searchableAttributes - Array of strings that contains searchable
		       *   attributes sorted by order of importance(most to least important)
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateSearchableAttributes",
		      value: function updateSearchableAttributes(searchableAttributes) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee50() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee50$(_context50) {
		            while (1) switch (_context50.prev = _context50.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/searchable-attributes");
		                _context50.next = 3;
		                return this.httpRequest.put(url, searchableAttributes);
		              case 3:
		                task = _context50.sent;
		                return _context50.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context50.stop();
		            }
		          }, _callee50, this);
		        }));
		      }
		      /**
		       * Reset the searchable-attributes.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetSearchableAttributes",
		      value: function resetSearchableAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee51() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee51$(_context51) {
		            while (1) switch (_context51.prev = _context51.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/searchable-attributes");
		                _context51.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context51.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context51.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context51.stop();
		            }
		          }, _callee51, this);
		        }));
		      }
		      ///
		      /// DISPLAYED ATTRIBUTE
		      ///
		      /**
		       * Get the displayed-attributes
		       *
		       * @returns Promise containing array of displayed-attributes
		       */
		    }, {
		      key: "getDisplayedAttributes",
		      value: function getDisplayedAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee52() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee52$(_context52) {
		            while (1) switch (_context52.prev = _context52.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/displayed-attributes");
		                _context52.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context52.abrupt("return", _context52.sent);
		              case 4:
		              case "end":
		                return _context52.stop();
		            }
		          }, _callee52, this);
		        }));
		      }
		      /**
		       * Update the displayed-attributes.
		       *
		       * @param displayedAttributes - Array of strings that contains attributes of
		       *   an index to display
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateDisplayedAttributes",
		      value: function updateDisplayedAttributes(displayedAttributes) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee53() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee53$(_context53) {
		            while (1) switch (_context53.prev = _context53.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/displayed-attributes");
		                _context53.next = 3;
		                return this.httpRequest.put(url, displayedAttributes);
		              case 3:
		                task = _context53.sent;
		                return _context53.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context53.stop();
		            }
		          }, _callee53, this);
		        }));
		      }
		      /**
		       * Reset the displayed-attributes.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetDisplayedAttributes",
		      value: function resetDisplayedAttributes() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee54() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee54$(_context54) {
		            while (1) switch (_context54.prev = _context54.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/displayed-attributes");
		                _context54.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context54.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context54.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context54.stop();
		            }
		          }, _callee54, this);
		        }));
		      }
		      ///
		      /// TYPO TOLERANCE
		      ///
		      /**
		       * Get the typo tolerance settings.
		       *
		       * @returns Promise containing the typo tolerance settings.
		       */
		    }, {
		      key: "getTypoTolerance",
		      value: function getTypoTolerance() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee55() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee55$(_context55) {
		            while (1) switch (_context55.prev = _context55.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/typo-tolerance");
		                _context55.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context55.abrupt("return", _context55.sent);
		              case 4:
		              case "end":
		                return _context55.stop();
		            }
		          }, _callee55, this);
		        }));
		      }
		      /**
		       * Update the typo tolerance settings.
		       *
		       * @param typoTolerance - Object containing the custom typo tolerance
		       *   settings.
		       * @returns Promise containing object of the enqueued update
		       */
		    }, {
		      key: "updateTypoTolerance",
		      value: function updateTypoTolerance(typoTolerance) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee56() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee56$(_context56) {
		            while (1) switch (_context56.prev = _context56.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/typo-tolerance");
		                _context56.next = 3;
		                return this.httpRequest.patch(url, typoTolerance);
		              case 3:
		                task = _context56.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context56.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context56.stop();
		            }
		          }, _callee56, this);
		        }));
		      }
		      /**
		       * Reset the typo tolerance settings.
		       *
		       * @returns Promise containing object of the enqueued update
		       */
		    }, {
		      key: "resetTypoTolerance",
		      value: function resetTypoTolerance() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee57() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee57$(_context57) {
		            while (1) switch (_context57.prev = _context57.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/typo-tolerance");
		                _context57.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context57.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context57.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context57.stop();
		            }
		          }, _callee57, this);
		        }));
		      }
		      ///
		      /// FACETING
		      ///
		      /**
		       * Get the faceting settings.
		       *
		       * @returns Promise containing object of faceting index settings
		       */
		    }, {
		      key: "getFaceting",
		      value: function getFaceting() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee58() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee58$(_context58) {
		            while (1) switch (_context58.prev = _context58.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/faceting");
		                _context58.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context58.abrupt("return", _context58.sent);
		              case 4:
		              case "end":
		                return _context58.stop();
		            }
		          }, _callee58, this);
		        }));
		      }
		      /**
		       * Update the faceting settings.
		       *
		       * @param faceting - Faceting index settings object
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "updateFaceting",
		      value: function updateFaceting(faceting) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee59() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee59$(_context59) {
		            while (1) switch (_context59.prev = _context59.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/faceting");
		                _context59.next = 3;
		                return this.httpRequest.patch(url, faceting);
		              case 3:
		                task = _context59.sent;
		                return _context59.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context59.stop();
		            }
		          }, _callee59, this);
		        }));
		      }
		      /**
		       * Reset the faceting settings.
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetFaceting",
		      value: function resetFaceting() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee60() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee60$(_context60) {
		            while (1) switch (_context60.prev = _context60.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/faceting");
		                _context60.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context60.sent;
		                return _context60.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context60.stop();
		            }
		          }, _callee60, this);
		        }));
		      }
		      ///
		      /// SEPARATOR TOKENS
		      ///
		      /**
		       * Get the list of all separator tokens.
		       *
		       * @returns Promise containing array of separator tokens
		       */
		    }, {
		      key: "getSeparatorTokens",
		      value: function getSeparatorTokens() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee61() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee61$(_context61) {
		            while (1) switch (_context61.prev = _context61.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/separator-tokens");
		                _context61.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context61.abrupt("return", _context61.sent);
		              case 4:
		              case "end":
		                return _context61.stop();
		            }
		          }, _callee61, this);
		        }));
		      }
		      /**
		       * Update the list of separator tokens. Overwrite the old list.
		       *
		       * @param separatorTokens - Array that contains separator tokens.
		       * @returns Promise containing an EnqueuedTask or null
		       */
		    }, {
		      key: "updateSeparatorTokens",
		      value: function updateSeparatorTokens(separatorTokens) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee62() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee62$(_context62) {
		            while (1) switch (_context62.prev = _context62.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/separator-tokens");
		                _context62.next = 3;
		                return this.httpRequest.put(url, separatorTokens);
		              case 3:
		                task = _context62.sent;
		                return _context62.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context62.stop();
		            }
		          }, _callee62, this);
		        }));
		      }
		      /**
		       * Reset the separator tokens list to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetSeparatorTokens",
		      value: function resetSeparatorTokens() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee63() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee63$(_context63) {
		            while (1) switch (_context63.prev = _context63.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/separator-tokens");
		                _context63.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context63.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context63.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context63.stop();
		            }
		          }, _callee63, this);
		        }));
		      }
		      ///
		      /// NON-SEPARATOR TOKENS
		      ///
		      /**
		       * Get the list of all non-separator tokens.
		       *
		       * @returns Promise containing array of non-separator tokens
		       */
		    }, {
		      key: "getNonSeparatorTokens",
		      value: function getNonSeparatorTokens() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee64() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee64$(_context64) {
		            while (1) switch (_context64.prev = _context64.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/non-separator-tokens");
		                _context64.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context64.abrupt("return", _context64.sent);
		              case 4:
		              case "end":
		                return _context64.stop();
		            }
		          }, _callee64, this);
		        }));
		      }
		      /**
		       * Update the list of non-separator tokens. Overwrite the old list.
		       *
		       * @param nonSeparatorTokens - Array that contains non-separator tokens.
		       * @returns Promise containing an EnqueuedTask or null
		       */
		    }, {
		      key: "updateNonSeparatorTokens",
		      value: function updateNonSeparatorTokens(nonSeparatorTokens) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee65() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee65$(_context65) {
		            while (1) switch (_context65.prev = _context65.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/non-separator-tokens");
		                _context65.next = 3;
		                return this.httpRequest.put(url, nonSeparatorTokens);
		              case 3:
		                task = _context65.sent;
		                return _context65.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context65.stop();
		            }
		          }, _callee65, this);
		        }));
		      }
		      /**
		       * Reset the non-separator tokens list to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetNonSeparatorTokens",
		      value: function resetNonSeparatorTokens() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee66() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee66$(_context66) {
		            while (1) switch (_context66.prev = _context66.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/non-separator-tokens");
		                _context66.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context66.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context66.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context66.stop();
		            }
		          }, _callee66, this);
		        }));
		      }
		      ///
		      /// DICTIONARY
		      ///
		      /**
		       * Get the dictionary settings of a Meilisearch index.
		       *
		       * @returns Promise containing the dictionary settings
		       */
		    }, {
		      key: "getDictionary",
		      value: function getDictionary() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee67() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee67$(_context67) {
		            while (1) switch (_context67.prev = _context67.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/dictionary");
		                _context67.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context67.abrupt("return", _context67.sent);
		              case 4:
		              case "end":
		                return _context67.stop();
		            }
		          }, _callee67, this);
		        }));
		      }
		      /**
		       * Update the dictionary settings. Overwrite the old settings.
		       *
		       * @param dictionary - Array that contains the new dictionary settings.
		       * @returns Promise containing an EnqueuedTask or null
		       */
		    }, {
		      key: "updateDictionary",
		      value: function updateDictionary(dictionary) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee68() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee68$(_context68) {
		            while (1) switch (_context68.prev = _context68.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/dictionary");
		                _context68.next = 3;
		                return this.httpRequest.put(url, dictionary);
		              case 3:
		                task = _context68.sent;
		                return _context68.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context68.stop();
		            }
		          }, _callee68, this);
		        }));
		      }
		      /**
		       * Reset the dictionary settings to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetDictionary",
		      value: function resetDictionary() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee69() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee69$(_context69) {
		            while (1) switch (_context69.prev = _context69.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/dictionary");
		                _context69.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context69.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context69.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context69.stop();
		            }
		          }, _callee69, this);
		        }));
		      }
		      ///
		      /// PROXIMITY PRECISION
		      ///
		      /**
		       * Get the proximity precision settings of a Meilisearch index.
		       *
		       * @returns Promise containing the proximity precision settings
		       */
		    }, {
		      key: "getProximityPrecision",
		      value: function getProximityPrecision() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee70() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee70$(_context70) {
		            while (1) switch (_context70.prev = _context70.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/proximity-precision");
		                _context70.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context70.abrupt("return", _context70.sent);
		              case 4:
		              case "end":
		                return _context70.stop();
		            }
		          }, _callee70, this);
		        }));
		      }
		      /**
		       * Update the proximity precision settings. Overwrite the old settings.
		       *
		       * @param proximityPrecision - String that contains the new proximity
		       *   precision settings.
		       * @returns Promise containing an EnqueuedTask or null
		       */
		    }, {
		      key: "updateProximityPrecision",
		      value: function updateProximityPrecision(proximityPrecision) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee71() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee71$(_context71) {
		            while (1) switch (_context71.prev = _context71.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/proximity-precision");
		                _context71.next = 3;
		                return this.httpRequest.put(url, proximityPrecision);
		              case 3:
		                task = _context71.sent;
		                return _context71.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context71.stop();
		            }
		          }, _callee71, this);
		        }));
		      }
		      /**
		       * Reset the proximity precision settings to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetProximityPrecision",
		      value: function resetProximityPrecision() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee72() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee72$(_context72) {
		            while (1) switch (_context72.prev = _context72.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/proximity-precision");
		                _context72.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context72.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context72.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context72.stop();
		            }
		          }, _callee72, this);
		        }));
		      }
		      ///
		      /// EMBEDDERS
		      ///
		      /**
		       * Get the embedders settings of a Meilisearch index.
		       *
		       * @returns Promise containing the embedders settings
		       */
		    }, {
		      key: "getEmbedders",
		      value: function getEmbedders() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee73() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee73$(_context73) {
		            while (1) switch (_context73.prev = _context73.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/embedders");
		                _context73.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context73.abrupt("return", _context73.sent);
		              case 4:
		              case "end":
		                return _context73.stop();
		            }
		          }, _callee73, this);
		        }));
		      }
		      /**
		       * Update the embedders settings. Overwrite the old settings.
		       *
		       * @param embedders - Object that contains the new embedders settings.
		       * @returns Promise containing an EnqueuedTask or null
		       */
		    }, {
		      key: "updateEmbedders",
		      value: function updateEmbedders(embedders) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee74() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee74$(_context74) {
		            while (1) switch (_context74.prev = _context74.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/embedders");
		                _context74.next = 3;
		                return this.httpRequest.patch(url, embedders);
		              case 3:
		                task = _context74.sent;
		                return _context74.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context74.stop();
		            }
		          }, _callee74, this);
		        }));
		      }
		      /**
		       * Reset the embedders settings to its default value
		       *
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "resetEmbedders",
		      value: function resetEmbedders() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee75() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee75$(_context75) {
		            while (1) switch (_context75.prev = _context75.next) {
		              case 0:
		                url = "indexes/".concat(this.uid, "/settings/embedders");
		                _context75.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                task = _context75.sent;
		                task.enqueuedAt = new Date(task.enqueuedAt);
		                return _context75.abrupt("return", task);
		              case 6:
		              case "end":
		                return _context75.stop();
		            }
		          }, _callee75, this);
		        }));
		      }
		    }], [{
		      key: "create",
		      value: function create(uid) {
		        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		        var config = arguments.length > 2 ? arguments[2] : undefined;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee76() {
		          var url, req, task;
		          return _regeneratorRuntime().wrap(function _callee76$(_context76) {
		            while (1) switch (_context76.prev = _context76.next) {
		              case 0:
		                url = "indexes";
		                req = new HttpRequests(config);
		                _context76.next = 4;
		                return req.post(url, Object.assign(Object.assign({}, options), {
		                  uid: uid
		                }));
		              case 4:
		                task = _context76.sent;
		                return _context76.abrupt("return", new EnqueuedTask(task));
		              case 6:
		              case "end":
		                return _context76.stop();
		            }
		          }, _callee76);
		        }));
		      }
		    }]);
		    return Index;
		  }();

		  /*
		   * Bundle: MeiliSearch
		   * Project: MeiliSearch - Javascript API
		   * Author: Quentin de Quelen <quentin@meilisearch.com>
		   * Copyright: 2019, MeiliSearch
		   */
		  var Client = /*#__PURE__*/function () {
		    /**
		     * Creates new MeiliSearch instance
		     *
		     * @param config - Configuration object
		     */
		    function Client(config) {
		      _classCallCheck(this, Client);
		      this.config = config;
		      this.httpRequest = new HttpRequests(config);
		      this.tasks = new TaskClient(config);
		    }
		    /**
		     * Return an Index instance
		     *
		     * @param indexUid - The index UID
		     * @returns Instance of Index
		     */
		    _createClass(Client, [{
		      key: "index",
		      value: function index(indexUid) {
		        return new Index(this.config, indexUid);
		      }
		      /**
		       * Gather information about an index by calling MeiliSearch and return an
		       * Index instance with the gathered information
		       *
		       * @param indexUid - The index UID
		       * @returns Promise returning Index instance
		       */
		    }, {
		      key: "getIndex",
		      value: function getIndex(indexUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
		          return _regeneratorRuntime().wrap(function _callee$(_context) {
		            while (1) switch (_context.prev = _context.next) {
		              case 0:
		                return _context.abrupt("return", new Index(this.config, indexUid).fetchInfo());
		              case 1:
		              case "end":
		                return _context.stop();
		            }
		          }, _callee, this);
		        }));
		      }
		      /**
		       * Gather information about an index by calling MeiliSearch and return the raw
		       * JSON response
		       *
		       * @param indexUid - The index UID
		       * @returns Promise returning index information
		       */
		    }, {
		      key: "getRawIndex",
		      value: function getRawIndex(indexUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
		          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
		            while (1) switch (_context2.prev = _context2.next) {
		              case 0:
		                return _context2.abrupt("return", new Index(this.config, indexUid).getRawInfo());
		              case 1:
		              case "end":
		                return _context2.stop();
		            }
		          }, _callee2, this);
		        }));
		      }
		      /**
		       * Get all the indexes as Index instances.
		       *
		       * @param parameters - Parameters to browse the indexes
		       * @returns Promise returning array of raw index information
		       */
		    }, {
		      key: "getIndexes",
		      value: function getIndexes() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
		          var _this = this;
		          var rawIndexes, indexes;
		          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
		            while (1) switch (_context3.prev = _context3.next) {
		              case 0:
		                _context3.next = 2;
		                return this.getRawIndexes(parameters);
		              case 2:
		                rawIndexes = _context3.sent;
		                indexes = rawIndexes.results.map(function (index) {
		                  return new Index(_this.config, index.uid, index.primaryKey);
		                });
		                return _context3.abrupt("return", Object.assign(Object.assign({}, rawIndexes), {
		                  results: indexes
		                }));
		              case 5:
		              case "end":
		                return _context3.stop();
		            }
		          }, _callee3, this);
		        }));
		      }
		      /**
		       * Get all the indexes in their raw value (no Index instances).
		       *
		       * @param parameters - Parameters to browse the indexes
		       * @returns Promise returning array of raw index information
		       */
		    }, {
		      key: "getRawIndexes",
		      value: function getRawIndexes() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
		            while (1) switch (_context4.prev = _context4.next) {
		              case 0:
		                url = "indexes";
		                _context4.next = 3;
		                return this.httpRequest.get(url, parameters);
		              case 3:
		                return _context4.abrupt("return", _context4.sent);
		              case 4:
		              case "end":
		                return _context4.stop();
		            }
		          }, _callee4, this);
		        }));
		      }
		      /**
		       * Create a new index
		       *
		       * @param uid - The index UID
		       * @param options - Index options
		       * @returns Promise returning Index instance
		       */
		    }, {
		      key: "createIndex",
		      value: function createIndex(uid) {
		        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
		          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
		            while (1) switch (_context5.prev = _context5.next) {
		              case 0:
		                _context5.next = 2;
		                return Index.create(uid, options, this.config);
		              case 2:
		                return _context5.abrupt("return", _context5.sent);
		              case 3:
		              case "end":
		                return _context5.stop();
		            }
		          }, _callee5, this);
		        }));
		      }
		      /**
		       * Update an index
		       *
		       * @param uid - The index UID
		       * @param options - Index options to update
		       * @returns Promise returning Index instance after updating
		       */
		    }, {
		      key: "updateIndex",
		      value: function updateIndex(uid) {
		        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
		          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
		            while (1) switch (_context6.prev = _context6.next) {
		              case 0:
		                _context6.next = 2;
		                return new Index(this.config, uid).update(options);
		              case 2:
		                return _context6.abrupt("return", _context6.sent);
		              case 3:
		              case "end":
		                return _context6.stop();
		            }
		          }, _callee6, this);
		        }));
		      }
		      /**
		       * Delete an index
		       *
		       * @param uid - The index UID
		       * @returns Promise which resolves when index is deleted successfully
		       */
		    }, {
		      key: "deleteIndex",
		      value: function deleteIndex(uid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
		          return _regeneratorRuntime().wrap(function _callee7$(_context7) {
		            while (1) switch (_context7.prev = _context7.next) {
		              case 0:
		                _context7.next = 2;
		                return new Index(this.config, uid).delete();
		              case 2:
		                return _context7.abrupt("return", _context7.sent);
		              case 3:
		              case "end":
		                return _context7.stop();
		            }
		          }, _callee7, this);
		        }));
		      }
		      /**
		       * Deletes an index if it already exists.
		       *
		       * @param uid - The index UID
		       * @returns Promise which resolves to true when index exists and is deleted
		       *   successfully, otherwise false if it does not exist
		       */
		    }, {
		      key: "deleteIndexIfExists",
		      value: function deleteIndexIfExists(uid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
		          return _regeneratorRuntime().wrap(function _callee8$(_context8) {
		            while (1) switch (_context8.prev = _context8.next) {
		              case 0:
		                _context8.prev = 0;
		                _context8.next = 3;
		                return this.deleteIndex(uid);
		              case 3:
		                return _context8.abrupt("return", true);
		              case 6:
		                _context8.prev = 6;
		                _context8.t0 = _context8["catch"](0);
		                if (!(_context8.t0.code === ErrorStatusCode.INDEX_NOT_FOUND)) {
		                  _context8.next = 10;
		                  break;
		                }
		                return _context8.abrupt("return", false);
		              case 10:
		                throw _context8.t0;
		              case 11:
		              case "end":
		                return _context8.stop();
		            }
		          }, _callee8, this, [[0, 6]]);
		        }));
		      }
		      /**
		       * Swaps a list of index tuples.
		       *
		       * @param params - List of indexes tuples to swap.
		       * @returns Promise returning object of the enqueued task
		       */
		    }, {
		      key: "swapIndexes",
		      value: function swapIndexes(params) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee9$(_context9) {
		            while (1) switch (_context9.prev = _context9.next) {
		              case 0:
		                url = '/swap-indexes';
		                _context9.next = 3;
		                return this.httpRequest.post(url, params);
		              case 3:
		                return _context9.abrupt("return", _context9.sent);
		              case 4:
		              case "end":
		                return _context9.stop();
		            }
		          }, _callee9, this);
		        }));
		      }
		      ///
		      /// Multi Search
		      ///
		      /**
		       * Perform multiple search queries.
		       *
		       * It is possible to make multiple search queries on the same index or on
		       * different ones
		       *
		       * @example
		       *
		       * ```ts
		       * client.multiSearch({
		       *   queries: [
		       *     { indexUid: 'movies', q: 'wonder' },
		       *     { indexUid: 'books', q: 'flower' },
		       *   ],
		       * })
		       * ```
		       *
		       * @param queries - Search queries
		       * @param config - Additional request configuration options
		       * @returns Promise containing the search responses
		       */
		    }, {
		      key: "multiSearch",
		      value: function multiSearch(queries, config) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee10$(_context10) {
		            while (1) switch (_context10.prev = _context10.next) {
		              case 0:
		                url = "multi-search";
		                _context10.next = 3;
		                return this.httpRequest.post(url, queries, undefined, config);
		              case 3:
		                return _context10.abrupt("return", _context10.sent);
		              case 4:
		              case "end":
		                return _context10.stop();
		            }
		          }, _callee10, this);
		        }));
		      }
		      ///
		      /// TASKS
		      ///
		      /**
		       * Get the list of all client tasks
		       *
		       * @param parameters - Parameters to browse the tasks
		       * @returns Promise returning all tasks
		       */
		    }, {
		      key: "getTasks",
		      value: function getTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee11() {
		          return _regeneratorRuntime().wrap(function _callee11$(_context11) {
		            while (1) switch (_context11.prev = _context11.next) {
		              case 0:
		                _context11.next = 2;
		                return this.tasks.getTasks(parameters);
		              case 2:
		                return _context11.abrupt("return", _context11.sent);
		              case 3:
		              case "end":
		                return _context11.stop();
		            }
		          }, _callee11, this);
		        }));
		      }
		      /**
		       * Get one task on the client scope
		       *
		       * @param taskUid - Task identifier
		       * @returns Promise returning a task
		       */
		    }, {
		      key: "getTask",
		      value: function getTask(taskUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
		          return _regeneratorRuntime().wrap(function _callee12$(_context12) {
		            while (1) switch (_context12.prev = _context12.next) {
		              case 0:
		                _context12.next = 2;
		                return this.tasks.getTask(taskUid);
		              case 2:
		                return _context12.abrupt("return", _context12.sent);
		              case 3:
		              case "end":
		                return _context12.stop();
		            }
		          }, _callee12, this);
		        }));
		      }
		      /**
		       * Wait for multiple tasks to be finished.
		       *
		       * @param taskUids - Tasks identifier
		       * @param waitOptions - Options on timeout and interval
		       * @returns Promise returning an array of tasks
		       */
		    }, {
		      key: "waitForTasks",
		      value: function waitForTasks(taskUids) {
		        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref$timeOutMs = _ref.timeOutMs,
		          timeOutMs = _ref$timeOutMs === void 0 ? 5000 : _ref$timeOutMs,
		          _ref$intervalMs = _ref.intervalMs,
		          intervalMs = _ref$intervalMs === void 0 ? 50 : _ref$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
		          return _regeneratorRuntime().wrap(function _callee13$(_context13) {
		            while (1) switch (_context13.prev = _context13.next) {
		              case 0:
		                _context13.next = 2;
		                return this.tasks.waitForTasks(taskUids, {
		                  timeOutMs: timeOutMs,
		                  intervalMs: intervalMs
		                });
		              case 2:
		                return _context13.abrupt("return", _context13.sent);
		              case 3:
		              case "end":
		                return _context13.stop();
		            }
		          }, _callee13, this);
		        }));
		      }
		      /**
		       * Wait for a task to be finished.
		       *
		       * @param taskUid - Task identifier
		       * @param waitOptions - Options on timeout and interval
		       * @returns Promise returning an array of tasks
		       */
		    }, {
		      key: "waitForTask",
		      value: function waitForTask(taskUid) {
		        var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
		          _ref2$timeOutMs = _ref2.timeOutMs,
		          timeOutMs = _ref2$timeOutMs === void 0 ? 5000 : _ref2$timeOutMs,
		          _ref2$intervalMs = _ref2.intervalMs,
		          intervalMs = _ref2$intervalMs === void 0 ? 50 : _ref2$intervalMs;
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
		          return _regeneratorRuntime().wrap(function _callee14$(_context14) {
		            while (1) switch (_context14.prev = _context14.next) {
		              case 0:
		                _context14.next = 2;
		                return this.tasks.waitForTask(taskUid, {
		                  timeOutMs: timeOutMs,
		                  intervalMs: intervalMs
		                });
		              case 2:
		                return _context14.abrupt("return", _context14.sent);
		              case 3:
		              case "end":
		                return _context14.stop();
		            }
		          }, _callee14, this);
		        }));
		      }
		      /**
		       * Cancel a list of enqueued or processing tasks.
		       *
		       * @param parameters - Parameters to filter the tasks.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "cancelTasks",
		      value: function cancelTasks(parameters) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee15() {
		          return _regeneratorRuntime().wrap(function _callee15$(_context15) {
		            while (1) switch (_context15.prev = _context15.next) {
		              case 0:
		                _context15.next = 2;
		                return this.tasks.cancelTasks(parameters);
		              case 2:
		                return _context15.abrupt("return", _context15.sent);
		              case 3:
		              case "end":
		                return _context15.stop();
		            }
		          }, _callee15, this);
		        }));
		      }
		      /**
		       * Delete a list of tasks.
		       *
		       * @param parameters - Parameters to filter the tasks.
		       * @returns Promise containing an EnqueuedTask
		       */
		    }, {
		      key: "deleteTasks",
		      value: function deleteTasks() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee16() {
		          return _regeneratorRuntime().wrap(function _callee16$(_context16) {
		            while (1) switch (_context16.prev = _context16.next) {
		              case 0:
		                _context16.next = 2;
		                return this.tasks.deleteTasks(parameters);
		              case 2:
		                return _context16.abrupt("return", _context16.sent);
		              case 3:
		              case "end":
		                return _context16.stop();
		            }
		          }, _callee16, this);
		        }));
		      }
		      ///
		      /// KEYS
		      ///
		      /**
		       * Get all API keys
		       *
		       * @param parameters - Parameters to browse the indexes
		       * @returns Promise returning an object with keys
		       */
		    }, {
		      key: "getKeys",
		      value: function getKeys() {
		        var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
		          var url, keys;
		          return _regeneratorRuntime().wrap(function _callee17$(_context17) {
		            while (1) switch (_context17.prev = _context17.next) {
		              case 0:
		                url = "keys";
		                _context17.next = 3;
		                return this.httpRequest.get(url, parameters);
		              case 3:
		                keys = _context17.sent;
		                keys.results = keys.results.map(function (key) {
		                  return Object.assign(Object.assign({}, key), {
		                    createdAt: new Date(key.createdAt),
		                    updatedAt: new Date(key.updatedAt)
		                  });
		                });
		                return _context17.abrupt("return", keys);
		              case 6:
		              case "end":
		                return _context17.stop();
		            }
		          }, _callee17, this);
		        }));
		      }
		      /**
		       * Get one API key
		       *
		       * @param keyOrUid - Key or uid of the API key
		       * @returns Promise returning a key
		       */
		    }, {
		      key: "getKey",
		      value: function getKey(keyOrUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee18$(_context18) {
		            while (1) switch (_context18.prev = _context18.next) {
		              case 0:
		                url = "keys/".concat(keyOrUid);
		                _context18.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context18.abrupt("return", _context18.sent);
		              case 4:
		              case "end":
		                return _context18.stop();
		            }
		          }, _callee18, this);
		        }));
		      }
		      /**
		       * Create one API key
		       *
		       * @param options - Key options
		       * @returns Promise returning a key
		       */
		    }, {
		      key: "createKey",
		      value: function createKey(options) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee19$(_context19) {
		            while (1) switch (_context19.prev = _context19.next) {
		              case 0:
		                url = "keys";
		                _context19.next = 3;
		                return this.httpRequest.post(url, options);
		              case 3:
		                return _context19.abrupt("return", _context19.sent);
		              case 4:
		              case "end":
		                return _context19.stop();
		            }
		          }, _callee19, this);
		        }));
		      }
		      /**
		       * Update one API key
		       *
		       * @param keyOrUid - Key
		       * @param options - Key options
		       * @returns Promise returning a key
		       */
		    }, {
		      key: "updateKey",
		      value: function updateKey(keyOrUid, options) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee20$(_context20) {
		            while (1) switch (_context20.prev = _context20.next) {
		              case 0:
		                url = "keys/".concat(keyOrUid);
		                _context20.next = 3;
		                return this.httpRequest.patch(url, options);
		              case 3:
		                return _context20.abrupt("return", _context20.sent);
		              case 4:
		              case "end":
		                return _context20.stop();
		            }
		          }, _callee20, this);
		        }));
		      }
		      /**
		       * Delete one API key
		       *
		       * @param keyOrUid - Key
		       * @returns
		       */
		    }, {
		      key: "deleteKey",
		      value: function deleteKey(keyOrUid) {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee21() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee21$(_context21) {
		            while (1) switch (_context21.prev = _context21.next) {
		              case 0:
		                url = "keys/".concat(keyOrUid);
		                _context21.next = 3;
		                return this.httpRequest.delete(url);
		              case 3:
		                return _context21.abrupt("return", _context21.sent);
		              case 4:
		              case "end":
		                return _context21.stop();
		            }
		          }, _callee21, this);
		        }));
		      }
		      ///
		      /// HEALTH
		      ///
		      /**
		       * Checks if the server is healthy, otherwise an error will be thrown.
		       *
		       * @returns Promise returning an object with health details
		       */
		    }, {
		      key: "health",
		      value: function health() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee22() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee22$(_context22) {
		            while (1) switch (_context22.prev = _context22.next) {
		              case 0:
		                url = "health";
		                _context22.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context22.abrupt("return", _context22.sent);
		              case 4:
		              case "end":
		                return _context22.stop();
		            }
		          }, _callee22, this);
		        }));
		      }
		      /**
		       * Checks if the server is healthy, return true or false.
		       *
		       * @returns Promise returning a boolean
		       */
		    }, {
		      key: "isHealthy",
		      value: function isHealthy() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee23() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee23$(_context23) {
		            while (1) switch (_context23.prev = _context23.next) {
		              case 0:
		                _context23.prev = 0;
		                url = "health";
		                _context23.next = 4;
		                return this.httpRequest.get(url);
		              case 4:
		                return _context23.abrupt("return", true);
		              case 7:
		                _context23.prev = 7;
		                _context23.t0 = _context23["catch"](0);
		                return _context23.abrupt("return", false);
		              case 10:
		              case "end":
		                return _context23.stop();
		            }
		          }, _callee23, this, [[0, 7]]);
		        }));
		      }
		      ///
		      /// STATS
		      ///
		      /**
		       * Get the stats of all the database
		       *
		       * @returns Promise returning object of all the stats
		       */
		    }, {
		      key: "getStats",
		      value: function getStats() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee24() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee24$(_context24) {
		            while (1) switch (_context24.prev = _context24.next) {
		              case 0:
		                url = "stats";
		                _context24.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context24.abrupt("return", _context24.sent);
		              case 4:
		              case "end":
		                return _context24.stop();
		            }
		          }, _callee24, this);
		        }));
		      }
		      ///
		      /// VERSION
		      ///
		      /**
		       * Get the version of MeiliSearch
		       *
		       * @returns Promise returning object with version details
		       */
		    }, {
		      key: "getVersion",
		      value: function getVersion() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee25() {
		          var url;
		          return _regeneratorRuntime().wrap(function _callee25$(_context25) {
		            while (1) switch (_context25.prev = _context25.next) {
		              case 0:
		                url = "version";
		                _context25.next = 3;
		                return this.httpRequest.get(url);
		              case 3:
		                return _context25.abrupt("return", _context25.sent);
		              case 4:
		              case "end":
		                return _context25.stop();
		            }
		          }, _callee25, this);
		        }));
		      }
		      ///
		      /// DUMPS
		      ///
		      /**
		       * Creates a dump
		       *
		       * @returns Promise returning object of the enqueued task
		       */
		    }, {
		      key: "createDump",
		      value: function createDump() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee26() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee26$(_context26) {
		            while (1) switch (_context26.prev = _context26.next) {
		              case 0:
		                url = "dumps";
		                _context26.next = 3;
		                return this.httpRequest.post(url);
		              case 3:
		                task = _context26.sent;
		                return _context26.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context26.stop();
		            }
		          }, _callee26, this);
		        }));
		      }
		      ///
		      /// SNAPSHOTS
		      ///
		      /**
		       * Creates a snapshot
		       *
		       * @returns Promise returning object of the enqueued task
		       */
		    }, {
		      key: "createSnapshot",
		      value: function createSnapshot() {
		        return __awaiter(this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee27() {
		          var url, task;
		          return _regeneratorRuntime().wrap(function _callee27$(_context27) {
		            while (1) switch (_context27.prev = _context27.next) {
		              case 0:
		                url = "snapshots";
		                _context27.next = 3;
		                return this.httpRequest.post(url);
		              case 3:
		                task = _context27.sent;
		                return _context27.abrupt("return", new EnqueuedTask(task));
		              case 5:
		              case "end":
		                return _context27.stop();
		            }
		          }, _callee27, this);
		        }));
		      }
		      ///
		      /// TOKENS
		      ///
		      /**
		       * Generate a tenant token
		       *
		       * @param apiKeyUid - The uid of the api key used as issuer of the token.
		       * @param searchRules - Search rules that are applied to every search.
		       * @param options - Token options to customize some aspect of the token.
		       * @returns The token in JWT format.
		       */
		    }, {
		      key: "generateTenantToken",
		      value: function generateTenantToken(_apiKeyUid, _searchRules, _options) {
		        var error = new Error();
		        throw new Error("Meilisearch: failed to generate a tenant token. Generation of a token only works in a node environment \n ".concat(error.stack, "."));
		      }
		    }]);
		    return Client;
		  }();

		  var MeiliSearch = /*#__PURE__*/function (_Client) {
		    _inherits(MeiliSearch, _Client);
		    var _super = _createSuper(MeiliSearch);
		    function MeiliSearch(config) {
		      _classCallCheck(this, MeiliSearch);
		      return _super.call(this, config);
		    }
		    return _createClass(MeiliSearch);
		  }(Client);

		  exports.ContentTypeEnum = ContentTypeEnum;
		  exports.ErrorStatusCode = ErrorStatusCode;
		  exports.Index = Index;
		  exports.MatchingStrategies = MatchingStrategies;
		  exports.MeiliSearch = MeiliSearch;
		  exports.MeiliSearchApiError = MeiliSearchApiError;
		  exports.MeiliSearchCommunicationError = MeiliSearchCommunicationError;
		  exports.MeiliSearchError = MeiliSearchError;
		  exports.MeiliSearchTimeOutError = MeiliSearchTimeOutError;
		  exports.Meilisearch = MeiliSearch;
		  exports.TaskStatus = TaskStatus;
		  exports.TaskTypes = TaskTypes;
		  exports["default"] = MeiliSearch;
		  exports.httpErrorHandler = httpErrorHandler;
		  exports.httpResponseErrorHandler = httpResponseErrorHandler;
		  exports.versionErrorHintMessage = versionErrorHintMessage;

		  Object.defineProperty(exports, '__esModule', { value: true });

		})); 
	} (meilisearch_umd, meilisearch_umd.exports));

	var meilisearch_umdExports = meilisearch_umd.exports;

	/**
	 * Ghost Meilisearch Search UI
	 * A search UI for Ghost blogs using Meilisearch
	 */
	class GhostMeilisearchSearch {
	  constructor(config = {}) {
	    // Default configuration
	    this.config = {
	      meilisearchHost: 'http://localhost:7700',
	      meilisearchApiKey: '',
	      indexName: 'ghost_posts',
	      theme: 'system', // 'light', 'dark', 'system'
	      commonSearches: [],
	      searchFields: {
	        title: { weight: 4, highlight: true },
	        excerpt: { weight: 2, highlight: true },
	        html: { weight: 1, highlight: true }
	      },
	      ...config
	    };

	    // Initialize state
	    this.state = {
	      isOpen: false,
	      query: '',
	      results: [],
	      loading: false,
	      selectedIndex: -1,
	      error: null
	    };

	    // Initialize Meilisearch client
	    this.client = new meilisearch_umdExports.MeiliSearch({
	      host: this.config.meilisearchHost,
	      apiKey: this.config.meilisearchApiKey
	    });

	    // Get the index
	    this.index = this.client.index(this.config.indexName);

	    // Create DOM elements
	    this.createDOMElements();

	    // Add event listeners
	    this.addEventListeners();
	  }

	  /**
	   * Create DOM elements for the search UI
	   */
	  createDOMElements() {
	    // Create wrapper element
	    this.wrapper = document.createElement('div');
	    this.wrapper.id = 'ms-search-wrapper';
	    document.body.appendChild(this.wrapper);

	    // Create modal element
	    this.modal = document.createElement('div');
	    this.modal.id = 'ms-search-modal';
	    this.modal.classList.add('hidden');
	    this.wrapper.appendChild(this.modal);

	    // Create modal content
	    this.modal.innerHTML = `
      <div class="ms-backdrop"></div>
      <div class="ms-modal-container">
        <button class="ms-close-button" aria-label="Close search">&times;</button>
        <div class="ms-modal-content">
          <div class="ms-search-header">
            <input type="text" class="ms-search-input" placeholder="Search..." aria-label="Search">
          </div>
          <div class="ms-keyboard-hints">
            <span><span class="ms-kbd">↑</span><span class="ms-kbd">↓</span> to navigate</span>
            <span><span class="ms-kbd">↵</span> to select</span>
            <span><span class="ms-kbd">ESC</span> to close</span>
          </div>
          <div class="ms-results-container">
            <div class="ms-common-searches">
              <div class="ms-common-searches-title">Common searches</div>
              <div class="ms-common-searches-list"></div>
            </div>
            <ul class="ms-hits-list"></ul>
            <div class="ms-loading-state">
              <div class="ms-loading-spinner"></div>
              <div>Searching...</div>
            </div>
            <div class="ms-empty-state">
              <div class="ms-empty-message">No results found for your search.</div>
            </div>
          </div>
        </div>
      </div>
    `;

	    // Get references to elements
	    this.searchInput = this.modal.querySelector('.ms-search-input');
	    this.closeButton = this.modal.querySelector('.ms-close-button');
	    this.hitsList = this.modal.querySelector('.ms-hits-list');
	    this.loadingState = this.modal.querySelector('.ms-loading-state');
	    this.emptyState = this.modal.querySelector('.ms-empty-state');
	    this.commonSearchesList = this.modal.querySelector('.ms-common-searches-list');
	    this.commonSearchesSection = this.modal.querySelector('.ms-common-searches');

	    // Populate common searches
	    this.populateCommonSearches();

	    // Apply theme based on page color scheme
	    this.applyTheme();
	  }

	  /**
	   * Populate common searches section
	   */
	  populateCommonSearches() {
	    if (!this.config.commonSearches || this.config.commonSearches.length === 0) {
	      this.commonSearchesSection.classList.add('hidden');
	      return;
	    }

	    this.commonSearchesList.innerHTML = '';
	    this.config.commonSearches.forEach(search => {
	      const button = document.createElement('button');
	      button.classList.add('ms-common-search-btn');
	      button.textContent = search;
	      button.addEventListener('click', () => {
	        this.searchInput.value = search;
	        this.state.query = search;
	        this.performSearch();
	      });
	      this.commonSearchesList.appendChild(button);
	    });
	  }

	  /**
	   * Apply theme based on page color scheme
	   */
	  applyTheme() {
	    // First check for data-color-scheme on html or body element
	    const htmlColorScheme = document.documentElement.getAttribute('data-color-scheme');
	    const bodyColorScheme = document.body.getAttribute('data-color-scheme');
	    const pageColorScheme = htmlColorScheme || bodyColorScheme || this.config.theme;
	    
	    // Remove any existing classes
	    this.wrapper.classList.remove('dark', 'light');
	    
	    if (pageColorScheme === 'dark') {
	      this.wrapper.classList.add('dark');
	    } else if (pageColorScheme === 'system') {
	      // Check system preference
	      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	      if (prefersDark) {
	        this.wrapper.classList.add('dark');
	      } else {
	        this.wrapper.classList.add('light');
	      }
	      
	      // Listen for changes in system preference
	      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
	        this.wrapper.classList.remove('dark', 'light');
	        if (e.matches) {
	          this.wrapper.classList.add('dark');
	        } else {
	          this.wrapper.classList.add('light');
	        }
	      });
	    } else {
	      // Default to light
	      this.wrapper.classList.add('light');
	    }
	    
	    // Add MutationObserver to watch for changes in data-color-scheme
	    this.setupColorSchemeObserver();
	  }
	  
	  /**
	   * Set up observer to watch for changes in data-color-scheme
	   */
	  setupColorSchemeObserver() {
	    const observer = new MutationObserver(mutations => {
	      mutations.forEach(mutation => {
	        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-scheme') {
	          this.applyTheme();
	        }
	      });
	    });
	    
	    // Observe both html and body for changes
	    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] });
	    observer.observe(document.body, { attributes: true, attributeFilter: ['data-color-scheme'] });
	  }

	  /**
	   * Add event listeners
	   */
	  addEventListeners() {
	    // Close button click
	    this.closeButton.addEventListener('click', () => this.close());

	    // Backdrop click
	    this.modal.querySelector('.ms-backdrop').addEventListener('click', () => this.close());

	    // Search input
	    this.searchInput.addEventListener('input', () => {
	      this.state.query = this.searchInput.value;
	      this.performSearch();
	    });

	    // Keyboard navigation
	    document.addEventListener('keydown', this.handleKeyDown.bind(this));

	    // Add click event to search triggers
	    document.querySelectorAll('[data-ghost-search]').forEach(el => {
	      el.addEventListener('click', e => {
	        e.preventDefault();
	        this.open();
	      });
	    });

	    // Keyboard shortcuts
	    document.addEventListener('keydown', e => {
	      // Cmd+K or Ctrl+K
	      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
	        e.preventDefault();
	        this.open();
	      }
	      
	      // Forward slash (/) when not in an input
	      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
	        e.preventDefault();
	        this.open();
	      }
	    });
	    
	    // Handle window resize
	    window.addEventListener('resize', () => {
	      if (this.state.isOpen) {
	        // Adjust modal position and size on resize
	        this.adjustModalForScreenSize();
	      }
	    });
	  }

	  /**
	   * Handle keyboard navigation
	   */
	  handleKeyDown(e) {
	    if (!this.state.isOpen) return;

	    switch (e.key) {
	      case 'Escape':
	        e.preventDefault();
	        this.close();
	        break;
	      case 'ArrowDown':
	        e.preventDefault(); // Prevent page scrolling
	        this.navigateResults(1);
	        break;
	      case 'ArrowUp':
	        e.preventDefault(); // Prevent page scrolling
	        this.navigateResults(-1);
	        break;
	      case 'Enter':
	        e.preventDefault();
	        this.selectResult();
	        break;
	    }
	  }
	  
	  /**
	   * Adjust modal for different screen sizes
	   */
	  adjustModalForScreenSize() {
	    const isMobile = window.innerWidth < 640;
	    
	    if (isMobile) {
	      // Mobile optimizations
	      this.modal.querySelector('.ms-modal-content').style.height = '100vh';
	      this.modal.querySelector('.ms-results-container').style.maxHeight = 'calc(100vh - 7rem)';
	    } else {
	      // Desktop optimizations
	      this.modal.querySelector('.ms-modal-content').style.height = '';
	      this.modal.querySelector('.ms-results-container').style.maxHeight = '';
	    }
	  }

	  /**
	   * Navigate through search results
	   */
	  navigateResults(direction) {
	    const results = this.state.results;
	    if (results.length === 0) return;

	    // Calculate new index
	    let newIndex = this.state.selectedIndex + direction;
	    
	    // Wrap around
	    if (newIndex < 0) {
	      newIndex = results.length - 1;
	    } else if (newIndex >= results.length) {
	      newIndex = 0;
	    }

	    // Update selected index
	    this.state.selectedIndex = newIndex;
	    
	    // Update UI
	    this.updateSelectedResult();
	  }

	  /**
	   * Update the selected result in the UI
	   */
	  updateSelectedResult() {
	    // Remove selected class from all results
	    const resultElements = this.hitsList.querySelectorAll('.ms-result-link');
	    resultElements.forEach(el => el.classList.remove('ms-selected'));

	    // Add selected class to current result
	    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < resultElements.length) {
	      const selectedElement = resultElements[this.state.selectedIndex];
	      selectedElement.classList.add('ms-selected');
	      
	      // Scroll into view if needed
	      const container = this.modal.querySelector('.ms-results-container');
	      const elementTop = selectedElement.offsetTop;
	      const elementBottom = elementTop + selectedElement.offsetHeight;
	      const containerTop = container.scrollTop;
	      const containerBottom = containerTop + container.offsetHeight;

	      if (elementTop < containerTop) {
	        container.scrollTop = elementTop;
	      } else if (elementBottom > containerBottom) {
	        container.scrollTop = elementBottom - container.offsetHeight;
	      }
	    }
	  }

	  /**
	   * Select the current result
	   */
	  selectResult() {
	    const results = this.state.results;
	    if (results.length === 0 || this.state.selectedIndex < 0) return;

	    const selectedResult = results[this.state.selectedIndex];
	    if (selectedResult && selectedResult.url) {
	      window.location.href = selectedResult.url;
	    } else if (selectedResult && selectedResult.slug) {
	      // Fallback to slug if url is not available
	      window.location.href = `/${selectedResult.slug}`;
	    }
	  }

	  /**
	   * Open the search modal
	   */
	  open() {
	    this.state.isOpen = true;
	    this.modal.classList.remove('hidden');
	    this.searchInput.focus();
	    
	    // Check if search input is empty and hide elements if needed
	    if (this.state.query.trim() === '') {
	      this.modal.querySelector('.ms-keyboard-hints').classList.add('hidden');
	      this.modal.querySelector('.ms-results-container').classList.add('ms-results-empty');
	    } else {
	      this.modal.querySelector('.ms-keyboard-hints').classList.remove('hidden');
	      this.modal.querySelector('.ms-results-container').classList.remove('ms-results-empty');
	    }
	    
	    // Prevent body scrolling
	    document.body.style.overflow = 'hidden';
	    
	    // Adjust for screen size
	    this.adjustModalForScreenSize();
	  }

	  /**
	   * Close the search modal
	   */
	  close() {
	    this.state.isOpen = false;
	    this.modal.classList.add('hidden');
	    
	    // Reset state
	    this.state.selectedIndex = -1;
	    
	    // Allow body scrolling
	    document.body.style.overflow = '';
	  }

	  /**
	   * Perform search with current query
	   */
	  async performSearch() {
	    const query = this.state.query.trim();
	    
	    // Show/hide common searches based on query
	    if (query === '') {
	      this.commonSearchesSection.classList.remove('hidden');
	      this.hitsList.innerHTML = '';
	      this.loadingState.classList.remove('active');
	      this.emptyState.classList.remove('active');
	      this.state.results = [];

	      // Hide keyboard hints and results container when search is empty
	      this.modal.querySelector('.ms-keyboard-hints').classList.add('hidden');
	      this.modal.querySelector('.ms-results-container').classList.add('ms-results-empty');

	      return;
	    } else {
	      this.commonSearchesSection.classList.add('hidden');

	      // Show keyboard hints and results container when search has content
	      this.modal.querySelector('.ms-keyboard-hints').classList.remove('hidden');
	      this.modal.querySelector('.ms-results-container').classList.remove('ms-results-empty');
	    }

	    // Set loading state
	    this.state.loading = true;
	    this.loadingState.classList.add('active');
	    this.emptyState.classList.remove('active');
	    
	    try {
	      // Prepare search parameters
	      const searchParams = {
	        limit: 10,
	        attributesToHighlight: Object.entries(this.config.searchFields)
	          .filter(([_, config]) => config.highlight)
	          .map(([field]) => field)
	      };

	      // Perform search
	      const results = await this.index.search(query, searchParams);
	      
	      // Update state
	      this.state.loading = false;
	      this.state.results = results.hits;
	      this.state.selectedIndex = -1;
	      
	      // Update UI
	      this.renderResults(results.hits);
	      
	      // Hide loading state
	      this.loadingState.classList.remove('active');
	      
	      // Show empty state if no results
	      if (results.hits.length === 0) {
	        this.emptyState.classList.add('active');
	      }
	    } catch (error) {
	      console.error('Search error:', error);
	      this.state.loading = false;
	      this.state.error = error;
	      this.loadingState.classList.remove('active');
	      
	      // Show empty state with error message
	      this.emptyState.classList.add('active');
	      this.emptyState.querySelector('.ms-empty-message').textContent = 'An error occurred while searching. Please try again.';
	    }
	  }

	  /**
	   * Render search results
	   */
	  renderResults(hits) {
	    this.hitsList.innerHTML = '';
	    
	    hits.forEach(hit => {
	      const li = document.createElement('li');
	      
	      // Create result link
	      const link = document.createElement('a');
	      if (hit.url) {
	        link.href = hit.url;
	      } else if (hit.slug) {
	        // Fallback to slug if url is not available
	        link.href = `/${hit.slug}`;
	      }
	      link.classList.add('ms-result-link');
	      
	      // Create result item container
	      const resultItem = document.createElement('div');
	      resultItem.classList.add('ms-result-item');
	      
	      // Create title
	      const title = document.createElement('h3');
	      title.classList.add('ms-result-title');
	      
	      // Clean up highlighting if needed
	      let titleContent = hit._highlightResult?.title?.value || hit.title;
	      titleContent = titleContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
	      title.innerHTML = titleContent;
	      
	      // Create excerpt
	      const excerpt = document.createElement('p');
	      excerpt.classList.add('ms-result-excerpt');
	      
	      // Use highlighted excerpt if available, otherwise use regular excerpt
	      if (hit._highlightResult?.excerpt?.value) {
	        let excerptContent = hit._highlightResult.excerpt.value;
	        excerptContent = excerptContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
	        excerpt.innerHTML = excerptContent;
	      } else if (hit._highlightResult?.html?.value) {
	        // If excerpt isn't highlighted but HTML is, use a snippet from HTML
	        const div = document.createElement('div');
	        div.innerHTML = hit._highlightResult.html.value;
	        const text = div.textContent || '';
	        excerpt.innerHTML = text.substring(0, 150) + '...';
	      } else {
	        excerpt.textContent = hit.excerpt || '';
	      }
	      
	      // Append elements
	      resultItem.appendChild(title);
	      resultItem.appendChild(excerpt);
	      link.appendChild(resultItem);
	      li.appendChild(link);
	      this.hitsList.appendChild(li);
	    });
	  }
	}

	// Initialize search if configuration is available
	if (window.__MS_SEARCH_CONFIG__) {
	  window.ghostMeilisearchSearch = new GhostMeilisearchSearch(window.__MS_SEARCH_CONFIG__);
	}

	// Add a utility method to help with initialization
	GhostMeilisearchSearch.initialize = function(config) {
	  if (!window.ghostMeilisearchSearch) {
	    window.ghostMeilisearchSearch = new GhostMeilisearchSearch(config);
	  }
	  return window.ghostMeilisearchSearch;
	};

	return GhostMeilisearchSearch;

}));
//# sourceMappingURL=search.js.map
