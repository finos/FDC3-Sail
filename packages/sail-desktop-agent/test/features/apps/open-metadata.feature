Feature: App-provided metadata on open (FDC3 3.0)

  FINOS next: website/docs/api/ref/DesktopAgent.md — open(app, context?, metadata?)

  Background:
    Given "chartApp" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | ViewChart   | fdc3.instrument | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: portfolioApp, instanceId: a1" is opened with connection id "a1"

  @fdc3_3.0
  Scenario: Context passed to open carries the opener's metadata to the opened app
    When "appId: portfolioApp, instanceId: a1" opens app "chartApp" with context data "fdc3.instrument" and metadata traceId "open-trace" signature "open-sig" antiReplay claims "1234/2345/jti-5" and custom key "EMEA" [fdc3.open]
    And "uuid-0" sends validate
    And "appId: chartApp, instanceId: uuid-0" adds a context listener on "{null}" with type "fdc3.instrument" [fdc3.addContextListener]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.metadata.traceId | msg.payload.metadata.signature.signature | msg.payload.metadata.antiReplay.jti | msg.payload.metadata.custom.region |
      | broadcastEvent   | uuid-0        | fdc3.instrument          | portfolioApp                      | a1                                     | ISO8601-timestamp-required     | open-trace                   | open-sig (signature part)                | jti-5                               | EMEA                               |
