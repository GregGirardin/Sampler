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

    if( toGroup < curConfig.groups.length - 1 )
      while( true )
      {
        var song = curConfig.groups[ curConfig.groups.length - 1 ].elements.pop();
        if( song )
          curConfig.groups[ toGroup ].elements.splice( toSampleIx, 0, song );
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
        curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
        curConfig.groups[ fromGroup ].elements.splice( fromElementIx + 1, 1 );
      }
      else
      {
        curConfig.groups[ toGroup ].elements.splice( toElementIx + 1, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
        curConfig.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
      }
    }
    else // Move between groups.
    {
      curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
      curConfig.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
    }
  }
  else if( ( dragElem.substring( 0, libSamp.length ) == libSamp ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping library song into set list.
  {
    var sampId = dragElem.substring( libSamp.length, );
    var libSample = sampleLibrary[ sampId ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, new CSample( libSample.filename ) );
  }
  else if( ( dragElem.substring( 0, slGroup.length ) == slGroup ) &&
           ( ev.target.id.substring( 0, slGroup.length ) == slGroup ) ) // Moving a group
  {
    var fromGroup = parseInt( dragElem.substring( slGroup.length, ) );
    var toGroup = parseInt( ev.target.id.substring( slGroup.length, ) );

    if( toGroup < fromGroup ) // moved group up
    {
      curConfig.groups.splice( toGroup, 0, curConfig.groups[ fromGroup ] );
      curConfig.groups.splice( fromGroup + 1, 1 );
    }
    else
    {
      curConfig.groups.splice( toGroup + 1, 0, curConfig.groups[ fromGroup ] );
      curConfig.groups.splice( fromGroup, 1 );
    }
  }
  else if( ( dragElem.substring( 0, libChordID.length ) == libChordID ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping Synth into config 
  {
    var sampIx = dragElem.substring( libChordID.length, );
    var libChord = chordLibrary[ sampIx ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, new CChord( libChord.elementName ) );
  }
  else if( ev.target.id == "trashCan" )
  {
    if( dragElem.substring( 0, slElem.length ) == slElem )
    {
      var indexes = dragElem.substring( slElem.length, ).split( "." );
      var delGroup = parseInt( indexes[ 0 ] );
      var delSample = parseInt( indexes[ 1 ] );

      curConfig.groups[ delGroup ].elements.splice( delSample, 1 );
    }
    else if( dragElem.substring( 0, slGroup.length ) == slGroup )
    {
      var delGroup = parseInt( dragElem.substring( slGroup.length, ) );
      curConfig.groups.splice( delGroup, 1 );
    }
    else if( dragElem.substring( 0, libChordID.length ) == libChordID )
    {
      var delChord = parseInt( dragElem.substring( libChordID.length, ) );
      chordLibrary.splice( delChord, 1 );
    }
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      curConfig.groups[ curConfig.groups.length - 1 ].elements = [];
  }

  configEditedFlag = true;

  genElementConfigHTML();
  genChordLibraryHTML();
}

var helpState = false;
function toggleHelp()
{
  if( editElement )
     saveEdits();

  editElement = undefined; 
  helpState = !helpState;
  var helpHtml = "";

  if( helpState )
    helpHtml = htmlConstStrings( 0 );

  var helpElem = document.getElementById( 'multiuse' );
  helpElem.innerHTML = helpHtml;
}

/////////////// /////////////// /////////////// ///////////////
function setSampleConfigName()
{
  if( editMode )
  {
    var name = prompt( "Enter Config Name:", curConfig.name );
    if( name )
    {
      curConfig.name = name;
      configEditedFlag = true;
      document.getElementById( 'sampleListName' ).innerHTML = name;
    }
  }
}

/////////////// /////////////// /////////////// ///////////////
function groupClick( groupIndex )
{
  if( editMode )
  {
    saveEdits();
    editElement = curConfig.groups[ groupIndex ];
    genEditGroupHTML()
  }
}

/////////////// /////////////// /////////////// ///////////////
function elemClick( groupIndex, sampleIndex )
{
  cursorGroup = groupIndex;
  cursorElement = sampleIndex;

  if( editMode )
  {
    saveEdits();
    editElement = curConfig.groups[ groupIndex ].elements[ sampleIndex ];

    if( editElement )
    {
      if( editElement.objType == "CSample" )
        genEditSampleHTML();
      else if( editElement.objType == "CChord" )
      {
        // Clicked a synth in the config, but we actually edit the synth in the Library
        editElement = chordFromName( editElement.elementName );
        if( editElement )
          genEditChordHTML();
      }
    }
  }

  genElementConfigHTML(); // need to indicate the cursor location
}

/////////////// /////////////// /////////////// ///////////////
function chordClick( synthIndex )
{
  if( editMode )
  {
    saveEdits();
    editElement = chordLibrary[ synthIndex ];
    genEditChordHTML();
  }
  else
  {
    // add to Clipboard
    var synth = new CChord( chordLibrary[ synthIndex ].elementName );
    curConfig.groups[ curConfig.groups.length - 1 ].elements.push( synth ); 
    genElementConfigHTML();
  }
}

/////////////// /////////////// /////////////// ///////////////
function libSampleClick( songId )
{
  // add to Clipboard
  var sample = new CSample( sampleLibrary[ songId ].filename );
  curConfig.groups[ curConfig.groups.length - 1 ].elements.push( sample ); 
  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function groupAdd()
{
  if( curConfig.groups.length < MAX_GROUPS )
  {
    curConfig.groups.splice( curConfig.groups.length - 1, 0, new CGroup( "Group" ) );
    configEditedFlag = true;
    genElementConfigHTML();
  }
  else
    alert( "Max Groups reached" );
}

function chordAdd()
{
  chordLibrary.push( new CLibChord( "New" ) );
  chordEditedFlag = true;
  document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );

  genChordLibraryHTML();
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

  if( ( cursorGroup != undefined ) && ( cursorElement != undefined ) )
  {
    if( action == "START" )
    {
      var ce = curConfig.groups[ cursorGroup ].elements[ cursorElement ];
      ce.group = cursorGroup;

      playElemAudio( ce );

      if( curConfig.groups[ cursorGroup ].sequence )
        moveCursor( "RIGHT" );
    }
    else if( action == "STOP" )
      releaseAudio();

    genElementConfigHTML();
  }
}

var editMode = false;

function toggleEdit()
{
  if( editMode )
    saveEdits();

  editElement = undefined; 
  editMode = !editMode;

  var b = document.getElementById( 'editButton' );
  editMode ? b.classList.add( 'css_highlight_red' ) : b.classList.remove( 'css_highlight_red' );

  document.getElementById( 'multiuse' ).innerHTML = "";
}

function changeURL()
{
  serverURL = document.getElementById( 'serverURL' ).value;
}

// A key on the generated keyboard was pressed.
function keyboardPressed( note )
{
  var pressed = ( ( 1 << note ) & editElement.notes );
  var elem = document.getElementById( 'keyboardKey_' + note );

  if( pressed )
  {
    editElement.notes &= ~( 1 << note ); // clear
    elem.classList.remove( 'css_pressedKey' );
  }
  else
  {
    editElement.notes |= ( 1 << note );
    elem.classList.add( 'css_pressedKey' );
  }
}

var arpeggiatorFlag = false;

function arpeggiatorTog()
{
  arpeggiatorFlag = 1 - arpeggiatorFlag;

  var elem = document.getElementById( 'fsB2Hold' );
  if( arpeggiatorFlag )
  {
    elem.innerHTML = "~Arp";
    sampElem = curConfig.groups[ cursorGroup ].elements[ cursorElement ];
    sampElem.group = cursorGroup; // tbd, this should be set earlier.
    doArpeggio( sampElem );
  }
  else
  {
    // stopArpeggio(); this does a hard stop. Clearing arpeggiatorFlag will make it stop after the current arp.
    elem.innerHTML = "Arp";
  }
}