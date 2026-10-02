// Tournament copy is kept separate from the page component so it can be edited
// without changing the layout. The document's cover and introduction identify
// 21 November 2026 and the XI edition; a later paragraph contains stale values.
const tournament2026 = {
  title: 'Euskal Herriko Hitz Gurutzatuen XI. Txapelketa',
  date: '2026-11-21',
  dateLabel: '2026ko azaroaren 21a, larunbata',
  venue: 'Palmera-Montero gunea',
  address: 'Leandro Agirretxe plazatxoa, 1 · 20304 Irun',
  registrationUrl: 'https://labur.eus/gurutzatuak',
  contactUrl: 'https://wa.me/34685783470',
  introduction: [
    'Euskal Herriko Hitz Gurutzatuen XI. Txapelketa eginen dugu Irunen datorren azaroaren 21ean, larunbatean, eta aro berriko hirugarren edizioa izanen da honakoa. Izan ere, 2007an antolatu zen lehendabiziko txapelketa, eta urtero egin zen ondoko zazpi urtean, antolatzaileek, LUMA taldeko kide irundarrek, 2015ean ediziorik ez zutela berrituko iragarri zuten arte.',
    'Aurtengoan ere, Aitzondo Euskara Taldeak hartu ditu antolaketa-lanak bere gain, eta duela bi urte hasitako bideari jarraituko dio, euskarazko jokozaleen eta, bereziki, hitz gurutzatu maitale ororen pozerako.',
    'Biziki esanguratsuak izanen dira Euskal Herriko Hitz Gurutzatuen XI. Txapelketak egituran eskainiko dituen berritasunak. Betiko moduan, goizez jokatuko da lehiaketa, goizean jokatuko dira Txapelketako proba guztiak, baina aurtengoan, bi beharrean, hiru proba gainditu beharko dituzte finalerako txartela eskuratu nahiko duten lehiakideek, eta finalean hiru lehiakide baizik ez dira arituko. Hiruko finala izanen da, beraz. Bestalde, orain arte beti izan den bezala, Joxan Elosegi hitz gurutzatu sortzaile irundarrak prestatuak izanen dira proba guztiak.',
    'Bestalde, txapelketa bada ere, eta halakoa da, txapela jantziko baitu lehiaketako irabazleak, topaketa baten aurrean gaudela esan genezake, elkar ezagutzeko eta elkarrekin egoteko, hitz egiteko eta jarduteko aukera izanen baitute egun horretan, giro alaian eta patxadan, euskarazko hitz jokozaleek, garai batekoek eta egungoek. Hain zuzen ere, zale horiei guztiei begira antolatu nahi izan dugu txapelketa hau; bixigarria da lehiaketa, jakina, baina gure lehen helburua ez da puntako hitz gurutzatuen ederra besterik gabe egitea, baizik eta denon gustuko giroa sortzea eta guztioi egun goxoa eskaintzea. Gero, esan gabe doa, ohorea zor zaie betiere aurren sailkatu direnei.'
  ],
  registration: {
    heading: 'Izen-ematea',
    paragraphs: [
      'Hala nahi duten euskaldun guztiek hartu ahal izanen dute parte Euskal Herriko Hitz Gurutzatuen XI. Txapelketa honetan, 14 urte beterik badituzte eta aurrez izena emanak badira. Bost euro ordainduko du haietako bakoitzak, izen-emate sari gisa, txapelketa egunean berean.',
      'Hartara, Interneten https://labur.eus/gurutzatuak helbidera jo eta gunearen barrenean izena eman ahal izanen dute hala nahi duten guztiek, Euskal Herriko Hitz Gurutzatuen XI. Txapelketan parte hartzeko.'
    ],
    contactIntro: 'Bestalde, zernahi argibidetarako edo, hala behar badu, lehiaketan parte hartzeko izena WhatsApp bidez emateko, hona hemen interesatu guztiek baliatu ahal izango duten telefono zenbakia:',
    fee: '5 €',
    age: '14 urtetik gora',
    deadline: '2026ko azaroaren 20a',
    phone: '685783470'
  },
  competition: {
    heading: 'Lehiaketa',
    arrival: '2026ko azaroaren 21eko goizeko 09:00etarako bilduko dira lehiakide guztiak Palmera-Montero izeneko gunean (Leandro Agirretxe plazatxoa, 1 - 20304 Irun), eta goizeko 09:30ean hasiko da saioa, lehiakide guztiak aretoko mahaietan egokitu eta gero.',
    rules: [
      'Lehendabiziko hiru probetan, ikasleak azterketetan bezala ariko dira, elkarrekin mintzatu ezinik eta aldamenekoari begiratu bat egiteko tentazioari uko eginik. Bakarrik, lagunik gabe, ariko dira lehiakideak eta hiztegi-liburuak nahi adina erabili ahal izanen dituzte, hala nahi izanez gero. Ez da hiztegi elektronikorik, ez eta telefonorik edo ordenagailurik onartuko.',
      'Lehiakideen esku jarriko dituzte antolatzaileek lehiaketarako beharreko guztiak: paperak, arkatzak, borragomak, eta abar.'
    ],
    scheduleIntroduction: 'Lau saio izanen ditu lehiaketak: hasierako proba, joan-jina, finalaurrekoa eta finala, eta honenbestez banatuko dira ordutegian:',
    schedule: [
      { time: '09:30 – 10:10', name: 'Hasierako proba.' },
      { time: '10:20 – 10:45', name: 'Joan-jina.' },
      { time: '11:00 – 11:40', name: 'Finalaurrekoa.' },
      { time: '12:00 – 13:00', name: 'Finala.' }
    ],
    rounds: [
      {
        title: 'Hasierako proba',
        paragraphs: [
          'Mahaian jokatzeko proba izanen da Txapelketako lehen proba hau eta, aurtengo edizioan, berritasun gisa, ez da lehiakideek betetzeko behar izan duten denbora neurtuko, bai ordea eginiko akatsak, horrelakorik bada.',
          'Lehiakideek 10 x 10 lauki dituen hitz gurutzatu taula bat eta bera bete beharko dute, jakinik horretarako gehienez berrogei minutuko epea izanen dutela. Lehen saio honen helburua da lehiakideak Txapelketan sarrera egokia egitea eta, horrenbestez, bete beharreko taulak ere ez du aparteko zailtasunik izanen.',
          'Hasierako Proba ez da kanporaketa izaerakoa izanen, haren ondoan inor ez da Txapelketatik kanpo geldituko. Bestela esanik, finalaurrekoa jokatzeko aukera izanen dute Hasierako Proban parte harturiko guztiek.'
        ]
      },
      {
        title: 'Joan-jina',
        paragraphs: [
          'Mahaian jokatzeko proba izanen da bigarren proba hau. Txapelketaren historian, lehendabizikoz eginen zaio sarrera hitz joko mota honi aurtengo edizioan. Bigarren proba honetan hasiko gara lehiakideek jokoetan enplegatuko duten denbora neurtzen, baina samurra izanen da hitzetara heltzeko bidea, Hasierako Proban bezala.',
          'Hitz gurutzatu joko berezi honetan (hitz gurutzatu taula karratua izan beharrean, espirala da kasu honetan), letra bakar bat eta bera dagokio beti espiraleko gelaxka zenbakidun bakoitzari. Erlojuaren orratzen norabidean irakurtzen dira hitz batzuk, kontrakoan beste batzuk... eta desberdinak dira guztiak. Halatan, espiralaren barreneko erdigunerantz hedatzen da hitz-andana bat, eta erdigunetik kanpoalderantz hedatzen da bestea.',
          'Asmatu beharreko hitz bakoitzaren luzera eta kokapenaren berri ematen digute azalpen bakoitzaren ezkerraldean ageri diren zenbakiek. Lehiakideei dagokie, orain, gelaxka guztiak egokiro betetzea eta, jakina, hitzak xuxen-xuxen asmatzea.',
          'Joan-jina ez da kanporaketa izaerakoa izanen, haren ondoan inor ez da Txapelketatik kanpo geldituko. Bestela esanik finalaurrekoa jokatzeko aukera izanen dute Joan-jin proban parte harturiko guztiek.'
        ]
      },
      {
        title: 'Finalaurrekoa',
        paragraphs: [
          'Kanporaketa izaerakoa eta mahaian jokatzekoa izanen da Txapelketako hirugarren proba hau. Lehiakideek 12 x 12 lauki dituen hitz gurutzatu taula bat eta bera bete beharko dute, jakinik horretarako gehienez berrogei minutuko epea izanen dutela.',
          'Proba honen ondoan zehaztuko dira finalerako sailkatuko diren hiru lehiakideen izenak.'
        ]
      },
      {
        title: 'Finala',
        paragraphs: [
          'Finalerako sailkaturiko hiru lehiakideek 15 x 15 lauki dituen hitz gurutzatu taula bat eta bera bete beharko dute, jakinik horretarako gehienez ordubeteko epea dutela.',
          'Agerian eta jendaurrean ariko dira finalistak. Ez dira mahaian jardunen, aretoaren alde batean asto gainean paraturiko paneletan baizik, eta eskolan arbelean baleude bezala bete beharko dute egitekoa, finalaren gainerako ikusle eta jarraitzaileei bizkarra emanez. Finaleko beste lehiakideak zertan ari diren ez dakitela ariko dira finalistak, besteen lana ezin ikusiko dutela, eta kanpoko hotsik bakar bat ere ezin entzunen dutela, kasko berezi batzuez estali beharko baitituzte belarriak horretarako.',
          'Kadiretan jarririk eta aurrean mahaiak dituztela segitu ahal izanen dute gainerako ikusle eta jarraitzaileek finala. Hitz egin ahal izanen dute besteekin, finaleko gorabeherei edota txapelketako beste zernahiri buruzko iritziak, iradokizunak eta beste aurkezteko, eta aukera izanen du, era berean, finaleko joko-taula mahaian lasai betetzeko. Helburua da, horretaz guztiaz patxadan eta elkarrekin hitz egitea… finalistak zinak eta minak ikusten ari diren bitarte horretan. Finaleko saioaren bitarte honetan, antolatzaileetako bat ariko da solas horien guztien gidari.'
        ]
      }
    ]
  },
  scoring: {
    heading: 'Emaitzen neurketa',
    paragraphs: [
      'Joko mota hauetan guztietan bezala, zuzentasuna eta lastertasuna izango dira, hurrenez hurren, lehiakide bakoitzak eginiko lana neurtzeko erabiliko diren irizpideak.',
      'Txapelketaren aurtengo edizioan, ordea, Hasierako Proban ez da lastertasuna, hau da, lehiakide bakoitzak lana bururatzeko behar izan duen denbora, neurtuko, bai ordea eginiko akatsak.',
      'Halatan, garrantzitsua izanen da beste hiru probetan taula bizkor betetzea, baina ez da hori beti aski aldeak zehazteko. Izan ere, erantzunen zuzentasuna izango da probaren bukaeran gogoan hartuko den lehen irizpidea, lastertasunaren aitzinetik.'
    ],
    exampleIntroduction: 'Finala bukatu da eta honako emaitza hauek aurkeztu dituzte hartara iritsi diren hiru lehiakideek:',
    results: [
      { contestant: 'A Lehiakidea', errors: '1', time: '45 m 13 s', place: '2' },
      { contestant: 'B Lehiakidea', errors: '0', time: '56 m 21 s', place: '1' },
      { contestant: 'C Lehiakidea', errors: '3', time: '38 m 07 s', place: '3' }
    ],
    explanation: 'Denboran luzeen jo arren, B Lehiakideak irabazi du okerrik egin ez duelako (zuzentasuna baita, hain zuzen ere, lehiakideak neurtzerakoan aintzat hartzen den lehen irizpidea). Bizkorrena izan da C Lehiakidea, baina hirugarren postura lerrarazi dute eginiko hiru okerrek. Eta abar…',
    note: 'Lehiakide guztien ikusmenean egongo diren erloju sinkronizatu batzuen arabera zehaztuko dira lehiakideen denborak.'
  },
  preparation: {
    heading: 'Jokoen prestakuntza',
    paragraphs: [
      'Hitz gurutzatuen taxuko jokoak aurkeztuko dituzte antolatzaileek txapelketako probetan eta aurtengo honetarako espreski sortuak izanen dira taula guztiak. Halatan, lehen mailako garrantzia izanen dute haietan eskainiko diren definizioek edota azalpenek. Mota askotakoak izan daitezke definizio horiek, eta zenbaitetan hiztegietan topatzen ditugun estereotipoetatik urruntzen badira ere, Txapelketa honetan sekula ez dute sarbiderik izan, eta ez dute izanen, izaera arbitrarioko definizioek.',
      'Joxan Elosegi arduratuko da jokoen prestakuntzaz eta haien egokieraz eta zuzentasunaz, eta, Txapelketa honen antolakuntzaren ardura nagusia haiena denaz geroz, Aitzondo elkartearen ordezkariak izango dira epaile, horien beharra suerta litekeen egoera guztietan.'
    ]
  },
  prizes: {
    heading: 'Sariak',
    introduction: 'Hona hemen, irabazleagandik hasita, lehiakideek eskuratuko dituzten sariak:',
    groups: [
      {
        title: 'Finalistak',
        awards: [
          { place: '1. postua', prize: 'Txapela, 400 € eta Alberdaniako bonua.' },
          { place: '2. postua', prize: '300 € eta Alberdaniako bonua.' },
          { place: '3. postua', prize: '200 € eta Alberdaniako bonua.' }
        ]
      },
      {
        title: 'Finalaurreko ohorezko postuak',
        awards: [
          { place: '4. postua', prize: 'Alberdaniako bonua.' },
          { place: '5. postua', prize: 'Alberdaniako bonua.' },
          { place: '6. postua', prize: 'Alberdaniako bonua.' }
        ]
      },
      {
        title: 'Txapelketako parte hartzaile guztiak',
        awards: [{ place: '', prize: 'Eusko Labelen ekarria parte hartzaile guztientzat.' }]
      }
    ]
  },
  programme: {
    heading: 'Txapelketa eguneko egitaraua',
    introduction: 'Hona hemen Txapelketa eguneko egitaraua:',
    events: [
      { time: '09:00', title: 'Lehiakideen bilkura eta agurra.', detail: 'Palmera-Montero gunea, Leandro Agirretxe plazatxoa, 1. IRUN (Gipuzkoa)' },
      { time: '09:30', title: 'Txapelketaren hasiera.' },
      { time: '09:30 – 10:10', title: 'Hasierako proba.' },
      { time: '10:20 – 10:45', title: 'Joan-jina' },
      { time: '11:00 – 11:40', title: 'Finalaurrekoa.' },
      { time: '12:00 – 13:00', title: 'Finala.' },
      { time: '13:30', title: 'Txapelaren janztea eta sarien banaketa.' },
      { time: '14:15', title: 'Bazkaria.', detail: 'Bidasoako EKT elkartea, Larretxipi karrika, 12', note: '20 € balio izanen du bazkari txartelak.' }
    ]
  },
  travel: {
    heading: 'Nola heldu',
    paragraphs: [
      'Ez dago, guk uste, Irunera heltzeko arazo handiegirik. Komeni da, ordea, datu batzuk kontuan hartzea. Trena (Renfe), topoa (Euskotren) eta autobusa ditu eskura garraio publikoan etorri nahi duenak. Autoz etorri nahi izatekotan, berriz, arazoa izan liteke Txapelketa lehiatuko den inguruetan aparkatzea, TAO gunea baita eremu guztia. Bestalde, bada lurpeko aparkaleku bat Palmera Montero gunean berean, BM supermerkatuaren lurpean, baina ordainpekoa da.',
      'Alabaina, Ibilaldi ttiki bat egiteko arazorik ez duenak badu autoa edo ibilgailua egun guztian, goizeko 8:00etatik arratseko 8:00ak arte, dohainik aparkatzeko aukera, Ficoba erakustazokaren aparkaleku zabalean. Irun eta Hendaia arteko zubien eremuan dago Ficoba. Oinez 15-20 bat minutu behar dira hartatik Palmera Montero gunera iristeko.'
    ]
  }
};

export default tournament2026;
