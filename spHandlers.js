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
  const libSynthID = "libSynth.";

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
  else if( ( dragElem.substring( 0, libSynthID.length ) == libSynthID ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping Synth into config 
  {
    var sampIx = dragElem.substring( libSynthID.length, );
    var libSynth = synthLibrary[ sampIx ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, new CSynth( libSynth.elementName ) );
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
    else if( dragElem.substring( 0, libSynthID.length ) == libSynthID )
    {
      var delSynth = parseInt( dragElem.substring( libSynthID.length, ) );
      synthLibrary.splice( delSynth, 1 );
    }
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      curConfig.groups[ curConfig.groups.length - 1 ].elements = [];
  }

  configEditedFlag = true;

  genElementConfigHTML();
  genSynthLibraryHTML();
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
  if( ( cursorGroup != groupIndex ) && ( cursorElement != sampleIndex ) )
    didNavFlag = true;

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
      else
        editElement = undefined;

    }
  }

  genElementConfigHTML(); // need to indicate the cursor location
}

/////////////// /////////////// /////////////// ///////////////
function synthClick( synthIndex )
{
  if( editMode )
  {
    saveEdits();
    editElement = synthLibrary[ synthIndex ];
    genEditSynthHTML();
  }
}

/////////////// /////////////// /////////////// ///////////////
function libSampleClick( songId )
{
  // add to Clipboard
  sample = new CSample( sampleLibrary[ songId ].filename );
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

function saveEdits()
{
  if( editElement )
    switch( editElement.objType )
    {
      case "CSample":
        editElement.elementName = document.getElementById( "editSampleName" ).value; 
        editElement.masterLevel = document.getElementById( "editSampleMasterLevel" ).value; 
        editElement.dryLevel = document.getElementById( "editSampleDryLevel" ).value; 
        editElement.delayLevel = document.getElementById( "editSampleDelayLevel" ).value; 
        editElement.reverbLevel = document.getElementById( "editSampleReverbLevel" ).value; 
        editElement.fadeInTime = document.getElementById( "editSampleFIT" ).value; 
        editElement.fadeOutTime = document.getElementById( "editSampleFOT" ).value; 
        editElement.loopType = document.getElementById( "editSamplePT" ).value;
        configEditedFlag = true;
        break;
    
      case "CGroup":
        editElement.elementName = document.getElementById( "editGroupName" ).value;
        editElement.instrument = document.getElementById( "editGroupInstrument" ).value;
        editElement.seqType = document.getElementById( "editGroupSequence" ).value;
        configEditedFlag = true;
        break;

      case "CLibSynth":
        editElement.elementName = document.getElementById( "editSynthName" ).value;
        editElement.instrument = document.getElementById( "editSynthInstrument" ).value;
        editElement.masterLevel = document.getElementById( "editSynthMasterLevel" ).value;
        editElement.dryLevel = document.getElementById( "editSynthDryLevel" ).value;
        editElement.delayLevel = document.getElementById( "editSynthDelayLevel" ).value;
        editElement.reverbLevel = document.getElementById( "editSynthReverbLevel" ).value;
        editElement.octave = document.getElementById( "editSynthOctave" ).value;

        synthEditedFlag = true;
        break;
    }

  editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
  genSynthLibraryHTML();
}

function synthAdd()
{
  synthLibrary.push( new CLibSynth( "New" ) );
  synthEditedFlag = true;
  document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );

  genSynthLibraryHTML();
}

function playElement( status )
{
  if( ( cursorGroup != undefined ) && ( cursorElement != undefined ) )
  {
    var ce = curConfig.groups[ cursorGroup ].elements[ cursorElement ];
    var seqType = curConfig.groups[ cursorGroup ].seqType;

    stopAllAudio();

    if( status == "START" )
    {
      ce.id = "slElement." + cursorGroup + "." + cursorElement;
      ce.playNext = ( seqType == seqTypes[ 2 ] ) ? true : false;

      document.getElementById( ce.id ).classList.add( 'css_playing' );

      if( ce.objType == "CSample" )
        playSample( ce );
      else if( ce.objType == "CSynth" )
      {
        var synth = synthFromName( ce.elementName );
        var inst = synth.instrument;
        if( inst == "None" )
          inst = curConfig.groups[ cursorGroup ].instrument; // use the Group's instrument.

        playSynth( inst );
      }
      ce.playing = true;

      if( seqType != seqTypes[ 0 ] )
      {
        moveCursor( "RIGHT" );
        didNavFlag = false;
      }
    }
    else
    {
      // tbd. We may want to play multiple sources at the same time.
      // if( seqType == seqTypes[ 0 ] )
      //   stopAudio( ce );
      // else
      ce.playing = false;
    }
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
  if( editMode )
    b.classList.add( 'css_highlight_red' );
  else
    b.classList.remove( 'css_highlight_red' );

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