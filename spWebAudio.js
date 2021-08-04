/* Using Tone.js for Web Audio API

    S0 S1 S2. : Audio / Synth sources.
    |  |  | TBD pan/level per voice
    |/___/
    |
  Master Gain <- The volume
    |
  Filter
    |
  Distortion
    |
  Chorus
    |
  Phaser
    |
  Tremolo
    |
    |\
    | \
    |  \_______________
    |         |        |
    Dry       RGain    DGain <- FX levels
    |         |        |
    |         Reverb   Delay <- Parallel FX so we play trails
    |         |        |
    |         /       /
    Out  <-----------  
*/

var audioSource;
var masterLevel, dryLevel, reverbLevel, delayLevel;
var reverbBlock, delayBlock, tremoloBlock, phaserBlock, chorusBlock, distortionBlock, filterBlock;
var instruments = {};

function initWebAudio()
{
  // build chain from bottom up
  reverbBlock = new Tone.Reverb( { preDelay : .2, decay : 10, wet : 1 } ).toDestination();
  delayBlock = new Tone.FeedbackDelay( { delayTime : .4, maxDelay : 2, feedback : 0.6, wet : 1 } ).toDestination();

  dryLevel = new Tone.Gain( 1 ).toDestination();
  reverbLevel = new Tone.Gain( 0 ).connect( reverbBlock );
  delayLevel = new Tone.Gain( 0 ).connect( delayBlock );

  tremoloBlock = new Tone.Tremolo( { frequency : 4, depth : 1, wet : 0, spread : 0 } );
  tremoloBlock.connect( dryLevel );
  tremoloBlock.connect( delayLevel );
  tremoloBlock.connect( reverbLevel );

  phaserBlock = new Tone.Phaser( { frequency : .4, octaves : 4, baseFrequency : 700, wet : 0 } );
  phaserBlock.connect( tremoloBlock );

  chorusBlock = new Tone.Chorus( { frequency : .5, delayTime : 2.5, depth : 1, wet : 0 } );
  chorusBlock.connect( phaserBlock );

  distortionBlock = new Tone.Chebyshev( 10 );
  distortionBlock.connect( chorusBlock );
  distortionBlock.wet.value = 0;

  filterBlock = new Tone.AutoFilter();
  filterBlock.set( {  frequency : .5,
                      depth : 1,
                      baseFrequency : 200,
                      octaves : 5,
                      filter : { rolloff : -24 , Q : 2 } } );
  filterBlock.wet.value = 0;
  filterBlock.connect( distortionBlock );

  masterLevel = new Tone.Gain( 0 );
  masterLevel.connect( filterBlock );

  createSynths();
}

function initWebAudio2()
{
  tremoloBlock.start();
  chorusBlock.start();
  filterBlock.start();
  Tone.start();
}

function createSynths() // create all synths and connect them to masterLevel
{
  // Oscillators are louder than samplers so we normalize volumes.

  for( var ix = 0;ix < synthTypes.length;ix++ )
  {
    var sType = synthTypes[ ix ];

    switch( sType )
    {
      case "Sine":
      case "Square":
      case "Sawtooth":
      case "Triangle":
        var oType = sType.toLowerCase();
        s = new Tone.PolySynth( Tone.Synth, { polyphony : 12, oscillator: { partials : [ 0, 2, 3, 6 ], } } );
        s.set( { volume : -12, oscillator : { type : oType }, } );
        break;

      case "Bell":
        var oType = sType.toLowerCase();
        s = new Tone.PolySynth( Tone.Synth, { polyphony : 12, oscillator: { partials : [ 0, 2, 3, 6 ], } } );
        s.set( { volume : -12, oscillator : { type : "sine" },
                 envelope : { attack: 0, decay: 1, sustain: .2, release: 1 } } );
        break;

      case "Piano": // mellower sounding piano
        s = new Tone.Sampler( { urls : {  A0 : "A0.mp3",
                                          C1 : "C1.mp3", "D#1" : "Ds1.mp3", "F#1" : "Fs1.mp3", A1 : "A1.mp3",
                                          C2 : "C2.mp3", "D#2" : "Ds2.mp3", "F#2" : "Fs2.mp3", A2 : "A2.mp3",
                                          C3 : "C3.mp3", "D#3" : "Ds3.mp3", "F#3" : "Fs3.mp3", A3 : "A3.mp3",
                                          C4 : "C4.mp3", "D#4" : "Ds4.mp3", "F#4" : "Fs4.mp3", A4 : "A4.mp3",
                                          C5 : "C5.mp3", "D#5" : "Ds5.mp3", "F#5" : "Fs5.mp3", A5 : "A5.mp3",
                                          C6 : "C6.mp3", "D#6" : "Ds6.mp3", "F#6" : "Fs6.mp3", A6 : "A6.mp3",
                                          C7 : "C7.mp3", "D#7" : "Ds7.mp3", "F#7" : "Fs7.mp3", A7 : "A7.mp3",
                                          C8 : "C8.mp3" },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/piano/" } );
      break;

    case "Cello":
        s = new Tone.Sampler( { urls :  { 'E2': 'E2.mp3', 'E3': 'E3.mp3', 'E4': 'E4.mp3', 'F2': 'F2.mp3', 'F3': 'F3.mp3', 'F4': 'F4.mp3',
                                          'F#3': 'Fs3.mp3', 'F#4': 'Fs4.mp3', 'G2': 'G2.mp3', 'G3': 'G3.mp3', 'G4': 'G4.mp3',
                                          'G#2': 'Gs2.mp3', 'G#3': 'Gs3.mp3', 'G#4': 'Gs4.mp3', 'A2': 'A2.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3',
                                          'A#2': 'As2.mp3', 'A#3': 'As3.mp3', 'A#4': 'As4.mp3', 'B2': 'B2.mp3', 'B3': 'B3.mp3', 'B4': 'B4.mp3',
                                          'C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C#3': 'Cs3.mp3', 'C#4': 'Cs4.mp3',
                                          'D2': 'D2.mp3', 'D3': 'D3.mp3', 'D4': 'D4.mp3', 'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4': 'Ds4.mp3' },
                                release : 8, baseUrl : "http://127.0.0.1:8080/instruments/cello/" } );
        break;

    case "Flute":
        s = new Tone.Sampler( { urls :  { 'A5': 'A5.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3',
                                          'E3': 'E3.mp3', 'E4': 'E4.mp3', 'E5': 'E5.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3' },
                                release : 8, baseUrl : "http://127.0.0.1:8080/instruments/flute/" } );
        break;


    case "French":
        s = new Tone.Sampler( { urls :  { 'D2': 'D2.mp3', 'D4': 'D4.mp3', 'D#1': 'Ds1.mp3', 'F2': 'F2.mp3',
                                          'F4': 'F4.mp3', 'G1': 'G1.mp3', 'A0': 'A0.mp3', 'A2': 'A2.mp3', 'C1': 'C1.mp3', 'C3': 'C3.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/french-horn/" } );
        break;

    case "Trumpet":
        s = new Tone.Sampler( { urls :  { 'C5': 'C5.mp3', 'D4': 'D4.mp3', 'D#3': 'Ds3.mp3', 'F2': 'F2.mp3', 'F3': 'F3.mp3',
                                          'F4': 'F4.mp3', 'G3': 'G3.mp3', 'A2': 'A2.mp3', 'A4': 'A4.mp3', 'A#3': 'As3.mp3', 'C3': 'C3.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/trumpet/" } );
        break;

    case "Violin":
        s = new Tone.Sampler( { urls :  { 'A3': 'A3.mp3', 'A4': 'A4.mp3', 'A5': 'A5.mp3', 'A6': 'A6.mp3',
                                          'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3', 'C7': 'C7.mp3',
                                          'E4': 'E4.mp3', 'E5': 'E5.mp3', 'E6': 'E6.mp3',
                                          'G4': 'G4.mp3', 'G5': 'G5.mp3', 'G6': 'G6.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/violin/" } );
        break;

    case "Xylo":
        s = new Tone.Sampler( { urls :  { 'G3': 'G3.mp3', 'G4': 'G4.mp3', 'G5': 'G5.mp3', 'G6': 'G6.mp3',
                                          'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3','C7': 'C7.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/xylophone/" } );
        break;

    case "Harp":
        s = new Tone.Sampler( { urls :  { 'C3': 'C3.mp3', 'C5': 'C5.mp3',
                                          'D2': 'D2.mp3', 'D4': 'D4.mp3', 'D6': 'D6.mp3', 'D7': 'D7.mp3',
                                          'E1': 'E1.mp3', 'E3': 'E3.mp3', 'E5': 'E5.mp3',
                                          'F2': 'F2.mp3', 'F4': 'F4.mp3', 'F6': 'F6.mp3', 'F7': 'F7.mp3',
                                          'G1': 'G1.mp3', 'G3': 'G3.mp3', 'G5': 'G5.mp3',
                                          'A2': 'A2.mp3', 'A4': 'A4.mp3', 'A6': 'A6.mp3',
                                          'B1': 'B1.mp3', 'B3': 'B3.mp3', 'B5': 'B5.mp3', 'B6': 'B6.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/harp/" } );
        break;

    case "Organ":
        s = new Tone.Sampler( { urls : { 'C1': 'C1.mp3','C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4' : 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3',
                                          'D#1': 'Ds1.mp3', 'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4' : 'Ds4.mp3', 'D#5' : 'Ds5.mp3',
                                          'F#1': 'Fs1.mp3', 'F#2': 'Fs2.mp3', 'F#3': 'Fs3.mp3', 'F#4' : 'Fs4.mp3', 'F#5' : 'Fs5.mp3',
                                          'A1': 'A1.mp3', 'A2': 'A2.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3', 'A5': 'A5.mp3' },
                                release : 4, baseUrl : "http://127.0.0.1:8080/instruments/organ/" } );
        break;

      case "SynthPipe":
        s = new Tone.PolySynth( Tone.FMSynth );
        s.set( {  polyphony : 24,
                  volume : -6,
                  harmonicity : 3.01,
                  modulationIndex : 14,
                  oscillator : { type: "triangle" },
                  envelope : { attack: 0.2, decay: 0.3, sustain: 0.9, release: 1.2 },
                  modulation : { type: "square" },
                  modulationEnvelope : { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.1 } } );
        break;

      case "SynReed":
        s = new Tone.PolySynth( Tone.AMSynth );
        s.set( {  polyphony : 24,
                  volume : -6,
                  harmonicity : 3.999,
                  oscillator : { type: "square" },
                  envelope : { attack: 0.03, decay: 0.3, sustain: 0.7, release: 0.8 },
                  modulation : { volume: 12, type: "square6" },
                  modulationEnvelope : { attack: 2, decay: 3, sustain: 0.8, release: 0.1 } } );
        break;

      case "SynKeys":
        s = new Tone.PolySynth( Tone.Synth );
        s.set( {  polyphony : 24,
                  volume : -12,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } });
        break;

      case "Pluck":
        s = new Tone.PolySynth( Tone.AMSynth );
        s.set( {  polyphony : 12,
                  volume : -3,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  envelope : { attack: 0.006, decay: 4, sustain: 0.04, release: 1.2 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } } );
        break;
  
      case "MiscE":
        s = new Tone.PolySynth( Tone.Synth );
        s.set({ volume : -8,
                oscillator: { type: "fatsine4", spread: 60, count: 10 },
                envelope: { attack: 0.4, decay: 0.01, sustain: 1, attackCurve: "sine", releaseCurve: "sine", release: 0.4 } });
        break;

      case "noise":
        s = new Tone.NoiseSynth( {  volume : -18 } );
        break;

      default:
        continue;
    }

    s.connect( masterLevel );
    instruments[ sType ] = s;
  }
}

function releaseAudio()
{
  if( activeElement )
  {
    activeElement.elem.playing = false;

    if( activeElement.elem.objType == "CSample" )
    {
      var libSample = sampleLibrary[ activeElement.elem.elementName ]; // a CSample
      if( libSample )
        if( libSample.player )
          libSample.player.stop();
    }
    else // "CChord" or CGroupRef
      activeElement.synth.triggerRelease( activeElement.chordNotes );

    if( activeElement.grpTimer )
      clearTimeout( activeElement.grpTimer );

    if( activeElement.arpTimer );
      clearTimeout( activeElement.arpTimer );

    playComplete( activeElement.elem );
  }

  if( playNextTimer )
  {
    clearTimeout( playNextTimer );
    playNextTimer = undefined;
  }

  activeElement = undefined;
}

function setEffectLevels( g, t )
{
  masterLevel.gain.rampTo( g.masterLevel / 100, t );
  dryLevel.gain.rampTo( g.dryLevel / 100, t );
  delayLevel.gain.rampTo( g.delayLevel / 100, t );
  reverbLevel.gain.rampTo( g.reverbLevel / 100, t );
  phaserBlock.wet.rampTo( g.phaserLevel / 100, t );

  if( !modDistState ) // Modifier is on?
    distortionBlock.wet.rampTo( g.distortionLevel / 100, t );
  if( !modTremoloState )
    tremoloBlock.wet.rampTo( g.tremoloLevel / 100, t );
  if( !modChorusState )
    chorusBlock.wet.rampTo( g.chorusLevel / 100, t );
}

var firstTime = true;

var activeElement;

function samplePlayCompleteCB()
{
  if( activeElement )
  {
    activeElement.elem.playing = false;
    playComplete( activeElement.elem );
    // activeElement = undefined;
  }

  if( curConfig.groups[ cursorGroup ].seqMode == seqModes[ 2 ] )
    playElement( "START" );
}

// Can this element be arpeggiated?
function elemCanArpeggiate( audioElem )
{
  if( audioElem.objType == "CSample" )
    return false;
  
  return true;
}

//////////////////////////////////// ////////////////////////////////////
//////////////////////////////////// ////////////////////////////////////
function playElemAudio( audioElem )
{
  if( firstTime )
  {
    initWebAudio2();
    firstTime = false;
  }

  setEffectLevels( curConfig.groups[ audioElem.group ], .5 );

  if( curConfig.groups[ audioElem.group ].arpFlag && elemCanArpeggiate( audioElem ) )
  {
    if( activeElement )
      if( activeElement.arpTimer )
      {
        activeElement.nextElem = audioElem; // Queue the next arp. Want to complete the current arp of the current beat.
        return;
      }
      else
        releaseAudio();

    doArpeggio( audioElem );
    return;
  }

  if( activeElement )
    releaseAudio();

  audioElem.playing = true;

  activeElement = {};
  activeElement.elem = audioElem;

  flashTempo(); // sync flash to our playing

  switch( audioElem.objType )
  {
    case "CSample":   playCSample( audioElem );   break;
    case "CChord":    playCChord( audioElem ); break;
    case "CGroupRef": playCGroupRef( audioElem ); break;
  }
}

var playNextTimer;

function playNextElementCB()
{
  playNextTimer = undefined;
  playElement( "START" );
}

function playCSample( audioElem )
{
  var libSample = sampleLibrary[ audioElem.elementName ]; // the ClLibrarySample

  if( libSample )
  {
    var player;

    if( !libSample.player )
    {
      // We put the Player in the ClLibrarySample so there is only 1 instance per sample.
      // The same sample may be in multiple groups.
      // First time we need to create the player and connect it.
      player = new Tone.Player( serverURL + "/" + libSample.filename );
      player.volume.level = 0;
      player.onstop = samplePlayCompleteCB;
      player.autostart = true;
      player.connect( masterLevel );
      libSample.player = player;
    }
    else
    {
      libSample.player.start();
      player = libSample.player;
    }

    // Do the envelop for samples using fadeIn / fadeOut.
    var env = curConfig.groups[ audioElem.group ].envelope; 

    if( env == envelopeLabels[ 1 ] ) { player.fadeIn = .5; player.fadeOut = .5; }
    else if( env == envelopeLabels[ 2 ] ) { player.fadeIn = 2; player.fadeOut = 2; }
    else if( env == envelopeLabels[ 3 ] ) { player.fadeIn = 5; player.fadeOut = 5; }
    else { player.fadeIn = 0; player.fadeOut = 0; }

    libSample.player.loop = audioElem.loopFlag;
  }
}

function playCChord( audioElem )
{
  instrument = curConfig.groups[ audioElem.group ].instrument;

  if( !instrument )
    return;

  var frequencies = [];
  for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
    if( audioElem.notes & ( 1 << noteIx ) ) // notes are a bit field
    {
      var noteOffset = noteIx - 9 + audioElem.octave * 12; // semitone offset from A440
      var freq = 440 * Math.pow( 2, noteOffset / 12 );
      var voices = curConfig.groups[ cursorGroup ].thickenFlag ? [ freq *.996, freq, freq * 1.004 ] : [ freq ]; // detuned voices for thickness
      frequencies = frequencies.concat( voices );
    }

  if( curConfig.groups[ cursorGroup ].envelope != "None" ) // instrument may have a default envelope
    instruments[ instrument ].set( { envelope : envelopeParams[ curConfig.groups[ cursorGroup ].envelope ] } );
  activeElement.synth = instruments[ instrument ];
  activeElement.chordNotes = frequencies;
  activeElement.synth.triggerAttack( frequencies );
  activeElement.group = curConfig.groups[ cursorGroup ];

  if( curConfig.groups[ cursorGroup ].seqMode == seqModes[ 2 ] )
    playNextTimer = setTimeout( playNextElementCB, currentTempo * audioElem.playBeats );
}

function playCGroupRef( audioElem )
{
  var grp = undefined;
  for( var ix = 0;ix < curConfig.groups.length;ix++ )
    if( curConfig.groups[ ix ].elementName == audioElem.elementName )
    {
      grp = curConfig.groups[ ix ];
      break;
    }

  if( grp )
  {
    activeElement.synth = instruments[ grp.instrument ];
    activeElement.loopFlag = audioElem.loopFlag;
    activeElement.grpChordIndex = 0;
    activeElement.beatsRemaining = 0;
    activeElement.group = grp;
    grpPlayTimerCB();
  }
}

// Play group placed in other groups.
// Play each CChord for CChord.playBeats beats. Repeat if loopFlag.
function grpPlayTimerCB()
{
  if( !activeElement ) // This is our flag to stop playing the sequence.
    return;

  if( activeElement.beatsRemaining-- > 0 )
  {
    // Are we done playing this Chord? If not return.
    activeElement.grpTimer = setTimeout( grpPlayTimerCB, currentTempo );
    return;
  }
  if( activeElement.chordNotes )
    activeElement.synth.triggerRelease( activeElement.chordNotes );

  if( ( activeElement.grpChordIndex == activeElement.group.elements.length ) && !activeElement.loopFlag )
  {
    if( curConfig.groups[ cursorGroup ].seqMode == seqModes[ 2 ] )
      playNextTimer = setTimeout( playNextElementCB, 0 ); // just to loosly couple. Maybe could call directly.
    return; // this was the last chord. We're done.
  }
  var playElem = activeElement.group.elements[ activeElement.grpChordIndex ];
  if( playElem.objType == "CChord" ) // Group must be all CChord. TBD, skip groups and samples.
  {
    activeElement.chordNotes = [];
    var chord = chordFromName( playElem.elementName );
    if( chord )
    {
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( chord.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + chord.octave * 12; // semitone offset from A440
          activeElement.chordNotes.push( 440 * Math.pow( 2, noteOffset / 12 ) );
        }

      activeElement.beatsRemaining = playElem.playBeats;
      activeElement.synth.triggerAttack( activeElement.chordNotes );

      activeElement.grpChordIndex += 1;
      if( ( activeElement.grpChordIndex >= activeElement.group.elements.length ) && activeElement.loopFlag )
        activeElement.grpChordIndex = 0; // loop

      activeElement.grpTimer = setTimeout( grpPlayTimerCB, currentTempo );
    }
  }
}

function arpTimerCB() // call once per beat. We queue all notes for the next beat.
{
  if( !activeElement )
    return;

  activeElement.arpTimer = undefined;

  if( activeElement.nextElem ) // Go to the next arpeggio
  {
    activeElement.elem.playing = false;
    var tmp = activeElement.nextElem;
    activeElement.nextElem = undefined;
    activeElement = undefined;
    doArpeggio( tmp );
  }
  else
  {
    var noteTime = Tone.now();
    var noteLength = currentTempo / activeElement.arpNotesPerBeat / 1000; // tempo is Ms.

    for( var beatIx = 0;beatIx < activeElement.arpNotesPerBeat;beatIx++ )
    {
      activeElement.synth.triggerAttackRelease( activeElement.arpNotes[ activeElement.arpNoteIndex ], noteLength, noteTime );
      if( ++activeElement.arpNoteIndex == activeElement.arpNotes.length )
        activeElement.arpNoteIndex = 0;
      noteTime += noteLength;
    }
    if( activeElement.group.seqMode == seqModes[ 2 ] )
      if( --activeElement.beatsRemaining == 0 )
      {
        playNextTimer = setTimeout( playNextElementCB, currentTempo ); 
        return;
      }
    
    activeElement.arpTimer = setTimeout( arpTimerCB, currentTempo );
  }
}

function arpChord( chord, seq )
{
  var arpNotes = [];
  if( ( seq == "B-T" ) || ( seq == "T-B" ) )
  {
    var firstNote = true;
    var bassNote = [];
    var trebNotes = [];

    for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
      if( chord.notes & ( 1 << noteIx ) ) // notes are a bit field
      {
        var noteOffset = noteIx - 9 + chord.octave * 12; // semitone offset from A440
        var freq = 440 * Math.pow( 2, noteOffset / 12 );
        if( firstNote )
          bassNote = [ freq ];
        else
          trebNotes.push( freq );

        firstNote = false;
      }
    if( seq == "B-T" )
    {
      arpNotes.push( bassNote );
      arpNotes.push( trebNotes );
    }
    else
    {
      arpNotes.push( trebNotes );
      arpNotes.push( bassNote );
    }
  }
  else
  {
    for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
      if( chord.notes & ( 1 << noteIx ) ) // notes are a bit field
      {
        var noteOffset = noteIx - 9 + chord.octave * 12; // semitone offset from A440
        var freq = 440 * Math.pow( 2, noteOffset / 12 );
        arpNotes.push( [ freq ] ); // An array notes
      }

    if( arpNotes.length > 3 )
      switch( seq )
      {
        case "4321":
          arpNotes = arpNotes.reverse();
          break;
        case "1324":
        case "4231":
          if( seq == "4231" )
            arpNotes = arpNotes.reverse();

          for( var index = 1;index < arpNotes.length - 1;index += 2 )
          {
            var tmp = arpNotes[ index ];
            arpNotes[ index ] = arpNotes[ index + 1 ];
            arpNotes[ index + 1 ] = tmp;
          }
          break;
        
        case "12324323":
          arpNotes = [ arpNotes[ 0 ], arpNotes[ 1 ], arpNotes[ 2 ], arpNotes[ 1 ],
                       arpNotes[ 3 ], arpNotes[ 2 ], arpNotes[ 1 ], arpNotes[ 2 ] ];
        default:
          break;
      }
  }
  
  return arpNotes;
}

// set up the arpNotes
function doArpeggio( audioElem )
{
  flashTempo(); // sync flash to our playing

  audioElem.playing = true;
  genElementConfigHTML();

  var instrument = curConfig.groups[ audioElem.group ].instrument; // Group instrument
  if( !instrument )
    return;

  activeElement = {};
  activeElement.elem = audioElem;
  activeElement.arpNoteIndex = 0;
  activeElement.group = curConfig.groups[ audioElem.group ];

  if( audioElem.objType == "CChord" )
  {
    activeElement.synth = instruments[ instrument ];
    var seq = curConfig.groups[ audioElem.group ].arpSequence;

    activeElement.arpNotes = arpChord( audioElem, seq );
    activeElement.arpNotesPerBeat = curConfig.groups[ audioElem.group ].arpNPB;
    activeElement.beatsRemaining = audioElem.playBeats;
  }
  else if( audioElem.objType == "CGroupRef" && ( instrument != "None" ) ) // Arp a group that's in another group.
  {
    // Arp this entire sequence.
    var grp = undefined; // Find group
    for( var i = 0;i < curConfig.groups.length;i++ )
      if( curConfig.groups[ i ].elementName == audioElem.elementName )
      {
        grp = curConfig.groups[ i ];
        break;
      }

    if( grp )
    {
      activeElement.arpNotes = [];

      activeElement.synth = instruments[ instrument ];
      activeElement.beatsRemaining = 0;

      for( var seqIx = 0;seqIx < grp.elements.length;seqIx++ )
        if( grp.elements[ seqIx ].objType == "CChord" ) // only add CChord, not samples or groups.
        {
          var chord = chordFromName( grp.elements[ seqIx ].elementName ); // from the chord Lib
          if( !chord )
            continue;
          var notes = arpChord( chord, grp.arpSequence );
          //  want to arp this chord for playBeats given we're playing arpNPB notes per beat
          //  So we need playBeats * arpNPB notes of this chord. May need to add / prune to get the right number.
          var nextNote = 0;
          const arpNotes = grp.elements[ seqIx ].playBeats * grp.arpNPB;
          activeElement.beatsRemaining += grp.elements[ seqIx ].playBeats; // Arping the whole sequence.
          while( notes.length < arpNotes ) // Add more if too short
            notes.push( notes[ nextNote++ ] ); // notes[] grows so we don't have to loop nextNote.
          while( notes.length > arpNotes ) // Prune if too long
            notes.pop();
          activeElement.arpNotes = activeElement.arpNotes.concat( notes );
          activeElement.arpNotesPerBeat = grp.arpNPB;
        }
    }
  }
  else
    return;

  arpTimerCB();
}

function stopArpeggio()
{
  if( activeElement )
  {
    activeElement.playing = false;
    if( activeElement.arpTimer )
    {
      clearTimeout( activeElement.arpTimer );
      activeElement.arpTimer = undefined;
    } 
  }
  activeElement = undefined;
}

function doModAudio( modifier, state )
{
  switch( modifier )
  {
    case "filter":  filterBlock.wet.rampTo( state ? 1 : 0, .2 ); break;
    case "tremolo": tremoloBlock.wet.rampTo( state ? 1 : 0, 1 ); break;
    case "chorus":  chorusBlock.wet.rampTo( state ? 1 : 0, .5 ); break;
    case "distortion": distortionBlock.wet.rampTo( state ? 1 : 0, .5 ); break;
  }
}

// function chordFromName( cName ) // get the CLibChord by name
// {
//   var s = undefined;

//   for( var chordIx = 0;chordIx < chordLibrary.length;chordIx++ )
//     if( chordLibrary[ chordIx ].elementName == cName )
//     {
//       s = chordLibrary[ chordIx ];
//       break;
//     }

//   return s;
// }