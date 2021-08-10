// Functions that generation HTML content.

/////////////// /////////////// /////////////// ///////////////
function genElementConfigHTML()
{
  var l = globals.cfg.groups.length;
  if( l == 1 && !l )
    globals.cursor.cg = undefined;
  else
  {
    if( globals.cursor.cg == undefined )
      globals.cursor.cg = 0;
    if( globals.cursor.cg >= l - 1 )
      globals.cursor.cg = l - 2;

    l = globals.cfg.groups[ globals.cursor.cg ].elements.length;
    if( globals.cursor.ce >= l )
      globals.cursor.ce = l - 1;
    else if( ( globals.cursor.ce < 0 ) && ( l > 0 ) )
      globals.cursor.ce = 0;
  }

  var tempHtml = ""; // "<div id='sampleListName' onClick='setSampleConfigName()'>" + globals.cfg.name + "</div><br>";

  for( var i = 0;i < globals.cfg.groups.length;i++ )
  {
    var g = globals.cfg.groups[ i ];
    var classes = 'css_groupClass';

    switch( g.seqMode )
    {
      case "None": break;
      case "Manual": classes += ' css_groupSeqMan'; break;
      case "Cont": classes += ' css_groupSeqCont'; break;
    }

    if( i == globals.cfg.groups.length - 1 )
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
    tempHtml += "<button id='slElement." + i + "." + j + "' class='css_slElement' onclick='addToGroup( " + i + " )'" +
                "  ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>&nbsp+&nbsp</button>\n";

    if( g.elements.length )
      tempHtml += "<font size='1'>" + g.elements.length + "</font>";
    tempHtml += "<br>\n";
  }

  tempHtml += "<br><button onclick='groupAdd()'> Add Group </button>\n<br>\n<br>";
  tempHtml += "<input id='trashCan' type='image' ondragover='sl_allowDrop( event )' ondrop='dropElem( event )' src='https://greggirardin.github.io/trashcan.png'/>\n";

  document.getElementById( 'audioElements' ).innerHTML = tempHtml;

  if( globals.configEditedFlag || globals.chordEditedFlag )
    document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );
  else
    document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  var elem;
  if( globals.cursor.cg >= 0 && globals.cursor.ce >= 0 )
    elem = document.getElementById( 'slElement.' + globals.cursor.cg + '.' + globals.cursor.ce );
  else if( globals.cursor.cg )
    elem = document.getElementById( 'slGroup.' + globals.cursor.cg );
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

  for( const[ key, value ] of Object.entries( globals.sampleLibrary ) )
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

function genEditGroupRefHTML()
{
  var groupNames = [];
  for( var i = 0;i < globals.cfg.groups.length - 1;i++ )
    groupNames.push( globals.cfg.groups[ i ].elementName );

  var tmpHtml = "<hr>";
  tmpHtml += "Group:<select id='editGroupRefGroup'>";

  for( i = 0;i < groupNames.length;i++ )
  {
    tmpHtml += "<option value='" + groupNames[ i ] + "' ";
    if( globals.editElement.elementName == groupNames[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + groupNames[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var checked = globals.editElement.loopFlag ? "checked" : "";
  tmpHtml += "Loop: <input type='checkbox' id='editGroupRefLoopFlag' " + checked + "><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}
/////////////// /////////////// ///////////////
/////////////// /////////////// ///////////////
function genEditGroupHTML()
{
  var tmpHtml = "<hr>";
  tmpHtml += "Name: <input contenteditable='true' id='editGroupName' value='" + globals.editElement.elementName + "'><br>";

  tmpHtml += "Instrument:<select id='editGroupInstrument'>";

  for( i = 0;i < CGlobals.synthTypes.length;i++ )
  {
    tmpHtml += "<option value='" + CGlobals.synthTypes[ i ] + "' ";
    if( globals.editElement.instrument == CGlobals.synthTypes[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + CGlobals.synthTypes[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var tempoBPM = Math.round( 60000 / globals.editElement.tempoMs );

  tmpHtml += "Tempo: <input type='number' id='editGroupTempoBPM' min='20' max='300' value='" + tempoBPM + "'><br>";

  tmpHtml += "Sequence Mode:";

  for( i = 0;i < CGlobals.seqModes.length;i++ )
    tmpHtml += "<input type='radio' id='editGroupSequenceMode" + i + "' name='sequenceType'" +
               ( globals.editElement.seqMode == CGlobals.seqModes[ i ] ? "checked" : "") + ">" + CGlobals.seqModes[ i ];

  var checked = globals.editElement.thickenFlag ? "checked" : "";
  tmpHtml += "<br>Fat: <input type='checkbox' id='editGroupThickenFlag' " + checked + "><br>";

  tmpHtml += "Envelope:<select id='editGroupEnvelope'>";
  for( i = 0;i < CGlobals.envelopeLabels.length;i++ )
  {
    tmpHtml += "<option value='" + CGlobals.envelopeLabels[ i ] + "' ";
    if( globals.editElement.envelope == CGlobals.envelopeLabels[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + CGlobals.envelopeLabels[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Arp Sequence:<select id='editGroupArpSequence'>";
  for( i = 0;i < CGlobals.arpSequences.length;i++ )
  {
    tmpHtml += "<option value='" + CGlobals.arpSequences[ i ] + "' ";
    if( globals.editElement.arpSequence == CGlobals.arpSequences[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + CGlobals.arpSequences[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  var checked = globals.editElement.arpFlag ? "checked" : "";
  tmpHtml += "<br>Arp: <input type='checkbox' id='editGroupArpFlag' " + checked + "><br>";

  tmpHtml += "Arp Notes/b:<select id='editGroupArpNPB'>";
  for( i = 0;i < CGlobals.arpNPBs.length;i++ )
  {
    tmpHtml += "<option value='" + CGlobals.arpNPBs[ i ] + "' ";
    if( globals.editElement.arpNPB == CGlobals.arpNPBs[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + CGlobals.arpNPBs[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Master: <input type='range' id='editGroupMasterLevel' min='0' max='100' value='" + globals.editElement.masterLevel + "'><br>";
  tmpHtml += "Chorus: <input type='range' id='editGroupChorusLevel' min='0' max='100' value='" + globals.editElement.chorusLevel + "'><br>";
  tmpHtml += "Phaser: <input type='range' id='editGroupPhaserLevel' min='0' max='100' value='" + globals.editElement.phaserLevel + "'><br>";
  tmpHtml += "Tremolo: <input type='range' id='editGroupTremoloLevel' min='0' max='100' value='" + globals.editElement.tremoloLevel + "'><br>";
  tmpHtml += "Dist: <input type='range' id='editGroupDistortionLevel' min='0' max='100' value='" + globals.editElement.distortionLevel + "'><br>";
  tmpHtml += "Dry: <input type='range' id='editGroupDryLevel' min='0' max='100' value='" + globals.editElement.dryLevel + "'><br>";
  tmpHtml += "Delay: <input type='range' id='editGroupDelayLevel' min='0' max='100' value='" + globals.editElement.delayLevel + "'><br>";
  tmpHtml += "Reverb: <input type='range' id='editGroupReverbLevel' min='0' max='100' value='" + globals.editElement.reverbLevel + "'><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function genEditSampleHTML()
{
  var tmpHtml = "<hr>";

  tmpHtml += "Display Name: <input id='editSampleName' contenteditable='true' value='" + globals.editElement.elementName + "'><br>";
  tmpHtml += "File: " + globals.editElement.filename + "<br>";
  var checked = globals.editElement.loopFlag ? "checked" : "";
  tmpHtml += "Loop: <input type='checkbox' id='editSampleLoopFlag' " + checked + "><br>";

  document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
}

//////////////////////////// ////////////////////////////
function genEditChordHTML()
{
  var tmpHtml = "<hr>Name: <input contenteditable='true' id='editChordName' value='" + globals.editElement.elementName + "'><br>";

  tmpHtml += "Play beats:<select id='editChordBeats'>";

  for( i = 0;i < CGlobals.loopCount.length;i++ )
  {
    tmpHtml += "<option value='" + CGlobals.loopCount[ i ] + "' ";
    if( globals.editElement.playBeats == CGlobals.loopCount[ i ] )
      tmpHtml += "selected='selected'";
    tmpHtml += ">" + CGlobals.loopCount[ i ] + "</option>";
  }
  tmpHtml += "</select><br>";

  tmpHtml += "Octave:<select id='editChordOctave'>";
  for( i = 3;i >= -3;i-- )
  {
    tmpHtml += "<option value='" + i + "' ";
    if( globals.editElement.octave == i )
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

    if( ( 1 << note ) & globals.editElement.notes )
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
  if( globals.editElement )
    switch( globals.editElement.objType )
    {
      case "CSample":
        globals.editElement.elementName = document.getElementById( "editSampleName" ).value; 
        globals.editElement.loopFlag    = document.getElementById( "editSampleLoopFlag" ).checked;
        break;
    
      case "CGroup":
        globals.editElement.elementName = document.getElementById( "editGroupName" ).value;
        globals.editElement.instrument  = document.getElementById( "editGroupInstrument" ).value;
        globals.editElement.thickenFlag = document.getElementById( "editGroupThickenFlag" ).checked;
        globals.editElement.tempoMs = 60000 / parseInt( document.getElementById( "editGroupTempoBPM" ).value );

        for( var i = 0;i < CGlobals.seqModes.length;i++ )
        {
          var str = "editGroupSequenceMode" + i;
          if( document.getElementById( str ).checked )
          {
            globals.editElement.seqMode = CGlobals.seqModes[ i ];
            break;
          }
        }

        globals.editElement.envelope        = document.getElementById( "editGroupEnvelope" ).value;
        globals.editElement.arpFlag         = document.getElementById( "editGroupArpFlag" ).checked;
        globals.editElement.arpNPB          = parseInt( document.getElementById( "editGroupArpNPB" ).value );
        globals.editElement.arpSequence     = document.getElementById( "editGroupArpSequence" ).value;
        globals.editElement.masterLevel     = parseInt( document.getElementById( "editGroupMasterLevel" ).value );
        globals.editElement.distortionLevel = parseInt( document.getElementById( "editGroupDistortionLevel" ).value );
        globals.editElement.chorusLevel     = parseInt( document.getElementById( "editGroupChorusLevel" ).value );
        globals.editElement.phaserLevel     = parseInt( document.getElementById( "editGroupPhaserLevel" ).value );
        globals.editElement.tremoloLevel    = parseInt( document.getElementById( "editGroupTremoloLevel" ).value );
        globals.editElement.dryLevel        = parseInt( document.getElementById( "editGroupDryLevel" ).value );
        globals.editElement.delayLevel      = parseInt( document.getElementById( "editGroupDelayLevel" ).value );
        globals.editElement.reverbLevel     = parseInt( document.getElementById( "editGroupReverbLevel" ).value );
        break;

      case "CChord":
        globals.editElement.elementName   = document.getElementById( "editChordName" ).value;
        globals.editElement.playBeats     = parseInt( document.getElementById( "editChordBeats" ).value );
        globals.editElement.octave        = parseInt( document.getElementById( "editChordOctave" ).value );
        break;

      case "CGroupRef":
        globals.editElement.elementName = document.getElementById( "editGroupRefGroup" ).value;
        globals.editElement.loopFlag    = document.getElementById( "editGroupRefLoopFlag" ).checked;
        break;
    }

  globals.configEditedFlag = true;

  globals.editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
}