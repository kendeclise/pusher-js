var StrategyBuilder = require('strategies/strategy_builder');
var TransportStrategy = require('strategies/transport_strategy');
var DelayedStrategy = require('strategies/delayed_strategy');
var SequentialStrategy = require('strategies/sequential_strategy');
var CachedStrategy = require('strategies/cached_strategy');
var FirstConnectedStrategy = require('strategies/first_connected_strategy');
var BestConnectedEverStrategy = require('strategies/best_connected_ever_strategy');
var IfStrategy = require('strategies/if_strategy');
var Errors = require('errors');
var Transports = require('transports/transports');
var SockJSTransport = Transports.SockJSTransport;
var WSTransport = Transports.WSTransport;

describe("StrategyBuilder", function() {
  it("should construct a transport strategy", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "test", "sockjs", 1, { option: "value" }],
      [":def", "strategy", ":test"]
    ]);

    expect(strategy).toEqual(jasmine.any(TransportStrategy));
    expect(strategy.transport).toBe(SockJSTransport);
    expect(strategy.options).toEqual({
      option: "value"
    });
  });

  it("should construct a delayed strategy", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "test", "sockjs", 1, { option: "value" }],
      [":def", "strategy", [":delayed", 2000, ":test"]]
    ]);

    expect(strategy).toEqual(jasmine.any(DelayedStrategy));
    expect(strategy.strategy).toEqual(jasmine.any(TransportStrategy));
    expect(strategy.options.delay).toEqual(2000);
  });

  it("should construct a sequential strategy", function() {
    spyOn(WSTransport, "isSupported").andReturn(true);

    var strategy = StrategyBuilder.build([
      [":def_transport", "one", "ws", 1, { option: "1" }],
      [":def_transport", "two", "sockjs", 1, { option: "2" }],
      [":def", "timeouts", { loop: true, timeout: 2000, timeoutLimit: 8000}],
      [":def", "strategy", [":sequential", ":timeouts", ":one", ":two"]]
    ]);

    expect(strategy).toEqual(jasmine.any(SequentialStrategy));
    expect(strategy.strategies[0])
      .toEqual(jasmine.any(TransportStrategy));
    expect(strategy.strategies[0].transport).toBe(WSTransport);

    expect(strategy.strategies[1])
      .toEqual(jasmine.any(TransportStrategy));
    expect(strategy.strategies[1].transport).toBe(SockJSTransport);

    expect(strategy.loop).toBe(true);
    expect(strategy.timeout).toEqual(2000);
    expect(strategy.timeoutLimit).toEqual(8000);
  });

  it("should construct a cached strategy", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "sub", "xhr_streaming", 2],
      [":def", "strategy", [":cached", 1234, ":sub"]]
    ], { encrypted: true });
    expect(strategy).toEqual(jasmine.any(CachedStrategy));
    expect(strategy.ttl).toEqual(1234);
    expect(strategy.encrypted).toEqual(true);
  });

  it("should construct a first connected strategy", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "sub", "xhr_streaming", 2],
      [":def", "strategy", [":first_connected", ":sub"]]
    ]);
    expect(strategy).toEqual(jasmine.any(FirstConnectedStrategy));
  });

  it("should construct a best connected ever strategy", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "one", "ws", 1, {}],
      [":def_transport", "two", "xhr_streaming", 2, {}],
      [":def_transport", "three", "sockjs", 3, {}],
      [":def", "strategy", [":best_connected_ever", ":one", ":two", ":three"]]
    ]);
    expect(strategy).toEqual(jasmine.any(BestConnectedEverStrategy));
  });

  it("should construct an if strategy with isSupported call", function() {
    var strategy = StrategyBuilder.build([
      [":def_transport", "ws", "ws", 1, {}],
      [":def_transport", "sockjs", "sockjs", 2, {}],
      [":def", "strategy",
        [":if", [":is_supported", ":ws"], [
          ":ws"
        ], [
          ":sockjs"
        ]]
      ]
    ]);
    expect(strategy).toEqual(jasmine.any(IfStrategy));
  });

  it("should throw an error on unsupported transport", function() {
    expect(function() {
      StrategyBuilder.build([
        [":def_transport", "one", "fake", 1]
      ]);
    }).toThrow(jasmine.any(Errors.UnsupportedTransport));
  });


  it("should throw an error on unsupported strategy", function() {
    expect(function() {
      StrategyBuilder.build([
        [":def_transport", "one", "ws", 1, {}],
        [":def", "strategy", [":wut", ":one"]]
      ]);
    }).toThrow("Calling non-function :wut");
  });
});
