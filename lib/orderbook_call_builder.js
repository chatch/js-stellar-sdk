"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var CallBuilder = require("./call_builder").CallBuilder;

var OrderbookCallBuilder = exports.OrderbookCallBuilder = (function (_CallBuilder) {
    /**
     * Creates a new {@link OrderbookCallBuilder} pointed to server defined by serverUrl.
     *
     * Do not create this object directly, use {@link Server#orderbook}.
     * @see [Orderbook Details](https://www.stellar.org/developers/horizon/reference/orderbook-details.html)
     * @param {string} serverUrl serverUrl Horizon server URL.
     * @param {Asset} selling Asset being sold
     * @param {Asset} buying Asset being bought
     */

    function OrderbookCallBuilder(serverUrl, selling, buying) {
        _classCallCheck(this, OrderbookCallBuilder);

        _get(Object.getPrototypeOf(OrderbookCallBuilder.prototype), "constructor", this).call(this, serverUrl);
        this.url.segment("order_book");
        if (!selling.isNative()) {
            this.url.addQuery("selling_asset_type", selling.getAssetType());
            this.url.addQuery("selling_asset_code", selling.getCode());
            this.url.addQuery("selling_asset_issuer", selling.getIssuer());
        } else {
            this.url.addQuery("selling_asset_type", "native");
        }
        if (!buying.isNative()) {
            this.url.addQuery("buying_asset_type", buying.getAssetType());
            this.url.addQuery("buying_asset_code", buying.getCode());
            this.url.addQuery("buying_asset_issuer", buying.getIssuer());
        } else {
            this.url.addQuery("buying_asset_type", "native");
        }
    }

    _inherits(OrderbookCallBuilder, _CallBuilder);

    _createClass(OrderbookCallBuilder, {
        trades: {

            /**
             * People on the Stellar network can make offers to buy or sell assets. These offers are summarized by the assets being bought and sold in orderbooks. When an offer is fully or partially fulfilled, a trade happens.
             * @see [Trades for Orderbook](https://www.stellar.org/developers/horizon/reference/trades-for-orderbook.html)
             * @returns {OrderbookCallBuilder}
             */

            value: function trades() {
                this.filter.push(["order_book", "trades"]);
                return this;
            }
        }
    });

    return OrderbookCallBuilder;
})(CallBuilder);