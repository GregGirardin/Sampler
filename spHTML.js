// Functions that generation HTML content.

const seqTypes = [ "None", "Next" ];

/////////////// /////////////// /////////////// ///////////////
function genElementConfigHTML()
{
  var l = curConfig.groups.length;
  if( l == 1 )
    cursorGroup = undefined;
  else
  {
    if( cursorGroup == undefined )
      cursorGroup = 0;
    if( cursorGroup >= l - 1 )
      cursorGroup = l - 2;
    l = curConfig.groups[ cursorGroup ].elements.length;
    if( cursorElement >= l )
      cursorElement = l - 1;
    else if( ( cursorElement < 0 ) && ( l > 0 ) )
      cursorElement = 0;
  }

  var tempHtml = "<div id='sampleListName' onClick='setSampleConfigName()'>" + curConfig.name + "</div><br>";

  for( var i = 0;i < curConfig.groups.length;i++ )
  {
    var g = curConfig.groups[ i ];
    var classes = 'css_groupClass';

    switch( g.seqType )
    {
      case "Single": break;
      case "Next": classes += ' css_groupSeqNext'; break;
      case "Cont": classes += ' css_groupSeqCont'; break;
    }

    if( i == curConfig.groups.length - 1 )
      tempHtml += "<button id='clipboard' class='css_Clipboard' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'> Clipboard </button>\n";
    else
      tempHtml += "<button id='slGroup." + i + "' class='" + classes + "' onclick='groupClick( " + i + " )' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>" + g.elementName + "</button>\n";

    for( var j = 0;j < g.elements.length;j++ )
    {
      var classes = 'css_slElement';

      if( g.elements[ j ].playing )
        classes += ' css_playing';
      
      if( g.elements[ j ].objType == "CSynth" ) // make sure there's an instrument
      {
        var libSynth = synthFromName( g.elements[ j ].elementName ); // if this is a synth and is in the library.
        if( !libSynth || (libSynth.instrument == "None" && g.instrument == "None" ) )
          classes += ' css_noInstrument';
      }

      tempHtml += "<button id='slElement." + i + "." + j + "' class='" + classes + "' onclick='elemClick( " + i + ", " + j + " )'" +
                  " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                  g.elements[ j ].elementName + "</button>\n";
    }
    tempHtml += "<button id='slElement." + i + "." + j + "' class='css_slElement' onclick='elemClick( " + i + ", " + j + " )'" +
                "  ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>&nbsp+&nbsp</button>\n";

    if( g.elements.length )
      tempHtml += "<font size='1'>" + g.elements.length + "</font>";
    tempHtml += "<br>\n";
  }

  tempHtml += "<br><button onclick='groupAdd()'> Add Group </button>\n<br>\n<br>";
  tempHtml += "<input id='trashCan' type='image' ondragover='sl_allowDrop( event )' ondrop='dropElem( event )' src='https://greggirardin.github.io/trashcan.png'/>\n";

  document.getElementById( 'audioElements' ).innerHTML = tempHtml;

  if( configEditedFlag || synthEditedFlag )
    document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );
  else
    document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  var elem;
  if( cursorGroup >= 0 && cursorElement >= 0 )
    elem = document.getElementById( 'slElement.' + cursorGroup + '.' + cursorElement );
  else if( cursorGroup )
    elem = document.getElementById( 'slGroup.' + cursorGroup );
  if( elem )
    elem.classList.add( 'css_cursor' );
}

/////////////// /////////////// /////////////// ///////////////
// generate the "Sample Library".
// 1) list of samples from the library that can be dragged into the set list 
// 2) A library song we're editing.
/////////////// /////////////// /////////////// ///////////////
function generateLibraryHTML()
{
  var tmpHtml = "";
  var t = []; // Array for sorting.

  for( const[ key, value ] of Object.entries( sampleLibrary ) )
    t.push( value );
  t.sort( function( a, b ){ return ( a.filename > b.filename ) ? 1 : -1 } );

  if( !t.length )
    tmpHtml += "<h2>No Sample Library.</h2>";
  else
    for( var i = 0;i < t.length;i++ )
      tmpHtml += "<button id='libSample." + t[ i ].filename +
                 "' class='css_librarySample' draggable='true' ondragstart='dragElem( event )'" + 
                  "onclick='libSampleClick( \"" + t[ i ].filename + "\")'>" + t[ i ].filename + "</button>\n";

  document.getElementById( 'libraryDiv' ).innerHTML = tmpHtml;
}

/////////////// /////////////// /////////////// ///////////////
// This are just a couple big string literals for the generated output setlist html.
// Put here to make the export function more readable
/////////////// /////////////// /////////////// ///////////////
function htmlConstStrings( index )
{
  switch( index )
  {
    case 0:
      return( function(){/* 
<h2> Sample Player Creator </h2>
Create a new Sample List with 'New'. Add Groups with 'Add Group'. Click on names to rename.<br>
<br>
Drag samples from the Library in the right pane to the desired location. Samples and groups can be rearranged
by dragging. Delete things by dragging to the Trash.<br>
<br>
A library can be specified by appending "?library=http://x.y.z/???.json" to this URL.
    
*/}.toString().slice( 14, -3 ) + "</" + "script> </" + "body> </html>" ); // little hack because certain tags confuse the browser.
    break;
  }

  return undefined;
}

function genSynthLibraryHTML()
{
  var tempHtml = "<hr>";

  for( var i = 0;i < synthLibrary.length;i++ )
    tempHtml += "<button id='libSynth." + i + "' class='css_synth'  onclick='synthClick( " + i + " )'" +
                " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                synthLibrary[ i ].elementName + "</button>\n";

  tempHtml += "<button onclick='synthAdd()' class='css_synth'> + </button>\n<br>\n<br>";

  document.getElementById( 'synthDiv' ).innerHTML = tempHtml;
}

/////////////// /////////////// ///////////////
/////////////// /////////////// ///////////////
function genEditGroupHTML()
{
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

  tmpHtml += "Instrument:<select id='editGroupInstrument'>";
  for( i = 0;i < synthTypes.length;i++ )
  {
    tmpHtml += "<option value='" + synthTypes[ i ] + "' ";
    if( editElement.instrument == synthTypes[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + synthTypes[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

function genEditSampleHTML()
{
  var tmpHtml = "<hr>";

  tmpHtml += "Display Name: <input contenteditable='true' id='editSampleName' value='" + editElement.elementName + "'><br>";
  tmpHtml += "File: " + editElement.filename + "<br>";
  tmpHtml += "Master: <input type='range' id='editSampleMasterLevel' min='0' max='100' value='" + editElement.masterLevel + "'><br>";
  tmpHtml += "Dry: <input type='range' id='editSampleDryLevel' min='0' max='100' value='" + editElement.dryLevel + "'><br>";
  tmpHtml += "Delay: <input type='range' id='editSampleDelayLevel' min='0' max='100' value='" + editElement.delayLevel + "'><br>";
  tmpHtml += "Reverb: <input type='range' id='editSampleReverbLevel' min='0' max='100' value='" + editElement.reverbLevel + "'><br>";
  tmpHtml += "Fade In: <input type='range' id='editSampleFIT' min='0' max='5000' value='" + editElement.fadeInTime + "'><br>";
  tmpHtml += "Fade Out: <input type='range' id='editSampleFOT' min='0' max='5000' value='" + editElement.fadeOutTime + "'><br>";
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

// for editing a Synth.
function genEditSynthHTML()
{
  var tmpHtml = "<hr>Name: <input contenteditable='true' id='editSynthName' value='" + editElement.elementName + "'><br>";

  tmpHtml += "Octave:<select id='editSynthOctave'>";
  for( i = 3;i >= -3;i-- )
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

  tmpHtml += "Master: <input type='range' id='editSynthMasterLevel' min='0' max='100' value='" + editElement.masterLevel + "'><br>";
  tmpHtml += "Dry: <input type='range' id='editSynthDryLevel' min='0' max='100' value='" + editElement.dryLevel + "'><br>";
  tmpHtml += "Delay: <input type='range' id='editSynthDelayLevel' min='0' max='100' value='" + editElement.delayLevel + "'><br>";
  tmpHtml += "Reverb: <input type='range' id='editSynthReverbLevel' min='0' max='100' value='" + editElement.reverbLevel + "'><br>";
  tmpHtml += "<div class='css_keyboard'><br>";

  //document.getElementById( 'multiuse' ).innerHTML = tmpHtml;

  const noteNames = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
  const blackKeys = [         1,         3,              6,         8,        10 ];
  // Two octave keyboard

  for( var note = 0;note < 32;note++ )
  {
    var css_class = ( blackKeys.includes( note % 12 ) ) ? 'css_blackKey' : 'css_whiteKey';

    if( ( 1 << note ) & editElement.notes )
      css_class += ' css_pressedKey';

    tmpHtml += "<button id='keyboardKey_" + note + "' class='" + css_class + "' onclick='keyboardPressed( " + note + " );'>" + noteNames[ note % 12 ] + "</button>";
  }
  tmpHtml += "<br><br></div>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

function configFX()
{
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