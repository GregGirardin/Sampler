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
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      curConfig.groups[ curConfig.groups.length - 1 ].elements = [];
  }

  configEditedFlag = true;

  getSampleAudio();// get any new audio dragged in from the library.
  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setSampleConfigName()
{
  var name = prompt( "Enter Config Name:", curConfig.name );
  if( name )
  {
    curConfig.name = name;
    configEditedFlag = true;
    document.getElementById( 'sampleListName' ).innerHTML = name;
  }
}

/////////////// /////////////// /////////////// ///////////////
function groupClick( groupIndex )
{
  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    editElement = curConfig.groups[ groupIndex ];

    var tmpHtml = "<hr>";
    tmpHtml += "Name: <input contenteditable='true' id='editGroupName' value='" + editElement.elementName + "'><br>";
    tmpHtml += "Sequence:<select id='editGroupSequence'>";

    for( var i = 0;i < seqTypes.length;i++ )
    {
      tmpHtml += "<option value='" + seqTypes[ i ] + "' ";
      if( editElement.seqType == seqTypes[ i ] )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + seqTypes[ i ] + "</option>";
    }
    tmpHtml += "</select><br>";

    document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
  }
}

/////////////// /////////////// ///////////////
function elemClick( groupIndex, sampleIndex )
{
  if( ( cursorGroup != groupIndex ) && ( cursorElement != sampleIndex ) )
    didNavFlag = true;

  cursorGroup = groupIndex;
  cursorElement = sampleIndex;

  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    var i;
    var tmpHtml = "<hr>";

    editElement = curConfig.groups[ groupIndex ].elements[ sampleIndex ];

    if( editElement.objType == "CSample" )
    {
      tmpHtml += "Display Name: <input contenteditable='true' id='editSampleName' value='" + editElement.elementName + "'><br>";
      tmpHtml += "File: " + editElement.filename + "<br>";
      tmpHtml += "Volume: <input type='range' id='editSampleVolume' min='0' max='100' value='" + editElement.volume + "'><br>";
      tmpHtml += "Fade In: <input type='range' id='editSampleFIT' min='0' max='5000' value='" + editElement.fadeInTime + "'><br>";
      tmpHtml += "Fade Out: <input type='range' id='editSampleFOT' min='0' max='5000' value='" + editElement.fadeOutTime + "'><br>";
      var duration = "?";
      if( editElement.audioFile )
        duration = ( editElement.audioFile.duration * 1000 ).toString().split( '.' )[ 0 ] + "ms";
      tmpHtml += "Audio Length: " + duration + "<br>";
      tmpHtml += "Play:<select id='editSamplePT'>";

      for( i = 0;i < loopTypes.length;i++ )
      {
        tmpHtml += "<option value='" + loopTypes[ i ] + "' ";
        if( editElement.loopType == loopTypes[ i ] )
          tmpHtml += "selected='selected'";
        tmpHtml += ">" + loopTypes[ i ] + "</option>";
      }
      tmpHtml += "</select><br>";

      document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
    }
    else if( editElement.objType == "CSynth" )
    {
      document.getElementById( 'multiuse' ).innerHTML = "TBD: Edit in Synth Library";
      editElement = undefined;
    }
    else
      editElement = undefined;
  }
  genElementConfigHTML(); // need to indicate the cursor location
}

/////////////// /////////////// ///////////////
function synthClick( synthIndex )
{
  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    editElement = synthLibrary[ synthIndex ];
  
    var tmpHtml = "<hr>Name: <input contenteditable='true' id='editSynthName' value='" + editElement.elementName + "'><br>";

    tmpHtml += "Octave:<select id='editSynthOctave'>";
    for( i = -3;i <= 3;i++ )
    {
      tmpHtml += "<option value='" + i + "' ";
      if( editElement.octave == i )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + i + "</option>";
    }
    tmpHtml += "</select><br>";

    tmpHtml += "Instrument:<select id='editSynthInstrument'>";
    for( i = 0;i < synthTypes.length;i++ )
    {
      tmpHtml += "<option value='" + synthTypes[ i ] + "' ";
      if( editElement.instrument == synthTypes[ i ] )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + synthTypes[ i ] + "</option>";
    }
    tmpHtml += "</select><br>";

    tmpHtml += "<div class='css_keyboard' id='keyboard_id'><br>";
    document.getElementById( 'multiuse' ).innerHTML = tmpHtml;

    drawKeyboard();
  }
  else
  {
    // tbd, add this synth to clipboard
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
        editElement.volume = document.getElementById( "editSampleVolume" ).value; 
        editElement.fadeInTime = document.getElementById( "editSampleFIT" ).value; 
        editElement.fadeOutTime = document.getElementById( "editSampleFOT" ).value; 
        editElement.loopType = document.getElementById( "editSamplePT" ).value;
        configEditedFlag = true;
        break;
    
      case "CGroup":
        editElement.elementName = document.getElementById( "editGroupName" ).value;
        editElement.seqType = document.getElementById( "editGroupSequence" ).value;
        configEditedFlag = true;
        break;

      case "CLibSynth":
        editElement.elementName = document.getElementById( "editSynthName" ).value;
        editElement.instrument = document.getElementById( "editSynthInstrument" ).value;
        editElement.octave = document.getElementById( "editSynthOctave" ).value;
        editElement.duration = document.getElementById( "editSynthDuration" ).value;
        editElement.delaySend = document.getElementById( "editSynthDelay" ).value;
        editElement.reverbSend = document.getElementById( "editSynthReverb" ).value;
        synthEditedFlag = true;
        break;
    }

  editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
  genSynthLibraryHTML();
}

///////////////////////// ///////////////////////// /////////////////////////
function changeMode( mode )
{
  // We were editing a library file. Save the changes.
  if( operationMode == "Mode_Edit" )
    saveEdits();
  operationMode = ( mode == operationMode ) ? "Mode_Default" : mode;

  // var buttons = document.getElementsByClassName( 'css_modeButton' );
  // for( var i = 0;i < buttons.length;i++ )
  //   buttons[ i ].classList.remove( 'css_highlight_red' );

  if( operationMode == "Mode_Edit" )
    document.getElementById( 'modeEditButton' ).classList.add( 'css_highlight_red' );
  else
    document.getElementById( 'modeEditButton' ).classList.remove( 'css_highlight_red' );

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
      ce.playing = true;
      if( ce.objType == "CSample" )
      {
        var af = ce.audioFile;
        if( af )
        {
          af.currentTime = 0; // Start from the beginning
          af.loop = ( ce.loopType == "Once" ) ? false : true;
          if( ce.loopType == "Once" )
            af.onended = playEndedCB;

          af.sampleObj = ce;
          af.play();
        }
        else
        {
          console.log( "Audio not loaded:", ce.elementName );
          ce.playing = false;
        }
      }
      else if( ce.objType == "CSynth" )
      {
        // find the library synth
        for( var synthIx = 0;synthIx < synthLibrary.length;synthIx++ )
          if( synthLibrary[ synthIx ].elementName == ce.elementName )
          {
            playSynth( synthLibrary[ synthIx ] );
            break;
          }
      }
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

function togglePlayMode()
{
  var elem = document.getElementById( 'fsBBHold' );

  if( fsMode == "PM" )
  {
    fsMode = "DM"; // direct mode
    elem.innerHTML = "Direct";
  }
  else
  {
    fsMode = "PM"; // play mode
    elem.innerHTML = "Play";
  }
}

function changeURL()
{
  serverURL = document.getElementById( 'serverURL' ).value;
}