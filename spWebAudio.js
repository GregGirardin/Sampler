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
  Cab ?
    |
  Chorus
    |
  Phaser
    |
  Tremolo
    |
  Panner ?
    |
  Limiter
    |
    |\
    | \
    |  \_____________
    |       |        |
    Dry     RGain    DGain <- FX levels
    |       |        |
    |       Reverb   Delay <- Parallel FX so we play trails
    |       |        |
    |       /       /
    Out  <---------  
*/

var audioSource;

function initWebAudio()
{
  // build chain from bottom up
  globals.reverbBlock = new Tone.Reverb( { preDelay : .2, decay : 10, wet : 1 } ).toDestination();
  globals.delayBlock = new Tone.FeedbackDelay( { delayTime : .4, maxDelay : 2, feedback : 0.6, wet : 1 } ).toDestination();

  globals.dryLevelBlock = new Tone.Gain( 1 ).toDestination();
  globals.reverbLevelBlock = new Tone.Gain( 0 ).connect( globals.reverbBlock );
  globals.delayLevelBlock = new Tone.Gain( 0 ).connect( globals.delayBlock );

  globals.limiterBlock = new Tone.Compressor( 0, 10 ); // just for sanity. Tweak if necessary.
  globals.limiterBlock.connect( globals.dryLevelBlock );
  globals.limiterBlock.connect( globals.delayLevelBlock );
  globals.limiterBlock.connect( globals.reverbLevelBlock );

  globals.tremoloBlock = new Tone.Tremolo( { frequency : 4, depth : 1, wet : 0, spread : 0 } );
  globals.tremoloBlock.connect( globals.limiterBlock );

  globals.phaserBlock = new Tone.Phaser( { frequency : 1, octaves : 5, baseFrequency : 1000, wet : 0 } );
  globals.phaserBlock.connect( globals.tremoloBlock );

  globals.chorusBlock = new Tone.Chorus( { frequency : .5, delayTime : 2.5, depth : 1, wet : 0 } );
  globals.chorusBlock.connect( globals.phaserBlock );

  // globals.cabBlock = new Tone.Convolver( serverURL + "irs/CabIR02.wav" );
  // globals.cabBlock.set( { wet : 1, volume : 0 } );
  // globals.cabBlock.connect( globals.chorusBlock );

  globals.distortionBlock = new Tone.Chebyshev( 50 );
  globals.distortionBlock.connect( globals.chorusBlock );
  // globals.distortionBlock.connect( globals.cabBlock );
  globals.distortionBlock.wet.value = 0;

  globals.filterBlock = new Tone.AutoFilter();
  globals.filterBlock.set( {  frequency : .5,
                              depth : 1,
                              baseFrequency : 200,
                              octaves : 5,
                              filter : { rolloff : -24 , Q : 2 } } );
  globals.filterBlock.wet.value = 0;
  globals.filterBlock.connect( globals.distortionBlock );

  globals.masterLevelBlock = new Tone.Gain( 0 );
  globals.masterLevelBlock.connect( globals.filterBlock );

  createSynths();
}

function initWebAudio2()
{
  globals.tremoloBlock.start();
  globals.chorusBlock.start();
  globals.filterBlock.start();
  Tone.start();
}

function createSynths() // create all synths and connect them to globals.masterLevel
{
  // Oscillators are louder than samplers so we normalize volumes.
  const instURL = serverURL + "instruments/";

  for( var ix = 0;ix < CGlobals.synthTypes.length;ix++ )
  {
    var sType = CGlobals.synthTypes[ ix ];

    switch( sType )
    {
      case "Sine":
      case "Square":
      case "Sawtooth":
      case "Triangle":
        var oType = sType.toLowerCase();
        s = new Tone.PolySynth( Tone.Synth, { polyphony : 15, oscillator: { partials : [ 0, 2, 3, 6 ], } } );
        s.set( { volume : -10, oscillator : { type : oType }, } );
        break;

      case "Bell":
        var oType = sType.toLowerCase();
        s = new Tone.PolySynth( Tone.Synth, { polyphony : 12, oscillator: { partials : [ 0, 2, 3, 6 ], } } );
        s.set( { volume : -10, oscillator : { type : "sine" },
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
                                release : 4, baseUrl : instURL + "piano/" } );
        break;

      case "Cello":
        s = new Tone.Sampler( { urls :  { 'E2': 'E2.mp3', 'E3': 'E3.mp3', 'E4': 'E4.mp3', 'F2': 'F2.mp3', 'F3': 'F3.mp3', 'F4': 'F4.mp3',
                                          'F#3': 'Fs3.mp3', 'F#4': 'Fs4.mp3', 'G2': 'G2.mp3', 'G3': 'G3.mp3', 'G4': 'G4.mp3',
                                          'G#2': 'Gs2.mp3', 'G#3': 'Gs3.mp3', 'G#4': 'Gs4.mp3', 'A2': 'A2.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3',
                                          'A#2': 'As2.mp3', 'A#3': 'As3.mp3', 'A#4': 'As4.mp3', 'B2': 'B2.mp3', 'B3': 'B3.mp3', 'B4': 'B4.mp3',
                                          'C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C#3': 'Cs3.mp3', 'C#4': 'Cs4.mp3',
                                          'D2': 'D2.mp3', 'D3': 'D3.mp3', 'D4': 'D4.mp3', 'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4': 'Ds4.mp3' },
                                release : 8, baseUrl : instURL + "cello/" } );
          break;

      case "Flute":
        s = new Tone.Sampler( { urls :  { 'A5': 'A5.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3',
                                          'E3': 'E3.mp3', 'E4': 'E4.mp3', 'E5': 'E5.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3' },
                                release : 8, baseUrl : instURL + "flute/" } );
        break;

      case "French":
        s = new Tone.Sampler( { urls :  { 'D2': 'D2.mp3', 'D4': 'D4.mp3', 'D#1': 'Ds1.mp3', 'F2': 'F2.mp3',
                                          'F4': 'F4.mp3', 'G1': 'G1.mp3', 'A0': 'A0.mp3', 'A2': 'A2.mp3', 'C1': 'C1.mp3', 'C3': 'C3.mp3' },
                                release : 4, baseUrl : instURL + "french-horn/" } );
        break;

      case "Trumpet":
        s = new Tone.Sampler( { urls :  { 'C5': 'C5.mp3', 'D4': 'D4.mp3', 'D#3': 'Ds3.mp3', 'F2': 'F2.mp3', 'F3': 'F3.mp3',
                                          'F4': 'F4.mp3', 'G3': 'G3.mp3', 'A2': 'A2.mp3', 'A4': 'A4.mp3', 'A#3': 'As3.mp3', 'C3': 'C3.mp3' },
                                release : 4, baseUrl : instURL + "trumpet/" } );
        break;

      case "Violin":
        s = new Tone.Sampler( { urls :  { 'A3': 'A3.mp3', 'A4': 'A4.mp3', 'A5': 'A5.mp3', 'A6': 'A6.mp3',
                                          'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3', 'C7': 'C7.mp3',
                                          'E4': 'E4.mp3', 'E5': 'E5.mp3', 'E6': 'E6.mp3',
                                          'G4': 'G4.mp3', 'G5': 'G5.mp3', 'G6': 'G6.mp3' },
                                release : 4, baseUrl : instURL + "violin/" } );
        break;

      case "Xylo":
        s = new Tone.Sampler( { urls :  { 'G3': 'G3.mp3', 'G4': 'G4.mp3', 'G5': 'G5.mp3', 'G6': 'G6.mp3',
                                          'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3','C7': 'C7.mp3' },
                                release : 4, baseUrl : instURL + "xylophone/" } );
        break;

      case "Harp":
        s = new Tone.Sampler( { urls :  { 'C3': 'C3.mp3', 'C5': 'C5.mp3',
                                          'D2': 'D2.mp3', 'D4': 'D4.mp3', 'D6': 'D6.mp3', 'D7': 'D7.mp3',
                                          'E1': 'E1.mp3', 'E3': 'E3.mp3', 'E5': 'E5.mp3',
                                          'F2': 'F2.mp3', 'F4': 'F4.mp3', 'F6': 'F6.mp3', 'F7': 'F7.mp3',
                                          'G1': 'G1.mp3', 'G3': 'G3.mp3', 'G5': 'G5.mp3',
                                          'A2': 'A2.mp3', 'A4': 'A4.mp3', 'A6': 'A6.mp3',
                                          'B1': 'B1.mp3', 'B3': 'B3.mp3', 'B5': 'B5.mp3', 'B6': 'B6.mp3' },
                                release : 4, baseUrl : instURL + "harp/" } );
        break;

      case "Organ":
        s = new Tone.Sampler( { urls : {  'C1': 'C1.mp3','C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4' : 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3',
                                          'D#1': 'Ds1.mp3', 'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4' : 'Ds4.mp3', 'D#5' : 'Ds5.mp3',
                                          'F#1': 'Fs1.mp3', 'F#2': 'Fs2.mp3', 'F#3': 'Fs3.mp3', 'F#4' : 'Fs4.mp3', 'F#5' : 'Fs5.mp3',
                                          'A1': 'A1.mp3', 'A2': 'A2.mp3', 'A3': 'A3.mp3', 'A4': 'A4.mp3', 'A5': 'A5.mp3' },
                                release : 4, baseUrl : instURL + "organ/" } );
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
        s.set( {  polyphony : 12,
                  volume : -10,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } });
        break;

      case "Pluck":
        s = new Tone.PolySynth( Tone.AMSynth );
        s.set( {  polyphony : 12,
                  volume : -6,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  envelope : { attack: 0.006, decay: 4, sustain: 0.04, release: 1.2 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } } );
        break;
  
      case "MiscE":
        s = new Tone.PolySynth( Tone.Synth );
        s.set({ volume : 0,
                oscillator: { type: "fatsine4", spread: 60, count: 10 },
                envelope: { attack: 0.4, decay: 0.01, sustain: 1, attackCurve: "sine", releaseCurve: "sine", release: 0.4 } });
        break;

      case "noise":
        s = new Tone.NoiseSynth( {  volume : -12 } );
        break;

      default:
        continue;
    }

    s.canThickenFlag = ( s instanceof Tone.PolySynth ) ? true : false;
    s.connect( globals.masterLevelBlock );
    globals.instruments[ sType ] = s;
  }
}

function releaseAudio()
{
  if( globals.ae )
  {
    globals.ae.elem.playing = false;

    if( globals.ae.elem.objType == "CSample" )
    {
      var libSample = globals.sampleLibrary[ globals.ae.elem.elementName ]; // a CSample
      if( libSample )
        if( libSample.player )
          libSample.player.stop();
    }
    else // "CChord"
       globals.ae.synth.triggerRelease( globals.ae.chordNotes );

    if( globals.ae.grpTimer )
      clearTimeout( globals.ae.grpTimer );

    if( globals.ae.arpTimer );
      clearTimeout( globals.ae.arpTimer );

    playComplete( globals.ae.elem );
  }

  cancelPlayNext();

  globals.ae = undefined;
}

function cancelPlayNext()
{
  if( playNextTimer )
  {
    clearTimeout( playNextTimer );
    globals.stopFlag = false;
    playNextTimer = undefined;
  }
}

function setEffectLevels( g, t )
{
  globals.instruments[ g.instrument ].set( { envelope : CGlobals.envelopeParams[ g.envelope ] } );

  var mBlockLevel = .5 * g.masterLevel / 100; // bring volume down a bit.
  if( g.thickenFlag && globals.instruments[ g.instrument ].canThickenFlag )
    mBlockLevel *= .5; // thickening creates 2 extra voices, so reduce volume to normalize.

  // volume needs to be immediate or may cause high volume after a switch.
  globals.masterLevelBlock.gain.rampTo( mBlockLevel, 0 ); 
  globals.dryLevelBlock.gain.rampTo( g.dryLevel / 100, t );
  globals.delayLevelBlock.gain.rampTo( g.delayLevel / 100, t );
  globals.reverbLevelBlock.gain.rampTo( g.reverbLevel / 100, t );
  globals.phaserBlock.wet.rampTo( g.phaserLevel / 100, t );

  if( !globals.modDistState ) // Modifier is on?
    globals.distortionBlock.wet.rampTo( g.distortionLevel / 100, t );
  if( !globals.modTremoloState )
    globals.tremoloBlock.wet.rampTo( g.tremoloLevel / 100, t );
  if( !globals.modChorusState )
    globals.chorusBlock.wet.rampTo( g.chorusLevel / 100, t );
}

function adjustVolumeLevel( diff )
{
  var l = globals.cfg.groups[ globals.cursor.cg ].masterLevel;
  l += diff;
  if( l < 0 )
    l = 0;
  else if( l > 100 )
    l = 100;
  setVolumeLevel( l );
}

function setVolumeLevel( level )
{
  globals.cfg.groups[ globals.cursor.cg ].masterLevel = level;
  globals.masterLevelBlock.gain.rampTo( level / 100, 1 );
  configEdited( true );
  // tweaking UI here is kind of aside effect.
  const newHtml =  "Vol:" + level;
  fsButtonMap[ "EVENT_HOLD" ][ 5 ].NavLR.html = newHtml; 
  var elem = document.getElementById( fsButtonMap[ "EVENT_HOLD"  ][ 5 ].id );
  elem.innerHTML = newHtml;
}

var firstTime = true;

function samplePlayCompleteCB()
{
  if( globals.ae )
  {
    globals.ae.playing = false;
    playComplete( globals.ae );
  }

  if( ( globals.cfg.groups[ globals.cursor.cg ].seqMode == CGlobals.seqModes[ 2 ] && globals.cursor.ce ) ||
        globals.cfg.groups[ globals.cursor.cg ].seqMode == CGlobals.seqModes[ 3 ] )
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

  setEffectLevels( globals.cfg.groups[ audioElem.group ], .5 );
  setTempoMs( globals.cfg.groups[ audioElem.group ].tempoMs );

  if( globals.cfg.groups[ audioElem.group ].arpFlag && elemCanArpeggiate( audioElem ) )
  {
    if( globals.ae )
      if( globals.ae.arpTimer )
      {
        globals.ae.nextElem = audioElem; // Queue the next arp. Want to complete the current arp of the current beat.
        return;
      }
      else
        releaseAudio();

    doArpeggio( audioElem );
    return;
  }

  if( globals.ae )
    releaseAudio();

  audioElem.playing = true;

  globals.ae = {};
  globals.ae.elem = audioElem;

  flashTempo(); // sync flash to our playing

  switch( audioElem.objType )
  {
    case "CSample": playCSample( audioElem ); break;
    case "CChord":  playCChord( audioElem );  break;
  }
}

var playNextTimer;

function playNextElementCB()
{
  playNextTimer = undefined;

  if( globals.stopFlag )
  {
    globals.stopFlag = false;
    playElement( "STOP" );
  }
  else
    playElement( "START" );
}

function playCSample( audioElem )
{
  var libSample = globals.sampleLibrary[ audioElem.elementName ]; // the ClLibrarySample

  if( libSample )
  {
    var player;

    if( !libSample.player )
    {
      // We put the Player in the ClLibrarySample so there is only 1 instance per sample.
      // The same sample may be in multiple groups.
      // First time we need to create the player and connect it.
      player = new Tone.Player( serverURL + libSample.filename );
      player.volume.level = 0;
      player.onstop = samplePlayCompleteCB;
      player.autostart = true;
      player.connect( globals.masterLevelBlock );
      libSample.player = player;
    }
    else
    {
      libSample.player.start();
      player = libSample.player;
    }

    // Do the envelop for samples using fadeIn / fadeOut.
    var env = globals.cfg.groups[ audioElem.group ].envelope; 

    if(      env == CGlobals.envelopeLabels[ 1 ] ) { player.fadeIn = .5; player.fadeOut = .5; }
    else if( env == CGlobals.envelopeLabels[ 2 ] ) { player.fadeIn =  2; player.fadeOut =  2; }
    else if( env == CGlobals.envelopeLabels[ 3 ] ) { player.fadeIn =  5; player.fadeOut =  5; }
    else { player.fadeIn = 0; player.fadeOut = 0; }

    libSample.player.loop = audioElem.loopFlag;
  }
}

function playCChord( audioElem )
{
  instrument = globals.cfg.groups[ audioElem.group ].instrument;
  globals.ae.synth = globals.instruments[ instrument ];
  globals.ae.group = globals.cfg.groups[ globals.cursor.cg ];

  var frequencies = [];
  for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
    if( audioElem.notes & ( 1 << noteIx ) ) // notes are a bit field
    {
      var noteOffset = noteIx - 9 + audioElem.octave * 12; // semitone offset from A440
      var freq = 440 * Math.pow( 2, noteOffset / 12 );
      var voices = ( globals.ae.group.thickenFlag && globals.instruments[ instrument ].canThickenFlag ) ? 
                   [ freq *.996, freq, freq * 1.004 ] : [ freq ]; // detuned voices for thickness
      frequencies = frequencies.concat( voices );
    }

  globals.ae.chordNotes = frequencies;
  globals.ae.synth.triggerAttack( frequencies );
  const sMode = globals.cfg.groups[ globals.cursor.cg ].seqMode;

  if( ( sMode == CGlobals.seqModes[ 2 ] ) || ( sMode == CGlobals.seqModes[ 3 ] ) )
  {
    const t = globals.currentTempo * audioElem.playBeats;

    if( sMode == CGlobals.seqModes[ 2 ] && ( globals.cursor.ce == globals.ae.group.elements.length - 1 ) )
      globals.stopFlag = true; // at the end of Loop. Stop unless we change groups or hit play in the meantime.
    playNextTimer = setTimeout( playNextElementCB, t );
  }
}

function arpTimerCB() // call once per beat. We queue all notes for the next beat.
{
  if( !globals.ae )
    return;

  globals.ae.arpTimer = undefined;

  if( globals.ae.nextElem ) // Go to the next arpeggio
  {
    globals.ae.elem.playing = false;
    var tmp = globals.ae.nextElem;
    globals.ae.nextElem = undefined;
    globals.ae = undefined;
    doArpeggio( tmp );
  }
  else
  {
    var noteTime = Tone.now();
    var noteLength = globals.currentTempo / globals.ae.arpNotesPerBeat / 1000; // tempo is Ms.

    for( var beatIx = 0;beatIx < globals.ae.arpNotesPerBeat;beatIx++ )
    {
      globals.ae.synth.triggerAttackRelease( globals.ae.arpNotes[ globals.ae.arpNoteIndex ], noteLength, noteTime );
      if( ++globals.ae.arpNoteIndex == globals.ae.arpNotes.length )
        globals.ae.arpNoteIndex = 0;
      noteTime += noteLength;
    }

    if( --globals.ae.beatsRemaining == 0 )
    {
      if( ( globals.ae.group.seqMode == CGlobals.seqModes[ 2 ] && globals.cursor.ce ) || 
            globals.ae.group.seqMode == CGlobals.seqModes[ 3 ] )
        playNextTimer = setTimeout( playNextElementCB, globals.currentTempo ); 
      return;
    }
    
    globals.ae.arpTimer = setTimeout( arpTimerCB, globals.currentTempo );
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
    {
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
          break;
      
        case "31213141": // Bad
          arpNotes = [ arpNotes[ 2 ], arpNotes[ 0 ], arpNotes[ 1 ], arpNotes[ 0 ],
                       arpNotes[ 2 ], arpNotes[ 0 ], arpNotes[ 3 ], arpNotes[ 2 ] ];
          break;
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

  var instrument = globals.cfg.groups[ audioElem.group ].instrument; // Group instrument
  if( !instrument )
    return;

  globals.ae = {};
  globals.ae.elem = audioElem;
  globals.ae.arpNoteIndex = 0;
  globals.ae.group = globals.cfg.groups[ audioElem.group ];

  if( audioElem.objType == "CChord" )
  {
    globals.ae.synth = globals.instruments[ instrument ];
    var seq = globals.cfg.groups[ audioElem.group ].arpSequence;

    globals.ae.arpNotes = arpChord( audioElem, seq );
    globals.ae.arpNotesPerBeat = globals.cfg.groups[ audioElem.group ].arpNPB;
    globals.ae.beatsRemaining = audioElem.playBeats;
  }
  else
    return;

  arpTimerCB();
}

function stopArpeggio()
{
  if( globals.ae )
  {
    globals.ae.playing = false;
    if( globals.ae.arpTimer )
    {
      clearTimeout( globals.ae.arpTimer );
      globals.ae.arpTimer = undefined;
    } 
  }
  globals.ae = undefined;
}

function doModAudio( modifier, state )
{
  switch( modifier )
  {
    case "filter":      globals.filterBlock.wet.rampTo( state ? 1 : 0, 1 );       break;
    case "tremolo":     globals.tremoloBlock.wet.rampTo( state ? 1 : 0, 1 );      break;
    case "chorus":      globals.chorusBlock.wet.rampTo( state ? 1 : 0, 1 );       break;
    case "distortion":  globals.distortionBlock.wet.rampTo( state ? .2 : 0, .5 ); break;
  }
}