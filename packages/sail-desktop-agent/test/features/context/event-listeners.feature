Feature: Desktop Agent Event Listeners
  Desktop Agent events allow apps to subscribe to DA-level events such as
  user channel changes. This is separate from context listeners and intent listeners.

  Background:
    Given "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_2.2
  Scenario: Receiving channelChanged event when another app joins a channel
    When "appId: App1, instanceId: a1" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.matches_type         | to.instanceId | msg.payload.currentChannelId |
      | addEventListenerResponse | a1            | {null}                   |
      | channelChangedEvent      | a1            | fdc3.channel.1           |
      | joinUserChannelResponse  | a2            | {null}                   |

  @fdc3_2.2
  Scenario: Receiving channelChanged event when I join a channel
    When "appId: App1, instanceId: a1" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.matches_type         | to.instanceId | msg.payload.currentChannelId |
      | addEventListenerResponse | a1            | {null}                   |
      | channelChangedEvent      | a1            | fdc3.channel.1           |
      | joinUserChannelResponse  | a1            | {null}                   |

  @fdc3_2.2
  Scenario: Receiving channelChanged event when leaving a channel
    When "appId: App1, instanceId: a1" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App1, instanceId: a1" leaves the current user channel [fdc3.leaveCurrentChannel]
    Then messaging will have outgoing posts
      | msg.matches_type            | to.instanceId | msg.payload.currentChannelId |
      | addEventListenerResponse    | a1            | {null}                   |
      | channelChangedEvent         | a1            | fdc3.channel.1           |
      | joinUserChannelResponse     | a1            | {null}                   |
      | channelChangedEvent         | a1            | {null}                   |
      | leaveCurrentChannelResponse | a1            | {null}                   |

  @fdc3_2.2
  Scenario: Unsubscribing from event listener
    When "appId: App1, instanceId: a1" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App1, instanceId: a1" removes DA event listener "{lastEventListenerId}" [fdc3.removeEventListener]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.matches_type                 | to.instanceId |
      | addEventListenerResponse         | a1            |
      | eventListenerUnsubscribeResponse | a1            |
      | joinUserChannelResponse          | a2            |

  @fdc3_2.2
  Scenario: Multiple apps listening for channel changes
    When "appId: App1, instanceId: a1" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App2, instanceId: a2" adds an event listener for "USER_CHANNEL_CHANGED" [fdc3.addEventListener]
    And "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.matches_type         | to.instanceId | msg.payload.currentChannelId |
      | addEventListenerResponse | a1            | {null}                   |
      | addEventListenerResponse | a2            | {null}                   |
      | channelChangedEvent      | a1            | fdc3.channel.1           |
      | channelChangedEvent      | a2            | fdc3.channel.1           |
      | joinUserChannelResponse  | a1            | {null}                   |

  @fdc3_2.2
  Scenario: addEventListener with null type subscribes to all event types
    When "appId: App1, instanceId: a1" adds an event listener for all event types [fdc3.addEventListener]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" leaves the current user channel [fdc3.leaveCurrentChannel]
    Then messaging will have outgoing posts
      | msg.matches_type            | to.instanceId | msg.payload.currentChannelId |
      | addEventListenerResponse    | a1            | {null}                   |
      | channelChangedEvent         | a1            | fdc3.channel.1           |
      | joinUserChannelResponse     | a2            | {null}                   |
      | channelChangedEvent         | a1            | {null}                   |
      | leaveCurrentChannelResponse | a2            | {null}                   |

  @fdc3_2.2
  Scenario: Adding event listener for unsupported event type returns error
    When "appId: App1, instanceId: a1" adds an event listener for "unsupportedEvent" [fdc3.addEventListener]
    Then messaging will have outgoing posts
      | msg.type                 | to.instanceId | msg.payload.error |
      | addEventListenerResponse | a1            | InvalidArguments  |

  @fdc3_2.2
  Scenario: Unsubscribing from non-existent event listener returns error
    When "appId: App1, instanceId: a1" removes DA event listener "nonexistent-listener-id" [fdc3.removeEventListener]
    Then messaging will have outgoing posts
      | msg.type                         | to.instanceId | msg.payload.error |
      | eventListenerUnsubscribeResponse | a1            | InvalidArguments  |
