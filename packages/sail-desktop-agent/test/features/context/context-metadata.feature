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
      | msg.matches_type  | to.appId | to.instanceId | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp |
      | broadcastEvent    | App2     | a2            | App1                              | a1                                     | ISO8601-timestamp-required     |
      | broadcastResponse | App1     | a1            | {null}                            | {null}                                 | {null}                         |

  @fdc3_3.0
  Scenario: Broadcast forwards app-provided traceId in ContextMetadata
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "broadcast-trace-123" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.traceId |
      | broadcastEvent   | a2            | broadcast-trace-123            |
