Feature: Clearing context on a channel (FDC3 3.0)

  FINOS next: website/docs/api/ref/Channel.md — clearContext; api/spec.md — Channel State

  Background:
    Given A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_3.0
  Scenario: getCurrentContext on an empty channel returns null context and null metadata
    When "appId: App2, instanceId: a2" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context | msg.payload.metadata |
      | getCurrentContextResponse | a2            | {null}              | {null}               |
    And the last "getCurrentContextResponse" has "context" and "metadata" set to null

  @fdc3_3.0
  Scenario: Clearing one context type leaves the other types on the channel
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" clears context "fdc3.instrument" on "fdc3.channel.1" [Channel.clearContext]
    And "appId: App2, instanceId: a2" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: App2, instanceId: a2" asks for the latest context on "fdc3.channel.1" with type "fdc3.country" [fdc3.getCurrentContext]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context.type |
      | clearContextResponse      | a1            | {null}                   |
      | getCurrentContextResponse | a2            | {null}                   |
      | getCurrentContextResponse | a2            | fdc3.country             |

  @fdc3_3.0
  Scenario: Clearing all context types empties the channel
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    And "appId: App2, instanceId: a2" asks for the latest context on "fdc3.channel.1" with type "{null}" [fdc3.getCurrentContext]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context | msg.payload.metadata |
      | getCurrentContextResponse | a2            | {null}              | {null}               |

  @fdc3_3.0
  Scenario: An app joining after clearContext does not receive the cleared context
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    And "appId: App2, instanceId: a2" adds a context listener on "{null}" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then no "broadcastEvent" is sent to "a2"

  @fdc3_3.0
  Scenario: A channel contextCleared listener is told which channel and type were cleared
    When "appId: App2, instanceId: a2" adds a "CONTEXT_CLEARED" event listener on channel "fdc3.channel.1" [Channel.addEventListener]
    And "appId: App1, instanceId: a1" clears context "fdc3.instrument" on "fdc3.channel.1" [Channel.clearContext]
    Then messaging will include outgoing posts
      | msg.matches_type    | to.instanceId | msg.payload.channelId | msg.payload.contextType |
      | contextClearedEvent | a2            | fdc3.channel.1        | fdc3.instrument         |

  @fdc3_3.0
  Scenario: A channel contextCleared listener is not told about other channels
    When "appId: App2, instanceId: a2" adds a "CONTEXT_CLEARED" event listener on channel "fdc3.channel.2" [Channel.addEventListener]
    And "appId: App1, instanceId: a1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    Then no "contextClearedEvent" is sent to "a2"

  @fdc3_3.0
  Scenario: A Desktop Agent contextCleared listener follows the app's current user channel
    When "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" adds an event listener for "CONTEXT_CLEARED" [fdc3.addEventListener]
    And "appId: App1, instanceId: a1" clears context "{null}" on "fdc3.channel.2" [Channel.clearContext]
    And "appId: App1, instanceId: a1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    Then messaging will include outgoing posts
      | msg.matches_type    | to.instanceId | msg.payload.channelId | msg.payload.contextType |
      | contextClearedEvent | a2            | fdc3.channel.1        | {null}                  |
    And exactly 1 "contextClearedEvent" is sent to "a2"

  @fdc3_3.0
  Scenario: Clearing context on an app channel notifies its contextCleared listeners
    When "appId: App1, instanceId: a1" creates or gets an app channel called "shared" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" creates or gets an app channel called "shared" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a "CONTEXT_CLEARED" event listener on channel "shared" [Channel.addEventListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "shared" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" clears context "{null}" on "shared" [Channel.clearContext]
    And "appId: App2, instanceId: a2" asks for the latest context on "shared" with type "{null}" [fdc3.getCurrentContext]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.channelId | msg.payload.context |
      | contextClearedEvent       | a2            | shared                | {null}              |
      | getCurrentContextResponse | a2            | {null}                | {null}              |

  @fdc3_3.0
  Scenario: Clearing context on an unknown channel fails with NoChannelFound
    When "appId: App1, instanceId: a1" clears context "{null}" on "IDontExist" [Channel.clearContext]
    Then messaging will have outgoing posts
      | msg.matches_type     | to.instanceId | msg.payload.error |
      | clearContextResponse | a1            | NoChannelFound    |

  @fdc3_3.0
  Scenario: Clearing context on a private channel the app is not connected to fails with AccessDenied
    Given "appId: App1, instanceId: a1" creates a private channel [fdc3.createPrivateChannel]
    And I alias the last private channel as "pc1"
    When "appId: App2, instanceId: a2" clears context "{null}" on "{pc1}" [Channel.clearContext]
    Then messaging will have outgoing posts
      | msg.matches_type     | to.instanceId | msg.payload.error |
      | clearContextResponse | a2            | AccessDenied      |

  @fdc3_3.0
  Scenario: Clearing context on its own private channel succeeds
    Given "appId: App1, instanceId: a1" creates a private channel [fdc3.createPrivateChannel]
    And I alias the last private channel as "pc1"
    When "appId: App1, instanceId: a1" clears context "{null}" on "{pc1}" [Channel.clearContext]
    Then messaging will have outgoing posts
      | msg.matches_type     | to.instanceId | msg.payload.error |
      | clearContextResponse | a1            | {null}            |

  @fdc3_3.0
  Scenario: A channel-scoped event listener does not receive userChannelChanged
    When "appId: App2, instanceId: a2" adds a "{null}" event listener on channel "fdc3.channel.1" [Channel.addEventListener]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then no "channelChangedEvent" is sent to "a2"
