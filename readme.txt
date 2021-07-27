A javascript sample player.


Notes:


Other FX sends

Master Reverb / Delay controls, send

Volume / Fade in/out ADSR 

Instruments: Pads Lead, Organ, Glass


https://github.com/wheelibin/synaesthesia/blob/master/src/synth/instruments/presets.js




var arpNoteIndex = 0;
var arpChords = []; // an array of beats, eatch beat is a note arrays.
var arpTimer;
var arpNotesPerBeat;

function arpTimerCB() // call once per beat. We queue all notes for the next beat.
{
  console.log( "arpTimerCB" );
  arpTimer = undefined;

  if( !activeElement )
    return;
  
  if( activeElement.nextElem ) // want to go to the next arpeggio
  {
    activeElement.elem.playing = false;
    var tmp = activeElement.nextElem;
    activeElement.nextElem = undefined;
    activeElement = undefined;
    if( arpeggiatorFlag )
      doArpeggio( tmp );
  }
  else
  {
    var noteTime = Tone.now();
    var noteLength = currentTempo / arpNotesPerBeat / 1000; // tempo is Ms.

    for( var beatIx = 0;beatIx < arpNotesPerBeat;beatIx++ )
    {
      for( var noteIx = 0;noteIx < arpChords[ arpNoteIndex ].length;noteIx++ )
        activeElement.synth.triggerAttackRelease( arpChords[ arpNoteIndex ][ noteIx ], noteLength, noteTime );
      if( ++arpNoteIndex == arpChords.length )
        arpNoteIndex = 0;
      noteTime += noteLength;
    }

    if( ( activeElement.elem.objType == "CChordRef" ) ||
        ( activeElement.elem.objType == "CGroupRef" ) && activeElement.elem.loopFlag )
      arpTimer = setTimeout( arpTimerCB, currentTempo );
    else
      activeElement = undefined;
  }
}



// set up the arpChords
function doArpeggio( audioElem )
{
  if( arpTimer ) // Arpeggiator is currently running. We'll start arping this chord after this sequence completes.
  {
    if( activeElement ) // tbd. Should always be true.'
    {
      if( !activeElement.nextElem ) 
        activeElement.nextElem = audioElem;
    }
    else
      console.log( "!activeElement" );
    return;
  }

  audioElem.playing = true;
  genElementConfigHTML();

  setEffectLevels( curConfig.groups[ audioElem.group ], 0 ); // tbd, move.

  var instrument = curConfig.groups[ audioElem.group ].instrument; // Group instrument
  arpNotesPerBeat = curConfig.groups[ audioElem.group ].arpNPB;

  activeElement = {};
  activeElement.elem = audioElem;

  arpNoteIndex = 0;
  arpChords = [];


  else if( audioElem.objType == "CGroupRef" && instrument != "None" )
  {
    activeElement.synth = instruments[ instrument ];

    var grp = undefined; // Find group
    for( var ix = 0;ix < curConfig.groups.length;ix++ )
      if( curConfig.groups[ ix ].elementName == audioElem.elementName )
      {
        grp = curConfig.groups[ ix ];
        break;
      }
    if( grp )
    {
      for( var seqIx = 0;seqIx < grp.elements.length;seqIx++ )
        if( grp.elements[ seqIx ].objType == "CChordRef" ) // only add CChordRef, not samples or groups.
        {
          var chord = chordFromName( grp.elements[ seqIx ].elementName );
          var freqs = [];
          for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
          {
            if( chord.notes & ( 1 << noteIx ) ) // notes are a bit field
            {
              var noteOffset = noteIx - 9 + chord.octave * 12; // semitone offset from A440
              freqs.push( 440 * Math.pow( 2, noteOffset / 12 ) );
            }
          }
          arpChords.push( freqs ); // An array of note arrays.
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
    activeElement.playing = false;
  activeElement = undefined;

  if( arpTimer )
  {
    clearTimeout( arpTimer );
    arpTimer = undefined;
  } 
}