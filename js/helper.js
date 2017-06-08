// the global var that can be used everywhere as a "root"
if ( LI == undefined )
  var LI = {};

// to stop the busy indicator, call stop() on the returned object
LI.busyIndicator = function()
{
  var i = $('<iframe>').width(0).height(0);
  i.appendTo('body');
  i[0].contentDocument.open();
  i.stop = function(){
    i[0].contentDocument.close();
    i.remove();
  }
  return i;
}

LI.array_keys = function(obj)
{
  var r = [];
  for ( var key in obj )
    r.push(key);
  return r;
}
LI.array_values = function(obj)
{
  var r = [];
  for ( var key in obj )
    r.push(obj[key]);
  return r;
}

LI.pad_num = function (num, digits){return(1e15+num+"").slice(-digits)}

// CURRENCY STYLE ("fr" / "en")
LI.currency_style = function(value)
{
  if ( typeof(value) != 'string' )
    return 'fr';
  
  return isNaN(parseFloat(value.replace(',','.')))
    ? 'en'
    : 'fr'
  ;
}

LI.get_currency = function(value)
{
  if ( typeof(value) != 'string' )
    return '€';
  return value.replace(/[\d\.,\s]+/g, '').replace('&nbsp;','');
}

LI.clear_currency = function(value, stayStringed)
{
  if ( typeof(value) != 'string' )
    return value;
  return parseFloat(value.replace(',','.').replace(/[^-^\d^\.^\s]+/g, ''));
}

// THE CURRENCY
LI.format_currency = function(value, nbsp, fr_style, currency)
{
  if ( nbsp  === undefined ) nbsp  = true;
  if ( fr_style === undefined ) fr_style = true;
  if ( currency === undefined ) currency = '€';
  if ( typeof(value) === 'string' ) value = parseFloat(value);
  if ( !value ) value = 0;
  
  var r = $('.currency:first').length > 0
    ? $('.currency:first').html().replace(/[\d,\.]+/,'%d')
    : (fr_style ? '%d '+currency : currency+'%d');
  value = r.replace('%d',value.toFixed(2));

  if ( nbsp  ) value = value.replace(' ','&nbsp;');
  else value = value.replace('&nbsp;', ' ');
  if ( fr_style ) value = value.replace('.',',');

  return value;
};

// display a flash for a limited time
LI.alert = function(msg, type, time)
{
  if ( time == undefined )
    time = 4000;
  if ( type == undefined )
    type = 'notice';
  
  var icons = {
    success: 'ui-icon-circle-check',
    notice:  'ui-icon-info',
    error:   'ui-icon-alert',
  }
  
  var flash = $('<div class="%%type%% ui-state-%%type%% ui-state-highlight ui-corner-all"><span class="ui-icon %%icon%% floatleft"></span>&nbsp;%%msg%%</div>'
    .replace('%%msg%%',msg)
    .replace('%%type%%',type).replace('%%type%%',type)
    .replace('%%icon%%',icons[type]))
    .hide()
    .appendTo($('.sf_admin_flashes').css('position', 'absolute').css('z-index', 10))
    .fadeIn('slow');
  setTimeout(function(){
    flash.fadeOut(function(){ $(this).remove(); })
  },time);
}

LI.isMobile = {
  Android: function() {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function() {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i);
  },
  any: function() {
    return (LI.isMobile.Android() || LI.isMobile.BlackBerry() || LI.isMobile.iOS() || LI.isMobile.Opera() || LI.isMobile.Windows());
  },
  test: function() {
    return true;
  }
};

LI.ifMediaCaptureSupported = function(go, nogo)
{
  var fGetUserMedia =
  (
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.oGetUserMedia ||
    navigator.msieGetUserMedia ||
    false
  );
  fGetUserMedia.call( navigator, { video: true }, function(){ go() }, function(){ if ( nogo != undefined ) nogo(); } );
}

LI.OFC = {
  init: function(obj) { this.OFC = $(obj); return this; },
  OFC: null,
  name: "Open Flash Charts 2",
  version: function() { return this.OFC[0].get_version(); },
  rasterize: function (dst) { $(dst).replaceWith(this.image()); return this; },
  image: function() { return "<img src='data:image/png;base64," + this.binary() + "' />"; },
  binary: function() { return this.OFC[0].get_img_binary(); },
  popup: function() { window.open('data:image/png;base64,'+this.binary()); return this; }
}

LI.hexToRgb = function(hex)
{
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

LI.slugify = function(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();
  
  // remove accents, swap ñ for n, etc
  var from = 'ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;';
  var to   = 'aaaaaeeeeeiiiiooooouuuunc------';
  for (var i=0, l=from.length ; i<l ; i++)
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-|-$/g, '');
  
  return str;
}

LI.tableToArray = function(elt, tableSections){
  if ( $(elt).not('table') )
    elt = $(elt).find('> table');
  if ( typeof(tableSections) != 'object' )
    tableSections = ['thead', 'tbody', 'tfoot'];

  var data = [];
  $.each(tableSections, function(i, sel){
    $(elt).find('> '+sel+' > tr').each(function(){
      data.push([]);
      $(this).find('> td, > th').each(function(){
        data[data.length-1].push($.trim($(this).text()));
      });
    });
  });
  
  return data;
}
LI.arrayToTable = function(data){
  array = LI.clone(data);
  var tag;
  for ( var i = 0 ; i < array.length ; i++ )
  {
    tag = i == 0 ? 'th' : 'td';
    for ( var j = 0 ; j < array[i].length ; j++ )
      array[i][j] = LI.htmlEncode(array[i][j]);
    array[i] = '<'+tag+'>'+array[i].join('</'+tag+'><'+tag+'>')+'</'+tag+'>';
  }
  array = '<table><tr>'+array.join('</tr><tr>')+'</tr></table>';
  //window.open('data:application/vnd.ms-excel,'+array);
  return array;
}

// this function aims to correct the bugs induced by the cacher, when run within a task (this is a workaround)
LI.fixCacherLinks = function()
{
  // rewriting bad links generated by the cacher within a task
  $("a[href^='./'], form[action^='./'], img[src^='./'").each(function(){
    // to distinguish forms from anchors from images...
    var prop;
    if ( $(this).is('a') )
      prop = 'href';
    else if ( $(this).is('form') )
      prop = 'action';
    else
      prop = 'src';
    
    // having the href in the form of 'manifestation/688/showSpectators?refresh' or 'rp.php/contact/549'
    var suffix = $(this).attr(prop).replace(new RegExp('\./(symfony/)*'), '');
    
    // if the current URL is or is not a cross_app_url_for() URL
    var regexp = new RegExp('([^/]+.php5?).*$');
    $(this).prop(prop, suffix.match(new RegExp('^[^/]+.php5?'))
      ? $(this).prop(prop).replace(regexp,  '' )+suffix // removing the current PHP controler
      : $(this).prop(prop).replace(regexp, '$1/')+suffix // keeping the current PHP controler
    );
  });
}

LI.clone = function(obj)
{
  return JSON.parse(JSON.stringify(obj));
}
LI.htmlEncode = function(str, with_spaces)
{
  if ( with_spaces == undefined )
    with_spaces = true;
  var trans = LI.clone(LI.htmlEntitiesTable);
  if ( !with_spaces )
    trans[32] = undefined;
  
  // the strange case of pure numbers...
  if ( parseInt(str,10)+"" === ""+str )
    return str;
  
  var result = "";
  if ( str !== null )
  for( var i=0 ; i < str.length ; i++)
    result += trans[str.charCodeAt(i)] != undefined
      ? '&'+trans[str.charCodeAt(i)]+';'
      : str.substr(i,1);
  return result;
}
LI.htmlEntitiesTable = {
  32 : 'nbsp',
  34 : 'quot', 
  38 : 'amp', 
  //39 : 'apos', 
  60 : 'lt', 
  62 : 'gt', 
  160 : 'nbsp', 
  161 : 'iexcl', 
  162 : 'cent', 
  163 : 'pound', 
  164 : 'curren', 
  165 : 'yen', 
  166 : 'brvbar', 
  167 : 'sect', 
  168 : 'uml', 
  169 : 'copy', 
  170 : 'ordf', 
  171 : 'laquo', 
  172 : 'not', 
  173 : 'shy', 
  174 : 'reg', 
  175 : 'macr', 
  176 : 'deg', 
  177 : 'plusmn', 
  178 : 'sup2', 
  179 : 'sup3', 
  180 : 'acute', 
  181 : 'micro', 
  182 : 'para', 
  183 : 'middot', 
  184 : 'cedil', 
  185 : 'sup1', 
  186 : 'ordm', 
  187 : 'raquo', 
  188 : 'frac14', 
  189 : 'frac12', 
  190 : 'frac34', 
  191 : 'iquest', 
  192 : 'Agrave', 
  193 : 'Aacute', 
  194 : 'Acirc', 
  195 : 'Atilde', 
  196 : 'Auml', 
  197 : 'Aring', 
  198 : 'AElig', 
  199 : 'Ccedil', 
  200 : 'Egrave', 
  201 : 'Eacute', 
  202 : 'Ecirc', 
  203 : 'Euml', 
  204 : 'Igrave', 
  205 : 'Iacute', 
  206 : 'Icirc', 
  207 : 'Iuml', 
  208 : 'ETH', 
  209 : 'Ntilde', 
  210 : 'Ograve', 
  211 : 'Oacute', 
  212 : 'Ocirc', 
  213 : 'Otilde', 
  214 : 'Ouml', 
  215 : 'times', 
  216 : 'Oslash', 
  217 : 'Ugrave', 
  218 : 'Uacute', 
  219 : 'Ucirc', 
  220 : 'Uuml', 
  221 : 'Yacute', 
  222 : 'THORN', 
  223 : 'szlig', 
  224 : 'agrave', 
  225 : 'aacute', 
  226 : 'acirc', 
  227 : 'atilde', 
  228 : 'auml', 
  229 : 'aring', 
  230 : 'aelig', 
  231 : 'ccedil', 
  232 : 'egrave', 
  233 : 'eacute', 
  234 : 'ecirc', 
  235 : 'euml', 
  236 : 'igrave', 
  237 : 'iacute', 
  238 : 'icirc', 
  239 : 'iuml', 
  240 : 'eth', 
  241 : 'ntilde', 
  242 : 'ograve', 
  243 : 'oacute', 
  244 : 'ocirc', 
  245 : 'otilde', 
  246 : 'ouml', 
  247 : 'divide', 
  248 : 'oslash', 
  249 : 'ugrave', 
  250 : 'uacute', 
  251 : 'ucirc', 
  252 : 'uuml', 
  253 : 'yacute', 
  254 : 'thorn', 
  255 : 'yuml', 
  402 : 'fnof', 
  913 : 'Alpha', 
  914 : 'Beta', 
  915 : 'Gamma', 
  916 : 'Delta', 
  917 : 'Epsilon', 
  918 : 'Zeta', 
  919 : 'Eta', 
  920 : 'Theta', 
  921 : 'Iota', 
  922 : 'Kappa', 
  923 : 'Lambda', 
  924 : 'Mu', 
  925 : 'Nu', 
  926 : 'Xi', 
  927 : 'Omicron', 
  928 : 'Pi', 
  929 : 'Rho', 
  931 : 'Sigma', 
  932 : 'Tau', 
  933 : 'Upsilon', 
  934 : 'Phi', 
  935 : 'Chi', 
  936 : 'Psi', 
  937 : 'Omega', 
  945 : 'alpha', 
  946 : 'beta', 
  947 : 'gamma', 
  948 : 'delta', 
  949 : 'epsilon', 
  950 : 'zeta', 
  951 : 'eta', 
  952 : 'theta', 
  953 : 'iota', 
  954 : 'kappa', 
  955 : 'lambda', 
  956 : 'mu', 
  957 : 'nu', 
  958 : 'xi', 
  959 : 'omicron', 
  960 : 'pi', 
  961 : 'rho', 
  962 : 'sigmaf', 
  963 : 'sigma', 
  964 : 'tau', 
  965 : 'upsilon', 
  966 : 'phi', 
  967 : 'chi', 
  968 : 'psi', 
  969 : 'omega', 
  977 : 'thetasym', 
  978 : 'upsih', 
  982 : 'piv', 
  8226 : 'bull', 
  8230 : 'hellip', 
  8242 : 'prime', 
  8243 : 'Prime', 
  8254 : 'oline', 
  8260 : 'frasl', 
  8472 : 'weierp', 
  8465 : 'image', 
  8476 : 'real', 
  8482 : 'trade', 
  8501 : 'alefsym', 
  8592 : 'larr', 
  8593 : 'uarr', 
  8594 : 'rarr', 
  8595 : 'darr', 
  8596 : 'harr', 
  8629 : 'crarr', 
  8656 : 'lArr', 
  8657 : 'uArr', 
  8658 : 'rArr', 
  8659 : 'dArr', 
  8660 : 'hArr', 
  8704 : 'forall', 
  8706 : 'part', 
  8707 : 'exist', 
  8709 : 'empty', 
  8711 : 'nabla', 
  8712 : 'isin', 
  8713 : 'notin', 
  8715 : 'ni', 
  8719 : 'prod', 
  8721 : 'sum', 
  8722 : 'minus', 
  8727 : 'lowast', 
  8730 : 'radic', 
  8733 : 'prop', 
  8734 : 'infin', 
  8736 : 'ang', 
  8743 : 'and', 
  8744 : 'or', 
  8745 : 'cap', 
  8746 : 'cup', 
  8747 : 'int', 
  8756 : 'there4', 
  8764 : 'sim', 
  8773 : 'cong', 
  8776 : 'asymp', 
  8800 : 'ne', 
  8801 : 'equiv', 
  8804 : 'le', 
  8805 : 'ge', 
  8834 : 'sub', 
  8835 : 'sup', 
  8836 : 'nsub', 
  8838 : 'sube', 
  8839 : 'supe', 
  8853 : 'oplus', 
  8855 : 'otimes', 
  8869 : 'perp', 
  8901 : 'sdot', 
  8968 : 'lceil', 
  8969 : 'rceil', 
  8970 : 'lfloor', 
  8971 : 'rfloor', 
  9001 : 'lang', 
  9002 : 'rang', 
  9674 : 'loz', 
  9824 : 'spades', 
  9827 : 'clubs', 
  9829 : 'hearts', 
  9830 : 'diams', 
  338 : 'OElig', 
  339 : 'oelig', 
  352 : 'Scaron', 
  353 : 'scaron', 
  376 : 'Yuml', 
  710 : 'circ', 
  732 : 'tilde', 
  8194 : 'ensp', 
  8195 : 'emsp', 
  8201 : 'thinsp', 
  8204 : 'zwnj', 
  8205 : 'zwj', 
  8206 : 'lrm', 
  8207 : 'rlm', 
  8211 : 'ndash', 
  8212 : 'mdash', 
  8216 : 'lsquo', 
  8217 : 'rsquo', 
  8218 : 'sbquo', 
  8220 : 'ldquo', 
  8221 : 'rdquo', 
  8222 : 'bdquo', 
  8224 : 'dagger', 
  8225 : 'Dagger', 
  8240 : 'permil', 
  8249 : 'lsaquo', 
  8250 : 'rsaquo', 
  8364 : 'euro'
};
