Feature: Relaying Private Channel Broadcast messages

  Background: 
    Given A newly instantiated FDC3 Server

  Scenario: Broadcast message to no-one
    When "App1/a1" broadcasts "fdc3.instrument" on private channel "channel1"
    Then messaging will have outgoing posts
      | msg.source.AppId |
    And messaging will have 0 posts

  Scenario: Broadcast message sent to one listener
    When "App2/a2" adds a context listener on private channel "channel1" with type "fdc3.instrument"
    And "App1/a1" broadcasts "fdc3.instrument" on private channel "channel1"
    Then messaging will have outgoing posts
      | msg.meta.source.appId | msg.meta.source.instanceId | msg.payload.context.type | msg.meta.destination.appId | msg.meta.destination.instanceId |
      | App1                  | a1                         | fdc3.instrument          | App2                       | a2                              |

  Scenario: Broadcast message sent but listener has unsubscribed
    When "App2/a2" adds a context listener on private channel "channel1" with type "fdc3.instrument"
    And "App2/a2" removes context listener on private channel "channel1" with type "fdc3.instrument"
    And "App1/a1" broadcasts "fdc3.instrument" on private channel "channel1"
    Then messaging will have outgoing posts
      | msg.source.AppId | msg.source.instanceId | msg.payload.context.type |
