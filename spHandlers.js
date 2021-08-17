// Button / click handlers

function sl_allowDrop( ev ) { ev.preventDefault(); }
function dragElem( ev ) { ev.dataTransfer.setData( "dragElem", ev.target.id ); }

/////////////// /////////////// /////////////// ///////////////
// Handle a song being dropped onto a setlist file.
// Samples can be dragged from within the setlist to move them or from the Library to add them.
/////////////// /////////////// /////////////// ///////////////
function dropElem( ev )
{
  const slElem = "slElement.";
  const slGroup = "slGroup.";
  const cbStr = "clipboard";
  const libSamp = "libSample.";
  const libChordID = "libChord.";

  ev.preventDefault();
  var dragElem = ev.dataTransfer.getData( "dragElem" );

  if( ( dragElem.substring( 0, cbStr.length ) == cbStr ) &&
      ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // dropping the clipboard onto a set.
  {
    indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toSampleIx = parseInt( indexes[ 1 ] );

    if( toGroup < globals.cfg.groups.length - 1 )
      while( true )
      {
        var song = globals.cfg.groups[ globals.cfg.groups.length - 1 ].elements.pop();
        if( song )
          globals.cfg.groups[ toGroup ].elements.splice( toSampleIx, 0, song );
        else
          break;
      }
  }
  else if( ( dragElem.substring( 0, slElem.length ) == slElem ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Moving an element
  {
    var indexes = dragElem.substring( slElem.length, ).split( "." );
    var fromGroup = parseInt( indexes[ 0 ] );
    var fromElementIx = parseInt( indexes[ 1 ] );

    indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    if( fromGroup == toGroup ) // Moving within the same set
    {
      if( toElementIx < fromElementIx ) // Moved song up
      {
        globals.cfg.groups[ toGroup ].elements.splice( toElementIx, 0, globals.cfg.groups[ fromGroup ].elements[ fromElementIx ] );
        globals.cfg.groups[ fromGroup ].elements.splice( fromElementIx + 1, 1 );
      }
      else
      {
        globals.cfg.groups[ toGroup ].elements.splice( toElementIx + 1, 0, globals.cfg.groups[ fromGroup ].elements[ fromElementIx ] );
        globals.cfg.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
      }
    }
    else // Move between groups.
    {
      globals.cfg.groups[ toGroup ].elements.splice( toElementIx, 0, globals.cfg.groups[ fromGroup ].elements[ fromElementIx ] );
      globals.cfg.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
    }
  }
  else if( ( dragElem.substring( 0, libSamp.length ) == libSamp ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping library sample into the config
  {
    var sampId = dragElem.substring( libSamp.length, );
    var libSample = globals.sampleLibrary[ sampId ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    globals.cfg.groups[ toGroup ].elements.splice( toElementIx, 0, new CSample( libSample.displayName ) );
  }
  else if( ( dragElem.substring( 0, slGroup.length ) == slGroup ) &&
           ( ev.target.id.substring( 0, slGroup.length ) == slGroup ) ) // Moving a group
  {
    var fromGroup = parseInt( dragElem.substring( slGroup.length, ) );
    var toGroup = parseInt( ev.target.id.substring( slGroup.length, ) );

    if( toGroup < fromGroup ) // moved group up
    {
      globals.cfg.groups.splice( toGroup, 0, globals.cfg.groups[ fromGroup ] );
      globals.cfg.groups.splice( fromGroup + 1, 1 );
    }
    else
    {
      globals.cfg.groups.splice( toGroup + 1, 0, globals.cfg.groups[ fromGroup ] );
      globals.cfg.groups.splice( fromGroup, 1 );
    }
  }
  else if( ev.target.id == "trashCan" )
  {
    if( dragElem.substring( 0, slElem.length ) == slElem )
    {
      var indexes = dragElem.substring( slElem.length, ).split( "." );
      var delGroup = parseInt( indexes[ 0 ] );
      var delSample = parseInt( indexes[ 1 ] );

      globals.cfg.groups[ delGroup ].elements.splice( delSample, 1 );
    }
    else if( dragElem.substring( 0, slGroup.length ) == slGroup )
    {
      var delGroup = parseInt( dragElem.substring( slGroup.length, ) );
      globals.cfg.groups.splice( delGroup, 1 );
    }
    else if( dragElem.substring( 0, libChordID.length ) == libChordID )
    {
      var delChord = parseInt( dragElem.substring( libChordID.length, ) );
      globals.chordLibrary.splice( delChord, 1 );
      CGlobals.chordEditedFlag = true;
    }
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      globals.cfg.groups[ globals.cfg.groups.length - 1 ].elements = [];
  }

  globals.configEditedFlag = true;

  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setSampleConfigName()
{
  if( globals.editMode )
  {
    var name = prompt( "Enter Config Name:", globals.cfg.name );
    if( name )
    {
      globals.cfg.name = name;
      globals.configEditedFlag = true;
      document.getElementById( 'sampleListName' ).innerHTML = name;
    }
  }
}

function setCursor( g, e )
{
  globals.cursor.cg = g;
  globals.cursor.ce = e;

  setArpState( globals.cfg.groups[ globals.cursor.cg ].arpFlag ); // need to update the highlight status
  setTempoMs( globals.cfg.groups[ globals.cursor.cg ].tempoMs ); // set the tempo to this group
}

function groupClick( groupIndex )
{
  setCursor( groupIndex, undefined );

  if( globals.editMode )
  {
    saveEdits();
    globals.editElement = globals.cfg.groups[ groupIndex ];
    genEditGroupHTML();
  }

  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function elemClick( groupIndex, sampleIndex )
{
  setCursor( groupIndex, sampleIndex );

  if( globals.editMode )
  {
    saveEdits();
    globals.editElement = globals.cfg.groups[ groupIndex ].elements[ sampleIndex ];

    if( globals.editElement )
    {
      if( globals.editElement.objType == "CSample" )
        genEditSampleHTML();
      else if( globals.editElement.objType == "CChord" )
        genEditChordHTML();
    }
  }

  genElementConfigHTML();
}

function addToGroup( groupIndex ) // clicked +. Add a Chord to the group.
{
  saveEdits();
  globals.editElement = new CChord( "New" );
  globals.cfg.groups[ groupIndex ].elements.push( globals.editElement );

  globals.cursor.cg = groupIndex;
  globals.cursor.ce = globals.cfg.groups[ groupIndex ].elements.length - 1;

  if( globals.editMode )
    genEditChordHTML();

  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function libSampleClick( songId )
{
  // add to Clipboard
  var sample = new CSample( globals.sampleLibrary[ songId ].displayName );
  globals.cfg.groups[ globals.cfg.groups.length - 1 ].elements.push( sample ); 
  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function groupAdd()
{
  if( globals.cfg.groups.length < CGlobals.MAX_GROUPS )
  {
    globals.cfg.groups.splice( globals.cfg.groups.length - 1, 0, new CGroup( "Group" ) );
    globals.configEditedFlag = true;
    genElementConfigHTML();
  }
  else
    alert( "Max Groups reached" );
}

function playComplete( playElem )
{
  // if( playElem.elem )
  //   playElem.elem.classList.remove( 'css_playing' );

  genElementConfigHTML();
}

function playElement( action )
{
  saveEdits();

  if( ( globals.cursor.cg != undefined ) && ( globals.cursor.ce != undefined ) )
  {
    if( action == "START" )
    {
      var ce = globals.cfg.groups[ globals.cursor.cg ].elements[ globals.cursor.ce ];
      ce.group = globals.cursor.cg;

      playElemAudio( ce );
      if( globals.cfg.groups[ globals.cursor.cg ].seqMode != CGlobals.seqModes[ 0 ] )
        moveCursor( "RIGHT" );
    }
    else if( action == "STOP" )
      releaseAudio();

    genElementConfigHTML();
  }
}

function toggleEdit()
{
  if( globals.editMode )
    saveEdits();

  globals.editElement = undefined; 
  globals.editMode = !globals.editMode;

  var b = document.getElementById( 'editButton' );
  globals.editMode ? b.classList.add( 'css_highlight_red' ) : b.classList.remove( 'css_highlight_red' );

  document.getElementById( 'multiuse' ).innerHTML = "";
}

function cloneChord()
{
  var newChord = new CChord( "" );
  newChord.elementName = globals.editElement.elementName;
  newChord.playBeats = globals.editElement.playBeats;
  newChord.notes = globals.editElement.notes;
  newChord.octave = globals.editElement.octave;
  globals.cfg.groups[ globals.cfg.groups.length - 1 ].elements.push( newChord );
  genElementConfigHTML();
}

function cloneGroup()
{
  var newGroup = new CGroup( "Part" );
  var copyGroup = globals.cfg.groups[ globals.cursor.cg ];

  newGroup.instrument = copyGroup.instrument;
  newGroup.chained = true; 
  newGroup.thickenFlag = copyGroup.thickenFlag;

  newGroup.tempoMs = copyGroup.tempoMs;
  newGroup.seqMode = copyGroup.seqMode;
  newGroup.arpFlag = copyGroup.arpFlag;
  newGroup.arpNPB = copyGroup.arpNPB;
  newGroup.arpSequence = copyGroup.arpSequence;
  newGroup.tremRate = copyGroup.tremRate;
  newGroup.envelope = copyGroup.envelope;

  newGroup.masterLevel = copyGroup.masterLevel;
  newGroup.distortionLevel = copyGroup.distortionLevel;
  newGroup.chorusLevel = copyGroup.chorusLevel;
  newGroup.phaserLevel = copyGroup.phaserLevel;
  newGroup.tremoloLevel = copyGroup.tremoloLevel;
  newGroup.dryLevel = copyGroup.dryLevel;
  newGroup.reverbLevel = copyGroup.reverbLevel;
  newGroup.delayLevel = copyGroup.delayLevel;

  // chain after current group.
  globals.cfg.groups.splice( globals.cursor.cg + 1, 0, newGroup );
  genElementConfigHTML();
}

// A key on the generated keyboard was pressed.
function keyboardPressed( note )
{
  var pressed = ( ( 1 << note ) & globals.editElement.notes );
  var elem = document.getElementById( 'keyboardKey_' + note );

  if( pressed )
  {
    globals.editElement.notes &= ~( 1 << note ); // clear
    elem.classList.remove( 'css_pressedKey' );
  }
  else
  {
    globals.editElement.notes |= ( 1 << note );
    elem.classList.add( 'css_pressedKey' );
  }
}