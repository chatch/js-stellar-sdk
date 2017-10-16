"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CallBuilder = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _errors = require("./errors");

var _forEach = require("lodash/forEach");

var _forEach2 = _interopRequireDefault(_forEach);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var URI = require("urijs");
var URITemplate = require("urijs/src/URITemplate");

var axios = require("axios");
var EventSource = typeof window === 'undefined' ? require('eventsource') : window.EventSource;
var toBluebird = require("bluebird").resolve;

/**
 * Creates a new {@link CallBuilder} pointed to server defined by serverUrl.
 *
 * This is an **abstract** class. Do not create this object directly, use {@link Server} class.
 * @param {string} serverUrl
 * @class CallBuilder
 */

var CallBuilder = function () {
  function CallBuilder(serverUrl) {
    _classCallCheck(this, CallBuilder);

    this.url = serverUrl;
    this.filter = [];
  }

  /**
   * @private
   */


  _createClass(CallBuilder, [{
    key: "checkFilter",
    value: function checkFilter() {
      if (this.filter.length >= 2) {
        throw new _errors.BadRequestError("Too many filters specified", this.filter);
      }
      if (this.filter.length === 1) {
        this.url.segment(this.filter[0]);
      }
    }

    /**
     * Triggers a HTTP request using this builder's current configuration.
     * Returns a Promise that resolves to the server's response.
     * @returns {Promise}
     */

  }, {
    key: "call",
    value: function call() {
      var _this = this;

      this.checkFilter();
      return this._sendNormalRequest(this.url).then(function (r) {
        return _this._parseResponse(r);
      });
    }

    /**
     * Creates an EventSource that listens for incoming messages from the server. To stop listening for new
     * events call the function returned by this method.
     * @see [Horizon Response Format](https://www.stellar.org/developers/horizon/learn/responses.html)
     * @see [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
     * @param {object} [options] EventSource options.
     * @param {function} [options.onmessage] Callback function to handle incoming messages.
     * @param {function} [options.onerror] Callback function to handle errors.
     * @returns {function} Close function. Run to close the connection and stop listening for new events.
     */

  }, {
    key: "stream",
    value: function stream(options) {
      var _this2 = this;

      this.checkFilter();

      // EventSource object
      var es = void 0;
      // timeout is the id of the timeout to be triggered if there were no new messages
      // in the last 15 seconds. The timeout is reset when a new message arrive.
      // It prevents closing EventSource object in case of 504 errors as `readyState`
      // property is not reliable.
      var timeout = void 0;

      var createTimeout = function createTimeout() {
        timeout = setTimeout(function () {
          es.close();
          es = createEventSource();
        }, 15 * 1000);
      };

      var createEventSource = function createEventSource() {
        try {
          es = new EventSource(_this2.url.toString());
        } catch (err) {
          if (options.onerror) {
            options.onerror(err);
            options.onerror('EventSource not supported');
          }
          return false;
        }

        createTimeout();

        es.onmessage = function (message) {
          var result = message.data ? _this2._parseRecord(JSON.parse(message.data)) : message;
          if (result.paging_token) {
            _this2.url.setQuery("cursor", result.paging_token);
          }
          clearTimeout(timeout);
          createTimeout();
          options.onmessage(result);
        };

        es.onerror = function (error) {
          if (options.onerror) {
            options.onerror(error);
          }
        };

        return es;
      };

      createEventSource();
      return function close() {
        clearTimeout(timeout);
        es.close();
      };
    }

    /**
     * @private
     */

  }, {
    key: "_requestFnForLink",
    value: function _requestFnForLink(link) {
      var _this3 = this;

      return function (opts) {
        var uri = void 0;

        if (link.templated) {
          var template = URITemplate(link.href);
          uri = URI(template.expand(opts || {}));
        } else {
          uri = URI(link.href);
        }

        return _this3._sendNormalRequest(uri).then(function (r) {
          return _this3._parseRecord(r);
        });
      };
    }

    /**
     * Convert each link into a function on the response object.
     * @private
     */

  }, {
    key: "_parseRecord",
    value: function _parseRecord(json) {
      var _this4 = this;

      if (!json._links) {
        return json;
      }
      (0, _forEach2.default)(json._links, function (n, key) {
        // If the key with the link name already exists, create a copy
        if (typeof json[key] != 'undefined') {
          json[key + "_attr"] = json[key];
        }
        json[key] = _this4._requestFnForLink(n);
      });
      return json;
    }
  }, {
    key: "_sendNormalRequest",
    value: function _sendNormalRequest(url) {
      if (url.authority() === '') {
        url = url.authority(this.url.authority());
      }

      if (url.protocol() === '') {
        url = url.protocol(this.url.protocol());
      }

    // chatch: REMOVED the following fix to enable caching of horizon requests
    //          in stellar-explorer - see the service worker configuration in
    //          webpack.config.prod.js in stellar-explorer project:
    //
    // Temp fix for: https://github.com/stellar/js-stellar-sdk/issues/15
    //  url.addQuery('c', Math.random());
      var promise = axios.get(url.toString()).then(function (response) {
        return response.data;
      }).catch(this._handleNetworkError);
      return toBluebird(promise);
    }

    /**
     * @private
     */

  }, {
    key: "_parseResponse",
    value: function _parseResponse(json) {
      if (json._embedded && json._embedded.records) {
        return this._toCollectionPage(json);
      } else {
        return this._parseRecord(json);
      }
    }

    /**
     * @private
     */

  }, {
    key: "_toCollectionPage",
    value: function _toCollectionPage(json) {
      var _this5 = this;

      for (var i = 0; i < json._embedded.records.length; i++) {
        json._embedded.records[i] = this._parseRecord(json._embedded.records[i]);
      }
      return {
        records: json._embedded.records,
        next: function next() {
          return _this5._sendNormalRequest(URI(json._links.next.href)).then(function (r) {
            return _this5._toCollectionPage(r);
          });
        },
        prev: function prev() {
          return _this5._sendNormalRequest(URI(json._links.prev.href)).then(function (r) {
            return _this5._toCollectionPage(r);
          });
        }
      };
    }

    /**
     * @private
     */

  }, {
    key: "_handleNetworkError",
    value: function _handleNetworkError(response) {
      if (response instanceof Error) {
        return Promise.reject(response);
      } else {
        switch (response.status) {
          case 404:
            return Promise.reject(new _errors.NotFoundError(response.data, response));
          default:
            return Promise.reject(new _errors.NetworkError(response.status, response));
        }
      }
    }

    /**
     * Adds `cursor` parameter to the current call. Returns the CallBuilder object on which this method has been called.
     * @see [Paging](https://www.stellar.org/developers/horizon/learn/paging.html)
     * @param {string} cursor A cursor is a value that points to a specific location in a collection of resources.
     */

  }, {
    key: "cursor",
    value: function cursor(_cursor) {
      this.url.addQuery("cursor", _cursor);
      return this;
    }

    /**
     * Adds `limit` parameter to the current call. Returns the CallBuilder object on which this method has been called.
     * @see [Paging](https://www.stellar.org/developers/horizon/learn/paging.html)
     * @param {number} number Number of records the server should return.
     */

  }, {
    key: "limit",
    value: function limit(number) {
      this.url.addQuery("limit", number);
      return this;
    }

    /**
     * Adds `order` parameter to the current call. Returns the CallBuilder object on which this method has been called.
     * @param {"asc"|"desc"} direction
     */

  }, {
    key: "order",
    value: function order(direction) {
      this.url.addQuery("order", direction);
      return this;
    }
  }]);

  return CallBuilder;
}();

exports.CallBuilder = CallBuilder;
