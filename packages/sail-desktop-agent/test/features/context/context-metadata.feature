Feature: Context metadata on broadcast (FDC3 3.0)

  FINOS next: website/docs/api/conformance/Metadata-Tests.md — UCContextMetadataOnBroadcast

  Background:
    Given A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_3.0
  Scenario: Broadcast Event Includes ContextMetadata With Source And Timestamp
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type  | to.appId | to.instanceId | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.metadata.traceId |
      | broadcastEvent    | App2     | a2            | App1                              | a1                                     | ISO8601-timestamp-required     | MUST-BE-NON-EMPTY            |
      | broadcastResponse | App1     | a1            | {null}                            | {null}                                 | {null}                         | {null}                       |

  @fdc3_3.0
  Scenario: Broadcast forwards app-provided traceId in ContextMetadata
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "broadcast-trace-123" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.traceId |
      | broadcastEvent   | a2            | broadcast-trace-123            |

  @fdc3_3.0
  Scenario: Broadcast forwards app-provided signature, antiReplay and custom unchanged
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "t-1" signature "sig-1" antiReplay claims "1234/2345/jti-1" and custom key "EMEA" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.traceId | msg.payload.metadata.signature.signature | msg.payload.metadata.signature.protected | msg.payload.metadata.antiReplay.iat | msg.payload.metadata.antiReplay.exp | msg.payload.metadata.antiReplay.jti | msg.payload.metadata.custom.region |
      | broadcastEvent   | a2            | t-1                          | sig-1 (signature part)                   | sig-1 (protected part)                   | 1234                                 | 2345                                 | jti-1                               | EMEA                               |

  @fdc3_3.0
  Scenario: Broadcast metadata cannot override the DA-provided source
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata claiming source appId "Spoofed" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId |
      | broadcastEvent   | a2            | App1                              | a1                                     |

  @fdc3_3.0
  Scenario: getCurrentContext returns the metadata stored with the last broadcast
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "stored-trace" signature "stored-sig" antiReplay claims "1234/2345/jti-2" and custom key "APAC" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.traceId | msg.payload.metadata.timestamp | msg.payload.metadata.signature.signature | msg.payload.metadata.antiReplay.jti | msg.payload.metadata.custom.region |
      | getCurrentContextResponse | a2            | fdc3.instrument          | App1                              | stored-trace                 | ISO8601-timestamp-required     | stored-sig (signature part)              | jti-2                               | APAC                               |

  @fdc3_3.0
  Scenario: A context listener added after a broadcast receives the stored metadata
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "replayed-trace" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "{null}" with type "fdc3.instrument" [fdc3.addContextListener]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.traceId |
      | broadcastEvent   | a2            | fdc3.instrument          | App1                              | replayed-trace               |
