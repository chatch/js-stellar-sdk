"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Server = exports.SUBMIT_TRANSACTION_TIMEOUT = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _errors = require("./errors");

var _account_call_builder = require("./account_call_builder");

var _account_response = require("./account_response");

var _config = require("./config");

var _ledger_call_builder = require("./ledger_call_builder");

var _transaction_call_builder = require("./transaction_call_builder");

var _operation_call_builder = require("./operation_call_builder");

var _offer_call_builder = require("./offer_call_builder");

var _orderbook_call_builder = require("./orderbook_call_builder");

var _path_call_builder = require("./path_call_builder");

var _payment_call_builder = require("./payment_call_builder");

var _effect_call_builder = require("./effect_call_builder");

var _friendbot_builder = require("./friendbot_builder");

var _stellarBase = require("stellar-base");

var _isString = require("lodash/isString");

var _isString2 = _interopRequireDefault(_isString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require("axios");
var toBluebird = require("bluebird").resolve;
var URI = require("urijs");
var URITemplate = require("urijs").URITemplate;

var SUBMIT_TRANSACTION_TIMEOUT = exports.SUBMIT_TRANSACTION_TIMEOUT = 20 * 1000;

var Server = exports.Server = function () {
    /**
     * Server handles the network connection to a [Horizon](https://www.stellar.org/developers/horizon/learn/index.html)
     * instance and exposes an interface for requests to that instance.
     * @constructor
     * @param {string} serverURL Horizon Server URL (ex. `https://horizon-testnet.stellar.org`).
     * @param {object} [opts]
     * @param {boolean} [opts.allowHttp] - Allow connecting to http servers, default: `false`. This must be set to false in production deployments! You can also use {@link Config} class to set this globally.
     */
    function Server(serverURL) {
        var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Server);

        this.serverURL = URI(serverURL);

        var allowHttp = _config.Config.isAllowHttp();
        if (typeof opts.allowHttp !== 'undefined') {
            allowHttp = opts.allowHttp;
        }

        if (this.serverURL.protocol() != 'https' && !allowHttp) {
            throw new Error('Cannot connect to insecure horizon server');
        }
    }

    /**
     * Submits a transaction to the network.
     * @see [Post Transaction](https://www.stellar.org/developers/horizon/reference/transactions-create.html)
     * @param {Transaction} transaction - The transaction to submit.
     * @returns {Promise} Promise that resolves or rejects with response from horizon.
     */


    _createClass(Server, [{
        key: "submitTransaction",
        value: function submitTransaction(transaction) {
            var tx = encodeURIComponent(transaction.toEnvelope().toXDR().toString("base64"));
            var promise = axios.post(URI(this.serverURL).path('transactions').toString(), "tx=" + tx, { timeout: SUBMIT_TRANSACTION_TIMEOUT }).then(function (response) {
                return response.data;
            }).catch(function (response) {
                if (response instanceof Error) {
                    return Promise.reject(response);
                } else {
                    return Promise.reject(response.data);
                }
            });
            return toBluebird(promise);
        }

        /**
         * Returns new {@link AccountCallBuilder} object configured by a current Horizon server configuration.
         * @returns {AccountCallBuilder}
         */

    }, {
        key: "accounts",
        value: function accounts() {
            return new _account_call_builder.AccountCallBuilder(URI(this.serverURL));
        }

        /**
         * Returns new {@link LedgerCallBuilder} object configured by a current Horizon server configuration.
         * @returns {LedgerCallBuilder}
         */

    }, {
        key: "ledgers",
        value: function ledgers() {
            return new _ledger_call_builder.LedgerCallBuilder(URI(this.serverURL));
        }

        /**
         * Returns new {@link TransactionCallBuilder} object configured by a current Horizon server configuration.
         * @returns {TransactionCallBuilder}
         */

    }, {
        key: "transactions",
        value: function transactions() {
            return new _transaction_call_builder.TransactionCallBuilder(URI(this.serverURL));
        }

        /**
         * People on the Stellar network can make offers to buy or sell assets. This endpoint represents all the offers a particular account makes.
         * Currently this method only supports querying offers for account and should be used like this:
         * ```
         * server.offers('accounts', accountId)
         *  .then(function(offers) {
         *    console.log(offers);
         *  });
         * ```
         * @param {string} resource Resource to query offers
         * @param {...string} resourceParams Parameters for selected resource
         * @returns OfferCallBuilder
         */

    }, {
        key: "offers",
        value: function offers(resource) {
            for (var _len = arguments.length, resourceParams = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                resourceParams[_key - 1] = arguments[_key];
            }

            return new (Function.prototype.bind.apply(_offer_call_builder.OfferCallBuilder, [null].concat([URI(this.serverURL), resource], resourceParams)))();
        }

        /**
         * Returns new {@link OrderbookCallBuilder} object configured by a current Horizon server configuration.
         * @param {Asset} selling Asset being sold
         * @param {Asset} buying Asset being bought
         * @returns {OrderbookCallBuilder}
         */

    }, {
        key: "orderbook",
        value: function orderbook(selling, buying) {
            return new _orderbook_call_builder.OrderbookCallBuilder(URI(this.serverURL), selling, buying);
        }

        /**
         * Returns new {@link OperationCallBuilder} object configured by a current Horizon server configuration.
         * @returns {OperationCallBuilder}
         */

    }, {
        key: "operations",
        value: function operations() {
            return new _operation_call_builder.OperationCallBuilder(URI(this.serverURL));
        }

        /**
         * The Stellar Network allows payments to be made between assets through path payments. A path payment specifies a
         * series of assets to route a payment through, from source asset (the asset debited from the payer) to destination
         * asset (the asset credited to the payee).
         *
         * A path search is specified using:
         *
         * * The destination address
         * * The source address
         * * The asset and amount that the destination account should receive
         *
         * As part of the search, horizon will load a list of assets available to the source address and will find any
         * payment paths from those source assets to the desired destination asset. The search's amount parameter will be
         * used to determine if there a given path can satisfy a payment of the desired amount.
         *
         * Returns new {@link PathCallBuilder} object configured with the current Horizon server configuration.
         *
         * @param {string} source The sender's account ID. Any returned path will use a source that the sender can hold.
         * @param {string} destination The destination account ID that any returned path should use.
         * @param {Asset} destinationAsset The destination asset.
         * @param {string} destinationAmount The amount, denominated in the destination asset, that any returned path should be able to satisfy.
         * @returns {@link PathCallBuilder}
         */

    }, {
        key: "paths",
        value: function paths(source, destination, destinationAsset, destinationAmount) {
            return new _path_call_builder.PathCallBuilder(URI(this.serverURL), source, destination, destinationAsset, destinationAmount);
        }

        /**
         * Returns new {@link PaymentCallBuilder} object configured with the current Horizon server configuration.
         * @returns {PaymentCallBuilder}
         */

    }, {
        key: "payments",
        value: function payments() {
            return new _payment_call_builder.PaymentCallBuilder(URI(this.serverURL));
        }

        /**
         * Returns new {@link EffectCallBuilder} object configured with the current Horizon server configuration.
         * @returns {EffectCallBuilder}
         */

    }, {
        key: "effects",
        value: function effects() {
            return new _effect_call_builder.EffectCallBuilder(URI(this.serverURL));
        }

        /**
         * Returns new {@link FriendbotBuilder} object configured with the current Horizon server configuration.
         * @returns {FriendbotBuilder}
         * @private
         */

    }, {
        key: "friendbot",
        value: function friendbot(address) {
            return new _friendbot_builder.FriendbotBuilder(URI(this.serverURL), address);
        }

        /**
        * Fetches an account's most current state in the ledger and then creates and returns an {@link Account} object.
        * @param {string} accountId - The account to load.
        * @returns {Promise} Returns a promise to the {@link AccountResponse} object with populated sequence number.
        */

    }, {
        key: "loadAccount",
        value: function loadAccount(accountId) {
            return this.accounts().accountId(accountId).call().then(function (res) {
                return new _account_response.AccountResponse(res);
            });
        }
    }]);

    return Server;
}();