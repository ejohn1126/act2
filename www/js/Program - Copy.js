/**************************************************************************
Ricicloni v.1.3.0.0
**************************************************************************/
//Set this to false if it is mobile site; set to true if it is mobile app
var isApp = true;

var timezoneOffset = new Date().getTimezoneOffset() * 60000;

var weekDays = ['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
var longDays = ['DOMENICA','LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO'];
var shortDays = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
var shortMonths = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO', 'SET', 'OTT', 'NOV', 'DIC'];
var longMonths = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];
var ISOToday = ISODateString(Date.today());

var Waste = function(id, name, items) {
    this.Id = ko.observable(id);
    this.Name = ko.observable(name);
    this.Items = ko.observableArray(items);
}

var viewModel = {

    //PRODUCTION
    baseUrl: "http://ricicloni.ingeniumsoft.com",
    //DEVELOPMENT
    //baseUrl: "http://192.168.0.4/ricapi",

    centerName: ko.observable(''),

    isAuthenticated: ko.observable(false),

    todayIndex: 0,

    selectedDate: ko.observable(''),

    selectedPickups: ko.observableArray([]),

    selectedMonth: ko.observableArray([]),

    zones: ko.observableArray([]),

    selectedZone: ko.observable(),

    nextPickups: ko.observableArray([]),

    zoneName: ko.observable(),

    calendarName: ko.observable(),

    calendarData: null,

    dictionaryData: ko.observableArray([]),

    monthName: ko.observable(''),

    monthIndexes: [],

    monthIndex: 0,

    selectToday: function()
    {
        var _cal = viewModel.getCalendarData();
        viewModel.selectedDate(_cal.Days[viewModel.todayIndex].Date);
        viewModel.selectedPickups(_cal.Days[viewModel.todayIndex].Pickups);
    },

    selectTomorrow: function()
    {
        var _cal = viewModel.getCalendarData();
        viewModel.selectedDate(_cal.Days[viewModel.todayIndex+1].Date);
        viewModel.selectedPickups(_cal.Days[viewModel.todayIndex+1].Pickups);
    },

    getRegisteredCenters: function()
    {
        return JSON.parse(window.localStorage.getItem("RegisteredCenters"));
    },

    getPersistedData: function(key)
    {
        return JSON.parse(window.localStorage.getItem(key));
    },

    setPersistedData: function(key, data)
    {
        window.localStorage.setItem(key, JSON.stringify(data));
    },

    removePersistedData: function(key)
    {
        window.localStorage.removeItem(key);
    },

    setCalendarData: function(data)
    {
        viewModel.calendarData = data;
        window.localStorage.setItem("CalendarData", JSON.stringify(data));
    },

    getCalendarData: function()
    {
        if (!viewModel.calendarData)
        {
            if (window.localStorage.getItem("CalendarData"))
            {
                viewModel.calendarData = JSON.parse(window.localStorage.getItem("CalendarData"));
            }
        }
        return viewModel.calendarData;
    },

    dictionaryToObservable : function(data)
    {
        for (i=0;i<data.Wastes.length;i++)
        {
            viewModel.dictionaryData.push(new Waste(data.Wastes[i].Id, data.Wastes[i].Name, data.Wastes[i].Items));
        }
    },

    getDictionaryData: function()
    {
        if (viewModel.dictionaryData().length==0)
        {
            if (window.localStorage.getItem("DictionaryData"))
            {
                //è già cachata, la ritorno
                console.log("Il dizionario è in cache lo carico nell'observable...");
                console.log(window.localStorage.getItem("DictionaryData"));
                var _dict = JSON.parse(window.localStorage.getItem("DictionaryData"));
                viewModel.dictionaryToObservable(_dict);
            }
            else
            {
                //Provo a caricarlo dal server
                console.log("Carico dal server il dizionario...");
                if (viewModel.getCalendarData())
                {
                    proxy.getDictionaryByZoneId(viewModel.getCalendarData().ZoneId,
                        function(data){
                            if (data)
                            {
                                //Salvo il dizionario nella cache
                                window.localStorage.setItem("DictionaryData", JSON.stringify(data));
                                viewModel.dictionaryToObservable(data);
                            }
                            else
                            {
                                viewModel.dictionaryData([]);
                            }
                        },
                        function(a,b,c){
                            window.popupMessage('Impossibile raggiungere il server. Riprovare più tardi.');
                            viewModel.dictionaryData([]);
                        }
                    );
                }
            }
        }
    },

    isDictionaryPresent : function()
    {
        return (viewModel.dictionaryData !== null);
    },

    initCalendar: function()
    {
        viewModel.monthName(longMonths[viewModel.monthIndex]);
        var calendar = viewModel.getCalendarData();
        if (calendar)
        {
            viewModel.selectedMonth.removeAll();

            //carico i giorni partendo dall'indice del mese selezionato
            for (i = viewModel.monthIndexes[viewModel.monthIndex]; i < calendar.Days.length; i++)
            {
                var cs = calendar.Days[i];
                var dateMonth = Date.parse(cs.Date).getMonth();
                if (viewModel.monthIndex === dateMonth)
                    viewModel.selectedMonth.push(cs);
                else
                    break;
            }
        }
    },

    selectDay : function(){
        viewModel.selectedDate(this.Date);
        viewModel.selectedPickups(this.Pickups);
        window.location.href = "#dayPickups";
    },



    onFSSuccess: function(fileSystem) {
        fileSystem.root.getDirectory("ingenium.ricicloni", {create:true}, viewModel.gotDir, viewModel.onError);
    },

    gotDir: function(d)
    {
        var Id=3;
        var ft = new FileTransfer();
        var wastes = viewModel.getCalendarData().Wastes;
        for (i=0;i<wastes.length;i++)
        {
            viewModel.setPersistedData("ImageFolder", d.fullPath);
            var dlPath = d.fullPath + "/W" + wastes[i].Id + ".png";
            console.log("downloading crap to " + dlPath);
            ft.download(viewModel.baseUrl + "/images/W" + wastes[i].Id + ".png", dlPath,
                        function(){
                            console.log("Successful download");
                        }, viewModel.onError);
        }
    },

    onError: function(e){
        console.log("ERROR");
        console.log(JSON.stringify(e));
    },

    confirmZone: function(){

        //Carico il calendario
        proxy.getCalendarByZoneId(this.selectedZone().Id, device.platform,
            function(data){
                //Salvo il calendario nella cache
                viewModel.setCalendarData(data);

                //Scarico le immagini
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, viewModel.onFSSuccess, null);

                //carico le notifiche
                viewModel.rebuildNotification();

                $("#pnlZone").hide();
                $("#pnlHome").show();

                //Scarico anche il dizionario
                viewModel.getDictionaryData();
                //Navigo alla pagina start
                window.location.href = "#start";
            },
            function(a,b,c){
                window.popupMessage('Impossibile raggiungere il server. Riprovare più tardi.');
            }
        );
    },

    afterShowZoneList: function()
    {
        //Caricare i comuni
        proxy.getZones(
            function(result){
                viewModel.zones(result);
                setTimeout(function () { wrpZoneList.refresh(); }, 0);
            }
        );
    },

    selectZone : function(){
        viewModel.selectedZone(this);
        navigator.notification.confirm(
            'Procedere con lo scaricamento del calendario per la zona ' + this.Name + '?', // message
            function(buttonIndex){
                if (buttonIndex==1)
                {
                    viewModel.confirmZone();
                }
            },              // callback to invoke with index of button pressed
            'Ricicloni',    // title
            'Ok,No'         // buttonLabels
        );
    },

    activateApp: function(){
        window.location.href = "#zoneList";
    },

    goCalendar: function(){
        window.location.href = "#calendar";
    },

    goToday: function(){
        viewModel.selectToday();
        window.location.href = "#dayPickups";
    },

    goTomorrow: function(){
        viewModel.selectTomorrow();
        window.location.href = "#dayPickups";
    },

    goSettings: function(){
        window.location.href = "#settings";
    },

    goHome: function(){
        window.location.href = "#start";
    },

    goAbout: function(){
        window.location.href = "#about";
    },

    goSignal: function(){
        window.location.href = "#signal";
    },

    goDictionary: function(){
        window.location.href = "#dictionary";
    },

    afterShowHome : function() {
        viewModel.showMenuTrigger();
        viewModel.nextPickups.removeAll();
        var _today = new Date();
        var _ISOToday = ISODateString(_today);
        var _cal = viewModel.getCalendarData();
        if (_cal)
        {
            var _start = 0;

            for (i=0;i<_cal.Days.length;i++)
            {
                if (_ISOToday === _cal.Days[i].Date)
                {
                    _start = i;
                    viewModel.todayIndex = i;
                }

                if (_start > 0)
                {
                    if (_cal.Days[i].Pickups && _cal.Days[i].Pickups.length>0)
                    {
                        viewModel.nextPickups.push(_cal.Days[i]);
                    }
                }

                if (_start > 0 && i == _start + 7) break;
            }

            viewModel.calendarName(_cal.Name);
            viewModel.zoneName(_cal.ZoneName);

            //Da ottimizzare!!! Memorizzo gli indici di inizio di ogni mese
            var monthIndex =-1;
            for (i=0;i<_cal.Days.length;i++)
            {
                var cs = _cal.Days[i];
                var month = Date.parse(cs.Date).getMonth();
                if (month !== monthIndex)
                {
                    viewModel.monthIndexes.push(i);
                    monthIndex = month;
                }
            }
            setTimeout(function () { wrpHome.refresh();$("#ajaxLoaderContainer").hide(); }, 0);
        }
        else
        {
            setTimeout(function () { wrpZone.refresh(); }, 0);
        }
    },

    goToNotification: function()
    {
        window.location.href = "#notification";
    },

    clearData: function(){
        navigator.notification.confirm(
            'Attenzione! Resettando i dati perderai il calendario e le notifiche attive. Vuoi continuare?', // message
            function(buttonIndex){
                if (buttonIndex==1)
                {
                    //Cancello tutte le notifiche locali
                    if (isApp) plugins.localNotification.cancelAll();
                    //Nascondo pannelli...
                    $("#pnlHome").hide();
                    $("#pnlZone").show();
                    //Imposto il titolo "neutro"
                    viewModel.calendarName("Raccolta differenziata 2.0");
                    //elimino calendario dal contesto
                    viewModel.calendarData = null;
                    viewModel.removePersistedData("Notification");
                    //elimino dizionario
                    viewModel.dictionaryData([]);
                    viewModel.removePersistedData("DictionaryData");
                    //Elimino cache
                    window.localStorage.clear();
                    //Navigo alla home page
                    window.location.href = "#start";
                }
            },            // callback to invoke with index of button pressed
            'Ricicloni',           // title
            'Ok,No'         // buttonLabels
        );
    },

    afterShowCalendar: function () {
        viewModel.showBackTrigger();
        var currentDate = new Date();
        viewModel.monthIndex = currentDate.getMonth();
        viewModel.initCalendar();
        setTimeout(function () { wrpCalendar.refresh(); }, 0);
    },

    prevMonth: function()
    {
        if (viewModel.monthIndex>0)
        {
            viewModel.monthIndex--;
            viewModel.initCalendar();
        }
    },

    nextMonth: function()
    {
        if (viewModel.monthIndex<11){
            viewModel.monthIndex++;
            viewModel.initCalendar();
        }
    },

    afterShowDictionary : function() {
        viewModel.showBackTrigger();
        setTimeout(function () { wrpDictionary.refresh(); }, 100);
    },

    afterShowDayPickups: function()
    {
        viewModel.showBackTrigger();
    },

    afterShowSettings: function()
    {
        viewModel.showBackTrigger();
        setTimeout(function () { wrpSettings.refresh(); }, 0);
    },

    afterShowAbout: function()
    {
        viewModel.showBackTrigger();
        setTimeout(function () { wrpAbout.refresh(); }, 0);
    },

    showMenuTrigger: function()
    {
        $("#menuTrigger").show();
        $("#backTrigger").hide();
    },

    showBackTrigger: function()
    {
        $("#menuTrigger").hide();
        $("#backTrigger").show();
    },

    signalImage: null,

    afterShowSignal : function() {
        viewModel.showBackTrigger();
        var image = document.getElementById('signalPhoto');
        image.src="images/SignalPhoto.png";
        signalImage = null;
        setTimeout(function () { wrpSignal.refresh(); }, 0);
    },

    takePhoto: function()
    {
        signalImage = null;
        navigator.camera.getPicture(
            function (imageData) {
                signalImage = imageData;
                var image = document.getElementById('signalPhoto');
                image.src = "data:image/jpeg;base64," + signalImage;
                setTimeout(function () { wrpSignal.refresh(); }, 0);
            },
            function(message) {
                popupMessage('Foto non acquisita.');
            },
            { quality: 50, destinationType: Camera.DestinationType.DATA_URL, correctOrientation: true }
        );
    },

    performSignal: function()
    {
        if (signalImage)
        {
            navigator.geolocation.getCurrentPosition(function(position) {
                                                        proxy.addSignal(viewModel.getCalendarData().ZoneId, signalImage, position.coords.latitude, position.coords.longitude, '',
                                                            function (){
                                                                popupMessage('Segnalazione inviata!');
                                                            },
                                                            function(a,b,c){
                                                                popupMessage('Errore durante l\'invio della segnalazione. Riprova più tardi.');
                                                            }
                                                        );
                                                     },
                                                     function (error) {
                                                        popupMessage('Per inviare una segnalazione devi abilitare il GPS!');
                                                     }
            );
        }
        else
        {
            popupMessage('Per inviare una segnalazione, scattare prima una foto ai rifiuti.');
        }
    },

    afterShowNotification: function()
    {
        viewModel.showBackTrigger();
        var _notification = viewModel.getNotification();
        //Flag and select
        viewModel.hourIndex(_notification.HourGap * -1);
        for (i=0;i<_notification.Wastes.length;i++)
        {
            if (!_notification.Wastes[i].Checked)
            {
                $("#W" + _notification.Wastes[i].WasteId).addClass("unchecked");
            }
        }
        setTimeout(function () { wrpNotifications.refresh(); }, 0);
    },

    hourIndex: ko.observable(0),

    hours: ["","23:00","22:00","21:00","20:00","19:00","18:00","17:00","16:00","15:00","14:00","13:00","12:00","11:00","10:00","09:00","08:00","07:00","06:00","05:00","04:00","03:00","02:00","01:00","00:00"],

    prevHour: function()
    {
        console.log("prevhour");
        if (viewModel.hourIndex()<24)
        {
            viewModel.hourIndex(viewModel.hourIndex()+1);
        }
    },

    nextHour: function()
    {
        console.log("nexthour");
        if (viewModel.hourIndex()>1){
            viewModel.hourIndex(viewModel.hourIndex()-1);
        }
    },

    getWastes: function()
    {
        if (viewModel.getCalendarData())
            return viewModel.getCalendarData().Wastes;
        else
            return [];
    },

    saveNotification: function()
    {
        var _checked=[];
        var _hourGap = viewModel.hourIndex() * -1;
        var _checkedWastes = $(".wasteCheck");
        for (i=0;i<_checkedWastes.length;i++)
        {
            var _id = _checkedWastes[i].id.substring(1);
            var _isChecked = !($(_checkedWastes[i]).hasClass("unchecked"));
            _checked.push({WasteId:_id, Checked: _isChecked});
        }
        console.log("HourGap:" + _hourGap + "Wastes: " + JSON.stringify(_checked));
        viewModel.setPersistedData("Notification", {HourGap:_hourGap, Wastes:_checked});
        //Ricreo tutte le notifiche...
        viewModel.rebuildNotification();
        popupMessage('Notifiche salvate con successo.');
    },

    getNotification: function()
    {
        var _notification = viewModel.getPersistedData("Notification");
        if (_notification == null)
        {
            console.log("Notification model not present, creating default...");
            var _checked=[];
            //build default notification (all wastes) and store in localStorage
            var _wastes = viewModel.getWastes();
            for (i=0;i<_wastes.length;i++)
            {
                _checked.push({WasteId:_wastes[i].Id, Checked:true});
            }
            _notification = {HourGap:-6, Wastes:_checked};
            console.log(JSON.stringify(_notification));
            viewModel.setPersistedData("Notification", _notification);
        }
        return _notification;
    },

    rebuildNotification: function()
    {
        // rimuovo tutte le notifiche
        if (isApp) plugins.localNotification.cancelAll();
        //leggo il calendario corrente
        var data = viewModel.getCalendarData();
        var _notification = viewModel.getNotification();
        var _notifyId = 0;
        var _today = new Date();
        var _ISOToday = ISODateString(_today);
        _today = Date.parse(_ISOToday);
        for (i=0; i < data.Days.length; i++)
        {
            var day = data.Days[i];
            var pickupDate = Date.parse(day.Date);
            if (pickupDate >= _today && day.Pickups.length>0)
            {
                var wastes = '';
                for (p=0;p<day.Pickups.length;p++)
                {
                    for (w=0;w<_notification.Wastes.length;w++)
                    {
                        if (day.Pickups[p].WasteId == _notification.Wastes[w].WasteId && _notification.Wastes[w].Checked)
                        {
                            wastes = wastes +  day.Pickups[p].WasteName + "/";
                        }
                    }
                }
                if (wastes.length>0)
                {
                    wastes = wastes.substring(0, wastes.length-1);
                    //Creo la notifica
                    console.log('Pickup date: ' + pickupDate);
                    //Sposto la data di notifica alle XX:00 del giorno precedente (default 18.00)
                    var notificationDate = ISODateTimeString(pickupDate.add(_notification.HourGap).hours());
                    console.log('Create notification ' + notificationDate + ' for ' + wastes);
                    _notifyId++;
                    //Creo la notifica
                    if (isApp)
                    {
                        plugins.localNotification.add({
                            date : notificationDate,
                            message : "Ricicloni\r\n" + wastes,
                            ticker : "Ricicloni raccolta differenziata",
                            repeatDaily : false,
                            id : _notifyId
                        });
                    }

                }
            }
        }
    }
};

viewModel.detailDate = ko.computed(function(){
    if (this.selectedDate())
    {
         var d = Date.parse(this.selectedDate());
         return longDays[d.getDay()] + " " + d.getDate() + " " + longMonths[d.getMonth()];
    }
    else
    {
        return '';
    }
}, viewModel);

viewModel.hourName = ko.computed(function() {
    return this.hours[this.hourIndex()];
}, viewModel);
/****************************************************************
End ViewModel: viewModel
****************************************************************/

var proxy = new ServiceProxy(viewModel.baseUrl);

if (isApp){
    //Sync with Phonegap
    document.addEventListener("deviceready", onDeviceReady, false);
}
else{
    //Sync with jQuery
    $(document).ready(onDeviceReady);
}

function initMenu()
{
    $("nav#menu").mmenu();
    $(document).on('click', '#menuTrigger', function(e){
        $("#menu").trigger("open");
    });
}

document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
//document.addEventListener('DOMContentLoaded', function () { setTimeout(loaded, 0); }, false);

var wrpAbout;
var wrpZone;
var wrpHome;
var wrpSignal;
var wrpZoneList;
var wrpDaily;
var wrpSettings;
var wrpNotifications;
var wrpCalendar;
var wrpDictionary;

function loaded()
{
    wrpZone = new IScroll('#wrpZone', {click: true});
    wrpZoneList = new IScroll('#wrpZoneList', {click: true});
    wrpHome = new IScroll('#wrpHome', {click: true});
    wrpAbout = new IScroll('#wrpAbout', {click: true});
    wrpSignal = new IScroll('#wrpSignal', {click: true});
    wrpDaily = new IScroll('#wrpDaily', {click: true});
    wrpSettings = new IScroll('#wrpSettings', {click: true});
    wrpNotifications = new IScroll('#wrpNotifications', {click: true, preventDefaultException: { tagName: /^(input|textarea|button|select|img)$/ }});
    wrpCalendar = new IScroll('#wrpCalendar', {click: true});
    wrpDictionary = new IScroll('#wrpDictionary', {click: true});
}

function setHeight()
{
    var h = $(window).height() - 96;
    $("#wrpHome").css("height", h);
    $("#wrpZone").css("height", h);
    $("#wrpZoneList").css("height", h);
    $("#wrpAbout").css("height", h);
    $("#wrpDaily").css("height", h);
    $("#wrpSignal").css("height", h);
    $("#wrpSettings").css("height", h);
    $("#wrpNotifications").css("height", h);
    $("#wrpCalendar").css("height", h);
    $("#wrpDictionary").css("height", h);
}

/////////////////////////////////////////////////////////////
// Cordova or Document is ready
/////////////////////////////////////////////////////////////
function onDeviceReady() {

    console.log('Device is ready.');

    //TEST NOTIFICATION
    /*
        plugins.localNotification.add({
            date : '2013-08-03T17:43:00',
            message : "Ricicloni\r\nSECCO, UMIDO E VETRO",
            ticker : "Ricicloni raccolta differenziata",
            repeatDaily : false,
            id : 4
        });
      */

    if (!isApp)
    {
        //Carico dati finti
        var _cal = {"Id":5,"Name":"Ecocalendario 2013","ValidFrom":"2013-01-01T00:00:00","ValidTo":"2013-12-31T00:00:00","ZoneId":5,"ZoneName":"Castelfranco Veneto","Days":[{"Date":"2013-01-01T00:00:00","Pickups":[]},{"Date":"2013-01-02T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-01-03T00:00:00","Pickups":[]},{"Date":"2013-01-04T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-05T00:00:00","Pickups":[]},{"Date":"2013-01-06T00:00:00","Pickups":[]},{"Date":"2013-01-07T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-01-08T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-09T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-01-10T00:00:00","Pickups":[]},{"Date":"2013-01-11T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-12T00:00:00","Pickups":[]},{"Date":"2013-01-13T00:00:00","Pickups":[]},{"Date":"2013-01-14T00:00:00","Pickups":[]},{"Date":"2013-01-15T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-16T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-01-17T00:00:00","Pickups":[]},{"Date":"2013-01-18T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-19T00:00:00","Pickups":[]},{"Date":"2013-01-20T00:00:00","Pickups":[]},{"Date":"2013-01-21T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-01-22T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-23T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-01-24T00:00:00","Pickups":[]},{"Date":"2013-01-25T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-26T00:00:00","Pickups":[]},{"Date":"2013-01-27T00:00:00","Pickups":[]},{"Date":"2013-01-28T00:00:00","Pickups":[]},{"Date":"2013-01-29T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-01-30T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-01-31T00:00:00","Pickups":[]},{"Date":"2013-02-01T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-02T00:00:00","Pickups":[]},{"Date":"2013-02-03T00:00:00","Pickups":[]},{"Date":"2013-02-04T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-02-05T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-06T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-02-07T00:00:00","Pickups":[]},{"Date":"2013-02-08T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-09T00:00:00","Pickups":[]},{"Date":"2013-02-10T00:00:00","Pickups":[]},{"Date":"2013-02-11T00:00:00","Pickups":[]},{"Date":"2013-02-12T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-13T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-02-14T00:00:00","Pickups":[]},{"Date":"2013-02-15T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-16T00:00:00","Pickups":[]},{"Date":"2013-02-17T00:00:00","Pickups":[]},{"Date":"2013-02-18T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-02-19T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-20T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-02-21T00:00:00","Pickups":[]},{"Date":"2013-02-22T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-23T00:00:00","Pickups":[]},{"Date":"2013-02-24T00:00:00","Pickups":[]},{"Date":"2013-02-25T00:00:00","Pickups":[]},{"Date":"2013-02-26T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-02-27T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-02-28T00:00:00","Pickups":[]},{"Date":"2013-03-01T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-02T00:00:00","Pickups":[]},{"Date":"2013-03-03T00:00:00","Pickups":[]},{"Date":"2013-03-04T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-03-05T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-06T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-03-07T00:00:00","Pickups":[]},{"Date":"2013-03-08T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-09T00:00:00","Pickups":[]},{"Date":"2013-03-10T00:00:00","Pickups":[]},{"Date":"2013-03-11T00:00:00","Pickups":[]},{"Date":"2013-03-12T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-13T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-03-14T00:00:00","Pickups":[]},{"Date":"2013-03-15T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-16T00:00:00","Pickups":[]},{"Date":"2013-03-17T00:00:00","Pickups":[]},{"Date":"2013-03-18T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-03-19T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-20T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-03-21T00:00:00","Pickups":[]},{"Date":"2013-03-22T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-23T00:00:00","Pickups":[]},{"Date":"2013-03-24T00:00:00","Pickups":[]},{"Date":"2013-03-25T00:00:00","Pickups":[]},{"Date":"2013-03-26T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-27T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-03-28T00:00:00","Pickups":[]},{"Date":"2013-03-29T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-03-30T00:00:00","Pickups":[]},{"Date":"2013-03-31T00:00:00","Pickups":[]},{"Date":"2013-04-01T00:00:00","Pickups":[]},{"Date":"2013-04-02T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-03T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-04-04T00:00:00","Pickups":[]},{"Date":"2013-04-05T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-06T00:00:00","Pickups":[]},{"Date":"2013-04-07T00:00:00","Pickups":[]},{"Date":"2013-04-08T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-04-09T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-10T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-04-11T00:00:00","Pickups":[]},{"Date":"2013-04-12T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-13T00:00:00","Pickups":[]},{"Date":"2013-04-14T00:00:00","Pickups":[]},{"Date":"2013-04-15T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-04-16T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-17T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-04-18T00:00:00","Pickups":[]},{"Date":"2013-04-19T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-20T00:00:00","Pickups":[]},{"Date":"2013-04-21T00:00:00","Pickups":[]},{"Date":"2013-04-22T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-04-23T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-24T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-04-25T00:00:00","Pickups":[]},{"Date":"2013-04-26T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-04-27T00:00:00","Pickups":[]},{"Date":"2013-04-28T00:00:00","Pickups":[]},{"Date":"2013-04-29T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-04-30T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-01T00:00:00","Pickups":[]},{"Date":"2013-05-02T00:00:00","Pickups":[]},{"Date":"2013-05-03T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-04T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-05-05T00:00:00","Pickups":[]},{"Date":"2013-05-06T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-05-07T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-08T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-05-09T00:00:00","Pickups":[]},{"Date":"2013-05-10T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-11T00:00:00","Pickups":[]},{"Date":"2013-05-12T00:00:00","Pickups":[]},{"Date":"2013-05-13T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-05-14T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-15T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-05-16T00:00:00","Pickups":[]},{"Date":"2013-05-17T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-18T00:00:00","Pickups":[]},{"Date":"2013-05-19T00:00:00","Pickups":[]},{"Date":"2013-05-20T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-05-21T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-22T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-05-23T00:00:00","Pickups":[]},{"Date":"2013-05-24T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-25T00:00:00","Pickups":[]},{"Date":"2013-05-26T00:00:00","Pickups":[]},{"Date":"2013-05-27T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-05-28T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-05-29T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-05-30T00:00:00","Pickups":[]},{"Date":"2013-05-31T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-01T00:00:00","Pickups":[]},{"Date":"2013-06-02T00:00:00","Pickups":[]},{"Date":"2013-06-03T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-06-04T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-05T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-06-06T00:00:00","Pickups":[]},{"Date":"2013-06-07T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-08T00:00:00","Pickups":[]},{"Date":"2013-06-09T00:00:00","Pickups":[]},{"Date":"2013-06-10T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-06-11T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-12T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-06-13T00:00:00","Pickups":[]},{"Date":"2013-06-14T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-15T00:00:00","Pickups":[]},{"Date":"2013-06-16T00:00:00","Pickups":[]},{"Date":"2013-06-17T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-06-18T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-19T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-06-20T00:00:00","Pickups":[]},{"Date":"2013-06-21T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-22T00:00:00","Pickups":[]},{"Date":"2013-06-23T00:00:00","Pickups":[]},{"Date":"2013-06-24T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-06-25T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-26T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-06-27T00:00:00","Pickups":[]},{"Date":"2013-06-28T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-06-29T00:00:00","Pickups":[]},{"Date":"2013-06-30T00:00:00","Pickups":[]},{"Date":"2013-07-01T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-07-02T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-03T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-07-04T00:00:00","Pickups":[]},{"Date":"2013-07-05T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-06T00:00:00","Pickups":[]},{"Date":"2013-07-07T00:00:00","Pickups":[]},{"Date":"2013-07-08T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-07-09T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-10T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-07-11T00:00:00","Pickups":[]},{"Date":"2013-07-12T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-13T00:00:00","Pickups":[]},{"Date":"2013-07-14T00:00:00","Pickups":[]},{"Date":"2013-07-15T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-07-16T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-17T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-07-18T00:00:00","Pickups":[]},{"Date":"2013-07-19T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-20T00:00:00","Pickups":[]},{"Date":"2013-07-21T00:00:00","Pickups":[]},{"Date":"2013-07-22T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-07-23T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-24T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-07-25T00:00:00","Pickups":[]},{"Date":"2013-07-26T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-27T00:00:00","Pickups":[]},{"Date":"2013-07-28T00:00:00","Pickups":[]},{"Date":"2013-07-29T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-07-30T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-07-31T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-08-01T00:00:00","Pickups":[]},{"Date":"2013-08-02T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-03T00:00:00","Pickups":[]},{"Date":"2013-08-04T00:00:00","Pickups":[]},{"Date":"2013-08-05T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-08-06T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-07T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-08-08T00:00:00","Pickups":[]},{"Date":"2013-08-09T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-10T00:00:00","Pickups":[]},{"Date":"2013-08-11T00:00:00","Pickups":[]},{"Date":"2013-08-12T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-08-13T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-14T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-08-15T00:00:00","Pickups":[]},{"Date":"2013-08-16T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-17T00:00:00","Pickups":[]},{"Date":"2013-08-18T00:00:00","Pickups":[]},{"Date":"2013-08-19T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-08-20T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-21T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-08-22T00:00:00","Pickups":[]},{"Date":"2013-08-23T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-24T00:00:00","Pickups":[]},{"Date":"2013-08-25T00:00:00","Pickups":[]},{"Date":"2013-08-26T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-08-27T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-28T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-08-29T00:00:00","Pickups":[]},{"Date":"2013-08-30T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-08-31T00:00:00","Pickups":[]},{"Date":"2013-09-01T00:00:00","Pickups":[]},{"Date":"2013-09-02T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-09-03T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-04T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-09-05T00:00:00","Pickups":[]},{"Date":"2013-09-06T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-07T00:00:00","Pickups":[]},{"Date":"2013-09-08T00:00:00","Pickups":[]},{"Date":"2013-09-09T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-09-10T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-11T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-09-12T00:00:00","Pickups":[]},{"Date":"2013-09-13T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-14T00:00:00","Pickups":[]},{"Date":"2013-09-15T00:00:00","Pickups":[]},{"Date":"2013-09-16T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-09-17T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-18T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-09-19T00:00:00","Pickups":[]},{"Date":"2013-09-20T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-21T00:00:00","Pickups":[]},{"Date":"2013-09-22T00:00:00","Pickups":[]},{"Date":"2013-09-23T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-09-24T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-25T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-09-26T00:00:00","Pickups":[]},{"Date":"2013-09-27T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-09-28T00:00:00","Pickups":[]},{"Date":"2013-09-29T00:00:00","Pickups":[]},{"Date":"2013-09-30T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-10-01T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-02T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-10-03T00:00:00","Pickups":[]},{"Date":"2013-10-04T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-05T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-10-06T00:00:00","Pickups":[]},{"Date":"2013-10-07T00:00:00","Pickups":[]},{"Date":"2013-10-08T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-09T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-10-10T00:00:00","Pickups":[]},{"Date":"2013-10-11T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-12T00:00:00","Pickups":[]},{"Date":"2013-10-13T00:00:00","Pickups":[]},{"Date":"2013-10-14T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-10-15T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-16T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-10-17T00:00:00","Pickups":[]},{"Date":"2013-10-18T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-19T00:00:00","Pickups":[]},{"Date":"2013-10-20T00:00:00","Pickups":[]},{"Date":"2013-10-21T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-10-22T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-23T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-10-24T00:00:00","Pickups":[]},{"Date":"2013-10-25T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-26T00:00:00","Pickups":[]},{"Date":"2013-10-27T00:00:00","Pickups":[]},{"Date":"2013-10-28T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-10-29T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-10-30T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-10-31T00:00:00","Pickups":[]},{"Date":"2013-11-01T00:00:00","Pickups":[]},{"Date":"2013-11-02T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-03T00:00:00","Pickups":[]},{"Date":"2013-11-04T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-11-05T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-06T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-11-07T00:00:00","Pickups":[]},{"Date":"2013-11-08T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-09T00:00:00","Pickups":[]},{"Date":"2013-11-10T00:00:00","Pickups":[]},{"Date":"2013-11-11T00:00:00","Pickups":[]},{"Date":"2013-11-12T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-13T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-11-14T00:00:00","Pickups":[]},{"Date":"2013-11-15T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-16T00:00:00","Pickups":[]},{"Date":"2013-11-17T00:00:00","Pickups":[]},{"Date":"2013-11-18T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-11-19T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-20T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-11-21T00:00:00","Pickups":[]},{"Date":"2013-11-22T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-23T00:00:00","Pickups":[]},{"Date":"2013-11-24T00:00:00","Pickups":[]},{"Date":"2013-11-25T00:00:00","Pickups":[]},{"Date":"2013-11-26T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-27T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-11-28T00:00:00","Pickups":[]},{"Date":"2013-11-29T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-11-30T00:00:00","Pickups":[]},{"Date":"2013-12-01T00:00:00","Pickups":[]},{"Date":"2013-12-02T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-12-03T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-04T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-12-05T00:00:00","Pickups":[]},{"Date":"2013-12-06T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-07T00:00:00","Pickups":[]},{"Date":"2013-12-08T00:00:00","Pickups":[]},{"Date":"2013-12-09T00:00:00","Pickups":[]},{"Date":"2013-12-10T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-11T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-12-12T00:00:00","Pickups":[]},{"Date":"2013-12-13T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-14T00:00:00","Pickups":[]},{"Date":"2013-12-15T00:00:00","Pickups":[]},{"Date":"2013-12-16T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-12-17T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-18T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-12-19T00:00:00","Pickups":[]},{"Date":"2013-12-20T00:00:00","Pickups":[{"WasteId":4,"WasteName":"VETRO","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-21T00:00:00","Pickups":[]},{"Date":"2013-12-22T00:00:00","Pickups":[]},{"Date":"2013-12-23T00:00:00","Pickups":[]},{"Date":"2013-12-24T00:00:00","Pickups":[{"WasteId":1,"WasteName":"SECCO NON RICICLABILE","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-25T00:00:00","Pickups":[]},{"Date":"2013-12-26T00:00:00","Pickups":[]},{"Date":"2013-12-27T00:00:00","Pickups":[{"WasteId":2,"WasteName":"CARTA","Note":""},{"WasteId":3,"WasteName":"UMIDO","Note":""}]},{"Date":"2013-12-28T00:00:00","Pickups":[{"WasteId":5,"WasteName":"IMBALLAGGI IN PLASTICA E LATTINE","Note":""}]},{"Date":"2013-12-29T00:00:00","Pickups":[]},{"Date":"2013-12-30T00:00:00","Pickups":[{"WasteId":6,"WasteName":"VEGETALE","Note":""}]},{"Date":"2013-12-31T00:00:00","Pickups":[{"WasteId":3,"WasteName":"UMIDO","Note":""}]}],"Wastes":[{"Id":1,"Name":"SECCO NON RICICLABILE"},{"Id":2,"Name":"CARTA"},{"Id":3,"Name":"UMIDO"},{"Id":4,"Name":"VETRO"},{"Id":5,"Name":"IMBALLAGGI IN PLASTICA E LATTINE"},{"Id":6,"Name":"VEGETALE"}]}
        viewModel.setCalendarData(_cal);
    }
    $.support.cors = true;


     // extend your view-model with pager.js specific data
    pager.extendWithPage(viewModel);

    // apply the view-model using KnockoutJS as normal
    ko.applyBindings(viewModel);

    // start pager.js
    pager.start();

    initMenu();

    //Se i dati del calendario sono disponibili in cache, imposto la pagina di start
    $(".title").text("Ricicloni");

    if (viewModel.getCalendarData()){
        //Mostro la home
        $("#pnlZone").hide();
        $("#pnlHome").show();
    }
    else{
        //mostro la richiesta selezione comune
        viewModel.calendarName("Raccolta differenziata 2.0");
        $("#pnlHome").hide();
        $("#pnlZone").show();
    }

    //Carico il Dizionario
    viewModel.getDictionaryData();

    if (isApp){
        //Gestione backbutton nella home
        document.addEventListener("backbutton", function(e){
            if(pager.page.route[0] && pager.page.route[0] != 'start'){
                navigator.app.backHistory();
            }
            else {
                e.preventDefault();
                navigator.app.exitApp();
            }
        }, false);
        navigator.splashscreen.hide();
    }

    $(document).on('click', '#backTrigger', function(e){
        navigator.app.backHistory();
    });

    FastClick.attach(document.body);

    loaded();

    setHeight();

    $(window).on('resize', function(){
        setHeight();
    });

    $(".wasteCheck").on('click', function(){
        $(this).toggleClass("unchecked");
    });

    //HACK- SU Android 2.x le <select> non si refreshano, ovvero l'elemento viene effettivamente selezionato
    //ma non viene mostrato
    $(".selectBox").change(function() {
        $(this).hide();
        $(".selectBox").show();
    });

    $("body").show();
}

$.ajaxSetup({
    beforeSend:function(){
        $("#ajaxLoaderContainer").show();
    },
    complete:function(){
        $("#ajaxLoaderContainer").hide();
    }
});

/////////////////////////////
// Utilities
/////////////////////////////
function parseJsonDate(jsonDate) {
    var parts = /\/Date\((-?\d+)([+-]\d{2})?(\d{2})?.*/.exec(jsonDate);
	//Daylight Handling
	return new Date(+parts[1]+timezoneOffset);
}

function popupMessage(message)
{
    if (isApp){
        navigator.notification.alert(message, null, 'Ricicloni', 'Ok');
    }
    else{
        alert(message);
    }
}

function longFormatDate(dateString)
{
    var d = Date.parse(dateString);
    return longDays[d.getDay()] + " " + d.getDate() + " " + longMonths[d.getMonth()];
}

function shortFormatDate(dateString)
{
    var d=Date.parse(dateString);
    return shortDays[d.getDay()] + " " + d.getDate() + " " + shortMonths[d.getMonth()];
}

function formatDay(dateString)
{
    var d=Date.parse(dateString);
    return shortDays[d.getDay()] + " " + d.getDate();
}

function wasteIcon(wasteId)
{
    return viewModel.getPersistedData("ImageFolder") + "/W" + wasteId + ".png";
}

function getClass(dateString)
{
    var d=Date.parse(dateString);
    if (d.getDay()==0) return "scrollerTitleHL"; else return "scrollerTitle";
}

function getBackgroundClass(dateString)
{
    if (dateString==ISOToday) return "background-color: #5ac7ff;"; else return "";
}

function ISODateString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getFullYear()+'-'
        + pad(d.getMonth()+1)+'-'
        + pad(d.getDate())+'T00:00:00'
}

function ISODateTimeString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}