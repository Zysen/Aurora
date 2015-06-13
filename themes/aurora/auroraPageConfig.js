CKEDITOR.editorConfig = function( config )
{

	// Define changes to default configuration here. For example:
    // config.language = 'fr';
    // config.uiColor = '#AADC6E';
    config.extraPlugins = 'save'; //auroraWidgets
    config.language = "en.js";
    config.entities = false;
    config.basicEntities = false;
    //config.skin = 'office2003';
    config.toolbar = 'MyToolbar';
    //config.scayt_autoStartup = true;                                         
    config.resize_enabled = false;
    config.removePlugins = 'elementspath';
    config.toolbarCanCollapse = false;
    config.dialog_backgroundCoverColor = 'rgb(0, 0, 0)';
    //config.bodyClass = 'themeAuroraContent';
    //config.bodyClass = 'content';
    config.bodyId = 'content';
    //config.emailProtection = 'mt(NAME,DOMAIN,SUBJECT,BODY)';
    config.filebrowserUploadUrl = '/upload/';
    config.contentsCss = ['/themes/aurora/style.css'];
    config.startupShowBorders = false;
    config.startupOutlineBlocks = false;
    config.height = (((typeof jQuery != 'undefined')?jQuery(window).height():aurora_viewport().height)-80)+"px";
    config.uiColor = '#FFFFFF';//063777
    config.startupFocus = false;
    var normalFontStyle = { name : 'Normal Text', element : 'p'};
    config.stylesSet = [
                        {name : 'Heading', element : 'h1'},{name : 'Heading 2', element : 'h2'},{name : 'Heading 3', element : 'h2'},
                       normalFontStyle
                       ];
/*
config.stylesSet = [
 { name : 'Heading', element : 'div', styles:{color:'#999999', 'font-family':'verdana', 'font-size':'12pt', 'font-weight':'bold'}},
normalFontStyle
];
*/

config.font_style = normalFontStyle;
config.toolbar_MyToolbar =
[        
    ['Source','Save','AuroraCancel','Undo','Redo', 'Cut','Copy','Paste'],
    ['Image','Table','HorizontalRule','SpecialChar', 'Link','Unlink'],//'/',
    ['NumberedList','BulletedList','Outdent','Indent'],              //'-',
    ['Bold','Italic','Underline','Strike', 'Subscript','Superscript', 'JustifyLeft','JustifyCenter','JustifyRight', 'TextColor','BGColor'],
    ['Styles','Font','FontSize'],['auroraWidgetSelector']
    ];
};


CKEDITOR.config.enterMode = CKEDITOR.ENTER_BR;
CKEDITOR.config.forcePasteAsPlainText = false; // default so content won't be manipulated on load
CKEDITOR.config.basicEntities = true;
CKEDITOR.config.entities = true;
CKEDITOR.config.entities_latin = false;
CKEDITOR.config.entities_greek = false;
CKEDITOR.config.entities_processNumerical = false;
CKEDITOR.config.fillEmptyBlocks = function (element) {
        return true; // DON'T DO ANYTHING!!!!!
};

CKEDITOR.config.allowedContent = true; // don't filter my data