A javascript sample player.

Notes:

Instruments: Pads Lead, Organ, Glass

https://github.com/wheelibin/synaesthesia/blob/master/src/synth/instruments/presets.js

Play
  Chord
    Sustain until play or stop
    Arp until stop

  Group
    Play Group once or loop if loopFlag. Hold each chord for playBeats
    Arp entire group once or loop if loopFlag. Arp each chord for playBeats

  Sample
    Play once or loop if loopFlag

Play next
    Same as Play, just move cursor ( for all )

Play cont

  Chord
    Play chord for playBeats, then next
    Arp chord for playBeats, then next

  Group
    Play group once, then next. Each chord is played for playBeats
    Arp once. Each chord is arped for playBeats

  Sample


TBD:

Fix Server

How to deploy to iPad

node.js on iPad

Get BT-200 in momentary Mode

Instruments: Bells / Organ

Get audio interface (BT?)

Server independent implementation. (pure HTML / JS )