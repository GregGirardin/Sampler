// Functions that generation HTML content.

/////////////// /////////////// /////////////// ///////////////
function genElementConfigHTML()
{
  var l = curConfig.groups.length;
  if( l == 1 && !l )
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

  var tempHtml = ""; // "<div id='sampleListName' onClick='setSampleConfigName()'>" + curConfig.name + "</div><br>";

  for( var i = 0;i < curConfig.groups.length;i++ )
  {
    var g = curConfig.groups[ i ];
    var classes = 'css_groupClass';

    switch( g.seqMode )
    {
      case "None": break;
      case "Manual": classes += ' css_groupSeqMan'; break;
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
      
      if( g.elements[ j ].objType == "CChordRef" ) // make sure there's an instrument
      {
        if( g.elements[ j ].instrument == "None" && g.instrument == "None" )
          classes += ' css_noInstrument';
        
        classes += " css_Chord";
      }

      if( g.elements[ j ].objType == "CSample" )
        classes += " css_Sample";
      
      if( g.elements[ j ].objType == "CGroupRef" )
        classes += " css_Group";
      
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

  if( configEditedFlag || chordEditedFlag )
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
  t.sort( function( a, b ){ return ( a.displayName > b.displayName ) ? 1 : -1 } );

  if( !t.length )
    tmpHtml += "<h2>No Sample Library.</h2>";
  else
    for( var i = 0;i < t.length;i++ )
      tmpHtml += "<button id='libSample." + t[ i ].displayName +
                 "' class='css_librarySample' draggable='true' ondragstart='dragElem( event )'" + 
                  "onclick='libSampleClick( \"" + t[ i ].displayName + "\")'>" + t[ i ].displayName + "</button>\n";

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

function genChordLibraryHTML()
{
  var tempHtml = "<hr>";

  for( var i = 0;i < chordLibrary.length;i++ )
    tempHtml += "<button id='libChord." + i + "' class='css_chord' onclick='chordClick( " + i + " )'" +
                " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                chordLibrary[ i ].elementName + "</button>\n";

  tempHtml += "<button onclick='chordAdd()' class='css_chord'> + </button>\n<br>\n<br>";

  document.getElementById( 'chordDiv' ).innerHTML = tempHtml;
}

function genEditGroupRefHTML()
{
  var groupNames = [];
  for( var i = 0;i < curConfig.groups.length - 1;i++ )
    groupNames.push( curConfig.groups[ i ].elementName );

  var tmpHtml = "<hr>";
  tmpHtml += "Group:<select id='editGroupRefGroup'>";

  for( i = 0;i < groupNames.length;i++ )
  {
    tmpHtml += "<option value='" + groupNames[ i ] + "' ";
    if( editElement.elementName == groupNames[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + groupNames[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var checked = editElement.loopFlag ? "checked" : "";
  tmpHtml += "Loop: <input type='checkbox' id='editGroupRefLoopFlag' " + checked + "><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}
/////////////// /////////////// ///////////////
/////////////// /////////////// ///////////////
function genEditGroupHTML()
{
  var tmpHtml = "<hr>";
  tmpHtml += "Name: <input contenteditable='true' id='editGroupName' value='" + editElement.elementName + "'><br>";

  tmpHtml += "Instrument:<select id='editGroupInstrument'>";

  for( i = 0;i < synthTypes.length;i++ )
  {
    tmpHtml += "<option value='" + synthTypes[ i ] + "' ";
    if( editElement.instrument == synthTypes[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + synthTypes[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var tempoBPM = Math.round( 60000 / editElement.tempoMs );

  tmpHtml += "Tempo: <input type='number' id='editGroupTempoBPM' min='20' max='300' value='" + tempoBPM + "'><br>";

  tmpHtml += "Sequence Mode:";

  for( i = 0;i < seqModes.length;i++ )
    tmpHtml += "<input type='radio' id='editGroupSequenceMode" + i + "' name='sequenceType'" +
               ( editElement.seqMode == seqModes[ i ] ? "checked" : "") + ">" + seqModes[ i ];

  var checked = editElement.thickenFlag ? "checked" : "";
  tmpHtml += "<br>Fat: <input type='checkbox' id='editGroupThickenFlag' " + checked + "><br>";

  tmpHtml += "Envelope:<select id='editGroupEnvelope'>";
  for( i = 0;i < envelopeLabels.length;i++ )
  {
    tmpHtml += "<option value='" + envelopeLabels[ i ] + "' ";
    if( editElement.envelope == envelopeLabels[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + envelopeLabels[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Arp Sequence:<select id='editGroupArpSequence'>";
  for( i = 0;i < arpSequences.length;i++ )
  {
    tmpHtml += "<option value='" + arpSequences[ i ] + "' ";
    if( editElement.arpSequence == arpSequences[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + arpSequences[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var checked = editElement.arpFlag ? "checked" : "";
  tmpHtml += "<br>Arp: <input type='checkbox' id='editGroupArpFlag' " + checked + "><br>";

  tmpHtml += "Arp Notes/b:<select id='editGroupArpNPB'>";
  for( i = 0;i < arpNPBs.length;i++ )
  {
    tmpHtml += "<option value='" + arpNPBs[ i ] + "' ";
    if( editElement.arpNPB == arpNPBs[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + arpNPBs[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Master: <input type='range' id='editGroupMasterLevel' min='0' max='100' value='" + editElement.masterLevel + "'><br>";
  tmpHtml += "Chorus: <input type='range' id='editGroupChorusLevel' min='0' max='100' value='" + editElement.chorusLevel + "'><br>";
  tmpHtml += "Phaser: <input type='range' id='editGroupPhaserLevel' min='0' max='100' value='" + editElement.phaserLevel + "'><br>";
  tmpHtml += "Tremolo: <input type='range' id='editGroupTremoloLevel' min='0' max='100' value='" + editElement.tremoloLevel + "'><br>";
  tmpHtml += "Dist: <input type='range' id='editGroupDistortionLevel' min='0' max='100' value='" + editElement.distortionLevel + "'><br>";
  tmpHtml += "Dry: <input type='range' id='editGroupDryLevel' min='0' max='100' value='" + editElement.dryLevel + "'><br>";
  tmpHtml += "Delay: <input type='range' id='editGroupDelayLevel' min='0' max='100' value='" + editElement.delayLevel + "'><br>";
  tmpHtml += "Reverb: <input type='range' id='editGroupReverbLevel' min='0' max='100' value='" + editElement.reverbLevel + "'><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function genEditSampleHTML()
{
  var tmpHtml = "<hr>";

  tmpHtml += "Display Name: <input id='editSampleName' contenteditable='true' value='" + editElement.elementName + "'><br>";
  tmpHtml += "File: " + editElement.filename + "<br>";
  var checked = editElement.loopFlag ? "checked" : "";
  tmpHtml += "Loop: <input type='checkbox' id='editSampleLoopFlag' " + checked + "><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function genEditChordRefHTML()
{
  var tmpHtml = "Instrument:<select id='editChordRefInstrument'>";

  for( i = 0;i < synthTypes.length;i++ )
  {
    tmpHtml += "<option value='" + synthTypes[ i ] + "' ";
    if( editElement.instrument == synthTypes[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + synthTypes[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Play beats:<select id='editChordRefBeats'>";

  for( i = 0;i < loopCount.length;i++ )
  {
    tmpHtml += "<option value='" + loopCount[ i ] + "' ";
    if( editElement.playBeats == loopCount[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + loopCount[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function genEditChordHTML()
{
  var tmpHtml = "<hr>Name: <input contenteditable='true' id='editChordName' value='" + editElement.elementName + "'><br>";

  tmpHtml += "Octave:<select id='editChordOctave'>";
  for( i = 3;i >= -3;i-- )
  {
    tmpHtml += "<option value='" + i + "' ";
    if( editElement.octave == i )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + i + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "<div class='css_keyboard'><br>";

  const noteNames = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
  const blackKeys = [         1,         3,              6,         8,        10 ];

  // Two octave keyboard
  for( var note = 0;note < 32;note++ )
  {
    var css_class = ( blackKeys.includes( note % 12 ) ) ? 'css_blackKey' : 'css_whiteKey';

    if( ( 1 << note ) & editElement.notes )
      css_class += ' css_pressedKey';

    tmpHtml += "<button id='keyboardKey_" + note + "' class='" + css_class +
               "' onclick='keyboardPressed( " + note + " );'>" + noteNames[ note % 12 ] + "</button>";
  }
  tmpHtml += "<br><br></div>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function saveEdits()
{
  if( editElement )
    switch( editElement.objType )
    {
      case "CSample":
        editElement.elementName = document.getElementById( "editSampleName" ).value; 
        editElement.loopFlag    = document.getElementById( "editSampleLoopFlag" ).checked;
        configEditedFlag = true;
        break;
    
      case "CGroup":
        editElement.elementName = document.getElementById( "editGroupName" ).value;
        editElement.instrument  = document.getElementById( "editGroupInstrument" ).value;
        editElement.thickenFlag = document.getElementById( "editGroupThickenFlag" ).checked;
        editElement.tempoMs = 60000 / parseInt( document.getElementById( "editGroupTempoBPM" ).value );

        for( var i = 0;i < seqModes.length;i++ )
        {
          var str = "editGroupSequenceMode" + i;
          if( document.getElementById( str ).checked )
          {
            editElement.seqMode = seqModes[ i ];
            break;
          }
        }

        editElement.envelope        = document.getElementById( "editGroupEnvelope" ).value;
        editElement.arpFlag         = document.getElementById( "editGroupArpFlag" ).checked;
        editElement.arpNPB          = parseInt( document.getElementById( "editGroupArpNPB" ).value );
        editElement.arpSequence     = document.getElementById( "editGroupArpSequence" ).value;
        editElement.masterLevel     = parseInt( document.getElementById( "editGroupMasterLevel" ).value );
        editElement.distortionLevel = parseInt( document.getElementById( "editGroupDistortionLevel" ).value );
        editElement.chorusLevel     = parseInt( document.getElementById( "editGroupChorusLevel" ).value );
        editElement.phaserLevel     = parseInt( document.getElementById( "editGroupPhaserLevel" ).value );
        editElement.tremoloLevel    = parseInt( document.getElementById( "editGroupTremoloLevel" ).value );
        editElement.dryLevel        = parseInt( document.getElementById( "editGroupDryLevel" ).value );
        editElement.delayLevel      = parseInt( document.getElementById( "editGroupDelayLevel" ).value );
        editElement.reverbLevel     = parseInt( document.getElementById( "editGroupReverbLevel" ).value );
        configEditedFlag = true;
        break;

      case "CChordRef":
        editElement.instrument = document.getElementById( "editChordRefInstrument" ).value;
        editElement.playBeats = parseInt( document.getElementById( "editChordRefBeats" ).value );

        configEditedFlag = true;
        break;

      case "CLibChord":
        editElement.elementName   = document.getElementById( "editChordName" ).value;
        editElement.octave        = parseInt( document.getElementById( "editChordOctave" ).value );
        chordEditedFlag = true;
        break;
      
      case "CGroupRef":
        editElement.elementName = document.getElementById( "editGroupRefGroup" ).value;
        editElement.loopFlag    = document.getElementById( "editGroupRefLoopFlag" ).checked;
        configEditedFlag = true;
        break;
    }

  editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
  genChordLibraryHTML();
}